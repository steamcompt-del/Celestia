/**
 * Join page - Enter nickname to join a room
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { joinRoom, getRoomState } from '../lib/api';
import { useSession } from '../hooks/useSession';
import type { RoomState } from '../types';

export default function Join() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { saveSession, hasSessionForRoom } = useSession();
    const [nickname, setNickname] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [roomInfo, setRoomInfo] = useState<RoomState | null>(null);

    // Check if already in this room
    useEffect(() => {
        if (token && hasSessionForRoom(token)) {
            navigate(`/room/${token}`, { replace: true });
            return;
        }

        // Fetch room info
        const checkRoom = async () => {
            if (!token) return;
            try {
                const state = await getRoomState(token) as RoomState;
                setRoomInfo(state);

                if (state.status !== 'LOBBY') {
                    setError('Cette partie a déjà commencé');
                } else if (state.players.length >= state.maxPlayers) {
                    setError('Cette partie est complète');
                }
            } catch (e) {
                setError('Partie introuvable');
            } finally {
                setChecking(false);
            }
        };

        checkRoom();
    }, [token, hasSessionForRoom, navigate]);

    const handleJoin = async () => {
        if (!token || !nickname.trim()) return;

        setLoading(true);
        setError(null);
        try {
            const { playerId, playerSecret } = await joinRoom(token, { nickname: nickname.trim() });
            saveSession({
                playerId,
                playerSecret,
                roomToken: token,
                nickname: nickname.trim(),
            });
            navigate(`/room/${token}`, { replace: true });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur lors de la connexion');
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <div className="page join-page">
                <div className="loader">Chargement...</div>
            </div>
        );
    }

    return (
        <div className="page join-page">
            <header className="page-header">
                <h1>Rejoindre une partie</h1>
                <span className="room-code-small">Code: {token}</span>
            </header>

            {roomInfo && roomInfo.status === 'LOBBY' && (
                <>
                    <div className="room-preview">
                        <div className="info-item">
                            <span className="label">Mise</span>
                            <span className="value">{roomInfo.stake} pts</span>
                        </div>
                        <div className="info-item">
                            <span className="label">Joueurs</span>
                            <span className="value">{roomInfo.players.length}/{roomInfo.maxPlayers}</span>
                        </div>
                    </div>

                    <div className="join-form">
                        <div className="form-group">
                            <label htmlFor="nickname">Votre pseudo</label>
                            <input
                                id="nickname"
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                placeholder="Entrez votre pseudo"
                                maxLength={20}
                                autoFocus
                            />
                        </div>

                        <button
                            className="btn btn-primary btn-large"
                            onClick={handleJoin}
                            disabled={loading || !nickname.trim()}
                        >
                            {loading ? 'Connexion...' : '🎮 Rejoindre la partie'}
                        </button>
                    </div>

                    {roomInfo.players.length > 0 && (
                        <div className="players-preview">
                            <h3>Joueurs actuels</h3>
                            <ul>
                                {roomInfo.players.map(p => (
                                    <li key={p.id}>{p.nickname}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}

            {error && (
                <div className="error-container">
                    <p className="error-message">{error}</p>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/')}
                    >
                        Retour à l'accueil
                    </button>
                </div>
            )}
        </div>
    );
}
