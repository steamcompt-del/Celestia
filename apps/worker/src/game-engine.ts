/**
 * Game Engine - Pure functions for Fortune Rush game logic
 * All randomness happens here (server-side only)
 */

import type { RoomState, RollResult, Player } from './types';

// Game configuration constants
export const GAME_CONFIG = {
    SUCCESS_THRESHOLD: 40, // Roll >= 40 is success
    SUCCESS_REWARD: 5,     // Points gained on success (for those who STAY)
    FAILURE_PENALTY: 10,   // Points lost on failure (for those who STAY)
    WIN_THRESHOLD: 150,    // Points to win
    MAX_STEPS: 10,         // Max rounds before forced end
    MIN_STAKE: 5,
    MAX_STAKE: 50,
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 8,
    STARTING_POINTS: 100,
} as const;

/**
 * Generate a random roll for the captain's challenge
 * Uses crypto for secure randomness
 */
export function rollChallenge(): RollResult {
    const array = new Uint8Array(1);
    crypto.getRandomValues(array);
    const value = (array[0] % 100) + 1; // 1-100

    return {
        success: value >= GAME_CONFIG.SUCCESS_THRESHOLD,
        value,
        timestamp: Date.now(),
    };
}

/**
 * Apply round resolution: update points based on roll and decisions
 * Returns updated players array
 */
export function resolveRound(
    players: Player[],
    decisions: Record<string, 'STAY' | 'LEAVE'>,
    roll: RollResult
): Player[] {
    return players.map(player => {
        const decision = decisions[player.id];

        // Players who LEFT are not affected
        if (decision === 'LEAVE') {
            return player;
        }

        // Players who STAYED (or captain who auto-stays)
        if (decision === 'STAY') {
            const pointChange = roll.success
                ? GAME_CONFIG.SUCCESS_REWARD
                : -GAME_CONFIG.FAILURE_PENALTY;

            return {
                ...player,
                points: Math.max(0, player.points + pointChange),
            };
        }

        return player;
    });
}

/**
 * Check if game should end
 * Returns winner ID or null if game continues
 */
export function checkWinCondition(
    players: Player[],
    step: number,
    maxSteps: number,
    winThreshold: number
): string | null {
    // Check if any player reached win threshold
    const thresholdWinner = players.find(p => p.points >= winThreshold);
    if (thresholdWinner) {
        return thresholdWinner.id;
    }

    // Check if max steps reached
    if (step >= maxSteps) {
        // Winner is player with most points
        const sorted = [...players].sort((a, b) => b.points - a.points);
        return sorted[0]?.id ?? null;
    }

    // Check if only one player has points > 0
    const activePlayers = players.filter(p => p.points > 0);
    if (activePlayers.length === 1) {
        return activePlayers[0].id;
    }

    // Game continues
    return null;
}

/**
 * Distribute pot to winner
 * Returns updated players array
 */
export function distributePot(
    players: Player[],
    winnerId: string,
    pot: number
): Player[] {
    return players.map(player => {
        if (player.id === winnerId) {
            return {
                ...player,
                points: player.points + pot,
            };
        }
        return player;
    });
}

/**
 * Deduct stake from all players and calculate pot
 */
export function collectStakes(
    players: Player[],
    stake: number
): { players: Player[]; pot: number } {
    const pot = stake * players.length;
    const updatedPlayers = players.map(player => ({
        ...player,
        points: player.points - stake,
    }));

    return { players: updatedPlayers, pot };
}

/**
 * Get next captain index (round-robin)
 */
export function getNextCaptain(
    currentIndex: number,
    playerCount: number
): number {
    return (currentIndex + 1) % playerCount;
}

/**
 * Validate stake amount
 */
export function isValidStake(stake: number): boolean {
    return (
        Number.isInteger(stake) &&
        stake >= GAME_CONFIG.MIN_STAKE &&
        stake <= GAME_CONFIG.MAX_STAKE
    );
}

/**
 * Validate player count
 */
export function isValidPlayerCount(count: number, max: number): boolean {
    return count >= GAME_CONFIG.MIN_PLAYERS && count <= max;
}

/**
 * Generate a unique token for room identification
 */
export function generateRoomToken(): string {
    const array = new Uint8Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Generate a player ID and secret
 */
export function generatePlayerCredentials(): { id: string; secret: string } {
    const idArray = new Uint8Array(8);
    const secretArray = new Uint8Array(16);
    crypto.getRandomValues(idArray);
    crypto.getRandomValues(secretArray);

    return {
        id: Array.from(idArray, b => b.toString(16).padStart(2, '0')).join(''),
        secret: Array.from(secretArray, b => b.toString(16).padStart(2, '0')).join(''),
    };
}

/**
 * Create initial room state
 */
export function createInitialState(
    roomToken: string,
    stake: number,
    maxPlayers: number
): RoomState {
    return {
        roomToken,
        status: 'LOBBY',
        stake,
        pot: 0,
        maxPlayers,
        players: [],
        hostId: '',
        captainIndex: 0,
        phase: 'WAIT_READY',
        step: 0,
        maxSteps: GAME_CONFIG.MAX_STEPS,
        winThreshold: GAME_CONFIG.WIN_THRESHOLD,
        lastRoll: null,
        decisions: {},
        history: [],
        winnerId: null,
    };
}

/**
 * Check if all connected players have made their decision
 */
export function allDecisionsMade(
    players: Player[],
    decisions: Record<string, 'STAY' | 'LEAVE'>,
    captainId: string
): boolean {
    const nonCaptainPlayers = players.filter(
        p => p.id !== captainId && p.connected
    );

    return nonCaptainPlayers.every(p => decisions[p.id] !== undefined);
}
