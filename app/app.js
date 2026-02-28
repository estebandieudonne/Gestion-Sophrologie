
// ==================== ÉTAT GLOBAL ====================

let clients = [];
let selectedClientId = null;
let editingClientId = null;
let currentSeanceId = null;
let parametres = { sophronisations: [], exercices: [], factures: [] };

// ==================== INITIALISATION ====================

window.addEventListener('DOMContentLoaded', async () => {
    await loadData();      // attendre que les données soient chargées
    renderClientsList();   // maintenant clients est rempli
    updateTabsState();
    //renderParametres();
    initAutoResize();
    
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            const activeTab = document.querySelector('.tab-content.active').id;
            if (activeTab === 'content-anamnese' && !document.getElementById('anamnese-view').classList.contains('hidden')) {
                printAnamnese();
            } else if (activeTab === 'content-seances' && currentSeanceId && !document.getElementById('seance-view').classList.contains('hidden')) {
                printSeance();
            }
        }
    });
});

// ==================== AUTO-RESIZE TEXTAREAS ====================

function initAutoResize() {
    document.addEventListener('input', (e) => {
        if (e.target.tagName === 'TEXTAREA' && e.target.classList.contains('auto-resize')) {
            autoResizeTextarea(e.target);
        }
    });
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

function autoResizeAllTextareas() {
    document.querySelectorAll('textarea.auto-resize').forEach(textarea => {
        autoResizeTextarea(textarea);
    });
}

// ==================== GESTION DES DONNÉES ====================

async function loadData() {
    try {
        const response = await fetch('http://localhost:5000/api/data');
        const data = await response.json();
        clients = data.clients || [];
		lastModified = data.lastModified || ''; 
		// Assurez-vous que factures est initialisé si parametres est chargé
		parametres = data.parametres || { sophronisations: [], exercices: [] };
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
    }
}

async function saveData() {
    const data = {
        clients: clients,
        parametres: parametres,
		lastModified: lastModified
    };

    fetch('http://localhost:5000/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Erreur serveur (${response.status})`);
        }
        return response.json();
    })
    .then(result => {
        if (result.status === 'success') {
            console.log('Données sauvegardées côté serveur ✅');
            showNotification('Données sauvegardées avec succès ✅', 'success');
        } else {
            console.error('Erreur serveur:', result.message || result.error);
            showNotification('Erreur lors de la sauvegarde sur le serveur ⚠️️', 'information');
        }
    })
    .catch(error => {
        console.error('❌ Erreur lors de la sauvegarde:', error);
        showNotification('❌ Impossible de contacter le serveur. Les données ne sont pas enregistrées !', 'error');
    });
	
	try {
    await window.api.cleanOldBackups();
    console.log('Nettoyage des backups effectué après sauvegarde.');
  } catch (err) {
    console.error('Erreur lors du nettoyage des backups :', err);
  };
}


// ==================== GESTION DES ONGLETS ====================

function switchTab(tabName) {
    //if (tabName !== 'clients' && tabName !== 'parametres' && !selectedClientId) { j'enleve la verife de facture/parm
	if (tabName !== 'clients' && !selectedClientId) {
        showNotification('Veuillez d\'abord sélectionner un client ⚠️','information');
        return;
    }

    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const tabButton = Array.from(document.querySelectorAll('.tab')).find(t => 
        t.getAttribute('onclick') && t.getAttribute('onclick').includes(tabName)
    );
    if (tabButton) tabButton.classList.add('active');
    
    document.getElementById(`content-${tabName}`).classList.add('active');

    if (tabName === 'anamnese') {
        loadAnamnese();
    } else if (tabName === 'protocole') {
        loadProtocole();
    } else if (tabName === 'seances') {
        loadSeances();
    } else if (tabName === 'factures') {
		loadFactures();
    }
}

function updateTabsState() {
    const hasSelectedClient = selectedClientId !== null;
    
    const tabAnamnese = document.getElementById('tab-anamnese');
    const tabProtocole = document.getElementById('tab-protocole');
    const tabSeances = document.getElementById('tab-seances');
	const tabFactures = document.getElementById('tab-factures');
    
    if (tabAnamnese) tabAnamnese.classList.toggle('disabled', !hasSelectedClient);
    if (tabProtocole) tabProtocole.classList.toggle('disabled', !hasSelectedClient);
    if (tabSeances) tabSeances.classList.toggle('disabled', !hasSelectedClient);
	if (tabFactures) tabFactures.classList.toggle('disabled', !hasSelectedClient);
}

// ==================== GESTION DES CLIENTS ====================

function showNewClientForm() {
    editingClientId = null;
    document.getElementById('form-title').textContent = 'Nouveau client';
    document.getElementById('client-nom').value = '';
    document.getElementById('client-prenom').value = '';
    document.getElementById('client-adresse').value = '';
    document.getElementById('client-email').value = '';
    document.getElementById('client-telephone').value = '';
    document.getElementById('client-form').classList.remove('hidden');
}

function cancelClientForm() {
    document.getElementById('client-form').classList.add('hidden');
    editingClientId = null;
}

function saveClient() {
    const nom = document.getElementById('client-nom').value.trim();
    const prenom = document.getElementById('client-prenom').value.trim();
    const adresse = document.getElementById('client-adresse').value.trim();
    const email = document.getElementById('client-email').value.trim();
    const telephone = document.getElementById('client-telephone').value.trim();

    if (!nom || !prenom) {
        showNotification('Le nom et le prénom sont obligatoires ⚠️', 'information');
        return;
    }

    if (editingClientId) {
        const client = clients.find(c => c.id === editingClientId);
        if (client) {
            client.nom = nom;
            client.prenom = prenom;
            client.adresse = adresse;
            client.email = email;
            client.telephone = telephone;
        }
    } else {
        const newClient = {
            id: Date.now().toString(),
            nom, prenom, adresse, email, telephone,
            anamnese: {},
            protocole: []
        };
        clients.push(newClient);
    }

    saveData();
    renderClientsList();
    cancelClientForm();
}

function editClient(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    editingClientId = clientId;
    document.getElementById('form-title').textContent = 'Modifier le client';
    document.getElementById('client-nom').value = client.nom;
    document.getElementById('client-prenom').value = client.prenom;
    document.getElementById('client-adresse').value = client.adresse || '';
    document.getElementById('client-email').value = client.email || '';
    document.getElementById('client-telephone').value = client.telephone || '';
    document.getElementById('client-form').classList.remove('hidden');
}

async function deleteClient(clientId) {
    const confirmed = await showConfirmDialog(
        'Êtes-vous sûr(e) de vouloir supprimer ce client et toutes ses données ?'
    );
    if (!confirmed) return;

    clients = clients.filter(c => c.id !== clientId);

    if (selectedClientId === clientId) {
        selectedClientId = null;
        updateTabsState();
        switchTab('clients');
    }

    saveData();
    renderClientsList();
    showNotification('Client supprimé ✅', 'success');
}


function selectClient(clientId) {
    selectedClientId = clientId;
    updateTabsState();
    renderClientsList();
}

