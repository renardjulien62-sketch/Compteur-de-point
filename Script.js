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

const inputIdMap = { /* ... (inchangé) ... */ };

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

// Éléments des autres écrans (inchangés pour l'instant)
const listeJoueursConf = document.getElementById('liste-joueurs-conf'); // Utilisé pour le style des tags
const scoreAffichageDiv = document.getElementById('score-affichage');
const saisiePointsDiv = document.getElementById('saisie-points');
const validerTourBouton = document.getElementById('valider-tour');
const modeSecretConfig = document.getElementById('mode-secret-config'); // Maintenant dans options-createur
const conditionVictoireRadios = document.querySelectorAll('input[name="condition-victoire"]'); // Maintenant dans options-createur
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

/**
 * Génère un code de partie aléatoire de 4 lettres majuscules
 */
function genererCodePartie() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Crée une nouvelle partie dans Firestore
 */
async function creerPartie() {
    const nom = nomCreateurInput.value.trim();
    const couleur = couleurCreateurInput.value;
    if (!nom) {
        alert("Veuillez entrer votre nom.");
        return;
    }

    creerPartieBtn.disabled = true; // Empêche double clic
    const nouveauCode = genererCodePartie();
    partieId = nouveauCode; // Stocke le code comme ID de partie
    joueurId = db.collection('parties').doc().id; // Génère un ID unique pour ce joueur
    createurId = joueurId; // Le créateur est le premier joueur

    const nouveauJoueur = {
        id: joueurId,
        nom: nom,
        couleur: couleur,
        scoreTotal: 0,
        scoresTour: [],
        estCreateur: true // Marque le créateur
    };

    try {
        // Crée le document de la partie avec le code comme ID
        await db.collection('parties').doc(partieId).set({
            code: partieId,
            createurId: createurId,
            joueurs: [nouveauJoueur], // Ajoute le créateur à la liste
            etatPartie: 'lobby', // États possibles: lobby, en_cours, terminee
            mancheActuelle: 0,
            scoresSecrets: false,
            lowScoreWins: true,
            conditionsArret: conditionsArret, // Sauvegarde les conditions par défaut
            createdAt: firebase.firestore.FieldValue.serverTimestamp() // Date de création
        });

        // Affiche le code et cache les options de création/rejoindre
        codePartieSpan.textContent = partieId;
        codePartieAffichage.classList.remove('cache');
        attenteJoueursMsg.classList.remove('cache');
        document.querySelector('.lobby-section:nth-child(2)').classList.add('cache'); // Cache "Rejoindre"
        creerPartieBtn.classList.add('cache'); // Cache bouton "Créer"
        nomCreateurInput.disabled = true;
        couleurCreateurInput.disabled = true;


        // Commence à écouter les changements sur CETTE partie
        ecouterPartie(partieId);

    } catch (error) {
        console.error("Erreur lors de la création de la partie:", error);
        alert("Impossible de créer la partie. Vérifiez votre connexion ou réessayez.");
        creerPartieBtn.disabled = false; // Réactive le bouton
        partieId = null;
        joueurId = null;
        createurId = null;
    }
}

/**
 * Permet à un joueur de rejoindre une partie existante
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

        // Vérifie si un joueur avec le même nom existe déjà
        if (partieData.joueurs && partieData.joueurs.some(j => j.nom === nom)) {
             rejoindreErreurMsg.textContent = `Le nom "${nom}" est déjà pris dans cette partie.`;
             rejoindreErreurMsg.classList.remove('cache');
             rejoindrePartieBtn.disabled = false;
             return;
        }

        // Vérifie si la partie n'a pas déjà commencé
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

        // Cache les options de création/rejoindre
        document.querySelector('.lobby-section:nth-child(1)').classList.add('cache'); // Cache "Créer"
        document.querySelector('.lobby-section:nth-child(2)').classList.add('cache'); // Cache "Rejoindre"


        // Commence à écouter les changements sur CETTE partie
        ecouterPartie(partieId);

    } catch (error) {
        console.error("Erreur pour rejoindre la partie:", error);
        rejoindreErreurMsg.textContent = "Impossible de rejoindre la partie. Vérifiez le code et votre connexion.";
        rejoindreErreurMsg.classList.remove('cache');
        rejoindrePartieBtn.disabled = false;
        partieId = null;
        joueurId = null;
    }
}

/**
 * Écoute les mises à jour de la partie en temps réel
 */
