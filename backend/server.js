const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');
const Push = require('pushover-notifications');
const colors = require('colors');
require('dotenv').config();
const CHANNELS_FILE = path.join(__dirname, 'channels.json');
let channels = [];
let streamStatuses = {};
const pollingIntervals = {};
let accessToken = null;
let accessTokenExpiration = null;
let isErrorSent = false;
let nextCheckTime = new Date(Date.now() + 300000); // Initialise avec 5 minutes
const push = new Push({
  user: process.env.PUSHOVER_USER,
  token: process.env.PUSHOVER_TOKEN,
});
function loadChannels() {
  if (fs.existsSync(CHANNELS_FILE)) {
    channels = JSON.parse(fs.readFileSync(CHANNELS_FILE));
  } else {
    channels = [];
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify(channels, null, 2));
  }
}
function saveChannels() {
  fs.writeFileSync(CHANNELS_FILE, JSON.stringify(channels, null, 2));
}
loadChannels();
async function getAccessToken() {
  if (!accessToken || Date.now() >= accessTokenExpiration) {
    const url = 'https://id.twitch.tv/oauth2/token';
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.TWITCH_REFRESH_TOKEN,
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
    });
    const response = await axios.post(url, params);
    accessToken = response.data.access_token;
    accessTokenExpiration = Date.now() + response.data.expires_in * 1000;
  }
  return accessToken;
}
async function checkStreamStatus(channelName) {
  try {
    const token = await getAccessToken();
    const url = `https://api.twitch.tv/helix/streams?user_login=${channelName}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Client-Id': process.env.TWITCH_CLIENT_ID,
    };
    const { data } = await axios.get(url, { headers });
    const stream = data.data[0];
    if (stream) {
      const startedAt = new Date(stream.started_at).toLocaleString('fr-FR');
      const thumbnailUrl = stream.thumbnail_url
        .replace('{width}', '640')
        .replace('{height}', '360');
      let imageBuffer = null;
      try {
        const imageRes = await axios.get(thumbnailUrl, { responseType: 'arraybuffer' });
        imageBuffer = Buffer.from(imageRes.data, 'binary');
      } catch (imageErr) {
        console.error(colors.red(`Erreur téléchargement image Twitch : ${imageErr.message}`));
      }
      if (streamStatuses[channelName] === 'offline') {
        const notification = {
          title: `${channelName} est en live !`,
          message: `Jeu: ${stream.game_name}\nTitre: ${stream.title}\nViewers: ${stream.viewer_count}\nDepuis: ${startedAt}\nhttps://twitch.tv/${channelName}`,
          sound: 'magic',
          priority: 0,
        };
        if (imageBuffer) {
          notification.attachment = {
            buffer: imageBuffer,
            name: 'thumbnail.jpg',
            type: 'image/jpeg',
          };
        }
        push.send(notification, (err, result) => {
          if (err) {
            console.error(colors.red('Erreur envoi Pushover avec image :'), err);
          } else {
            console.log(colors.green('✅ Notification Pushover envoyée avec image !'));
          }
        });
      }
      streamStatuses[channelName] = 'online';
    } else {
      if (streamStatuses[channelName] === 'online') {
        push.send({
          title: `${channelName} a terminé son stream`,
          message: `Fin du stream: ${new Date().toLocaleString('fr-FR')}`,
          sound: 'magic',
          priority: 0,
        });
      }
      streamStatuses[channelName] = 'offline';
    }
  } catch (err) {
    console.error(colors.red(`Erreur Twitch (${channelName}): ${err.message}`));
    if (!isErrorSent) {
      push.send({
        title: 'Erreur Twitch',
        message: `Impossible de vérifier ${channelName} : ${err.message}`,
        sound: 'siren',
        priority: 1,
      });
      isErrorSent = true;
    }
  }
}
function startMonitoring(channelName) {
  if (pollingIntervals[channelName]) return; // Ne pas démarrer deux fois
  checkStreamStatus(channelName);
  pollingIntervals[channelName] = setInterval(() => {
    checkStreamStatus(channelName);
    nextCheckTime = new Date(Date.now() + 300000); // Mise à jour de la prochaine vérification
  }, 300000);
}
channels.forEach(startMonitoring);

// ===== API REST EXPRESS =====

