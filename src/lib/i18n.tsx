import React, { useEffect, useMemo, useState } from 'react';
import { I18nContext } from './i18nContext';
import type { Locale } from './i18nContext';

const translations: Record<Locale, Record<string, string>> = {
  fr: {
    'nav.assistant': 'Assistant IA',
  'assistant.title': "Assistant Frimousse",
  'assistant.header.title': "Assistant Frimousse",
    'assistant.header.subtitle': "· Conseils et aide pour la petite enfance",
    'assistant.intro.title': "Assistant",
    'assistant.intro.description': "Je suis votre assistant pour la petite enfance. Je peux vous aider avec :",
    'assistant.option.nutrition': "Conseils nutrition",
    'assistant.option.nutrition.example': "Que cuisiner pour mon enfant ?",
    'assistant.option.education': "Conseils pédagogiques",
    'assistant.option.education.example': "Développement et apprentissages adaptés à l'âge",
    'assistant.option.activities': "Activités suggérées",
    'assistant.option.activities.example': "Jeux et exercices selon l'âge",
    'assistant.user.fallback': 'Vous',
    'assistant.input.aria': "Votre question",
    'assistant.input.placeholder': "Posez votre question à l'assistant...",
    'assistant.loading': 'Chargement...',
    'assistant.send.button': 'Envoyer',
    'common.none': '—',
    'payments.history.title': 'Historique des paiements',
    'payments.history.empty': "Aucun enregistrement pour cette période.",
    'payments.total': 'Total',
    'payments.days': 'jours',
    'payments.export_csv': 'Excel',
    'payments.print': 'PDF',
      // Reports
      'reports.title': 'Rapports',
      'reports.new': 'Nouveau Rapport',
      'reports.create': 'Créer',
      'reports.save': 'Sauvegarder',
      'reports.delete': 'Supprimer',
      'reports.cancel': 'Annuler',
      'reports.filter.last30': '30 derniers jours',
      'reports.filter.allTypes': 'Tous les types',
      'reports.filter.allPriorities': 'Toutes priorités',
      'reports.empty': 'Aucun rapport disponible',

      'reports.card.total': 'Total Rapports',
      'reports.card.week': 'Cette Semaine',

      'reports.modal.title.new': 'Nouveau rapport',
  'reports.modal.title.edit': 'Modifier le rapport',
      'reports.field.title': 'Titre',
      'reports.field.type': 'Type',
      'reports.field.priority': 'Priorité',
      'reports.field.child': "Sélectionner l'enfant",
      'reports.field.nanny': "Sélectionner la nounou",
      'reports.field.role': 'Sélectionner le rôle',
      'reports.field.group': 'Sélectionner le groupe',
  'reports.field.description': 'Description',
  'reports.field.duration': 'Durée',
  'reports.field.childrenInvolved': 'Nb enfants impliqués',
  'reports.card.duration': 'Durée',
  'reports.card.childrenInvolved': '{n} enfants impliqués',

  'label.age': 'Âge',
  'reports.field.summary': 'Résumé du rapport',

  'reports.summary.incident': 'Résumé du Rapport',
  'reports.summary.comportement': 'Observation Comportementale',
  'reports.summary.soin': 'Observation de Soin',

  'reports.search.placeholder': "Rechercher par nom d'enfant",

      // priority labels
      'reports.priority.haute': 'PRIORITÉ HAUTE',
      'reports.priority.moyenne': 'MOYENNE',
      'reports.priority.basse': 'BASSE',
      // type labels
      'reports.type.incident': 'INCIDENT',
      'reports.type.comportement': 'COMPORTEMENT',
      'reports.type.soin': 'SOINS',

      // child groups
      'children.group.G1': 'Groupe 1 (0-1 ans)',
      'children.group.G2': 'Groupe 2 (1-2 ans)',
      'children.group.G3': 'Groupe 3 (2-3 ans)',
      'children.group.G4': 'Groupe 4 (3-4 ans)',
      'children.group.G5': 'Groupe 5 (4-5 ans)',
      'children.group.G6': 'Groupe 6 (5-6 ans)',

      // nanny roles
      'nanny.role.senior': 'Nounou Senior',
      'nanny.role.manager': 'Responsable',
      'nanny.role.trainee': 'Stagiaire',
      'nanny.role.substitute': 'Remplaçante',
      'nanny.role.other': 'Autre',

    'global.add': 'Ajouter',
    'global.save': 'Enregistrer',
    'global.cancel': 'Annuler',
    'global.delete': 'Supprimer',
    'page.dashboard': 'Tableau de bord',
  'dashboard.welcome': "Bienvenue ! Voici ce qui se passe aujourd'hui.",
  'dashboard.children_registered': 'Enfants inscrits',
  'dashboard.since_last_month': 'depuis le mois dernier',
  'dashboard.present_today': "Présents aujourd'hui",
  'dashboard.presence_rate': 'Taux de présence',
  'dashboard.active_caregivers': 'Intervenants actifs',
  'dashboard.no_change': '— Pas de changement',
  'dashboard.weekly_average': 'Moyenne hebdomadaire',
  'dashboard.since_last_week': 'depuis la semaine dernière',
    'page.feed': 'Fil d\'actualité',
    'page.children': 'Enfants',
  'page.children.title': 'Gestion des enfants',
  'page.children.description': "Gérez les profils, informations médicales et contacts d'urgence.",
  'children.add': 'Ajouter un enfant',
  'children.prescription.noneTitle': "Aucune ordonnance",
  'children.prescription.noneMessage': "Il n'y a pas d'ordonnance pour {name}.",
  'children.thisChild': 'cet enfant',
  'children.search_placeholder': 'Rechercher par nom, parent...',
  'children.group.all': 'Tous les groupes',
  'children.sort.name': 'Nom A-Z',
  'children.sort.age': 'Âge croissant',
  'children.total': 'Total',
  'children.present': 'Présents',
  'children.form.name': 'Nom',
  'children.form.age': 'Âge',
  'children.form.birthDate': 'Date de naissance',
  'children.form.sexe.m': 'Garçon',
  'children.form.sexe.f': 'Fille',
  'children.form.group_placeholder': 'Groupe',
  'children.form.parent_placeholder': 'Nom du parent (optionnel)',
  'children.form.parentPhone_placeholder': 'Téléphone parent (optionnel)',
  'children.form.parentEmail_placeholder': 'Email parent (optionnel)',
  'children.nannies.label': 'Nounous assignées (sélection multiple)',
  'children.nannies.none': 'Aucune nounou disponible',
  'children.form.allergies_placeholder': 'Allergies (optionnel)',
  'children.form.edit': 'Modifier',
  'children.form.added_success': "L'enfant a bien été ajouté !",
  'children.loading': 'Chargement...',
  'children.presence.present_today': "Présent aujourd'hui",
  'children.presence.absent_today': "Absent aujourd'hui",
  'children.new_badge': 'Nouveau',
  'children.assigned': 'Assigné: {names}',
  'children.not_assigned': 'Non assigné',
  'children.birthDate.undefined': 'Non définie',
  'children.allergies.label': 'Allergies :',
  'children.allergies.none': 'Aucune',
  'children.parent.label': 'Parent :',
  'children.call_parent_title': 'Appeler le parent',
  'children.email_parent_title': 'Envoyer un mail au parent',
  'children.cotisation.pay': 'Payer',
  'children.cotisation.label': 'Cotisation annuelle',
  'children.cotisation.this_month': 'À payer ce mois-ci',
  'children.cotisation.up_to_date': 'Cotisation à jour',
  'children.cotisation.days_remaining': '{days} jours restants',
  'children.cotisation.renew': 'Cotisation à renouveler',
  'children.billing.calculating': 'calcul...',
  'children.prescription.view_title': 'Ordonnance de {name}',
  'children.delete.confirm_title': 'Confirmer la suppression',
  'children.delete.confirm_body': "Voulez-vous vraiment supprimer cet enfant ? Cette action est irréversible.",
  'children.prescription.view_button': 'Voir ordonnance',
  'children.action.edit': 'Éditer',
  'children.action.delete': 'Supprimer',
  'children.deleting': 'Suppression...',
  'children.photo_consent.yes': 'Autorisation photos: Oui',
  'children.photo_consent.no': 'Autorisation photos: Non',
  'children.photo_consent.unknown': 'Autorisation: —',
  'common.ok': 'OK',
  'common.at': 'à',
  // parent / form / card translations
  'parent.form.firstName': 'Prénom',
  'parent.form.lastName': 'Nom',
  'parent.form.email': 'Email',
  'parent.form.phone': 'Téléphone',
  'parent.form.address': 'Adresse',
  'parent.form.postalCode': 'Code postal',
  'parent.form.city': 'Ville',
  'parent.form.region': 'Région',
  'parent.form.country': 'Pays',
  'parent.form.password.placeholder': 'Mot de passe (laisser vide pour envoyer une invitation)',
  'parent.form.confirmPassword.placeholder': 'Confirmer le mot de passe',
  'parent.form.submit.add': 'Ajouter',
  'parent.form.submit.save': 'Enregistrer',
  'parent.form.cancel': 'Annuler',
  'parent.form.error.required': 'Les champs Prénom, Nom et Email sont requis',
  'parent.form.error.password_mismatch': "Les mots de passe ne correspondent pas",
  'parent.form.success.created_with_password': 'Parent créé avec mot de passe.',
  'parent.form.success.created_invited': 'Parent créé — une invitation a été envoyée.',
  'parent.form.success.updated': 'Parent modifié.',
  'parent.reset.confirm_title': 'Confirmer la réinitialisation du mot de passe',
  'parent.reset.confirm_body': 'Vous allez réinitialiser le mot de passe de ce parent. Voulez-vous continuer ?',
  'parent.reset.cancel': 'Annuler',
  'parent.reset.confirm': 'Confirmer',
  'parent.delete.confirm_body': 'Voulez-vous vraiment supprimer ce parent ? Cette action est irréversible.',
  'parent.children.count': '{n} enfant(s)',
  'parent.prescription.upload': 'Téléverser',
  'parent.prescription.delete': 'Supprimer',
  'parent.prescription.upload_failed': 'Échec de l\'upload de l\'ordonnance.',
  'parent.prescription.delete_failed': 'Échec de la suppression de l\'ordonnance.',
  'parent.prescription.fetch_error': 'Erreur lors de la récupération de l\'ordonnance',
  'parent.cotisation.this_month': 'À payer ce mois',
  'parent.cotisation.annual_total': 'Cotisation annuelle totale',
  'common.yes': 'Oui',
  'common.no': 'Non',
  'common.confirm': 'Confirmer',
  'common.close': 'Fermer',
  'common.search': 'Rechercher',
  'common.all': 'Tous',
    'page.parent': 'Parents',
  'page.parent.description': 'Gérez les comptes parents, contacts et enfants associés.',
  'parent.add': 'Ajouter un parent',
    'page.nannies': 'Nounous',
  'page.nannies.description': "Gérez les profils, plannings, qualifications et affectations des intervenants.",
  'nanny.add': 'Ajouter une nounou',
  'nav.dashboard': 'Accueil',
  'nav.feed': 'Fil d\'actualité',
  'nav.notifications': 'Notifications',
  'nav.children': 'Enfants',
  'nav.children_my': 'Mes enfants',
  'nav.parents': 'Parents',
  'nav.nannies': 'Nounous',
  'nav.activities': 'Planning d\'activités',
  'nav.reports': 'Rapports',
  'nav.payments': 'Historique paiements',
  'nav.settings': 'Paramètres',
    'page.activities': 'Activités',
    'page.reports': 'Rapports',
  'page.reports.description': "Consultez tous les signalements des nounous concernant les incidents, comportements et observations quotidiennes des enfants.",
    'page.payments': 'Paiements',
    'page.payments.description': 'Consultez les totaux mensuels calculés pour chaque parent.',
  'payments.filter.all_parents': 'Tous les parents',
  'payments.download_invoice': 'Facture',
  'payments.card.month_revenue': 'Revenus du Mois',
  'payments.card.families_active': 'Familles Actives',
  'payments.card.unpaid': 'Paiements en attente',
  'payments.status.paid': 'Payé',
  'payments.status.unpaid': 'Non payé',
  'payments.actions.mark_paid': 'Marquer payé',
  'payments.actions.mark_unpaid': 'Marquer non payé',
  'payments.detail.header': 'Détail par enfant - {month}',
  'payments.family.total_label': 'Total Famille',
  'payments.family.summary': '{n} enfant(s) • {days} jours total',
  'payments.errors.select_parent': "Sélectionnez d'abord un parent pour générer la facture.",
  'payments.errors.no_record_parent': 'Aucun enregistrement pour ce parent ce mois.',
  'payments.errors.invoice_not_ready': "Le mois en cours n'est pas fini : vous ne pouvez pas télécharger cette facture.",
  'payments.errors.invoice_download': 'Erreur lors du téléchargement de la facture',
  'payments.no_child_this_month': "Aucun enfant présent ce mois.",
  'feed.write_comment': 'Écrire un commentaire...',
  'feed.send': 'Envoyer',
  'feed.center_news': "Actualités de votre centre",
  'feed.composer_placeholder': "Que voulez-vous partager aujourd'hui ?",
  'feed.photo': 'Photo',
  'feed.gallery': 'Galerie',
  'feed.no_images': 'Aucune image sélectionnée',
  'feed.images': 'image(s)',
  'feed.identify': 'Identifier',
  'feed.select_children': 'Sélectionner des enfants',
  'feed.no_children_available': 'Aucun enfant disponible',
  'feed.no_child': 'Pas d\'enfant',
  'feed.tag_children': 'Taguer des enfants',
  'feed.no_authorization': 'Pas d\'autorisation',
    'settings.title': 'Paramètres',
    'settings.email.title': 'Notifications par email',
    'settings.email.desc': "Recevoir un email pour chaque nouveau rapport ou affectation",
    'settings.push.title': 'Notifications push',
    'settings.push.desc': "Recevoir des notifications sur votre navigateur (rappels et annonces)",
    'settings.language.title': 'Langue',
    'settings.language.desc': "Choisissez la langue de l'interface",
    'settings.account.title': 'Gestion du compte',
    'settings.account.delete': 'Supprimer le compte',
    'settings.profile.edit': 'Modifier le profil',
    'settings.save': 'Enregistrer',
    'settings.cancel': 'Annuler',
    'settings.logout': 'Se déconnecter',
    'settings.change_password': 'Changer le mot de passe',
    'settings.delete_confirm.title': 'Confirmer la suppression du compte',
    'settings.delete_confirm.body': "Voulez-vous vraiment supprimer votre compte ? Cette action est irréversible et toutes vos données seront perdues.",
  'settings.delete_confirm.confirm': 'Supprimer',
  'settings.saving': 'Enregistrement...',
  'settings.delete_error': "Erreur lors de la suppression du compte",
  'availability.available': 'Disponible',
  'availability.on_leave': 'En congé',
  'availability.sick': 'Maladie',
  'settings.password.all_required': 'Tous les champs de mot de passe sont requis',
  'settings.password.mismatch': 'Les mots de passe ne correspondent pas',
    // Profile editor labels (minimal)
    'label.firstName': 'Prénom',
    'label.lastName': 'Nom',
    'label.email': 'Email',
    'label.phone': 'Téléphone',
    'label.name': 'Nom',
    'label.contact': 'Contact',
    'label.experience': 'Expérience (années)',
    'label.availability': 'Disponibilité',
    'label.birthDate': 'Date de naissance',
    'label.oldPassword': 'Ancien mot de passe',
    'label.newPassword': 'Nouveau mot de passe',
    'label.confirmPassword': 'Confirmer le nouveau mot de passe',
    'loading': 'Chargement...',
    'no_profile': 'Aucune donnée de profil disponible'
  },
  en: {
    // nav
    'nav.assistant': 'Assistant IA',
    'common.none': '—',
    'payments.history.title': 'Payment history',
    'payments.history.empty': 'No records for this period.',
    'payments.total': 'Total',
  'payments.days': 'days',
    'payments.export_csv': 'Excel',
    'payments.print': 'PDF',
    'payments.filter.all_parents': 'All parents',
    'payments.download_invoice': 'Invoice',
    'payments.card.month_revenue': 'Month revenue',
    'payments.card.families_active': 'Active families',
    'payments.card.unpaid': 'Unpaid payments',
    'payments.status.paid': 'Paid',
    'payments.status.unpaid': 'Unpaid',
    'payments.actions.mark_paid': 'Mark paid',
    'payments.actions.mark_unpaid': 'Mark unpaid',
    'payments.detail.header': 'Detail by child - {month}',
    'payments.family.total_label': 'Family total',
    'payments.family.summary': '{n} child(ren) • {days} total days',
    'payments.errors.select_parent': 'Please select a parent first to generate the invoice.',
    'payments.errors.no_record_parent': 'No record for this parent this month.',
  'payments.errors.invoice_not_ready': 'The current month is not finished: you cannot download this invoice yet.',
  'payments.errors.invoice_download': 'Failed to download the invoice',
  'payments.no_child_this_month': 'No child present this month.',
      // Reports
      'reports.title': 'Reports',
      'reports.new': 'New Report',
      'reports.create': 'Create',
      'reports.save': 'Save',
      'reports.delete': 'Delete',
      'reports.cancel': 'Cancel',
      'reports.filter.last30': 'Last 30 days',
      'reports.filter.allTypes': 'All types',
      'reports.filter.allPriorities': 'All priorities',
      'reports.empty': 'No reports available',

      'reports.card.total': 'Total Reports',
      'reports.card.week': 'This Week',

      'reports.modal.title.new': 'New report',
  'reports.modal.title.edit': 'Edit report',
      'reports.field.title': 'Title',
      'reports.field.type': 'Type',
      'reports.field.priority': 'Priority',
      'reports.field.child': 'Select child',
      'reports.field.nanny': 'Select nanny',
      'reports.field.role': 'Select role',
      'reports.field.group': 'Select group',
  'reports.field.description': 'Description',
  'reports.field.duration': 'Duration',
  'reports.field.childrenInvolved': 'Children involved',
  'reports.card.duration': 'Duration',
  'reports.card.childrenInvolved': '{n} children involved',

  'label.age': 'Age',
  'reports.field.summary': 'Report summary',

  'reports.summary.incident': 'Report summary',
  'reports.summary.comportement': 'Behavior observation',
  'reports.summary.soin': 'Care observation',

  'reports.search.placeholder': 'Search by child name',

      // priority labels
      'reports.priority.haute': 'HIGH PRIORITY',
      'reports.priority.moyenne': 'MEDIUM',
      'reports.priority.basse': 'LOW',
      // type labels
      'reports.type.incident': 'INCIDENT',
      'reports.type.comportement': 'BEHAVIOR',
      'reports.type.soin': 'CARE',

      // child groups
      'children.group.G1': 'Group 1 (0-1 yrs)',
      'children.group.G2': 'Group 2 (1-2 yrs)',
      'children.group.G3': 'Group 3 (2-3 yrs)',
      'children.group.G4': 'Group 4 (3-4 yrs)',
      'children.group.G5': 'Group 5 (4-5 yrs)',
      'children.group.G6': 'Group 6 (5-6 yrs)',

      // nanny roles
      'nanny.role.senior': 'Senior Nanny',
      'nanny.role.manager': 'Manager',
      'nanny.role.trainee': 'Trainee',
      'nanny.role.substitute': 'Substitute',
      'nanny.role.other': 'Other',

    'global.add': 'Add',
    'global.save': 'Save',
    'global.cancel': 'Cancel',
    'global.delete': 'Delete',
    'page.dashboard': 'Dashboard',
  'dashboard.welcome': "Welcome! Here's what's happening today.",
  'dashboard.children_registered': 'Children registered',
  'dashboard.since_last_month': 'since last month',
  'dashboard.present_today': 'Present today',
  'dashboard.presence_rate': 'Presence rate',
  'dashboard.active_caregivers': 'Active caregivers',
  'dashboard.no_change': '— No change',
  'dashboard.weekly_average': 'Weekly average',
  'dashboard.since_last_week': 'since last week',
    'page.feed': 'Feed',
    'page.children': 'Children',
  'page.children.title': 'Children management',
  'page.children.description': 'Manage profiles, medical information and emergency contacts.',
  'children.add': 'Add a child',
  'children.prescription.noneTitle': 'No prescription',
  'children.prescription.noneMessage': 'There is no prescription for {name}.',
  'children.thisChild': 'this child',
  'children.search_placeholder': 'Search by name, parent...',
  'children.group.all': 'All groups',
  'children.sort.name': 'Name A-Z',
  'children.sort.age': 'Age ascending',
  'children.total': 'Total',
  'children.present': 'Present',
  'children.form.name': 'Name',
  'children.form.age': 'Age',
  'children.form.birthDate': 'Birth date',
  'children.form.sexe.m': 'Boy',
  'children.form.sexe.f': 'Girl',
  'children.form.group_placeholder': 'Group',
  'children.form.parent_placeholder': 'Parent name (optional)',
  'children.form.parentPhone_placeholder': 'Parent phone (optional)',
  'children.form.parentEmail_placeholder': 'Parent email (optional)',
  'children.nannies.label': 'Assigned nannies (multi-select)',
  'children.nannies.none': 'No nanny available',
  'children.form.allergies_placeholder': 'Allergies (optional)',
  'children.form.edit': 'Edit',
  'children.form.added_success': "Child was added successfully!",
  'children.loading': 'Loading...',
  'children.presence.present_today': 'Present today',
  'children.presence.absent_today': 'Absent today',
  'children.new_badge': 'New',
  'children.assigned': 'Assigned: {names}',
  'children.not_assigned': 'Not assigned',
  'children.cotisation.pay': 'Pay',
  'children.cotisation.up_to_date': 'Cotisation up to date',
  'children.cotisation.days_remaining': '{days} days remaining',
  'children.cotisation.renew': 'Cotisation needs renewal',
  'children.billing.calculating': 'calculating...',
  'children.prescription.view_title': "Prescription for {name}",
  'children.delete.confirm_title': 'Confirm deletion',
  'children.delete.confirm_body': 'Are you sure you want to delete this child? This action is irreversible.',
    'children.cotisation.label': 'Annual fee',
    'children.cotisation.this_month': 'To pay this month',
    'children.prescription.view_button': 'View prescription',
    'children.action.edit': 'Edit',
    'children.action.delete': 'Delete',
    'children.deleting': 'Deleting...',
  'common.ok': 'OK',
  'common.at': 'at',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.confirm': 'Confirm',
  'common.close': 'Close',
  'common.search': 'Search',
  'common.all': 'All',
    'page.parent': 'Parents',
  'page.parent.description': 'Manage parent accounts, contacts and associated children.',
  'parent.add': 'Add a parent',
    'page.nannies': 'Nannies',
  'page.nannies.description': 'Manage profiles, schedules, qualifications and assignments of staff.',
  'nanny.add': 'Add a nanny',
  'nav.dashboard': 'Dashboard',
  'nav.feed': 'Feed',
  'nav.notifications': 'Notifications',
  'nav.children': 'Children',
  'nav.children_my': 'My children',
  'nav.parents': 'Parents',
  'nav.nannies': 'Nannies',
  'nav.activities': 'Activities',
  'nav.reports': 'Reports',
  'nav.payments': 'Payments history',
  'nav.settings': 'Settings',
    'page.activities': 'Activities',
    'page.reports': 'Reports',
  'page.reports.description': 'View all nanny reports about incidents, behaviors and daily observations of children.',
    'page.payments': 'Payments',
    'page.payments.description': 'View monthly totals calculated for each parent.',
  'feed.write_comment': 'Write a comment...',
  'feed.send': 'Send',
  'feed.center_news': 'Center news',
  'feed.composer_placeholder': "What's on your mind today?",
  'feed.photo': 'Photo',
  'feed.gallery': 'Gallery',
  'feed.no_images': 'No image selected',
  'feed.images': 'image(s)',
  'feed.identify': 'Identify',
  'feed.select_children': 'Select children',
  'feed.no_children_available': 'No children available',
  'feed.no_child': 'No child',
  'feed.tag_children': 'Tag children',
  'feed.no_authorization': 'No authorization',
    'settings.title': 'Settings',
    'settings.email.title': 'Email notifications',
    'settings.email.desc': 'Receive an email for each new report or assignment',
    'settings.push.title': 'Push notifications',
    'settings.push.desc': 'Receive notifications in your browser (reminders and announcements)',
    'settings.language.title': 'Language',
    'settings.language.desc': 'Choose the interface language',
    'settings.account.title': 'Account management',
    'settings.account.delete': 'Delete account',
    'settings.profile.edit': 'Edit profile',
    'settings.save': 'Save',
    'settings.cancel': 'Cancel',
    'settings.logout': 'Log out',
    'settings.change_password': 'Change password',
    'settings.delete_confirm.title': 'Confirm account deletion',
    'settings.delete_confirm.body': 'Are you sure you want to delete your account? This action is irreversible and all your data will be lost.',
  'settings.delete_confirm.confirm': 'Delete',
  'settings.saving': 'Saving...',
  'availability.available': 'Available',
  'availability.on_leave': 'On leave',
  'availability.sick': 'Sick',
  'settings.password.all_required': 'All password fields are required',
  'settings.password.mismatch': 'Passwords do not match',
    // Profile editor labels
    'label.firstName': 'First name',
    'label.lastName': 'Last name',
    'label.email': 'Email',
    'label.phone': 'Phone',
    'label.name': 'Name',
    'label.contact': 'Contact',
    'label.experience': 'Experience (years)',
    'label.availability': 'Availability',
    'label.birthDate': 'Birth date',
    'label.oldPassword': 'Old password',
    'label.newPassword': 'New password',
    'label.confirmPassword': 'Confirm new password',
    'loading': 'Loading...',
    'no_profile': 'No profile data available'
  }
};

