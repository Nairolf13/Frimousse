# OAuth Module – Google Sign-In

Dossier réutilisable pour ajouter l'authentification Google à n'importe quelle application Node.js/Express.

## Structure

```
backend/lib/oauth/
  index.js            # Point d'entrée – exporte google, handleOAuthUser
  google.js           # Google OAuth (Authorization Code + id_token verification)
  handleOAuthUser.js  # Find-or-create user from OAuth profile (Prisma)
```

## Variables d'environnement requises

Ajoutez-les dans `backend/.env` :

```env
# ── Google OAuth ──────────────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

## Configuration côté Google

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Créez un projet (ou sélectionnez-en un existant)
3. Allez dans **Identifiants** → **Créer des identifiants** → **ID client OAuth**
4. Type : **Application Web**
5. Ajoutez l'URI de redirection autorisé : `https://yourdomain.com/api/auth/google/callback`
6. Copiez le Client ID et le Client Secret dans `.env`

## Routes exposées

| Méthode | Route                         | Description                                  |
|---------|-------------------------------|----------------------------------------------|
| GET     | `/api/auth/google`            | Redirige vers le consentement Google         |
| GET     | `/api/auth/google/callback`   | Callback Google → cookies → dashboard        |
| POST    | `/api/auth/google/token`      | Échange un id_token Google (One Tap/mobile)  |

## Champs Prisma ajoutés au model User

```prisma
oauthProvider    String?   // "google" | null
oauthProviderId  String?   // ID unique du provider (sub)
```

## Réutiliser dans un autre projet

1. Copiez le dossier `backend/lib/oauth/` dans votre projet
2. Copiez `backend/routes/oauth.js` (ou adaptez les routes)
3. Copiez `components/OAuthButtons.tsx` côté frontend
4. Ajoutez les champs `oauthProvider` et `oauthProviderId` à votre model User
5. Adaptez `handleOAuthUser.js` si votre schéma User est différent
6. Configurez les variables d'environnement

## Frontend

Le composant `components/OAuthButtons.tsx` affiche le bouton Google.
Il redirige simplement vers la route backend qui gère le flow OAuth.

```tsx
import OAuthButtons from '../components/OAuthButtons';

// Sur la page de login
<OAuthButtons mode="login" />

// Sur la page d'inscription
<OAuthButtons mode="register" />
```
