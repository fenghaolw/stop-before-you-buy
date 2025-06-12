import type { StoreConfig, StoreConfigs } from '../types';

// Configuration for different store platforms
const STORE_CONFIGS: StoreConfigs = {
  'store.steampowered.com': {
    titleSelector: '.apphub_AppName',
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

// Initialize the content script
function initialize(): void {
  const hostname = window.location.hostname;
  const config = STORE_CONFIGS[hostname];

  if (!config) return;

  // Wait for the page to load completely
  window.addEventListener('load', () => {
    setTimeout(() => {
      checkGameOwnership(config);
    }, 2000); // Give extra time for dynamic content to load
  });
}

// Check if the current game is owned on any platform
async function checkGameOwnership(config: StoreConfig): Promise<void> {
  const gameTitle = document.querySelector(config.titleSelector)?.textContent?.trim();
  if (!gameTitle) return;

  // Send message to background script to check ownership
  chrome.runtime.sendMessage({ action: 'checkGameOwnership', gameTitle }, response => {
    if (response.success && response.owned) {
      showWarning(config);
    }
  });
}

// Show warning message on the page
function showWarning(config: StoreConfig): void {
  const warningDiv = document.createElement('div');
  warningDiv.className = 'stop-before-you-buy-warning';
  warningDiv.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #ff4444;
      color: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 9999;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <h3 style="margin: 0 0 10px 0; font-size: 16px;">⚠️ Warning: Game Already Owned</h3>
      <p style="margin: 0; font-size: 14px;">
        You already own this game on another platform. Consider checking your library before purchasing.
      </p>
    </div>
  `;

  document.body.appendChild(warningDiv);

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

// Start the content script
initialize();