// Admin Email Logs translations
translations.fr['admin.emaillogs.title'] = 'Journal des emails';
translations.fr['admin.emaillogs.description'] = "Historique des envois d'emails et gestion des relances";
translations.fr['admin.emaillogs.loading'] = 'Chargement...';
translations.fr['admin.emaillogs.search_placeholder'] = 'Rechercher par sujet, destinataire...';
translations.fr['admin.emaillogs.export'] = 'Exporter';
translations.fr['admin.emaillogs.all_recipients'] = 'Tous les destinataires';
translations.fr['admin.emaillogs.date_sent'] = "Date d'envoi";
translations.fr['admin.emaillogs.recipients'] = 'Destinataires';
translations.fr['admin.emaillogs.send_error'] = "Erreur d'envoi";
translations.fr['admin.emaillogs.view_invoice'] = 'Voir la facture';
translations.fr['admin.emaillogs.download'] = 'Télécharger';
translations.fr['admin.emaillogs.export_failed'] = "Impossible d'exporter les logs.";
translations.fr['admin.emaillogs.open_invoice_failed'] = "Impossible d'ouvrir la facture.";
translations.fr['admin.emaillogs.download_invoice_failed'] = "Impossible de télécharger la facture.";
translations.fr['admin.emaillogs.last_attempt'] = 'Dernière tentative {when}';
translations.fr['emaillogs.status.sent'] = 'Envoyé';
translations.fr['emaillogs.status.pending'] = 'En cours';
translations.fr['emaillogs.status.error'] = 'Erreur';

