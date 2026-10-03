# WoW Community Backend

Backend Node.js / Express / PostgreSQL pour la collecte, la synchronisation et la consultation des données de personnages World of Warcraft.

Le backend reçoit les données collectées par l'addon **WoW Community Collector**, synchronisées ensuite par le client Python.

---

## Architecture

```text
World of Warcraft
       │
       ▼
WoW Community Collector
       │
       ▼
SavedVariables (.lua)
       │
       ▼
Client Python
       │
       │ HTTP / Bearer Token
       ▼
Node.js / Express API
       │
       ▼
PostgreSQL
       │
       ├── Users
       ├── Sessions
       ├── Characters
       ├── Professions
       ├── Recipes
       ├── Equipment
       └── Character Events
```

Le backend conserve :

* l'état actuel des personnages ;
* les professions et recettes connues ;
* l'équipement actuel ;
* un historique des événements importants.

---

# Stack technique

* **Node.js**
* **Express**
* **PostgreSQL**
* **pg**
* **bcrypt**
* **dotenv**
* **CommonJS**

---

# Structure du projet

```text
backend/
├── src/
│   ├── server.js
│   │
│   ├── constants/
│   │   └── eventTypes.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   └── characterController.js
│   │
│   ├── middleware/
│   │   └── authMiddleware.js
│   │
│   ├── models/
│   │   ├── characterEventModel.js
│   │   ├── characterModel.js
│   │   ├── equipmentModel.js
│   │   ├── professionModel.js
│   │   ├── sessionModel.js
│   │   └── userModel.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── characterRoutes.js
│   │
│   └── services/
│       ├── characterSyncService.js
│       ├── equipmentSyncService.js
│       └── professionSyncService.js
│
├── package.json
├── package-lock.json
└── .env
```

---

# Installation

## Prérequis

Installer :

* Node.js
* PostgreSQL
* npm

Vérifier les versions :

```bash
node --version
npm --version
psql --version
```

---

## Installation des dépendances

Depuis le dossier du backend :

```bash
npm install
```

---

# Configuration

Créer un fichier `.env` à la racine du projet :

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=wowcommunity
DB_USER=postgres
DB_PASSWORD=your_password
```

Les valeurs dépendent de l'installation PostgreSQL locale.

Le fichier `.env` ne doit jamais être versionné.

Ajouter notamment :

```text
.env
node_modules/
```

dans `.gitignore`.

---

# Base de données

Le backend utilise PostgreSQL.

## Utilisateurs

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Sessions

```sql
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Les tokens d'authentification ne sont pas stockés en clair en base.

Seul leur hash SHA-256 est conservé.

---

## Personnages

```sql
CREATE TABLE characters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    realm VARCHAR(100) NOT NULL,
    level INTEGER NOT NULL,
    class VARCHAR(100),
    class_file VARCHAR(50),
    race VARCHAR(100),
    race_file VARCHAR(100),
    race_id INTEGER,
    faction VARCHAR(20),
    guild_name VARCHAR(255),
    guild_rank VARCHAR(255),
    guild_rank_index INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Chaque personnage est identifié par son GUID WoW pour un utilisateur donné.

```sql
ALTER TABLE characters ADD COLUMN guid VARCHAR(100);

