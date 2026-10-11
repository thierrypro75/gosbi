# Product

## Register

product

## Users

Équipe interne Gosbi (vente de nourriture pour chiens) : gestionnaires et vendeurs qui saisissent chaque jour produits, ventes, clients et approvisionnements, et direction qui consulte les chiffres. Usage mixte saisie et pilotage, sur desktop et mobile, sur Chrome, Safari et Firefox. Devise affichée en MGA.

## Product Purpose

Gosbi Management centralise produits, ventes, clients, stock et approvisionnement, avec un tableau de bord (chiffre d'affaires, nombre de ventes, alertes de stock). Succès : un utilisateur voit en un coup d'œil l'état de l'activité, repère les ruptures et enregistre une vente ou un réapprovisionnement en quelques clics.

## Brand Personality

Sobre, fiable, précis. Référence : Stripe Dashboard. Ton factuel, français clair, sans jargon. Un seul accent bleu Gosbi, utilisé pour l'action et la sélection.

## Anti-references

- Look template SaaS générique : cartes identiques, gros chiffres à dégradé, effets décoratifs.
- Trop coloré ou ludique : pas de couleurs vives sur les états inactifs, pas d'animations gratuites.
- Contrôles natifs hétérogènes : aucun select, input ou bouton rendu différemment selon Safari, Chrome ou Firefox.

## Design Principles

1. Un vocabulaire de composants unique : même bouton, même champ, même select partout.
2. Rendu identique sur tous les navigateurs : on neutralise les styles natifs (appearance, scrollbar, date, select) plutôt que de les subir.
3. Les chiffres d'abord : hiérarchie claire, valeurs tabulaires, états vides et NaN jamais exposés à l'utilisateur.
4. La couleur signifie : l'accent marque l'action ou la sélection, le sémantique (vert, ambre, rouge) marque un état.
5. Navigation prévisible : sidebar groupée, état actif évident, repliable sur mobile.

## Accessibility & Inclusion

Cible WCAG AA : contrastes, focus visibles au clavier, cibles tactiles confortables, `prefers-reduced-motion` respecté. Mode sombre existant à conserver.
