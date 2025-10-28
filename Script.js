// --- VARIABLES GLOBALES ---
let joueurs = []; // { id, nom, couleur, scoreTotal, scoresTour, scoreRelatifPivot, rang }
let partieId = null; // ID de la partie dans Firebase
let joueurId = null; // ID unique du joueur actuel
let createurId = null; // ID du créateur de la partie
let unsubscribePartie = null; // Pour arrêter d'écouter les mises à jour Firebase

let scoresSecrets = false;
let mancheActuelle = 0;
let lowScoreWins = true;
let monGraphique = null;
let classementFinal = [];

let sequenceForceStop = false;
let currentStepSkipper = null;

let conditionsArret = {
    score_limite: { active: false, valeur: 0 },
    score_relatif: { active: false, valeur: 0 },
    manche_total: { active: false, mancheCible: 0 },
    manche_restante: { active: false, mancheCible: 0 }
};

const inputIdMap = {
    'score_limite': 'score-limite',
    'score_relatif': 'score-relatif',
    'manche_total': 'nb-manches-total',
    'manche_restante': 'nb-manches-restantes'
};

// --- SÉLECTION DES ÉLÉMENTS HTML ---
// Anciens écrans
const configEcran = document.getElementById('configuration-ecran');
const scoreEcran = document.getElementById('score-ecran');
const revealEcran = document.getElementById('reveal-ecran');
const podiumEcran = document.getElementById('podium-ecran');

// Nouveaux éléments du Lobby (Configuration)
const nomCreateurInput = document.getElementById('nom-createur');
const couleurCreateurInput = document.getElementById('couleur-createur');
const creerPartieBtn = document.getElementById('creer-partie-btn');
const codePartieAffichage = document.getElementById('code-partie-affichage');
const codePartieSpan = document.getElementById('code-partie');
const copierCodeBtn = document.getElementById('copier-code-btn');
const attenteJoueursMsg = document.getElementById('attente-joueurs-msg');
const codePartieInput = document.getElementById('code-partie-input');
const nomRejoindreInput = document.getElementById('nom-rejoindre');
const couleurRejoindreInput = document.getElementById('couleur-rejoindre');
const rejoindrePartieBtn = document.getElementById('rejoindre-partie-btn');
const rejoindreErreurMsg = document.getElementById('rejoindre-erreur');
const lobbyJoueursDiv = document.getElementById('lobby-joueurs');
const listeJoueursLobbyDiv = document.getElementById('liste-joueurs-lobby');
const optionsCreateurDiv = document.getElementById('options-createur');
const lancerPartieBtn = document.getElementById('lancer-partie-btn');
const attenteLancementMsg = document.getElementById('attente-lancement-msg');

// Éléments des autres écrans
const listeJoueursConf = document.getElementById('liste-joueurs-conf');
const scoreAffichageDiv = document.getElementById('score-affichage');
const saisiePointsDiv = document.getElementById('saisie-points');
const validerTourBouton = document.getElementById('valider-tour');
const modeSecretConfig = document.getElementById('mode-secret-config');
const conditionVictoireRadios = document.querySelectorAll('input[name="condition-victoire"]');
const arreterMaintenantBouton = document.getElementById('arreter-maintenant');
const canvasGraphique = document.getElementById('graphique-scores');
const revealContent = document.getElementById('reveal-content');
const revealRang = document.getElementById('reveal-rang');
const revealNom = document.getElementById('reveal-nom');
const revealScore = document.getElementById('reveal-score');
const skipAllBtn = document.getElementById('skip-all-btn');
const manchesPasseesAffichage = document.getElementById('manches-passees');
const manchesRestantesAffichageDiv = document.getElementById('manches-restantes-affichage');
const manchesRestantesAffichage = document.getElementById('manches-restantes');
const pointsRestantsAffichageDiv = document.getElementById('points-restants-affichage');
const pointsRestantsAffichage = document.getElementById('points-restants');
const conditionCheckboxes = document.querySelectorAll('.condition-checkbox');
const scoreLimiteInput = document.getElementById('score-limite');
const scoreRelatifInput = document.getElementById('score-relatif');
const nbManchesTotalInput = document.getElementById('nb-manches-total');
const nbManchesRestantesInput = document.getElementById('nb-manches-restantes');


