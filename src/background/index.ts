import type { Library, Message, MessageResponse, Platform } from '../types';
import { findGameInLibraries } from '../utils';
import { fetchSteamLibrary, clearSteamAuth } from '../services/steam';

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
    switch (message.action) {
      case 'fetchLibrary':
        if (message.platform) {
          fetchLibrary(message.platform)
            .then(library => {
              sendResponse({ success: true, libraries: library });
            })
            .catch(error => {
              console.error('Error fetching library:', error);
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

      case 'clearSteamAuth':
        clearSteamAuth()
          .then(() => {
            sendResponse({ success: true });
          })
          .catch(error => {
            console.error('Error clearing Steam auth:', error);
            sendResponse({ success: false, error: error.message });
          });
        return true;
    }
  }
);

async function fetchLibrary(platform: Platform): Promise<Library> {
  try {
    switch (platform) {
      case 'steam':
        fetchSteamLibrary();
        break;
      // case 'epic':
      //   games = await fetchEpicLibrary();
      //   break;
      // case 'gog':
      //   games = await fetchGogLibrary();
      //   break;
    }

    // Update storage with new library data
    // Use local storage for large library data to avoid quota limits
    const data = await chrome.storage.local.get('libraries');
    return data.libraries;
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