CREATE UNIQUE INDEX characters_user_guid_unique
ON characters (user_id, guid)
WHERE guid IS NOT NULL;
```

Le GUID permet notamment de gérer correctement les changements de nom sans créer un nouveau personnage.

---

## Professions

```sql
CREATE TABLE professions (
    id SERIAL PRIMARY KEY,
    character_id INTEGER NOT NULL
        REFERENCES characters(id) ON DELETE CASCADE,
    skill_line INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    skill_level INTEGER,
    max_skill_level INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (character_id, skill_line)
);
```

---

## Recettes

```sql
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    profession_id INTEGER NOT NULL
        REFERENCES professions(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (profession_id, recipe_id)
);
```

---

## Équipement

```sql
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    character_id INTEGER NOT NULL
        REFERENCES characters(id) ON DELETE CASCADE,
    slot VARCHAR(50) NOT NULL,
    item_id INTEGER NOT NULL,
    item_link TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (character_id, slot)
);
```

---

## Événements

```sql
CREATE TABLE character_events (
    id SERIAL PRIMARY KEY,
    character_id INTEGER NOT NULL
        REFERENCES characters(id)
        ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Les événements permettent de conserver un historique des changements significatifs.

Types actuellement utilisés :

```text
LEVEL_UP
GUILD_CHANGED
PROFESSION_LEARNED
RECIPE_LEARNED
EQUIPMENT_CHANGED
```

---

# Lancement du serveur

En développement :

```bash
npm start
```

Le serveur démarre sur :

```text
http://localhost:3000
```

Le port peut être modifié dans `.env`.

---

# Authentification

L'API utilise des Bearer Tokens.

Exemple :

```http
Authorization: Bearer <token>
```

Le processus de connexion est :

```text
POST /api/auth/login
        │
        ▼
création d'un token aléatoire
        │
        ▼
hash SHA-256 du token
        │
        ▼
stockage du hash en base
        │
        ▼
retour du token au client
```

Lors d'une requête authentifiée :

```text
Bearer Token
     │
     ▼
SHA-256
     │
     ▼
user_sessions
     │
     ▼
utilisateur associé
```

Les sessions expirent après 30 jours.

---

# API

## Authentification

### Inscription

```http
POST /api/auth/register
```

Exemple :

```json
{
    "email": "test@example.com",
    "password": "password"
}
```

---

### Connexion

```http
POST /api/auth/login
```

Exemple :

```json
{
    "email": "test@example.com",
    "password": "password"
}
```

La réponse contient le token d'authentification utilisé ensuite par le client.

---

### Utilisateur connecté

```http
GET /api/auth/me
```

Authentification requise.

Header :

```http
Authorization: Bearer <token>
```

---

# Personnages

## Liste des personnages

```http
GET /api/characters
```

Authentification requise.

Exemple de réponse :

```json
{
    "status": "ok",
    "characters": [
        {
            "id": 3,
            "guid": "Player-4619-00FE85A5",
            "name": "Peter Petrelly",
            "realm": "Classic Beta PvP",
            "level": 6,
            "class": "Mage",
            "class_file": "MAGE",
            "race": "Undead",
            "race_file": "Scourge",
            "race_id": 5,
            "faction": "Horde",
            "guild_name": null,
            "guild_rank": null,
            "guild_rank_index": null,
            "created_at": "...",
            "updated_at": "..."
        }
    ]
}
```

---

## Détail d'un personnage

```http
GET /api/characters/:id
```

Authentification requise.

Le endpoint retourne l'état actuel du personnage :

```text
Character
├── informations
├── professions
│   └── recipes
└── equipment
```

L'historique des événements n'est volontairement pas inclus dans cette réponse.

---

## Historique d'un personnage

```http
GET /api/characters/:id/events
```

Authentification requise.

Paramètres optionnels :

```text
limit
offset
```

Exemple :

```http
GET /api/characters/3/events?limit=2&offset=0
```

Réponse :

```json
{
    "status": "ok",
    "events": [
        {
            "id": 7,
            "event_type": "RECIPE_LEARNED",
            "event_data": {
                "recipeId": 2657,
                "profession": "Mining",
                "recipeName": "Smelt Copper"
            },
            "created_at": "2026-10-02T15:19:26.154Z"
        },
        {
            "id": 6,
            "event_type": "PROFESSION_LEARNED",
            "event_data": {
                "skillLine": 186,
                "profession": "Mining"
            },
            "created_at": "2026-10-02T15:19:26.149Z"
        }
    ],
    "pagination": {
        "limit": 2,
        "offset": 0,
        "hasMore": true,
        "total": 7
    }
}
```

### Pagination

`limit` :

* minimum : `1`
* maximum : `100`
* valeur par défaut : `20`

`offset` :

* minimum : `0`
* valeur par défaut : `0`

Le backend récupère volontairement un événement supplémentaire afin de déterminer `hasMore`.

---

# Synchronisation des personnages

Le client Python envoie les données collectées par l'addon au backend.

```text
Python Client
     │
     ▼
POST /api/characters/sync
     │
     ▼
characterSyncService
     │
     ├── Character
     ├── Professions
     ├── Recipes
     └── Equipment
```

La synchronisation est conçue pour être répétée sans créer de doublons.

Le personnage est recherché principalement grâce à :

```text
user_id + guid
```

---

# Gestion des changements

Le backend compare les données reçues avec l'état actuellement enregistré.

## Niveau

Si le niveau augmente :

```text
LEVEL_UP
```

Exemple :

```json
{
    "oldLevel": 11,
    "newLevel": 12
}
```

---

## Guilde

Lorsqu'une guilde change :

```text
GUILD_CHANGED
```

Exemple :

```json
{
    "oldGuild": "Lack of Respect",
    "newGuild": null
}
```

---

## Profession

Lorsqu'une nouvelle profession est détectée :

```text
PROFESSION_LEARNED
```

Exemple :

```json
{
    "skillLine": 186,
    "profession": "Mining"
}
```

---

## Recette

Lorsqu'une nouvelle recette est détectée :

```text
RECIPE_LEARNED
```

Exemple :

```json
{
    "recipeId": 2657,
    "profession": "Mining",
    "recipeName": "Smelt Copper"
}
```

---

## Équipement

Lorsqu'un objet change de slot :

```text
EQUIPMENT_CHANGED
```

Exemple :

```json
{
    "slot": "shirt",
    "oldItemId": 999998,
    "newItemId": 6096
}
```

Lorsqu'un objet disparaît :

```json
{
    "slot": "shirt",
    "oldItemId": 6096,
    "newItemId": null
}
```

---

# Philosophie de synchronisation

Le système distingue deux notions :

### État actuel

Les tables :

```text
characters
professions
recipes
equipment
```

représentent l'état actuel connu.

### Historique

La table :

```text
character_events
```

conserve les changements significatifs.

Cela permet d'avoir à la fois :

* une lecture rapide de l'état actuel ;
* un historique exploitable pour les notifications et l'activité communautaire.

---

# Sécurité

Le backend applique plusieurs contrôles :

* authentification obligatoire sur les endpoints privés ;
* vérification que le personnage appartient bien à l'utilisateur connecté ;
* mots de passe stockés sous forme de hash bcrypt ;
* tokens de session stockés uniquement sous forme de hash ;
* expiration des sessions ;
* paramètres PostgreSQL préparés ;
* validation des paramètres d'URL ;
* validation de `limit` et `offset`.

Par exemple :

```text
GET /api/characters/3
```

ne permet pas à un utilisateur d'accéder au personnage `3` si celui-ci appartient à un autre utilisateur.

---

# Tests manuels actuels

Les endpoints suivants ont été testés :

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

GET  /api/characters
GET  /api/characters/:id
GET  /api/characters/:id/events
```

La pagination des événements a notamment été vérifiée avec :

```text
limit=2&offset=0
limit=2&offset=2
limit=2&offset=6
```

ainsi que la validation d'un `limit` supérieur à `100`.

Un personnage inexistant retourne :

```http
404 Not Found
```

avec :

```json
{
    "status": "error",
    "message": "Character not found"
}
```

---

# Évolution prévue

Le backend est conçu pour pouvoir évoluer progressivement.

Données WoW prévues à terme :

```text
Personnage
├── Informations générales
├── Professions
│   └── Recettes
├── Équipement
├── Réputations
├── Inventaire
├── Quêtes
└── Historique
```

Le système d'événements pourra également être utilisé pour alimenter :

* notifications communautaires ;
* activité récente ;
* historique d'un personnage ;
* événements Discord ;
* statistiques communautaires.

---

# Client Python

Le client Python est responsable de :

1. détecter l'installation de WoW ;
2. trouver les SavedVariables ;
3. lire les données générées par l'addon ;
4. construire le payload ;
5. s'authentifier auprès de l'API ;
6. synchroniser les personnages.

Le client ne doit pas contenir de logique métier PostgreSQL : cette responsabilité appartient au backend.

---

# Principe général

Le projet suit une séparation claire des responsabilités :

```text
Addon
  → collecte les données WoW

Client Python
  → lit et transmet les données

Backend
  → valide, synchronise et historise

PostgreSQL
  → persiste les données

Frontend
  → affiche les données

Discord
  → pourra exploiter les événements
```

Le backend constitue ainsi la source centrale des données communautaires.

tOCHSKa