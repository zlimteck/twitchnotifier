# Twitch Notifier

![image](https://zupimages.net/up/25/18/afmv.png)

Application de notification via pushover pour les lives Twitch, avec interface web pour ajouter et supprimer les chaînes à surveiller.

## 🚀 Fonctionnalités

- Notification en temps réel des streams Twitch
- Interface utilisateur moderne et réactive

![image](https://zupimages.net/up/25/19/mb4q.png)

## 🛠 Prérequis

- Node.js (v16 ou supérieur)
- npm ou yarn
- Compte Twitch avec accès à l'API
- Compte Pushover

## 🚀 Installation

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/zlimteck/twitchnotifier.git
   cd twitchnotifier
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

Lancer l'application en mode développement :

```bash
# Démarrage du serveur backend
cd backend
node server.js
```

Lancer l'application via Docker :

```bash
docker build -t twitchnotifier .
docker run -d \
  --env-file backend/.env \
  -p 3786:3786 \
  --name twitchnotifier \
  -v /path/to/backend/channels.json:/app/backend/channels.json \
  twitchnotifier
```   
