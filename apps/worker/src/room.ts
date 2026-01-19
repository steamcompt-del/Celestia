/**
 * GameRoom Durable Object - Manages room state and WebSocket connections
 * All game state is persisted here, and all actions are validated server-side
 */

import type {
    RoomState,
    PublicRoomState,
    Player,
    GameEvent,
    JoinRoomRequest,
    ActionRequest,
} from './types';

import {
    GAME_CONFIG,
    createInitialState,
    generatePlayerCredentials,
    rollChallenge,
    resolveRound,
    checkWinCondition,
    distributePot,
    collectStakes,
    getNextCaptain,
    allDecisionsMade,
} from './game-engine';

export class GameRoom implements DurableObject {
    private state: DurableObjectState;
    private roomState: RoomState | null = null;
    private sessions: Map<WebSocket, string> = new Map(); // ws -> playerId

    constructor(state: DurableObjectState) {
        this.state = state;
    }

    /**
     * Load room state from storage
     */
    private async loadState(): Promise<RoomState | null> {
        if (this.roomState) return this.roomState;
        this.roomState = await this.state.storage.get<RoomState>('room');
        return this.roomState;
    }

    /**
     * Save room state to storage and broadcast to all connected clients
     */
    private async saveAndBroadcast(): Promise<void> {
        if (!this.roomState) return;
        await this.state.storage.put('room', this.roomState);
        this.broadcast({ type: 'STATE_UPDATE', payload: this.getPublicState() });
    }

    /**
     * Add event to history log
     */
    private logEvent(type: string, data: Record<string, unknown>): void {
        if (!this.roomState) return;
        const event: GameEvent = { type, timestamp: Date.now(), data };
        this.roomState.history.push(event);
        // Keep history limited
        if (this.roomState.history.length > 100) {
            this.roomState.history = this.roomState.history.slice(-50);
        }
    }

    /**
     * Get public state (no secrets)
     */
    private getPublicState(): PublicRoomState | null {
        if (!this.roomState) return null;
        return {
            roomToken: this.roomState.roomToken,
            status: this.roomState.status,
            stake: this.roomState.stake,
            pot: this.roomState.pot,
            maxPlayers: this.roomState.maxPlayers,
            players: this.roomState.players.map(p => ({
                id: p.id,
                nickname: p.nickname,
                points: p.points,
                ready: p.ready,
                connected: p.connected,
            })),
            hostId: this.roomState.hostId,
            captainIndex: this.roomState.captainIndex,
            phase: this.roomState.phase,
            step: this.roomState.step,
            maxSteps: this.roomState.maxSteps,
            winThreshold: this.roomState.winThreshold,
            lastRoll: this.roomState.lastRoll,
            decisions: this.roomState.decisions,
            winnerId: this.roomState.winnerId,
        };
    }

    /**
     * Broadcast message to all connected WebSocket clients
     */
    private broadcast(message: { type: string; payload: unknown }): void {
        const data = JSON.stringify(message);
        for (const ws of this.sessions.keys()) {
            try {
                ws.send(data);
            } catch {
                // Client disconnected
            }
        }
    }

    /**
     * Validate player credentials
     */
    private validatePlayer(playerId: string, playerSecret: string): Player | null {
        if (!this.roomState) return null;
        const player = this.roomState.players.find(p => p.id === playerId);
        if (!player || player.secret !== playerSecret) return null;
        return player;
    }

