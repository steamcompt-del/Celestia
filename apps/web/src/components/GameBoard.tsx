/**
 * Game board component - displays the main game interface
 */

import type { RoomState } from '../types';

interface GameBoardProps {
    state: RoomState;
    currentPlayerId: string;
    onAction: (action: 'CAPTAIN_ROLL' | 'STAY' | 'LEAVE') => void;
}

export function GameBoard({ state, currentPlayerId, onAction }: GameBoardProps) {
    const captain = state.players[state.captainIndex];
    const isCaptain = captain?.id === currentPlayerId;
    const currentPlayer = state.players.find(p => p.id === currentPlayerId);
    const hasDecided = state.decisions[currentPlayerId] !== undefined;

    // Calculate stats
    const decidedCount = Object.keys(state.decisions).length;
    const totalPlayers = state.players.filter(p => p.connected).length;

    return (
        <div className="game-board">
            {/* Header Stats */}
            <div className="game-stats">
                <div className="stat">
                    <span className="label">Étape</span>
                    <span className="value">{state.step}/{state.maxSteps}</span>
                </div>
                <div className="stat pot">
                    <span className="label">Pot</span>
                    <span className="value">{state.pot} pts</span>
                </div>
                <div className="stat">
                    <span className="label">Objectif</span>
                    <span className="value">{state.winThreshold} pts</span>
                </div>
            </div>

            {/* Current Player Info */}
            {currentPlayer && (
                <div className="your-status">
                    <span className="your-points">{currentPlayer.points} pts</span>
                    <span className="your-name">{currentPlayer.nickname}</span>
                </div>
            )}

            {/* Captain Info */}
            <div className="captain-zone">
                <p className="captain-label">
                    {isCaptain ? '🎯 Vous êtes le Capitaine !' : `🎯 Capitaine : ${captain?.nickname}`}
                </p>
            </div>

            {/* Phase Display */}
            <div className="phase-display">
                {state.phase === 'CAPTAIN_TURN' && (
                    <>
                        <h2>Tour du Capitaine</h2>
                        <p className="phase-desc">
                            {isCaptain
                                ? 'Lancez le défi pour voir si la chance est avec vous !'
                                : `En attente que ${captain?.nickname} lance le défi...`
                            }
                        </p>
                        {isCaptain && (
                            <button
                                className="btn btn-action btn-roll"
                                onClick={() => onAction('CAPTAIN_ROLL')}
                            >
                                🎲 Lancer le Défi
                            </button>
                        )}
                    </>
                )}

                {state.phase === 'DECISIONS' && state.lastRoll && (
                    <>
                        <h2>Résultat du Défi</h2>
                        <div className={`roll-result ${state.lastRoll.success ? 'success' : 'failure'}`}>
                            <span className="roll-value">{state.lastRoll.value}</span>
                            <span className="roll-status">
                                {state.lastRoll.success ? '✓ Réussite !' : '✗ Échec !'}
                            </span>
                        </div>

                        <div className="outcome-preview">
                            {state.lastRoll.success ? (
                                <p className="success-text">Rester = <strong>+5 pts</strong></p>
                            ) : (
                                <p className="failure-text">Rester = <strong>-10 pts</strong></p>
                            )}
                            <p className="neutral-text">Quitter = pas d'impact</p>
                        </div>

                        {!isCaptain && !hasDecided && (
                            <div className="decision-buttons">
                                <button
                                    className="btn btn-action btn-stay"
                                    onClick={() => onAction('STAY')}
                                >
                                    ✓ Rester
                                </button>
                                <button
                                    className="btn btn-action btn-leave"
                                    onClick={() => onAction('LEAVE')}
                                >
                                    ✗ Quitter
                                </button>
                            </div>
                        )}

                        {hasDecided && (
                            <p className="waiting-text">
                                Votre choix : <strong>{state.decisions[currentPlayerId] === 'STAY' ? 'Rester' : 'Quitter'}</strong>
                            </p>
                        )}

                        <p className="decision-count">
                            Décisions : {decidedCount}/{totalPlayers}
                        </p>
                    </>
                )}
            </div>

            {/* Players Points */}
            <div className="players-summary">
                <h3>Classement</h3>
                <ul className="ranking">
                    {[...state.players]
                        .sort((a, b) => b.points - a.points)
                        .map((player, idx) => (
                            <li key={player.id} className={player.id === currentPlayerId ? 'current' : ''}>
                                <span className="rank">#{idx + 1}</span>
                                <span className="name">{player.nickname}</span>
                                <span className="pts">{player.points} pts</span>
                                {state.decisions[player.id] && (
                                    <span className={`decision ${state.decisions[player.id].toLowerCase()}`}>
                                        {state.decisions[player.id] === 'STAY' ? '✓' : '✗'}
                                    </span>
                                )}
                            </li>
                        ))}
                </ul>
            </div>
        </div>
    );
}
