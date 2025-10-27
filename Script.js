// --- VARIABLES GLOBALES ---
let joueurs = []; // { nom, scoreTotal, scoresTour, scoreRelatifPivot }
let scoresSecrets = false; 
let mancheActuelle = 0;
let lowScoreWins = true; 
let monGraphique = null; 

let conditionsArret = {
    score_limite: { active: false, valeur: 0 },       
    score_relatif: { active: false, valeur: 0 }, 
    manche_total: { active: false, mancheCible: 0 },  
    manche_restante: { active: false, mancheCible: 0 } 
};

// Mappage des types de data aux ID des inputs
const inputIdMap = {
    'score_limite': 'score-limite',
    'score_relatif': 'score-relatif',
    'manche_total': 'nb-manches-total',
    'manche_restante': 'nb-manches-restantes'
};

// --- SÉLECTION DES ÉLÉMENTS HTML ---
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

// SÉLECTEURS DES COMPTEURS
const manchesPasseesAffichage = document.getElementById('manches-passees');
const manchesRestantesAffichageDiv = document.getElementById('manches-restantes-affichage');
const manchesRestantesAffichage = document.getElementById('manches-restantes');
const pointsRestantsAffichageDiv = document.getElementById('points-restants-affichage');
const pointsRestantsAffichage = document.getElementById('points-restants');               

// SÉLECTEURS DES OPTIONS DE FIN
const conditionCheckboxes = document.querySelectorAll('.condition-checkbox');
const scoreLimiteInput = document.getElementById('score-limite');
const scoreRelatifInput = document.getElementById('score-relatif');
const nbManchesTotalInput = document.getElementById('nb-manches-total');
const nbManchesRestantesInput = document.getElementById('nb-manches-restantes');


// --- FONCTIONS UTILITAIRES ---

function mettreAJourListeJoueurs() { 
    listeJoueursConf.innerHTML = ''; 
    if (joueurs.length === 0) {
        listeJoueursConf.innerHTML = '<p>Ajoutez au moins deux joueurs pour commencer.</p>';
        return;
    }
    joueurs.forEach((joueur) => {
        const tag = document.createElement('span');
        tag.className = 'joueur-tag';
        tag.textContent = joueur.nom;
        listeJoueursConf.appendChild(tag);
    });
}

function verifierPeutDemarrer() { 
    demarrerBouton.disabled = joueurs.length < 2;
}

function genererChampsSaisie() { 
    saisiePointsDiv.innerHTML = ''; 
    joueurs.forEach((joueur, index) => {
        const div = document.createElement('div');
        div.className = 'saisie-item';
        div.innerHTML = `
            <label for="score-${index}">${joueur.nom} :</label>
            <input type="number" id="score-${index}" value="0">
        `;
        saisiePointsDiv.appendChild(div);
    });
}

