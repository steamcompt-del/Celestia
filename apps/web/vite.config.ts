import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [
            react(),
            VitePWA({
                registerType: 'autoUpdate',
                includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
                manifest: {
                    name: 'Celestia',
                    short_name: 'Celestia',
                    description: 'Un jeu push-your-luck multijoueur',
                    theme_color: '#14b8a6',
                    background_color: '#0d1b2a',
                    display: 'standalone',
                    orientation: 'portrait',
                    icons: [
                        {
                            src: 'pwa-192x192.png',
                            sizes: '192x192',
                            type: 'image/png',
                        },
                        {
                            src: 'pwa-512x512.png',
                            sizes: '512x512',
                            type: 'image/png',
                        },
                    ],
                },
            }),
        ],
        define: {
            // API URL for production (will be replaced at build time)
            'import.meta.env.VITE_API_URL': JSON.stringify(
                env.VITE_API_URL || ''
            ),
        },
        server: {
            port: 5173,
            proxy: {
                '/api': {
                    target: 'http://localhost:8787',
                    changeOrigin: true,
                    ws: true,
                },
            },
        },
        build: {
            outDir: 'dist',
            sourcemap: false,
        },
    };
});
