import { GameLibrary } from './types';
import { TitleExtractor } from './titleExtractor';
import { GameMatcher } from './gameMatcher';
import { WarningDisplay } from './warningDisplay';

export class PageChecker {
  static checkSteamPage(libraries: GameLibrary[]) {
    const gameTitle = TitleExtractor.extractSteamGameTitle();
    if (gameTitle) {
      const ownedGames = GameMatcher.findGameInLibraries(gameTitle, libraries);
      const nonSteamGames = ownedGames.filter(game => game.platform.toLowerCase() !== 'steam');

      if (nonSteamGames.length > 0) {
        WarningDisplay.showWarning(nonSteamGames, gameTitle);
      } else {
        WarningDisplay.hideWarning();
      }
    }
  }

  static checkEpicPage(libraries: GameLibrary[]) {
    const gameTitle = TitleExtractor.extractEpicGameTitle();
    if (gameTitle) {
      const ownedGames = GameMatcher.findGameInLibraries(gameTitle, libraries);
      const nonEpicGames = ownedGames.filter(game => {
        const platform = game.platform.toLowerCase();
        return platform !== 'epic' && platform !== 'epic games';
      });

      if (nonEpicGames.length > 0) {
        WarningDisplay.showWarning(nonEpicGames, gameTitle);
      } else {
        WarningDisplay.hideWarning();
      }
    }
  }

  static checkGogPage(libraries: GameLibrary[]) {
    const gameTitle = TitleExtractor.extractGogGameTitle();
    if (gameTitle) {
      const ownedGames = GameMatcher.findGameInLibraries(gameTitle, libraries);
      const nonGogGames = ownedGames.filter(game => game.platform.toLowerCase() !== 'gog');

      if (nonGogGames.length > 0) {
        WarningDisplay.showWarning(nonGogGames, gameTitle);
      } else {
        WarningDisplay.hideWarning();
      }
    }
  }

  static checkSteamCartPage(libraries: GameLibrary[]) {
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

          const ownedGames = GameMatcher.findGameInLibraries(gameTitle, libraries);
          if (ownedGames.length > 0) {
            // Filter out Steam games since we're on Steam
            const nonSteamGames = ownedGames.filter(
              game => game.platform.toLowerCase() !== 'steam'
            );

            if (nonSteamGames.length === 0) {
              return; // Only owned on Steam, no warning needed
            }

            // Use the cart item container we already found
            if (cartItem) {
              WarningDisplay.showCartWarning(cartItem as HTMLElement, nonSteamGames);
            } else {
              WarningDisplay.showCartWarning(link.parentElement as HTMLElement, nonSteamGames);
            }
          }
        });
      }
    }, 2000);
  }
}