function mettreAJourScoresAffichage() { 
    scoreAffichageDiv.innerHTML = ''; 

    const classement = [...joueurs].sort((a, b) => {
        return lowScoreWins ? a.scoreTotal - b.scoreTotal : b.scoreTotal - a.scoreTotal;
    });

    let html = '<table class="classement-table">';
    html += '<thead><tr><th>#</th><th>Joueur</th><th>Total</th></tr></thead>';
    html += '<tbody>';
    classement.forEach((joueur, index) => {
        const rang = index + 1;
        let affichageScore;
        let classeScore = 'score-total';
        
        if (scoresSecrets) {
            affichageScore = '???';
        } else {
            affichageScore = `${joueur.scoreTotal} pts`;
        }
        
        html += `
            <tr>
                <td>${rang}</td>
                <td>${joueur.nom}</td>
                <td class="${classeScore}">${affichageScore}</td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    scoreAffichageDiv.innerHTML = html;
}

function mettreAJourCompteurs() {
    manchesPasseesAffichage.textContent = mancheActuelle;
    let restantesManches = Infinity;
    let afficherManchesRestantes = false;
    if (conditionsArret.manche_total.active) {
        const totalManches = conditionsArret.manche_total.mancheCible;
        restantesManches = Math.max(0, totalManches - mancheActuelle);
        afficherManchesRestantes = true;
    } 
    if (conditionsArret.manche_restante.active) {
        const mancheCible = conditionsArret.manche_restante.mancheCible;
        const restantesDynamiques = Math.max(0, mancheCible - mancheActuelle);
        restantesManches = Math.min(restantesManches, restantesDynamiques);
        afficherManchesRestantes = true;
    }
    if (afficherManchesRestantes) {
        manchesRestantesAffichage.textContent = restantesManches;
        manchesRestantesAffichageDiv.classList.remove('cache');
    } else {
        manchesRestantesAffichageDiv.classList.add('cache');
    }
    let pointsMinRestants = Infinity;
    let afficherPointsRestants = false;
    if (conditionsArret.score_limite.active) {
        const scoreMax = Math.max(...joueurs.map(j => j.scoreTotal));
        const restantsAbsolu = Math.max(0, conditionsArret.score_limite.valeur - scoreMax);
        pointsMinRestants = Math.min(pointsMinRestants, restantsAbsolu);
        afficherPointsRestants = true;
    }
    if (conditionsArret.score_relatif.active) {
        joueurs.forEach(joueur => {
            let limiteCible = (joueur.scoreRelatifPivot || 0) + conditionsArret.score_relatif.valeur;
            const restantsRelatif = Math.max(0, limiteCible - joueur.scoreTotal);
            pointsMinRestants = Math.min(pointsMinRestants, restantsRelatif);
        });
        afficherPointsRestants = true;
    }
    if (afficherPointsRestants) {
        pointsRestantsAffichage.textContent = pointsMinRestants;
        pointsRestantsAffichageDiv.classList.remove('cache');
    } else {
        pointsRestantsAffichageDiv.classList.add('cache');
    }
}

function verifierConditionsArret() {
    if (validerTourBouton.disabled) return; 
    let doitTerminer = false;
    if (conditionsArret.score_limite.active && conditionsArret.score_limite.valeur > 0) {
        if (joueurs.some(j => j.scoreTotal >= conditionsArret.score_limite.valeur)) {
            doitTerminer = true;
        }
    }
    if (conditionsArret.score_relatif.active && conditionsArret.score_relatif.valeur > 0) {
        joueurs.forEach(joueur => {
            let limiteCible = (joueur.scoreRelatifPivot || 0) + conditionsArret.score_relatif.valeur;
            if (joueur.scoreTotal >= limiteCible) {
                doitTerminer = true;
            }
        });
    }
    if (conditionsArret.manche_total.active && mancheActuelle >= conditionsArret.manche_total.mancheCible && conditionsArret.manche_total.mancheCible > 0) {
        doitTerminer = true;
    }
    if (conditionsArret.manche_restante.active && mancheActuelle >= conditionsArret.manche_restante.mancheCible && conditionsArret.manche_restante.mancheCible > 0) {
        doitTerminer = true;
    }
    if (doitTerminer) {
        terminerPartie();
    }
}

function afficherPodium() { 
    scoreEcran.classList.add('cache');
    podiumEcran.classList.remove('cache');
    
    const classementFinal = [...joueurs].sort((a, b) => {
        return lowScoreWins ? a.scoreTotal - b.scoreTotal : b.scoreTotal - a.scoreTotal;
    });

    let html = '<table><thead><tr><th>Rang</th><th>Joueur</th><th>Score Final</th></tr></thead><tbody>';
    classementFinal.forEach((joueur, index) => {
        const rang = index + 1;
        let classePodium = '';
        let medaille = '';
        if (rang === 1) { medaille = '🥇'; classePodium = 'rang-1'; }
        else if (rang === 2) { medaille = '🥈'; classePodium = 'rang-2'; }
        else if (rang === 3) { medaille = '🥉'; classePodium = 'rang-3'; }
        html += `
            <tr class="podium-item ${classePodium}">
                <td>${medaille} Rang ${rang}</td>
                <td>${joueur.nom}</td>
                <td>${joueur.scoreTotal} pts</td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    document.getElementById('podium-affichage').innerHTML = html;

    // Déplacement du graphique
    const graphContainer = document.querySelector('.graphique-container');
    const graphPlaceholder = document.getElementById('graphique-final-container');
    
    if (graphContainer && graphPlaceholder) {
        graphPlaceholder.innerHTML = ''; // Vide l'ancien (si nouvelle partie)
        graphPlaceholder.appendChild(graphContainer); // Déplace le graphique
    }
}

/**
 * MODIFIÉ - Simplifié pour juste révéler le graphique
 */
function terminerPartie() {
    validerTourBouton.disabled = true;
    arreterMaintenantBouton.disabled = true;
    
    // On récupère le conteneur du graphique
    const graphContainer = document.querySelector('.graphique-container');

    // S'il était caché, on le révèle pour le podium
    if (graphContainer) { 
        graphContainer.classList.remove('cache');
    }

    if (scoresSecrets) {
        scoresSecrets = false; 
        mettreAJourScoresAffichage();
        
        // Plus besoin de reconstruire le graphique, 
        // il s'est mis à jour en arrière-plan.
        
        alert("FIN DE PARTIE : Les scores secrets sont révélés !");
        setTimeout(afficherPodium, 100); 
    } else {
        afficherPodium();
    }
}


// --- FONCTIONS GRAPHIQUE ---

function genererCouleur(index) {
    const couleurs = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#E7E9ED', '#8036EB'
    ];
    return couleurs[index % couleurs.length];
}

function creerGraphique() {
    if (monGraphique) {
        monGraphique.destroy(); 
    }

    const datasets = joueurs.map((joueur, index) => ({
        label: joueur.nom,
        data: [0], 
        borderColor: genererCouleur(index),
        backgroundColor: genererCouleur(index) + '33', 
        fill: false,
        tension: 0.1 
    }));

    monGraphique = new Chart(canvasGraphique, {
        type: 'line',
        data: {
            labels: ['Manche 0'], 
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: false }
            },
            scales: {
                y: { title: { display: true, text: 'Points' } },
                x: { title: { display: true, text: 'Manches' } }
            }
        }
    });
}

