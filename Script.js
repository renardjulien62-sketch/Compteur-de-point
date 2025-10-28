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
const listeJoueursConf = document.getElementById('liste-joueurs-conf'); // Gardé pour référence si besoin
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

// Fonction pour créer la partie (sans les alertes de débogage)
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
            scoresSecrets: modeSecretConfig.checked, // Utilise la valeur initiale
            lowScoreWins: document.querySelector('input[name="condition-victoire"]:checked').value === 'low', // Utilise la valeur initiale
            conditionsArret: conditionsArret,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Affiche le code et met à jour l'UI du lobby
        codePartieSpan.textContent = partieId;
        codePartieAffichage.classList.remove('cache');
        attenteJoueursMsg.classList.remove('cache');
        document.querySelector('.lobby-section:nth-child(2)').classList.add('cache'); // Cache "Rejoindre"
        creerPartieBtn.classList.add('cache');
        nomCreateurInput.disabled = true;
        couleurCreateurInput.disabled = true;

        ecouterPartie(partieId); // Lance l'écouteur qui affichera la liste des joueurs etc.

    } catch (error) {
        alert("ERREUR Firebase lors de la création : " + error.message);
        console.error("Erreur lors de la création de la partie:", error);
        alert("Impossible de créer la partie. Vérifiez votre connexion ou réessayez.");
        creerPartieBtn.disabled = false;
        partieId = null;
        joueurId = null;
        createurId = null;
    }
}

// Fonction pour rejoindre (avec message d'erreur précis)
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
            throw new Error("Code de partie invalide."); // Lance une erreur
        }

        const partieData = doc.data();

        if (partieData.joueurs && partieData.joueurs.some(j => j.nom === nom)) {
             throw new Error(`Le nom "${nom}" est déjà pris dans cette partie.`); // Lance une erreur
        }

        if (partieData.etatPartie !== 'lobby') {
             throw new Error("Cette partie a déjà commencé ou est terminée."); // Lance une erreur
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
        document.querySelector('.lobby-section:nth-child(1)').classList.add('cache');
        document.querySelector('.lobby-section:nth-child(2)').classList.add('cache');

        // Commence à écouter les changements sur CETTE partie APRES succès de l'update
        ecouterPartie(partieId);
        // L'écouteur va maintenant s'occuper d'afficher le lobby correctement

    } catch (error) {
        console.error("Erreur pour rejoindre la partie:", error);
        rejoindreErreurMsg.textContent = `Impossible de rejoindre: ${error.message || "Vérifiez code/connexion"}`;
        rejoindreErreurMsg.classList.remove('cache');
        rejoindrePartieBtn.disabled = false; // Réactive le bouton en cas d'erreur
        partieId = null; // Réinitialise si échec
        joueurId = null;
    }
}

// Fonction pour écouter la partie (essentielle !)
function ecouterPartie(codePartie) {
    if (unsubscribePartie) {
        unsubscribePartie();
    }

    console.log(`Écoute de la partie ${codePartie} démarrée pour joueur ${joueurId}`); // Debug

    unsubscribePartie = db.collection('parties').doc(codePartie)
        .onSnapshot((doc) => {
            console.log("Données reçues de Firebase:", doc.data()); // Debug
            if (!doc.exists) {
                alert("La partie a été supprimée ou n'existe plus.");
                if (unsubscribePartie) unsubscribePartie(); // Arrête l'écoute
                // Recharge la page pour revenir à l'état initial
                window.location.reload();
                return;
            }

            const partieData = doc.data();
            // Met à jour les variables globales avec les données de Firebase
            joueurs = partieData.joueurs || [];
            createurId = partieData.createurId;
            mancheActuelle = partieData.mancheActuelle || 0;
            scoresSecrets = partieData.scoresSecrets || false;
            lowScoreWins = partieData.lowScoreWins !== undefined ? partieData.lowScoreWins : true;
            conditionsArret = partieData.conditionsArret || conditionsArret; // Récupère les conditions

             // S'assure que joueurId est défini (si on rejoint)
             if (!joueurId) {
                const moi = joueurs.find(j => j.nom === nomRejoindreInput.value.trim()); // Tentative de retrouver son ID
                if (moi) joueurId = moi.id;
             }
             console.log("État actuel:", partieData.etatPartie, " Joueurs:", joueurs); // Debug

             // Met à jour l'interface en fonction de l'état de la partie
            mettreAJourUI(partieData.etatPartie);

        }, (error) => {
            console.error("Erreur d'écoute de la partie:", error);
            alert("Erreur de connexion avec la partie: " + error.message);
            if (unsubscribePartie) unsubscribePartie();
            // Optionnel: Recharger la page ou afficher un message permanent
            // window.location.reload();
        });
}

