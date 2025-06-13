/// <reference types="chrome"/>

import type { StoreConfig, StoreConfigs } from '../types';

// Configuration for different store platforms
const STORE_CONFIGS: StoreConfigs = {
  'store.steampowered.com': {
    titleSelector: [
      '.apphub_AppName', // Standard store page
      '.page_title_area .title', // Some store pages
      '.game_title_area .title', // Game hub pages
      '.apphub_AppName_font', // Alternative store page layout
      '.pageheader', // Some special pages
    ],
    priceSelector: '.game_purchase_price',
    buyButtonSelector: '.btn_add_to_cart',
  },
  'store.epicgames.com': {
    titleSelector: '.css-1h2ruwl',
    priceSelector: '.css-1h2ruwl',
    buyButtonSelector: '[data-testid="purchase-cta-button"]',
  },
  'www.gog.com': {
    titleSelector: '.productcard-basics__title',
    priceSelector: '.productcard-prices__price',
    buyButtonSelector: '.productcard-basics__buy-button',
  },
};

// Show the extension banner on the page
function showExtensionBanner(config: StoreConfig): void {
  const bannerDiv = document.createElement('div');
  bannerDiv.className = 'stop-before-you-buy-banner';
  bannerDiv.innerHTML = `
    <div style="
      background-color: #2196f3;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      margin: 10px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    ">
      <span style="font-weight: 500;">🛡️ Stop-before-you-buy is active</span>
    </div>
  `;

  // Find the game title element to insert the banner after
  if (Array.isArray(config.titleSelector)) {
    for (const selector of config.titleSelector) {
      const titleElement = document.querySelector(selector);
      if (titleElement) {
        titleElement.parentNode?.insertBefore(bannerDiv, titleElement.nextSibling);
        return;
      }
    }
  } else {
    const titleElement = document.querySelector(config.titleSelector);
    if (titleElement) {
      titleElement.parentNode?.insertBefore(bannerDiv, titleElement.nextSibling);
    }
  }
}

// Initialize the content script
function initialize(): void {
  const hostname = window.location.hostname;
  const config = STORE_CONFIGS[hostname];

  if (!config) return;

  // Wait for the page to load completely
  window.addEventListener('load', () => {
    setTimeout(() => {
      showExtensionBanner(config);
      checkGameOwnership(config);
    }, 2000); // Give extra time for dynamic content to load
  });

  // Listen for messages from popup/background asking for current game
  chrome.runtime.onMessage.addListener(
    (
      message: { action: string },
      _: chrome.runtime.MessageSender,
      sendResponse: (response: { gameTitle: string | null }) => void
    ) => {
      if (message.action === 'getCurrentGame') {
        const gameTitle = extractGameTitle(config);
        sendResponse({ gameTitle });
        return true; // Keep the message channel open for async response
      }
    }
  );
}

// Check if the current game is owned on any platform
async function checkGameOwnership(config: StoreConfig): Promise<void> {
  const gameTitle = extractGameTitle(config);
  if (!gameTitle) return;

  // Send message to background script to check ownership
  chrome.runtime.sendMessage(
    { action: 'checkGameOwnership', gameTitle },
    (response: { success: boolean; owned: boolean }) => {
      if (response.success && response.owned) {
        // Add click event to the buy button
        const buyButton = document.querySelector(config.buyButtonSelector);
        if (buyButton) {
          buyButton.addEventListener('click', e => {
            if (
              !confirm(
                'Are you sure you want to purchase this game? You already own it on another platform.'
              )
            ) {
              e.preventDefault();
              e.stopPropagation();
            }
          });
        }
      }
    }
  );
}

// Helper function to extract game title using multiple selectors
function extractGameTitle(config: StoreConfig): string | null {
  if (Array.isArray(config.titleSelector)) {
    // Try each selector until we find a match
    for (const selector of config.titleSelector) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim();
      }
    }
    return null;
  }

  // Fallback to single selector
  return document.querySelector(config.titleSelector)?.textContent?.trim() || null;
}

// Start the content script
initialize();
