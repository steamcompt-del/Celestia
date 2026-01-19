/**
 * Room page - Main game view
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useWebSocket } from '../hooks/useWebSocket';
import { PlayerList } from '../components/PlayerList';
import { GameBoard } from '../components/GameBoard';
import { sendAction, toggleReady } from '../lib/api';

export default function Room() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { getSession, hasSessionForRoom } = useSession();

    const session = getSession();
    const hasSession = token ? hasSessionForRoom(token) : false;

    const { state, connected, error } = useWebSocket({
        roomToken: token || '',
        playerId: hasSession ? session?.playerId : undefined,
        playerSecret: hasSession ? session?.playerSecret : undefined,
    });

    // Redirect if no session
    useEffect(() => {
        if (!hasSession && token) {
            navigate(`/join/${token}`, { replace: true });
        }
    }, [hasSession, token, navigate]);

    const handleAction = async (action: 'CAPTAIN_ROLL' | 'STAY' | 'LEAVE') => {
        if (!token) return;
        try {
            await sendAction(token, { type: action });
        } catch (e) {
            console.error('Action error:', e);
        }
    };

    const handleToggleReady = async () => {
        if (!token) return;
        try {
            await toggleReady(token);
        } catch (e) {
            console.error('Ready error:', e);
        }
    };

    const handlePlayAgain = () => {
        navigate('/');
    };

    if (!state) {
        return (
            <div className="page room-page">
                <div className="loader">
                    {connected ? 'Chargement...' : 'Connexion...'}
                </div>
            </div>
        );
    }

    const currentPlayerId = session?.playerId || '';
    const winner = state.winnerId
        ? state.players.find(p => p.id === state.winnerId)
        : null;

    return (
        <div className="page room-page">
            <header className="page-header compact">
                <h1>Fortune Rush</h1>
                <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
                    {connected ? '●' : '○'}
                </div>
            </header>

            {error && <p className="error-banner">{error}</p>}

            {/* LOBBY */}
            {state.status === 'LOBBY' && (
                <div className="lobby-view">
                    <div className="room-info">
                        <div className="info-item">
                            <span className="label">Code</span>
                            <span className="value">{state.roomToken}</span>
                        </div>
                        <div className="info-item">
                            <span className="label">Mise</span>
                            <span className="value">{state.stake} pts</span>
                        </div>
                    </div>

                    <PlayerList
                        players={state.players}
                        hostId={state.hostId}
                        currentPlayerId={currentPlayerId}
                    />

                    <div className="lobby-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={handleToggleReady}
                        >
                            {state.players.find(p => p.id === currentPlayerId)?.ready
                                ? '○ Pas prêt'
                                : '✓ Je suis prêt'}
                        </button>
                        <p className="hint">En attente du lancement par l'hôte...</p>
                    </div>
                </div>
            )}

            {/* PLAYING */}
            {state.status === 'PLAYING' && (
                <GameBoard
                    state={state}
                    currentPlayerId={currentPlayerId}
                    onAction={handleAction}
                />
            )}

            {/* FINISHED */}
            {state.status === 'FINISHED' && (
                <div className="game-over">
                    <h2>🏆 Partie terminée !</h2>

                    {winner && (
                        <div className="winner-announcement">
                            <span className="trophy">🥇</span>
                            <span className="winner-name">{winner.nickname}</span>
                            <span className="winner-points">{winner.points} pts</span>
                            {winner.id === currentPlayerId && (
                                <p className="you-won">C'est vous !</p>
                            )}
                        </div>
                    )}

                    <div className="final-standings">
                        <h3>Classement final</h3>
                        <ol className="standings-list">
                            {[...state.players]
                                .sort((a, b) => b.points - a.points)
                                .map((player, idx) => (
                                    <li key={player.id} className={player.id === currentPlayerId ? 'current' : ''}>
                                        <span className="rank">
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                        </span>
                                        <span className="name">{player.nickname}</span>
                                        <span className="pts">{player.points} pts</span>
                                    </li>
                                ))}
                        </ol>
                    </div>

                    <button
                        className="btn btn-primary btn-large"
                        onClick={handlePlayAgain}
                    >
                        🎮 Nouvelle partie
                    </button>
                </div>
            )}
        </div>
    );
}
