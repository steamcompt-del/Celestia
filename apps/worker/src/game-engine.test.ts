/**
 * Unit tests for game engine logic
 */

import { describe, it, expect } from 'vitest';
import {
    rollChallenge,
    resolveRound,
    checkWinCondition,
    distributePot,
    collectStakes,
    getNextCaptain,
    isValidStake,
    generateRoomToken,
    generatePlayerCredentials,
    GAME_CONFIG,
} from './game-engine';
import type { Player, RollResult } from './types';

describe('Game Engine', () => {
    describe('rollChallenge', () => {
        it('should return a value between 1 and 100', () => {
            for (let i = 0; i < 100; i++) {
                const result = rollChallenge();
                expect(result.value).toBeGreaterThanOrEqual(1);
                expect(result.value).toBeLessThanOrEqual(100);
            }
        });

        it('should mark success when value >= 40', () => {
            // We can't control the random, but we can verify the logic
            const result = rollChallenge();
            expect(result.success).toBe(result.value >= GAME_CONFIG.SUCCESS_THRESHOLD);
        });

        it('should include timestamp', () => {
            const before = Date.now();
            const result = rollChallenge();
            const after = Date.now();
            expect(result.timestamp).toBeGreaterThanOrEqual(before);
            expect(result.timestamp).toBeLessThanOrEqual(after);
        });
    });

    describe('resolveRound', () => {
        const createPlayers = (): Player[] => [
            { id: 'p1', secret: 's1', nickname: 'Player1', points: 100, ready: true, connected: true },
            { id: 'p2', secret: 's2', nickname: 'Player2', points: 100, ready: true, connected: true },
            { id: 'p3', secret: 's3', nickname: 'Player3', points: 100, ready: true, connected: true },
        ];

        it('should add points on success for STAY players', () => {
            const players = createPlayers();
            const decisions = { p1: 'STAY' as const, p2: 'STAY' as const, p3: 'LEAVE' as const };
            const roll: RollResult = { success: true, value: 75, timestamp: Date.now() };

            const result = resolveRound(players, decisions, roll);

            expect(result[0].points).toBe(100 + GAME_CONFIG.SUCCESS_REWARD); // STAY + success
            expect(result[1].points).toBe(100 + GAME_CONFIG.SUCCESS_REWARD); // STAY + success
            expect(result[2].points).toBe(100); // LEAVE - no change
        });

        it('should subtract points on failure for STAY players', () => {
            const players = createPlayers();
            const decisions = { p1: 'STAY' as const, p2: 'LEAVE' as const, p3: 'STAY' as const };
            const roll: RollResult = { success: false, value: 20, timestamp: Date.now() };

            const result = resolveRound(players, decisions, roll);

            expect(result[0].points).toBe(100 - GAME_CONFIG.FAILURE_PENALTY); // STAY + failure
            expect(result[1].points).toBe(100); // LEAVE - no change
            expect(result[2].points).toBe(100 - GAME_CONFIG.FAILURE_PENALTY); // STAY + failure
        });

        it('should not allow points to go below 0', () => {
            const players: Player[] = [
                { id: 'p1', secret: 's1', nickname: 'Player1', points: 5, ready: true, connected: true },
            ];
            const decisions = { p1: 'STAY' as const };
            const roll: RollResult = { success: false, value: 20, timestamp: Date.now() };

            const result = resolveRound(players, decisions, roll);

            expect(result[0].points).toBe(0); // Should clamp at 0
        });
    });

    describe('checkWinCondition', () => {
        it('should return winner when threshold reached', () => {
            const players: Player[] = [
                { id: 'p1', secret: 's1', nickname: 'Player1', points: 150, ready: true, connected: true },
                { id: 'p2', secret: 's2', nickname: 'Player2', points: 80, ready: true, connected: true },
            ];

            const winnerId = checkWinCondition(players, 3, 10, 150);
            expect(winnerId).toBe('p1');
        });

        it('should return highest scorer when max steps reached', () => {
            const players: Player[] = [
                { id: 'p1', secret: 's1', nickname: 'Player1', points: 120, ready: true, connected: true },
                { id: 'p2', secret: 's2', nickname: 'Player2', points: 130, ready: true, connected: true },
            ];

            const winnerId = checkWinCondition(players, 10, 10, 150);
            expect(winnerId).toBe('p2');
        });

        it('should return last player with points when others have 0', () => {
            const players: Player[] = [
                { id: 'p1', secret: 's1', nickname: 'Player1', points: 0, ready: true, connected: true },
                { id: 'p2', secret: 's2', nickname: 'Player2', points: 50, ready: true, connected: true },
            ];

            const winnerId = checkWinCondition(players, 3, 10, 150);
            expect(winnerId).toBe('p2');
        });

        it('should return null when game continues', () => {
            const players: Player[] = [
                { id: 'p1', secret: 's1', nickname: 'Player1', points: 100, ready: true, connected: true },
                { id: 'p2', secret: 's2', nickname: 'Player2', points: 100, ready: true, connected: true },
            ];

            const winnerId = checkWinCondition(players, 3, 10, 150);
            expect(winnerId).toBeNull();
        });
    });

    describe('distributePot', () => {
        it('should give pot to winner only', () => {
            const players: Player[] = [
                { id: 'p1', secret: 's1', nickname: 'Player1', points: 100, ready: true, connected: true },
                { id: 'p2', secret: 's2', nickname: 'Player2', points: 80, ready: true, connected: true },
            ];

            const result = distributePot(players, 'p1', 50);

            expect(result[0].points).toBe(150); // Winner gets pot
            expect(result[1].points).toBe(80); // Loser unchanged
        });
    });

    describe('collectStakes', () => {
        it('should deduct stake from all players and calculate pot', () => {
            const players: Player[] = [
                { id: 'p1', secret: 's1', nickname: 'Player1', points: 100, ready: true, connected: true },
                { id: 'p2', secret: 's2', nickname: 'Player2', points: 100, ready: true, connected: true },
                { id: 'p3', secret: 's3', nickname: 'Player3', points: 100, ready: true, connected: true },
            ];

            const result = collectStakes(players, 10);

            expect(result.pot).toBe(30); // 10 * 3 players
            expect(result.players[0].points).toBe(90);
            expect(result.players[1].points).toBe(90);
            expect(result.players[2].points).toBe(90);
        });
    });

    describe('getNextCaptain', () => {
        it('should rotate captain index', () => {
            expect(getNextCaptain(0, 4)).toBe(1);
            expect(getNextCaptain(1, 4)).toBe(2);
            expect(getNextCaptain(3, 4)).toBe(0); // Wrap around
        });
    });

    describe('isValidStake', () => {
        it('should accept valid stakes', () => {
            expect(isValidStake(5)).toBe(true);
            expect(isValidStake(25)).toBe(true);
            expect(isValidStake(50)).toBe(true);
        });

        it('should reject invalid stakes', () => {
            expect(isValidStake(4)).toBe(false); // Too low
            expect(isValidStake(51)).toBe(false); // Too high
            expect(isValidStake(10.5)).toBe(false); // Not integer
        });
    });

    describe('generateRoomToken', () => {
        it('should generate 8-character hex tokens', () => {
            const token = generateRoomToken();
            expect(token).toMatch(/^[A-F0-9]{8}$/);
        });

        it('should generate unique tokens', () => {
            const tokens = new Set<string>();
            for (let i = 0; i < 100; i++) {
                tokens.add(generateRoomToken());
            }
            expect(tokens.size).toBe(100);
        });
    });

    describe('generatePlayerCredentials', () => {
        it('should generate id and secret', () => {
            const creds = generatePlayerCredentials();
            expect(creds.id).toMatch(/^[a-f0-9]{16}$/);
            expect(creds.secret).toMatch(/^[a-f0-9]{32}$/);
        });
    });
});
