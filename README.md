<p align="center">
  <img src="images/banner.png" alt="Gestion Sophrologie" width="700">
</p>

# Gestion Sophrologie

Application de gestion pour sophrologues, développée par un lycéen.

🌐 Site officiel :
[https://gestionsophrologie.netlify.app](https://gestionsophrologie.netlify.app)

📦 Dépôt GitHub :
[https://github.com/estebandieudonne/Gestion-Sophrologie](https://github.com/estebandieudonne/Gestion-Sophrologie)

---

## Soutien

Si vous appréciez mon travail, votre soutien via un don sur Ko-fi serait grandement apprécié ! Merci infiniment.

<a href="https://ko-fi.com/estebandieudonne" >
  <img src="images/support_me_on_kofi_badge_red.png" alt="Support me on Ko-fi" width="150" />
</a>

## Aperçu

La sophrologie est une méthode de relaxation combinant respiration, relaxation et visualisation pour améliorer le bien-être et la gestion du stress.

Les sophrologues doivent gérer :

* les informations des clients
* le suivi des séances
* les notes et observations
* l'organisation des rendez-vous

Cette application permet **une organisation simple et efficace**, conçue spécifiquement pour les sophrologues.

Elle est basée sur Electron et un serveur python qui enregistre les données localement dans un fichier json, tout en conservant des backups.
Elle fonctionne entièrement hors-ligne.

---

## Fonctionnalités

* 👤 Gestion des clients
* 🧘 Suivi des séances de sophrologie
* 📝 Notes et informations associées aux clients
* 📂 Organisation des données liées à l'activité
* ⚡ Interface simple et rapide à utiliser

---

## Téléchargement

Vous pouvez télécharger l'application depuis le site officiel :
👉 [https://gestionsophrologie.netlify.app](https://gestionsophrologie.netlify.app)

---

## Installation (depuis le code source)

La compilation de l'application en exécutable se fait via `electron-builder`.

**Prérequis :** Node.js et npm installés

```bash
# Cloner le projet
git clone https://github.com/estebandieudonne/Gestion-Sophrologie.git
cd Gestion-Sophrologie

# Installer les dépendances
npm install

# Builder l'application
npm run dist
```

### Tester avant de builder

Dans le fichier `main.js` :
```bash
# Décommenter la ligne 90
//const exePath = path.join(__dirname, 'app', 'GS-Server.exe');

# Commenter la ligne 89
const exePath = path.join(process.resourcesPath, 'GS-Server.exe');
```

Puis ouvrez votre terminal ou CMD et tapez :
```bash
# Emplacement de votre copie du dépôt GitHub sur votre ordinateur
cd Gestion-Sophrologie

# Lance l'application Electron en mode développement
npx electron .
```

### Builder GS-Server.py en exécutable

Après vos modifications, ouvrez votre terminal ou CMD et tapez :
```bash
# Emplacement de votre copie du dépôt GitHub sur votre ordinateur
cd Gestion-Sophrologie

# Installation de pyinstaller
pip install pyinstaller

# Builder GS-Server.py
pyinstaller.exe --onefile --noconsole --icon="app\icon.ico" --hidden-import=flask --hidden-import=flask_cors GS-Server.py
```

---

## Contribution

Les contributions sont les bienvenues !

* Proposer des améliorations
* Signaler des bugs
* Suggérer de nouvelles fonctionnalités
* Améliorer la documentation

Pour contribuer :

1. Fork le projet 
2. Créez une branche
3. Faites vos modifications
4. Proposez une Pull Request

---

## Licence

Ce projet est sous licence **GNU General Public License v3.0**.

Cela signifie que vous êtes libre de :

* utiliser
* modifier
* redistribuer

le logiciel, tant que vous respectez les conditions de la licence.

[Voir le fichier LICENSE pour plus d'informations ↗](LICENSE)  
[En savoir plus sur la GPL v3 ↗](https://www.gnu.org/licenses/gpl-3.0.html)

---

## Auteur

Développé par **Esteban Dieudonné**, lycéen.  
GitHub : [https://github.com/estebandieudonne](https://github.com/estebandieudonne)  
Contact : [gestionsophrologie@gmail.com](mailto:gestionsophrologie@gmail.com)

---

## Remerciements

Merci aux sophrologues qui utilisent l'application et donnent des retours pour améliorer le projet.
