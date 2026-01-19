/**
 * Home page - Create or join a game room
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom } from '../lib/api';
import { QRScanner } from '../components/QRScanner';

export default function Home() {
    const navigate = useNavigate();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [stake, setStake] = useState(10);
    const [maxPlayers, setMaxPlayers] = useState(4);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreateRoom = async () => {
        setLoading(true);
        setError(null);
        try {
            const { roomToken } = await createRoom({ stake, maxPlayers });
            navigate(`/host/${roomToken}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur lors de la création');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinByCode = () => {
        const code = joinCode.trim().toUpperCase();
        if (code.length === 8) {
            navigate(`/join/${code}`);
        } else {
            setError('Code invalide (8 caractères)');
        }
    };

    const handleScan = (token: string) => {
        setShowScanner(false);
        navigate(`/join/${token}`);
    };

    return (
        <div className="page home-page">
            <div className="logo-container">
                <h1>Fortune Rush</h1>
                <p className="tagline">Tentez votre chance, mais pas trop...</p>
            </div>

            <div className="actions">
                <button
                    className="btn btn-primary btn-large"
                    onClick={() => setShowCreateModal(true)}
                >
                    🎮 Créer une partie
                </button>

                <div className="divider">
                    <span>ou</span>
                </div>

                <div className="join-section">
                    <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="Code de la partie"
                        maxLength={8}
                        className="code-input"
                    />
                    <button
                        className="btn btn-secondary"
                        onClick={handleJoinByCode}
                        disabled={joinCode.length !== 8}
                    >
                        Rejoindre
                    </button>
                </div>

                <button
                    className="btn btn-outline"
                    onClick={() => setShowScanner(true)}
                >
                    📷 Scanner un QR code
                </button>
            </div>

            {error && <p className="error-message">{error}</p>}

            {/* Create Room Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Nouvelle partie</h2>

                        <div className="form-group">
                            <label htmlFor="stake">Mise d'entrée (points)</label>
                            <input
                                id="stake"
                                type="range"
                                min="5"
                                max="50"
                                step="5"
                                value={stake}
                                onChange={(e) => setStake(Number(e.target.value))}
                            />
                            <span className="range-value">{stake} pts</span>
                        </div>

                        <div className="form-group">
                            <label htmlFor="maxPlayers">Joueurs max</label>
                            <input
                                id="maxPlayers"
                                type="range"
                                min="2"
                                max="8"
                                value={maxPlayers}
                                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                            />
                            <span className="range-value">{maxPlayers}</span>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Annuler
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleCreateRoom}
                                disabled={loading}
                            >
                                {loading ? 'Création...' : 'Créer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Scanner */}
            {showScanner && (
                <QRScanner
                    onScan={handleScan}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    );
}
