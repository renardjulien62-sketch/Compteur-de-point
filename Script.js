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
 * ▼▼▼ MODIFIÉ AVEC ALERTES ▼▼▼
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

    // ▼▼▼ AJOUT DE L'ALERTE ▼▼▼
    alert("Code généré (avant Firebase) : " + partieId);
    // ▲▲▲ FIN AJOUT ▲▲▲

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

        // ▼▼▼ AJOUT DE L'ALERTE ▼▼▼
        alert("Partie créée sur Firebase. Code à afficher : " + partieId);
        // ▲▲▲ FIN AJOUT ▲▲▲

        // Affiche le code et cache les options
        codePartieSpan.textContent = partieId;
        codePartieAffichage.classList.remove('cache'); // Rend le <p> visible
        attenteJoueursMsg.classList.remove('cache');
        document.querySelector('.lobby-section:nth-child(2)').classList.add('cache'); // Cache "Rejoindre"
        creerPartieBtn.classList.add('cache'); // Cache bouton "Créer"
        nomCreateurInput.disabled = true;
        couleurCreateurInput.disabled = true;

        // ▼▼▼ AJOUT DE L'ALERTE ▼▼▼
        alert("Affichage du code terminé.");
        // ▲▲▲ FIN AJOUT ▲▲▲

        ecouterPartie(partieId);

    } catch (error) {
        // ▼▼▼ AJOUT DE L'ALERTE EN CAS D'ERREUR ▼▼▼
        alert("ERREUR Firebase : " + error.message);
        // ▲▲▲ FIN AJOUT ▲▲▲
        console.error("Erreur lors de la création de la partie:", error);
        // On affiche aussi l'alerte générique au cas où error.message serait vide
        alert("Impossible de créer la partie. Vérifiez votre connexion ou réessayez.");
        creerPartieBtn.disabled = false; // Réactive le bouton
        partieId = null;
        joueurId = null;
        createurId = null;
    }
}
// ▲▲▲ FIN MODIFICATION AVEC ALERTES ▲▲▲

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

        await partieRef.update({
            joueurs: firebase.firestore.FieldValue.arrayUnion(nouveauJoueur)
        });

        document.querySelector('.lobby-section:nth-child(1)').classList.add('cache'); // Cache "Créer"
        document.querySelector('.lobby-section:nth-child(2)').classList.add('cache'); // Cache "Rejoindre"


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

function ecouterPartie(codePartie) {
    if (unsubscribePartie) {
        unsubscribePartie();
    }

    unsubscribePartie = db.collection('parties').doc(codePartie)
        .onSnapshot((doc) => {
            if (!doc.exists) {
                alert("La partie a été supprimée ou n'existe plus.");
                // Optionnel: Recharger la page pour revenir à l'état initial
                // window.location.reload();
                return;
            }

            const partieData = doc.data();
            joueurs = partieData.joueurs || [];
            createurId = partieData.createurId;
            mancheActuelle = partieData.mancheActuelle || 0;
            scoresSecrets = partieData.scoresSecrets || false;
            lowScoreWins = partieData.lowScoreWins !== undefined ? partieData.lowScoreWins : true;
            conditionsArret = partieData.conditionsArret || conditionsArret;

            mettreAJourUI(partieData.etatPartie);

        }, (error) => {
            console.error("Erreur d'écoute de la partie:", error);
            alert("Erreur de connexion avec la partie. Vérifiez votre connexion.");
        });
}

function mettreAJourUI(etatPartie) {
    configEcran.classList.add('cache');
    scoreEcran.classList.add('cache');
    revealEcran.classList.add('cache');
    podiumEcran.classList.add('cache');

    if (etatPartie === 'lobby') {
        configEcran.classList.remove('cache');
        afficherLobbyJoueurs();
    } else if (etatPartie === 'en_cours') {
        scoreEcran.classList.remove('cache');
        if (!monGraphique) {
            genererChampsSaisie();
             creerGraphique();
        }
        mettreAJourScoresAffichage();
        mettreAJourCompteurs();
        mettreAJourGraphique();
    } else if (etatPartie === 'terminee') {
        // S'assure que le classement final est calculé avant de construire le podium
        // Normalement, terminerPartieLogiqueLocale devrait avoir été appelée
        // Si ce n'est pas le cas (ex: reconnexion tardive), on le recalcule
        if (classementFinal.length === 0 && joueurs.length > 0) {
             let joueursTries = [...joueurs].sort((a, b) => {
                return lowScoreWins ? a.scoreTotal - b.scoreTotal : b.scoreTotal - a.scoreTotal;
             });
             classementFinal = calculerRangs(joueursTries);
        }
        podiumEcran.classList.remove('cache');
        construirePodiumFinal();
    }
}

