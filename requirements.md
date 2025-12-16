# requirements.md — Mobile Clicker (React Native Expo + Supabase)

## 1) Objectif du produit
Créer un **jeu mobile “Clicker”** ultra simple, **addictif**, **fluide** (60 FPS), où le joueur doit cliquer sur des cercles qui apparaissent/disparaissent de plus en plus vite.  
Le jeu doit être **compréhensible en 3 secondes**, jouable en **portrait**, avec un **leaderboard global**.

---

## 2) Portée

### Inclus
- Jeu “1-tap”: un cercle à la fois, apparition/disparition, accélération progressive.
- Score (+1 par cercle cliqué).
- Défaite si clic à côté ou si le cercle disparaît avant d’être cliqué.
- Écran de fin: score + actions (Restart / Share).
- Highscore **toujours affiché** en haut.
- Auth simple via Supabase.
- Leaderboard global via Supabase.

### Non inclus (v1)
- Skins, shop, monnaie, pubs, modes de jeu, niveaux, power-ups.
- Matchmaking, multijoueur, anti-cheat avancé.
- Offline-first complet (le jeu doit marcher offline, mais le leaderboard nécessite internet).

---

## 3) Règles du jeu (précises)

### 3.1 États du jeu
- **Home** : bouton `Start`, affichage du Highscore.
- **Playing** : cercle actif + score en cours + Highscore en haut.
- **Game Over** : affichage du score final + actions.

### 3.2 Démarrage
- Le jeu démarre **uniquement** au clic sur `Start`.
- À `Start` :
  - `score = 0`
  - génération du premier cercle
  - lancement du timer de disparition

### 3.3 Score
- Chaque cercle cliqué **correctement** donne : **+1 point**.
- Le score est affiché en temps réel (pendant la partie).

### 3.4 Accélération / difficulté
- Le jeu accélère **à chaque clic réussi**.
- Paramètres de base (v1, valeurs exactes à implémenter) :
  - Durée d’affichage initiale du cercle : **1200 ms**
  - Durée minimale (cap) : **250 ms**
  - Après chaque clic réussi : `duration = max(250, round(duration * 0.94))`
- Conséquence : le cercle disparaît de plus en plus vite, donc la difficulté augmente à chaque point.

> Option (si besoin de progression plus “feel good”) : n’accélérer que tous les 2 points jusqu’à 10, puis à chaque point. (À garder en réserve, pas par défaut.)

### 3.5 Condition de défaite
Le joueur perd immédiatement si :
1) **Clic à côté** : l’utilisateur tape **en dehors** du cercle actif.  
2) **Pas assez rapide** : le cercle disparaît (timer écoulé) avant d’être cliqué.

### 3.6 Fin de partie
Au Game Over :
- afficher `Score final`
- afficher `Highscore` (inchangé ou mis à jour)
- boutons :
  - `Restart` (relance une partie immédiatement)
  - `Share` (partage du score via le Share sheet du téléphone)
  - (optionnel v1) `Leaderboard` (ouvre l’écran leaderboard)

---

## 4) UX / UI (minimaliste, gros contrastes)

### 4.1 Principes visuels
- Fond : noir ou très sombre.
- Texte : blanc (contraste maximal).
- Cercle : couleur vive unique (ex. blanc/jaune/bleu) avec animation simple.
- Typo : sans-serif, grande lisibilité.
- Aucun élément décoratif inutile pendant la partie.

### 4.2 HUD (affichage permanent)
- En haut (toujours visible) :
  - **Highscore** (local, synchronisé si possible)
- Pendant la partie :
  - Score actuel (centre ou haut-centre)
- Zones cliquables :
  - Toute la surface de l’écran est “active”, **mais** un tap hors cercle = défaite.

### 4.3 Écrans
1) **Home**
   - Titre du jeu
   - Highscore en haut
   - Bouton `Start` (large)
   - (optionnel) bouton `Leaderboard`

2) **Playing**
   - Highscore en haut
   - Score actuel visible
   - Cercle animé apparaissant à une position aléatoire
   - Pas de bouton “pause” (v1)

3) **Game Over**
   - “Game Over”
   - Score final + Highscore
   - Boutons: `Restart`, `Share`, (optionnel) `Leaderboard`

### 4.4 Accessibilité
- Taille de texte minimum confortable.
- Zones safe-area respectées (notch).
- Haptics légers :
  - succès : petit tick
  - échec : vibration plus marquée (courte)
- Réduction d’animations : respecter si possible `Reduce Motion` (si activé, limiter les animations à un fade simple).

---

## 5) Game Design détaillé (logique cercle)

