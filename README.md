# Qui est-ce ? — Anniversaire Eliott

Carton d'invitation pensé pour le téléphone. Les invités arrivent sur une
reproduction du plateau de **Qui est-ce ?** — un vrai bac en plastique, avec ses
alvéoles creusées et ses cartes qui se rabattent sur leur charnière. Ils
appuient sur leur tête (c'est l'identification, il n'y a pas de mot de passe),
et remplissent leur page : présence, accompagnant, couchage, régime, boissons,
et trois morceaux pour la playlist commune.

React + Vite + TypeScript, données dans Supabase, recherche musicale via
l'iTunes Search API.

---

## Démarrer

```bash
npm install
npm run dev
```

Sans configuration Supabase, le site tourne en **mode démo** : tout est
enregistré dans le navigateur et un bandeau jaune le rappelle. C'est suffisant
pour travailler le design.

---

La typo est **Baloo 2**, chargée dans [index.html](index.html) et exposée aux
composants par `--font-display` / `--font-body`.

---

## 1. Remplir les infos de la soirée

Tout est dans [src/config/event.ts](src/config/event.ts) — c'est le seul fichier
à éditer pour que le site soit à jour :

| Champ | À quoi ça sert |
| --- | --- |
| `when` | La formule affichée partout (« Week-end du 14—15 Novembre ») |
| `start` / `end` | Bornes réelles, uniquement pour le fichier agenda `.ics` |
| `place` | Adresse, carte, bouton « Y aller ». `lat`/`lng` relevés sur OpenStreetMap |
| `giftUrl` | Lien de cagnotte. Vide → « surtout rien » |
| `whatsappUrl` | Groupe proposé après la réponse. Vide → masqué |
| `adminCode` | **À changer**, c'est le mot de passe de `/admin` |

## 2. Ajouter des avatars

Dépose les SVG dans [assets/Avatars/](assets/Avatars/) — le nom du fichier
devient le prénom affiché — puis :

```bash
npm run avatars
```

Le script retire le fond gris du générateur d'avatars, optimise les fichiers,
les renomme sans accent pour l'URL, et régénère la liste des invités.

Pour corriger un prénom sans renommer le fichier (surnom, homonyme), utilise
`NAME_OVERRIDES` dans [src/data/guests.ts](src/data/guests.ts) : ce fichier-là
n'est jamais écrasé.

Chaque visiteur reçoit son propre plateau, tiré au sort à la première visite
puis mémorisé dans `localStorage` : il ne bouge plus ensuite, sinon on
rechercherait sa tête à chaque passage. L'ordre n'est rebattu que si la liste
des invités a changé. La couleur et la forme de chaque case, elles, dérivent du
prénom : aléatoires à l'œil, mais identiques pour tout le monde.

## 3. Brancher Supabase

1. Crée un projet sur [supabase.com](https://supabase.com) (gratuit).
2. SQL Editor → colle [supabase/schema.sql](supabase/schema.sql) → Run.
3. `cp .env.example .env`, puis remplis avec Project Settings → API :

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Le bandeau « mode démo » disparaît au redémarrage.

> **Sur la sécurité.** Il n'y a pas de comptes : la clé anon est publique et
> n'importe qui peut techniquement répondre à la place d'un autre. C'est le prix
> de l'identification en un clic, et c'est sans conséquence pour un anniversaire.
> Les règles RLS interdisent quand même la suppression des réponses.

## 4. Mettre en ligne

Vercel ou Netlify, `npm run build`, dossier `dist`. Les deux fichiers de
réécriture sont déjà là ([vercel.json](vercel.json),
[public/_redirects](public/_redirects)) — sans eux, ouvrir `/moi/camille`
directement renvoie une 404, or c'est exactement le lien qu'on envoie aux gens.

N'oublie pas de reporter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans
les variables d'environnement de l'hébergeur.

---

## La playlist → Apple Music

La recherche passe par l'**iTunes Search API** : gratuite, sans clé, sans
inscription. Elle fournit la pochette, un extrait de 30 s écoutable dans le
site, et surtout l'identifiant Apple Music du morceau.

Créer la playlist automatiquement dans Apple Music demanderait un compte Apple
Developer payant (99 €/an) : l'API playlist exige un *Music User Token*, qui
exige une clé MusicKit. À la place, `/admin` te donne :

- chaque titre en lien direct vers sa fiche Apple Music (« + » dans l'app) ;
- un bouton **Copier en CSV**, à coller dans [Soundiiz](https://soundiiz.com) ou
  TuneMyMusic pour générer la playlist d'un coup.

Le plafond de 3 morceaux par personne est appliqué par un trigger Postgres, pas
seulement dans l'interface : deux onglets ouverts ne permettent pas de tricher.

---

## Le tableau de bord

`/admin`, protégé par `adminCode`. Têtes à table (accompagnants compris), oui /
peut-être / non, végétariens, allergies, qui dort sur place **et avec quoi**
(matelas, voiture, rien — avec le compte de ceux qu'il faudra équiper),
répartition des boissons, la playlist, et le tableau complet des réponses.

---

## Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Vérification TypeScript + build de production |
| `npm run avatars` | Régénère `public/avatars/` et la liste des invités |
| `node scripts/shot.mjs <url> <fichier.png> [l] [h]` | Capture en émulation mobile réelle |

`scripts/shot.mjs` passe par le protocole DevTools plutôt que par
`--window-size` : macOS impose une largeur de fenêtre minimale d'environ 500 px,
ce qui fait rendre la page trop large et donne des captures trompeuses.
`SHOT_EVAL="…"` exécute du JS avant la capture et `SHOT_WAIT=…` règle le délai
qui suit, pour viser une frame précise d'une animation.

Le script neutralise aussi `prefers-reduced-motion` : Chrome headless annonce
`reduce`, ce qui déclenche la règle d'accessibilité de la feuille de style et
écrase toutes les durées à 0,01 ms — les captures d'animation montrent alors
l'état final et laissent croire que rien ne bouge.

Il sert aussi à régénérer l'aperçu WhatsApp après un changement de nom ou de
date dans [public/og.html](public/og.html) :

```bash
node scripts/shot.mjs http://localhost:5173/og.html public/og.png 1200 630
```

---

## Notes de conception

- **Le plateau** ([src/index.css](src/index.css), section « plateau »). Le bac
  est un dégradé plus des ombres internes qui font les biseaux ; chaque alvéole
  est un creux (`inset` sombre) avec sa charnière en bas ; la carte est un
  rectangle de plastique clair qui pivote de −88° vers l'avant sur
  `transform-origin: bottom` et s'assombrit, laissant voir le creux. La
  `perspective` est posée sur l'alvéole et non sur la grille, pour que chaque
  carte tourne sur son propre axe.
  Le plastique de la carte vit sur `.tile::before`, sur son propre calque : un
  dégradé ne s'anime pas vers « rien », et il faut pouvoir l'effacer en gardant
  l'avatar au moment du départ vers la page perso.
  La carte est volontairement **plate** — plusieurs tentatives pour lui donner
  une épaisseur de domino (tranche 3D, dos décalé, point de fuite relevé) ont
  été abandonnées : le rendu s'alourdissait sans gagner en crédibilité.
  Le bord latéral est réduit au minimum (6 px de page + 6 px de bac) : le
  plateau reste un objet fermé tout en laissant 104 px par visage sur un écran
  de 390 px. Le supprimer complètement ne gagnerait que 4 px par case.
- **Le vol de l'avatar.** Quand on choisit sa case, les autres se rabattent —
  c'est ce qui la désigne, elle-même ne bouge ni ne grossit. Puis tout se
  dissout (le bac, les alvéoles, le plastique de la carte choisie et son
  prénom) pour ne laisser que l'avatar et sa tache de couleur, qui rejoint sa
  place en haut à gauche de la page perso. Le plastique de la carte vit sur
  `.tile::before`, sur son propre calque : un dégradé ne s'anime pas vers
  « rien », il faut pouvoir en faire varier l'opacité indépendamment du contenu.
  Le plateau relève la position de la tache juste avant de naviguer
  ([src/lib/transition.ts](src/lib/transition.ts)) et la page perso rejoue le
  trajet. Deux pièges rencontrés, tous deux commentés dans le code : StrictMode
  monte le composant deux fois et le premier montage consommait la position que
  le second attendait ; et une transition CSS ne démarrait pas au montage malgré
  un reflow forcé — c'est l'API Web Animations qui règle le problème.
- **Les feux d'artifice du fond**
  ([src/components/Fireworks.tsx](src/components/Fireworks.tsx)). Le canevas est
  rendu à 26 % de la résolution de l'écran puis étiré : le flou masque
  totalement la pixellisation et chaque image coûte une quinzaine de fois moins
  cher, ce qui compte sur un téléphone. Le flou est en CSS, une seule passe GPU,
  et non appliqué au dessin. L'effacement se fait en `destination-out` et non en
  `clearRect`, pour laisser une traînée tout en gardant le canevas transparent.
  Les étincelles sont volontairement grosses : un flou de 24 px dilue tellement
  l'énergie que des points fins deviennent invisibles. L'animation s'arrête
  quand l'onglet passe en arrière-plan et ne démarre pas si le système demande
  moins d'animations. Les blocs sont légèrement translucides pour laisser passer
  la lueur, sans quoi les feux seraient masqués sur toute la hauteur de l'écran.
- **Les formes.** Les cases utilisent un `border-radius` à 8 valeurs tiré du
  slug de l'invité. Attention, ça ne marche que sur des éléments carrés — en
  pourcentage sur un bouton large, on obtient une ellipse et pas une tache. Tout
  ce qui est allongé utilise donc des rayons en pixels
  ([src/lib/blob.ts](src/lib/blob.ts)).
- **Les blocs n'ont aucune ligne droite.** Ce ne sont pas des rectangles à coins
  arrondis mais des silhouettes SVG (`--blob-a` / `--blob-b`) appliquées en
  `mask-image` et étirées à la taille du bloc, en alternant une variante sur
  deux. Le SVG étant étiré verticalement, les coins doivent garder une emprise
  verticale faible : sinon, sur un bloc long, le coin descend jusqu'au titre et
  le rogne.
- **Les réponses sont à trois états.** `attending` vaut `oui` / `non` /
  `peut-etre` / `null`, et les oui/non secondaires sont `boolean | null`. Avec un
  simple booléen, « Non » s'allume tout seul à l'ouverture et on enregistre des
  réponses que personne n'a données.
- **La carte** est un assemblage de tuiles OpenStreetMap en `<img>`
  ([src/components/Map.tsx](src/components/Map.tsx)). L'iframe officielle d'OSM
  réclame WebGL et s'affiche en gris là où il manque.