function afficherLobbyJoueurs() {
     lobbyJoueursDiv.classList.remove('cache');
     listeJoueursLobbyDiv.innerHTML = '';

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
        modeSecretConfig.checked = scoresSecrets;
        conditionVictoireRadios.forEach(radio => {
             radio.checked = (lowScoreWins && radio.value === 'low') || (!lowScoreWins && radio.value === 'high');
        });
    }
}

async function lancerPartie() {
    if (joueurId !== createurId || joueurs.length < 2) return;

    scoresSecrets = modeSecretConfig.checked;
    lowScoreWins = document.querySelector('input[name="condition-victoire"]:checked').value === 'low';

    try {
        await db.collection('parties').doc(partieId).update({
            etatPartie: 'en_cours',
            scoresSecrets: scoresSecrets,
            lowScoreWins: lowScoreWins,
            mancheActuelle: 0
        });
    } catch (error) {
        console.error("Erreur lors du lancement de la partie:", error);
        alert("Impossible de lancer la partie.");
    }
}

async function validerTourFirebase() {
     if (validerTourBouton.disabled) return;

     let misesAJourScores = {};
     // Récupère l'index du joueur dans le tableau actuel (peut changer si qqn quitte)
     joueurs.forEach((joueur, index) => {
        const inputElement = document.getElementById(`score-${index}`);
        if(inputElement) { // Vérifie si l'input existe
            const points = parseInt(inputElement.value, 10) || 0;
            // Utilise l'ID du joueur pour cibler la mise à jour dans Firebase (plus robuste)
            // Trouve l'index dans le tableau stocké dans Firebase (peut différer de l'index local si asynchrone)
            // Solution plus simple : Mettre à jour tout le tableau joueurs (moins optimisé mais plus sûr)
            const joueurDataFirebase = joueurs.find(j => j.id === joueur.id); // Recherche par ID
            if(joueurDataFirebase) {
                joueurDataFirebase.scoreTotal += points;
                joueurDataFirebase.scoresTour.push(points);
            }
            inputElement.value = 0;
        }
     });

     try {
          await db.collection('parties').doc(partieId).update({
               joueurs: joueurs, // Ecrase le tableau avec les nouvelles données locales
               mancheActuelle: firebase.firestore.FieldValue.increment(1)
          });
          // La vérification des conditions d'arrêt devrait idéalement se faire côté serveur (Cloud Function)
          // Pour l'instant, on laisse le client le faire, en espérant que les données sont synchro
          verifierConditionsArret();
     } catch (error) {
          console.error("Erreur lors de la validation du tour:", error);
          alert("Erreur lors de la sauvegarde des scores.");
     }
}

async function terminerPartieFirebase() {
     if (!partieId) return;
     try {
          await db.collection('parties').doc(partieId).update({
               etatPartie: 'terminee'
          });
     } catch (error) {
          console.error("Erreur lors de la fin de partie:", error);
          alert("Impossible de terminer la partie correctement.");
     }
}

// --- ANCIENNES FONCTIONS ADAPTÉES ---

function calculerRangs(joueursTries) {
    let rangActuel = 0;
    let scorePrecedent = null;
    let nbExAequo = 1;

    joueursTries.forEach((joueur, index) => {
        if (joueur.scoreTotal !== scorePrecedent) {
            rangActuel += nbExAequo;
            nbExAequo = 1;
        } else {
            nbExAequo++;
        }
        joueur.rang = rangActuel;
        scorePrecedent = joueur.scoreTotal;
    });
    return joueursTries;
}