### 5.1 Cercle (propriétés v1)
- Un seul cercle à la fois.
- Taille fixe : **96 px** de diamètre (v1).
- Position : aléatoire, mais **toujours entièrement visible** :
  - marges internes minimales (ex. 24 px) + safe-area.
- Hitbox :
  - hitbox = cercle exact (rayon = diamètre/2)
  - (optionnel accessibilité) ajouter `hitSlop` léger (ex. +6 px) sans le rendre trop facile.

### 5.2 Apparition / disparition (timing)
- À chaque spawn :
  - animation d’entrée : scale 0.85 → 1.0 + fade in (rapide)
  - démarrage d’un timer `duration`
- Si le joueur clique le cercle avant la fin :
  - timer annulé
  - score +1
  - recalcul `duration` (accélération)
  - spawn d’un nouveau cercle (nouvelle position)
- Si timer atteint :
  - Game Over immédiat

### 5.3 Gestion des interruptions (anti-triche simple)
- Si l’app passe en background pendant `Playing` :
  - comportement v1 : **Game Over** (simple et clair).
- Si un appel / overlay système interrompt :
  - idem : Game Over.

---

## 6) Leaderboard & Highscore

### 6.1 Highscore joueur
- Stockage local (instantané) : `AsyncStorage` (ou `expo-secure-store` si on préfère).
- Règle :
  - si `score_final > highscore_local`, on met à jour localement immédiatement.
  - puis on tente de sync sur Supabase (si connecté).

### 6.2 Leaderboard global
- Écran listant les meilleurs scores (Top 50/100).
- Afficher :
  - Rang
  - Pseudo (ou “Player1234”)
  - Score
  - Date (optionnel)
- Afficher aussi (optionnel) “Ton meilleur score” en haut.

### 6.3 Authentification (simple)
- Objectif : associer un score à un utilisateur.
- Choix recommandé v1 : **auth anonyme** au premier lancement (création automatique), avec pseudo modifiable plus tard.
  - Avantage : friction quasi nulle.
  - Si l’anonyme n’est pas souhaité/possible : email OTP (“magic link”) en fallback.

---

## 7) Architecture technique

## 7.1 Frontend
- **React Native + Expo** (TypeScript recommandé pour éviter les bugs).
- Navigation :
  - **Expo Router** (simple, moderne, standard Expo).
- Animations (fluide = critique) :
  - **react-native-reanimated**
  - **react-native-gesture-handler** (si nécessaire, mais v1 peut se contenter de `Pressable`/`Tap`).
- Data fetching Supabase :
  - client officiel Supabase JS
  - (optionnel) **@tanstack/react-query** pour cache + états réseau (utile pour leaderboard).
- Stockage local :
  - `@react-native-async-storage/async-storage` (ou `expo-secure-store` pour tokens, mais Supabase gère déjà une session).

### Contraintes perf
- 60 FPS visé.
- Aucune re-render lourde à chaque frame.
- Le cercle doit être un composant isolé, avec animations gérées côté Reanimated quand possible.

---

## 7.2 Backend (Supabase)

### 7.2.1 Tables requises
Deux tables : `users` et `scores`.

#### Table `users`
Objectif : profil public minimal + meilleur score.
Champs :
- `id` (uuid, PK) — = `auth.users.id`
- `username` (text, unique, nullable au départ)
- `high_score` (int, default 0, not null)
- `created_at` (timestamptz, default now())

#### Table `scores`
Objectif : historiser les parties (simple) et permettre un leaderboard.
Champs :
- `id` (uuid, PK, default gen_random_uuid())
- `user_id` (uuid, FK -> users.id, not null)
- `score` (int, not null, check score >= 0)
- `created_at` (timestamptz, default now())
- `app_version` (text, nullable)
- `platform` (text, nullable) — “ios” / “android”

