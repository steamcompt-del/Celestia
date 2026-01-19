# Fortune Rush 🎲

Un jeu web mobile multijoueur de type "push-your-luck" avec création de parties via QR code.

## 🎮 Fonctionnalités

- **Mode invité** : Pas de login, juste un pseudo
- **Parties via QR code** : Créez une partie et partagez le QR code
- **Temps réel** : Synchronisation instantanée via WebSocket
- **Mobile first** : Interface optimisée pour téléphone (PWA)
- **Anti-triche** : Toute la logique de jeu est côté serveur

## 🛠️ Stack technique

- **Frontend** : Vite + React + TypeScript
- **Backend** : Cloudflare Workers + Durable Objects
- **Temps réel** : WebSocket
- **PWA** : vite-plugin-pwa

## 📁 Structure

```
fortune-rush/
├── apps/
│   ├── web/           # Frontend React PWA
│   └── worker/        # Backend Cloudflare Worker
├── package.json       # Workspaces config
└── README.md
```

## 🚀 Développement local

### Prérequis

- Node.js >= 18
- npm >= 9

### Installation

```bash
npm install
```

### Lancer en développement

```bash
npm run dev
```

Cela démarre :
- Frontend : http://localhost:5173
- Worker : http://localhost:8787

### Commandes disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance web + worker en dev |
| `npm run dev:web` | Lance uniquement le frontend |
| `npm run dev:worker` | Lance uniquement le worker |
| `npm run build` | Build production |
| `npm run lint` | Vérifie le TypeScript |
| `npm run test` | Lance les tests unitaires |

## ☁️ Déploiement Cloudflare

### 1. Worker (API)

```bash
cd apps/worker
npx wrangler login
npx wrangler deploy
```

Notez l'URL du worker déployé (ex: `https://fortune-rush-api.your-subdomain.workers.dev`).

### 2. Frontend (Pages)

```bash
cd apps/web
npm run build
npx wrangler pages deploy dist --project-name=fortune-rush
```

### 3. Configuration

Dans le dashboard Cloudflare Pages, configurez la variable d'environnement :
- `VITE_API_URL` : URL de votre worker

Ou mettez à jour le proxy dans `vite.config.ts` pour la production.

## 🎯 Règles du jeu

1. **Création de partie** : L'hôte choisit une mise (5-50 pts) et crée la room
2. **Rejoindre** : Les joueurs scannent le QR code ou entrent le code
3. **Lobby** : Tous les joueurs cliquent "Prêt", l'hôte lance la partie
4. **Mise** : Chaque joueur paye la mise, le pot = mise × nombre de joueurs
5. **Tour par tour** :
   - Le capitaine (tourne à chaque round) lance un défi
   - Résultat aléatoire : réussite (≥40) ou échec (<40)
   - Les autres joueurs choisissent RESTER ou QUITTER
   - RESTER : +5 pts si réussite, -10 pts si échec
   - QUITTER : pas d'impact
6. **Fin** : Premier joueur à 150 pts ou après 10 rounds
7. **Victoire** : Le gagnant remporte tout le pot

## 🔒 Sécurité

- Tout l'aléatoire est généré côté serveur (Durable Object)
- Les actions sont validées avec playerSecret
- Chaque action vérifie la phase et le tour actuel
- Session stockée en localStorage (playerId + playerSecret)

## 📱 PWA

L'application est installable sur mobile :
1. Ouvrez dans Chrome/Safari
2. Menu → "Ajouter à l'écran d'accueil"

## 🧪 Tests

```bash
# Tests unitaires du game engine
npm run test

# En mode watch
cd apps/worker && npm run test:watch
```

## 📝 API

### Endpoints REST

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/rooms` | Créer une room |
| POST | `/api/rooms/:token/join` | Rejoindre une room |
| POST | `/api/rooms/:token/ready` | Toggle ready |
| POST | `/api/rooms/:token/start` | Lancer la partie (host) |
| POST | `/api/rooms/:token/action` | Envoyer une action |
| GET | `/api/rooms/:token/state` | État de la room |

### WebSocket

```
GET /api/rooms/:token/ws?playerId=xxx&playerSecret=xxx
```

Messages reçus :
- `STATE_UPDATE` : Nouvel état de la room
- `ERROR` : Message d'erreur

## 📄 Licence

MIT