// Fonction pour mettre à jour l'UI (essentielle !)
function mettreAJourUI(etatPartie) {
    console.log("Mise à jour UI pour état:", etatPartie); // Debug
    // Cache tous les écrans principaux par défaut
    configEcran.classList.add('cache');
    scoreEcran.classList.add('cache');
    revealEcran.classList.add('cache');
    podiumEcran.classList.add('cache');

    if (etatPartie === 'lobby') {
        console.log("Affichage du Lobby"); // Debug
        configEcran.classList.remove('cache');
        // Affiche la section joueurs connectés seulement si on est dans une partie
        if (partieId) {
             // Cache Créer/Rejoindre si on est déjà dans une partie
             document.querySelector('.lobby-section:nth-child(1)').classList.add('cache');
             document.querySelector('.lobby-section:nth-child(2)').classList.add('cache');
             // Affiche les joueurs et options
             afficherLobbyJoueurs();
             lobbyJoueursDiv.classList.remove('cache');
        } else {
             // Si pas dans une partie, montre Créer/Rejoindre et cache le reste
             document.querySelector('.lobby-section:nth-child(1)').classList.remove('cache');
             document.querySelector('.lobby-section:nth-child(2)').classList.remove('cache');
             lobbyJoueursDiv.classList.add('cache');
              // S'assure que les champs/boutons sont réactivés si on a quitté une partie
             creerPartieBtn.disabled = false;
             creerPartieBtn.classList.remove('cache');
             nomCreateurInput.disabled = false;
             couleurCreateurInput.disabled = false;
             rejoindrePartieBtn.disabled = false;
             codePartieAffichage.classList.add('cache');
             attenteJoueursMsg.classList.add('cache');
        }

    } else if (etatPartie === 'en_cours') {
        console.log("Affichage de l'écran Score"); // Debug
        scoreEcran.classList.remove('cache');
        // Initialiser ou mettre à jour l'écran de score
        if (!monGraphique && canvasGraphique) { // Vérifie aussi que le canvas existe
            genererChampsSaisie();
             creerGraphique();
        }
        mettreAJourScoresAffichage();
        mettreAJourCompteurs();
        mettreAJourGraphique();
    } else if (etatPartie === 'terminee') {
        console.log("Affichage de l'écran Podium"); // Debug
         // La logique de fin (calcul rangs, etc.) est maintenant dans terminerPartieLogiqueLocale
         // Appeler cette logique ici si elle n'a pas déjà été déclenchée par terminerPartieFirebase
         // (par exemple si un joueur rejoint tardivement une partie terminée)
         if(classementFinal.length === 0 && joueurs.length > 0) { // Si pas déjà calculé
             terminerPartieLogiqueLocale(); // Calcule les rangs et lance potentiellement la séquence reveal
         } else if (!revealEcran.classList.contains('cache')) {
            // Si la séquence reveal est en cours, ne rien faire ici
         }
         else {
             // Si la séquence est finie ou n'a pas eu lieu, affiche le podium direct
             podiumEcran.classList.remove('cache');
             construirePodiumFinal();
         }
    }
}

// Fonction pour afficher le lobby (essentielle !)
function afficherLobbyJoueurs() {
     listeJoueursLobbyDiv.innerHTML = ''; // Vide la liste

     joueurs.forEach((joueur) => {
        const tag = document.createElement('div');
        tag.className = 'joueur-tag';
        const swatch = document.createElement('span');
        swatch.className = 'joueur-couleur-swatch';
        swatch.style.backgroundColor = joueur.couleur;
        const nom = document.createElement('span');
        nom.textContent = joueur.nom + (joueur.id === createurId ? ' (Créateur)' : '');
        if (joueur.id === joueurId) {
             nom.textContent += ' (Vous)';
             nom.style.fontWeight = 'bold';
        }

        tag.appendChild(swatch);
        tag.appendChild(nom);
        listeJoueursLobbyDiv.appendChild(tag);
    });

    const estCreateur = (joueurId === createurId);
    optionsCreateurDiv.classList.toggle('cache', !estCreateur);
    attenteLancementMsg.classList.toggle('cache', estCreateur);

    if (estCreateur) {
        lancerPartieBtn.disabled = joueurs.length < 2;
        // Met à jour les options affichées avec les valeurs actuelles de Firebase
        modeSecretConfig.checked = scoresSecrets;
        conditionVictoireRadios.forEach(radio => {
             radio.checked = (lowScoreWins && radio.value === 'low') || (!lowScoreWins && radio.value === 'high');
        });
    }
}