function ecouterPartie(codePartie) {
    if (unsubscribePartie) {
        unsubscribePartie(); // Arrête l'écoute précédente si elle existe
    }

    unsubscribePartie = db.collection('parties').doc(codePartie)
        .onSnapshot((doc) => {
            if (!doc.exists) {
                // La partie a été supprimée ou n'existe plus
                alert("La partie a été supprimée ou n'existe plus.");
                // TODO: Retourner à l'écran d'accueil ?
                return;
            }

            const partieData = doc.data();
            joueurs = partieData.joueurs || []; // Met à jour la liste globale des joueurs
            createurId = partieData.createurId;
            mancheActuelle = partieData.mancheActuelle || 0;
            scoresSecrets = partieData.scoresSecrets || false;
            lowScoreWins = partieData.lowScoreWins !== undefined ? partieData.lowScoreWins : true;
            conditionsArret = partieData.conditionsArret || conditionsArret; // Récupère les conditions

             // Met à jour l'interface en fonction de l'état de la partie
            mettreAJourUI(partieData.etatPartie);

        }, (error) => {
            console.error("Erreur d'écoute de la partie:", error);
            alert("Erreur de connexion avec la partie. Vérifiez votre connexion.");
             // TODO: Gérer la déconnexion ?
        });
}

/**
 * Met à jour l'interface en fonction de l'état actuel de la partie
 */
function mettreAJourUI(etatPartie) {
    // Cache tous les écrans principaux par défaut
    configEcran.classList.add('cache');
    scoreEcran.classList.add('cache');
    revealEcran.classList.add('cache');
    podiumEcran.classList.add('cache');

    if (etatPartie === 'lobby') {
        configEcran.classList.remove('cache');
        afficherLobbyJoueurs();
    } else if (etatPartie === 'en_cours') {
        scoreEcran.classList.remove('cache');
        // Initialiser ou mettre à jour l'écran de score
        if (!monGraphique) { // Si c'est le premier affichage de l'écran score
            genererChampsSaisie(); // Génère les inputs pour les scores
             creerGraphique(); // Crée le graphique vide
        }
        mettreAJourScoresAffichage(); // Met à jour le tableau des scores
        mettreAJourCompteurs(); // Met à jour les compteurs
        mettreAJourGraphique(); // Met à jour le graphique (si visible)
    } else if (etatPartie === 'terminee') {
         // TODO: Gérer l'affichage final (podium) en récupérant les données finales
         // Pour l'instant, on affiche juste l'écran podium vide
        podiumEcran.classList.remove('cache');
        construirePodiumFinal(); // Construit le podium avec les données finales
    }
    // TODO: Gérer la séquence de révélation si nécessaire
}

/**
 * Affiche la liste des joueurs dans le lobby
 */
function afficherLobbyJoueurs() {
     lobbyJoueursDiv.classList.remove('cache');
     listeJoueursLobbyDiv.innerHTML = ''; // Vide la liste

     joueurs.forEach((joueur) => {
        const tag = document.createElement('div');
        tag.className = 'joueur-tag';
        const swatch = document.createElement('span');
        swatch.className = 'joueur-couleur-swatch';
        swatch.style.backgroundColor = joueur.couleur;
        const nom = document.createElement('span');
        nom.textContent = joueur.nom + (joueur.id === createurId ? ' (Créateur)' : '');
        // Ajoute une marque si c'est le joueur actuel
        if (joueur.id === joueurId) {
             nom.textContent += ' (Vous)';
             nom.style.fontWeight = 'bold';
        }

        tag.appendChild(swatch);
        tag.appendChild(nom);
        listeJoueursLobbyDiv.appendChild(tag);
    });

    // Affiche les options pour le créateur OU le message d'attente pour les autres
    const estCreateur = (joueurId === createurId);
    optionsCreateurDiv.classList.toggle('cache', !estCreateur);
    attenteLancementMsg.classList.toggle('cache', estCreateur);

    // Active le bouton "Lancer" pour le créateur si au moins 2 joueurs
    if (estCreateur) {
        lancerPartieBtn.disabled = joueurs.length < 2;
        // Met à jour les options affichées avec les valeurs de Firebase
        modeSecretConfig.checked = scoresSecrets;
        conditionVictoireRadios.forEach(radio => {
             radio.checked = (lowScoreWins && radio.value === 'low') || (!lowScoreWins && radio.value === 'high');
        });
    }
}