// Email logs table & pagination
translations.fr['emaillogs.table.subject'] = 'Sujet';
translations.fr['emaillogs.table.date'] = 'Date';
translations.fr['emaillogs.table.recipients'] = 'Destinataires';
translations.fr['emaillogs.table.invoice_number'] = 'N° Facture';
translations.fr['emaillogs.table.status'] = 'Statut';
translations.fr['emaillogs.table.error'] = 'Erreur';
translations.fr['emaillogs.table.actions'] = 'Actions';
translations.fr['emaillogs.pagination.prev'] = 'Précédent';
translations.fr['emaillogs.pagination.next'] = 'Suivant';
translations.fr['admin.emaillogs.resend'] = 'Renvoyer';
// mobile menu / misc
translations.fr['menu.open'] = 'Ouvrir le menu';
translations.fr['menu.close'] = 'Fermer le menu';
translations.fr['nav.reviews'] = 'Avis';

// Additional strings for admin emaillogs
translations.fr['admin.emaillogs.displaying'] = 'Affichage de {from} à {to} sur {total} résultats';
translations.fr['admin.emaillogs.choose_month'] = 'Choisir un mois';
translations.fr['admin.emaillogs.resend_failed'] = 'Erreur lors du renvoi : {msg}';


translations.en['admin.emaillogs.title'] = 'Email log';
translations.en['admin.emaillogs.description'] = 'History of sent emails and resend management';
translations.en['admin.emaillogs.loading'] = 'Loading...';
translations.en['admin.emaillogs.search_placeholder'] = 'Search by subject, recipient...';
translations.en['admin.emaillogs.export'] = 'Export';
translations.en['admin.emaillogs.all_recipients'] = 'All recipients';
translations.en['admin.emaillogs.date_sent'] = 'Date sent';
translations.en['admin.emaillogs.recipients'] = 'Recipients';
translations.en['admin.emaillogs.send_error'] = 'Send error';
translations.en['admin.emaillogs.view_invoice'] = 'View invoice';
translations.en['admin.emaillogs.download'] = 'Download';
translations.en['admin.emaillogs.export_failed'] = "Unable to export logs.";
translations.en['admin.emaillogs.open_invoice_failed'] = "Unable to open invoice.";
translations.en['admin.emaillogs.download_invoice_failed'] = "Unable to download invoice.";
translations.en['admin.emaillogs.last_attempt'] = 'Last attempt {when}';
translations.en['emaillogs.status.sent'] = 'Sent';
translations.en['emaillogs.status.pending'] = 'Pending';
translations.en['emaillogs.status.error'] = 'Error';