/**
 * MODIFIÉ - Logique d'actualisation simplifiée
 */
function mettreAJourGraphique() {
    // Ne fait rien si le graphique n'est pas initialisé
    if (!monGraphique) {
        return; 
    }
    
    // Le graphique se met à jour (en mémoire) même s'il est caché
    // par la classe .cache sur son conteneur.

    monGraphique.data.labels.push('Manche ' + mancheActuelle);
    joueurs.forEach((joueur, index) => {
         monGraphique.data.datasets[index].data.push(joueur.scoreTotal);
    });

    monGraphique.update(); // Redessine le graphique (même si caché)
}


// --- GESTION DES ÉVÉNEMENTS ---

// 1. Gère l'activation/désactivation des inputs numériques
conditionCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        const type = e.target.dataset.type;
        const inputId = inputIdMap[type];
        const input = document.getElementById(inputId);
        if (input) { input.disabled = !checkbox.checked; }
        mettreAJourConditionsArret();
        mettreAJourCompteurs();
    });
});

// 2. Mise à jour si l'utilisateur change une valeur numérique
[scoreLimiteInput, scoreRelatifInput, nbManchesTotalInput, nbManchesRestantesInput].forEach(input => {
    input.addEventListener('change', () => {
        mettreAJourConditionsArret();
        mettreAJourCompteurs();
    });
});

