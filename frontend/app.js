const API_BASE = '/api';
const progressBar = document.getElementById('progress-bar');
const progress = document.getElementById('progress');

async function fetchChannels() {
    const res = await fetch(`${API_BASE}/status`);
    let channels = await res.json();
    
    // Trier les chaînes : en ligne d'abord, puis hors ligne
    channels.sort((a, b) => {
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (a.status !== 'online' && b.status === 'online') return 1;
        return 0;
    });
    
    const list = document.getElementById('channel-list');
    list.innerHTML = '';

    channels.forEach(({ name, displayName, status, avatar, viewerCount, gameName }) => {
        const li = document.createElement('li');
        li.innerHTML = `
        <div class="channel-entry">
          <div class="channel-main">
            <a href="https://twitch.tv/${name}" target="_blank" class="channel-link">
              <img src="${avatar}" class="avatar" alt="${displayName}">
              <div class="channel-info">
                <strong class="channel-name">${displayName || name}</strong>
                <div class="channel-status-container">
                  <span class="channel-status ${status}">
                    ${status === 'online' ? 'En direct' : 'Hors ligne'}
                    ${status === 'online' && gameName ? ` • <span class="game-name">${gameName}</span>` : ''}
                  </span>
                  ${status === 'online' ? 
                    `<div class="viewer-count">${viewerCount.toLocaleString()} spectateurs</div>` : ''}
                </div>
              </div>
            </a>
          </div>
          <div class="channel-actions">
            <button class="deleteChannel" data-channel="${name}" aria-label="Supprimer la chaîne">❌</button>
          </div>
        </div>
      `;
        list.appendChild(li);
    });

    // Gestion des événements de suppression
    document.querySelectorAll('.deleteChannel').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const channelName = button.dataset.channel;
            
            // Création de la modale de confirmation
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            
            // Contenu de la modale
            modal.innerHTML = `
                <div class="modal-content">
                    <h3 class="modal-title">Confirmer la suppression</h3>
                    <p class="modal-message">Êtes-vous sûr de vouloir supprimer la chaîne <strong>${channelName}</strong> ?</p>
                    <div class="modal-actions">
                        <button id="confirmDelete" class="modal-confirm">Supprimer</button>
                        <button id="cancelDelete" class="modal-cancel">Annuler</button>
                    </div>
                </div>
            `;
            
            // Ajout de la modale au document
            document.body.appendChild(modal);
            
            // Gestion des clics
            document.getElementById('confirmDelete').addEventListener('click', async () => {
                await deleteChannel(channelName);
                document.body.removeChild(modal);
            });
            
            document.getElementById('cancelDelete').addEventListener('click', () => {
                document.body.removeChild(modal);
            });
            
            // Fermeture au clic en dehors de la modale
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
        });
    });
}

async function addChannel(name) {
    await fetch(`${API_BASE}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    await fetchChannels();
}

async function deleteChannel(name) {
    await fetch(`${API_BASE}/channels/${name}`, { method: 'DELETE' });
    await fetchChannels();
}

async function updateNextCheck() {
    const res = await fetch(`${API_BASE}/next-check`);
    const data = await res.json();
    const nextCheck = new Date(data.nextCheck);
    const diff = Math.floor((nextCheck - Date.now()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    document.getElementById('next-check').innerText = 
        `Prochaine vérification dans : ${minutes}m ${seconds}s`;
}

function updateNextCheckDisplay(nextTimestamp) {
    const nextCheckElem = document.getElementById('next-check');
    const diffSeconds = Math.floor((nextTimestamp - Date.now()) / 1000);
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;

    nextCheckElem.innerText = `Prochaine vérification dans : ${minutes}m ${seconds}s`;
    nextCheckElem.dataset.next = new Date(nextTimestamp).toISOString();
}

setInterval(() => {
    const nextRaw = document.getElementById('next-check').dataset.next;
    if (!nextRaw) return;

    const nextCheck = new Date(nextRaw);
    const totalInterval = 300; // 5 minutes = 300s
    const diff = Math.floor((nextCheck - Date.now()) / 1000);
    const percentage = Math.max(0, Math.min(100, ((totalInterval - diff) / totalInterval) * 100));
    
    progressBar.style.width = `${percentage}%`;
}, 1000);

document.getElementById('add-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('channel-name').value.trim();
    if (name) {
        await addChannel(name);
        document.getElementById('channel-name').value = '';
    }
});

async function refresh() {
    await fetchChannels();

    const res = await fetch(`${API_BASE}/next-check`);
    const data = await res.json();
    const nextCheck = new Date(data.nextCheck);
    updateNextCheckDisplay(nextCheck);
}

refresh();
setInterval(refresh, 10000); // Met à jour toutes les 10 secondes