require('dotenv').config();

const express = require('express');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const { Firestore } = require('@google-cloud/firestore');
const axios = require('axios');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // For generating tokens
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chromium = require('@sparticuz/chromium');

const app = express();
puppeteer.use(StealthPlugin());

const firestore = new Firestore({
  projectId: 'stop-before-you-buy',
  databaseId: 'auth-bridge',
});

const functionUrl = process.env.FUNCTION_URL || 'http://localhost:8080'; // Placeholder

app.use(passport.initialize());

passport.use(
  new SteamStrategy(
    {
      returnURL: `${functionUrl}/auth/steam/callback`,
      realm: functionUrl,
      apiKey: process.env.STEAM_API_KEY, // Use environment variable for your Steam API Key
    },
    (identifier, profile, done) => {
      return done(null, profile);
    }
  )
);

const corsOptions = {
  // We dynamically build the allowed origin from our environment variable
  origin: `chrome-extension://${process.env.CHROME_EXTENSION_ID}`,
  credentials: true, // This is essential to allow session cookies to be sent
};
app.use(cors(corsOptions));

// === DEFINE THE ROUTES ===
app.get('/', (req, res) => {
  // Send a 200 OK response to indicate the service is healthy
  res.status(200).send('OK');
});

// This is the URL your Chrome Extension will open to start the login process.
app.get('/auth/steam', passport.authenticate('steam', { session: false }));

// Steam will redirect the user back to this URL after they log in.
app.get(
  '/auth/steam/callback',
  passport.authenticate('steam', { session: false, failureRedirect: '/' }),
  async (req, res) => {
    // Successful authentication! req.user contains the Steam profile.
    const steamId = req.user.id;
    const token = uuidv4(); // Generate a new secure token

    // Store the token in Firestore with a link to the steamId
    // This token is what the extension will use for future requests.
    const tokenRef = firestore.collection('api_tokens').doc(token);
    await tokenRef.set({
      createdAt: new Date(),
      steam: {
        id: steamId,
      },
    });

    // This is the special URL your Chrome extension can intercept.
    // It MUST be registered in your Google Cloud Project's OAuth consent screen
    // when you create the client_id for your extension.
    const extensionCallbackUrl = `https://${process.env.CHROME_EXTENSION_ID}.chromiumapp.org/`;
    // Send back both the steamId and the new token
    res.redirect(`${extensionCallbackUrl}?steamid=${steamId}&token=${token}`);
  }
);

// This middleware will check for the token on protected routes
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  const tokenRef = firestore.collection('api_tokens').doc(token);
  const doc = await tokenRef.get();

  if (!doc.exists) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
  }

  // Attach the entire user data document to the request object.
  // This makes it available to any route that uses this middleware.
  req.authData = doc.data();
  next();
}

app.get('/steam/games', verifyToken, async (req, res) => {
  try {
    // Check if a Steam account is linked in the auth data
    if (!req.authData || !req.authData.steam || !req.authData.steam.id) {
      return res.status(400).json({ error: 'Steam account not linked.' });
    }
    const steamId = req.authData.steam.id;
    const apiKey = process.env.STEAM_API_KEY;

    const steamApiUrl = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&format=json&include_appinfo=true`;
    console.log(`Fetching games for SteamID: ${steamId}`);
    const response = await axios.get(steamApiUrl);

    if (response.data && response.data.response && response.data.response.games) {
      // Filter and transform the games array to only include appid and name
      const filteredGames = response.data.response.games.map(game => ({
        appid: game.appid,
        name: game.name,
      }));

      res.status(200).json({
        success: true,
        games: filteredGames,
      });
    } else {
      res.status(200).json({
        success: true,
        games: [],
      });
    }
  } catch (error) {
    console.error('Error fetching from Steam API:', error);
    res.status(500).json({ error: 'Failed to fetch game library from Steam.' });
  }
});

app.post('/epic/games', async (req, res) => {
  let browser = null;
  const { cookies } = req.body;

  if (!cookies || !Array.isArray(cookies)) {
    return res.status(400).json({ error: 'Cookies are missing or invalid.' });
  }
  console.log(`Starting STEALTH scrape process with ${cookies.length} provided cookies.`);

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
    });

    // 1. Inject the user's cookies into the headless browser instance
    console.log('Injecting session cookies...');
    await browser.setCookie(...cookies);
    console.log('Cookies injected.');

    // 2. Navigate directly to the JSON endpoint
    const baseUrl = 'https://www.epicgames.com/account/v2/payment/ajaxGetOrderHistory';

    const gameTitles = await fetchAllEpicPages(page);
    const games = Array.from(gameTitles).map(title => ({ name: title }));

    console.log(`Found ${games.length} unique game titles.`);
    res.status(200).json({ game_count: games.length, games: games });
  } catch (error) {
    console.error('Error during cookie-based scrape:', error);
    res.status(500).json({ error: 'Failed to scrape Epic Games library.' });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
});

async function fetchAllEpicPages(page) {
  const baseUrl = 'https://www.epicgames.com/account/v2/payment/ajaxGetOrderHistory';
  let allOrders = [];
  let currentPage = 0;
  let totalPages = 1;

  while (currentPage < totalPages) {
    await page.goto(`${baseUrl}?page=${currentPage}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    const pageContent = await page.evaluate(() => document.body.innerText);
    const data = JSON.parse(pageContent);
    if (!data || !data.orders) throw new Error(`Failed to parse JSON on page ${currentPage}`);
    allOrders = allOrders.concat(data.orders);
    if (currentPage === 0) {
      totalPages = Math.ceil(data.total / (data.orders.length || 10));
    }
    currentPage++;
  }

  const gameTitles = new Set();
  allOrders.forEach(order => {
    if (order.status === 'COMPLETED' && order.items.length > 0) {
      order.items.forEach(item => {
        if (item.namespace) gameTitles.add(item.description);
      });
    }
  });
  return gameTitles;
}

// We are now exporting the app to be run by the Functions Framework
exports.api = app;
