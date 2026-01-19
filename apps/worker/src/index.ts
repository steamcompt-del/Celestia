/**
 * Fortune Rush API Worker - Main entry point
 * Routes HTTP requests to the GameRoom Durable Object
 */

import type { Env, CreateRoomRequest, CreateRoomResponse } from './types';
import { generateRoomToken, GAME_CONFIG } from './game-engine';

// Re-export Durable Object class
export { GameRoom } from './room';

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, x-player-id, x-player-secret, Upgrade',
                    'Access-Control-Max-Age': '86400',
                },
            });
        }

        // Route: POST /api/rooms - Create a new room
        if (request.method === 'POST' && path === '/api/rooms') {
            try {
                const body = await request.json() as CreateRoomRequest;
                const { stake, maxPlayers } = body;

                // Validate inputs
                if (!stake || stake < GAME_CONFIG.MIN_STAKE || stake > GAME_CONFIG.MAX_STAKE) {
                    return jsonResponse({ error: `Stake must be between ${GAME_CONFIG.MIN_STAKE} and ${GAME_CONFIG.MAX_STAKE}` }, 400);
                }

                if (!maxPlayers || maxPlayers < GAME_CONFIG.MIN_PLAYERS || maxPlayers > GAME_CONFIG.MAX_PLAYERS) {
                    return jsonResponse({ error: `Max players must be between ${GAME_CONFIG.MIN_PLAYERS} and ${GAME_CONFIG.MAX_PLAYERS}` }, 400);
                }

                // Generate room token and create Durable Object
                const roomToken = generateRoomToken();
                const roomId = env.GAME_ROOM.idFromName(roomToken);
                const room = env.GAME_ROOM.get(roomId);

                // Initialize the room
                const initResponse = await room.fetch(new Request('http://internal/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ stake, maxPlayers, roomToken }),
                }));

                if (!initResponse.ok) {
                    const error = await initResponse.json();
                    return jsonResponse(error, initResponse.status);
                }

                const response: CreateRoomResponse = { roomToken };
                return jsonResponse(response);
            } catch (e) {
                console.error('Error creating room:', e);
                return jsonResponse({ error: 'Failed to create room' }, 500);
            }
        }

        // Extract room token from path for room-specific routes
        const roomMatch = path.match(/^\/api\/rooms\/([A-Z0-9]+)\/(.+)$/);
        if (roomMatch) {
            const [, roomToken, action] = roomMatch;

            // Get Durable Object for this room
            const roomId = env.GAME_ROOM.idFromName(roomToken);
            const room = env.GAME_ROOM.get(roomId);

            // Forward request to Durable Object
            const doUrl = `http://internal/${action}`;
            const doRequest = new Request(doUrl, {
                method: request.method,
                headers: request.headers,
                body: request.body,
            });

            return room.fetch(doRequest);
        }

        // Health check
        if (path === '/health') {
            return jsonResponse({ status: 'ok', game: 'Fortune Rush' });
        }

        return jsonResponse({ error: 'Not Found' }, 404);
    },
};

/**
 * Helper to create JSON response with CORS headers
 */
function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-player-id, x-player-secret, Upgrade',
        },
    });
}
