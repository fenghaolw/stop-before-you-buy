import { GameLibrary } from './types';

export class GameMatcher {
  static findGameInLibraries(gameTitle: string, libraries: GameLibrary[]): GameLibrary[] {
    // Find all matching games across all platforms
    const matches: GameLibrary[] = [];
    
    for (const game of libraries) {
      const confidence = this.calculateMatchConfidence(gameTitle, game.title);

      if (confidence >= 0.85) {
        // High confidence threshold
        matches.push(game);
      }
    }

    return matches;
  }

  private static calculateMatchConfidence(title1: string, title2: string): number {
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

  private static extractCoreTitle(title: string): string {
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
}