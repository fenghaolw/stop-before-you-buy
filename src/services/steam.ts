/// <reference types="chrome"/>

import type { Game } from '../types';

// Extend the Game interface to include additional Steam-specific properties
interface SteamGame extends Game {
  playtime?: number;
  icon?: string;
}

// Steam OpenID configuration
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
const STEAM_WEB_API_BASE = 'https://api.steampowered.com';
const functionUrl = 'https://us-central1-stop-before-you-buy.cloudfunctions.net/steamAuthBridge';

export interface SteamAuthResult {
  steamId: string;
  success: boolean;
  error?: string;
}

export interface SteamUser {
  steamId: string;
  profileName: string;
  profileUrl: string;
  avatar: string;
}

/**
 * Initiate Steam OpenID authentication using Chrome's identity API
 */
export async function authenticateWithSteam(): Promise<SteamAuthResult> {
  try {
    console.log('Starting Steam OpenID authentication...');

    // Build OpenID authentication URL
    const returnUrl = chrome.identity.getRedirectURL();
    const authUrl = buildOpenIdUrl(returnUrl);

    console.log('Auth URL:', authUrl);

    // Launch the authentication flow
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true,
    });

    if (!responseUrl) {
      throw new Error('Authentication was cancelled or failed');
    }

    console.log('Response URL:', responseUrl);

    // Parse the response
    const steamId = parseOpenIdResponse(responseUrl);

    if (!steamId) {
      throw new Error('Failed to extract Steam ID from response');
    }

    // Store the Steam ID for future use
    await chrome.storage.sync.set({ steamId });

    console.log('Authentication successful, Steam ID:', steamId);

    return {
      steamId,
      success: true,
    };
  } catch (error) {
    console.error('Steam authentication failed:', error);
    return {
      steamId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build the Steam OpenID authentication URL
 */
function buildOpenIdUrl(returnUrl: string): string {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnUrl,
    'openid.realm': returnUrl,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });

  return `${STEAM_OPENID_URL}?${params.toString()}`;
}

/**
 * Parse the OpenID response to extract the Steam ID
 */
function parseOpenIdResponse(responseUrl: string): string | null {
  try {
    const url = new URL(responseUrl);
    const identity = url.searchParams.get('openid.identity');

    if (!identity) {
      return null;
    }

    // Extract Steam ID from the identity URL
    const match = identity.match(/\/id\/(\d+)$/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error parsing OpenID response:', error);
    return null;
  }
}

/**
 * Fetch user's Steam library using the Web API
 */
export async function fetchSteamLibrary(): Promise<SteamGame[]> {
  const getGamesUrl = `${functionUrl}/api/games`;

  // Get the saved token from storage
  chrome.storage.local.get(['authToken'], result => {
    if (!result.authToken) {
      console.error('Auth token not found. Please log in again.');
      return;
    }

    // Make the fetch request with the Authorization header
    fetch(getGamesUrl, {
      headers: {
        Authorization: `Bearer ${result.authToken}`,
      },
    })
      .then(response => response.json()) // Always try to parse JSON, even for errors
      .then(data => {
        if (data.error) {
          console.error('Error fetching games:', data.error);
          // If token is invalid, clear it and force re-login
          if (data.error.includes('Invalid token')) {
            chrome.storage.local.remove(['steamUser', 'authToken']);
          }
          return;
        }

        console.log('--- My Game Library ---');
        console.log(data.games);
        const gameCount = data.game_count || 0;
        console.log(`You are logged in and own ${gameCount} games!`);
        chrome.storage.local.set({ steamGameList: data.games });
      })
      .catch(error => {
        console.error('Error fetching games:', error);
      });
  });
  return [];
}

/**
 * Check if user is authenticated with Steam
 */
export async function isAuthenticated(): Promise<boolean> {
  const result = await chrome.storage.sync.get(['steamId']);
  return !!result.steamId;
}

/**
 * Get the stored Steam ID
 */
export async function getStoredSteamId(): Promise<string | null> {
  const result = await chrome.storage.sync.get(['steamId']);
  return result.steamId || null;
}

/**
 * Clear Steam authentication data
 */
export async function clearSteamAuth(): Promise<void> {
  await chrome.storage.sync.remove(['steamId']);
}

/**
 * Validate Steam API key by making a test request
 */
export async function validateSteamApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${STEAM_WEB_API_BASE}/ISteamWebAPIUtil/GetSupportedAPIList/v0001/?key=${apiKey}`
    );
    return response.ok;
  } catch {
    return false;
  }
}