// Email logs table & pagination
translations.en['emaillogs.table.subject'] = 'Subject';
translations.en['emaillogs.table.date'] = 'Date';
translations.en['emaillogs.table.recipients'] = 'Recipients';
translations.en['emaillogs.table.invoice_number'] = 'Invoice #';
translations.en['emaillogs.table.status'] = 'Status';
translations.en['emaillogs.table.error'] = 'Error';
translations.en['emaillogs.table.actions'] = 'Actions';
translations.en['emaillogs.pagination.prev'] = 'Previous';
translations.en['emaillogs.pagination.next'] = 'Next';
translations.en['admin.emaillogs.resend'] = 'Resend';
// mobile menu / misc
translations.en['menu.open'] = 'Open menu';
translations.en['menu.close'] = 'Close menu';
translations.en['nav.reviews'] = 'Reviews';

// Additional strings for admin emaillogs
translations.en['admin.emaillogs.displaying'] = 'Showing {from} to {to} of {total} results';
translations.en['admin.emaillogs.choose_month'] = 'Choose a month';
translations.en['admin.emaillogs.resend_failed'] = 'Failed to resend: {msg}';

// Small stats labels used in ParentDashboard
translations.fr['stats.total'] = 'Total';
translations.fr['stats.active'] = 'Actifs';
translations.fr['stats.new'] = 'Nouveaux';

