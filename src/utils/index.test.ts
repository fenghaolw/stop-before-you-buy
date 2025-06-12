import { describe, expect, it } from 'vitest';
import {
    normalizeGameTitle,
    findGameInLibraries,
    getLibraryCount,
    getTotalGames,
    formatGameTitle,
} from './index';
import type { Game, Platform } from '../types';

describe('Game Library Utils', () => {
    describe('normalizeGameTitle', () => {
        it('should convert to lowercase and trim whitespace', () => {
            expect(normalizeGameTitle('  The Witcher 3  ')).toBe('the witcher 3');
            expect(normalizeGameTitle('Cyberpunk 2077')).toBe('cyberpunk 2077');
        });
    });

    describe('findGameInLibraries', () => {
        it('should find a game in libraries', () => {
            const libraries = {
                steam: [
                    { id: '1', title: 'The Witcher 3', platform: 'steam' as Platform },
                    { id: '2', title: 'Cyberpunk 2077', platform: 'steam' as Platform },
                ],
                epic: [
                    { id: '3', title: 'Red Dead Redemption 2', platform: 'epic' as Platform },
                ],
                gog: [
                    { id: '4', title: 'Baldur\'s Gate 3', platform: 'gog' as Platform },
                ],
            };

            const result = findGameInLibraries('the witcher 3', libraries);
            expect(result).toEqual({
                found: true,
                platform: 'steam',
                game: { id: '1', title: 'The Witcher 3', platform: 'steam' },
            });
        });

        it('should return not found for non-existent game', () => {
            const libraries = {
                steam: [
                    { id: '1', title: 'The Witcher 3', platform: 'steam' as Platform },
                ],
                epic: [],
                gog: [],
            };

            const result = findGameInLibraries('nonexistent game', libraries);
            expect(result).toEqual({
                found: false,
                platform: null,
                game: null,
            });
        });
    });

    describe('getLibraryCount', () => {
        it('should return correct number of games', () => {
            const library: Game[] = [
                { id: '1', title: 'The Witcher 3', platform: 'steam' as Platform },
                { id: '2', title: 'Cyberpunk 2077', platform: 'steam' as Platform },
            ];
            expect(getLibraryCount(library)).toBe(2);
        });

        it('should return 0 for empty library', () => {
            const library: Game[] = [];
            expect(getLibraryCount(library)).toBe(0);
        });
    });

    describe('getTotalGames', () => {
        it('should return total number of games across libraries', () => {
            const libraries = {
                steam: [
                    { id: '1', title: 'The Witcher 3', platform: 'steam' as Platform },
                    { id: '2', title: 'Cyberpunk 2077', platform: 'steam' as Platform },
                ],
                epic: [
                    { id: '3', title: 'Red Dead Redemption 2', platform: 'epic' as Platform },
                ],
                gog: [
                    { id: '4', title: 'Baldur\'s Gate 3', platform: 'gog' as Platform },
                ],
            };

            expect(getTotalGames(libraries)).toBe(4);
        });
    });

    describe('formatGameTitle', () => {
        it('should capitalize each word', () => {
            expect(formatGameTitle('the witcher 3')).toBe('The Witcher 3');
            expect(formatGameTitle('cyberpunk 2077')).toBe('Cyberpunk 2077');
        });

        it('should handle single word titles', () => {
            expect(formatGameTitle('minecraft')).toBe('Minecraft');
        });
    });
}); 