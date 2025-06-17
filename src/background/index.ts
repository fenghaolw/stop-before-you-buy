// Background service worker for Stop Before You Buy extension

interface GameLibrary {
  title: string;
  platform: string;
}

// Listen for extension installation
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    console.log('Stop Before You Buy extension installed');

    // Initialize storage with empty libraries if not exists
    chrome.storage.local.get(['gameLibraries'], result => {
      if (!result.gameLibraries) {
        chrome.storage.local.set({ gameLibraries: [] });
      }
    });
  }
});

// Listen for tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = tab.url;

    // Check if we're on a supported gaming platform
    const supportedSites = ['store.steampowered.com', 'store.epicgames.com', 'gog.com'];

    const isSupported = supportedSites.some(site => url.includes(site));

    if (isSupported) {
      // Ensure content script is injected
      chrome.scripting
        .executeScript({
          target: { tabId },
          files: ['content.js'],
        })
        .catch(() => {
          // Content script might already be injected, ignore error
        });
    }
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  switch (request.action) {
    case 'getLibraries':
      chrome.storage.local.get(['gameLibraries'], result => {
        sendResponse({ libraries: result.gameLibraries || [] });
      });
      return true; // Keep message channel open for async response

    case 'updateLibraries':
      chrome.storage.local.set({ gameLibraries: request.libraries }, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'clearLibraries':
      chrome.storage.local.remove(['gameLibraries'], () => {
        sendResponse({ success: true });
      });
      return true;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Handle storage changes and notify content scripts
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.gameLibraries) {
    // Notify all tabs about library changes
    chrome.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        if (tab.id && tab.url) {
          const supportedSites = ['store.steampowered.com', 'store.epicgames.com', 'gog.com'];

          const isSupported = supportedSites.some(site => tab.url!.includes(site));

          if (isSupported) {
            chrome.tabs
              .sendMessage(tab.id, {
                action: 'librariesUpdated',
                libraries: changes.gameLibraries.newValue || [],
              })
              .catch(() => {
                // Tab might not have content script, ignore error
              });
          }
        }
      });
    });
  }
});

// Action click handler to open side panel
chrome.action.onClicked.addListener(tab => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Badge text to show library count
chrome.storage.local.get(['gameLibraries'], result => {
  const count = result.gameLibraries ? result.gameLibraries.length : 0;
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#1e40af' });
  }
});

// Update badge when libraries change
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.gameLibraries) {
    const count = changes.gameLibraries.newValue ? changes.gameLibraries.newValue.length : 0;
    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#1e40af' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }
});