translations.en['stats.total'] = 'Total';
translations.en['stats.active'] = 'Active';
translations.en['stats.new'] = 'New';

// nanny / nannies page translations
translations.fr['page.nannies'] = 'Nounous';
translations.fr['page.nannies.description'] = "Gérez les profils, plannings, qualifications et affectations des intervenants.";
translations.fr['nanny.add'] = 'Ajouter une nounou';
translations.fr['nanny.available_label'] = 'Disponibles';
translations.fr['nanny.on_leave_label'] = 'En congé';
translations.fr['nanny.search_placeholder'] = 'Rechercher par nom...';
translations.fr['nanny.filter.any'] = 'Toute disponibilité';
translations.fr['nanny.filter.disponible'] = 'Disponible';
translations.fr['nanny.filter.en_conge'] = 'En congé';
translations.fr['nanny.filter.experience_any'] = 'Toute expérience';
translations.fr['nanny.filter.experience_junior'] = 'Junior (-3 ans)';
translations.fr['nanny.filter.experience_senior'] = 'Senior (3+ ans)';
translations.fr['nanny.form.name'] = 'Nom';
translations.fr['nanny.form.experience'] = 'Expérience (années)';
translations.fr['nanny.form.birthDate'] = 'Date de naissance';
translations.fr['nanny.form.specializations'] = 'Spécialisations (séparées par virgule)';
translations.fr['nanny.form.contact'] = 'Téléphone';
translations.fr['nanny.form.email'] = 'Email';
translations.fr['nanny.form.password'] = 'Mot de passe';
translations.fr['nanny.form.confirmPassword'] = 'Confirmer le mot de passe';
translations.fr['nanny.availability.available'] = 'Disponible';
translations.fr['nanny.availability.on_leave'] = 'En congé';
translations.fr['nanny.availability.sick'] = 'Maladie';
translations.fr['nanny.available_today'] = 'Disponibles aujourd\'hui';

