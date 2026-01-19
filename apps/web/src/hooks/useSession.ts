/**
 * Session management hook
 * Stores and retrieves player credentials from localStorage
 */

import { useCallback } from 'react';
import type { Session } from '../types';

const STORAGE_KEY = 'fortune-rush-session';

export function useSession() {
    /**
     * Get current session
     */
    const getSession = useCallback((): Session | null => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return null;
            return JSON.parse(stored) as Session;
        } catch {
            return null;
        }
    }, []);

    /**
     * Save session
     */
    const saveSession = useCallback((session: Session): void => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }, []);

    /**
     * Clear session
     */
    const clearSession = useCallback((): void => {
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    /**
     * Check if session matches room
     */
    const hasSessionForRoom = useCallback((roomToken: string): boolean => {
        const session = getSession();
        return session?.roomToken === roomToken;
    }, [getSession]);

    return {
        getSession,
        saveSession,
        clearSession,
        hasSessionForRoom,
    };
}
