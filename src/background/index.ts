import type { Library, Message, MessageResponse, Platform } from '../types';
import { findGameInLibraries } from '../utils';
import { fetchSteamLibrary } from '../services/steam';
import { fetchEpicLibrary } from '../services/epic';

// Initialize storage with default values
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['libraries', 'settings'], data => {
    if (!data.libraries) {
      chrome.storage.sync.set({
        libraries: {
          steam: [],
          epic: [],
          gog: [],
        },
      });
    }
    if (!data.settings) {
      chrome.storage.sync.set({
        settings: {
          enableNotifications: true,
          autoSync: true,
        },
      });
    }
  });
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener(
  (message: Message, _, sendResponse: (response: MessageResponse) => void) => {
    console.log('[Background] Received message:', message);
    switch (message.action) {
      case 'fetchLibrary':
        if (message.platform) {
          console.log('[Background] Fetching library for platform:', message.platform);
          fetchLibrary(message.platform)
            .then(library => {
              console.log('[Background] Library fetch successful:', library);
              sendResponse({ success: true, libraries: library });
            })
            .catch(error => {
              console.error('[Background] Error fetching library:', error);
              sendResponse({ success: false, error: error.message });
            });
        }
        return true;

      case 'connectPlatform':
        if (message.platform && (message.platform === 'epic' || message.platform === 'gog')) {
          console.log('[Background] Connecting to platform:', message.platform);
          connectToPlatform(message.platform)
            .then(() => {
              sendResponse({ success: true });
            })
            .catch(error => {
              console.error('[Background] Error connecting to platform:', error);
              sendResponse({ success: false, error: error.message });
            });
        }
        return true;

      case 'checkGameOwnership':
        if (message.gameTitle) {
          checkGameOwnership(message.gameTitle)
            .then(result => {
              sendResponse({ success: true, owned: result });
            })
            .catch(error => {
              console.error('Error checking game ownership:', error);
              sendResponse({ success: false, error: error.message });
            });
        }
        return true;
    }
  }
);

async function fetchLibrary(platform: Platform): Promise<Library> {
  try {
    let games = [];
    switch (platform) {
      case 'steam':
        games = await fetchSteamLibrary();
        break;
      case 'epic':
        games = await fetchEpicLibrary();
        break;
      // case 'gog':
      //   games = await fetchGogLibrary();
      //   break;
    }

    // Update storage with new library data
    const data = await chrome.storage.local.get('libraries');
    const libraries = data.libraries || { steam: [], epic: [], gog: [] };
    libraries[platform] = games;
    await chrome.storage.local.set({ libraries });
    return libraries;
  } catch (error) {
    console.error(`Error fetching ${platform} library:`, error);
    throw error;
  }
}

async function checkGameOwnership(gameTitle: string): Promise<boolean> {
  const data = await chrome.storage.local.get('libraries');
  const libraries = data.libraries || { steam: [], epic: [], gog: [] };
  const result = findGameInLibraries(gameTitle, libraries);
  return result.found;
}

async function connectToPlatform(platform: 'epic' | 'gog'): Promise<void> {
  const authUrls = {
    epic: 'https://www.epicgames.com/id/login',
    gog: 'https://www.gog.com/account',
  };

  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url: authUrls[platform] }, tab => {
      console.log('[Background] Created new tab for', platform, ':', tab.id);

      const listener = function (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) {
        console.log('[Background] Tab updated:', tabId, changeInfo);
        if (tabId === tab.id && changeInfo.status === 'complete') {
          console.log('[Background] Tab load complete, removing listener and fetching library');
          chrome.tabs.onUpdated.removeListener(listener);

          // Fetch the library after login page loads
          fetchLibrary(platform)
            .then(() => {
              console.log('[Background] Library fetched successfully for', platform);
              resolve();
            })
            .catch(error => {
              console.error('[Background] Error fetching library for', platform, ':', error);
              reject(error);
            });
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}
