// import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { Library, Settings, Message } from '../types';
import { getLibraryCount } from '../utils';

interface PopupProps {
  initialLibraries?: Library;
  initialSettings?: Settings;
}

export const Popup = ({ initialLibraries, initialSettings }: PopupProps) => {
  const [libraries, setLibraries] = useState<Library>(
    initialLibraries || {
      steam: [],
      epic: [],
      gog: [],
    }
  );

  const [settings, setSettings] = useState<Settings>(
    initialSettings || {
      enableNotifications: true,
      autoSync: true,
    }
  );

  const [currentGame, setCurrentGame] = useState<string | null>(null);

  useEffect(() => {
    // Load saved data - use local storage for libraries (large data), sync for settings
    chrome.storage.local.get(['libraries'], localData => {
      if (localData.libraries) setLibraries(localData.libraries);
    });
    chrome.storage.sync.get(['settings'], syncData => {
      if (syncData.settings) setSettings(syncData.settings);
    });

    // Listen for storage changes
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.libraries) {
        setLibraries(changes.libraries.newValue);
      }
    };
    chrome.storage.local.onChanged.addListener(storageListener);

    // Get current game title from active tab
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getCurrentGame' }, response => {
          if (chrome.runtime.lastError) {
            // Content script not available on this page, that's okay
            console.log('Content script not available on this page');
          } else if (response?.gameTitle) {
            console.log('Got current game from content script:', response.gameTitle);
            setCurrentGame(response.gameTitle);
          }
        });
      }
    });

    // Listen for current game updates
    const messageListener = (message: Message) => {
      console.log('Popup received message:', message);
      if (message.action === 'updateCurrentGame' && message.gameTitle) {
        console.log('Setting current game to:', message.gameTitle);
        setCurrentGame(message.gameTitle);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      chrome.storage.local.onChanged.removeListener(storageListener);
    };
  }, []);

  const handlePlatformConnect = (platform: 'steam' | 'epic' | 'gog'): void => {
    if (platform === 'steam') {
      const functionUrl =
        'https://us-central1-stop-before-you-buy.cloudfunctions.net/steamAuthBridge';
      const authUrl = `${functionUrl}/auth/steam`;
      // const statusElement = document.getElementById('status')!;
      // statusElement.textContent = 'Logging in...';

      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl,
          interactive: true,
        },
        redirectUrl => {
          // This callback function is executed after the flow is complete

          if (chrome.runtime.lastError || !redirectUrl) {
            // statusElement.textContent = 'Login failed. Please try again.';
            console.error(chrome.runtime.lastError);
            return;
          }

          const url = new URL(redirectUrl);
          const steamId = url.searchParams.get('steamid');
          const token = url.searchParams.get('token');

          if (steamId && token) {
            // Save both the user info and the new auth token
            chrome.storage.local.set({ steamUser: { id: steamId }, authToken: token }, () => {
              fetchLibrary(platform);
            });
          } else {
            console.error('Login failed: SteamID not found.');
          }
        }
      );
    } else {
      // Keep the old flow for Epic and GOG for now
      const authUrls = {
        epic: 'https://www.epicgames.com/id/login',
        gog: 'https://www.gog.com/account',
      };

      chrome.tabs.create({ url: authUrls[platform] }, tab => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            fetchLibrary(platform);
          }
        });
      });
    }
  };

  const fetchLibrary = (platform: 'steam' | 'epic' | 'gog'): void => {
    chrome.runtime.sendMessage({ action: 'fetchLibrary', platform }, response => {
      if (response.success && response.libraries) {
        setLibraries(response.libraries);
      }
    });
  };

  const handleSettingChange = (key: keyof Settings, value: boolean): void => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    chrome.storage.sync.set({ settings: newSettings });
  };

  return (
    <div className="container">
      <h1>Stop Before You Buy</h1>

      {/* {currentGame && ( */}
      <div className="current-game-section">
        <h2>Current Game</h2>
        <div className="current-game">
          <span className="game-title">{currentGame || 'No game detected on this page'}</span>
        </div>
      </div>
      {/* )} */}

      <div className="platform-section">
        <h2>Connect Your Libraries</h2>
        <div className="platform-buttons">
          <button className="platform-btn" onClick={() => handlePlatformConnect('steam')}>
            <img src="/icons/steam.png" alt="Steam" />
            Connect Steam
          </button>
          <button className="platform-btn" onClick={() => handlePlatformConnect('epic')}>
            <img src="/icons/epic.png" alt="Epic" />
            Connect Epic
          </button>
          <button className="platform-btn" onClick={() => handlePlatformConnect('gog')}>
            <img src="/icons/gog.png" alt="GOG" />
            Connect GOG
          </button>
        </div>
      </div>

      <div className="library-section">
        <h2>Your Game Libraries</h2>
        <div className="library-stats">
          <div className="stat-box">
            <span className="stat-label">Steam Games</span>
            <span className="stat-value">{getLibraryCount(libraries.steam)}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Epic Games</span>
            <span className="stat-value">{getLibraryCount(libraries.epic)}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">GOG Games</span>
            <span className="stat-value">{getLibraryCount(libraries.gog)}</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Settings</h2>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.enableNotifications}
              onChange={e => handleSettingChange('enableNotifications', e.currentTarget.checked)}
            />
            Show purchase warnings
          </label>
        </div>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.autoSync}
              onChange={e => handleSettingChange('autoSync', e.currentTarget.checked)}
            />
            Auto-sync libraries
          </label>
        </div>
      </div>
    </div>
  );
};
