/// <reference types="chrome"/>

const functionUrl = 'https://us-central1-stop-before-you-buy.cloudfunctions.net/api';

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
 * Fetch user's Steam library using the Web API
 */
export async function fetchSteamLibrary() {
  const getGamesUrl = `${functionUrl}/steam/games`;

  // Get the saved token from storage
  chrome.storage.local.get(['authToken'], async result => {
    if (!result.authToken) {
      console.error('Auth token not found. Please log in again.');
      return;
    }

    // Make the fetch request with the Authorization header
    const response = await fetch(getGamesUrl, {
      headers: {
        Authorization: `Bearer ${result.authToken}`,
      },
    });
    const data = await response.json();
    if (data.error) {
      console.error('Error fetching games:', data.error);
      // If token is invalid, clear it and force re-login
      if (data.error.includes('Invalid token')) {
        chrome.storage.local.remove(['steamUser', 'authToken']);
      }
      return;
    }

    const local_storage = await chrome.storage.local.get('libraries');
    const libraries = local_storage.libraries || { steam: [], epic: [], gog: [] };
    libraries['steam'] = data.games;
    await chrome.storage.local.set({ libraries });
  });
}

/**
 * Check if user is authenticated with Steam
 */
export async function isAuthenticated(): Promise<boolean> {
  const result = await chrome.storage.sync.get(['steamUser']);
  return !!result.steamUser;
}

/**
 * Get the stored Steam ID
 */
export async function getStoredSteamId(): Promise<string | null> {
  const result = await chrome.storage.sync.get(['steamUser']);
  return result.steamUser || null;
}

/**
 * Clear Steam authentication data
 */
export async function clearSteamAuth(): Promise<void> {
  await chrome.storage.sync.remove(['steamUser']);
}
