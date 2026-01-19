/**
 * Player list component for lobby and game views
 */

import type { Player } from '../types';

interface PlayerListProps {
    players: Player[];
    hostId: string;
    captainIndex?: number;
    currentPlayerId?: string;
    showPoints?: boolean;
}

export function PlayerList({
    players,
    hostId,
    captainIndex,
    currentPlayerId,
    showPoints = false,
}: PlayerListProps) {
    if (players.length === 0) {
        return (
            <div className="player-list empty">
                <p>En attente de joueurs...</p>
            </div>
        );
    }

    return (
        <ul className="player-list">
            {players.map((player, index) => {
                const isHost = player.id === hostId;
                const isCaptain = index === captainIndex;
                const isCurrentPlayer = player.id === currentPlayerId;

                return (
                    <li
                        key={player.id}
                        className={`player-item ${isCurrentPlayer ? 'current' : ''} ${!player.connected ? 'disconnected' : ''}`}
                    >
                        <div className="player-info">
                            <span className="player-name">
                                {player.nickname}
                                {isHost && <span className="badge host">Host</span>}
                                {isCaptain && <span className="badge captain">Capitaine</span>}
                                {isCurrentPlayer && <span className="badge you">Vous</span>}
                            </span>
                            {!player.connected && (
                                <span className="status disconnected">Déconnecté</span>
                            )}
                        </div>

                        <div className="player-status">
                            {showPoints ? (
                                <span className="points">{player.points} pts</span>
                            ) : (
                                <span className={`ready-status ${player.ready ? 'ready' : 'waiting'}`}>
                                    {player.ready ? '✓ Prêt' : '○ En attente'}
                                </span>
                            )}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