// Fonction pour lancer la partie (inchangée)
async function lancerPartie() {
    if (joueurId !== createurId || joueurs.length < 2) return;

    // Récupère les dernières valeurs des options avant de lancer
    scoresSecrets = modeSecretConfig.checked;
    lowScoreWins = document.querySelector('input[name="condition-victoire"]:checked').value === 'low';

    try {
        await db.collection('parties').doc(partieId).update({
            etatPartie: 'en_cours',
            scoresSecrets: scoresSecrets, // Sauvegarde l'option
            lowScoreWins: lowScoreWins,   // Sauvegarde l'option
            mancheActuelle: 0
        });
        // onSnapshot s'occupera du changement d'écran
    } catch (error) {
        console.error("Erreur lors du lancement de la partie:", error);
        alert("Impossible de lancer la partie.");
    }
}

// Fonction valider tour (inchangée)
async function validerTourFirebase() {
     if (validerTourBouton.disabled) return;
     let scoresJoueursMisAJour = JSON.parse(JSON.stringify(joueurs)); // Copie profonde

     scoresJoueursMisAJour.forEach((joueur, index) => {
        const inputElement = document.getElementById(`score-${index}`);
        if(inputElement) {
            const points = parseInt(inputElement.value, 10) || 0;
            // Met à jour la copie
            joueur.scoreTotal += points;
            // Assure que scoresTour est un tableau
            if (!Array.isArray(joueur.scoresTour)) {
                joueur.scoresTour = [];
            }
            joueur.scoresTour.push(points);
            inputElement.value = 0;
        }
     });

     try {
          await db.collection('parties').doc(partieId).update({
               joueurs: scoresJoueursMisAJour, // Ecrase avec la copie mise à jour
               mancheActuelle: firebase.firestore.FieldValue.increment(1)
          });
          // La vérification des conditions se fera via onSnapshot quand les données reviennent
          // verifierConditionsArret(); // On commente pour éviter double appel potentiel
     } catch (error) {
          console.error("Erreur lors de la validation du tour:", error);
          alert("Erreur lors de la sauvegarde des scores.");
     }
}

// Fonction terminer partie (inchangée)
async function terminerPartieFirebase() {
     if (!partieId) return;
     try {
          // Met à jour l'état ET s'assure que scoresSecrets est bien false à la fin
          await db.collection('parties').doc(partieId).update({
               etatPartie: 'terminee',
               scoresSecrets: false // Force la révélation des scores dans la DB
          });
          // onSnapshot déclenchera terminerPartieLogiqueLocale via mettreAJourUI
     } catch (error) {
          console.error("Erreur lors de la fin de partie:", error);
          alert("Impossible de terminer la partie correctement.");
     }
}

// --- ANCIENNES FONCTIONS ADAPTÉES ---

function calculerRangs(joueursTries) { /* ... (inchangé) ... */ }
function construirePodiumFinal() { /* ... (inchangé) ... */ }
function majContenuReveal(rang, joueur, estExAequoPrecedent) { /* ... (inchangé) ... */ }
async function demarrerSequenceReveal() { /* ... (inchangé) ... */ }

