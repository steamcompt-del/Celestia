/**
 * Home page - Landing page with hero, stats, and features
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
        <div className="landing">
            {/* Navbar */}
            <nav className="navbar">
                <a href="/" className="navbar-brand">
                    <div className="logo">C</div>
                    <span>Celestia</span>
                </a>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateModal(true)}
                >
                    Jouer
                </button>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <h1>Le jeu de bluff où chaque choix compte</h1>
                <p className="hero-subtitle">
                    Défiez vos amis dans des parties intenses. Restez pour gagner gros,
                    ou partez pour sauver vos points. Jusqu'où irez-vous ?
                </p>
                <div className="hero-actions">
                    <button
                        className="btn btn-primary btn-large"
                        onClick={() => setShowCreateModal(true)}
                    >
                        🎮 Créer une partie
                    </button>
                    <button
                        className="btn btn-outline btn-large"
                        onClick={() => setShowScanner(true)}
                    >
                        📷 Scanner un QR
                    </button>
                </div>

                {/* Join by code */}
                <div className="join-section" style={{ marginTop: '2rem' }}>
                    <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="CODE PARTIE"
                        maxLength={8}
                    />
                    <button
                        className="btn btn-secondary"
                        onClick={handleJoinByCode}
                        disabled={joinCode.length !== 8}
                    >
                        Rejoindre
                    </button>
                </div>

                {error && <p className="error-message">{error}</p>}
            </section>

            {/* Stats Cards */}
            <section style={{ padding: '0 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">100</div>
                        <div className="stat-label">Points de départ</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">5-50</div>
                        <div className="stat-label">Mise ajustable</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">⚡</div>
                        <div className="stat-label">Temps réel</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">2-8</div>
                        <div className="stat-label">Joueurs</div>
                    </div>
                </div>
            </section>

            {/* Dark Section - How it works */}
            <section className="section-dark">
                <h2>Comment ça marche ?</h2>
                <p className="section-subtitle">
                    Simple à apprendre, impossible à maîtriser
                </p>

                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-number">1</div>
                        <h3 className="feature-title">Créez une partie</h3>
                        <p className="feature-description">
                            Choisissez la mise et partagez le QR code avec vos amis.
                            Pas de compte requis, juste un pseudo.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-number">2</div>
                        <h3 className="feature-title">Le capitaine lance le dé</h3>
                        <p className="feature-description">
                            À tour de rôle, un joueur devient capitaine et lance
                            le défi. Résultat ≥40 = réussite !
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-number">3</div>
                        <h3 className="feature-title">Restez ou partez</h3>
                        <p className="feature-description">
                            Après le résultat, choisissez : restez pour +5 pts si réussite
                            (-10 si échec), ou partez sans risque.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-number">4</div>
                        <h3 className="feature-title">Atteignez 150 points</h3>
                        <p className="feature-description">
                            Le premier à 150 points remporte le pot !
                            10 tours max si personne n'y arrive.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-number">5</div>
                        <h3 className="feature-title">Stratégie et bluff</h3>
                        <p className="feature-description">
                            Analysez les risques, observez vos adversaires.
                            Le timing parfait fait la différence.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-number">6</div>
                        <h3 className="feature-title">Rejouez à l'infini</h3>
                        <p className="feature-description">
                            Parties rapides de 5-10 minutes. Parfait pour
                            les soirées entre amis !
                        </p>
                    </div>
                </div>
            </section>

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
                                className="btn btn-outline-light"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Annuler
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleCreateRoom}
                                disabled={loading}
                            >
                                {loading ? 'Création...' : 'Créer la partie'}
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
