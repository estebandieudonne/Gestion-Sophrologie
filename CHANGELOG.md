# Changelog – Gestion Sophrologie

Ce projet suit les recommandations de **Keep a Changelog**  et utilise le versionnement **SemVer**.

---

## [1.3.0]

### Ajouté 
- Informations sur la licence GPLv3 + contact

---

## [1.2.0]

### Corrigé 
- Bug d'interligne (0.8 → 1.2)

---

## [1.1.0]

### Ajouté
- Champs de saisie détail des exercices/sophronisations
- Gestion des facturations
- Informations diverses sur l'application 
- Synthèse du protocole
- Boîte de dialogue confirmation suppression d'exercice ou sophronisation
- Fonction réinitialiser la base de données
- Gestion automatique des backups (sauvegardes)

### Modifié
- Déplacement des paramètres
- Styles CSS / mise en page
- Style d'impression
- Sauvegarde avec le bouton `Visualiser` dans l'onglet de séances

### Corrigé
- Renommage correct de `server.exe` en `GS-server.exe`
- Bug lié à la suppression des exercices et sophronisations
- Bug de visualisation de l'anamnèse

---

## [1.0.9] – 2025-11-30

### Ajouté
- Première intégration fonctionnelle de `server.exe`.
- Splash screen.
- Single Instance Lock.
- Architecture stable d’échange entre Electron et le serveur.
- Routine sécurisée `stopServerIfOwned()` pour fermer proprement le serveur.

### Corrigé
- Plusieurs erreurs de lancement en build.
- Erreur “A JavaScript error occurred”.
- Erreur “Error launching app”.

---

## Versions < 1.0.9
Versions expérimentales (instables).

---

# Légende des catégories

### **Ajouté**
Nouvelle fonctionnalité ou élément introduit dans l'application.

### **Modifié**
Changement dans une fonctionnalité existante (amélioration, refactor, comportement différent).

### **Corrigé**
Bug corrigé, erreur résolue, crash éliminé.

### **Supprimé**
Fonctionnalité retirée de l’application.

### **Déprécié**
Fonctionnalité encore disponible mais prévue pour être retirée plus tard.

### **Sécurité**
Correctifs liés à la sécurité (vulnérabilités, failles, permissions).

