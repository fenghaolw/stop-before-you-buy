require('dotenv').config();

const express = require('express');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const { Firestore } = require('@google-cloud/firestore');
const axios = require('axios');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // For generating tokens
const OAuth2Strategy = require('passport-oauth2');

const app = express();

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

passport.use(
  'epic',
  new OAuth2Strategy(
    {
      authorizationURL: 'https://www.epicgames.com/id/authorize',
      tokenURL: 'https://api.epicgames.dev/epic/oauth/v1/token',
      clientID: process.env.EPIC_CLIENT_ID,
      clientSecret: process.env.EPIC_CLIENT_SECRET,
      callbackURL: `${functionUrl}/auth/epic/callback`,
    },
    // This function is called after successfully getting an access token from Epic
    (accessToken, refreshToken, profile, done) => {
      // We will store the tokens for later use.
      // The 'profile' from this library is often empty, we get the user ID in the next step.
      // We pass the tokens along to the callback route.
      return done(null, { accessToken, refreshToken });
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

app.get('/auth/epic', passport.authenticate('epic', { session: false }));

app.get(
  '/auth/epic/callback',
  passport.authenticate('epic', { session: false, failureRedirect: '/' }),
  async (req, res) => {
    // req.user now contains { accessToken, refreshToken } from the strategy
    const { accessToken } = req.user;

    // Now, use the access token to get the user's Epic account ID
    const userInfoResponse = await axios.get('https://api.epicgames.dev/epic/oauth/v1/userInfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const epicAccountId = userInfoResponse.data.account_id;

    // Generate our own application token, just like we did for Steam
    const appToken = uuidv4();

    // Store the Epic tokens securely, linked to our app token
    const tokenRef = firestore.collection('api_tokens').doc(appToken);
    await tokenRef.set({
      epicAccountId: epicAccountId,
      epicAccessToken: accessToken, // We need this to fetch games later
      createdAt: new Date(),
    });

    const extensionCallbackUrl = `https://${process.env.CHROME_EXTENSION_ID}.chromiumapp.org/`;
    // Send our app token back to the extension
    res.redirect(
      `${extensionCallbackUrl}?epicAccountId=${epicAccountId}&epicAccessToken=${accessToken}`
    );
  }
);

app.get('/epic/games', verifyToken, async (req, res) => {
  // Re-using our verifyToken middleware
  try {
    // The verifyToken middleware looked up our app token and found the user's data
    // Let's assume we stored `epicAccessToken` when we created the token.
    // (We need to modify our api_tokens collection to store both steamId and epic tokens)

    // This part requires a small change to how we store tokens, let's assume
    // the 'api_tokens' doc contains the epicAccessToken.
    const tokenDoc = await firestore.collection('api_tokens').doc(req.token).get();
    const epicAccessToken = tokenDoc.data().epicAccessToken;
    const epicAccountId = tokenDoc.data().epicAccountId;

    if (!epicAccessToken) {
      return res.status(400).json({ error: 'Epic account not linked.' });
    }

    const epicApiUrl = `https://api.epicgames.dev/ecommerce/v1/private/accounts/${epicAccountId}/entitlements`;

    const response = await axios.get(epicApiUrl, {
      headers: { Authorization: `Bearer ${epicAccessToken}` },
    });

    // The response from Epic is different from Steam's, you'll need to parse it.
    // This is a simplified example of the parsing logic.
    const games = response.data.map(entitlement => ({
      appid: entitlement.offerId,
      name: entitlement.offerName,
      // ... other properties
    }));

    res.status(200).json({ game_count: games.length, games: games });
  } catch (error) {
    console.error(
      'Error fetching from Epic API:',
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: 'Failed to fetch game library from Epic.' });
  }
});

// We are now exporting the app to be run by the Functions Framework
exports.api = app;
