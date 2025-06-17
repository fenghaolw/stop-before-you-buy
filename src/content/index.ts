interface GameLibrary {
  title: string;
  platform: string;
}

// Prevent duplicate class declaration
if (typeof (window as any).GameChecker !== 'undefined') {
  // GameChecker already exists, skipping initialization
} else {
  class GameChecker {
    private libraries: GameLibrary[] = [];
    private warningElement: HTMLElement | null = null;

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
        this.checkSteamPage();
      }
      // Check if we're on an Epic Games store page
      else if (currentUrl.includes('store.epicgames.com/') && currentUrl.includes('/p/')) {
        this.checkEpicPage();
      }
      // Check if we're on a GOG store page
      else if (currentUrl.includes('gog.com/game/')) {
        this.checkGogPage();
      }
      // Check if we're on a Steam cart page
      else if (currentUrl.includes('store.steampowered.com/cart')) {
        this.checkSteamCartPage();
      }
    }

    private checkSteamPage() {
      const gameTitle = this.extractSteamGameTitle();
      if (gameTitle) {
        const ownedGames = this.findGameInLibraries(gameTitle);
        const nonSteamGames = ownedGames.filter(game => game.platform.toLowerCase() !== 'steam');
        
        if (nonSteamGames.length > 0) {
          this.showWarning(nonSteamGames, gameTitle);
        } else {
          this.hideWarning();
        }
      }
    }

    private checkEpicPage() {
      const gameTitle = this.extractEpicGameTitle();
      if (gameTitle) {
        const ownedGames = this.findGameInLibraries(gameTitle);
        const nonEpicGames = ownedGames.filter(game => {
          const platform = game.platform.toLowerCase();
          return platform !== 'epic' && platform !== 'epic games';
        });
        
        if (nonEpicGames.length > 0) {
          this.showWarning(nonEpicGames, gameTitle);
        } else {
          this.hideWarning();
        }
      }
    }

    private checkGogPage() {
      const gameTitle = this.extractGogGameTitle();
      if (gameTitle) {
        const ownedGames = this.findGameInLibraries(gameTitle);
        const nonGogGames = ownedGames.filter(game => game.platform.toLowerCase() !== 'gog');
        
        if (nonGogGames.length > 0) {
          this.showWarning(nonGogGames, gameTitle);
        } else {
          this.hideWarning();
        }
      }
    }

    private extractSteamGameTitle(): string | null {
      // Try multiple selectors for Steam game title
      const selectors = [
        '.apphub_AppName',
        '#appHubAppName',
        '.page_title_area .apphub_AppName',
        'h1.apphub_AppName',
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && element.textContent) {
          return element.textContent.trim();
        }
      }

      return null;
    }

    private extractEpicGameTitle(): string | null {
      // Epic Games pages typically have a single h1, so we focus on the most reliable selectors
      const selectors = [
        // Primary data-testid selector (most reliable)
        '[data-testid="pdp-product-name"]',

        // Fallback to the single h1 on the page
        'h1',

        // Additional data-testid variants just in case
        '[data-testid="product-title"]',
        '[data-testid="game-title"]',
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && element.textContent && element.textContent.trim().length > 0) {
          const title = element.textContent.trim();
          // Basic validation to avoid picking up navigation or other non-game titles
          if (title.length > 2 && !title.toLowerCase().includes('epic games')) {
            return title;
          }
        }
      }

      return null;
    }

    private extractGogGameTitle(): string | null {
      // Try multiple selectors for GOG title
      const selectors = [
        '.productcard-basics__title',
        'h1.productcard-basics__title',
        '.product-title h1',
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && element.textContent) {
          return element.textContent.trim();
        }
      }

      return null;
    }

    private findGameInLibraries(gameTitle: string): GameLibrary[] {
      // Find all matching games across all platforms
      const matches: GameLibrary[] = [];
      
      for (const game of this.libraries) {
        const confidence = this.calculateMatchConfidence(gameTitle, game.title);

        if (confidence >= 0.85) {
          // High confidence threshold
          matches.push(game);
        }
      }

      return matches;
    }

    private calculateMatchConfidence(title1: string, title2: string): number {
      // Strategy 1: Exact match (case-insensitive)
      if (title1.toLowerCase() === title2.toLowerCase()) {
        return 1.0;
      }

      // Strategy 2: Core title extraction and comparison
      const core1 = this.extractCoreTitle(title1);
      const core2 = this.extractCoreTitle(title2);
      if (core1.toLowerCase() === core2.toLowerCase()) {
        return 0.9;
      }

      return 0.0;
    }

    private extractCoreTitle(title: string): string {
      // Remove common suffixes and prefixes that vary between regions/platforms
      return title
        .replace(
          /\b(game of the year|goty|definitive|enhanced|special|deluxe|premium|gold|ultimate|complete|collector's?|director's?|extended|remastered|remake|hd|4k)\s*(edition|version)?\b/gi,
          ''
        )
        .replace(/\b(digital|standard)\s*(edition|version)?\b/gi, '')
        .replace(/\b(season pass|dlc|expansion)\b/gi, '')
        .replace(/\b(steam|epic|gog|origin|uplay|microsoft store)\s*(edition|version)?\b/gi, '')
        .replace(/\b(pc|windows|mac|linux)\s*(edition|version)?\b/gi, '')
        .replace(/\b(early access|beta|alpha)\b/gi, '')
        .replace(/\s*[\(\[].*?[\)\]]\s*/g, '')
        .replace(/\s*[:-]\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    private showWarning(ownedGames: GameLibrary[], _currentTitle: string) {
      this.hideWarning(); // Remove any existing warning

      // Find the purchase area on Steam
      const purchaseArea = document.querySelector(
        '.game_purchase_action, .game_area_purchase_game, .game_purchase_sub_dropdown'
      );
      if (!purchaseArea) return;

      const platforms = ownedGames.map(game => game.platform).join(', ');
      const platformText = ownedGames.length === 1 
        ? `You own this game on <strong>${platforms}</strong>`
        : `You own this game on <strong>${platforms}</strong>`;

      const warning = document.createElement('div');
      warning.id = 'stop-before-you-buy-warning';
      warning.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #4c6b22, #5c7e2a);
          color: #beee11;
          padding: 12px 16px;
          margin-bottom: 8px;
          border-radius: 3px;
          border: 1px solid #5c7e2a;
          font-family: 'Motiva Sans', Arial, Helvetica, sans-serif;
          font-size: 12px;
          font-weight: normal;
          text-shadow: 1px 1px 0px rgba(0,0,0,0.9);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
        ">
          <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <div style="
              background: #beee11;
              color: #4c6b22;
              padding: 2px 6px;
              border-radius: 2px;
              font-size: 10px;
              font-weight: bold;
              margin-right: 8px;
              text-shadow: none;
            ">OWNED</div>
            <span style="font-weight: bold;">Already in your library</span>
          </div>
          <div style="font-size: 11px; opacity: 0.9;">
            ${platformText}
          </div>
        </div>
      `;

      // Insert the warning before the purchase area
      purchaseArea.parentNode?.insertBefore(warning, purchaseArea);
      this.warningElement = warning;
    }

    private checkSteamCartPage() {
      // Check if we're actually on the cart page
      if (!window.location.href.includes('/cart')) {
        return;
      }

      // Wait a bit for the cart to load
      setTimeout(() => {
        // Find game links in the cart
        const gameLinks = document.querySelectorAll('a[href*="/app/"]');

        if (gameLinks.length > 0) {
          gameLinks.forEach(link => {
            // Find the game title in the cart item structure
            // Look for the title in the parent container structure
            const cartItem = (link as HTMLElement).closest(
              'div[class*="Panel"][class*="Focusable"]'
            );
            let gameTitle = '';

            if (cartItem) {
              // Look for the title element within the cart item
              const titleElement = cartItem.querySelector('div[id*=":r"]');
              if (titleElement) {
                gameTitle = titleElement.textContent?.trim() || '';
              }
            }

            // Fallback: try to get title from img alt attribute
            if (!gameTitle) {
              const imgElement = (link as HTMLElement).querySelector('img');
              if (imgElement) {
                gameTitle = imgElement.getAttribute('alt') || '';
              }
            }

            if (!gameTitle) {
              return;
            }

            const ownedGames = this.findGameInLibraries(gameTitle);
            if (ownedGames.length > 0) {
              // Filter out Steam games since we're on Steam
              const nonSteamGames = ownedGames.filter(game => game.platform.toLowerCase() !== 'steam');
              
              if (nonSteamGames.length === 0) {
                return; // Only owned on Steam, no warning needed
              }

              // Use the cart item container we already found
              if (cartItem) {
                this.showCartWarning(cartItem as HTMLElement, nonSteamGames);
              } else {
                this.showCartWarning(link.parentElement as HTMLElement, nonSteamGames);
              }
            }
          });
        }
      }, 2000);
    }

    private showCartWarning(cartItem: HTMLElement, ownedGames: GameLibrary[]) {
      // Check if warning already exists for this item
      if (cartItem.querySelector('.cart-ownership-warning')) {
        return;
      }
      
      const platforms = ownedGames.map(game => game.platform).join(', ');
      const warning = document.createElement('div');
      warning.className = 'cart-ownership-warning';
      warning.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #d4a017, #e6b800);
          color: #2a1f00;
          padding: 6px 10px;
          margin: 6px 0;
          border-radius: 3px;
          border: 1px solid #b8941a;
          font-family: 'Motiva Sans', Arial, Helvetica, sans-serif;
          font-size: 11px;
          font-weight: bold;
          text-shadow: none;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.2);
          z-index: 1000;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        ">
          <span style="margin-right: 6px;">⚠</span>
          <span>Owned on ${platforms}</span>
        </div>
      `;

      // Try multiple insertion strategies
      // Strategy 1: Look for any div that contains the game title (more robust)
      let insertTarget = cartItem.querySelector('div[id*=":r"]')?.parentElement;
      if (insertTarget) {
        insertTarget.appendChild(warning);
        return;
      }

      // Strategy 2: Look for any div that seems to be a content container
      const contentDivs = cartItem.querySelectorAll('div');
      for (const div of contentDivs) {
        if (div.children.length > 2 && div.offsetHeight > 100) {
          div.appendChild(warning);
          return;
        }
      }

      // Strategy 3: Just append to the cart item itself
      cartItem.appendChild(warning);
    }

    private hideWarning() {
      if (this.warningElement) {
        this.warningElement.remove();
        this.warningElement = null;
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
} // End of conditional block
