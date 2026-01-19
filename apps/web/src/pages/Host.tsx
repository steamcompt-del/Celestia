/**
 * Host page - Display QR code and manage lobby as host
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCode } from '../components/QRCode';
import { PlayerList } from '../components/PlayerList';
import { useSession } from '../hooks/useSession';
import { useWebSocket } from '../hooks/useWebSocket';
import { joinRoom, toggleReady, startGame } from '../lib/api';

export default function Host() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { getSession, saveSession, hasSessionForRoom } = useSession();
    const [nickname, setNickname] = useState('');
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);

    const session = getSession();
    const hasSession = token ? hasSessionForRoom(token) : false;

    const { state, connected } = useWebSocket({
        roomToken: token || '',
        playerId: hasSession ? session?.playerId : undefined,
        playerSecret: hasSession ? session?.playerSecret : undefined,
    });

    // Redirect to room when game starts
    useEffect(() => {
        if (state?.status === 'PLAYING' || state?.status === 'FINISHED') {
            navigate(`/room/${token}`, { replace: true });
        }
    }, [state?.status, token, navigate]);

    const handleJoinAsHost = async () => {
        if (!token || !nickname.trim()) return;

        setJoining(true);
        setError(null);
        try {
            const { playerId, playerSecret } = await joinRoom(token, { nickname: nickname.trim() });
            saveSession({
                playerId,
                playerSecret,
                roomToken: token,
                nickname: nickname.trim(),
            });
            window.location.reload(); // Reload to reconnect WS with credentials
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur lors de la connexion');
        } finally {
            setJoining(false);
        }
    };

    const handleToggleReady = async () => {
        if (!token) return;
        try {
            await toggleReady(token);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur');
        }
    };

    const handleStartGame = async () => {
        if (!token) return;
        setStarting(true);
        setError(null);
        try {
            await startGame(token);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Impossible de lancer la partie');
        } finally {
            setStarting(false);
        }
    };

    const joinUrl = `${window.location.origin}/join/${token}`;
    const canStart = state &&
        state.players.length >= 2 &&
        state.players.every(p => p.ready) &&
        session?.playerId === state.hostId;

    return (
        <div className="page host-page">
            <header className="page-header">
                <h1>Salle d'attente</h1>
                <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
                    {connected ? '● Connecté' : '○ Connexion...'}
                </div>
            </header>

            {/* Host hasn't joined yet */}
            {!hasSession && (
                <div className="join-as-host">
                    <h2>Rejoignez votre partie</h2>
                    <div className="form-group">
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Votre pseudo"
                            maxLength={20}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleJoinAsHost}
                            disabled={joining || !nickname.trim()}
                        >
                            {joining ? 'Connexion...' : 'Rejoindre'}
                        </button>
                    </div>
                </div>
            )}

            {/* QR Code and share info */}
            <div className="share-section">
                <QRCode value={joinUrl} size={180} />
                <div className="share-info">
                    <p>Partagez ce QR code ou ce code :</p>
                    <div className="room-code">{token}</div>
                    <button
                        className="btn btn-outline btn-small"
                        onClick={() => navigator.clipboard.writeText(joinUrl)}
                    >
                        📋 Copier le lien
                    </button>
                </div>
            </div>

            {/* Room info */}
            {state && (
                <div className="room-info">
                    <div className="info-item">
                        <span className="label">Mise</span>
                        <span className="value">{state.stake} pts</span>
                    </div>
                    <div className="info-item">
                        <span className="label">Joueurs</span>
                        <span className="value">{state.players.length}/{state.maxPlayers}</span>
                    </div>
                </div>
            )}

            {/* Player list */}
            {state && (
                <div className="players-section">
                    <h3>Joueurs ({state.players.length})</h3>
                    <PlayerList
                        players={state.players}
                        hostId={state.hostId}
                        currentPlayerId={session?.playerId}
                    />
                </div>
            )}

            {/* Actions */}
            {hasSession && state && (
                <div className="lobby-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={handleToggleReady}
                    >
                        {state.players.find(p => p.id === session?.playerId)?.ready
                            ? '○ Pas prêt'
                            : '✓ Je suis prêt'}
                    </button>

                    {session?.playerId === state.hostId && (
                        <button
                            className="btn btn-primary btn-large"
                            onClick={handleStartGame}
                            disabled={!canStart || starting}
                        >
                            {starting ? 'Lancement...' : '🚀 Lancer la partie'}
                        </button>
                    )}
                </div>
            )}

            {!canStart && state && state.players.length > 0 && (
                <p className="hint">
                    {state.players.length < 2
                        ? 'En attente d\'au moins 2 joueurs...'
                        : !state.players.every(p => p.ready)
                            ? 'Tous les joueurs doivent être prêts'
                            : ''}
                </p>
            )}

            {error && <p className="error-message">{error}</p>}
        </div>
    );
}
