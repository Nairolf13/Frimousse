# Registre des activités de traitement
### Article 30 du Règlement (UE) 2016/679 — RGPD

---

**Responsable du traitement**
- **Nom de l'organisme** : Les Frimousses (association)
- **Adresse** : 19 chemin de la gélatine, 13400 Aubagne, France
- **Adresse email** : lespetitesfrimoussesdu13@gmail.com
- **Représentant légal** : Florian Bricchi
- **Application concernée** : Frimousse — logiciel de gestion de structures d'accueil de jeunes enfants (crèches, micro-crèches, MAM, garderies)
- **URL** : https://lesfrimousses.com

**Date de création du registre** : 4 avril 2026
**Version** : 1.0
**Prochaine révision** : 4 avril 2027

---

## Sous-traitants et prestataires techniques (Art. 30.1.d)

| Prestataire | Rôle | Données transmises | Localisation | Base légale du transfert |
|---|---|---|---|---|
| **Supabase** (supabase.co) | Stockage de fichiers (photos d'enfants, prescriptions, avatars) | Fichiers images, chemins de stockage | UE (hébergement AWS eu-west-1) | Art. 46 RGPD — clauses contractuelles types |
| **Stripe** (stripe.com) | Traitement des paiements et abonnements | Nom, email, identifiant client Stripe, données de paiement | États-Unis / UE | Art. 46 RGPD — clauses contractuelles types + accord UE-US |
| **Google** (SMTP Gmail) | Envoi d'emails transactionnels | Adresse email destinataire, contenu du message | États-Unis / UE | Art. 46 RGPD — clauses contractuelles types |
| **Google Analytics 4** | Mesure d'audience anonymisée du site public | Données de navigation anonymisées (IP tronquée) | États-Unis / UE | Consentement explicite (Art. 6.1.a) |
| **Web Push API** (VAPID) | Notifications push navigateur | Token de souscription push, identifiant utilisateur | Navigateur de l'utilisateur — pas de tiers | Consentement (Art. 6.1.a) |

> **Hébergement applicatif** : Serveur propre / VPS géré par le responsable du traitement. Base de données PostgreSQL locale. Les données applicatives ne transitent pas chez un hébergeur cloud tiers sauf les fichiers listés ci-dessus (Supabase).

---

## Traitements

---

### Traitement 1 — Gestion des comptes utilisateurs

| Champ | Détail |
|---|---|
| **Finalité** | Permettre l'accès authentifié à l'application, gérer les rôles et permissions |
| **Base légale** | Art. 6.1.b — Exécution d'un contrat (CGU acceptées lors de l'inscription) |
| **Catégories de personnes concernées** | Administrateurs de structure, assistantes maternelles, parents |
| **Catégories de données** | Email, mot de passe (haché bcrypt), nom complet, téléphone, adresse, ville, code postal, région, pays, rôle applicatif, langue préférée, photo de profil (URL Supabase), statut de vérification email, fournisseur OAuth (Google), préférences de notification, consentement cookies |
| **Données sensibles** | Non |
| **Destinataires** | Responsable du traitement, administrateurs de la structure (accès restreint par rôle) |
| **Durée de conservation** | Durée de la relation contractuelle. Anonymisation automatique après 2 ans d'inactivité (updatedAt) |
| **Transfert hors UE** | Non (données stockées localement) |
| **Mesures de sécurité** | Hachage bcrypt (mots de passe), JWT à courte durée de vie (access token), refresh token en base, connexion HTTPS obligatoire, vérification email |

---

### Traitement 2 — Gestion des enfants (données de santé)

