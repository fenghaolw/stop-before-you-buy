import type { Game, Platform, Library } from '../types';

export const normalizeGameTitle = (title: string): string => {
  return title.toLowerCase().trim();
};

export const findGameInLibraries = (gameTitle: string, libraries: Library): { found: boolean; platform: Platform | null; game: Game | null } => {
  const normalizedTitle = normalizeGameTitle(gameTitle);

  for (const platform of ['steam', 'epic', 'gog'] as Platform[]) {
    const game = libraries[platform].find(g => normalizeGameTitle(g.title) === normalizedTitle);
    if (game) {
      return {
        found: true,
        platform,
        game,
      };
    }
  }

  return {
    found: false,
    platform: null,
    game: null,
  };
};

export const getLibraryCount = (library: Game[]): number => {
  return library.length;
};

export const getTotalGames = (libraries: Library): number => {
  return Object.values(libraries).reduce((total, library) => total + library.length, 0);
};

export const formatGameTitle = (title: string): string => {
  return title
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