### 7.2.2 SQL de création (référence)
```sql
-- USERS
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  high_score int not null default 0,
  created_at timestamptz not null default now()
);

-- SCORES
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  score int not null check (score >= 0),
  created_at timestamptz not null default now(),
  app_version text,
  platform text
);

create index scores_user_id_idx on public.scores(user_id);
create index scores_score_idx on public.scores(score desc);
7.2.3 Trigger création user (quand un utilisateur auth est créé)
Créer automatiquement une ligne dans public.users.

sql
Copier le code
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, username, high_score)
  values (new.id, null, 0)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();
7.2.4 RLS (Row Level Security)
Activer RLS sur les deux tables.

Règles recommandées :

users :

SELECT : autorisé pour tous (profil public minimal)

UPDATE : uniquement sur sa propre ligne

scores :

INSERT : uniquement pour soi (user_id = auth.uid())

SELECT : autorisé pour tous (leaderboard public)

UPDATE/DELETE : interdit (v1)

Exemple (simplifié) :

sql
Copier le code
alter table public.users enable row level security;
alter table public.scores enable row level security;

-- USERS SELECT public
create policy "users_select_public"
on public.users for select
using (true);

-- USERS UPDATE self
create policy "users_update_self"
on public.users for update
using (auth.uid() = id);

-- SCORES SELECT public
create policy "scores_select_public"
on public.scores for select
using (true);

-- SCORES INSERT self
create policy "scores_insert_self"
on public.scores for insert
with check (auth.uid() = user_id);
7.2.5 Requête leaderboard (logique)
Leaderboard basé sur le meilleur score par user :

Option A (simple côté client) : requête SQL via rpc/view.

Option B (simple à maintenir) : créer une view.

View (recommandée) :

sql
Copier le code
create view public.leaderboard as
select
  u.id as user_id,
  coalesce(u.username, 'Player') as username,
  u.high_score as score
from public.users u
where u.high_score > 0
order by u.high_score desc;
Le client lit leaderboard (Top 100).

8) Flux applicatifs (end-to-end)
8.1 Premier lancement
L’app s’ouvre

Auth Supabase (anonyme) silencieuse

Création user (trigger)

Chargement high_score (Supabase -> local cache) + affichage

8.2 Partie
Home -> Start

Playing -> spawn cercle

Tap cercle :

+1

accélération

nouveau cercle

Tap hors cercle OU timer expire -> Game Over

Game Over :

afficher score

update highscore local + supabase si record

insertion dans scores (optionnel mais recommandé pour historique)

actions Restart/Share

8.3 Partage
Share ouvre le share sheet avec un texte type :

“J’ai fait {score} sur Clicker. Tu fais mieux ?”

Pas de lien obligatoire en v1.

9) Structure projet (Expo) — arborescence simple
Recommandation : Expo Router (dossier app/).

bash
Copier le code
/app
  /(tabs or stack)               # selon choix navigation (souvent stack simple)
  index.tsx                      # Home
  game.tsx                       # Playing
  gameover.tsx                   # Game Over
  leaderboard.tsx                # Leaderboard
  _layout.tsx                    # Router layout

/src
  /components
    Circle.tsx
    Hud.tsx
    PrimaryButton.tsx

  /game
    config.ts                    # timings, constantes (duration initiale, min, factor)
    engine.ts                    # logique pure (update duration, spawn position)
    hitTest.ts                   # détection tap dans cercle

  /store
    useGameStore.ts              # Zustand (score, state, duration, etc.)

  /lib
    supabase.ts                  # client Supabase
    auth.ts                      # helpers auth (anonyme / otp)
    storage.ts                   # highscore local

  /hooks
    useGameLoop.ts               # gestion timer, spawn, game over

  /types
    supabase.ts                  # types DB (optionnel)
    game.ts

  /utils
    random.ts
    safeArea.ts

/assets
  fonts/
  icons/
app.config.ts (ou app.json)
.env (non commité)
10) Dépendances (choix stables)
expo

react-native

expo-router

react-native-reanimated

@supabase/supabase-js

@react-native-async-storage/async-storage

expo-haptics

(optionnel) @tanstack/react-query

Les versions exactes doivent être alignées avec la version du SDK Expo du projet.

11) Variables d’environnement
EXPO_PUBLIC_SUPABASE_URL

EXPO_PUBLIC_SUPABASE_ANON_KEY

Stockage :

.env local

Ne jamais commit les secrets (surtout pas service role key).

12) Critères d’acceptation (Definition of Done v1)
Gameplay
 Start démarre une partie, score à 0.

 Chaque tap sur cercle => +1 point.

 La durée d’affichage diminue à chaque réussite selon la formule définie.

 Tap hors cercle => Game Over immédiat.

 Cercle qui disparaît => Game Over immédiat.

 Score final affiché sur Game Over.

 Bouton Restart relance instantanément une partie.

 Bouton Share ouvre le share sheet avec le score.

 Highscore affiché en haut en permanence (Home/Playing/Game Over).

Tech / Perf
 Animations fluides (pas de lag visible).

 Aucun crash sur navigation rapide (Start/Restart en boucle).

 Gestion background => Game Over.

Supabase
 Auth simple fonctionnelle.

 Highscore synchronisé en DB.

 Leaderboard global affiche le Top (ordre décroissant).

 RLS active et empêche d’écrire pour un autre user.

13) Notes produit (guidelines)
Le “fun” vient de :

Feedback immédiat (haptics + animation)

Progression claire (score monte vite au début)

Tension (accélération perceptible)

Garder tout le reste invisible : pas de menus complexes, pas de texte long.