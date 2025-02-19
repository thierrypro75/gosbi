# GOSBI Management System

Un système de gestion moderne développé avec React et Supabase, offrant une interface utilisateur intuitive pour la gestion des produits, des ventes et le suivi des performances via un tableau de bord.

## 🚀 Technologies Utilisées

### Frontend
- React 18.3.1
- TypeScript 5.5.3
- Vite 5.4.2 (bundler)
- TailwindCSS 3.4.1 (styling)
- React Router 6.22.1 (navigation)
- React Query 5.24.1 (gestion des données)
- Recharts 2.12.1 (visualisation de données)
- React Hot Toast 2.4.1 (notifications)
- Zod 3.22.4 (validation des données)

### Backend
- Supabase 2.39.7 (Backend as a Service)

## 📁 Structure du Projet

```
gosbi/
├── src/
│   ├── components/     # Composants réutilisables
│   ├── contexts/       # Contextes React (ex: AuthContext)
│   ├── lib/           # Utilitaires et configurations
│   ├── pages/         # Pages de l'application
│   ├── App.tsx        # Composant racine
│   └── main.tsx       # Point d'entrée
├── supabase/          # Configuration Supabase
├── public/            # Ressources statiques
└── ...                # Fichiers de configuration
```

## 🛠 Configuration Requise

- Node.js (version LTS recommandée)
- npm ou yarn

## 🚦 Pour Démarrer

1. **Installation des dépendances**
   ```bash
   npm install
   ```

2. **Configuration des variables d'environnement**
   - Créez un fichier `.env` à la racine du projet
   - Ajoutez les variables nécessaires pour Supabase

3. **Lancement en développement**
   ```bash
   npm run dev
   ```

4. **Build pour la production**
   ```bash
   npm run build
   ```

## 📋 Fonctionnalités Principales

### 🔐 Authentification
- Système de connexion sécurisé via Supabase
- Gestion des sessions utilisateur
- Protection des routes

### 📊 Dashboard
- Vue d'ensemble des métriques importantes
- Graphiques et statistiques en temps réel
- Visualisation des données avec Recharts

### 📦 Gestion des Produits
- Liste des produits
- Ajout/Modification/Suppression de produits
- Gestion des stocks

### 💰 Gestion des Ventes
- Suivi des transactions
- Historique des ventes
- Rapports et analyses

## 🔧 Scripts Disponibles

- `npm run dev` : Lance l'environnement de développement
- `npm run build` : Compile le projet pour la production
- `npm run lint` : Vérifie le code avec ESLint
- `npm run preview` : Prévisualise la version de production

## 🧪 Outils de Développement

- ESLint pour la qualité du code
- TypeScript pour le typage statique
- Vite pour un développement rapide
- Tailwind CSS pour le styling

## 📚 Bonnes Pratiques

- Utilisation de TypeScript pour la sécurité du type
- Architecture modulaire et composants réutilisables
- Gestion d'état avec React Query
- Validation des données avec Zod
- Interface utilisateur réactive avec notifications toast

## 🤝 Contribution

1. Fork le projet
2. Créez votre branche de fonctionnalité
3. Committez vos changements
4. Poussez vers la branche
5. Ouvrez une Pull Request

## 📝 License

Ce projet est sous licence [MIT](LICENSE). 