/**
 * Fonction appelée par le créateur pour lancer la partie
 */
async function lancerPartie() {
    if (joueurId !== createurId || joueurs.length < 2) return;

    // Met à jour les options de la partie dans Firebase
    scoresSecrets = modeSecretConfig.checked;
    lowScoreWins = document.querySelector('input[name="condition-victoire"]:checked').value === 'low';

    try {
        await db.collection('parties').doc(partieId).update({
            etatPartie: 'en_cours',
            scoresSecrets: scoresSecrets,
            lowScoreWins: lowScoreWins,
            mancheActuelle: 0 // Réinitialise au cas où
             // Les conditions d'arrêt sont déjà là par défaut ou modifiées via un autre mécanisme
        });
        // L'écouteur `onSnapshot` détectera ce changement et mettra à jour l'UI pour tout le monde
    } catch (error) {
        console.error("Erreur lors du lancement de la partie:", error);
        alert("Impossible de lancer la partie.");
    }
}

/**
 * Met à jour les scores dans Firebase après validation d'un tour
 */
async function validerTourFirebase() {
     if (validerTourBouton.disabled) return;

     let misesAJourScores = {};
     let nouveauxScoresTour = {}; // Pour stocker { joueurId: scoreDuTour }

     joueurs.forEach((joueur, index) => {
        const inputElement = document.getElementById(`score-${index}`);
        const points = parseInt(inputElement.value, 10) || 0;
        // Prépare la mise à jour pour Firebase
        misesAJourScores[`joueurs.${index}.scoreTotal`] = firebase.firestore.FieldValue.increment(points);
        misesAJourScores[`joueurs.${index}.scoresTour`] = firebase.firestore.FieldValue.arrayUnion(points);
        inputElement.value = 0; // Réinitialise l'input localement
     });

     try {
          await db.collection('parties').doc(partieId).update({
               ...misesAJourScores, // Applique les increments et ajout aux arrays
               mancheActuelle: firebase.firestore.FieldValue.increment(1) // Incrémente la manche
          });
          // L'écouteur onSnapshot mettra à jour l'UI de tout le monde
          // On peut vérifier les conditions d'arrêt localement APRES la mise à jour Firebase
          // (ou idéalement via une fonction Cloud Firebase pour éviter triche)
          verifierConditionsArret(); // Vérifie si la partie doit se terminer
     } catch (error) {
          console.error("Erreur lors de la validation du tour:", error);
          alert("Erreur lors de la sauvegarde des scores.");
     }
}

/**
* Termine la partie dans Firebase
*/
async function terminerPartieFirebase() {
     if (!partieId) return;
     try {
          await db.collection('parties').doc(partieId).update({
               etatPartie: 'terminee'
          });
          // L'écouteur onSnapshot déclenchera l'affichage du podium/révélation
     } catch (error) {
          console.error("Erreur lors de la fin de partie:", error);
          alert("Impossible de terminer la partie correctement.");
     }
}


// --- ANCIENNES FONCTIONS (Adaptées ou à supprimer) ---

