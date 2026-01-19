/**
 * QR Scanner component using BarcodeDetector API
 * Falls back to manual input if not supported
 */

import { useState, useRef, useEffect, useCallback } from 'react';

interface QRScannerProps {
    onScan: (value: string) => void;
    onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
    const [hasCamera, setHasCamera] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Check if BarcodeDetector is available
    const hasBarcodeDetector = 'BarcodeDetector' in window;

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setHasCamera(true);
                setScanning(true);
            }
        } catch (e) {
            console.error('Camera error:', e);
            setError('Impossible d\'accéder à la caméra');
            setHasCamera(false);
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setScanning(false);
    }, []);

    // Scan for QR codes
    useEffect(() => {
        if (!scanning || !hasBarcodeDetector || !videoRef.current) return;

        // @ts-expect-error BarcodeDetector not in TS types
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        let animationId: number;

        const scan = async () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                try {
                    const barcodes = await detector.detect(videoRef.current);
                    if (barcodes.length > 0) {
                        const value = barcodes[0].rawValue;
                        // Extract room token from URL if it's a full URL
                        const match = value.match(/\/join\/([A-Z0-9]+)/i);
                        if (match) {
                            stopCamera();
                            onScan(match[1].toUpperCase());
                            return;
                        }
                        // Or just use the raw value if it looks like a token
                        if (/^[A-Z0-9]{8}$/i.test(value)) {
                            stopCamera();
                            onScan(value.toUpperCase());
                            return;
                        }
                    }
                } catch (e) {
                    console.error('Scan error:', e);
                }
            }
            animationId = requestAnimationFrame(scan);
        };

        animationId = requestAnimationFrame(scan);

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [scanning, hasBarcodeDetector, onScan, stopCamera]);

    useEffect(() => {
        if (hasBarcodeDetector) {
            startCamera();
        }
        return () => stopCamera();
    }, [hasBarcodeDetector, startCamera, stopCamera]);

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const code = manualCode.trim().toUpperCase();
        if (code.length === 8 && /^[A-Z0-9]+$/.test(code)) {
            onScan(code);
        } else {
            setError('Code invalide (8 caractères)');
        }
    };

    return (
        <div className="qr-scanner-overlay">
            <div className="qr-scanner-modal">
                <button className="close-btn" onClick={onClose}>✕</button>

                <h2>Scanner un QR code</h2>

                {hasBarcodeDetector && hasCamera && (
                    <div className="camera-container">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                        />
                        <div className="scan-overlay" />
                    </div>
                )}

                {!hasBarcodeDetector && (
                    <p className="info">
                        Le scan QR n'est pas supporté sur ce navigateur.
                    </p>
                )}

                <div className="manual-input">
                    <p>Ou entrez le code manuellement :</p>
                    <form onSubmit={handleManualSubmit}>
                        <input
                            type="text"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                            placeholder="ABCD1234"
                            maxLength={8}
                            autoComplete="off"
                        />
                        <button type="submit" className="btn btn-primary">
                            Rejoindre
                        </button>
                    </form>
                </div>

                {error && <p className="error">{error}</p>}
            </div>
        </div>
    );
}