function construirePodiumFinal() {
    currentStepSkipper = null;
    const podiumMap = {
        1: document.getElementById('podium-1'),
        2: document.getElementById('podium-2'),
        3: document.getElementById('podium-3')
    };
    Object.values(podiumMap).forEach(el => el.classList.remove('cache'));

    const premier = classementFinal.filter(j => j.rang === 1);
    const deuxieme = classementFinal.filter(j => j.rang === 2);
    const troisieme = classementFinal.filter(j => j.rang === 3);

    const remplirPlace = (element, joueursPlace) => {
        if (joueursPlace.length > 0) {
            const joueurRef = joueursPlace[0];
            const noms = joueursPlace.map(j => j.nom).join(' & ');
            element.querySelector('.podium-nom').textContent = noms;
            element.querySelector('.podium-score').textContent = `${joueurRef.scoreTotal} pts`;
            element.style.borderColor = joueurRef.couleur;
            element.style.boxShadow = `0 0 15px ${joueurRef.couleur}80`;
        } else {
            element.classList.add('cache');
        }
    };

    remplirPlace(podiumMap[1], premier);
    remplirPlace(podiumMap[2], deuxieme);
    remplirPlace(podiumMap[3], troisieme);

    const autresListe = document.getElementById('autres-joueurs-liste');
    autresListe.innerHTML = '';
    const autresJoueurs = classementFinal.filter(j => j.rang > 3);
    if(autresJoueurs.length === 0) {
        document.getElementById('autres-joueurs').classList.add('cache');
    } else {
        document.getElementById('autres-joueurs').classList.remove('cache');
        autresJoueurs.sort((a, b) => a.rang - b.rang);
        autresJoueurs.forEach((joueur) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="score-couleur-swatch" style="background-color: ${joueur.couleur};"></span>
                <strong>${joueur.rang}. ${joueur.nom}</strong> (${joueur.scoreTotal} pts)
            `;
            autresListe.appendChild(li);
        });
    }

    const graphContainer = document.querySelector('.graphique-container');
    const graphPlaceholder = document.getElementById('graphique-final-container');
    if (graphContainer && graphPlaceholder) {
        graphPlaceholder.innerHTML = '';
        graphPlaceholder.appendChild(graphContainer);
        if (monGraphique) {
             monGraphique.resize();
        }
    }
}

function majContenuReveal(rang, joueur, estExAequoPrecedent) {
    let rangTexte = `${rang}ème Place`;
    if (estExAequoPrecedent) { rangTexte = `Ex æquo ${rang}ème Place`; }
    if (rang === 3) rangTexte = `🥉 ${estExAequoPrecedent ? 'Ex æquo ' : ''}3ème Place`;
    if (rang === 1) rangTexte = `🥇 GAGNANT ${estExAequoPrecedent ? 'Ex æquo ' : ''}!`;

    revealRang.textContent = rangTexte;
    revealNom.textContent = joueur.nom;
    revealNom.style.color = joueur.couleur;
    revealScore.textContent = `${joueur.scoreTotal} points`;
    revealContent.classList.remove('is-revealed');
}

async function demarrerSequenceReveal() {
    scoreEcran.classList.add('cache');
    revealEcran.classList.remove('cache');

    // S'assure que classementFinal est calculé (normalement fait dans terminerPartieLogiqueLocale ou mettreAJourUI)
     if (classementFinal.length === 0 && joueurs.length > 0) {
             let joueursTries = [...joueurs].sort((a, b) => {
                return lowScoreWins ? a.scoreTotal - b.scoreTotal : b.scoreTotal - a.scoreTotal;
             });
             classementFinal = calculerRangs(joueursTries);
     }


    let joueursAReveler = [];
    joueursAReveler.push(...classementFinal.filter(j => j.rang > 2).reverse());
    joueursAReveler.push(...classementFinal.filter(j => j.rang === 1));

    let rangPrecedent = null;

    for (const joueur of joueursAReveler) {
        if (sequenceForceStop) return;
        const rang = joueur.rang;
        const estExAequo = (rang === rangPrecedent);
        majContenuReveal(rang, joueur, estExAequo);
        revealContent.classList.add('slide-in-from-left');
        await attendreFinAnimation(revealContent);
        revealContent.classList.remove('slide-in-from-left');
        if (sequenceForceStop) return;
        await pause(1500);
        if (sequenceForceStop) return;
        revealContent.classList.add('shake-reveal');
        await attendreFinAnimation(revealContent);
        revealContent.classList.remove('shake-reveal');
        revealContent.classList.add('is-revealed');
        if (sequenceForceStop) return;
        await pause(2500);
        if (sequenceForceStop) return;
        if (joueur !== joueursAReveler[joueursAReveler.length - 1]) {
            revealContent.classList.add('slide-out-to-right');
            await attendreFinAnimation(revealContent);
            revealContent.classList.remove('slide-out-to-right', 'is-revealed');
        }
        rangPrecedent = rang;
    }

    revealEcran.classList.add('cache');
    podiumEcran.classList.remove('cache');
    construirePodiumFinal();
}

// Garde cette fonction pour la logique locale de fin (calculs, reconstruction graphique)
// Elle sera appelée par l'écouteur onSnapshot quand l'état passe à 'terminee'
function terminerPartieLogiqueLocale() {
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
    // Utilise la valeur 'scoresSecrets' globale qui a été mise à jour par onSnapshot
    if (modeSecretConfig.checked) { // Vérifie si la partie *était* secrète
        // scoresSecrets = false; // Ne pas changer ici, géré par Firebase idéalement

        // Met à jour l'affichage maintenant que scoresSecrets est (théoriquement) false
         mettreAJourScoresAffichage();

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
        // Met à jour l'affichage avec les rangs
        mettreAJourScoresAffichage();
        demarrerSequenceReveal();
    }
}


// --- FONCTIONS GRAPHIQUE ---

function genererCouleurAleatoire() {
    const couleurs = [ '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#8036EB', '#FFAB91', '#81D4FA', '#FFF59D', '#A5D6A7' ];
    let couleursPrises = joueurs.map(j => j.couleur.toUpperCase()); let couleurDispo = couleurs.find(c => !couleursPrises.includes(c));
    if (couleurDispo) { return couleurDispo; } return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}
function creerGraphique() {
    if (monGraphique) { monGraphique.destroy(); }
    // Utilise la liste 'joueurs' globale qui est mise à jour par Firebase
    const datasets = joueurs.map((joueur, index) => ({ label: joueur.nom, data: [0], borderColor: joueur.couleur, backgroundColor: joueur.couleur + '33', fill: false, tension: 0.1 }));
    monGraphique = new Chart(canvasGraphique, { type: 'line', data: { labels: ['Manche 0'], datasets: datasets }, options: { responsive: true, plugins: { legend: { position: 'top' }, title: { display: false } }, scales: { y: { title: { display: true, text: 'Points' } }, x: { title: { display: true, text: 'Manches' } } } } });
     // Ajoute les points existants si on rejoint une partie en cours
     if(mancheActuelle > 0 && joueurs.length > 0) {
        let scoreCumules = new Array(joueurs.length).fill(0);
         for (let i = 0; i < mancheActuelle; i++) {
             if(monGraphique.data.labels.length <= i + 1) { monGraphique.data.labels.push(`Manche ${i + 1}`); }
             joueurs.forEach((joueur, index) => {
                 const scoreDeCeTour = joueur.scoresTour[i] || 0;
                 scoreCumules[index] += scoreDeCeTour;
                 if(monGraphique.data.datasets[index]) { // Vérifie si dataset existe
                    monGraphique.data.datasets[index].data[i+1] = scoreCumules[index];
                 }
             });
         }
         const maxDataLength = Math.max(...monGraphique.data.datasets.map(d => d.data.length));
         while(monGraphique.data.labels.length < maxDataLength) { monGraphique.data.labels.push(`Manche ${monGraphique.data.labels.length}`); }
         monGraphique.update();
     }
}
function mettreAJourGraphique() {
     if (!monGraphique) { return; }
     // Utilise la variable globale 'mancheActuelle' mise à jour par Firebase
     const labelManche = 'Manche ' + mancheActuelle;
     if (!monGraphique.data.labels.includes(labelManche) && mancheActuelle > 0) {
         monGraphique.data.labels.push(labelManche);
     }
     // Utilise la liste 'joueurs' globale mise à jour par Firebase
     joueurs.forEach((joueur, index) => {
          if(monGraphique.data.datasets[index]) {
            // Utilise 'scoreTotal' mis à jour par Firebase
             monGraphique.data.datasets[index].data[mancheActuelle] = joueur.scoreTotal;
          }
     });
     // Ne met à jour que si le graphique est visible
     if (!scoresSecrets) {
         monGraphique.update();
     }
}


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

// Initialise les couleurs par défaut pour rejoindre/créer
couleurCreateurInput.value = genererCouleurAleatoire();
couleurRejoindreInput.value = genererCouleurAleatoire();
