// --- VARIABLES GLOBALES ---
let joueurs = []; // { nom, couleur, scoreTotal, scoresTour, scoreRelatifPivot, rang } <-- Ajout de rang
let scoresSecrets = false;
let mancheActuelle = 0;
let lowScoreWins = true;
let monGraphique = null;
let classementFinal = []; // Contiendra les joueurs avec leur rang calculé

let sequenceForceStop = false;
let currentStepSkipper = null;

let conditionsArret = {
    score_limite: { active: false, valeur: 0 },
    score_relatif: { active: false, valeur: 0 },
    manche_total: { active: false, mancheCible: 0 },
    manche_restante: { active: false, mancheCible: 0 }
};

// Mappage
const inputIdMap = {
    'score_limite': 'score-limite',
    'score_relatif': 'score-relatif',
    'manche_total': 'nb-manches-total',
    'manche_restante': 'nb-manches-restantes'
};

// --- SÉLECTION DES ÉLÉMENTS HTML ---
// (Inchangé)
const configEcran = document.getElementById('configuration-ecran');
const scoreEcran = document.getElementById('score-ecran');
const podiumEcran = document.getElementById('podium-ecran');
const nomJoueurInput = document.getElementById('nom-joueur');
const ajouterBouton = document.getElementById('ajouter-joueur');
const demarrerBouton = document.getElementById('demarrer-partie');
const listeJoueursConf = document.getElementById('liste-joueurs-conf');
const scoreAffichageDiv = document.getElementById('score-affichage');
const saisiePointsDiv = document.getElementById('saisie-points');
const validerTourBouton = document.getElementById('valider-tour');
const modeSecretConfig = document.getElementById('mode-secret-config');
const arreterMaintenantBouton = document.getElementById('arreter-maintenant');
const canvasGraphique = document.getElementById('graphique-scores');
const couleurJoueurInput = document.getElementById('couleur-joueur');
const revealEcran = document.getElementById('reveal-ecran');
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


// --- FONCTIONS UTILITAIRES ---

function pause(ms) { /* ... (inchangé) ... */
    return new Promise(resolve => {
        const timer = setTimeout(() => { currentStepSkipper = null; resolve(); }, ms);
        currentStepSkipper = () => { clearTimeout(timer); currentStepSkipper = null; resolve(); };
    });
}
function attendreFinAnimation(element) { /* ... (inchangé) ... */
    return new Promise(resolve => {
        const onAnimEnd = () => { currentStepSkipper = null; resolve(); };
        element.addEventListener('animationend', onAnimEnd, { once: true });
        currentStepSkipper = () => { element.removeEventListener('animationend', onAnimEnd); currentStepSkipper = null; resolve(); };
    });
}

/**
 * NOUVEAU : Calcule les rangs en gérant les égalités
 */
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
    return joueursTries; // Retourne la liste avec la propriété 'rang' ajoutée
}


// (Fonction retirerJoueur - Inchangée)
function retirerJoueur(index) { /* ... (inchangé) ... */
    joueurs.splice(index, 1);
    mettreAJourListeJoueurs();
    verifierPeutDemarrer();
 }
// (Fonction mettreAJourListeJoueurs - Inchangée)
function mettreAJourListeJoueurs() { /* ... (inchangé) ... */
    listeJoueursConf.innerHTML = '';
    if (joueurs.length === 0) { listeJoueursConf.innerHTML = '<p>Ajoutez au moins deux joueurs pour commencer.</p>'; return; }
    joueurs.forEach((joueur, index) => {
        const tag = document.createElement('div'); tag.className = 'joueur-tag';
        const swatch = document.createElement('span'); swatch.className = 'joueur-couleur-swatch'; swatch.style.backgroundColor = joueur.couleur;
        const nom = document.createElement('span'); nom.textContent = joueur.nom;
        const retirerBtn = document.createElement('button'); retirerBtn.className = 'bouton-retirer'; retirerBtn.innerHTML = '&times;'; retirerBtn.title = `Retirer ${joueur.nom}`;
        retirerBtn.addEventListener('click', () => { retirerJoueur(index); });
        tag.appendChild(swatch); tag.appendChild(nom); tag.appendChild(retirerBtn); listeJoueursConf.appendChild(tag);
    });
}
// (Fonction verifierPeutDemarrer - Inchangée)
function verifierPeutDemarrer() { /* ... (inchangé) ... */ demarrerBouton.disabled = joueurs.length < 2; }
// (Fonction genererChampsSaisie - Inchangée)
function genererChampsSaisie() { /* ... (inchangé) ... */
    saisiePointsDiv.innerHTML = '';
    joueurs.forEach((joueur, index) => {
        const div = document.createElement('div'); div.className = 'saisie-item';
        div.innerHTML = ` <label for="score-${index}"> <span class="score-couleur-swatch" style="background-color: ${joueur.couleur};"></span> ${joueur.nom} : </label> <input type="number" id="score-${index}" value="0"> `;
        saisiePointsDiv.appendChild(div);
    });
}

