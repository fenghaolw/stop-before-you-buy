export class TitleExtractor {
  static extractSteamGameTitle(): string | null {
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

  static extractEpicGameTitle(): string | null {
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

  static extractGogGameTitle(): string | null {
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
}