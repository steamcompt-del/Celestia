/**
 * QR Code generator component
 */

import { useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
    value: string;
    size?: number;
}

export function QRCode({ value, size = 200 }: QRCodeProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current) {
            QRCodeLib.toCanvas(canvasRef.current, value, {
                width: size,
                margin: 2,
                color: {
                    dark: '#1e1b4b',
                    light: '#ffffff',
                },
            });
        }
    }, [value, size]);

    return (
        <div className="qr-code">
            <canvas ref={canvasRef} />
        </div>
    );
}