translations.en['page.nannies'] = 'Nannies';
translations.en['page.nannies.description'] = 'Manage profiles, schedules, qualifications and assignments of staff.';
translations.en['nanny.add'] = 'Add a nanny';
translations.en['nanny.available_label'] = 'Available';
translations.en['nanny.on_leave_label'] = 'On leave';
translations.en['nanny.search_placeholder'] = 'Search by name...';
translations.en['nanny.filter.any'] = 'Any availability';
translations.en['nanny.filter.disponible'] = 'Available';
translations.en['nanny.filter.en_conge'] = 'On leave';
translations.en['nanny.filter.experience_any'] = 'Any experience';
translations.en['nanny.filter.experience_junior'] = 'Junior (-3 years)';
translations.en['nanny.filter.experience_senior'] = 'Senior (3+ years)';
translations.en['nanny.form.name'] = 'Name';
translations.en['nanny.form.experience'] = 'Experience (years)';
translations.en['nanny.form.birthDate'] = 'Birth date';
translations.en['nanny.form.specializations'] = 'Specializations (comma separated)';
translations.en['nanny.form.contact'] = 'Phone';
translations.en['nanny.form.email'] = 'Email';
translations.en['nanny.form.password'] = 'Password';
translations.en['nanny.form.confirmPassword'] = 'Confirm password';
translations.en['nanny.availability.available'] = 'Available';
translations.en['nanny.availability.on_leave'] = 'On leave';
translations.en['nanny.availability.sick'] = 'Sick';
translations.en['nanny.available_today'] = 'Available today';

// activities / weekly calendar translations
translations.fr['activities.title'] = 'Planning des activités';
translations.fr['activities.table.hour'] = 'Heure';
translations.fr['activities.none'] = 'Aucune activité';
translations.fr['activities.slot.morning'] = 'Matin';
translations.fr['activities.slot.afternoon'] = 'Après-midi';
translations.fr['activities.modal.nannies_label'] = 'Nounous';
translations.fr['activities.modal.no_nannies_loaded'] = "Aucune nounou chargée (vérifiez l'API ou la base de données)";

translations.en['activities.title'] = 'Activities schedule';
translations.en['activities.table.hour'] = 'Hour';
translations.en['activities.none'] = 'No activities';
translations.en['activities.slot.morning'] = 'Morning';
translations.en['activities.slot.afternoon'] = 'Afternoon';
translations.en['activities.modal.nannies_label'] = 'Nannies';
translations.en['activities.modal.no_nannies_loaded'] = 'No nanny loaded (check API or DB)';

// additional nanny strings
translations.fr['nanny.planning.of'] = 'Planning de {name}';
translations.fr['nanny.planning.button'] = 'Planning';
translations.fr['nanny.assignments_today'] = "Affectations aujourd'hui";
translations.fr['nanny.cotisation.label'] = 'Cotisation mensuelle :';
translations.fr['nanny.cotisation.days_remaining'] = '{n} jour(s) restants';
translations.fr['nanny.cotisation.renew'] = 'Cotisation à renouveler';
translations.fr['nanny.payment.pay'] = 'Payer';
translations.fr['nanny.payment.loading'] = 'Paiement...';
translations.fr['nanny.payment.confirming'] = 'Confirmation...';
translations.fr['nanny.cotisation.total_parents'] = 'Cotisation totale mensuelle des parents';
translations.fr['nanny.payment.success'] = 'Paiement enregistré';
translations.fr['nanny.payment.error'] = 'Erreur lors du paiement';
translations.fr['nanny.payment.confirm_title'] = 'Confirmer le paiement';
translations.fr['nanny.payment.confirm_body'] = 'Voulez-vous enregistrer le paiement de {amount}€ pour cette nounou ?';
translations.fr['nanny.birth.label'] = 'Né(e) le';
translations.fr['nanny.delete.confirm_body'] = "Voulez-vous vraiment supprimer cette nounou ? Cette action est irréversible.";

