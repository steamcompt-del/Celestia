/**
 * API client for Fortune Rush backend
 */

const API_BASE = '/api';

interface CreateRoomParams {
    stake: number;
    maxPlayers: number;
}

interface JoinRoomParams {
    nickname: string;
}

interface ActionParams {
    type: 'CAPTAIN_ROLL' | 'STAY' | 'LEAVE';
}

// Get stored credentials
function getCredentials(): { playerId: string; playerSecret: string } | null {
    const session = localStorage.getItem('fortune-rush-session');
    if (!session) return null;
    try {
        return JSON.parse(session);
    } catch {
        return null;
    }
}

// Add auth headers if credentials exist
function authHeaders(): Record<string, string> {
    const creds = getCredentials();
    if (!creds) return {};
    return {
        'x-player-id': creds.playerId,
        'x-player-secret': creds.playerSecret,
    };
}

/**
 * Create a new room
 */
export async function createRoom(params: CreateRoomParams): Promise<{ roomToken: string }> {
    const res = await fetch(`${API_BASE}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create room');
    }

    return res.json();
}

/**
 * Join a room
 */
export async function joinRoom(roomToken: string, params: JoinRoomParams): Promise<{ playerId: string; playerSecret: string }> {
    const res = await fetch(`${API_BASE}/rooms/${roomToken}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to join room');
    }

    return res.json();
}

/**
 * Toggle ready status
 */
export async function toggleReady(roomToken: string): Promise<{ ready: boolean }> {
    const res = await fetch(`${API_BASE}/rooms/${roomToken}/ready`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to toggle ready');
    }

    return res.json();
}

/**
 * Start the game (host only)
 */
export async function startGame(roomToken: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/rooms/${roomToken}/start`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to start game');
    }

    return res.json();
}

/**
 * Send game action
 */
export async function sendAction(roomToken: string, action: ActionParams): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/rooms/${roomToken}/action`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify(action),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send action');
    }

    return res.json();
}

/**
 * Get room state
 */
export async function getRoomState(roomToken: string): Promise<unknown> {
    const res = await fetch(`${API_BASE}/rooms/${roomToken}/state`, {
        headers: authHeaders(),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to get room state');
    }

    return res.json();
}

/**
 * Get WebSocket URL for room
 */
export function getWebSocketUrl(roomToken: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/rooms/${roomToken}/ws`;
}
