require('dotenv').config();

const express = require('express');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const { Firestore } = require('@google-cloud/firestore');
const axios = require('axios');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // For generating tokens

const app = express();

const firestore = new Firestore({
    projectId: 'stop-before-you-buy',
    databaseId: 'auth-bridge',
});

const functionUrl = process.env.FUNCTION_URL || 'http://localhost:8080'; // Placeholder

app.use(passport.initialize());

passport.use(new SteamStrategy({
    returnURL: `${functionUrl}/auth/steam/callback`,
    realm: functionUrl,
    apiKey: process.env.STEAM_API_KEY // Use environment variable for your Steam API Key
}, (identifier, profile, done) => {
    return done(null, profile);
}));

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
app.get('/auth/steam/callback',
    passport.authenticate('steam', { session: false, failureRedirect: '/' }),
    async (req, res) => {
        // Successful authentication! req.user contains the Steam profile.
        const steamId = req.user.id;
        const token = uuidv4(); // Generate a new secure token

        // Store the token in Firestore with a link to the steamId
        // This token is what the extension will use for future requests.
        const tokenRef = firestore.collection('api_tokens').doc(token);
        await tokenRef.set({
            steamId: steamId,
            createdAt: new Date(),
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

    // Attach the user's steamId to the request object for the next handler to use
    req.steamId = doc.data().steamId;
    next();
}

app.get('/api/games', verifyToken, async (req, res) => {
    try {
        // The steamId is now attached by the verifyToken middleware
        const steamId = req.steamId;
        const apiKey = process.env.STEAM_API_KEY;

        const steamApiUrl = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&format=json&include_appinfo=true`;
        console.log(`Fetching games for SteamID: ${steamId}`);
        const response = await axios.get(steamApiUrl);

        if (response.data && response.data.response) {
            res.status(200).json(response.data.response);
        } else {
            res.status(200).json({ game_count: 0, games: [] });
        }
    } catch (error) {
        console.error('Error fetching from Steam API:', error);
        res.status(500).json({ error: 'Failed to fetch game library from Steam.' });
    }
});

// We are now exporting the app to be run by the Functions Framework
exports.steamAuthBridge = app;