// --- FONCTIONS FIREBASE ---

function genererCodePartie() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * ▼▼▼ MODIFIÉ : Alertes retirées ▼▼▼
 */
async function creerPartie() {
    const nom = nomCreateurInput.value.trim();
    const couleur = couleurCreateurInput.value;
    if (!nom) {
        alert("Veuillez entrer votre nom.");
        return;
    }

    creerPartieBtn.disabled = true;
    const nouveauCode = genererCodePartie();
    partieId = nouveauCode;
    joueurId = db.collection('parties').doc().id; // Génère ID joueur
    createurId = joueurId;

    const nouveauJoueur = {
        id: joueurId,
        nom: nom,
        couleur: couleur,
        scoreTotal: 0,
        scoresTour: [],
        estCreateur: true
    };

    try {
        await db.collection('parties').doc(partieId).set({
            code: partieId,
            createurId: createurId,
            joueurs: [nouveauJoueur],
            etatPartie: 'lobby',
            mancheActuelle: 0,
            scoresSecrets: false,
            lowScoreWins: true,
            conditionsArret: conditionsArret,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Affiche le code et cache les options
        codePartieSpan.textContent = partieId;
        codePartieAffichage.classList.remove('cache'); // Rend le <p> visible
        attenteJoueursMsg.classList.remove('cache');
        // Cache les sections "Créer" (déjà fait implicitement) et "Rejoindre"
        document.querySelector('.lobby-section:nth-child(2)').classList.add('cache');
         // Masque juste le bouton "Créer" au lieu de toute la section, garde le nom/couleur visible
        creerPartieBtn.classList.add('cache');
        nomCreateurInput.disabled = true;
        couleurCreateurInput.disabled = true;

        ecouterPartie(partieId);

    } catch (error) {
        // Alerte en cas d'erreur Firebase
        alert("ERREUR Firebase lors de la création : " + error.message);
        console.error("Erreur lors de la création de la partie:", error);
        alert("Impossible de créer la partie. Vérifiez votre connexion ou réessayez."); // Message générique
        creerPartieBtn.disabled = false; // Réactive le bouton
        partieId = null;
        joueurId = null;
        createurId = null;
    }
}
// ▲▲▲ FIN MODIFICATION ▲▲▲


/**
 * ▼▼▼ MODIFIÉ : Message d'erreur plus précis ▼▼▼
 */
async function rejoindrePartie() {
    const code = codePartieInput.value.trim().toUpperCase();
    const nom = nomRejoindreInput.value.trim();
    const couleur = couleurRejoindreInput.value;

    if (!code || !nom) {
        rejoindreErreurMsg.textContent = "Veuillez entrer le code et votre nom.";
        rejoindreErreurMsg.classList.remove('cache');
        return;
    }
    rejoindreErreurMsg.classList.add('cache');
    rejoindrePartieBtn.disabled = true;

    const partieRef = db.collection('parties').doc(code);

    try {
        const doc = await partieRef.get();

        if (!doc.exists) {
            rejoindreErreurMsg.textContent = "Code de partie invalide.";
            rejoindreErreurMsg.classList.remove('cache');
            rejoindrePartieBtn.disabled = false;
            return;
        }

        const partieData = doc.data();

        if (partieData.joueurs && partieData.joueurs.some(j => j.nom === nom)) {
             rejoindreErreurMsg.textContent = `Le nom "${nom}" est déjà pris dans cette partie.`;
             rejoindreErreurMsg.classList.remove('cache');
             rejoindrePartieBtn.disabled = false;
             return;
        }

        if (partieData.etatPartie !== 'lobby') {
             rejoindreErreurMsg.textContent = "Cette partie a déjà commencé ou est terminée.";
             rejoindreErreurMsg.classList.remove('cache');
             rejoindrePartieBtn.disabled = false;
             return;
        }

        partieId = code;
        joueurId = db.collection('parties').doc().id; // Génère ID unique pour ce joueur

        const nouveauJoueur = {
            id: joueurId,
            nom: nom,
            couleur: couleur,
            scoreTotal: 0,
            scoresTour: [],
            estCreateur: false
        };

        // Ajoute le nouveau joueur à la liste des joueurs dans Firestore
        await partieRef.update({
            joueurs: firebase.firestore.FieldValue.arrayUnion(nouveauJoueur)
        });

        // Cache les options de création/rejoindre APRES succès de l'update
        document.querySelector('.lobby-section:nth-child(1)').classList.add('cache'); // Cache "Créer"
        document.querySelector('.lobby-section:nth-child(2)').classList.add('cache'); // Cache "Rejoindre"

        // Commence à écouter les changements sur CETTE partie APRES succès de l'update
        ecouterPartie(partieId);
        // Si on arrive ici, tout s'est bien passé, l'écouteur va gérer l'affichage du lobby

    } catch (error) {
        console.error("Erreur pour rejoindre la partie:", error);
        // ▼▼▼ Message d'erreur plus précis ▼▼▼
        rejoindreErreurMsg.textContent = `Impossible de rejoindre: ${error.message || "Vérifiez code/connexion"}`;
        // ▲▲▲ Fin Modification ▲▲▲
        rejoindreErreurMsg.classList.remove('cache');
        rejoindrePartieBtn.disabled = false;
        partieId = null;
        joueurId = null;
    }
}
// ▲▲▲ FIN MODIFICATION ▲▲▲

// (Fonction ecouterPartie - Inchangée)
function ecouterPartie(codePartie) { /* ... (inchangé) ... */ }
// (Fonction mettreAJourUI - Inchangée)
function mettreAJourUI(etatPartie) { /* ... (inchangé) ... */ }
// (Fonction afficherLobbyJoueurs - Inchangée)
function afficherLobbyJoueurs() { /* ... (inchangé) ... */ }
// (Fonction lancerPartie - Inchangée)
async function lancerPartie() { /* ... (inchangé) ... */ }
// (Fonction validerTourFirebase - Inchangée, correction précédente ok)
async function validerTourFirebase() { /* ... (inchangé) ... */ }
// (Fonction terminerPartieFirebase - Inchangée)
async function terminerPartieFirebase() { /* ... (inchangé) ... */ }


// --- ANCIENNES FONCTIONS ADAPTÉES ---
// (Fonction calculerRangs - Inchangée)
function calculerRangs(joueursTries) { /* ... (inchangé) ... */ }
// (Fonction construirePodiumFinal - Inchangée)
function construirePodiumFinal() { /* ... (inchangé) ... */ }
// (Fonction majContenuReveal - Inchangée)
function majContenuReveal(rang, joueur, estExAequoPrecedent) { /* ... (inchangé) ... */ }
// (Fonction demarrerSequenceReveal - Inchangée)
async function demarrerSequenceReveal() { /* ... (inchangé) ... */ }
// (Fonction terminerPartieLogiqueLocale - Renommée/Adaptée, appelée par mettreAJourUI ou terminerPartie)
// Note: La reconstruction graphique de terminerPartie originale est mieux gérée ici
function logiqueFinDePartie() {
    sequenceForceStop = false;
    validerTourBouton.disabled = true; // Désactive les boutons au cas où
    arreterMaintenantBouton.disabled = true;

    const graphContainer = document.querySelector('.graphique-container');
    if (graphContainer) {
        graphContainer.classList.remove('cache');
    }

     // --- Calculer le classement final localement ---
    let joueursTries = [...joueurs].sort((a, b) => {
        return lowScoreWins ? a.scoreTotal - b.scoreTotal : b.scoreTotal - a.scoreTotal;
    });
    classementFinal = calculerRangs(joueursTries);

    // --- Gérer le cas secret (reconstruction graphique) ---
    // Utilise la variable globale 'scoresSecrets' mise à jour par onSnapshot
    if (scoresSecrets) {
        // Met à jour l'affichage maintenant que scoresSecrets est (théoriquement) false
         mettreAJourScoresAffichage(); // Met à jour avec scores révélés et rangs

        if (monGraphique) {
            // (Code de reconstruction du graphique - inchangé)
            monGraphique.data.labels = ['Manche 0'];
            monGraphique.data.datasets.forEach(dataset => { dataset.data = [0]; });
            let scoreCumules = new Array(joueurs.length).fill(0);
            for (let i = 0; i < mancheActuelle; i++) {
                 if(monGraphique.data.labels.length <= i + 1) { monGraphique.data.labels.push(`Manche ${i + 1}`); }
                joueurs.forEach((joueur, index) => {
                    const scoreDeCeTour = joueur.scoresTour[i] || 0;
                    scoreCumules[index] += scoreDeCeTour;
                     monGraphique.data.datasets[index].data[i+1] = scoreCumules[index];
                });
            }
             const maxDataLength = Math.max(...monGraphique.data.datasets.map(d => d.data.length));
             while(monGraphique.data.labels.length < maxDataLength) { monGraphique.data.labels.push(`Manche ${monGraphique.data.labels.length}`); }
            monGraphique.update();
            monGraphique.resize();
        }

        alert("FIN DE PARTIE : Les scores secrets sont révélés !");
        setTimeout(demarrerSequenceReveal, 100);
    } else {
        mettreAJourScoresAffichage(); // Met à jour avec les rangs
        demarrerSequenceReveal();
    }
}


// --- FONCTIONS GRAPHIQUE ---
// (Fonction genererCouleurAleatoire - Inchangée)
function genererCouleurAleatoire() { /* ... (inchangé) ... */ }
// (Fonction creerGraphique - Inchangée, correction précédente ok)
function creerGraphique() { /* ... (inchangé) ... */ }
// (Fonction mettreAJourGraphique - Inchangée, correction précédente ok)
function mettreAJourGraphique() { /* ... (inchangé) ... */ }


// --- GESTION DES ÉVÉNEMENTS ---
// Nouveaux événements pour le Lobby
creerPartieBtn.addEventListener('click', creerPartie);
rejoindrePartieBtn.addEventListener('click', rejoindrePartie);
lancerPartieBtn.addEventListener('click', lancerPartie);
copierCodeBtn.addEventListener('click', () => { /* ... (inchangé) ... */ });

// Événements existants (adaptés)
validerTourBouton.addEventListener('click', validerTourFirebase);
arreterMaintenantBouton.addEventListener('click', terminerPartieFirebase);

// (Événements Skip - Inchangés)
revealEcran.addEventListener('click', (e) => { /* ... (inchangé) ... */ });
skipAllBtn.addEventListener('click', () => { /* ... (inchangé) ... */ });

// (Gestion des checkboxes de condition - OK mais l'effet sera via Firebase)
conditionCheckboxes.forEach(checkbox => { /* ... (inchangé) ... */ });
[scoreLimiteInput, scoreRelatifInput, nbManchesTotalInput, nbManchesRestantesInput].forEach(input => { /* ... (inchangé) ... */ });


// --- INITIALISATION ---
configEcran.classList.remove('cache');
scoreEcran.classList.add('cache');
revealEcran.classList.add('cache');
podiumEcran.classList.add('cache');

couleurCreateurInput.value = genererCouleurAleatoire();
couleurRejoindreInput.value = genererCouleurAleatoire();