function mettreAJourConditionsArret() {
    for (const key in conditionsArret) {
        conditionsArret[key].active = false;
    }
    document.querySelectorAll('.condition-checkbox:checked').forEach(checkbox => {
        const type = checkbox.dataset.type;
        conditionsArret[type].active = true;
        const inputId = inputIdMap[type];
        const inputElement = document.getElementById(inputId);
        const valeur = parseInt(inputElement.value, 10) || 0;
        if (type === 'score_limite') {
            conditionsArret.score_limite.valeur = valeur;
        } else if (type === 'score_relatif') {
            conditionsArret[type].valeur = valeur;
            joueurs.forEach(j => { j.scoreRelatifPivot = j.scoreTotal; });
        } else if (type === 'manche_total') {
            conditionsArret.manche_total.mancheCible = valeur;
        } else if (type === 'manche_restante') {
            conditionsArret.manche_restante.mancheCible = mancheActuelle + valeur;
        }
    });
}


// 3. Gère l'ajout d'un joueur
ajouterBouton.addEventListener('click', () => {
    const nom = nomJoueurInput.value.trim();
    if (nom && !joueurs.some(j => j.nom === nom)) { 
        joueurs.push({ nom: nom, scoreTotal: 0, scoresTour: [], scoreRelatifPivot: 0 });
        nomJoueurInput.value = ''; 
        mettreAJourListeJoueurs();
        verifierPeutDemarrer();
    } else if (joueurs.some(j => j.nom === nom)) {
        alert(`Le joueur "${nom}" existe déjà !`);
    }
});
nomJoueurInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { ajouterBouton.click(); }
});


/**
 * MODIFIÉ - Gère la visibilité du graphique au démarrage
 */
demarrerBouton.addEventListener('click', () => { 
    if (joueurs.length < 2) return;
    
    scoresSecrets = modeSecretConfig.checked;
    
    const victoireChoix = document.querySelector('input[name="condition-victoire"]:checked').value;
    lowScoreWins = (victoireChoix === 'low');
    
    mancheActuelle = 0;
    
    joueurs.forEach(j => {
        j.scoreTotal = 0;
        j.scoresTour = [];
        j.scoreRelatifPivot = 0;
    });

    // --- Gestion de la visibilité et position du graphique ---
    const graphContainer = document.querySelector('.graphique-container');
    const graphOriginalParent = document.querySelector('.score-gauche'); 
    const inputTourDiv = document.querySelector('.input-tour');
    
    // Replace le graphique dans l'écran de score (au cas où on rejoue)
    if (graphContainer && graphOriginalParent && inputTourDiv) {
        // Insère le graphique avant le bloc "Nouveau Tour"
        graphOriginalParent.insertBefore(graphContainer, inputTourDiv);
    }

    // Cache le CONTENEUR du graphique si le mode secret est activé
    if (scoresSecrets) {
        graphContainer.classList.add('cache');
    } else {
        graphContainer.classList.remove('cache');
    }
    // --- Fin de la gestion ---
    
    mettreAJourConditionsArret(); 
    
    configEcran.classList.add('cache');
    scoreEcran.classList.remove('cache');
    
    genererChampsSaisie();
    mettreAJourScoresAffichage(); 
    mettreAJourCompteurs(); 
    
    creerGraphique(); 
});

// 5. Gère la validation d'un tour
validerTourBouton.addEventListener('click', () => { 
    if (validerTourBouton.disabled) return; 
    mancheActuelle++; 
    joueurs.forEach((joueur, index) => {
        const inputElement = document.getElementById(`score-${index}`);
        const points = parseInt(inputElement.value, 10) || 0; 
        joueur.scoreTotal += points;
        joueur.scoresTour.push(points); 
        inputElement.value = 0;
    });
    
    mettreAJourScoresAffichage();
    mettreAJourCompteurs(); 
    mettreAJourGraphique(); // Appelle la logique (corrigée)
    
    verifierConditionsArret();
});

// 6. Gère l'arrêt manuel
arreterMaintenantBouton.addEventListener('click', terminerPartie);


// --- INITIALISATION ---
mettreAJourListeJoueurs(); 
verifierPeutDemarrer();