function renderClientsList() {
    const listContainer = document.getElementById('clients-list');
    
    if (!clients || clients.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <h3>Aucun client enregistré</h3>
                <p>Cliquez sur "Nouveau client" pour commencer</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = clients.map(client => `
        <div class="client-card ${selectedClientId === client.id ? 'selected' : ''}" onclick="selectClient('${client.id}')">
            <h3>${client.prenom} ${client.nom}</h3>
            ${client.email ? `<p>📧 ${client.email}</p>` : ''}
            ${client.telephone ? `<p>📞 ${client.telephone}</p>` : ''}
            ${client.adresse ? `<p>📍 ${client.adresse}</p>` : ''}
            <div class="client-card-actions" onclick="event.stopPropagation()">
                <button class="btn btn-secondary btn-small" onclick="editClient('${client.id}')">✏️ Modifier</button>
                <button class="btn btn-danger btn-small" onclick="deleteClient('${client.id}')">🗑️ Supprimer</button>
            </div>
        </div>
    `).join('');
}

// ==================== GESTION DE L'ANAMNÈSE ====================

function loadAnamnese() {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    const anamnese = client.anamnese || {};

    document.getElementById('anamnese-info').textContent = `Client : ${client.prenom} ${client.nom}`;
    document.getElementById('anamnese-client-name').textContent = `${client.prenom} ${client.nom}`;
	
	const infoParts = [];

if (client.adresse && client.adresse.trim() !== '') {
  infoParts.push(`Adresse : ${client.adresse}`);
}

if (client.email && client.email.trim() !== '') {
  infoParts.push(`Email : ${client.email}`);
}

if (client.telephone && client.telephone.trim() !== '') {
  infoParts.push(`Tel : ${client.telephone}`);
}

document.getElementById('anamnese-client-renseignements').textContent = infoParts.join(' | ');

    showAnamneseViewMode();
}


function showAnamneseViewMode() {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

	const anamnese = client.anamnese || {};
	
    document.getElementById('anamnese-view').classList.remove('hidden');
    document.getElementById('anamnese-edit').classList.add('hidden');
    document.getElementById('btn-edit-anamnese').textContent = '✏️ Modifier';
   
	const date = new Date(anamnese.date);
	if (anamnese.date) {
    document.getElementById('anamnese-date-display').textContent = date.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
	} else { document.getElementById('anamnese-date-display').textContent = ''}
		
    document.getElementById('view-objet').textContent = anamnese.objet || '\n\n\n\n\n';
	
    document.getElementById('view-etatsante').textContent = anamnese.etatsante ? anamnese.etatsante + ' |' : '\n\n';
	const note_etatsante = anamnese.etatsanteNote ? `Note : ${anamnese.etatsanteNote}/5` : 'Note :        /5';
	document.getElementById('view-etatsante').textContent += ` ${note_etatsante}`;
	
    document.getElementById('view-traitement').textContent = anamnese.traitement ? anamnese.traitement + ' |' : '\n\n';
	const note_traitement = anamnese.traitementNote ? `Note : ${anamnese.traitementNote}/5` : 'Note :        /5';
	document.getElementById('view-traitement').textContent += ` ${note_traitement}`;	
	
    document.getElementById('view-douleurs').textContent = anamnese.douleurs ? anamnese.douleurs + ' |' : '\n\n';
	const note_douleurs = anamnese.douleursNote ? `Note : ${anamnese.douleursNote}/5` : 'Note :        /5';
	document.getElementById('view-douleurs').textContent += ` ${note_douleurs}`;
	
    document.getElementById('view-sommeil').textContent = anamnese.sommeil ? anamnese.sommeil + ' |' : '\n\n';
	const note_sommeil = anamnese.sommeilNote ? `Note : ${anamnese.sommeilNote}/5` : 'Note :        /5';
	document.getElementById('view-sommeil').textContent += ` ${note_sommeil}`;
	
    document.getElementById('view-alimentation').textContent = anamnese.alimentation ? anamnese.alimentation + ' |' : '\n\n';
	const note_alimentation = anamnese.alimentationNote ? `Note : ${anamnese.alimentationNote}/5` : 'Note :        /5';
	document.getElementById('view-alimentation').textContent += ` ${note_alimentation}`;
	
    document.getElementById('view-sitmar').textContent = anamnese.sitmar ? anamnese.sitmar + ' |' : '\n';
	const note_sitmar = anamnese.sitmarNote ? `Note : ${anamnese.sitmarNote}/5` : 'Note :        /5';
	document.getElementById('view-sitmar').textContent += ` ${note_sitmar}`;
	
    document.getElementById('view-enfants').textContent = anamnese.enfants ? anamnese.enfants + ' |' : '\n';
	const note_enfants = anamnese.enfantsNote ? `Note : ${anamnese.enfantsNote}/5` : 'Note :        /5';
	document.getElementById('view-enfants').textContent += ` ${note_enfants}`;
	
	document.getElementById('view-sitprof').textContent = anamnese.sitprof ? anamnese.sitprof + ' |' : '\n';
	const note_sitprof= anamnese.sitprofNote ? `Note : ${anamnese.sitprofNote}/5` : 'Note :        /5';
	document.getElementById('view-sitprof').textContent += ` ${note_sitprof}`;
	
	document.getElementById('view-sitsoc').textContent = anamnese.sitsoc ? anamnese.sitsoc + ' |' : '\n\n';
	const note_sitsoc= anamnese.sitsocNote ? `Note : ${anamnese.sitsocNote}/5` : 'Note :        /5';
	document.getElementById('view-sitsoc').textContent += ` ${note_sitsoc}`;
	
	document.getElementById('view-aversions').textContent = anamnese.aversions ? anamnese.aversions + ' |' : '\n\n';
	const note_aversions= anamnese.aversionsNote ? `Note : ${anamnese.aversionsNote}/5` : 'Note :        /5';
	document.getElementById('view-aversions').textContent += ` ${note_aversions}`;
	
	document.getElementById('view-loisirs').textContent = anamnese.loisirs ? anamnese.loisirs + ' |' : '\n\n\n\n';
	const note_loisirs= anamnese.loisirsNote ? `Note : ${anamnese.loisirsNote}/5` : 'Note :        /5';
	document.getElementById('view-loisirs').textContent += ` ${note_loisirs}`;
	
	document.getElementById('view-objli').textContent = anamnese.objli ? anamnese.objli + ' |' : '\n\n\n\n';
	const note_objli= anamnese.objliNote ? `Note : ${anamnese.objliNote}/5` : 'Note :        /5';
	document.getElementById('view-objli').textContent += ` ${note_objli}`;
	
	document.getElementById('view-defobjacc').textContent = anamnese.defobjacc ? anamnese.defobjacc + ' |' : '\n';
	const note_defobjacc= anamnese.defobjaccNote ? `Note : ${anamnese.defobjaccNote}/5` : 'Note :        /5';
	document.getElementById('view-defobjacc').textContent += ` ${note_defobjacc}`;
	
	document.getElementById('view-ressources').textContent = anamnese.ressources || '\n\n\n';
	
	document.getElementById('view-indicateurs').textContent = anamnese.indicateurs || '\n\n\n';
}

function toggleEditAnamnese() {
    const isEditing = !document.getElementById('anamnese-edit').classList.contains('hidden');
    
    if (isEditing) {
		saveAnamnese()
        showAnamneseViewMode();
    } else {
        const client = clients.find(c => c.id === selectedClientId);
        if (!client) return;

        document.getElementById('anamnese-view').classList.add('hidden');
        document.getElementById('anamnese-edit').classList.remove('hidden');
        document.getElementById('btn-edit-anamnese').textContent = '👁️ Visualiser';

        const anamnese = client.anamnese || {};
        
		document.getElementById('anamnese-date').value = anamnese.date || '';
		
        document.getElementById('anamnese-objet').value = anamnese.objet || '';
		
        document.getElementById('anamnese-etatsante').value = anamnese.etatsante || '';
		document.getElementById('anamnese-etatsante-note').value = anamnese.etatsanteNote || '';
		
        document.getElementById('anamnese-traitement').value = anamnese.traitement || '';
		document.getElementById('anamnese-traitement-note').value = anamnese.traitementNote || '';
		
        document.getElementById('anamnese-douleurs').value = anamnese.douleurs || '';
		document.getElementById('anamnese-douleurs-note').value = anamnese.douleursNote || '';
		
        document.getElementById('anamnese-sommeil').value = anamnese.sommeil || '';
		document.getElementById('anamnese-sommeil-note').value = anamnese.sommeilNote || '';
		
        document.getElementById('anamnese-alimentation').value = anamnese.alimentation || '';
		document.getElementById('anamnese-alimentation-note').value = anamnese.alimentationNote || '';
		
        document.getElementById('anamnese-sitmar').value = anamnese.sitmar || '';
		document.getElementById('anamnese-sitmar-note').value = anamnese.sitmarNote || '';		
		
        document.getElementById('anamnese-enfants').value = anamnese.enfants || '';
		document.getElementById('anamnese-enfants-note').value = anamnese.enfantsNote || '';
		
		document.getElementById('anamnese-sitprof').value = anamnese.sitprof || '';
		document.getElementById('anamnese-sitprof-note').value = anamnese.sitprofNote || '';
		
		document.getElementById('anamnese-sitsoc').value = anamnese.sitsoc || '';
		document.getElementById('anamnese-sitsoc-note').value = anamnese.sitsocNote || '';
		
		document.getElementById('anamnese-aversions').value = anamnese.aversions || '';
		document.getElementById('anamnese-aversions-note').value = anamnese.aversionsNote || '';
        
		document.getElementById('anamnese-loisirs').value = anamnese.loisirs || '';
		document.getElementById('anamnese-loisirs-note').value = anamnese.loisirsNote || '';
		
		document.getElementById('anamnese-objli').value = anamnese.objli || '';
		document.getElementById('anamnese-objli-note').value = anamnese.objliNote || '';
		
		document.getElementById('anamnese-defobjacc').value = anamnese.defobjacc || '';
		document.getElementById('anamnese-defobjacc-note').value = anamnese.defobjaccNote || '';
		
		document.getElementById('anamnese-ressources').value = anamnese.ressources || '';
		
		document.getElementById('anamnese-indicateurs').value = anamnese.indicateurs || '';
		
        setTimeout(autoResizeAllTextareas, 0);
    }
}

function cancelEditAnamnese() {
    showAnamneseViewMode();
}

function saveAnamnese() {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    client.anamnese = {
		date: document.getElementById('anamnese-date').value,
        objet: document.getElementById('anamnese-objet').value,
		
        etatsante: document.getElementById('anamnese-etatsante').value,
		etatsanteNote: document.getElementById('anamnese-etatsante-note').value || '',
		
        traitement: document.getElementById('anamnese-traitement').value,
		traitementNote: document.getElementById('anamnese-traitement-note').value || '',
		
        douleurs: document.getElementById('anamnese-douleurs').value,
		douleursNote: document.getElementById('anamnese-douleurs-note').value || '',
		
        sommeil: document.getElementById('anamnese-sommeil').value,
		sommeilNote: document.getElementById('anamnese-sommeil-note').value || '',
		
        alimentation: document.getElementById('anamnese-alimentation').value,
		alimentationNote: document.getElementById('anamnese-alimentation-note').value || '',
		
        sitmar: document.getElementById('anamnese-sitmar').value,
		sitmarNote: document.getElementById('anamnese-sitmar-note').value || '',
		
        enfants: document.getElementById('anamnese-enfants').value,
		enfantsNote: document.getElementById('anamnese-enfants-note').value || '',
		
		sitprof: document.getElementById('anamnese-sitprof').value,
		sitprofNote: document.getElementById('anamnese-sitprof-note').value || '',
		
		sitsoc: document.getElementById('anamnese-sitsoc').value,
		sitsocNote: document.getElementById('anamnese-sitsoc-note').value || '',
		
		aversions: document.getElementById('anamnese-aversions').value,
		aversionsNote: document.getElementById('anamnese-aversions-note').value || '',
		
		loisirs: document.getElementById('anamnese-loisirs').value,
		loisirsNote: document.getElementById('anamnese-loisirs-note').value || '',
		
		objli: document.getElementById('anamnese-objli').value,
		objliNote: document.getElementById('anamnese-objli-note').value || '',
		
		defobjacc: document.getElementById('anamnese-defobjacc').value,
		defobjaccNote: document.getElementById('anamnese-defobjacc-note').value || '',
		
		ressources: document.getElementById('anamnese-ressources').value,
		
		indicateurs: document.getElementById('anamnese-indicateurs').value,
    };

    saveData();
    showAnamneseViewMode();
}

function printAnamnese() {
    if (!document.getElementById('anamnese-view').classList.contains('hidden')) {
        window.print();
    } else {
        showNotification('Veuillez passer en mode visualisation avant d\'imprimer ⚠️','information');
    }
}

function showAnamneseSyntheseWindow() {
    // Créer l’overlay
    const overlay = document.createElement('div');
    overlay.className = 'param-overlay';

    // Créer la fenêtre
    const windowBox = document.createElement('div');
    windowBox.className = 'param-window';

    // Contenu HTML de ta fenêtre
    windowBox.innerHTML = `
	<button class="param-close">&times;</button>

	<div class="param-container">

    <!-- Contenu -->
    <div class="param-content">
		<h2 style="text-align:center; margin-bottom: 20px;">Synthèse pour le protocole</h2>
		<div style="text-align: center; max-width: 600px; margin: 0 auto; line-height: 1.6;">
			<div class="grid-table">
				<div class="grid-table-cell grid-table-header">Besoins</div>
				<div class="grid-table-cell grid-table-header">Ressources</div>
				<div class="grid-table-cell"><textarea id="anamnese-synthese-besoins" class="auto-resize" onchange="updateAnamneseSynthese()"></textarea></div>
				<div class="grid-table-cell"><textarea id="anamnese-synthese-ressources" class="auto-resize" onchange="updateAnamneseSynthese()"></textarea></div>
				<div class="grid-table-cell grid-table-header">Contraintes</div>
				<div class="grid-table-cell grid-table-header">Aversions</div>
				<div class="grid-table-cell"><textarea id="anamnese-synthese-contraintes" class="auto-resize" onchange="updateAnamneseSynthese()"></textarea></div>
				<div class="grid-table-cell"><textarea id="anamnese-synthese-aversions" class="auto-resize" onchange="updateAnamneseSynthese()"></textarea></div>
				<div class="grid-table-cell grid-table-header">Nombre de séances</div>
				<div class="grid-table-cell grid-table-header">Protocole type</div>
				<div class="grid-table-cell"><textarea id="anamnese-synthese-nbseances" class="auto-resize" onchange="updateAnamneseSynthese()"></textarea></div>
				<div class="grid-table-cell"><textarea id="anamnese-synthese-protocoletype" class="auto-resize" onchange="updateAnamneseSynthese()"></textarea></div>
			</div>
		</div>
	</div>
    `;
	
	overlay.appendChild(windowBox);
    document.body.appendChild(overlay);
	
	
	const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;
	
	const anamSynt = client.syntheseAnamnese || {};
	
	const anamnese = client.anamnese || {};
	
	if (!anamSynt.aversions && anamnese?.aversions) {
        anamSynt.aversions = anamnese.aversions;
    }
	if (!anamSynt.ressources && anamnese?.ressources) {
        anamSynt.ressources = anamnese.ressources;
    }
	if (!anamSynt.protocoletype && client?.protocoleType) {
        anamSynt.protocoletype = client.protocoleType;
    }	
	
    document.getElementById('anamnese-synthese-besoins').value = anamSynt.besoins || '';
	document.getElementById('anamnese-synthese-ressources').value = anamSynt.ressources || '';
	document.getElementById('anamnese-synthese-contraintes').value = anamSynt.contraintes || '';
	document.getElementById('anamnese-synthese-aversions').value = anamSynt.aversions || '';
	document.getElementById('anamnese-synthese-nbseances').value = anamSynt.nbSeances || '';
	document.getElementById('anamnese-synthese-protocoletype').value = anamSynt.protocoletype || '';
	
    // Clique pour fermer
    overlay.querySelector('.param-close').onclick = () => {
        overlay.remove();
    };

    // Clique en dehors de la fenêtre pour fermer
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
}

function updateAnamneseSynthese() {
	const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;
    
	client.syntheseAnamnese = {
		besoins: document.getElementById('anamnese-synthese-besoins').value,
        ressources: document.getElementById('anamnese-synthese-ressources').value,
		contraintes: document.getElementById('anamnese-synthese-contraintes').value,
		aversions: document.getElementById('anamnese-synthese-aversions').value,
		nbSeances: document.getElementById('anamnese-synthese-nbseances').value,
		protocoletype: document.getElementById('anamnese-synthese-protocoletype').value,
	};
	
    saveData();
}

// ==================== GESTION DU PROTOCOLE ====================

function loadProtocole() {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    document.getElementById('protocole-info').textContent =
        `Client : ${client.prenom} ${client.nom} - Vue d'ensemble des séances`;

    // Initialisation objectif / durée
    if (!client.protocoleObjectif && client.anamnese?.objet) {
        client.protocoleObjectif = client.anamnese.objet;
    }
    if (!client.protocoleDuree) client.protocoleDuree = '';

    // Remplir les inputs (ils doivent exister dans ton HTML)
    const objEl = document.getElementById('protocole-objectif');
    if (objEl) objEl.value = client.protocoleObjectif || '';
    const durEl = document.getElementById('protocole-duree');
    if (durEl) durEl.value = client.protocoleDuree || '';
	const typeEl = document.getElementById('protocole-type');
	if (typeEl) typeEl.value = client.protocoleType || '';

	if (!client.protocole) client.protocole = [];

		// 🔹 Ajout de la séance 0 comme premier élément du protocole si absent
		if (client.protocole.length === 0 || client.protocole[0].num !== 0) {
	    client.protocole.unshift({
			titre: "Séance 0 - Découverte",
			intentionSeance: "",
	        sophronisation: "",
	        intentionSophro: "",
			taisSophro: "",
	        exercice1: "",
	        intentionEx1: "",
	        exercice2: "",
	        intentionEx2: "",
	        exercice3: "",
	        intentionEx3: "",
	        exercice4: "",
	        intentionEx4: "",
			id: 'seance0', // ID fixe pour la séance 0
			num: 0, // Numéro 0 pour la séance d'introduction
			date: new Date().toISOString().split('T')[0], // Date par défaut
			anamnese: '',
			ressenti: ''
			});
		}

	    // Initialisations structurelles si manquantes
	    if (!client.protocoleStep) {
	        // La séance 0 n'a pas de step, les autres sont par défaut au step1
	        client.protocoleStep = client.protocole.slice(1).map(() => 'step1');
	    }
    // Initialiser titres d'étape si absents
    if (!client.step1Title) client.step1Title = '';
    if (!client.step2Title) client.step2Title = '';
    if (!client.step3Title) client.step3Title = '';
    if (!client.step4Title) client.step4Title = '';
    if (!client.step5Title) client.step5Title = '';

    saveData();

    renderProtocole();
}

function updateProtocoleInfo(field, value) {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;
    if (field === 'objectif') client.protocoleObjectif = value;
    if (field === 'duree') client.protocoleDuree = value;
	if (field === 'type') client.protocoleType = value;
    saveData();
}

function renderProtocole() {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;
    const container = document.getElementById('protocole-list');
    if (!container) return;
	


	
	    if (!client.protocole || client.protocole.length === 0) {
	        container.innerHTML = '<div class="empty-state"><p>Aucune séance dans le protocole</p></div>';
	        return;
	    }
	
		    // Rendu de la Séance 0 (index 0)
		    let html = renderSeanceItem(0, client.protocole[0], false, false, true); // Le dernier 'true' indique que c'est la séance 0

    // Ordre des étapes
    const steps = [
        { id: 'step1', label: 'Phase curative — Étape 1', titleField: 'step1Title' },
        { id: 'step2', label: 'Phase curative — Étape 2', titleField: 'step2Title' },
        { id: 'step3', label: 'Phase préventive — Étape 3', titleField: 'step3Title' },
        { id: 'step4', label: 'Phase préventive — Étape 4', titleField: 'step4Title' },
        { id: 'step5', label: 'Phase de clôture — Étape 5', titleField: 'step5Title' }
    ];

	    // Grouper indices des séances par étape pour savoir qui est 1er/dernier
	    const groups = {};
	    steps.forEach(s => groups[s.id] = []);
	    // On commence à l'index 1 pour les séances du protocole
	    client.protocoleStep.forEach((stepId, idx) => {
	        if (!groups[stepId]) groups[stepId] = [];
	        groups[stepId].push(idx + 1); // +1 car protocoleStep ne contient pas la séance 0
	    });

	    // Construire HTML : chaque étape = bloc séparé avec input titre puis ses séances
	    html += '';
    steps.forEach((s, stepIndex) => {
        const titleValue = client[s.titleField] || '';
        html += `<div class="phase-block">
                    <h3>${s.label}</h3>
                    <div class="etape">
                        <label>Titre :</label>
                        <input type="text" value="${escapeHtml(titleValue)}"
                            placeholder="Titre de l'étape"
                            onchange="updateEtape('${s.titleField}', this.value)">
                    </div>
                    <div class="seances-sous-etape">`;

        const indices = groups[s.id] || [];
        if (indices.length === 0) {
            html += '<div class="empty-state"><small>Aucune séance ici</small></div>';
        } else {
	            indices.forEach((protocoleIndex, posInGroup) => {
	                const seance = client.protocole[protocoleIndex];
	                // Générer l'HTML d'une séance en indiquant si on doit afficher flèches
	                const showUp = (posInGroup === 0) && (stepIndex > 0);
	                const showDown = (posInGroup === indices.length - 1) && (stepIndex < steps.length - 1);
	
	                html += renderSeanceItem(protocoleIndex, seance, showUp, showDown);
	            });
        }

        html += `   </div>
	                  </div>`;
	    });
	
	    container.innerHTML = html;
}

// helper pour échapper rapidement des valeurs affichées dans value/textContent
function escapeHtml(str) {
    if (!str && str !== '') return '';
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function renderSeanceItem(protocoleIndex, seance, showUp, showDown, isSeance0 = false) {
    // protocoleIndex = index dans client.protocole / client.protocoleStep
    const idx = protocoleIndex;
    return `
        <div class="protocole-seance">
            <h4>
                <span>${isSeance0 ? seance.titre : `Séance ${seance.num}`}</span>
                <div class="seance-actions">
                    ${!isSeance0 && showUp ? `<button class="btn btn-small" onclick="moveSeanceToAdjacentStep(${idx}, -1)" title="Monter vers l'étape précédente">⬆️</button>` : ''}
                    ${!isSeance0 && showDown ? `<button class="btn btn-small" onclick="moveSeanceToAdjacentStep(${idx}, 1)" title="Descendre vers l'étape suivante">⬇️</button>` : ''}
                    ${!isSeance0 ? `<button class="btn btn-danger btn-small" onclick="deleteProtocoleSeance(${idx})">🗑️</button>` : ''}
                </div>
            </h4>
            <div class="protocole-form">
				<div class="form-group">
						<label>Intention de la séance</label>
						<textarea class="auto-resize" placeholder="Intention de la séance..." 
							onchange="updateProtocoleSeance(${idx}, 'intentionSeance', this.value)">${escapeHtml(seance.intentionSeance || '')}</textarea>
					</div>
			
				<div>
					<div class="form-row wide-1-1-1-1">
                    ${[1,2,3,4].map(num => `
                        <div class="form-group">
                            <label>Exercice ${num}</label>
                            <select onchange="updateProtocoleSeance(${idx}, 'exercice${num}', this.value)">
                                <option value="">Sélectionner</option>
                                ${parametres.exercices.map(e => `<option value="${escapeHtml(e)}" ${seance['exercice'+num] === e ? 'selected' : ''}>${escapeHtml(e)}</option>`).join('')}
                            </select>
                            <textarea class="auto-resize" placeholder="Intention pour cet exercice..." onchange="updateProtocoleSeance(${idx}, 'intentionEx${num}', this.value)">${escapeHtml(seance['intentionEx'+num] || '')}</textarea>
                        </div>
                    `).join('')}
					</div>
                </div>
			
				<div class="form-row wide-1-1-1">
					<div class="form-group">
						<label>Sophronisation</label>
						<select onchange="updateProtocoleSeance(${idx}, 'sophronisation', this.value)">
							<option value="">Sélectionner</option>
							${parametres.sophronisations.map(s => `<option value="${escapeHtml(s)}" ${seance.sophronisation === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
						</select>
					</div>

					<div class="form-group">
						<label>Intention</label>
						<textarea class="auto-resize" placeholder="Intention thérapeutique pour la sophronisation..." 
							onchange="updateProtocoleSeance(${idx}, 'intentionSophro', this.value)">${escapeHtml(seance.intentionSophro || '')}</textarea>
					</div>
				
					<div class="form-group">
						<label>TAIS</label>
						<textarea class="auto-resize" placeholder="TAIS pour la sophronisation..." 
							onchange="updateProtocoleSeance(${idx}, 'taisSophro', this.value)">${escapeHtml(seance.taisSophro || '')}</textarea>          
					</div>
				</div>
            </div>
        </div>
    `;
}

// Déplacer la séance (protocoleIndex) vers l'étape précédente (direction=-1) ou suivante (direction=+1)
function moveSeanceToAdjacentStep(protocoleIndex, direction) {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    if (protocoleIndex === 0) {
        showNotification('La Séance 0 ne peut pas être déplacée ⚠️', 'information');
        return;
    }

    if (!client.protocoleStep) client.protocoleStep = client.protocole.slice(1).map(() => 'step1');

    const stepsOrder = ['step1','step2','step3','step4','step5'];
    // L'index dans protocoleStep est décalé de -1 par rapport à protocole
    const stepIndex = protocoleIndex - 1;
    const curStep = client.protocoleStep[stepIndex];
    const curStepIdx = stepsOrder.indexOf(curStep);
    if (curStepIdx === -1) return;
    const newStepIdx = curStepIdx + direction;
    if (newStepIdx < 0 || newStepIdx >= stepsOrder.length) return;
    const newStep = stepsOrder[newStepIdx];

    // Retirer l'item des arrays
    const [moved] = client.protocole.splice(protocoleIndex, 1);
    client.protocoleStep.splice(stepIndex, 1); // Utiliser stepIndex

    // Trouver indice d'insertion : après le dernier élément du newStep (s'il existe), sinon
    // avant le premier élément appartenant à la step suivante après newStep, sinon à la fin.
    const indicesNewStep = [];
    client.protocoleStep.forEach((s, i) => { if (s === newStep) indicesNewStep.push(i); });

    let insertStepIndex;
    if (indicesNewStep.length > 0) {
        insertStepIndex = indicesNewStep[indicesNewStep.length - 1] + 1;
    } else {
        // trouver la première position d'un step ayant un index > newStepIdx
        insertStepIndex = client.protocoleStep.findIndex(s => stepsOrder.indexOf(s) > newStepIdx);
        if (insertStepIndex === -1) insertStepIndex = client.protocoleStep.length; // fin
    }
    // L'index d'insertion dans protocole est décalé de +1 par rapport à protocoleStep
    const insertProtocoleIndex = insertStepIndex + 1;

    // Insérer moved et sa step
    client.protocole.splice(insertProtocoleIndex, 0, moved);
    client.protocoleStep.splice(insertStepIndex, 0, newStep);

    // Rénumeroter num des séances selon nouvel ordre
    // La séance 0 garde le numéro 0. Les autres sont numérotées à partir de 1.
    client.protocole.forEach((s, i) => {
        s.num = i;
        // Mettre à jour l'ID pour les séances renumérotées (sauf la séance 0)
        if (i > 0) {
            s.id = Date.now().toString() + '-' + i;
        }
    });

    saveData();
    renderProtocole();
}

// Ajout, mise à jour, suppression (similaire à ta logique précédente)

function addSeanceToProtocole() {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;
    if (!client.protocole) client.protocole = [];
    if (!client.protocoleStep) client.protocoleStep = [];

    // La numérotation commence à 1, car la séance 0 est à l'index 0
    const newNum = client.protocole.length; 
    client.protocole.push({
        id: Date.now().toString() + '-' + Math.floor(Math.random() * 1000), // Ajout d'un ID unique
        num: newNum,
		intentionSeance: '',
        sophronisation: '',
        intentionSophro: '',
		taisSophro: '',
        exercice1: '', intentionEx1: '',
        exercice2: '', intentionEx2: '',
        exercice3: '', intentionEx3: '',
        exercice4: '', intentionEx4: ''
    });
    // Par défaut ajouter sous step1 (tu peux changer)
    //client.protocoleStep.push('step1');
	
	// Ajouter la nouvelle séance sous le même step que la dernière séance existante
	const lastStep = client.protocoleStep.length > 0 
    ? client.protocoleStep[client.protocoleStep.length - 1] 
    : 'step1'; // si aucune séance existante, mettre step1 par défaut
	client.protocoleStep.push(lastStep);

    saveData();
    renderProtocole();
}

function updateProtocoleSeance(index, field, value) {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client || !client.protocole[index]) return;
    client.protocole[index][field] = value;
    saveData();
    // on peut rester sur le même affichage : rafraîchir la vue
    renderProtocole();
}



async function deleteProtocoleSeance(index) {
    const confirmed = await showConfirmDialog('Supprimer cette séance du protocole ? (Elle sera aussi supprimée des séances)');
    if (!confirmed) return;

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    if (index === 0) {
        showNotification('La Séance 0 ne peut pas être supprimée ⚠️', 'information');
        return;
    }

    const deletedNum = client.protocole[index].num;
    client.protocole.splice(index, 1);
    // L'index dans protocoleStep est décalé de -1 par rapport à protocole
    if (client.protocoleStep) client.protocoleStep.splice(index - 1, 1);

    // Renumérotation
    // La séance 0 garde le numéro 0. Les autres sont numérotées à partir de 1.
    client.protocole.forEach((s, i) => {
        s.num = i;
        // Mettre à jour l'ID pour les séances renumérotées (sauf la séance 0)
        if (i > 0) {
            s.id = Date.now().toString() + '-' + i;
        }
    });

    saveData();
    renderProtocole();
}

function updateEtape(field, value) {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;
    client[field] = value;
    saveData();
}


// ==================== GESTION DES SÉANCES ====================

function loadSeances() {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    document.getElementById('seances-info').textContent = `Client : ${client.prenom} ${client.nom}`;

    document.getElementById('seance-detail').classList.add('hidden');
    document.getElementById('seances-list').classList.remove('hidden');
    currentSeanceId = null;
    
    renderSeancesList();
}

function renderSeancesList() {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    const container = document.getElementById('seances-list');
    
    if (!client.protocole || client.protocole.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Aucune séance enregistrée<br>Créez des séances depuis l\'onglet Protocole</p></div>';
        return;
    }

    const sortedSeances = [...client.protocole].sort((a, b) => a.num - b.num);

    container.innerHTML = sortedSeances.map(seance => {
        const date = new Date(seance.date);
		const isValidDate = !isNaN(date.getTime());
        const dateStr = isValidDate ? date.toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }) : null;
		
		const affichageDate = dateStr ? `${dateStr}` : ' Date non renseignée';
		
        return `
            <div class="seance-card" onclick="viewSeance('${seance.id}')">
                <h4>
                    <span>📅 Séance ${seance.num} - ${affichageDate}</span>
                </h4>
                ${seance.intentionSeance ? `<p><strong>Intention :</strong> ${seance.intentionSeance.substring(0, 100)}${seance.intentionSeance.length > 100 ? '...' : ''}</p>` : ''}
            </div>
        `;
    }).join('');
}

function viewSeance(seanceId) {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    const seance = client.protocole.find(s => s.id === seanceId);
    if (!seance) return;
	
    currentSeanceId = seanceId;

    const protocoleSeance = seance;

    document.getElementById('seances-list').classList.add('hidden');
    document.getElementById('seance-detail').classList.remove('hidden');

    document.getElementById('seance-client-name').textContent = `${client.prenom} ${client.nom}`;
    document.getElementById('seance-number').textContent = `Séance n°${seance.num}`;
    
    const date = new Date(seance.date);
	const isValidDate = !isNaN(date.getTime());
	const dateStr = isValidDate ? date.toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }) : null;
		
		const affichageDate = dateStr ? `${dateStr}` : '';
	
    document.getElementById('seance-date-display').textContent = affichageDate;

    const sophroText = protocoleSeance?.sophronisation || 'Non défini';
    const sophroIntention = protocoleSeance?.intentionSophro || '';
    document.getElementById('view-seance-sophronisation').innerHTML = sophroIntention 
        ? `<strong>${sophroText}</strong><em>  |  Intention : ${sophroIntention}</em>`
        : sophroText;

    const exercices = [
        { nom: protocoleSeance?.exercice1, intention: protocoleSeance?.intentionEx1 },
        { nom: protocoleSeance?.exercice2, intention: protocoleSeance?.intentionEx2 },
        { nom: protocoleSeance?.exercice3, intention: protocoleSeance?.intentionEx3 },
        { nom: protocoleSeance?.exercice4, intention: protocoleSeance?.intentionEx4 }
    ].filter(e => e.nom);

    const view = document.getElementById('view-seance-exercices');
	view.innerHTML = exercices.length
    ? exercices.map(e => `<strong>${e.nom}</strong>${e.intention ? `<em>  |  Intention : ${e.intention}</em>` : ''}`).join('<br><br>')
    : 'Aucun exercice défini';

	document.getElementById('view-seance-objectifacc').textContent = client.protocoleObjectif || '\n';
    document.getElementById('view-seance-intention').textContent = seance.intentionSeance || '\n';
    document.getElementById('view-seance-anamnese').textContent = seance.anamnese || '\n\n\n\n\n\n';
    document.getElementById('view-seance-phenodescription').textContent = seance.phenodescription || '\n\n\n\n\n\n';
	document.getElementById('view-seance-entrainement').textContent = seance.entrainement || '';
		
	const dateRDV = new Date(seance.prochainRDV);
	const isValidDateRDV = !isNaN(dateRDV.getTime());

	if (isValidDateRDV) {
	// Format de la date (jour de la semaine, jour, mois, année)
	const dateStr = dateRDV.toLocaleDateString('fr-FR', { 
		weekday: 'long', 
		year: 'numeric', 
		month: 'long', 
		day: 'numeric' 
	});

	// Format de l'heure (heures et minutes, avec 2 chiffres)
	const timeStr = dateRDV.toLocaleTimeString('fr-FR', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false // format 24h
	});

	// Assemblage final avec "Le" et "à"
	const affichageDateRDV = `Le ${dateStr} à ${timeStr}`;

	document.getElementById('view-seance-prochainRDV').textContent = affichageDateRDV;
	} else {
	document.getElementById('view-seance-prochainRDV').textContent = ''; // ou message d'erreur
	}
	
	if(seance.prochainRDVtype){
		if (isValidDateRDV){ document.getElementById('view-seance-prochainRDV').textContent += ' ' + seance.prochainRDVtype.toLowerCase(); }
		else { document.getElementById('view-seance-prochainRDV').textContent += seance.prochainRDVtype; }
	}
	
	if(!seance.prochainRDVtype && !isValidDateRDV) document.getElementById('view-seance-prochainRDV').textContent = '\n' ;

    showSeanceViewMode();
}

function showSeanceViewMode() {
    document.getElementById('seance-view').classList.remove('hidden');
    document.getElementById('seance-edit').classList.add('hidden');
    document.getElementById('btn-edit-seance').textContent = '✏️ Modifier';
}

function toggleEditSeance() {
    const isEditing = !document.getElementById('seance-edit').classList.contains('hidden');
    
    if (isEditing) {
		saveSeanceEdit();
        showSeanceViewMode();
    } else {
        const client = clients.find(c => c.id === selectedClientId);
        if (!client) return;

        const seance = client.protocole.find(s => s.id === currentSeanceId);
        if (!seance) return;

        document.getElementById('seance-view').classList.add('hidden');
        document.getElementById('seance-edit').classList.remove('hidden');
        document.getElementById('btn-edit-seance').textContent = '👁️ Visualiser';

        document.getElementById('seance-date').value = seance.date;
        document.getElementById('seance-anamnese').value = seance.anamnese || '';
        document.getElementById('seance-phenodescription').value = seance.phenodescription || '';
		document.getElementById('seance-entrainement').value = seance.entrainement || '';
		document.getElementById('seance-prochainRDV').value = seance.prochainRDV;
		document.getElementById('prochainRDV-type').value = seance.prochainRDVtype || '';
        
        setTimeout(autoResizeAllTextareas, 0);
    }
}

function cancelEditSeance() {
    showSeanceViewMode();
}

function saveSeanceEdit() {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    const seance = client.protocole.find(s => s.id === currentSeanceId);
    if (!seance) return;

    seance.date = document.getElementById('seance-date').value;
    seance.anamnese = document.getElementById('seance-anamnese').value;
    seance.phenodescription = document.getElementById('seance-phenodescription').value;
	seance.entrainement = document.getElementById('seance-entrainement').value;
	seance.prochainRDV = document.getElementById('seance-prochainRDV').value;
	seance.prochainRDVtype = document.getElementById('prochainRDV-type').value;

    saveData();
    viewSeance(currentSeanceId);
    showNotification('Séance enregistrée avec succès ! ✅','success');
}

function backToSeancesList() {
    currentSeanceId = null;
    loadSeances();
}

function printSeance() {
    if (!document.getElementById('seance-view').classList.contains('hidden')) {
        window.print();
    } else {
        showNotification('Veuillez passer en mode visualisation avant d\'imprimer ⚠️','information');
    }
}

// ==================== GESTION DES PARAMÈTRES EXERCICES ET SOPHRONISATIONS ====================

function renderParametres() {
    loadData();
	
	//affichage date dernière modif dans lastModified-viewer
	const dateModif = new Date(lastModified);
	const isValidDateModif = !isNaN(dateModif.getTime());

	if (isValidDateModif) {
	// Format de la date (jour de la semaine, jour, mois, année)
	const dateStr = dateModif.toLocaleDateString('fr-FR', { 
		weekday: 'long', 
		year: 'numeric', 
		month: 'long', 
		day: 'numeric' 
	});

	// Format de l'heure (heures et minutes, avec 2 chiffres)
	const timeStr = dateModif.toLocaleTimeString('fr-FR', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false // format 24h
	});

	// Assemblage final avec "Le" et "à"
	const affichageDateModif = `Le ${dateStr} à ${timeStr}`;

	document.getElementById('lastModified-viewer').textContent = affichageDateModif;
	} else {
	document.getElementById('lastModified-viewer').textContent = ''; 
	}
	
	
	
	if (document.getElementById('factures-path')){
        document.getElementById('factures-path').textContent = parametres.facturesfolder || 'Aucun';
    }
	
	if (document.getElementById('placeholder-facture-info1-name')){
        document.getElementById('placeholder-facture-info1-name').value = parametres.placeholderInfo1 || '';
    }

	if (document.getElementById('placeholder-facture-info2-name')){
        document.getElementById('placeholder-facture-info2-name').value = parametres.placeholderInfo2 || '';
    }

    const sophroContainer = document.getElementById('sophronisations-param-list');
    if (sophroContainer) {
        // Créer une copie triée sans modifier l'original
        const sortedSophronisations = [...parametres.sophronisations].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
        sophroContainer.innerHTML = sortedSophronisations.length > 0
            ? sortedSophronisations.map((s) => {
                // Trouver l'indice réel dans le tableau original pour la suppression
                const index = parametres.sophronisations.indexOf(s);
                return `
                    <div class="list-item">
                        <span>${s}</span>
                        <button class="btn btn-danger btn-small" onclick="deleteSophronisationParam(${index})">🗑️</button>
                    </div>
                `;
            }).join('')
            : '<div class="empty-state"><p>Aucune sophronisation</p></div>';
    }

    const exercicesContainer = document.getElementById('exercices-param-list');
    if (exercicesContainer) {
        const sortedExercices = [...parametres.exercices].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
        exercicesContainer.innerHTML = sortedExercices.length > 0
            ? sortedExercices.map((e) => {
                const index = parametres.exercices.indexOf(e);
                return `
                    <div class="list-item">
                        <span>${e}</span>
                        <button class="btn btn-danger btn-small" onclick="deleteExerciceParam(${index})">🗑️</button>
                    </div>
                `;
            }).join('')
            : '<div class="empty-state"><p>Aucun exercice</p></div>';
    }
}
function addSophronisationParam() {
    const input = document.getElementById('new-sophronisation-param');
    const value = input.value.trim();
    
    if (!value) {
    showNotification('Veuillez entrer un nom de sophronisation ⚠️', 'information');
    return;
	}


    parametres.sophronisations.push(value);
    saveData();
    input.value = '';
    renderParametres();
}

async function deleteSophronisationParam(index) {
	const nomSophro = parametres.sophronisations[index];
	const confirmed = await showConfirmDialog(`Êtes-vous sûr(e) de vouloir supprimer la sophronisation "${nomSophro}" ?`);
    if (!confirmed) return;
    parametres.sophronisations.splice(index, 1);
    saveData();
    renderParametres();
}

function addExerciceParam() {
    const input = document.getElementById('new-exercice-param');
    const value = input.value.trim();
    
    if (!value) {
    showNotification('Veuillez entrer un nom d\'exercice ⚠️️', 'information');
    return;
	}


    parametres.exercices.push(value);
    saveData();
    input.value = '';
    renderParametres();
}

async function deleteExerciceParam(index) {
	const nomExercice = parametres.exercices[index];
	const confirmed = await showConfirmDialog(`Êtes-vous sûr(e) de vouloir supprimer l'exercice "${nomExercice}" ?`);
    if (!confirmed) return;
    parametres.exercices.splice(index, 1);
    saveData();
    renderParametres();
}


// ================== GESTION DES PARAMETRES GLOBAUX =====================
function showParametresWindow() {
    // Créer l’overlay
    const overlay = document.createElement('div');
    overlay.className = 'param-overlay';

    // Créer la fenêtre
    const windowBox = document.createElement('div');
    windowBox.className = 'param-window';

    // Contenu HTML de ta fenêtre
    windowBox.innerHTML = `
	<button class="param-close">&times;</button>

	<div class="param-container">

    <!-- Sidebar -->
    <div class="param-sidebar">
        <div class="sidebar-item active" data-target="tab-sophro">Sophronisations</div>
        <div class="sidebar-item" data-target="tab-exo">Exercices</div>
        <div class="sidebar-item" data-target="tab-data">Données</div>
        <div class="sidebar-item" data-target="tab-factures">Factures</div>
        <div class="sidebar-item" data-target="tab-infos">Informations</div>
    </div>

    <!-- Contenu -->
    <div class="param-content">

        <div class="tab-content active" id="tab-sophro">
            <h2>Sophronisations</h2>
			</br>
            <!-- ▼▼ ICI ton contenu sophro ▼▼ -->
			<div class="input-group">
				<input type="text" id="new-sophronisation-param" placeholder="Ajouter une sophronisation">
				<button class="btn btn-primary" onclick="addSophronisationParam()">Ajouter</button>
			</div>

			<div id="sophronisations-param-list"></div>
        </div>

        <div class="tab-content" id="tab-exo">
            <h2>Exercices</h2>
			</br>
            <!-- ▼▼ ICI ton contenu exercices ▼▼ -->
			<div class="input-group">
				<input type="text" id="new-exercice-param" placeholder="Ajouter un exercice">
				<button class="btn btn-primary" onclick="addExerciceParam()">Ajouter</button>
			</div>

			<div id="exercices-param-list"></div>
        </div>

        <div class="tab-content" id="tab-data">
            <h2>Données</h2>
			</br></br></br></br>
            <!-- Import/export database -->
			<div style="text-align: center" >
			<button onclick="openDataFolder()" class="btn btn-neutral">📂 Ouvrir le dossier des données (APPDATA)</button>
			</br></br>
			<button class="btn btn-neutral" onclick="exportData()">📤 Exporter la base de données (fichier json)</button>
			</br></br>
			<button class="btn btn-neutral" onclick="document.getElementById('importFile').click()">📥 Importer une base de données (fichier json)</button>
			</br></br>
			<input type="file" id="importFile" accept=".json" style="display: none;" onchange="importData(event)">
			<button class="btn btn-danger" onclick="resetDatabase()">❌ Réinitialiser la base</button>
			</div>
        </div>

        <div class="tab-content" id="tab-factures" >
            <h2>Factures</h2>
			<!-- Paramètres factures -->
			</br></br>
			<div style="text-align: center">
			<button class="btn btn-neutral" onclick="choisirDossierFactures()" style="text-align: center">📁 Choisir dossier des factures</button>
			</br></br>
			<p><strong>Dossier actuel :</strong> <span id="factures-path" style="text-align: center">Aucun</span></p>
			</br></br>
			<p>Renseignez ci-dessous les noms d'informations que vous souhaitez remplir pour chaque facture</p>
			<br>
			<p>(Exemple : date, n° de la facture...)</p>
			<input type="text" id="placeholder-facture-info1-name" onchange="changePlaceholderInfo1(this.value)" ></input>
			<input type="text" id="placeholder-facture-info2-name" onchange="changePlaceholderInfo2(this.value)" ></input>
			</div>
        </div>

        <div class="tab-content" id="tab-infos">
		<h2 style="text-align:center; margin-bottom: 20px;">Informations</h2>

		<div style="text-align: center; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <p><strong>Version de l'application :</strong> 1.2.0</p>

        <p><strong>Guide d'utilisation :</strong><br>
			<a href="#" onclick="window.api.openGuidePdf()">Ouvrir le guide d'utilisation <strong>↗</strong></a>
		</p>

        <p><strong>Support & Contact :</strong><br>
            <a href="mailto:gestion.sophrologie@gmail.com">gestion.sophrologie@gmail.com</a>
        </p>

        <p><strong>Développé par :</strong><br>
            Esteban Dieudonné
        </p>

        <p><strong>Technologie :</strong><br>
            Basé sur Electron
        </p>

        <p><strong>Données :</strong><br>
            Stockage local dans APPDATA<br>
            Aucune donnée envoyée en ligne<br>
		</p>
		<p><strong>Dernière modification :</strong><br>
			<div id="lastModified-viewer"></div>
        </p>
		<hr>
        <p>© 2026 Esteban Dieudonné - Gestion Sophrologie. Tous droits réservés.</p>
		</div>
		</div>

    </div>
</div>
    `;
		
	// Logique des onglets
	const sidebarItems = windowBox.querySelectorAll(".sidebar-item");
	const tabs = windowBox.querySelectorAll(".tab-content");

	sidebarItems.forEach(item => {
    item.onclick = () => {
        // Reset
        sidebarItems.forEach(i => i.classList.remove("active"));
        tabs.forEach(t => t.classList.remove("active"));

        // Active sélection
        item.classList.add("active");
        const target = item.getAttribute("data-target");
        windowBox.querySelector("#" + target).classList.add("active");
		};
	});

	overlay.appendChild(windowBox);
    document.body.appendChild(overlay);
	
    renderParametres();
	
    // Clique pour fermer
    overlay.querySelector('.param-close').onclick = () => {
        overlay.remove();
    };

    // Clique en dehors de la fenêtre pour fermer
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
}

//fonction ouvrir dossier de sauvegarde data
function openDataFolder() {
    window.electron.invoke("open-data-folder");
}

function changePlaceholderInfo1(value) {
    parametres.placeholderInfo1 = value;
    saveData();
}

function changePlaceholderInfo2(value) {
    parametres.placeholderInfo2 = value;
    saveData();
}

//================== GESTION DES FACTURES ======================
function loadFactures() {	
	const client = clients.find(c => c.id === selectedClientId);
	if (!client) return;

	const facturesClient = client.factures || [];

	/*// Nettoyage des chemins corrompus (backslashes -> slashes, suppression ctrl chars)
	facturesClient = facturesClient.map(f => ({
    ...f,
    chemin: f.chemin
        .replace(/\\/g, "/")          // remplacer les \ normaux
        .replace(/[\x00-\x1F]/g, "")   // enlever les caractères de contrôle invisibles (\f, \n, etc.)
	}));
	*/
	chargerFactures()

	document.getElementById('factures-info').textContent = `Client : ${client.prenom} ${client.nom}`;
	renderFactures();
}

async function renderFactures() {
	const container = document.getElementById("factures-lists");
	if (!container) return;

	const client = clients.find(c => c.id === selectedClientId);
	if (!client) return;
	
	facturesClient = client.factures || [];
	
	if (facturesClient.length === 0 && parametres.facturesfolder) {
		container.innerHTML = `<div class="empty-state"><p>Aucune facture enregistrée !</p></div>`;
		return;
	}
	
	if (!parametres.facturesfolder) { 
		container.innerHTML = `<div class="empty-state"><p>Aucun dossier pour les factures n'a été selectionné<br>
		<br>Allez dans <strong>⚙️</strong> (paramètres),
		<br>puis dans l'onglet <strong>Factures</strong>,
		<br>puis <strong>📁 Choisir le dossier pour les factures</strong>
		<br>et <strong>↻ Actualiser</strong>
		</p></div>`;
		return;
	};

	container.innerHTML = facturesClient.map((f, i) => {
    const client = clients.find(c => c.id === selectedClientId);
    
    // Générer options pour les séances
    const optionsSeances = client.protocole.map(s => 
    `<option value="${s.num}" ${f.seance === String(s.num) ? "selected" : ""}>Séance ${s.num}</option>`
	).join("");

    return `
    <div class="facture-row">
        <div>${f.nom}</div>
		
		<input type="text" placeholder="${parametres.placeholderInfo1 || ''}" id="factures-info1" class="auto-resize" 
			value="${f.info1 || ''}" onchange="changeFactureInfo1(${i}, this.value)">
		<input type="text" placeholder="${parametres.placeholderInfo2 || ''}" id="factures-info2" class="auto-resize" 
			value="${f.info2 || ''}" onchange="changeFactureInfo2(${i}, this.value)">
		<input type="number" placeholder="prix" id="factures-prix" class="note-group" 
			value="${f.prix || ''}" onchange="changeFacturePrix(${i}, this.value)">

        <select onchange="changeFacturePaiement(${i}, this.value)">
            <option value="non-payé" ${f.paiement === "non-payé" ? "selected" : ""}>Non payé</option>
            <option value="payé" ${f.paiement === "payé" ? "selected" : ""}>Payé</option>
            <option value="carte" ${f.paiement === "carte" ? "selected" : ""}>Carte</option>
            <option value="chèque" ${f.paiement === "chèque" ? "selected" : ""}>Chèque</option>
            <option value="espèces" ${f.paiement === "espèces" ? "selected" : ""}>Espèces</option>
            <option value="virement" ${f.paiement === "virement" ? "selected" : ""}>Virement</option>
        </select>

        <select onchange="changeFactureSeance(${i}, this.value)">
            <option value="">Sélectionner une séance</option>
            ${optionsSeances}
        </select>

        <button onclick="openFactureInApp('${f.chemin}', ${i})">📂 Ouvrir</button>
    </div>
    `;
	}).join("");
}

async function chargerFactures() {
	let facturesClient = await getClientFactures();
	console.log('Factures trouvées :', facturesClient);
	
	facturesClient = formaterFactures(facturesClient);
}

function formaterFactures(factures) {
	const client = clients.find(c => c.id === selectedClientId);
	if (!client) {
	showNotification("Client introuvable", "error");
	return;
	}
	
	if (!parametres.facturesfolder) { return };
	
	if (!client.factures) client.factures = [];
	
	for (let i = 0; i < factures.length; i++) {
		const facture = factures[i];

		console.log(facture);
		// 🔥 FIX CHEMIN : convertir les backslashes en slashes
		const fixedPath = facture.replace(/\\/g, "/");
		if (factureExiste(client, fixedPath)) {
			console.log("La facture est déjà présente.");
		} else {
			console.log("La facture n'est pas encore enregistrée.");
			const fileName = facture.split(/[/\\]/).pop(); // récupère le nom du fichier
			
			client.factures.push({
				id: "FAC-" + Date.now(),
				nom: fileName,
				chemin: facture.replace(/\\/g, "/"),
				paiement: "non-payé",
				seance: "",
				info1: "",
				info2: "",
				prix:"",
				clientId: selectedClientId
			});
		}
	}
	
	const cheminsValides = factures.map(chemin => chemin.replace(/\\/g, '/').toLowerCase());

	client.factures = client.factures.filter(facture => {
		const cheminFacture = facture.chemin.replace(/\\/g, '/').toLowerCase();
		return cheminsValides.includes(cheminFacture);
	});
	
    saveData();
    renderFactures();
};

function factureExiste(client, cheminRecherche) {
	if (!client.factures) return false;

	return client.factures.some(facture => facture.chemin === cheminRecherche);
}

/*
async function deleteFacture(index) {
	const confirmed = await showConfirmDialog('Supprimer cette facture définitivement ?');
    if (!confirmed) return;
	
	const client = clients.find(c => c.id === selectedClientId);
	if (!client || !client.factures || !client.factures[index]) return;
	
	client.factures.splice(index, 1);
	saveData();
	renderFactures();
}*/

function changeFacturePaiement(index, value) {
	const client = clients.find(c => c.id === selectedClientId);
	if (!client || !client.factures || !client.factures[index]) return;

	client.factures[index].paiement = value;
	saveData();
}

function changeFactureSeance(index, value) {
	const client = clients.find(c => c.id === selectedClientId);
	if (!client || !client.factures || !client.factures[index]) return;

    client.factures[index].seance = value;
    saveData();
}

function changeFactureInfo1(index, value) {
	const client = clients.find(c => c.id === selectedClientId);
	if (!client || !client.factures || !client.factures[index]) return;

    client.factures[index].info1 = value;
    saveData();
}

function changeFactureInfo2(index, value) {
	const client = clients.find(c => c.id === selectedClientId);
	if (!client || !client.factures || !client.factures[index]) return;

    client.factures[index].info2 = value;
    saveData();
}

function changeFacturePrix(index, value) {
	const client = clients.find(c => c.id === selectedClientId);
	if (!client || !client.factures || !client.factures[index]) return;

    client.factures[index].prix = value;
    saveData();
}


async function openFactureInApp(chemin, index) {
	const result = await window.api.openPdfInApp(chemin);
	
	if (result.status === "error") {
        showNotification('Facture introuvable ⚠️','error');
		deleteFacture(index);
        return;
    }
    console.log("Ouverture PDF interne :", chemin);
    }

async function choisirDossierFactures() {
	const dirFacPath = await window.api.selectDossier();
	console.log(dirFacPath);
	if (dirFacPath === null) { return };
	parametres.facturesfolder = dirFacPath;
	document.getElementById('factures-path').textContent = parametres.facturesfolder || 'Aucun';
	saveData();
}

async function getClientFactures() {
	const client = clients.find(c => c.id === selectedClientId);
	if (!parametres.facturesfolder) {
		document.getElementById('factures-lists').textContent = `<div class="empty-state"><p>Aucun dossier pour les factures n'a été selectionné<br>
		<br>Allez dans <strong>⚙️</strong> (paramètres),
		<br>puis dans l'onglet <strong>Factures</strong>,
		<br>puis <strong>📁 Choisir le dossier pour les factures</strong>
		<br>et <strong>↻ Actualiser</strong>
		</p></div>`;
		renderFactures();
		return;
	}
	const factures = await window.api.getClientFactures({
		clientName: client.prenom + ' ' + client.nom,
		facturesFolder: parametres.facturesfolder,
	});
	return factures
}

// ==================== EXPORT / IMPORT / SUPPRESSION JSON ====================
function getCurrentDateTimeString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Mois de 0 à 11, donc +1
  const day = String(now.getDate()).padStart(2, '0');

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

function exportData() {
    // Prépare les données à exporter
    const dataToExport = {
        clients: clients,
        parametres: parametres
    };

    // Convertit en JSON
    const jsonStr = JSON.stringify(dataToExport, null, 2); // indent 2 pour lisibilité

    // Crée un blob pour téléchargement
    const blob = new Blob([jsonStr], { type: "application/json" });

    // Crée un lien temporaire
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export_${getCurrentDateTimeString()}.json`; // nom par défaut du fichier
    document.body.appendChild(a);
    a.click(); // déclenche le téléchargement
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // libère la ressource
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

	const confirmed = await showConfirmDialog('Attention : êtes-vous sûr(e) de vouloir remplacer toutes les données actuelles par celles importées ?');
    if (!confirmed) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);

            // Vérifie et remplace les données actuelles
            if (importedData.clients) clients = importedData.clients;
            if (importedData.parametres) parametres = importedData.parametres;

            // Ici tu peux éventuellement rafraîchir l'affichage
            console.log("Import réussi :", importedData);
			saveData();
			showNotification("Import réussi ! ✅",'success');
			setTimeout(() => {
				location.reload();
			}, 1000);
        } catch (err) {
            console.error("Erreur lors de l'import JSON :", err);
            showNotification("Le fichier JSON est invalide ! ⚠️️",'information');
        }
    };
    reader.readAsText(file);
}

async function resetDatabase() {
    const confirmed = await showConfirmDialog('Attention : êtes-vous sûr(e) de vouloir supprimer toutes les données actuelles ?');
    if (!confirmed) return;

    // Réinitialisation des données
    clients = [];
    parametres = {
		"exercices": [],
		"sophronisations": [],
	};

    saveData(); // Sauvegarde les données vides

    showNotification("Toutes les données ont été supprimées avec succès ! ✅", 'success');

    setTimeout(() => {
        location.reload();
    }, 1000);
}
window.resetDatabase = resetDatabase;

//============================== FONCTIONS D'UI ================================

function showNotification(message, type = 'info') {
    // Crée ou réutilise un conteneur de notifications
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
		container.classList.add('no-print');
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }

    // Crée la notification
    const notif = document.createElement('div');
    notif.textContent = message;
    notif.style.padding = '10px 16px';
    notif.style.marginTop = '10px';
    notif.style.borderRadius = '8px';
    notif.style.color = '#fff';
    notif.style.fontWeight = 'bold';
    notif.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    notif.style.transition = 'opacity 0.5s ease';

    // Couleur selon le type
    if (type === 'success') notif.style.backgroundColor = '#28a745';
	else if (type === 'information') notif.style.backgroundColor = '#606060';
    else if (type === 'error') notif.style.backgroundColor = '#dc3545';
    else notif.style.backgroundColor = '#007bff';

    container.appendChild(notif);

    // Disparaît après 4 secondes
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 500);
    }, 4000);
}

function showConfirmDialog(message, confirmText = "Confirmer", cancelText = "Annuler") {
    return new Promise((resolve) => {
        // Crée la boîte de confirmation
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm-box">
                <p>${message}</p>
                <div class="confirm-buttons">
                    <button class="btn-confirm">${confirmText}</button>
                    <button class="btn-cancel">${cancelText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Gestion des clics
        overlay.querySelector('.btn-confirm').onclick = () => {
            overlay.remove();
            resolve(true);
        };
        overlay.querySelector('.btn-cancel').onclick = () => {
            overlay.remove();
            resolve(false);
        };
    });
}


//vérifie 0<=note<=5
document.addEventListener('DOMContentLoaded', () => {
  const inputs = document.querySelectorAll('.note-group');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      let value = parseFloat(input.value);
      if (isNaN(value)) return;

      if (value < 0) input.value = 0;
      else if (value > 5) input.value = 5;
    });
  });
});