/**
 * MODIFIÉ : Utilise le rang calculé si non secret
 */
function mettreAJourScoresAffichage() {
    scoreAffichageDiv.innerHTML = '';
    let listePourAffichage = [];

    // On recalcule les rangs uniquement si on n'est pas en mode secret
    if (!scoresSecrets) {
        let joueursTries = [...joueurs].sort((a, b) => {
            return lowScoreWins ? a.scoreTotal - b.scoreTotal : b.scoreTotal - a.scoreTotal;
        });
        listePourAffichage = calculerRangs(joueursTries); // Ajoute la propriété 'rang'
    } else {
        listePourAffichage = joueurs; // Pas de tri, pas de rangs
    }

    let html = '<table class="classement-table">';
    html += '<thead><tr><th>#</th><th>Joueur</th><th>Total</th></tr></thead>';
    html += '<tbody>';

    listePourAffichage.forEach((joueur) => { // Pas besoin d'index ici
        // Utilise le rang calculé s'il existe, sinon '-'
        const rangAffichage = joueur.rang && !scoresSecrets ? joueur.rang : '-';

        html += `
            <tr>
                <td>${rangAffichage}</td>
                <td>
                    <span class="score-couleur-swatch" style="background-color: ${joueur.couleur};"></span>
                    ${joueur.nom}
                </td>
                <td class="score-total">${scoresSecrets ? '???' : `${joueur.scoreTotal} pts`}</td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    scoreAffichageDiv.innerHTML = html;
}


// (Fonctions mettreAJourCompteurs, verifierConditionsArret - Inchangées)
function mettreAJourCompteurs() { /* ... (inchangé) ... */
    manchesPasseesAffichage.textContent = mancheActuelle;
    let restantesManches = Infinity; let afficherManchesRestantes = false;
    if (conditionsArret.manche_total.active) { const totalManches = conditionsArret.manche_total.mancheCible; restantesManches = Math.max(0, totalManches - mancheActuelle); afficherManchesRestantes = true; }
    if (conditionsArret.manche_restante.active) { const mancheCible = conditionsArret.manche_restante.mancheCible; const restantesDynamiques = Math.max(0, mancheCible - mancheActuelle); restantesManches = Math.min(restantesManches, restantesDynamiques); afficherManchesRestantes = true; }
    if (afficherManchesRestantes) { manchesRestantesAffichage.textContent = restantesManches; manchesRestantesAffichageDiv.classList.remove('cache'); } else { manchesRestantesAffichageDiv.classList.add('cache'); }
    let pointsMinRestants = Infinity; let afficherPointsRestants = false;
    if (conditionsArret.score_limite.active) { const scoreMax = Math.max(...joueurs.map(j => j.scoreTotal)); const restantsAbsolu = Math.max(0, conditionsArret.score_limite.valeur - scoreMax); pointsMinRestants = Math.min(pointsMinRestants, restantsAbsolu); afficherPointsRestants = true; }
    if (conditionsArret.score_relatif.active) { joueurs.forEach(joueur => { let limiteCible = (joueur.scoreRelatifPivot || 0) + conditionsArret.score_relatif.valeur; const restantsRelatif = Math.max(0, limiteCible - joueur.scoreTotal); pointsMinRestants = Math.min(pointsMinRestants, restantsRelatif); }); afficherPointsRestants = true; }
    if (afficherPointsRestants) { pointsRestantsAffichage.textContent = pointsMinRestants; pointsRestantsAffichageDiv.classList.remove('cache'); } else { pointsRestantsAffichageDiv.classList.add('cache'); }
}
function verifierConditionsArret() { /* ... (inchangé) ... */
    if (validerTourBouton.disabled) return; let doitTerminer = false;
    if (conditionsArret.score_limite.active && conditionsArret.score_limite.valeur > 0) { if (joueurs.some(j => j.scoreTotal >= conditionsArret.score_limite.valeur)) { doitTerminer = true; } }
    if (conditionsArret.score_relatif.active && conditionsArret.score_relatif.valeur > 0) { joueurs.forEach(joueur => { let limiteCible = (joueur.scoreRelatifPivot || 0) + conditionsArret.score_relatif.valeur; if (joueur.scoreTotal >= limiteCible) { doitTerminer = true; } }); }
    if (conditionsArret.manche_total.active && mancheActuelle >= conditionsArret.manche_total.mancheCible && conditionsArret.manche_total.mancheCible > 0) { doitTerminer = true; }
    if (conditionsArret.manche_restante.active && mancheActuelle >= conditionsArret.manche_restante.mancheCible && conditionsArret.manche_restante.mancheCible > 0) { doitTerminer = true; }
    if (doitTerminer) { terminerPartie(); }
}

/**
 * MODIFIÉ : Utilise les rangs calculés pour remplir le podium et la liste
 */
function construirePodiumFinal() {
    currentStepSkipper = null;
    const podiumMap = {
        1: document.getElementById('podium-1'),
        2: document.getElementById('podium-2'),
        3: document.getElementById('podium-3')
    };

    // Réinitialise les blocs podium (enlève 'cache' si ajouté précédemment)
    Object.values(podiumMap).forEach(el => el.classList.remove('cache'));

    // Trouve les joueurs pour chaque place (peuvent être plusieurs en cas d'égalité)
    const premier = classementFinal.filter(j => j.rang === 1);
    const deuxieme = classementFinal.filter(j => j.rang === 2);
    const troisieme = classementFinal.filter(j => j.rang === 3);

    // Fonction pour remplir un bloc podium
    const remplirPlace = (element, joueursPlace) => {
        if (joueursPlace.length > 0) {
            // Prend le premier joueur pour la couleur et le score (ils sont identiques)
            const joueurRef = joueursPlace[0];
            // Liste tous les noms
            const noms = joueursPlace.map(j => j.nom).join(' & ');
            element.querySelector('.podium-nom').textContent = noms;
            element.querySelector('.podium-score').textContent = `${joueurRef.scoreTotal} pts`;
            element.style.borderColor = joueurRef.couleur;
            element.style.boxShadow = `0 0 15px ${joueurRef.couleur}80`;
        } else {
            element.classList.add('cache'); // Cache la place si personne n'a ce rang
        }
    };

    remplirPlace(podiumMap[1], premier);
    remplirPlace(podiumMap[2], deuxieme);
    remplirPlace(podiumMap[3], troisieme);

    // Remplit la liste des "autres joueurs" (rang 4+)
    const autresListe = document.getElementById('autres-joueurs-liste');
    autresListe.innerHTML = '';
    const autresJoueurs = classementFinal.filter(j => j.rang > 3); // Sélectionne par rang

    if(autresJoueurs.length === 0) {
        document.getElementById('autres-joueurs').classList.add('cache');
    } else {
        document.getElementById('autres-joueurs').classList.remove('cache');
        // Trie les autres joueurs par rang (même s'ils devraient déjà l'être)
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

    // Déplacement du graphique
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

/**
 * MODIFIÉ : Utilise le rang calculé pour l'affichage
 */
function majContenuReveal(rang, joueur, estExAequoPrecedent) {
    let rangTexte = `${rang}ème Place`;
    // Gère l'affichage pour les ex aequo et les médailles
    if (estExAequoPrecedent) {
         rangTexte = `Ex æquo ${rang}ème Place`;
    }
    if (rang === 3) rangTexte = `🥉 ${estExAequoPrecedent ? 'Ex æquo ' : ''}3ème Place`;
    if (rang === 1) rangTexte = `🥇 GAGNANT ${estExAequoPrecedent ? 'Ex æquo ' : ''}!`;


    revealRang.textContent = rangTexte;
    revealNom.textContent = joueur.nom;
    revealNom.style.color = joueur.couleur;
    revealScore.textContent = `${joueur.scoreTotal} points`;

    revealContent.classList.remove('is-revealed');
}


/**
 * MODIFIÉ : Utilise les rangs et gère l'affichage ex aequo
 */
async function demarrerSequenceReveal() {
    scoreEcran.classList.add('cache');
    revealEcran.classList.remove('cache');

    // Le classementFinal contient maintenant les joueurs triés AVEC leur rang calculé
    // classementFinal = calculerRangs([...joueurs].sort(...)); // Déjà fait dans terminerPartie

    // Crée la liste des joueurs à révéler : 5e, 4e, 3e, 1er
    let joueursAReveler = [];
    // Ajoute tous ceux qui ne sont pas 1er ou 2ème, du dernier au 3ème
    joueursAReveler.push(...classementFinal.filter(j => j.rang > 2).reverse());
    // Ajoute le(s) 1er(s)
    joueursAReveler.push(...classementFinal.filter(j => j.rang === 1));


    let rangPrecedent = null; // Pour détecter les ex aequo pendant la révélation

    // Boucle de révélation
    for (const joueur of joueursAReveler) {
        if (sequenceForceStop) return;

        // Le rang est maintenant une propriété de l'objet joueur
        const rang = joueur.rang;
        const estExAequo = (rang === rangPrecedent); // Est-ce le même rang que le précédent révélé ?

        majContenuReveal(rang, joueur, estExAequo); // Passe l'info ex aequo

        // Animations...
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

        // Glisse vers la droite (sauf pour le tout dernier joueur révélé, qui est le gagnant)
        if (joueur !== joueursAReveler[joueursAReveler.length - 1]) {
            revealContent.classList.add('slide-out-to-right');
            await attendreFinAnimation(revealContent);
            revealContent.classList.remove('slide-out-to-right', 'is-revealed');
        }

        rangPrecedent = rang; // Mémorise le rang pour la prochaine itération
    }

    // Fin de la séquence, affiche le podium
    revealEcran.classList.add('cache');
    podiumEcran.classList.remove('cache');
    construirePodiumFinal(); // Utilise classementFinal qui a les rangs
}


/**
 * MODIFIÉ : Calcule les rangs avant de lancer la séquence
 */
function terminerPartie() {
    sequenceForceStop = false;
    validerTourBouton.disabled = true;
    arreterMaintenantBouton.disabled = true;

    const graphContainer = document.querySelector('.graphique-container');
    if (graphContainer) {
        graphContainer.classList.remove('cache');
    }

     // --- ÉTAPE 1: Calculer le classement final AVEC les rangs ---
    let joueursTries = [...joueurs].sort((a, b) => {
        return lowScoreWins ? a.scoreTotal - b.scoreTotal : b.scoreTotal - a.scoreTotal;
    });
    classementFinal = calculerRangs(joueursTries); // Stocke le résultat globalement

    // --- ÉTAPE 2: Gérer le cas secret ---
    if (scoresSecrets) {
        scoresSecrets = false;
        // Met à jour l'affichage du tableau pour montrer les scores et les RANGS calculés
        mettreAJourScoresAffichage(); // Va utiliser classementFinal implicitement via le tri

        // Reconstruit le graphique car il était caché
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
        // Lance la séquence APRÈS l'alerte
        setTimeout(demarrerSequenceReveal, 100);
    } else {
        // Si pas secret, met à jour l'affichage avec les rangs
         mettreAJourScoresAffichage();
        // Lance la séquence directement
        demarrerSequenceReveal();
    }
}


// --- FONCTIONS GRAPHIQUE ---

// (Fonction genererCouleurAleatoire - Inchangée)
function genererCouleurAleatoire() { /* ... (inchangé) ... */
    const couleurs = [ '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#8036EB', '#FFAB91', '#81D4FA', '#FFF59D', '#A5D6A7' ];
    let couleursPrises = joueurs.map(j => j.couleur.toUpperCase()); let couleurDispo = couleurs.find(c => !couleursPrises.includes(c));
    if (couleurDispo) { return couleurDispo; } return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}
// (Fonction creerGraphique - Inchangée)
function creerGraphique() { /* ... (inchangé) ... */
    if (monGraphique) { monGraphique.destroy(); }
    const datasets = joueurs.map((joueur, index) => ({ label: joueur.nom, data: [0], borderColor: joueur.couleur, backgroundColor: joueur.couleur + '33', fill: false, tension: 0.1 }));
    monGraphique = new Chart(canvasGraphique, { type: 'line', data: { labels: ['Manche 0'], datasets: datasets }, options: { responsive: true, plugins: { legend: { position: 'top' }, title: { display: false } }, scales: { y: { title: { display: true, text: 'Points' } }, x: { title: { display: true, text: 'Manches' } } } } });
}
// (Fonction mettreAJourGraphique - Inchangée, le correctif précédent était OK)
function mettreAJourGraphique() { /* ... (inchangé) ... */
     if (!monGraphique) { return; }
     const labelManche = 'Manche ' + mancheActuelle;
     if (!monGraphique.data.labels.includes(labelManche)) { monGraphique.data.labels.push(labelManche); }
     joueurs.forEach((joueur, index) => {
          if(monGraphique.data.datasets[index]) {
             if (monGraphique.data.datasets[index].data.length <= mancheActuelle) { monGraphique.data.datasets[index].data.push(joueur.scoreTotal); }
             else { monGraphique.data.datasets[index].data[mancheActuelle] = joueur.scoreTotal; }
          }
     });
     // Ne pas bloquer l'update, même si caché. La reconstruction à la fin gère le visuel.
     monGraphique.update();
}


// --- GESTION DES ÉVÉNEMENTS ---

// (Activation/désactivation des inputs numériques - Inchangé)
conditionCheckboxes.forEach(checkbox => { /* ... (inchangé) ... */
    checkbox.addEventListener('change', (e) => { const type = e.target.dataset.type; const inputId = inputIdMap[type]; const input = document.getElementById(inputId); if (input) { input.disabled = !checkbox.checked; } mettreAJourConditionsArret(); mettreAJourCompteurs(); }); });
// (Mise à jour si changement de valeur numérique - Inchangé)
[scoreLimiteInput, scoreRelatifInput, nbManchesTotalInput, nbManchesRestantesInput].forEach(input => { /* ... (inchangé) ... */ input.addEventListener('change', () => { mettreAJourConditionsArret(); mettreAJourCompteurs(); }); });
// (Fonction mettreAJourConditionsArret - Inchangée)
function mettreAJourConditionsArret() { /* ... (inchangé) ... */
    for (const key in conditionsArret) { conditionsArret[key].active = false; }
    document.querySelectorAll('.condition-checkbox:checked').forEach(checkbox => { const type = checkbox.dataset.type; conditionsArret[type].active = true; const inputId = inputIdMap[type]; const inputElement = document.getElementById(inputId); const valeur = parseInt(inputElement.value, 10) || 0; if (type === 'score_limite') { conditionsArret.score_limite.valeur = valeur; } else if (type === 'score_relatif') { conditionsArret[type].valeur = valeur; joueurs.forEach(j => { j.scoreRelatifPivot = j.scoreTotal; }); } else if (type === 'manche_total') { conditionsArret.manche_total.mancheCible = valeur; } else if (type === 'manche_restante') { conditionsArret.manche_restante.mancheCible = mancheActuelle + valeur; } });
}

// (Ajout d'un joueur - CORRIGÉ)
ajouterBouton.addEventListener('click', () => {
    const nom = nomJoueurInput.value.trim();
    const couleur = couleurJoueurInput.value;

    // --- CORRECTION ---
    // 1. Vérifier d'abord si le nom est vide
    if (!nom) {
        alert("Veuillez entrer un nom de joueur !");
        nomJoueurInput.focus(); // Optionnel : remet le focus sur l'input
        return; // Arrête la fonction ici
    }

    // 2. Vérifier ensuite si le joueur existe déjà
    if (joueurs.some(j => j.nom === nom)) {
        alert(`Le joueur "${nom}" existe déjà !`);
        return; // Arrête la fonction ici
    }
    // --- FIN CORRECTION ---

    // Si tout est bon, on ajoute le joueur (code inchangé)
    joueurs.push({ nom: nom, couleur: couleur, scoreTotal: 0, scoresTour: [], scoreRelatifPivot: 0, rang: undefined });
    nomJoueurInput.value = '';
    couleurJoueurInput.value = genererCouleurAleatoire();
    mettreAJourListeJoueurs();
    verifierPeutDemarrer();
});

nomJoueurInput.addEventListener('keypress', (e) => { /* ... (inchangé) ... */ if (e.key === 'Enter') { ajouterBouton.click(); } });

// (Démarrage de la partie - Inchangé)
demarrerBouton.addEventListener('click', () => { /* ... (inchangé) ... */
    sequenceForceStop = false; if (joueurs.length < 2) return; scoresSecrets = modeSecretConfig.checked; const victoireChoix = document.querySelector('input[name="condition-victoire"]:checked').value; lowScoreWins = (victoireChoix === 'low'); mancheActuelle = 0;
    joueurs.forEach(j => { j.scoreTotal = 0; j.scoresTour = []; j.scoreRelatifPivot = 0; j.rang = undefined; }); // Nettoie le rang
    const graphContainer = document.querySelector('.graphique-container'); const graphOriginalParent = document.querySelector('.score-gauche'); const inputTourDiv = document.querySelector('.input-tour');
    if (graphContainer && graphOriginalParent && inputTourDiv) { graphOriginalParent.insertBefore(graphContainer, inputTourDiv); }
    podiumEcran.classList.add('cache'); revealEcran.classList.add('cache');
    if (scoresSecrets) { if (graphContainer) graphContainer.classList.add('cache'); } else { if (graphContainer) graphContainer.classList.remove('cache'); }
    mettreAJourConditionsArret(); configEcran.classList.add('cache'); scoreEcran.classList.remove('cache');
    genererChampsSaisie(); mettreAJourScoresAffichage(); mettreAJourCompteurs(); creerGraphique();
});

// (Validation d'un tour - Inchangé)
validerTourBouton.addEventListener('click', () => { /* ... (inchangé) ... */
    if (validerTourBouton.disabled) return; mancheActuelle++;
    joueurs.forEach((joueur, index) => { const inputElement = document.getElementById(`score-${index}`); const points = parseInt(inputElement.value, 10) || 0; joueur.scoreTotal += points; joueur.scoresTour.push(points); inputElement.value = 0; });
    mettreAJourScoresAffichage(); mettreAJourCompteurs(); mettreAJourGraphique(); verifierConditionsArret();
});

// (Arrêt manuel - Inchangé)
arreterMaintenantBouton.addEventListener('click', terminerPartie);

// (Événements de Skip - Inchangés)
revealEcran.addEventListener('click', (e) => { /* ... (inchangé) ... */ if (e.target.closest('#skip-all-btn') || e.target.closest('#reveal-content')) { return; } if (currentStepSkipper) { currentStepSkipper(); } });
skipAllBtn.addEventListener('click', () => { /* ... (inchangé) ... */ sequenceForceStop = true; if (currentStepSkipper) { currentStepSkipper(); } revealEcran.classList.add('cache'); podiumEcran.classList.remove('cache'); construirePodiumFinal(); });


// --- INITIALISATION ---
mettreAJourListeJoueurs();
verifierPeutDemarrer();
couleurJoueurInput.value = genererCouleurAleatoire();
