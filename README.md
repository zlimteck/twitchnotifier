# Twitch Notifier

Application de notification pour les streamers Twitch qui alerte les utilisateurs lorsqu'un streamer commence à diffuser.

## 🚀 Fonctionnalités

- Notification en temps réel des streams Twitch
- Interface utilisateur moderne et réactive
- Configuration personnalisable des notifications
- Support multi-utilisateur
- Historique des streams

## 🛠 Prérequis

- Node.js (v16 ou supérieur)
- npm ou yarn
- Compte Twitch avec accès à l'API
- Compte de service pour les notifications (si nécessaire)

## 🚀 Installation

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/votre-utilisateur/twitch-notifier-v2.git
   cd twitch-notifier-v2
   ```

2. Installer les dépendances :
   ```bash
   # Avec npm
   npm install
   
   # Ou avec yarn
   yarn install
   ```

3. Configurer les variables d'environnement :
   Créez un fichier `.env` à la racine du projet avec les variables nécessaires :
   ```
   PUSHOVER_TOKEN=token
   PUSHOVER_USER=user
   TWITCH_CLIENT_ID=id
   TWITCH_CLIENT_SECRET=secret
   TWITCH_REFRESH_TOKEN=token
   PORT=port
   ```

## 🚦 Démarrage

Pour lancer l'application en mode développement :

```bash
# Démarrage du serveur backend
cd backend
npm run dev

# Dans un autre terminal, démarrez le frontend
cd frontend
npm start
```