translations.en['nanny.planning.of'] = '{name} schedule';
translations.en['nanny.planning.button'] = 'Schedule';
translations.en['nanny.assignments_today'] = "Assignments today";
translations.en['nanny.cotisation.label'] = 'Monthly fee:';
translations.en['nanny.cotisation.days_remaining'] = '{n} day(s) remaining';
translations.en['nanny.cotisation.renew'] = 'Fee needs renewal';
translations.en['nanny.payment.pay'] = 'Pay';
translations.en['nanny.payment.loading'] = 'Paying...';
translations.en['nanny.payment.confirming'] = 'Confirming...';
translations.en['nanny.cotisation.total_parents'] = 'Total monthly contributions from parents';
translations.en['nanny.payment.success'] = 'Payment recorded';
translations.en['nanny.payment.error'] = 'Payment failed';
translations.en['nanny.payment.confirm_title'] = 'Confirm payment';
translations.en['nanny.payment.confirm_body'] = 'Do you want to record a payment of {amount}€ for this nanny?';
translations.en['nanny.birth.label'] = 'Born on';
translations.en['nanny.delete.confirm_body'] = 'Are you sure you want to delete this nanny? This action is irreversible.';

// nanny card and payment messages
translations.fr['nanny.planning.of'] = 'Planning de {name}';
translations.fr['nanny.planning.button'] = 'Planning';
translations.fr['nanny.assignments_today'] = "Affectations aujourd'hui";
translations.fr['nanny.cotisation.label'] = 'Cotisation mensuelle :';
translations.fr['nanny.payment.loading'] = 'Paiement...';
translations.fr['nanny.payment.confirming'] = 'Confirmation...';
translations.fr['nanny.payment.pay'] = 'Payer';
translations.fr['nanny.cotisation.days_remaining'] = '{n} jour(s) restants';
translations.fr['nanny.cotisation.renew'] = 'Cotisation à renouveler';
translations.fr['nanny.delete.confirm_body'] = "Voulez-vous vraiment supprimer cette nounou ? Cette action est irréversible.";

translations.en['nanny.planning.of'] = 'Planning of {name}';
translations.en['nanny.planning.button'] = 'Planning';
translations.en['nanny.assignments_today'] = "Assignments today";
translations.en['nanny.cotisation.label'] = 'Monthly fee:';
translations.en['nanny.payment.loading'] = 'Payment...';
translations.en['nanny.payment.confirming'] = 'Confirming...';
translations.en['nanny.payment.pay'] = 'Pay';
translations.en['nanny.cotisation.days_remaining'] = '{n} day(s) remaining';
translations.en['nanny.cotisation.renew'] = 'Fee needs renewal';
translations.en['nanny.delete.confirm_body'] = 'Are you sure you want to delete this nanny? This action is irreversible.';

// Notifications / time translations
translations.fr['page.notifications.title'] = 'Notifications';
translations.fr['page.notifications.desc'] = "Historique des notifications.";
translations.fr['notifications.mark_all'] = 'Tout marquer lu';
translations.fr['notifications.stats.unread'] = 'Non lues';
translations.fr['notifications.stats.today'] = "Aujourd'hui";
translations.fr['notifications.stats.week'] = 'Cette semaine';
translations.fr['notifications.loading'] = 'Chargement...';
translations.fr['notifications.none'] = 'Aucune notification.';
translations.fr['notifications.confirm_delete.title'] = 'Confirmer la suppression';
translations.fr['notifications.confirm_delete.body'] = "Voulez-vous vraiment supprimer cette notification ?";
translations.fr['notifications.confirm_delete.cancel'] = 'Annuler';
translations.fr['notifications.confirm_delete.confirm'] = 'Supprimer';
translations.fr['notifications.deleting'] = 'Suppression...';
translations.fr['notifications.mark_read'] = 'Marquer comme lu';
translations.fr['notifications.mark_unread'] = 'Marquer comme non lu';
translations.fr['notifications.delete_all'] = 'Tout supprimer';
translations.fr['notifications.confirm_delete_all'] = 'Voulez-vous vraiment supprimer toutes les notifications ?';
translations.fr['notifications.delete_all_failed'] = 'Échec de la suppression de toutes les notifications';

translations.fr['time.now'] = 'à l\'instant';
translations.fr['time.minutes'] = '{n} min';
translations.fr['time.hours'] = '{n}h';
translations.fr['time.days'] = '{n}j';

translations.en['page.notifications.title'] = 'Notifications';
translations.en['page.notifications.desc'] = 'Notification history.';
translations.en['notifications.mark_all'] = 'Mark all read';
translations.en['notifications.stats.unread'] = 'Unread';
translations.en['notifications.stats.today'] = 'Today';
translations.en['notifications.stats.week'] = 'This week';
translations.en['notifications.loading'] = 'Loading...';
translations.en['notifications.none'] = 'No notifications.';
translations.en['notifications.confirm_delete.title'] = 'Confirm deletion';
translations.en['notifications.confirm_delete.body'] = 'Are you sure you want to delete this notification?';
translations.en['notifications.confirm_delete.cancel'] = 'Cancel';
translations.en['notifications.confirm_delete.confirm'] = 'Delete';
translations.en['notifications.deleting'] = 'Deleting...';
translations.en['notifications.mark_read'] = 'Mark as read';
translations.en['notifications.mark_unread'] = 'Mark as unread';
translations.en['notifications.delete_all'] = 'Delete all';
translations.en['notifications.confirm_delete_all'] = 'Are you sure you want to delete all notifications?';
translations.en['notifications.delete_all_failed'] = 'Failed to delete all notifications';

translations.en['time.now'] = 'now';
translations.en['time.minutes'] = '{n} min';
translations.en['time.hours'] = '{n}h';
translations.en['time.days'] = '{n}d';

// activity / calendar translations
translations.fr['activities.add'] = '+ Ajouter une activité';
translations.fr['activities.none'] = 'Aucune activité';
translations.fr['activities.slot.morning'] = 'Matin';
translations.fr['activities.slot.afternoon'] = 'Après-midi';
translations.fr['activities.modal.edit'] = 'Modifier une activité';
translations.fr['activities.modal.add'] = 'Ajouter une activité';
translations.fr['activities.modal.delete'] = 'Supprimer';

translations.en['activities.add'] = '+ Add activity';
translations.en['activities.none'] = 'No activities';
translations.en['activities.slot.morning'] = 'Morning';
translations.en['activities.slot.afternoon'] = 'Afternoon';
translations.en['activities.modal.edit'] = 'Edit activity';
translations.en['activities.modal.add'] = 'Add activity';
translations.en['activities.modal.delete'] = 'Delete';

