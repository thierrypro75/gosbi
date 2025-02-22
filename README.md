# GOSBI Management System

Un système de gestion moderne développé avec React et Supabase, offrant une interface utilisateur intuitive pour la gestion des produits, des ventes et le suivi des performances via un tableau de bord.

## 📑 Table des Matières
- [Technologies Utilisées](#-technologies-utilisées)
- [Architecture](#-architecture)
- [Configuration Requise](#-configuration-requise)
- [Installation](#-installation)
- [Fonctionnalités](#-fonctionnalités)
- [Structure du Projet](#-structure-du-projet)
- [Scripts Disponibles](#-scripts-disponibles)
- [Contribution](#-contribution)
- [License](#-license)

## 🚀 Technologies Utilisées

### Frontend
- **React 18.3.1** - Bibliothèque UI principale
- **TypeScript 5.5.3** - Typage statique
- **Vite 5.4.2** - Bundler et serveur de développement
- **TailwindCSS 3.4.1** - Framework CSS utilitaire
- **React Router 6.22.1** - Routage côté client
- **React Query 5.24.1** - Gestion de l'état et des requêtes
- **Recharts 2.12.1** - Bibliothèque de visualisation de données
- **React Hot Toast 2.4.1** - Système de notifications
- **Zod 3.22.4** - Validation des schémas de données
- **React Hook Form** - Gestion des formulaires
- **RSuite** - Composants UI
- **Date-fns** - Manipulation des dates
- **PapaParse** - Parsing CSV

### Backend & Services
- **Supabase 2.39.7**
  - Authentication
  - Base de données PostgreSQL
  - Stockage de fichiers
  - Fonctions Edge

## 🏗 Architecture

### Structure des Données
- **Users**: Gestion des utilisateurs et authentification
- **Products**: Catalogue de produits avec gestion des stocks
- **Sales**: Transactions et historique des ventes
- **Analytics**: Métriques et rapports

### Sécurité
- Authentification JWT via Supabase
- Protection des routes avec PrivateRoute
- Validation des données côté client et serveur
- Gestion sécurisée des sessions

## 🛠 Configuration Requise

- Node.js 18.x ou supérieur
- npm 8.x ou supérieur
- Compte Supabase

## 📥 Installation

1. **Cloner le repository**
   ```bash
   git clone https://github.com/votre-username/gosbi.git
   cd gosbi
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration de l'environnement**
   Créez un fichier `.env` avec:
   ```
   VITE_SUPABASE_URL=votre_url_supabase
   VITE_SUPABASE_ANON_KEY=votre_clé_anon_supabase
   ```

4. **Démarrer l'application**
   ```bash
   npm run dev
   ```

## 🎯 Fonctionnalités

### Module d'Authentification
- Connexion/Déconnexion
- Réinitialisation de mot de passe
- Gestion de session persistante
- Protection des routes privées

### Dashboard
- Vue d'ensemble des KPIs
- Graphiques de performance
- Statistiques en temps réel
- Filtres temporels

### Gestion des Produits
- CRUD complet des produits
- Gestion des stocks
- Catégorisation
- Import/Export CSV
- Historique des modifications

### Gestion des Ventes
- Enregistrement des transactions
- Historique détaillé
- Rapports personnalisables
- Analyse des tendances
- Export des données

## 📁 Structure du Projet

```
gosbi/
├── src/
│   ├── components/          # Composants réutilisables
│   │   ├── common/         # Composants génériques
│   │   ├── products/       # Composants liés aux produits
│   │   ├── sales/          # Composants liés aux ventes
│   │   └── stock/          # Composants de gestion des stocks
│   ├── contexts/           # Contextes React
│   │   └── AuthContext     # Gestion de l'authentification
│   ├── lib/                # Utilitaires et configurations
│   │   ├── supabase.ts     # Configuration Supabase
│   │   └── utils/          # Fonctions utilitaires
│   ├── pages/              # Pages principales
│   │   ├── Dashboard.tsx   # Tableau de bord
│   │   ├── Login.tsx       # Page de connexion
│   │   ├── Products.tsx    # Gestion des produits
│   │   ├── Sales.tsx       # Gestion des ventes
│   │   └── ResetPassword.tsx # Réinitialisation mot de passe
│   ├── App.tsx             # Configuration des routes
│   └── main.tsx           # Point d'entrée
└── ...
```

## 🔧 Scripts Disponibles

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Compile pour la production
- `npm run preview` - Prévisualise la version de production
- `npm run lint` - Vérifie le code avec ESLint

## 🤝 Contribution

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

### Guidelines de Contribution
- Suivre les conventions de code existantes
- Ajouter des tests pour les nouvelles fonctionnalités
- Mettre à jour la documentation
- Utiliser des messages de commit conventionnels

## 📝 License

Ce projet est sous licence [MIT](LICENSE).

---

Développé avec ❤️ pour GOSBI 