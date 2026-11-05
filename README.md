# Court Club — Basketball Promo

Module promotionnel Next.js / TypeScript, sans newsletter ni collecte d'e-mail.
Le visiteur marque **3 paniers**, copie un code existant et retourne à ses achats.
Ce projet n'est pas une boutique et ne crée aucun code dans une plateforme e-commerce.

## Démarrer

Prérequis : **Node.js 22.18+**, npm et Git. La version de Node doit aussi être configurée sur l'hébergeur.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Ouvrir `http://localhost:3000`. La popup s'ouvre après 1,2 seconde une fois par
session ; le bouton de démonstration permet de la rouvrir volontairement.
Après une victoire, cette ouverture manuelle affiche directement la récompense.

## Architecture

- `src/app/` : démonstration, page `/play` embarquée et API publique de configuration.
- `src/components/` : interface de jeu et écran de victoire.
- `src/lib/physics.ts` : trajectoire et collisions, simulation à pas fixe de 1/120 s.
- `src/lib/shops.ts` : configuration de chaque boutique et liste exacte des origines.
- `public/embed.js` : script sans dépendance. Popup dans un Shadow DOM, jeu dans une iframe.
- `examples/shop.html` : exemple HTML hébergé sur une origine distincte.

Le script télécharge uniquement la petite configuration d'ouverture. Le jeu et
React ne sont chargés dans l'iframe qu'à l'ouverture. Les styles du jeu restent
isolés ; le défilement de la boutique est bloqué temporairement, puis restauré.
La popup conserve le focus, se ferme avec Échap et restitue le focus précédent.
Le jeu se contrôle au doigt, à la souris ou avec les curseurs et le bouton de tir.
La trajectoire en pointillés aide à viser : elle apparaît avant le tir et se met
à jour avec les curseurs Angle/Force ou le glisser du ballon. Elle disparaît
pendant le vol et revient pour le tir suivant ; les tentatives sont illimitées.

## Configurer une boutique

Modifier `src/lib/shops.ts` : ajouter un identifiant unique, puis renseigner :

| Propriété | Usage |
| --- | --- |
| `id` | Identifiant passé à `data-shop` |
| `campaignId` | Identifiant de campagne ; changer pour réinitialiser les préférences |
| `name`, `logoUrl` | Marque et logo HTTPS facultatif |
| `accent`, `background` | Couleurs hexadécimales `#RRGGBB` ; maintenir un contraste accessible |
| `title`, `description`, `victoryTitle` | Textes de l'invitation et de la victoire |
| `code`, `terms` | **Code déjà créé et actif** dans la boutique et conditions exactes |
| `allowedOrigins` | Origines HTTP(S) exactes, sans chemin ni `/` final |
| `openDelayMs` | Délai de 0 à 60000 ms |
| `frequency` | `session` (défaut), `daily` (24 h glissantes), `always` (chaque page) |
| `completedDays` | Durée de mémorisation de la victoire, 90 jours par défaut |

`demo` et `atelier` sont deux exemples indépendants. `PANIER10` et `ATELIER10`
ne sont **pas** des codes de réduction réellement activés.
Les origines des exemples sont fournies par `DEMO_SHOP_ORIGINS` et
`ATELIER_SHOP_ORIGINS`, séparées par des virgules.

Pour la production, supprimer les origines locales et renseigner, par exemple :

```dotenv
DEMO_SHOP_ORIGINS=https://ma-boutique.fr,https://www.ma-boutique.fr
ATELIER_SHOP_ORIGINS=https://mon-autre-boutique.fr
```

Inclure aussi l'origine de la démonstration si elle doit fonctionner en production.
**Reconstruire et redéployer après une modification**, notamment des origines :
la CSP `frame-ancestors` est générée pendant la construction.
Les origines autorisées sont réunies pour la CSP ; la page et l'API vérifient en plus
la liste propre à chaque boutique.

## Intégration externe

Déployer le projet sur `https://jeu.votre-domaine.fr`, puis ajouter une seule fois
dans le thème de la boutique, idéalement avant `</body>` :

```html
<script
  src="https://jeu.votre-domaine.fr/embed.js"
  data-shop="demo"
  data-name="Ma boutique"
  data-accent="#a3421c"
  data-background="#fff9f0"
  data-code="PANIER10"
  data-terms="-10 % dès 50 € d'achat, hors promotions."
  data-expires-at="2026-12-31T22:59:59Z"
  defer>
</script>
```

Les attributs facultatifs ci-dessus remplacent le nom affiché (« Court Club » par défaut), la couleur des boutons/du panier,
le fond de la popup, le code et les conditions configurés sur le serveur.
Leur absence conserve les valeurs de la boutique. Aucune reconstruction n'est
nécessaire pour changer ces attributs dans votre site externe.

L'administration de votre site externe peut enregistrer un champ « Nom de la popup »
et générer `data-name` depuis cette valeur (échappée comme attribut HTML).
Le module ne fournit pas d'espace admin du site externe. Le nom est limité à
80 caractères non vides ; sans `data-name`, le nom configuré sur le serveur reste utilisé.
Sous la marque, « powered by webcaliskan » reste affiché à toutes les étapes,
avec un lien vers `https://www.instagram.com/webcaliskan/` dans un nouvel onglet.

