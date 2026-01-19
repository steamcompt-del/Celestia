/**
 * Types for Fortune Rush game state and API
 */

// Player in a game room
export interface Player {
    id: string;
    secret: string;
    nickname: string;
    points: number;
    ready: boolean;
    connected: boolean;
}

// Result of a captain's challenge roll
export interface RollResult {
    success: boolean;
    value: number; // 1-100, success if >= 40
    timestamp: number;
}

// Game event for history logging
export interface GameEvent {
    type: string;
    timestamp: number;
    data: Record<string, unknown>;
}

// Room state managed by Durable Object
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
    history: GameEvent[];
    winnerId: string | null;
}

// Client-safe view of room state (no secrets)
export interface PublicRoomState {
    roomToken: string;
    status: RoomState['status'];
    stake: number;
    pot: number;
    maxPlayers: number;
    players: Array<{
        id: string;
        nickname: string;
        points: number;
        ready: boolean;
        connected: boolean;
    }>;
    hostId: string;
    captainIndex: number;
    phase: RoomState['phase'];
    step: number;
    maxSteps: number;
    winThreshold: number;
    lastRoll: RollResult | null;
    decisions: Record<string, 'STAY' | 'LEAVE'>;
    winnerId: string | null;
}

// API request types
export interface CreateRoomRequest {
    stake: number;
    maxPlayers: number;
}

export interface JoinRoomRequest {
    nickname: string;
}

export interface ActionRequest {
    type: 'CAPTAIN_ROLL' | 'STAY' | 'LEAVE';
}

// API response types
export interface CreateRoomResponse {
    roomToken: string;
}

export interface JoinRoomResponse {
    playerId: string;
    playerSecret: string;
}

// WebSocket message types
export interface WSMessage {
    type: 'STATE_UPDATE' | 'ERROR' | 'PLAYER_JOINED' | 'PLAYER_LEFT';
    payload: unknown;
}

// Environment bindings for Worker
export interface Env {
    GAME_ROOM: DurableObjectNamespace;
}