    /**
     * Main HTTP request handler
     */
    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        try {
            // WebSocket upgrade
            if (path === '/ws' && request.headers.get('Upgrade') === 'websocket') {
                return this.handleWebSocket(request);
            }

            // REST endpoints
            if (request.method === 'POST' && path === '/create') {
                return this.handleCreate(request);
            }

            if (request.method === 'POST' && path === '/join') {
                return this.handleJoin(request);
            }

            if (request.method === 'POST' && path === '/ready') {
                return this.handleReady(request);
            }

            if (request.method === 'POST' && path === '/start') {
                return this.handleStart(request);
            }

            if (request.method === 'POST' && path === '/action') {
                return this.handleAction(request);
            }

            if (request.method === 'GET' && path === '/state') {
                return this.handleGetState();
            }

            return this.jsonResponse({ error: 'Not Found' }, 404);
        } catch (error) {
            console.error('Error handling request:', error);
            return this.jsonResponse({ error: 'Internal Server Error' }, 500);
        }
    }

    /**
     * Create a new room
     */
    private async handleCreate(request: Request): Promise<Response> {
        const existingState = await this.loadState();
        if (existingState) {
            return this.jsonResponse({ error: 'Room already exists' }, 400);
        }

        const body = await request.json() as { stake: number; maxPlayers: number; roomToken: string };
        const { stake, maxPlayers, roomToken } = body;

        if (!stake || stake < GAME_CONFIG.MIN_STAKE || stake > GAME_CONFIG.MAX_STAKE) {
            return this.jsonResponse({ error: 'Invalid stake' }, 400);
        }

        if (!maxPlayers || maxPlayers < GAME_CONFIG.MIN_PLAYERS || maxPlayers > GAME_CONFIG.MAX_PLAYERS) {
            return this.jsonResponse({ error: 'Invalid maxPlayers' }, 400);
        }

        this.roomState = createInitialState(roomToken, stake, maxPlayers);
        await this.saveAndBroadcast();

        this.logEvent('ROOM_CREATED', { stake, maxPlayers });

        return this.jsonResponse({ roomToken });
    }

    /**
     * Join a room
     */
    private async handleJoin(request: Request): Promise<Response> {
        const state = await this.loadState();
        if (!state) {
            return this.jsonResponse({ error: 'Room not found' }, 404);
        }

        if (state.status !== 'LOBBY') {
            return this.jsonResponse({ error: 'Game already started' }, 400);
        }

        if (state.players.length >= state.maxPlayers) {
            return this.jsonResponse({ error: 'Room is full' }, 400);
        }

        const body = await request.json() as JoinRoomRequest;
        const { nickname } = body;

        if (!nickname || nickname.trim().length < 1 || nickname.trim().length > 20) {
            return this.jsonResponse({ error: 'Invalid nickname' }, 400);
        }

        // Check for duplicate nickname
        if (state.players.some(p => p.nickname.toLowerCase() === nickname.trim().toLowerCase())) {
            return this.jsonResponse({ error: 'Nickname already taken' }, 400);
        }

        const credentials = generatePlayerCredentials();
        const player: Player = {
            id: credentials.id,
            secret: credentials.secret,
            nickname: nickname.trim(),
            points: GAME_CONFIG.STARTING_POINTS,
            ready: false,
            connected: false,
        };

        state.players.push(player);

        // First player is host
        if (state.players.length === 1) {
            state.hostId = player.id;
        }

        this.logEvent('PLAYER_JOINED', { playerId: player.id, nickname: player.nickname });
        await this.saveAndBroadcast();

        return this.jsonResponse({
            playerId: credentials.id,
            playerSecret: credentials.secret,
        });
    }

    /**
     * Set player ready status
     */
    private async handleReady(request: Request): Promise<Response> {
        const state = await this.loadState();
        if (!state) {
            return this.jsonResponse({ error: 'Room not found' }, 404);
        }

        if (state.status !== 'LOBBY') {
            return this.jsonResponse({ error: 'Game already started' }, 400);
        }

        const playerId = request.headers.get('x-player-id');
        const playerSecret = request.headers.get('x-player-secret');

        if (!playerId || !playerSecret) {
            return this.jsonResponse({ error: 'Missing credentials' }, 401);
        }

        const player = this.validatePlayer(playerId, playerSecret);
        if (!player) {
            return this.jsonResponse({ error: 'Invalid credentials' }, 401);
        }

        player.ready = !player.ready;
        this.logEvent('PLAYER_READY', { playerId, ready: player.ready });
        await this.saveAndBroadcast();

        return this.jsonResponse({ ready: player.ready });
    }

    /**
     * Start the game (host only)
     */
    private async handleStart(request: Request): Promise<Response> {
        const state = await this.loadState();
        if (!state) {
            return this.jsonResponse({ error: 'Room not found' }, 404);
        }

        if (state.status !== 'LOBBY') {
            return this.jsonResponse({ error: 'Game already started' }, 400);
        }

        const playerId = request.headers.get('x-player-id');
        const playerSecret = request.headers.get('x-player-secret');

        if (!playerId || !playerSecret) {
            return this.jsonResponse({ error: 'Missing credentials' }, 401);
        }

        if (playerId !== state.hostId) {
            return this.jsonResponse({ error: 'Only host can start the game' }, 403);
        }

        const player = this.validatePlayer(playerId, playerSecret);
        if (!player) {
            return this.jsonResponse({ error: 'Invalid credentials' }, 401);
        }

        if (state.players.length < GAME_CONFIG.MIN_PLAYERS) {
            return this.jsonResponse({ error: 'Not enough players' }, 400);
        }

        const allReady = state.players.every(p => p.ready);
        if (!allReady) {
            return this.jsonResponse({ error: 'Not all players are ready' }, 400);
        }

        // Collect stakes and start game
        const result = collectStakes(state.players, state.stake);
        state.players = result.players;
        state.pot = result.pot;
        state.status = 'PLAYING';
        state.phase = 'CAPTAIN_TURN';
        state.step = 1;
        state.captainIndex = 0;
        state.decisions = {};

        this.logEvent('GAME_STARTED', { pot: state.pot });
        await this.saveAndBroadcast();

        return this.jsonResponse({ success: true });
    }

    /**
     * Handle game action (roll, stay, leave)
     */
    private async handleAction(request: Request): Promise<Response> {
        const state = await this.loadState();
        if (!state) {
            return this.jsonResponse({ error: 'Room not found' }, 404);
        }

        if (state.status !== 'PLAYING') {
            return this.jsonResponse({ error: 'Game not in progress' }, 400);
        }

        const playerId = request.headers.get('x-player-id');
        const playerSecret = request.headers.get('x-player-secret');

        if (!playerId || !playerSecret) {
            return this.jsonResponse({ error: 'Missing credentials' }, 401);
        }

        const player = this.validatePlayer(playerId, playerSecret);
        if (!player) {
            return this.jsonResponse({ error: 'Invalid credentials' }, 401);
        }

        const body = await request.json() as ActionRequest;
        const { type } = body;

        const captain = state.players[state.captainIndex];

        switch (type) {
            case 'CAPTAIN_ROLL':
                if (state.phase !== 'CAPTAIN_TURN') {
                    return this.jsonResponse({ error: 'Not captain turn phase' }, 400);
                }
                if (playerId !== captain.id) {
                    return this.jsonResponse({ error: 'Only captain can roll' }, 403);
                }

                // Perform the roll
                state.lastRoll = rollChallenge();
                state.decisions = { [captain.id]: 'STAY' }; // Captain auto-stays
                state.phase = 'DECISIONS';

                this.logEvent('CAPTAIN_ROLLED', {
                    captainId: captain.id,
                    roll: state.lastRoll
                });

                // If only captain in game, skip to resolution
                if (state.players.filter(p => p.connected || p.points > 0).length === 1) {
                    await this.resolveAndAdvance();
                } else {
                    await this.saveAndBroadcast();
                }
                break;

            case 'STAY':
            case 'LEAVE':
                if (state.phase !== 'DECISIONS') {
                    return this.jsonResponse({ error: 'Not decision phase' }, 400);
                }
                if (playerId === captain.id) {
                    return this.jsonResponse({ error: 'Captain cannot change decision' }, 400);
                }
                if (state.decisions[playerId]) {
                    return this.jsonResponse({ error: 'Already made decision' }, 400);
                }

                state.decisions[playerId] = type;
                this.logEvent('PLAYER_DECISION', { playerId, decision: type });

                // Check if all decisions are in
                if (allDecisionsMade(state.players, state.decisions, captain.id)) {
                    await this.resolveAndAdvance();
                } else {
                    await this.saveAndBroadcast();
                }
                break;

            default:
                return this.jsonResponse({ error: 'Invalid action type' }, 400);
        }

        return this.jsonResponse({ success: true });
    }

    /**
     * Resolve the current round and advance game state
     */
    private async resolveAndAdvance(): Promise<void> {
        if (!this.roomState || !this.roomState.lastRoll) return;

        // Apply resolution
        this.roomState.players = resolveRound(
            this.roomState.players,
            this.roomState.decisions,
            this.roomState.lastRoll
        );

        this.logEvent('ROUND_RESOLVED', {
            roll: this.roomState.lastRoll,
            decisions: this.roomState.decisions,
        });

        // Check win condition
        const winnerId = checkWinCondition(
            this.roomState.players,
            this.roomState.step,
            this.roomState.maxSteps,
            this.roomState.winThreshold
        );

        if (winnerId) {
            // Game over
            this.roomState.players = distributePot(
                this.roomState.players,
                winnerId,
                this.roomState.pot
            );
            this.roomState.status = 'FINISHED';
            this.roomState.winnerId = winnerId;
            this.roomState.pot = 0;

            this.logEvent('GAME_FINISHED', { winnerId });
        } else {
            // Next round
            this.roomState.step++;
            this.roomState.captainIndex = getNextCaptain(
                this.roomState.captainIndex,
                this.roomState.players.length
            );
            this.roomState.phase = 'CAPTAIN_TURN';
            this.roomState.decisions = {};
            this.roomState.lastRoll = null;
        }

        await this.saveAndBroadcast();
    }

    /**
     * Get current room state
     */
    private async handleGetState(): Promise<Response> {
        const state = await this.loadState();
        if (!state) {
            return this.jsonResponse({ error: 'Room not found' }, 404);
        }
        return this.jsonResponse(this.getPublicState());
    }

    /**
     * Handle WebSocket connection
     * Loads state first, then accepts connection
     */
    private async handleWebSocket(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // Try headers first, then query params (for browser compatibility)
        const playerId = request.headers.get('x-player-id') || url.searchParams.get('playerId');
        const playerSecret = request.headers.get('x-player-secret') || url.searchParams.get('playerSecret');

        // Load state BEFORE accepting WebSocket
        await this.loadState();

        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

        // Accept the WebSocket connection
        server.accept();

        // Register session synchronously
        if (playerId && playerSecret && this.roomState) {
            const player = this.validatePlayer(playerId, playerSecret);
            if (player) {
                this.sessions.set(server, playerId);
                player.connected = true;
            }
        }

        // Set up event listeners
        server.addEventListener('message', (event) => {
            console.log('WS message received:', event.data);
        });

        server.addEventListener('close', () => {
            const pid = this.sessions.get(server);
            if (pid && this.roomState) {
                const player = this.roomState.players.find(p => p.id === pid);
                if (player) {
                    player.connected = false;
                }
            }
            this.sessions.delete(server);
            // Save in background
            this.saveAndBroadcast().catch(console.error);
        });

        server.addEventListener('error', (e) => {
            console.error('WebSocket error:', e);
        });

        // Send current state immediately (synchronously after accept)
        const publicState = this.getPublicState();
        if (publicState) {
            server.send(JSON.stringify({ type: 'STATE_UPDATE', payload: publicState }));
        }

        // Save the connected status in background
        this.saveAndBroadcast().catch(console.error);

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    /**
     * Helper to create JSON response
     */
    private jsonResponse(data: unknown, status = 200): Response {
        return new Response(JSON.stringify(data), {
            status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, x-player-id, x-player-secret',
            },
        });
    }
}
