import { GameLibrary } from './types';
import { PageChecker } from './pageChecker';

class GameChecker {
  private libraries: GameLibrary[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    await this.loadLibraries();
    this.checkCurrentPage();

    // Listen for navigation changes (for single-page app behavior)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(() => this.checkCurrentPage(), 1000);
      }
    }).observe(document, { subtree: true, childList: true });
  }

  private async loadLibraries() {
    try {
      const result = await chrome.storage.local.get(['gameLibraries']);
      if (result.gameLibraries) {
        this.libraries = result.gameLibraries;
      }
    } catch (error) {
      console.error('Error loading game libraries:', error);
    }
  }

  private checkCurrentPage() {
    if (this.libraries.length === 0) {
      return;
    }

    const currentUrl = window.location.href;

    // Check if we're on a Steam store page
    if (currentUrl.includes('store.steampowered.com/app/')) {
      PageChecker.checkSteamPage(this.libraries);
    }
    // Check if we're on an Epic Games store page
    else if (currentUrl.includes('store.epicgames.com/') && currentUrl.includes('/p/')) {
      PageChecker.checkEpicPage(this.libraries);
    }
    // Check if we're on a GOG store page
    else if (currentUrl.includes('gog.com/game/')) {
      PageChecker.checkGogPage(this.libraries);
    }
    // Check if we're on a Steam cart page
    else if (currentUrl.includes('store.steampowered.com/cart')) {
      PageChecker.checkSteamCartPage(this.libraries);
    }
  }
}

// Register GameChecker on window to prevent duplicates
(window as any).GameChecker = GameChecker;

// Initialize the game checker when the page loads
let gameChecker: GameChecker | null = null;

function initializeGameChecker() {
  if (!gameChecker) {
    gameChecker = new GameChecker();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGameChecker);
} else {
  initializeGameChecker();
}