// labels used by activity and assignment forms
translations.fr['label.start'] = 'Début';
translations.fr['label.end'] = 'Fin';
translations.fr['label.activityName'] = 'Nom de l\'activité';
translations.fr['label.comment'] = 'Commentaire';
translations.fr['label.comment.optional'] = 'Commentaire (optionnel)';
translations.fr['assignment.modal.title.add'] = 'Ajouter au planning';
translations.fr['assignment.modal.title.edit'] = 'Modifier au planning';
translations.fr['assignment.modal.date'] = 'Date';
translations.fr['assignment.modal.child'] = 'Enfant';
translations.fr['assignment.modal.nanny'] = 'Nounou';
translations.fr['assignment.modal.select'] = 'Sélectionner';

translations.en['label.start'] = 'Start';
translations.en['label.end'] = 'End';
translations.en['label.activityName'] = 'Activity name';
translations.en['label.comment'] = 'Comment';
translations.en['label.comment.optional'] = 'Comment (optional)';
translations.en['assignment.modal.title.add'] = 'Add to schedule';
translations.en['assignment.modal.title.edit'] = 'Edit schedule';
translations.en['assignment.modal.date'] = 'Date';
translations.en['assignment.modal.child'] = 'Child';
translations.en['assignment.modal.nanny'] = 'Nanny';
translations.en['assignment.modal.select'] = 'Select';

// children additional keys
translations.en['children.birthDate.undefined'] = 'Not defined';
translations.en['children.allergies.label'] = 'Allergies :';
translations.en['children.allergies.none'] = 'None';
translations.en['children.parent.label'] = 'Parent :';
translations.en['children.call_parent_title'] = 'Call parent';
translations.en['children.email_parent_title'] = 'Email parent';
translations.en['children.prescription.view_button'] = 'View prescription';
translations.en['children.action.edit'] = 'Edit';
translations.en['children.action.delete'] = 'Delete';
translations.en['children.deleting'] = 'Deleting...';
translations.en['children.photo_consent.yes'] = 'Photo consent: Yes';
translations.en['children.photo_consent.no'] = 'Photo consent: No';
translations.en['children.photo_consent.unknown'] = 'Photo consent: —';

// parent / form / card translations (en)
translations.en['parent.form.firstName'] = 'First name';
translations.en['parent.form.lastName'] = 'Last name';
translations.en['parent.form.email'] = 'Email';
translations.en['parent.form.phone'] = 'Phone';
translations.en['parent.form.address'] = 'Address';
translations.en['parent.form.postalCode'] = 'Postal code';
translations.en['parent.form.city'] = 'City';
translations.en['parent.form.region'] = 'Region';
translations.en['parent.form.country'] = 'Country';
translations.en['parent.form.password.placeholder'] = 'Password (leave empty to send an invite)';
translations.en['parent.form.confirmPassword.placeholder'] = 'Confirm password';
translations.en['parent.form.submit.add'] = 'Add';
translations.en['parent.form.submit.save'] = 'Save';
translations.en['parent.form.cancel'] = 'Cancel';
translations.en['parent.form.error.required'] = 'First name, last name and email are required';
translations.en['parent.form.error.password_mismatch'] = 'Passwords do not match';
translations.en['parent.form.success.created_with_password'] = 'Parent created with password.';
translations.en['parent.form.success.created_invited'] = 'Parent created — an invitation was sent.';
translations.en['parent.form.success.updated'] = 'Parent updated.';
translations.en['parent.reset.confirm_title'] = 'Confirm password reset';
translations.en['parent.reset.confirm_body'] = 'You will reset the parent password. Continue?';
translations.en['parent.reset.cancel'] = 'Cancel';
translations.en['parent.reset.confirm'] = 'Confirm';
translations.en['parent.delete.confirm_body'] = 'Are you sure you want to delete this parent? This action is irreversible.';
translations.en['parent.children.count'] = '{n} child(ren)';
translations.en['parent.prescription.upload'] = 'Upload';
translations.en['parent.prescription.delete'] = 'Delete';
translations.en['parent.prescription.upload_failed'] = 'Prescription upload failed.';
translations.en['parent.prescription.delete_failed'] = 'Prescription delete failed.';
translations.en['parent.prescription.fetch_error'] = 'Error fetching prescription';
translations.en['parent.cotisation.this_month'] = 'To pay this month';
translations.en['parent.cotisation.annual_total'] = 'Annual fee total';

// generic confirmation Delete modal
translations.fr['modal.delete.title'] = 'Confirmer la suppression';
translations.fr['modal.delete.body.generic'] = 'Voulez-vous vraiment supprimer cet élément ? Cette action est irréversible.';
translations.fr['modal.delete.confirm'] = 'Supprimer';
translations.fr['modal.cancel'] = 'Annuler';

translations.en['modal.delete.title'] = 'Confirm deletion';
translations.en['modal.delete.body.generic'] = 'Are you sure you want to delete this item? This action is irreversible.';
translations.en['modal.delete.confirm'] = 'Delete';
translations.en['modal.cancel'] = 'Cancel';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem('site_language');
      return saved === 'en' ? 'en' : 'fr';
    } catch {
      return 'fr';
    }
  });

  useEffect(() => {
    try {
      document.documentElement.lang = locale === 'en' ? 'en' : 'fr';
      localStorage.setItem('site_language', locale);
      document.cookie = `site_language=${locale};path=/;max-age=${60 * 60 * 24 * 365}`;
      // expose small debug surface to help diagnose missing translations at runtime
      try {
        (window as unknown as { __FRIMOUSSE_I18N?: unknown }).__FRIMOUSSE_I18N = { locale, translations };
      } catch (e) {
        // ignore in strict environments (security policies)
        void e;
      }
    } catch {
      // ignore
    }
  }, [locale]);

  const t = useMemo(() => (key: string, params?: Record<string, string> | string) => {
    const raw = translations[locale] && translations[locale][key] ? translations[locale][key] : (typeof params === 'string' ? params : key);
    if (!(translations[locale] && translations[locale][key])) {
      try {
        console.warn(`[i18n] missing translation for key "${key}" (locale=${locale})`);
      } catch (e) {
        void e;
      }
    }
    if (!params || typeof params === 'string') return raw;
    // simple interpolation: replace {name} tokens
    return Object.keys(params).reduce((acc, k) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k] ?? '')), raw);
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// hook exported from src/lib/useI18n.ts