// Fonction pour la logique locale de fin de partie (calculs, reconstruction graphique si besoin)
function terminerPartieLogiqueLocale() {
    console.log("Déclenchement logique fin de partie locale"); // Debug
    sequenceForceStop = false;
    validerTourBouton.disabled = true;
    arreterMaintenantBouton.disabled = true;

    const graphContainer = document.querySelector('.graphique-container');
    if (graphContainer) {
        graphContainer.classList.remove('cache');
    }

    let joueursTries = [...joueurs].sort((a, b) => {
        return lowScoreWins ? a.scoreTotal - b.scoreTotal : b.scoreTotal - a.scoreTotal;
    });
    classementFinal = calculerRangs(joueursTries);

    // Vérifie si la partie *était* secrète *avant* la mise à jour de Firebase
    // On se base sur l'état de la checkbox qui était visible par le créateur
    const etaitSecret = modeSecretConfig.checked; // Ou une autre variable si besoin

    if (etaitSecret && !scoresSecrets) { // Si elle était secrète et que Firebase l'a révélée
         console.log("Mode secret détecté, reconstruction graphique..."); // Debug
        // Met à jour l'affichage maintenant que scoresSecrets est false
         mettreAJourScoresAffichage();

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
                     if(monGraphique.data.datasets[index]) { // Vérif dataset existe
                        monGraphique.data.datasets[index].data[i+1] = scoreCumules[index];
                     }
                });
            }
             const maxDataLength = Math.max(0, ...monGraphique.data.datasets.map(d => d.data.length));
             while(monGraphique.data.labels.length < maxDataLength) { monGraphique.data.labels.push(`Manche ${monGraphique.data.labels.length}`); }
            monGraphique.update();
            monGraphique.resize();
        }

        alert("FIN DE PARTIE : Les scores secrets sont révélés !");
        setTimeout(demarrerSequenceReveal, 100);
    } else {
         console.log("Mode normal ou déjà révélé, lancement séquence reveal..."); // Debug
        // Met à jour l'affichage avec les rangs (si pas déjà fait)
        mettreAJourScoresAffichage();
        demarrerSequenceReveal();
    }
}


// --- FONCTIONS GRAPHIQUE ---
function genererCouleurAleatoire() { /* ... (inchangé) ... */ }
function creerGraphique() { /* ... (inchangé) ... */ }
function mettreAJourGraphique() {
     // Ne met à jour que si le graphique existe et si la partie est en cours et non secrète
     if (!monGraphique || scoreEcran.classList.contains('cache') || scoresSecrets) {
        // console.log("Mise à jour graphique skipée (caché ou secret)"); // Debug
        return;
     }
     // console.log("Mise à jour graphique pour manche", mancheActuelle); // Debug

     const labelManche = 'Manche ' + mancheActuelle;
     if (!monGraphique.data.labels.includes(labelManche) && mancheActuelle > 0) {
         monGraphique.data.labels.push(labelManche);
     }

     joueurs.forEach((joueur, index) => {
          if(monGraphique.data.datasets[index]) {
             // Assure que le tableau data a assez d'éléments
             while(monGraphique.data.datasets[index].data.length <= mancheActuelle) {
                 monGraphique.data.datasets[index].data.push(null); // Ajoute des null si besoin
             }
             monGraphique.data.datasets[index].data[mancheActuelle] = joueur.scoreTotal;
          }
     });

     // S'assure qu'il y a assez de labels
     const maxDataLength = Math.max(0, ...monGraphique.data.datasets.map(d => d.data.length));
     while(monGraphique.data.labels.length < maxDataLength) {
        monGraphique.data.labels.push(`Manche ${monGraphique.data.labels.length}`);
     }

     monGraphique.update();
}


// --- GESTION DES ÉVÉNEMENTS ---
creerPartieBtn.addEventListener('click', creerPartie);
rejoindrePartieBtn.addEventListener('click', rejoindrePartie);
lancerPartieBtn.addEventListener('click', lancerPartie);
copierCodeBtn.addEventListener('click', () => { /* ... (inchangé) ... */ });
validerTourBouton.addEventListener('click', validerTourFirebase);
arreterMaintenantBouton.addEventListener('click', terminerPartieFirebase);
revealEcran.addEventListener('click', (e) => { /* ... (inchangé) ... */ });
skipAllBtn.addEventListener('click', () => { /* ... (inchangé) ... */ });
conditionCheckboxes.forEach(checkbox => { /* ... (inchangé) ... */ });
[scoreLimiteInput, scoreRelatifInput, nbManchesTotalInput, nbManchesRestantesInput].forEach(input => { /* ... (inchangé) ... */ });


// --- INITIALISATION ---
// Assure que seul l'écran de config (lobby initial) est visible
configEcran.classList.remove('cache');
scoreEcran.classList.add('cache');
revealEcran.classList.add('cache');
podiumEcran.classList.add('cache');
// Cache la section joueurs/options au début
lobbyJoueursDiv.classList.add('cache');


couleurCreateurInput.value = genererCouleurAleatoire();
couleurRejoindreInput.value = genererCouleurAleatoire();

console.log("Application initialisée. En attente d'action utilisateur."); // Debug