const app = express();
const port = process.env.PORT || 3001;
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
app.get('/api/status', async (req, res) => {
  try {
    const token = await getAccessToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Client-Id': process.env.TWITCH_CLIENT_ID,
    };
    
    // Construction des paramètres utilisateurs
    const userLogins = channels.map(name => `login=${encodeURIComponent(name)}`).join('&');
    const usersUrl = `https://api.twitch.tv/helix/users?${userLogins}`;
    console.log('URL des utilisateurs:', usersUrl);
    const usersResponse = await axios.get(usersUrl, { headers });
    
    // Récupération des IDs utilisateurs pour la requête des streams
    const userIds = usersResponse.data.data.map(user => `user_id=${user.id}`).join('&');
    const streamsUrl = `https://api.twitch.tv/helix/streams?${userIds}&first=100`;
    console.log('URL des streams:', streamsUrl);
    const streamsResponse = await axios.get(streamsUrl, { headers });
    console.log('Réponse des streams:', JSON.stringify(streamsResponse.data, null, 2));
    const streamsData = streamsResponse.data.data || [];
    console.log('Streams en ligne:', streamsData.map(s => s.user_login).join(', '));
    
    // Création d'un objet pour un accès rapide aux données des streams
    const streamsMap = {};
    streamsData.forEach(stream => {
      const loginLower = stream.user_login.toLowerCase();
      console.log(`Stream trouvé - Login: ${stream.user_login}, Vueurs: ${stream.viewer_count}, Jeu: ${stream.game_name}`);
      streamsMap[loginLower] = {
        viewer_count: stream.viewer_count,
        game_name: stream.game_name,
        title: stream.title,
        user_login: stream.user_login
      };
    });
    console.log('StreamsMap:', JSON.stringify(streamsMap, null, 2));
    
    // Création d'une map des utilisateurs pour un accès rapide
    const usersMap = {};
    usersResponse.data.data.forEach(user => {
      const loginLower = user.login.toLowerCase();
      console.log(`Utilisateur chargé - Login: ${user.login}, Display: ${user.display_name}`);
      usersMap[loginLower] = user;
    });
    console.log('UsersMap clés:', Object.keys(usersMap).join(', '));
    
    // Création du tableau de statuts ordonné selon la liste des chaînes
    const ordered = channels.map(name => {
      const nameLower = name.toLowerCase();
      const user = usersMap[nameLower];
      const stream = streamsMap[nameLower];
      console.log(`Traitement de ${name} (${nameLower}) - User: ${!!user}, Stream: ${!!stream}`);
      
      if (user) {
        const isOnline = stream !== undefined;
        return {
          name: user.login,
          displayName: user.display_name,
          status: isOnline ? 'online' : 'offline',
          avatar: user.profile_image_url,
          viewerCount: isOnline ? stream.viewer_count : 0,
          gameName: isOnline ? stream.game_name : null,
          streamTitle: isOnline ? stream.title : null
        };
      } else {
        // Si l'utilisateur n'est pas trouvé dans la réponse de l'API
        return {
          name,
          displayName: name,
          status: streamStatuses[name] || 'offline',
          viewerCount: 0,
          gameName: null,
          streamTitle: null,
          avatar: 'https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_70x70.png',
        };
      }
    });
    
    // Mise à jour du statut dans streamStatuses
    ordered.forEach(channel => {
      streamStatuses[channel.name] = channel.status;
    });
    
    res.json(ordered);
  } catch (err) {
    console.error(colors.red(`Erreur de récupération des avatars: ${err.message}`));
    res.status(500).json({ error: 'Erreur lors de la récupération des statuts' });
  }
});
app.post('/api/channels', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Channel name is required' });
  if (!channels.includes(name)) {
    channels.push(name);
    saveChannels();
    startMonitoring(name);
  }
  res.json({ success: true, channels });
  push.send({
    title: 'Chaine ajoutée a TwitchNotifier',
    message: `${name}`,
    sound: 'magic',
    priority: 0,
  }, (err, result) => {
    if (err) {
      console.error(colors.red('Erreur Pushover:', err));
    } else {
      console.log(colors.green('✅ Notification Pushover envoyée !'));
    }
  });
});
app.delete('/api/channels/:name', (req, res) => {
  const { name } = req.params;
  channels = channels.filter(c => c !== name);
  saveChannels();
  delete streamStatuses[name];
  if (pollingIntervals[name]) {
    clearInterval(pollingIntervals[name]);
    delete pollingIntervals[name];
  }
  res.json({ success: true, channels });
  push.send({
    title: 'Chaine supprimée de TwitchNotifier',
    message: `${name}`,
    sound: 'magic',
    priority: 0,
  }, (err, result) => {
    if (err) {
      console.error(colors.red('Erreur Pushover:', err));
    } else {
      console.log(colors.green('✅ Notification Pushover envoyée !'));
    }
  });
});
app.get('/api/next-check', (req, res) => {
  res.json({ nextCheck: nextCheckTime.toISOString() });
});

app.listen(port, () => {
  console.log(colors.green(`🚀 API backend lancée sur http://localhost:${port}/api/status`));
});
//verification du statut du frontend
const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${port}`;
axios.get(frontendUrl)
  .then(response => {
    if (response.status === 200) {
      console.log(colors.green(`✅ Frontend accessible sur ${frontendUrl}`));
    } else {
      console.error(colors.red(`Erreur d'accès au frontend: ${response.status}`));
    }
  })
  .catch(error => {
    console.error(colors.red(`Erreur d'accès au frontend: ${error.message}`));
});
//verifie la connexion pushover
push.send({
    title: 'TwitchNotifier',
    message: `Exécution de TwitchNotifier BACKEND/FRONTED PORT: ${port}`,
    sound: 'magic',
    priority: 0,
  }, (err, result) => {
    if (err) {
      console.error(colors.red('Erreur Pushover:', err));
    } else {
      console.log(colors.green('✅ Connexion Pushover réussie !'));
    }
});