| Champ | Détail |
|---|---|
| **Finalité** | Suivi de l'enfant dans la structure : identité, santé, groupes d'âge, présences, affectation aux nounous |
| **Base légale** | Art. 6.1.c — Obligation légale (suivi médical et réglementaire des structures d'accueil) + Art. 9.2.h — Prévention et médecine (allergies, prescriptions) |
| **Catégories de personnes concernées** | Enfants mineurs accueillis dans la structure |
| **Catégories de données** | Prénom, date de naissance, âge, sexe, groupe d'âge (G1-G6), allergies (champ texte libre), ordonnances/prescriptions médicales (fichier PDF — URL Supabase), photo de l'enfant (URL Supabase), date de cotisation |
| **Données sensibles** | **OUI — données de santé (Art. 9 RGPD)** : allergies, prescriptions médicales |
| **Destinataires** | Administrateurs de la structure, assistantes maternelles affectées à l'enfant, parents de l'enfant (lecture seule) |
| **Durée de conservation** | Durée de la prise en charge de l'enfant + 5 ans (prescription légale responsabilité civile) |
| **Transfert hors UE** | Fichiers images et PDF stockés sur Supabase (voir sous-traitants) |
| **Mesures de sécurité** | Accès restreint par centerId (cloisonnement par structure), contrôle de rôle applicatif, stockage fichiers dans un bucket privé Supabase (PrivacyPicture) |

---

### Traitement 3 — Gestion des assistantes maternelles / nounous

| Champ | Détail |
|---|---|
| **Finalité** | Gestion des intervenants de la structure : identité, disponibilité, expérience, plannings, cotisations |
| **Base légale** | Art. 6.1.b — Exécution du contrat de travail / d'association |
| **Catégories de personnes concernées** | Assistantes maternelles, nounous, stagiaires, remplaçantes |
| **Catégories de données** | Nom, email, contact (téléphone), rôle (Nounou Senior / Responsable / Stagiaire / Remplaçante / Autre), disponibilité (Disponible / En congé / Maladie), expérience (en années), date de naissance, date de cotisation, montant de la dernière cotisation |
| **Données sensibles** | Données relatives à la santé (disponibilité = Maladie) — traitement justifié par Art. 9.2.b (obligations en matière de droit du travail) |
| **Destinataires** | Administrateurs de la structure |
| **Durée de conservation** | Durée de la relation de travail + 5 ans |
| **Transfert hors UE** | Non |
| **Mesures de sécurité** | Accès restreint par centerId, contrôle de rôle |

---

### Traitement 4 — Gestion des parents

| Champ | Détail |
|---|---|
| **Finalité** | Suivi des familles : identité, enfants rattachés, facturation |
| **Base légale** | Art. 6.1.b — Exécution du contrat de garde d'enfants |
| **Catégories de personnes concernées** | Parents ou représentants légaux des enfants accueillis |
| **Catégories de données** | Prénom, nom, email, téléphone |
| **Données sensibles** | Non |
| **Destinataires** | Administrateurs de la structure, assistantes maternelles (lecture limitée) |
| **Durée de conservation** | Durée de la prise en charge de l'enfant + 5 ans |
| **Transfert hors UE** | Non |
| **Mesures de sécurité** | Accès restreint par centerId |

---

### Traitement 5 — Messagerie interne

| Champ | Détail |
|---|---|
| **Finalité** | Communication directe entre membres de la structure (nounous, administrateurs, parents) |
| **Base légale** | Art. 6.1.b — Exécution du contrat (outil de communication inclus dans le service) |
| **Catégories de personnes concernées** | Tous les utilisateurs de l'application |
| **Catégories de données** | Contenu des messages texte, pièces jointes (URL médias), identifiant expéditeur, horodatage, identifiant de conversation, liste des participants |
| **Données sensibles** | Potentiellement (selon contenu des messages — non contrôlé par le responsable du traitement) |
| **Destinataires** | Participants à la conversation, administrateurs de la structure (accès technique en cas de signalement) |
| **Durée de conservation** | Suppression automatique après **3 ans** (cron dataRetentionCron, quotidien à 02:00) |
| **Transfert hors UE** | Non (données stockées localement) |
| **Mesures de sécurité** | Accès restreint aux participants de la conversation, cloisonnement par centerId |

---

### Traitement 6 — Fil d'actualité et photos partagées

| Champ | Détail |
|---|---|
| **Finalité** | Partage de photos et messages d'activité entre la structure et les parents |
| **Base légale** | Art. 6.1.a — Consentement (les parents donnent leur accord photo via le formulaire de consentement photographique) |
| **Catégories de personnes concernées** | Enfants apparaissant dans les photos, utilisateurs auteurs des publications |
| **Catégories de données** | Texte libre, photos et vidéos (URL Supabase, chemin de stockage, hash MD5, miniature), visibilité (Centre / Parents / Public), commentaires, réactions (likes), horodatage, enfant associé |
| **Données sensibles** | **OUI — images d'enfants mineurs** |
| **Destinataires** | Membres de la structure (visibilité Centre), parents des enfants concernés (visibilité Parents), public (visibilité Public — uniquement si explicitement choisi) |
| **Durée de conservation** | Suppression automatique après **3 ans** (cron dataRetentionCron) |
| **Transfert hors UE** | Fichiers stockés sur Supabase (voir sous-traitants) |
| **Mesures de sécurité** | Consentement photographique explicite par enfant et par parent (table PhotoConsent), contrôle de visibilité par publication, stockage privé Supabase |

---

### Traitement 7 — Consentements photographiques

| Champ | Détail |
|---|---|
| **Finalité** | Tracer et conserver le consentement donné par chaque parent pour la publication de photos de son enfant |
| **Base légale** | Art. 6.1.a — Consentement + Art. 8 RGPD (mineur) |
| **Catégories de personnes concernées** | Parents, enfants mineurs |
| **Catégories de données** | Identifiant enfant, identifiant parent, valeur du consentement (oui/non), date d'octroi |
| **Données sensibles** | Non (le consentement lui-même n'est pas sensible) |
| **Destinataires** | Administrateurs de la structure |
| **Durée de conservation** | Durée de la prise en charge de l'enfant + 5 ans |
| **Transfert hors UE** | Non |
| **Mesures de sécurité** | Enregistrement horodaté en base, non modifiable après octroi |

---

### Traitement 8 — Plannings et présences

| Champ | Détail |
|---|---|
| **Finalité** | Gestion des plannings hebdomadaires des nounous, affectation des enfants, suivi mensuel des présences (feuilles de présence avec signatures) |
| **Base légale** | Art. 6.1.c — Obligation légale (les assistantes maternelles agréées doivent tenir des registres de présence conformément au Code du travail) |
| **Catégories de personnes concernées** | Enfants, assistantes maternelles, parents (pour signature) |
| **Catégories de données** | Date, heure d'arrivée et de départ, statut (absent/présent), commentaire, jours contractuels/présence/absence, heures complémentaires, signature électronique nounou (base64), signature électronique parent (base64), horodatage des signatures |
| **Données sensibles** | Données relatives à la présence de l'enfant (sensibles indirectement) |
| **Destinataires** | Administrateurs, nounous concernées, parents de l'enfant concerné |
| **Durée de conservation** | 5 ans (obligation légale comptable et réglementaire pour les assistantes maternelles) |
| **Transfert hors UE** | Non |
| **Mesures de sécurité** | Accès restreint par centerId et rôle, signatures horodatées |

---

### Traitement 9 — Rapports d'activité quotidiens

| Champ | Détail |
|---|---|
| **Finalité** | Traçabilité des événements de la journée concernant un enfant (repas, sieste, activité, incident) |
| **Base légale** | Art. 6.1.b — Exécution du contrat de garde + Art. 6.1.c — Obligation légale (signalement incident) |
| **Catégories de personnes concernées** | Enfants |
| **Catégories de données** | Type de rapport (priorité, catégorie, statut), résumé textuel, détails, date, durée, nombre d'enfants impliqués, identifiant enfant, identifiant nounou |
| **Données sensibles** | Potentiellement (selon le type de rapport — incident médical) |
| **Destinataires** | Nounous de la structure, administrateurs, parents (selon type) |
| **Durée de conservation** | 5 ans |
| **Transfert hors UE** | Non |
| **Mesures de sécurité** | Accès restreint par centerId |

---

### Traitement 10 — Facturation et historique de paiements

| Champ | Détail |
|---|---|
| **Finalité** | Calcul des cotisations mensuelles, génération de factures, suivi des paiements parents |
| **Base légale** | Art. 6.1.c — Obligation légale (comptabilité, facturation — Code de commerce Art. L123-22) |
| **Catégories de personnes concernées** | Parents |
| **Catégories de données** | Mois/année, montant total, détail du calcul (JSON), statut payé/non payé, ajustements manuels avec commentaire |
| **Données sensibles** | Non |
| **Destinataires** | Administrateurs de la structure, prestataire comptable le cas échéant |
| **Durée de conservation** | **10 ans** (obligation légale comptable — Art. L123-22 Code de commerce) |
| **Transfert hors UE** | Non |
| **Mesures de sécurité** | Accès restreint aux administrateurs |

---

### Traitement 11 — Abonnements SaaS et paiements Stripe

| Champ | Détail |
|---|---|
| **Finalité** | Gestion de l'abonnement au logiciel Frimousse (plan, période d'essai, renouvellement, résiliation) |
| **Base légale** | Art. 6.1.b — Exécution du contrat SaaS |
| **Catégories de personnes concernées** | Administrateurs/responsables de structure ayant souscrit un abonnement |
| **Catégories de données** | Identifiant Stripe client (stripeCustomerId), identifiant abonnement Stripe, plan (decouverte/essentiel/pro), statut, dates de début/fin de période, date d'essai gratuit, date de résiliation |
| **Données sensibles** | Non (les données bancaires sont exclusivement gérées par Stripe — PCI-DSS) |
| **Destinataires** | Responsable du traitement, Stripe (sous-traitant) |
| **Durée de conservation** | Durée de l'abonnement + 10 ans (obligation légale comptable) |
| **Transfert hors UE** | Oui — vers Stripe (États-Unis) via clauses contractuelles types |
| **Mesures de sécurité** | Clés API Stripe séparées (clé secrète côté serveur uniquement), vérification de signature des webhooks (STRIPE_WEBHOOK_SECRET) |

---

### Traitement 12 — Notifications push et in-app

| Champ | Détail |
|---|---|
| **Finalité** | Envoi de notifications en temps réel aux utilisateurs (nouveaux messages, publications, alertes) |
| **Base légale** | Art. 6.1.a — Consentement (permission push accordée par le navigateur) |
| **Catégories de personnes concernées** | Tous les utilisateurs ayant activé les notifications |
| **Catégories de données** | Token de souscription push (JSON VAPID), identifiant utilisateur, horodatage d'enregistrement; historique in-app : titre, corps, données métadonnées (JSON), statut lu/non lu |
| **Données sensibles** | Non |
| **Destinataires** | Responsable du traitement (envoi), navigateur de l'utilisateur |
| **Durée de conservation** | Souscriptions push : suppression automatique après **2 ans** (cron). Notifications in-app : suppression automatique après **6 mois** (cron) |
| **Transfert hors UE** | Non — protocole VAPID standard, pas de tiers |
| **Mesures de sécurité** | Clés VAPID (publique/privée) stockées en variable d'environnement serveur |

---

### Traitement 13 — Emails transactionnels

| Champ | Détail |
|---|---|
| **Finalité** | Envoi d'emails automatiques : vérification de compte, alertes fin d'essai, échec de paiement, résumés de facturation |
| **Base légale** | Art. 6.1.b — Exécution du contrat (emails de service) ; Art. 6.1.c — Obligation légale (confirmation de paiement) |
| **Catégories de personnes concernées** | Tous les utilisateurs |
| **Catégories de données** | Adresse email destinataire, objet, contenu du message, statut d'envoi (sent/failed), identifiant message SMTP, horodatage |
| **Données sensibles** | Non |
| **Destinataires** | Responsable du traitement, Google (SMTP Gmail — sous-traitant) |
| **Durée de conservation** | Logs d'envoi conservés 1 an à des fins de débogage |
| **Transfert hors UE** | Oui — SMTP Gmail (Google, États-Unis) via clauses contractuelles types |
| **Mesures de sécurité** | Authentification SMTP (TLS port 587), pas de mot de passe en clair (App Password Google), option d'opt-out respectée (notifyByEmail) |

---

### Traitement 14 — Tickets de support

| Champ | Détail |
|---|---|
| **Finalité** | Gestion des demandes d'assistance des utilisateurs |
| **Base légale** | Art. 6.1.b — Exécution du contrat (support inclus dans le service) |
| **Catégories de personnes concernées** | Utilisateurs de l'application |
| **Catégories de données** | Objet du ticket, message, statut (ouvert/fermé), réponses de l'administrateur, horodatages |
| **Données sensibles** | Potentiellement (selon le contenu — non contrôlé) |
| **Destinataires** | Responsable du traitement (super-admin) |
| **Durée de conservation** | 2 ans après clôture du ticket |
| **Transfert hors UE** | Non |
| **Mesures de sécurité** | Accès restreint au rôle super-admin |

---

### Traitement 15 — Cookies analytiques et mesure d'audience

| Champ | Détail |
|---|---|
| **Finalité** | Mesurer l'audience du site public (lesfrimousses.com) pour améliorer le service |
| **Base légale** | Art. 6.1.a — Consentement explicite (bannière cookie, CNIL) |
| **Catégories de personnes concernées** | Visiteurs du site public |
| **Catégories de données** | Données de navigation anonymisées (pages vues, durée, source), IP tronquée (anonymisation GA4 activée), identifiant de session anonyme |
| **Données sensibles** | Non |
| **Destinataires** | Responsable du traitement, Google Analytics (sous-traitant) |
| **Durée de conservation** | 13 mois (paramétrage Google Analytics) |
| **Transfert hors UE** | Oui — Google (États-Unis) via clauses contractuelles types |
| **Mesures de sécurité** | Script GA4 chargé uniquement après consentement explicite (injection dynamique), choix conservé en localStorage, retrait du consentement possible à tout moment |

---

### Traitement 16 — Authentification et sécurité des sessions

| Champ | Détail |
|---|---|
| **Finalité** | Maintenir les sessions utilisateurs de manière sécurisée, prévenir les accès non autorisés |
| **Base légale** | Art. 6.1.f — Intérêt légitime (sécurité du service) |
| **Catégories de personnes concernées** | Tous les utilisateurs connectés |
| **Catégories de données** | Token de rafraîchissement JWT (haché), date d'expiration, identifiant utilisateur; codes de vérification email (temporaires) |
| **Données sensibles** | Non |
| **Destinataires** | Responsable du traitement |
| **Durée de conservation** | Refresh tokens : supprimés à la déconnexion ou à expiration. Codes de vérification : supprimés après utilisation ou expiration |
| **Transfert hors UE** | Non |
| **Mesures de sécurité** | Tokens JWT signés (RS256/HS256), expiration courte (access token), rotation des refresh tokens, HTTPS obligatoire |

---

### Traitement 17 — Avis et témoignages publics

| Champ | Détail |
|---|---|
| **Finalité** | Afficher des témoignages de structures sur la page d'accueil publique |
| **Base légale** | Art. 6.1.a — Consentement (soumission volontaire de l'avis) |
| **Catégories de personnes concernées** | Responsables de structures ayant laissé un avis |
| **Catégories de données** | Nom de l'auteur, email (pour dédoublonnage — non affiché publiquement), contenu de l'avis, note (1-5), structure associée |
| **Données sensibles** | Non |
| **Destinataires** | Visiteurs du site public (nom + contenu uniquement, après modération) |
| **Durée de conservation** | Durée de publication, suppression sur demande de l'auteur |
| **Transfert hors UE** | Non |
| **Mesures de sécurité** | Modération avant publication (approved = false par défaut) |

---

### Traitement 18 — Relances inscription abandonnée

| Champ | Détail |
|---|---|
| **Finalité** | Relancer automatiquement les utilisateurs ayant commencé une inscription sans la terminer |
| **Base légale** | Art. 6.1.f — Intérêt légitime (conversion commerciale, relance limitée) |
| **Catégories de personnes concernées** | Utilisateurs ayant créé un compte mais n'ayant pas finalisé leur profil |
| **Catégories de données** | Identifiant utilisateur, nombre de relances envoyées, date de dernière relance |
| **Données sensibles** | Non |
| **Destinataires** | Responsable du traitement |
| **Durée de conservation** | Supprimé après finalisation de l'inscription ou après 3 relances |
| **Transfert hors UE** | Non |
| **Mesures de sécurité** | Maximum de relances limité (compteur sentCount), respect de l'opt-out |

---

## Droits des personnes concernées

| Droit | Modalité d'exercice | Délai de réponse |
|---|---|---|
| Accès (Art. 15) | Export automatique depuis Paramètres → "Exporter mes données" | Immédiat (téléchargement JSON) |
| Rectification (Art. 16) | Via le profil utilisateur dans l'application | Immédiat |
| Effacement (Art. 17) | Bouton "Supprimer mon compte" dans Paramètres | Immédiat (suppression en cascade) |
| Portabilité (Art. 20) | Export JSON depuis Paramètres (format lisible par machine) | Immédiat |
| Opposition (Art. 21) | Contact : lespetitesfrimoussesdu13@gmail.com | 30 jours |
| Retrait du consentement | Bannière cookie accessible depuis le bas de page | Immédiat |
| Réclamation | CNIL — www.cnil.fr | — |

---

## Mesures de sécurité générales

- **Chiffrement en transit** : HTTPS (TLS 1.2+) sur toutes les communications client-serveur
- **Chiffrement des mots de passe** : bcrypt (coût ≥ 10 rounds), jamais stockés en clair
- **Authentification** : JWT access token (durée courte) + refresh token en base (rotation)
- **Contrôle d'accès** : cloisonnement des données par `centerId` — un utilisateur ne peut accéder qu'aux données de sa structure
- **Contrôle de rôle** : middlewares vérifiant le rôle (admin, nanny, parent, super-admin) sur chaque route
- **Stockage fichiers sensibles** : bucket Supabase privé (PrivacyPicture) — accès par URL signée uniquement
- **Webhooks Stripe** : vérification de signature HMAC (`STRIPE_WEBHOOK_SECRET`) à chaque événement
- **Variables d'environnement** : aucune clé secrète dans le code source versionné
- **Purge automatique** : cron quotidien (02:00) supprimant les données expirées selon les durées définies

---

## Historique des modifications

| Date | Version | Description |
|---|---|---|
| 04/04/2026 | 1.0 | Création initiale du registre |

---

*Document établi conformément à l'Article 30 du Règlement (UE) 2016/679 (RGPD).*
*À conserver en interne et à tenir à jour. À présenter à la CNIL sur demande.*