`data-expires-at` doit être une date ISO **UTC** terminée par `Z`, avec secondes :
`2026-12-31T22:59:59Z` correspond au 31 décembre 2026 à 23:59:59 à Paris.
La date est inclusive : à partir de cet instant, la popup ne s'ouvre plus,
même avec `open()`, et une popup déjà ouverte se ferme. Aucun nouveau code
ne peut être gagné/copié via l'interface après expiration. Sans cet attribut,
aucune date limite n'est appliquée. Une date impossible, sans fuseau, une couleur
invalide ou un code vide empêche l'initialisation et déclenche l'événement d'erreur.
Le code est limité à 64 caractères et les conditions à 500 caractères.
La date est affichée avec l'heure de Paris à la victoire.

**Panier sur mesure : copie uniquement, pas de synchronisation automatique.**
Le visiteur colle le code dans le champ promotionnel de votre panier existant.
Le site doit valider lui-même le code, la date et les conditions lors du calcul
du panier/checkout. Le module ne modifie ni total, ni articles, ni état du panier.
Les couleurs choisies doivent conserver un contraste lisible.

Fonctionne avec un thème Shopify, WordPress/WooCommerce ou une page HTML.
Autoriser le domaine du jeu dans `script-src`, `connect-src` et `frame-src` si
la boutique utilise une CSP. Le chargeur injecte des styles dans son Shadow DOM :
une CSP interdisant tous les styles intégrés devra autoriser ces styles
(par exemple avec un hash du contenu exact de `style.textContent`).
Ne pas désactiver globalement une CSP pour intégrer le module.
Utiliser HTTPS pour la boutique, le jeu et le logo en production.

API facultative, après chargement :

```javascript
await window.BasketballPromo.open(); // ouverture explicite ; retourne false si l'offre a expiré
window.BasketballPromo.close();      // ferme et annule le délai automatique en cours
window.BasketballPromo.destroy();    // ferme et supprime aussi le minuteur d'expiration (navigation SPA)
```

Événements sur `window` : `basketball-promo:opened`, `basketball-promo:closed`,
`basketball-promo:completed` (`detail.shop`, `detail.campaignId`) et
`basketball-promo:error` (`detail.message`) et `basketball-promo:expired`.
Une expiration est un état normal, pas une erreur. Aucun outil d'analyse n'est ajouté.
Les erreurs sont signalées dans la console et par événement ; l'iframe dispose
d'un état d'erreur si elle ne se charge pas en 15 secondes.

### Tester une véritable origine externe

```powershell
# Terminal 1, application Next.js
npm run dev

# Terminal 2, exemple HTML
node tests/serve-shop.mjs
```

Ouvrir `http://127.0.0.1:3001`. Le HTML charge le jeu depuis
`http://127.0.0.1:3000`. L'exemple doit être servi par HTTP, pas ouvert en `file:`.

## Mémorisation et limites

- Fermeture/ouverture : clé `basketball-promo:<id>:<campaignId>:seen` dans
  `sessionStorage` ou `localStorage` selon la fréquence.
- Victoire : clé `basketball-promo:<id>:<campaignId>:won` dans le `localStorage`
  **de la boutique**, pas dans celui de l'iframe. Aucun stockage tiers nécessaire.
- Une fermeture annule cette popup ; elle ne se rouvre pas spontanément sur la page.
- Une victoire suspend toutes les ouvertures automatiques pendant `completedDays`.
- Pour une configuration externe, le code et la date sont ajoutés à la clé de
  mémorisation : changer la récompense ou sa date crée une nouvelle campagne locale.
  Le code étant public côté client, cette clé n'est pas un stockage de secret.
- Stockage refusé : avertissement explicite et mémoire de la page uniquement ;
  les préférences ne survivront pas à un rechargement.
- Effacement du stockage, navigation privée ou autre appareil : le jeu peut être reproposé.

Les messages `postMessage` vérifient le protocole, la forme, l'origine,
la fenêtre source et un canal aléatoire de 128 bits. L'API vérifie également
l'origine avant de retourner sa configuration ; elle n'utilise pas de cookies.
**Ce n'est pas un mécanisme anti-fraude** : un code partagé livré au navigateur
est découvrable sans jouer, copiable et partageable. Le score et les préférences
peuvent être manipulés. Ne placer aucun secret ni jeton e-commerce ici.
Pour des codes uniques, à usage unique ou une protection anti-abus, ajouter un
backend connecté à la plateforme, avec validation serveur et limitation de débit.
Les conditions et l'expiration réelle doivent être appliquées dans la plateforme.
La date de la popup repose sur l'horloge du navigateur, pas sur une validation
serveur : elle ne permet pas de rendre invalide un code déjà copié.

## Validation

```powershell
npm run test
npm run lint
npm run build
npm run typecheck
npx playwright install chromium
npm run test:e2e
```

Les tests navigateur utilisent la **construction de production**, sur les ports
3000 et 3001 (ils doivent être libres). Ils démarrent puis arrêtent leurs serveurs.
Couverture : bureau et mobile, popup/session, focus/Échap, geste tactile réel,
échec/retry, 3 paniers/victoire, copie et copie refusée, persistance, stockage
bloqué, iframe bloquée, origine externe et refus des messages/origines non autorisés.

## Déploiement et dépôt Git

```powershell
npm run build
npm run start
```

Déployer sur un hébergeur compatible Next.js Node (par exemple Vercel).
L'export statique n'est pas adapté : la page de jeu et l'API lisent la boutique
et l'origine à la requête.
Le dépôt source est [code-promo](https://github.com/halilcancaliskan/code-promo).
La publication du code sur GitHub ne déploie pas automatiquement l'application.
Ne pas versionner `.env.local`. Conserver `.env.example` et `package-lock.json`.