// (Fonction calculerRangs - OK)
function calculerRangs(joueursTries) { /* ... (inchangé) ... */ }
// (Fonction construirePodiumFinal - OK, utilise classementFinal global)
function construirePodiumFinal() { /* ... (adapté, voir plus haut) ... */ }
// (Fonction majContenuReveal - OK)
function majContenuReveal(rang, joueur, estExAequoPrecedent) { /* ... (inchangé) ... */ }
// (Fonction demarrerSequenceReveal - OK, utilise classementFinal global)
async function demarrerSequenceReveal() { /* ... (adapté, voir plus haut) ... */ }
// (Fonction terminerPartie - Remplacée par terminerPartieFirebase, mais on garde la logique de reconstruction graphique)
function terminerPartieLogiqueLocale() {
    sequenceForceStop = false;
    validerTourBouton.disabled = true;
    arreterMaintenantBouton.disabled = true;

    const graphContainer = document.querySelector('.graphique-container');
    if (graphContainer) {
        graphContainer.classList.remove('cache');
    }

     // --- Calculer le classement final localement ---
    let joueursTries = [...joueurs].sort((a, b) => {
        return lowScoreWins ? a.scoreTotal - b.scoreTotal : b.scoreTotal - a.scoreTotal;
    });
    classementFinal = calculerRangs(joueursTries); // Stocke le résultat globalement


    // --- Gérer le cas secret (reconstruction graphique) ---
    const etaitSecret = modeSecretConfig.checked; // Vérifie l'état AVANT de le changer potentiellement
    if (etaitSecret) { // On utilise une variable locale car scoresSecrets peut avoir changé via Firebase
        // scoresSecrets = false; // Ne pas changer la variable globale ici
        mettreAJourScoresAffichage(); // Met à jour avec les scores révélés et les rangs

        if (monGraphique) {
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
     // Appel à Firebase pour changer l'état (si pas déjà fait par conditions d'arrêt)
     // db.collection('parties').doc(partieId).update({ etatPartie: 'terminee' }); // Peut être redondant
}

// (Fonctions genererCouleurAleatoire, creerGraphique, mettreAJourGraphique - OK)
function genererCouleurAleatoire() { /* ... (inchangé) ... */ }
function creerGraphique() { /* ... (inchangé) ... */ }
function mettreAJourGraphique() { /* ... (adapté, voir plus haut) ... */ }
// (Fonctions mettreAJourCompteurs, mettreAJourConditionsArret - OK)
function mettreAJourCompteurs() { /* ... (adapté, voir plus haut) ... */ }
function mettreAJourConditionsArret() { /* ... (inchangé) ... */ }


// --- GESTION DES ÉVÉNEMENTS ---

// Nouveaux événements pour le Lobby
creerPartieBtn.addEventListener('click', creerPartie);
rejoindrePartieBtn.addEventListener('click', rejoindrePartie);
lancerPartieBtn.addEventListener('click', lancerPartie);

// Copier le code
copierCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(partieId)
        .then(() => {
            copierCodeBtn.textContent = 'Copié !';
            setTimeout(() => { copierCodeBtn.textContent = 'Copier'; }, 1500);
        })
        .catch(err => { console.error('Erreur de copie:', err); });
});


// Événements existants (adaptés)
validerTourBouton.addEventListener('click', validerTourFirebase); // Appelle la version Firebase
arreterMaintenantBouton.addEventListener('click', terminerPartieFirebase); // Appelle la version Firebase


// (Événements Skip - Inchangés)
revealEcran.addEventListener('click', (e) => { /* ... (inchangé) ... */ });
skipAllBtn.addEventListener('click', () => { /* ... (inchangé) ... */ });

// (Gestion des checkboxes de condition - OK mais l'effet sera via Firebase)
conditionCheckboxes.forEach(checkbox => { /* ... (inchangé) ... */ });
[scoreLimiteInput, scoreRelatifInput, nbManchesTotalInput, nbManchesRestantesInput].forEach(input => { /* ... (inchangé) ... */ });

// --- INITIALISATION ---
// Plus besoin d'initialiser la liste ou les couleurs ici, tout part du lobby
// Initialement, seul l'écran de configuration (lobby) est visible
configEcran.classList.remove('cache');
scoreEcran.classList.add('cache');
revealEcran.classList.add('cache');
podiumEcran.classList.add('cache');

// Note: On n'appelle PAS mettreAJourListeJoueurs ou verifierPeutDemarrer ici.
// L'UI initiale est gérée par le HTML/CSS jusqu'à création/rejoindre partie.
