/**
 * Shared types for the frontend
 */

// Player in room (public view)
export interface Player {
    id: string;
    nickname: string;
    points: number;
    ready: boolean;
    connected: boolean;
}

// Roll result from captain's challenge
export interface RollResult {
    success: boolean;
    value: number;
    timestamp: number;
}

// Public room state from server
export interface RoomState {
    roomToken: string;
    status: 'LOBBY' | 'PLAYING' | 'FINISHED';
    stake: number;
    pot: number;
    maxPlayers: number;
    players: Player[];
    hostId: string;
    captainIndex: number;
    phase: 'WAIT_READY' | 'CAPTAIN_TURN' | 'DECISIONS' | 'RESOLUTION';
    step: number;
    maxSteps: number;
    winThreshold: number;
    lastRoll: RollResult | null;
    decisions: Record<string, 'STAY' | 'LEAVE'>;
    winnerId: string | null;
}

// Session stored in localStorage
export interface Session {
    playerId: string;
    playerSecret: string;
    roomToken: string;
    nickname: string;
}

// WebSocket message
export interface WSMessage {
    type: 'STATE_UPDATE' | 'ERROR' | 'PLAYER_JOINED' | 'PLAYER_LEFT';
    payload: unknown;
}
