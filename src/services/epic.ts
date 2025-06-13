/// <reference types="chrome"/>

const functionUrl = 'https://us-central1-stop-before-you-buy.cloudfunctions.net/api';

export async function fetchEpicLibrary() {
  const getGamesUrl = `${functionUrl}/epic/games`;

  // Get the current tab to extract cookies
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];

  if (!currentTab?.id) {
    throw new Error('No active tab found');
  }

  // Get cookies from the current tab
  const cookies = await chrome.cookies.getAll({ domain: 'epicgames.com' });
  if (!cookies || cookies.length === 0) {
    throw new Error('No Epic Games cookies found. Please log in first.');
  }

  // Make the request with cookies
  const response = await fetch(getGamesUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cookies }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  const local_storage = await chrome.storage.local.get('libraries');
  const libraries = local_storage.libraries || { steam: [], epic: [], gog: [] };
  libraries['epic'] = data.games;
  await chrome.storage.local.set({ libraries });
  return data.games;
}
