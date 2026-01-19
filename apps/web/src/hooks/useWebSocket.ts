/**
 * WebSocket hook for real-time game state updates
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { RoomState, WSMessage } from '../types';

interface UseWebSocketOptions {
    roomToken: string;
    playerId?: string;
    playerSecret?: string;
    onStateUpdate?: (state: RoomState) => void;
}

export function useWebSocket({ roomToken, playerId, playerSecret, onStateUpdate }: UseWebSocketOptions) {
    const [connected, setConnected] = useState(false);
    const [state, setState] = useState<RoomState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        // Build WebSocket URL
        // In development, connect directly to worker (8787)
        // In production, use same host
        const isDev = window.location.port === '5173';
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = isDev ? 'localhost:8787' : window.location.host;
        let url = `${protocol}//${host}/api/rooms/${roomToken}/ws`;

        // Add credentials as query params (since WS doesn't support custom headers in browser)
        if (playerId && playerSecret) {
            url += `?playerId=${playerId}&playerSecret=${playerSecret}`;
        }

        const ws = new WebSocket(url);

        ws.onopen = () => {
            setConnected(true);
            setError(null);
        };

        ws.onmessage = (event) => {
            try {
                const message: WSMessage = JSON.parse(event.data);

                if (message.type === 'STATE_UPDATE') {
                    const newState = message.payload as RoomState;
                    setState(newState);
                    onStateUpdate?.(newState);
                } else if (message.type === 'ERROR') {
                    setError(message.payload as string);
                }
            } catch (e) {
                console.error('Failed to parse WS message:', e);
            }
        };

        ws.onclose = () => {
            setConnected(false);
            wsRef.current = null;

            // Reconnect after delay
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            reconnectTimeoutRef.current = window.setTimeout(() => {
                connect();
            }, 2000);
        };

        ws.onerror = (e) => {
            console.error('WebSocket error:', e);
            setError('Connection error');
        };

        wsRef.current = ws;
    }, [roomToken, playerId, playerSecret, onStateUpdate]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        wsRef.current?.close();
        wsRef.current = null;
    }, []);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        connected,
        state,
        error,
        reconnect: connect,
    };
}
