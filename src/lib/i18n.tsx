import React, { useEffect, useMemo, useState } from 'react';
import { I18nContext } from './i18nContext';
import type { Locale } from './i18nContext';

const translations: Record<Locale, Record<string, string>> = {
  es: {
    'nav.home': 'Inicio',
    'nav.features': 'Características',
    'nav.pricing': 'Precios',
    'nav.support': 'Soporte',
    'nav.about': 'Acerca de',
    'nav.assistant': 'Asistente IA',
    'nav.dashboard': 'Inicio',
    'nav.feed': 'Feed',
    'nav.notifications': 'Notificaciones',
    'nav.children': 'Niños',
    'nav.children_my': 'Mis niños',
    'nav.parents': 'Padres',
    'nav.nannies': 'Niñeras',
    'nav.centers': 'Centros',
    'nav.messages': 'Mensajes',
    'nav.presenceSheets': 'Hojas de presencia',
    'nav.subscription': 'Mi suscripción',
    'nav.reviews': 'Reseñas',
    'page.presenceSheets': 'Hojas de presencia',
    'page.presenceSheets.description': 'Consulta y gestiona las hojas de presencia y firmas de los niños.',
    'presenceSheets.filter.center': 'Centro',
    'presenceSheets.filter.parent': 'Padre',
    'presenceSheets.empty': 'No hay hojas de presencia.',
    'presenceSheets.status.draft': 'Borrador',
    'presenceSheets.status.sent': 'Enviada',
    'presenceSheets.status.signed': 'Firmada',
    'presenceSheets.loading': 'Cargando...',
    'presenceSheets.error.load': 'No se pueden cargar las hojas.',
    'presenceSheets.success.saved': 'Cambios guardados.',
    'presenceSheets.success.sent': 'Hoja enviada a los padres.',
    'presenceSheets.success.signed': 'Hoja firmada.',
    'presenceSheets.success.signature': 'Firma registrada.',
    'presenceSheets.error.save': 'Error al guardar.',
    'presenceSheets.error.send': 'Error al enviar la hoja.',
    'presenceSheets.error.signature': 'Error al guardar la firma.',
    'presenceSheets.creating': 'Creando…',
    'presenceSheets.create': 'Crear',
    'presenceSheets.select_sheet': 'Selecciona una hoja para ver',
    'presenceSheets.select_sheet.empty.date': 'No hay hojas para este periodo',
    'presenceSheets.select_sheet.empty': 'No hay hojas de presencia',
    'presenceSheets.select_sheet.first': 'Crea tu primera hoja',
    'presenceSheets.new_sheet.title': 'Nueva hoja de presencia',
    'presenceSheets.save': 'Guardar',
    'presenceSheets.saving': 'Guardando…',
    'presenceSheets.send': 'Enviar a los padres',
    'presenceSheets.sending': 'Enviando…',
    'presenceSheets.signature.clear': 'Borrar',
    'presenceSheets.signature.cancel': 'Cancelar',
    'presenceSheets.signature.save': 'Validar',
    'presenceSheets.delete.title': 'Eliminar hoja',
    'presenceSheets.delete.subtitle': 'Esta acción es irreversible',
    'presenceSheets.delete.confirm': '¿Estás seguro de que deseas eliminar esta hoja de presencia? Todas las entradas y firmas asociadas se perderán.',
    'presenceSheets.delete.button': 'Eliminar',
    'presenceSheets.delete.deleting': 'Eliminando…',
    'presenceSheets.signatureSheet.title': 'Firma {role} — Validación',
    'presenceSheets.signatureSheet.desc': 'Firma para validar la hoja de presencia del mes.',
    'presenceSheets.signature.role.nanny': 'Niñera',
    'presenceSheets.signature.role.parent': 'Padre',
    'presenceSheets.signature.notSigned': 'No firmado',
    'presenceSheets.create.child': 'Niño',
    'presenceSheets.create.selectChild': 'Seleccionar un niño',
    'presenceSheets.create.month': 'Mes',
    'presenceSheets.create.year': 'Año',
    'presenceSheets.create.arrival': 'Llegada predeterminada',
    'presenceSheets.create.arrivalPlaceholder': '08h30',
    'presenceSheets.create.departure': 'Salida predeterminada',
    'presenceSheets.create.departurePlaceholder': '17h30',
    'presenceSheets.entry.arrival': 'Llegada',
    'presenceSheets.entry.departure': 'Salida',
    'presenceSheets.entry.commentPlaceholder': 'Comentario…',
    'presenceSheets.entry.nanny': 'Niñera',
    'presenceSheets.entry.parent': 'Padre',
    'presenceSheets.entry.signNanny': 'Firmar (niñera)',
    'presenceSheets.entry.signParent': 'Firmar (padre)',
    'presenceSheets.signature.signedAt': 'Firmado el {date}',
    'presenceSheets.signature.btn': 'Firmar',
    'presenceSheets.signatures.title': 'Firmas de validación',
    'presenceSheets.signature.alt.nanny': 'Firma de la niñera',
    'presenceSheets.signature.alt.parent': 'Firma del padre',
    'presenceSheets.new_sheet': 'Nueva hoja',
    'presenceSheets.month.all': 'Todos los meses',
    'presenceSheets.year.all': 'Todos los años',
    'presenceSheets.parent.all': 'Todos los padres',
    'presenceSheets.center.all': 'Todos los centros',
    'activities.center.all': 'Todos los centros',
    'presenceSheets.reopen.name': 'Reabrir',
    'presenceSheets.reopen.title': 'Volver al estado Enviada',
    'presenceSheets.legend.nannySigned': 'Niñera firmada',
    'presenceSheets.legend.parentSigned': 'Padre firmado',
    'presenceSheets.legend.notSigned': 'No firmado',
    'presenceSheets.entry.locked': 'Entrada bloqueada — ya firmada',
    'presenceSheets.entry.absent': 'Ausente',
    'presenceSheets.pdf': 'PDF',
    'presenceSheets.billing.saving': 'Guardando…',
    'page.centers.title': 'Centros',
    'page.centers.subtitle': '{count} centro(s) registrado(s)',
    'page.centers.description': 'Administra los centros y sus suscripciones.',
    'centers.kpi.users': 'Usuarios',
    'centers.kpi.children': 'Niños',
    'centers.kpi.nannies': 'Niñeras',
    'centers.kpi.reports': 'Informes',
    'centers.table.center': 'Centro',
    'centers.table.admin': 'Admin',
    'centers.table.contact_address': 'Contacto y dirección',
    'centers.table.subscription': 'Suscripción',
    'centers.table.stats': 'Estadísticas',
    'centers.table.users': 'Usuarios',
    'centers.table.parents': 'Padres',
    'centers.table.children': 'Niños',
    'centers.table.nannies': 'Niñeras',
    'centers.table.reports': 'Informes',
    'centers.row.created': 'Creado el',
    'centers.row.admin_since': 'Registrado el',
    'centers.row.no_admin': 'Ningún admin',
    'centers.row.users': 'Usuarios',
    'centers.row.parents': 'Padres',
    'centers.row.children': 'Niños',
    'centers.row.nannies': 'Niñeras',
    'centers.subbadge.no_subscription': 'Sin suscripción',
    'centers.row.not_specified': 'No especificado',
    'centers.row.expires_on': 'Expira el',
    'centers.row.trial_until': 'Prueba hasta',
    'settings.section.tutorials': 'Tutoriales',
    'settings.section.tutorials.completed': 'completado',
    'settings.section.tutorials.progress': '{done}/{total} completados',
    'settings.tutorials.menu.title': 'Tutoriales',
    'settings.tutorials.menu.subtitle': 'Aprende a usar Frimousse',
    'settings.tutorials.status': 'Puedes reiniciar un tutorial en cualquier momento desde el botón ? del menú.',
    'supportpage.hero.tag': 'Soporte',
    'supportpage.hero.title_line1': '¿Cómo podemos',
    'supportpage.hero.title_highlight': 'ayudarte?',
    'supportpage.hero.description': 'Encuentra todos los recursos para usar Frimousse, obtener ayuda o contactar a nuestro equipo.',
    'supportpage.contact.title': 'Contáctanos',
    'supportpage.contact.email_label': 'Correo electrónico',
    'supportpage.contact.phone_label': 'Teléfono',
    'supportpage.premium.title': 'Soporte premium',
    'supportpage.premium.description': 'Asistencia prioritaria para suscriptores Essentiel & Pro (días laborables 9h-18h).',
    'supportpage.guides.title': 'Guías y documentación',
    'supportpage.guides.quick_start': 'Guía de inicio rápido',
    'supportpage.guides.add_child': 'Agregar un niño',
    'supportpage.guides.manage_planning': 'Gestionar la planificación',
    'supportpage.guides.reports': 'Ver informes',
    'supportpage.guides.privacy': 'Seguridad & RGPD',
    'supportpage.community.title': 'Comunidad',
    'supportpage.community.description': 'Intercambia con otros usuarios y comparte buenas prácticas.',
    'supportpage.legal.title': 'Recursos complementarios',
    'supportpage.legal.privacy_policy': 'Política de privacidad',
    'supportpage.legal.terms': 'CGU',
    'supportpage.legal.legal_notice': 'Aviso legal',
    'supportpage.cta.title': '¿Listo para comenzar?',
    'supportpage.cta.description': 'Crea tu cuenta gratis y descubre todas las funciones de Frimousse.',
    'supportpage.cta.primary': 'Probar gratis',
    'supportpage.cta.secondary': 'Volver a inicio',
    'supportpage.seo.title': 'Soporte y ayuda | Frimousse - Aplicación de gestión de guarderías',
    'supportpage.seo.description': '¿Necesitas ayuda con Frimousse? Guías, asistencia técnica, documentación y FAQ para guarderías, microguarderías, MAM y jardines de infancia. Soporte reactivo por email.',
    'supportpage.breadcrumb.home': 'Inicio',
    'supportpage.breadcrumb.support': 'Soporte',
    'support.title': 'Soporte',
    'support.description': 'Gestión de tickets de soporte por centro',
    'support.empty.title': 'Ningún ticket en curso',
    'support.empty.message': 'Todos los centros están al día con su soporte.',
    'support.loading': 'Cargando…',
    'announcements.page.title': 'Anuncios',
    'announcements.page.stats': '{active} activo{suffix} · {total} en total',
    'announcements.action.create.short': 'Crear',
    'announcements.action.create': 'Crear anuncio',
    'announcements.empty.title': 'Ningún anuncio publicado',
    'announcements.empty.subtitle': 'Crea tu primer anuncio para comunicarte con los usuarios',
    'announcements.create.title': 'Nuevo anuncio',
    'announcements.create.subtitle': 'Visible inmediatamente para todos los usuarios conectados',
    'announcements.create.type.label': 'Tipo de anuncio',
    'announcements.create.title.label': 'Título',
    'announcements.create.title.placeholder': 'ej.: Actualización v2.1 — Nuevas funcionalidades',
    'announcements.create.message.label': 'Mensaje',
    'announcements.create.message.placeholder': 'Describe los cambios o información a comunicar en detalle...',
    'announcements.create.email.label': 'Enviar por email a todos los usuarios',
    'announcements.create.email.subtitle': 'Se enviará un correo a todas las cuentas con notificaciones activadas.',
    'announcements.create.preview.label': 'Vista previa del banner',
    'announcements.create.preview.title': 'Título del anuncio',
    'announcements.create.preview.message': 'Mensaje del anuncio...',
    'announcements.create.sending': 'Envío en curso…',
    'announcements.create.publish': 'Publicar',
    'announcements.create.publishEmail': 'email',
    'announcements.create.error.required': 'Título y mensaje requeridos',
    'announcements.create.error.generic': 'Error',
    'announcements.create.success.emailSent': '¡Anuncio publicado y emails enviados!',
    'announcements.create.success.published': '¡Anuncio publicado!',
    'announcements.detail.status.active': 'Activo',
    'announcements.detail.status.inactive': 'Inactivo',
    'announcements.detail.meta.status': 'Estado',
    'announcements.detail.meta.type': 'Tipo',
    'announcements.detail.meta.email': 'Email enviado',
    'announcements.detail.meta.emailYes': '✉ Sí',
    'announcements.detail.meta.emailNo': 'No',
    'announcements.detail.meta.published': 'Publicado el',
    'announcements.banner.close': 'Cerrar',
    'announcements.banner.published': 'Publicado el',
    'announcements.banner.scrollHint': 'Desplázate para leer más',
    'announcements.banner.cta': 'Entendido',
    'announcements.type.update': 'Actualización',
    'announcements.type.info': 'Información',
    'announcements.type.success': 'Novedad',
    'announcements.type.warning': 'Importante',
    'announcements.status.disabled': 'Desactivado',
    'page.reviews': 'Reseñas',
    'page.reviews.description': 'Aprueba o elimina las reseñas de los padres.',
    'reviews.filter.label': 'Filtrar :',
    'reviews.filter.all': 'Todos',
    'reviews.filter.pending': 'Pendientes',
    'reviews.filter.approved': 'Aprobados',
    'reviews.empty': 'No hay reseñas.',
    'reviews.approved': 'Reseña aprobada.',
    'reviews.rejected': 'Reseña rechazada.',
    'reviews.deleted': 'Reseña eliminada.',
    'reviews.error.modify': 'No se puede modificar la reseña',
    'reviews.error.delete': 'No se puede eliminar la reseña',
    'reviews.confirm_delete': '¿Eliminar esta reseña?',
    'reviews.action.approve': 'Aprobar',
    'reviews.action.reject': 'Rechazar',
    'reviews.action.delete': 'Eliminar',
    'reviews.anonymous': 'Anónimo',
    'reviews.ratingLabel': 'Valoración:',
    'reviews.pagination.info': 'Página {page} / {total}',
    'reviews.new.banner.single': '1 reseña pendiente',
    'reviews.new.banner.multiple': '{count} reseñas pendientes',
    'reviews.new.banner.view': 'Ver',
    'reviews.new.banner.ignore': 'Ignorar',
    'reviews.loading': 'Cargando…',
    'reviews.pagination.prev': 'Anterior',
    'reviews.pagination.next': 'Siguiente',
  },
  fr: {
    'nav.home': 'Accueil',
    'nav.features': 'Fonctionnalités',
    'nav.pricing': 'Tarifs',
    'nav.support': 'Support',
    'nav.about': 'À propos',
    'nav.assistant': 'Assistant IA',
  'assistant.title': "Assistant Frimousse",
  'assistant.header.title': "Assistant Frimousse",
    'assistant.header.subtitle': "· Conseils et aide pour la petite enfance",
    'assistant.intro.title': "Assistant",
    'assistant.intro.description': "Je suis votre assistant pour la petite enfance. Je peux vous aider avec :",
    'assistant.welcome': "👋 Bonjour ! Je suis votre assistant spécialisé dans la garde d'enfants. Posez votre question et je vous répondrai de manière claire et bienveillante.",
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
    'common.view_more': 'Voir plus',
    'common.info': 'Information',
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
      'reports.by': 'Par',

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
    'global.error': 'Une erreur est survenue.',
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
  'children.form.name': 'Prénom Nom',
  'children.form.age': 'Âge',
  'children.form.birthDate': 'Date de naissance',
  'children.form.name_label': 'Prénom & Nom',
  'children.form.birthDate_label': 'Date de naissance',
  'children.form.sexe_label': 'Sexe',
  'children.form.group_label': 'Groupe',
  'children.form.parentName_label': 'Nom du parent',
  'children.form.parentPhone_label': 'Téléphone du parent',
  'children.form.parentEmail_label': 'Email du parent',
  'children.form.allergies_label': 'Allergies',
  'children.form.required_note': 'Champs obligatoires',
  'parent.form.required_note': 'Champ obligatoire',
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
  'children.form.deleted_success': "L'enfant a bien été supprimé !",
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
  // planning modal for bulk deletion
  'children.present_on': 'Enfants présents le {date}',
  'children.none_on_date': 'Aucun enfant présent le {date}',
  'children.delete_selected': 'Supprimer la sélection',
  'children.delete_selected_success': '{n} affectation(s) supprimée(s)',
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
  'children.photo_consent.toggle_label': 'Autoriser les photos',
  'children.photo_consent.allowed': 'Autorisé',
  'children.photo_consent.denied': 'Non autorisé',
  'children.photo_consent.loading': 'Chargement du consentement...',
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
  'parent.form.password.placeholder': 'Mot de passe (laisser vide pour inviter)',
  'parent.form.confirmPassword.placeholder': 'Confirmer le mot de passe',
  'parent.form.submit.add': 'Ajouter',
  'parent.form.submit.save': 'Enregistrer',
  'parent.form.cancel': 'Annuler',
  'parent.form.error.required': 'Les champs Prénom, Nom et Email sont requis',
  'parent.form.error.password_mismatch': "Les mots de passe ne correspondent pas",
  'parent.form.success.created_with_password': 'Parent créé avec mot de passe.',
  'parent.form.success.created_invited': 'Parent créé — une invitation a été envoyée.',
  'parent.form.success.updated': 'Parent modifié.',
  'parent.form.deleted_success': 'Parent supprimé.',
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
  // manual invoice adjustments / discounts
  'adjustment.title': 'Réductions pour {month}',
  'adjustment.loading': 'Chargement…',
  'adjustment.none': 'Aucune réduction appliquée',
  'adjustment.button': 'Ajouter une réduction ',
  'adjustment.amount': 'Montant',
  'adjustment.comment': 'Commentaire',
  'adjustment.optional': 'optionnel',
  'adjustment.cancel': 'Annuler',
  'adjustment.save': 'Enregistrer',
  'adjustment.saving': 'Enregistrement…',
  'adjustment.delete': 'Supprimer',
  'adjustment.confirm_delete': 'Supprimer cette réduction ?',
  'adjustment.load_error': 'Impossible de charger les réductions',
  'adjustment.save_error': 'Erreur lors de la sauvegarde',
  'adjustment.delete_error': 'Erreur lors de la suppression',
  'adjustment.invalid_amount': 'Montant invalide',
  'adjustment.exists': 'Réduction appliquée',
  'adjustment.label': 'Réduction appliquée',
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
  'nav.centers': 'Centres',
  'page.centers.title': 'Centres',
  'page.centers.subtitle': '{count} centre(s) enregistré(s)',
  'centers.kpi.users': 'Utilisateurs',
  'centers.kpi.children': 'Enfants',
  'centers.kpi.nannies': 'Nounous',
  'centers.kpi.reports': 'Rapports',
  'centers.table.center': 'Centre',
  'centers.table.admin': 'Admin',
  'centers.table.contact_address': 'Contact & Adresse',
  'centers.table.subscription': 'Abonnement',
  'centers.table.stats': 'Statistiques',
  'centers.table.users': 'Utilisateurs',
  'centers.table.parents': 'Parents',
  'centers.table.children': 'Enfants',
  'centers.table.nannies': 'Nounous',
  'centers.table.reports': 'Rapports',
  'centers.row.created': 'Créé le',
  'centers.row.admin_since': 'Inscrit le',
  'centers.row.no_admin': 'Aucun admin',
  'centers.row.users': 'Utilisateurs',
  'centers.row.parents': 'Parents',
  'centers.row.children': 'Enfants',
  'centers.row.nannies': 'Nounous',
  'centers.subbadge.no_subscription': 'Aucun abonnement',
  'centers.row.not_specified': 'Non renseigné',
  'centers.row.expires_on': 'Expire le',
  'centers.row.trial_until': 'Essai jusqu\'au',
  'page.centers.description': 'Gérez les centres et leurs abonnements.',
  'nav.activities': 'Planning d\'activités',
  'nav.reports': 'Rapports',
  'nav.payments': 'Historique paiements',
  'nav.settings': 'Paramètres',
  'support.title': 'Support',
  'support.description': 'Gestion des tickets de support par centre',
  'support.empty.title': 'Aucun ticket en cours',
  'support.empty.message': 'Tous les centres sont à jour avec leur support.',
  'support.loading': 'Chargement…',
  'supportpage.hero.tag': 'Support',
  'supportpage.hero.title_line1': 'Comment pouvons-nous',
  'supportpage.hero.title_highlight': 'vous aider ?',
  'supportpage.hero.description': 'Retrouvez toutes les ressources pour bien utiliser Frimousse, obtenir de l\'aide ou contacter notre équipe.',
  'supportpage.contact.title': 'Contactez-nous',
  'supportpage.contact.email_label': 'Email',
  'supportpage.contact.phone_label': 'Téléphone',
  'supportpage.premium.title': 'Support premium',
  'supportpage.premium.description': 'Assistance prioritaire pour les abonnés Essentiel & Pro (jours ouvrés, 9h-18h).',
  'supportpage.guides.title': 'Guides & Documentation',
  'supportpage.guides.quick_start': 'Guide de démarrage rapide',
  'supportpage.guides.add_child': 'Ajouter un enfant',
  'supportpage.guides.manage_planning': 'Gérer un planning',
  'supportpage.guides.reports': 'Voir les rapports',
  'supportpage.guides.privacy': 'Sécurité & RGPD',
  'supportpage.legal.title': 'Ressources complémentaires',
  'supportpage.legal.privacy_policy': 'Politique de confidentialité',
  'supportpage.legal.terms': 'CGU',
  'supportpage.legal.legal_notice': 'Mentions légales',
  'supportpage.cta.title': 'Prêt à démarrer ?',
  'supportpage.cta.description': 'Créez votre compte gratuitement et découvrez toutes les fonctionnalités de Frimousse.',
  'supportpage.seo.title': 'Support et aide | Frimousse - Application de gestion crèche',
  'supportpage.seo.description': 'Besoin d\'aide sur Frimousse ? Guides, assistance technique, documentation et FAQ pour les crèches, micro-crèches, MAM et garderies. Support réactif par email.',
  'supportpage.breadcrumb.home': 'Accueil',
  'supportpage.breadcrumb.support': 'Support',
  'nav.announcements': 'Annonces',
  'nav.subscription': 'Mon abonnement',
  'nav.reviews': 'Avis',
  'nav.presenceSheets': 'Feuilles de présence',
    'page.activities': 'Activités',
    'page.reports': 'Rapports',
  'page.reports.description': "Consultez tous les signalements des nounous concernant les incidents, comportements et observations quotidiennes des enfants.",
    'page.payments': 'Paiements',
    'page.payments.description': 'Consultez les totaux mensuels calculés pour chaque parent.',
    'payments.view.by_family': 'Par famille',
    'payments.view.by_nanny': 'Par nounou',
    'payments.by_nanny.payments': 'paiements',
  'payments.filter.all_parents': 'Tous les parents',
  'payments.download_invoice': 'Facture',
  'payments.send_invoice': 'Envoyer',
  'payments.send_success': 'E-mail envoyé',
  'payments.send_success_to': 'E-mail envoyé à {name}',
  'payments.send_failed': "Échec de l'envoi de l'e-mail",
  'payments.errors.no_email': "Aucune adresse e-mail trouvée",
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
    'settings.description': 'Gérez vos préférences et votre compte',
    'settings.email.title': 'Notifications par email',
    'settings.email.desc': 'Recevoir un email pour chaque nouveau rapport ou assignation',
    'settings.push.title': 'Notifications push',
    'settings.push.desc': 'Recevoir des notifications dans votre navigateur (rappels et annonces)',
    'settings.language.title': 'Langue',
    'settings.language.desc': "Choisissez la langue de l'interface",
    'settings.language.choose': 'Choisissez votre langue',
    'settings.section.account': 'Profil et compte',
    'settings.section.account.subtitle': 'Modifier vos informations',
    'settings.section.notifications': 'Notifications',
    'settings.section.notifications.subtitle': 'Email et push',
    'settings.section.billing': 'Facturation',
    'settings.section.billing.subtitle': 'Tarifs et devis',
    'settings.section.tutorials': 'Tutoriels',
    'settings.section.tutorials.completed': 'complété',
    'settings.section.tutorials.progress': '{done}/{total} complétés',
    'settings.tutorials.menu.title': 'Tutoriels',
    'settings.tutorials.menu.subtitle': 'Apprenez à utiliser Frimousse',
    'settings.section.email_logs': 'Journal des emails',
    'settings.section.email_logs.subtitle': 'Historique des emails envoyés',
    'settings.tutorials.title': 'Tutoriels',
    'settings.tutorials.progress_label': 'Progression',
    'settings.tutorials.progress_detail': '{done}/{total} complétés',
    'settings.tutorials.done': 'Complété',
    'settings.tutorials.not_started': 'Non démarré',
    'settings.billing.title': 'Tarifs',
    'settings.billing.subtitle': 'Tarifs et devis',
    'settings.billing.daily_rate': 'Tarif journalier',
    'settings.billing.daily_rate.desc': 'Tarif par jour',
    'settings.billing.per_day': 'Par jour',
    'settings.billing.child_fee': 'Frais par enfant',
    'settings.billing.child_fee.desc': 'Tarif appliqué par enfant',
    'settings.billing.per_year': 'Par an',
    'settings.billing.nanny_fee': 'Frais par nounou',
    'settings.billing.nanny_fee.desc': 'Tarif appliqué par nounou',
    'settings.billing.per_month': 'Par mois',
    'settings.billing.saved': 'Enregistré',
    'settings.billing.save_btn': 'Enregistrer les modifications',
    'settings.delete_error': 'Erreur lors de la suppression du compte',
    'settings.profile.role.nanny': 'Nounou',
    'settings.profile.role.parent': 'Parent',
    'settings.profile.role.user': 'Utilisateur',
    'settings.account.title': 'Gestion du compte',
    'settings.support.title': 'Support client',
    'settings.support.open_ticket': 'Ouvrir un ticket',
    'settings.support.description': 'Besoin d\'aide ? Contactez notre équipe de support',
    'settings.account.delete': 'Supprimer le compte',
    'settings.profile.edit': 'Modifier vos informations',
    'settings.save': 'Enregistrer',
    'settings.cancel': 'Annuler',
    'settings.logout': 'Se déconnecter',
    'settings.change_password': 'Changer le mot de passe',
    'settings.delete_confirm.title': 'Confirmer la suppression du compte',
    'settings.delete_confirm.body': 'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible et toutes vos données seront perdues.',
    'settings.delete_confirm.confirm': 'Supprimer',
    'settings.saving': 'Enregistrement...',
    'availability.available': 'Disponible',
    'availability.on_leave': 'En congé',
    'availability.sick': 'Maladie',
    'settings.password.all_required': 'Tous les champs du mot de passe sont obligatoires',
    'settings.password.mismatch': 'Les mots de passe ne correspondent pas',
    'common.show_password': 'Afficher le mot de passe',
  'common.hide_password': 'Masquer le mot de passe',
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
    'nav.home': 'Home',
    'nav.features': 'Features',
    'nav.pricing': 'Pricing',
    'nav.support': 'Support',
    'nav.about': 'About',
    'nav.assistant': 'AI Assistant',
    'assistant.welcome': "👋 Hello! I'm your child-care assistant. Ask your question and I will answer clearly and kindly.",
    'assistant.intro.title': 'Assistant',
    'assistant.intro.description': "I'm your child-care assistant. I can help with:",
    'assistant.option.nutrition': 'Nutrition advice',
    'assistant.option.nutrition.example': 'What to cook for my child?',
    'assistant.option.education': 'Educational tips',
    'assistant.option.education.example': 'Development and age-appropriate learning',
    'assistant.option.activities': 'Suggested activities',
    'assistant.option.activities.example': 'Games and exercises by age',
    'assistant.loading': 'Loading...',
    'assistant.send.button': 'Send',
    'assistant.user.fallback': 'Guest',
    'assistant.input.aria': 'Your question',
    'assistant.input.placeholder': 'Ask the assistant...',
    'assistant.title': 'Frimousse Assistant',
    'assistant.header.title': 'Frimousse Assistant',
    'assistant.header.subtitle': '· Advice and help for child care',
    'common.none': '—',
    'common.view_more': 'View more',
    'common.info': 'Information',
    'payments.history.title': 'Payment history',
    'payments.history.empty': 'No records for this period.',
    'payments.total': 'Total',
  // manual invoice adjustments / discounts
  'adjustment.title': 'Discounts for {month}',
  'adjustment.loading': 'Loading…',
  'adjustment.none': 'No discounts applied',
  'adjustment.button': 'Add discount',
  'adjustment.amount': 'Amount',
  'adjustment.comment': 'Comment',
  'adjustment.optional': 'optional',
  'adjustment.cancel': 'Cancel',
  'adjustment.save': 'Save',
  'adjustment.saving': 'Saving…',
  'adjustment.delete': 'Delete',
  'adjustment.confirm_delete': 'Remove this discount?',
  'adjustment.load_error': 'Failed to load discounts',
  'adjustment.save_error': 'Error saving',
  'adjustment.delete_error': 'Error deleting',
  'adjustment.invalid_amount': 'Invalid amount',
  'adjustment.exists': 'Discount applied',
  'adjustment.label': 'Discount applied',
  'payments.days': 'days',
    'payments.export_csv': 'Excel',
    'payments.print': 'PDF',
    'payments.filter.all_parents': 'All parents',
    'payments.download_invoice': 'Invoice',
    'payments.send_invoice': 'Send',
    'payments.send_success': 'Email sent',
  'payments.send_success_to': 'Email sent to {name}',
    'payments.send_failed': 'Failed to send email',
    'payments.errors.no_email': 'No email address found',
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
  'reports.by': 'By',
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
    'global.error': 'An error occurred.',
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
  'children.form.name': 'First & Last name',
  'children.form.age': 'Age',
  'children.form.birthDate': 'Birth date',
  'children.form.name_label': 'First & Last name',
  'children.form.birthDate_label': 'Birth date',
  'children.form.sexe_label': 'Sex',
  'children.form.group_label': 'Group',
  'children.form.parentName_label': 'Parent name',
  'children.form.parentPhone_label': 'Parent phone',
  'children.form.parentEmail_label': 'Parent email',
  'children.form.allergies_label': 'Allergies',
  'children.form.required_note': 'Required fields',
  'parent.form.required_note': 'Required field',
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
  'children.form.deleted_success': 'Child was deleted successfully!',
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
    'payments.view.by_family': 'By family',
    'payments.view.by_nanny': 'By nanny',
    'payments.by_nanny.payments': 'payments',
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
    'settings.description': 'Manage your preferences and account',
    'settings.section.account': 'Profile & Account',
    'settings.section.account.subtitle': 'Edit your information',
    'settings.section.notifications': 'Notifications',
    'settings.section.notifications.subtitle': 'Email and push',
    'settings.section.billing': 'Billing',
    'settings.section.billing.subtitle': 'Pricing and contributions',
    'settings.section.tutorials': 'Tutorials',
    'settings.section.tutorials.progress': '{done}/{total} completed',
    'settings.section.email_logs': 'Email log',
    'settings.section.email_logs.subtitle': 'Sent email logs',
    'settings.profile.role.nanny': 'Nanny',
    'settings.profile.role.parent': 'Parent',
    'settings.profile.role.user': 'User',
    'settings.account.title': 'Account management',

    'settings.account.delete': 'Delete account',
    'settings.profile.edit': 'Edit profile',
    'settings.save': 'Save',
    'settings.cancel': 'Cancel',
    'settings.logout': 'Log out',
    'settings.change_password': 'Change password',
    'supportpage.hero.tag': 'Support',
    'supportpage.hero.title_line1': 'How can we',
    'supportpage.hero.title_highlight': 'help you?',
    'supportpage.hero.description': 'Find all resources to use Frimousse, get help, or contact our team.',
    'supportpage.contact.title': 'Contact us',
    'supportpage.contact.email_label': 'Email',
    'supportpage.contact.phone_label': 'Phone',
    'supportpage.premium.title': 'Premium support',
    'supportpage.premium.description': 'Priority assistance for Essential & Pro subscribers (business days 9am-6pm).',
    'supportpage.guides.title': 'Guides & Documentation',
    'supportpage.guides.quick_start': 'Quick start guide',
    'supportpage.guides.add_child': 'Add a child',
    'supportpage.guides.manage_planning': 'Manage planning',
    'supportpage.guides.reports': 'View reports',
    'supportpage.guides.privacy': 'Security & GDPR',
    'supportpage.legal.title': 'Additional resources',
    'supportpage.legal.privacy_policy': 'Privacy policy',
    'supportpage.legal.terms': 'Terms',
    'supportpage.legal.legal_notice': 'Legal notice',
    'supportpage.cta.title': 'Ready to get started?',
    'supportpage.cta.description': 'Create your account for free and discover all Frimousse features.',
    'supportpage.seo.title': 'Support and help | Frimousse - Childcare management app',
    'supportpage.seo.description': 'Need help with Frimousse? Guides, technical assistance, documentation and FAQ for nurseries, micro-nurseries, MAM and daycares. Responsive support by email.',
    'supportpage.breadcrumb.home': 'Home',
    'supportpage.breadcrumb.support': 'Support',
    'settings.support.title': 'Customer support',
    'settings.support.description': 'Need help? Contact our support team',
    'settings.support.open_ticket': 'Open a ticket',
    'settings.delete_confirm.title': 'Confirm account deletion',
    'settings.delete_confirm.body': 'Are you sure you want to delete your account? This action is irreversible and all your data will be lost.',
  'settings.delete_confirm.confirm': 'Delete',
  'settings.saving': 'Saving...',
  'availability.available': 'Available',
  'availability.on_leave': 'On leave',
  'availability.sick': 'Sick',
  'settings.password.all_required': 'All password fields are required',
  'settings.password.mismatch': 'Passwords do not match',
  'common.show_password': 'Show password',
  'common.hide_password': 'Hide password',
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
translations.fr['nav.messages'] = 'Messages';
translations.fr['nav.presenceSheets'] = 'Feuilles de présence';
translations.fr['nav.reviews'] = 'Avis';

translations.fr['page.messages'] = 'Messages';
translations.fr['page.messages.description'] = 'Envoyez et recevez des messages instantanés avec les parents et les nounous.';
translations.fr['messages.new.title'] = 'Nouveau message';
translations.fr['messages.search.placeholder'] = 'Rechercher un message';
translations.fr['messages.empty'] = 'Aucun message';
translations.fr['messages.empty.action'] = 'Commencez une nouvelle conversation';
translations.fr['messages.empty.conversation'] = 'Aucun message. Commencez la conversation !';
translations.fr['messages.you'] = 'Vous';
translations.fr['messages.media.video'] = '🎥 Vidéo';
translations.fr['messages.media.image'] = '📷 Photo';
translations.fr['messages.unknown'] = 'Inconnu';
translations.fr['messages.online'] = 'En ligne';
translations.fr['messages.role.admin'] = 'Admin';
translations.fr['messages.role.superAdmin'] = 'Super Admin';
translations.fr['messages.role.parent'] = 'Parent';
translations.fr['messages.role.nanny'] = 'Nounou';
translations.fr['messages.center.all'] = 'Tous les centres';
translations.fr['messages.contactSearch.placeholder'] = 'Rechercher une personne…';
translations.fr['messages.contacts.empty'] = 'Aucun contact trouvé';
translations.fr['messages.input.placeholder'] = 'Écrivez un message…';
translations.fr['messages.input.helper'] = 'Entrée pour envoyer · Maj+Entrée pour un saut de ligne';
translations.fr['messages.action.edit'] = 'Modifier';
translations.fr['messages.cannot_edit'] = 'Vous ne pouvez pas modifier ce message';
translations.fr['messages.emoji'] = 'Emoji';
translations.fr['messages.attach'] = 'Joindre une image ou vidéo';
translations.fr['messages.delete'] = 'Supprimer';
translations.fr['announcements.page.title'] = 'Annonces';
translations.fr['announcements.page.stats'] = '{active} active{suffix} · {total} au total';
translations.fr['announcements.action.create.short'] = 'Créer';
translations.fr['announcements.action.create'] = 'Créer une annonce';
translations.fr['announcements.empty.title'] = 'Aucune annonce publiée';
translations.fr['announcements.empty.subtitle'] = 'Créez votre première annonce pour communiquer avec vos utilisateurs';
translations.fr['announcements.create.title'] = 'Nouvelle annonce';
translations.fr['announcements.create.subtitle'] = 'Visible immédiatement pour tous les utilisateurs connectés';
translations.fr['announcements.create.type.label'] = "Type d'annonce";
translations.fr['announcements.create.title.label'] = 'Titre';
translations.fr['announcements.create.title.placeholder'] = 'ex: Mise à jour v2.1 — Nouvelles fonctionnalités';
translations.fr['announcements.create.message.label'] = 'Message';
translations.fr['announcements.create.message.placeholder'] = 'Décrivez en détail les changements ou informations à communiquer...';
translations.fr['announcements.create.email.label'] = 'Envoyer par email à tous les utilisateurs';
translations.fr['announcements.create.email.subtitle'] = 'Un email sera envoyé à tous les comptes ayant activé les notifications.';
translations.fr['announcements.create.preview.label'] = 'Aperçu bannière';
translations.fr['announcements.create.preview.title'] = "Titre de l'annonce";
translations.fr['announcements.create.preview.message'] = "Message de l'annonce...";
translations.fr['announcements.create.sending'] = 'Envoi en cours…';
translations.fr['announcements.create.publish'] = 'Publier';
translations.fr['announcements.create.publishEmail'] = 'email';
translations.fr['announcements.create.error.required'] = 'Titre et message requis';
translations.fr['announcements.create.error.generic'] = 'Erreur';
translations.fr['announcements.create.success.emailSent'] = 'Annonce publiée et emails envoyés !';
translations.fr['announcements.create.success.published'] = 'Annonce publiée !';
translations.fr['announcements.detail.status.active'] = 'Active';
translations.fr['announcements.detail.status.inactive'] = 'Inactive';
translations.fr['announcements.detail.meta.status'] = 'Statut';
translations.fr['announcements.detail.meta.type'] = 'Type';
translations.fr['announcements.detail.meta.email'] = 'Email envoyé';
translations.fr['announcements.detail.meta.emailYes'] = '✉ Oui';
translations.fr['announcements.detail.meta.emailNo'] = 'Non';
translations.fr['announcements.detail.meta.published'] = 'Publiée le';
translations.fr['announcements.banner.close'] = 'Fermer';
translations.fr['announcements.banner.published'] = 'Publié le';
translations.fr['announcements.banner.scrollHint'] = 'Défiler pour lire la suite';
translations.fr['announcements.banner.cta'] = 'J\'ai compris';
translations.fr['announcements.type.update'] = 'Mise à jour';
translations.fr['announcements.type.info'] = 'Information';
translations.fr['announcements.type.success'] = 'Nouveauté';
translations.fr['announcements.type.warning'] = 'Important';
translations.fr['announcements.status.disabled'] = 'Désactivée';
translations.fr['page.presenceSheets'] = 'Feuilles de présence';
translations.fr['page.presenceSheets.description'] = 'Consultez et gérez les feuilles de présence et signatures des enfants.';
translations.fr['page.reviews'] = 'Avis';
translations.fr['page.reviews.description'] = 'Approuvez ou supprimez les avis des parents.';
translations.fr['reviews.filter.label'] = 'Filtrer :';
translations.fr['reviews.new.banner.single'] = '1 avis en attente';
translations.fr['reviews.new.banner.multiple'] = '{count} avis en attente';
translations.fr['reviews.loading'] = 'Chargement…';
translations.fr['reviews.pagination.prev'] = 'Préc.';
translations.fr['reviews.pagination.next'] = 'Suiv.';

translations.fr['reviews.filter.all'] = 'Tous';
translations.fr['reviews.filter.pending'] = 'En attente';
translations.fr['reviews.filter.approved'] = 'Publiés';
translations.fr['reviews.empty'] = 'Aucun avis.';
translations.fr['reviews.approved'] = 'Avis approuvé.';
translations.fr['reviews.rejected'] = 'Avis rejeté.';
translations.fr['reviews.deleted'] = 'Avis supprimé.';
translations.fr['reviews.error.modify'] = 'Impossible de modifier l\'avis';
translations.fr['reviews.error.delete'] = 'Impossible de supprimer l\'avis';
translations.fr['reviews.confirm_delete'] = 'Supprimer cet avis ?';
translations.fr['reviews.action.approve'] = 'Approuver';
translations.fr['reviews.action.reject'] = 'Rejeter';
translations.fr['reviews.action.delete'] = 'Supprimer';
translations.fr['reviews.anonymous'] = 'Anonyme';
translations.fr['reviews.ratingLabel'] = 'Note :';
translations.fr['reviews.pagination.info'] = 'Page {page} / {total}';

translations.fr['presenceSheets.filter.center'] = 'Centre';
translations.fr['presenceSheets.filter.parent'] = 'Parent';
translations.fr['presenceSheets.empty'] = 'Aucune feuille de présence.';
translations.fr['presenceSheets.status.draft'] = 'Brouillon';
translations.fr['presenceSheets.status.sent'] = 'Envoyée';
translations.fr['presenceSheets.status.signed'] = 'Signée';
translations.fr['presenceSheets.loading'] = 'Chargement...';
translations.fr['presenceSheets.error.load'] = 'Impossible de charger les feuilles';
translations.fr['presenceSheets.success.saved'] = 'Modifications enregistrées';
translations.fr['presenceSheets.success.sent'] = 'Feuille envoyée aux parents';
translations.fr['presenceSheets.success.signed'] = 'Feuille signée';
translations.fr['presenceSheets.success.signature'] = 'Signature enregistrée';
translations.fr['presenceSheets.error.save'] = 'Erreur lors de la sauvegarde';
translations.fr['presenceSheets.error.send'] = 'Erreur lors de l\'envoi';
translations.fr['presenceSheets.error.signature'] = 'Erreur lors de la signature';
translations.fr['presenceSheets.creating'] = 'Création…';
translations.fr['presenceSheets.create'] = 'Créer';
translations.fr['presenceSheets.select_sheet'] = 'Sélectionnez une feuille pour la consulter';
translations.fr['presenceSheets.select_sheet.empty.date'] = 'Aucune feuille pour cette période';
translations.fr['presenceSheets.select_sheet.empty'] = 'Aucune feuille de présence';
translations.fr['presenceSheets.select_sheet.first'] = 'Créez votre première feuille';
translations.fr['presenceSheets.new_sheet.title'] = 'Nouvelle feuille de présence';
translations.fr['presenceSheets.save'] = 'Sauvegarder';
translations.fr['presenceSheets.saving'] = 'Sauvegarde…';
translations.fr['presenceSheets.send'] = 'Envoyer aux parents';
translations.fr['presenceSheets.sending'] = 'Envoi…';
translations.fr['presenceSheets.signature.clear'] = 'Effacer';
translations.fr['presenceSheets.signature.cancel'] = 'Annuler';
translations.fr['presenceSheets.signature.save'] = 'Valider';
translations.fr['presenceSheets.delete.title'] = 'Supprimer la feuille';
translations.fr['presenceSheets.delete.subtitle'] = 'Cette action est irréversible';
translations.fr['presenceSheets.delete.confirm'] = 'Êtes-vous sûr de vouloir supprimer cette feuille de présence ? Toutes les entrées et signatures associées seront définitivement perdues.';
translations.fr['presenceSheets.delete.button'] = 'Supprimer';
translations.fr['presenceSheets.delete.deleting'] = 'Suppression…';
translations.fr['presenceSheets.signatureSheet.title'] = 'Signature {role} — Validation';
translations.fr['presenceSheets.signatureSheet.desc'] = 'Signez pour valider l\'ensemble de la feuille de présence du mois.';
translations.fr['presenceSheets.signature.role.nanny'] = 'Nounou';
translations.fr['presenceSheets.signature.role.parent'] = 'Parent';
translations.fr['presenceSheets.signature.notSigned'] = 'Non signé';
translations.fr['presenceSheets.signature.signedAt'] = 'Signé le {date}';
translations.fr['presenceSheets.signature.btn'] = 'Signer';
translations.fr['presenceSheets.signatures.title'] = 'Signatures de validation';
translations.fr['presenceSheets.signature.alt.nanny'] = 'Signature nounou';
translations.fr['presenceSheets.signature.alt.parent'] = 'Signature parent';
translations.fr['presenceSheets.new_sheet'] = 'Nouvelle feuille';
translations.fr['presenceSheets.month.all'] = 'Tous les mois';
translations.fr['presenceSheets.year.all'] = 'Toutes les années';
translations.fr['presenceSheets.parent.all'] = 'Tous les parents';
translations.fr['presenceSheets.center.all'] = 'Tous les centres';
translations.fr['activities.center.all'] = 'Tous les centres';
translations.fr['presenceSheets.reopen.name'] = 'Réouvrir';
translations.fr['presenceSheets.reopen.title'] = 'Remettre en statut Envoyée';
translations.fr['presenceSheets.create.child'] = 'Enfant';
translations.fr['presenceSheets.create.selectChild'] = 'Sélectionner un enfant';
translations.fr['presenceSheets.create.month'] = 'Mois';
translations.fr['presenceSheets.create.year'] = 'Année';
translations.fr['presenceSheets.create.arrival'] = 'Arrivée par défaut';
translations.fr['presenceSheets.create.arrivalPlaceholder'] = '08h30';
translations.fr['presenceSheets.create.departure'] = 'Départ par défaut';
translations.fr['presenceSheets.create.departurePlaceholder'] = '17h30';
translations.fr['presenceSheets.entry.arrival'] = 'Arrivée';
translations.fr['presenceSheets.entry.departure'] = 'Départ';
translations.fr['presenceSheets.entry.commentPlaceholder'] = 'Commentaire…';
translations.fr['presenceSheets.entry.nanny'] = 'Nounou';
translations.fr['presenceSheets.entry.parent'] = 'Parent';
translations.fr['presenceSheets.entry.signNanny'] = 'Signer (nounou)';
translations.fr['presenceSheets.entry.signParent'] = 'Signer (parent)';
translations.fr['presenceSheets.legend.nannySigned'] = 'Nounou signé';
translations.fr['presenceSheets.legend.parentSigned'] = 'Parent signé';
translations.fr['presenceSheets.legend.notSigned'] = 'Non signé';
translations.fr['presenceSheets.entry.locked'] = 'Entrée verrouillée — déjà signée';
translations.fr['presenceSheets.entry.absent'] = 'Absent';
translations.fr['presenceSheets.pdf'] = 'PDF';
translations.fr['presenceSheets.billing.saving'] = 'Enregistrement…';

// Additional strings for admin emaillogs
translations.fr['admin.emaillogs.displaying'] = 'Affichage de {from} à {to} sur {total} résultats';
translations.fr['admin.emaillogs.choose_month'] = 'Choisir un mois';
translations.fr['admin.emaillogs.resend_failed'] = 'Erreur lors du renvoi : {msg}';
translations.fr['admin.emaillogs.stat.total'] = 'Total';
translations.fr['admin.emaillogs.stat.sent'] = 'Envoyés';
translations.fr['admin.emaillogs.stat.errors'] = 'Erreurs';
translations.fr['admin.emaillogs.export_csv'] = 'Exporter CSV';
translations.fr['admin.emaillogs.refresh'] = 'Rafraîchir';
translations.fr['admin.emaillogs.empty'] = 'Aucun email trouvé';


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
translations.en['nav.messages'] = 'Messages';
translations.en['nav.presenceSheets'] = 'Presence sheets';
translations.en['nav.reviews'] = 'Reviews';
translations.en['nav.centers'] = 'Centers';
translations.en['page.centers.title'] = 'Centers';
translations.en['page.centers.subtitle'] = '{count} centers registered';
translations.en['centers.kpi.users'] = 'Users';
translations.en['centers.kpi.children'] = 'Children';
translations.en['centers.kpi.nannies'] = 'Nannies';
translations.en['centers.kpi.reports'] = 'Reports';
translations.en['centers.table.center'] = 'Center';
translations.en['centers.table.admin'] = 'Admin';
translations.en['centers.table.contact_address'] = 'Contact & Address';
translations.en['centers.table.subscription'] = 'Subscription';
translations.en['centers.table.stats'] = 'Statistics';
translations.en['centers.table.users'] = 'Users';
translations.en['centers.table.parents'] = 'Parents';
translations.en['centers.table.children'] = 'Children';
translations.en['centers.table.nannies'] = 'Nannies';
translations.en['centers.table.reports'] = 'Reports';
translations.en['centers.row.created'] = 'Created on';
translations.en['centers.row.admin_since'] = 'Registered on';
translations.en['centers.row.no_admin'] = 'No admin';
translations.en['centers.row.users'] = 'Users';
translations.en['centers.row.parents'] = 'Parents';
translations.en['centers.row.children'] = 'Children';
translations.en['centers.row.nannies'] = 'Nannies';
translations.en['centers.subbadge.no_subscription'] = 'No subscription';
translations.en['centers.row.not_specified'] = 'Not specified';
translations.en['centers.row.expires_on'] = 'Expires on';
translations.en['centers.row.trial_until'] = 'Trial until';
translations.en['page.centers.description'] = 'Manage centers and their subscriptions.';
translations.en['nav.support'] = 'Support';
translations.en['nav.announcements'] = 'Announcements';
translations.en['nav.subscription'] = 'Subscription';
translations.en['support.title'] = 'Support';
translations.en['support.description'] = 'Support ticket management by center';
translations.en['support.empty.title'] = 'No ticket in progress';
translations.en['support.empty.message'] = 'All centers are up to date with support.';
translations.en['support.loading'] = 'Loading…';

translations.en['page.messages'] = 'Messages';
translations.en['page.messages.description'] = 'Send and receive instant messages with parents and nannies.';
translations.en['messages.new.title'] = 'New message';
translations.en['messages.search.placeholder'] = 'Search messages';
translations.en['messages.empty'] = 'No messages';
translations.en['messages.empty.action'] = 'Start a new conversation';
translations.en['messages.empty.conversation'] = 'No messages. Start a conversation!';
translations.en['messages.you'] = 'You';
translations.en['messages.media.video'] = '🎥 Video';
translations.en['messages.media.image'] = '📷 Photo';
translations.en['messages.unknown'] = 'Unknown';
translations.en['messages.online'] = 'Online';
translations.en['messages.role.admin'] = 'Admin';
translations.en['messages.role.superAdmin'] = 'Super Admin';
translations.en['messages.role.parent'] = 'Parent';
translations.en['messages.role.nanny'] = 'Nanny';
translations.en['messages.center.all'] = 'All centers';
translations.en['messages.contactSearch.placeholder'] = 'Search for a person…';
translations.en['messages.contacts.empty'] = 'No contacts found';
translations.en['messages.input.placeholder'] = 'Write a message…';
translations.en['messages.input.helper'] = 'Enter to send · Shift+Enter for newline';
translations.en['messages.delete'] = 'Delete';
translations.en['messages.action.edit'] = 'Edit';
translations.en['messages.cannot_edit'] = 'You cannot edit this message';
translations.en['messages.emoji'] = 'Emoji';
translations.en['messages.attach'] = 'Attach an image or video';
translations.en['announcements.page.title'] = 'Announcements';
translations.en['announcements.page.stats'] = '{active} active{suffix} · {total} total';
translations.en['announcements.action.create.short'] = 'Create';
translations.en['announcements.action.create'] = 'Create announcement';
translations.en['announcements.empty.title'] = 'No announcements published';
translations.en['announcements.empty.subtitle'] = 'Create your first announcement to communicate with your users';
translations.en['announcements.create.title'] = 'New announcement';
translations.en['announcements.create.subtitle'] = 'Visible immediately to all logged-in users';
translations.en['announcements.create.type.label'] = 'Announcement type';
translations.en['announcements.create.title.label'] = 'Title';
translations.en['announcements.create.title.placeholder'] = 'e.g.: Update v2.1 — New features';
translations.en['announcements.create.message.label'] = 'Message';
translations.en['announcements.create.message.placeholder'] = 'Describe the changes or information to share in detail...';
translations.en['announcements.create.email.label'] = 'Send by email to all users';
translations.en['announcements.create.email.subtitle'] = 'An email will be sent to all accounts with notifications enabled.';
translations.en['announcements.create.preview.label'] = 'Banner preview';
translations.en['announcements.create.preview.title'] = 'Announcement title';
translations.en['announcements.create.preview.message'] = 'Announcement message...';
translations.en['announcements.create.sending'] = 'Sending…';
translations.en['announcements.create.publish'] = 'Publish';
translations.en['announcements.create.publishEmail'] = 'email';
translations.en['announcements.create.error.required'] = 'Title and message required';
translations.en['announcements.create.error.generic'] = 'Error';
translations.en['announcements.create.success.emailSent'] = 'Announcement published and emails sent!';
translations.en['announcements.create.success.published'] = 'Announcement published!';
translations.en['announcements.detail.status.active'] = 'Active';
translations.en['announcements.detail.status.inactive'] = 'Inactive';
translations.en['announcements.detail.meta.status'] = 'Status';
translations.en['announcements.detail.meta.type'] = 'Type';
translations.en['announcements.detail.meta.email'] = 'Email sent';
translations.en['announcements.detail.meta.emailYes'] = '✉ Yes';
translations.en['announcements.detail.meta.emailNo'] = 'No';
translations.en['announcements.detail.meta.published'] = 'Published on';
translations.en['announcements.banner.close'] = 'Close';
translations.en['announcements.banner.published'] = 'Published on';
translations.en['announcements.banner.scrollHint'] = 'Scroll to read more';
translations.en['announcements.banner.cta'] = 'Got it';
translations.en['announcements.type.update'] = 'Update';
translations.en['announcements.type.info'] = 'Info';
translations.en['announcements.type.success'] = 'New feature';
translations.en['announcements.type.warning'] = 'Important';
translations.en['announcements.status.disabled'] = 'Disabled';
translations.en['page.presenceSheets'] = 'Presence sheets';
translations.en['page.presenceSheets.description'] = 'View and manage presence sheets and signatures for children.';
translations.en['page.reviews'] = 'Reviews';
translations.en['page.reviews.description'] = 'Approve or delete parent reviews.';
translations.en['activities.center.all'] = 'All centers';

translations.en['reviews.filter.all'] = 'All';
translations.en['reviews.filter.pending'] = 'Pending';
translations.en['reviews.filter.approved'] = 'Approved';
translations.en['reviews.empty'] = 'No reviews.';
translations.en['reviews.approved'] = 'Review approved.';
translations.en['reviews.rejected'] = 'Review rejected.';
translations.en['reviews.deleted'] = 'Review deleted.';
translations.en['reviews.error.modify'] = 'Unable to modify review.';
translations.en['reviews.error.delete'] = 'Unable to delete review.';
translations.en['reviews.confirm_delete'] = 'Delete this review?';
translations.en['reviews.action.approve'] = 'Approve';
translations.en['reviews.action.reject'] = 'Reject';
translations.en['reviews.action.delete'] = 'Delete';
translations.en['reviews.anonymous'] = 'Anonymous';
translations.en['reviews.ratingLabel'] = 'Rating:';
translations.en['reviews.pagination.info'] = 'Page {page} / {total}';
translations.en['reviews.new.banner.single'] = '1 review pending';
translations.en['reviews.new.banner.multiple'] = '{count} reviews pending';
translations.en['reviews.filter.label'] = 'Filter:';
translations.en['reviews.loading'] = 'Loading…';
translations.en['reviews.pagination.prev'] = 'Prev';
translations.en['reviews.pagination.next'] = 'Next';

translations.en['presenceSheets.filter.center'] = 'Center';
translations.en['presenceSheets.filter.parent'] = 'Parent';
translations.en['presenceSheets.empty'] = 'No presence sheets.';
translations.en['presenceSheets.status.draft'] = 'Draft';
translations.en['presenceSheets.status.sent'] = 'Sent';
translations.en['presenceSheets.status.signed'] = 'Signed';
translations.en['presenceSheets.loading'] = 'Loading...';
translations.en['presenceSheets.error.load'] = 'Unable to load sheets.';
translations.en['presenceSheets.success.saved'] = 'Changes saved.';
translations.en['presenceSheets.success.sent'] = 'Sheet sent to parents.';
translations.en['presenceSheets.success.signed'] = 'Sheet signed.';
translations.en['presenceSheets.success.signature'] = 'Signature saved.';
translations.en['presenceSheets.error.save'] = 'Failed to save updates.';
translations.en['presenceSheets.error.send'] = 'Failed to send the sheet.';
translations.en['presenceSheets.error.signature'] = 'Failed to save signature.';
translations.en['presenceSheets.creating'] = 'Creating…';
translations.en['presenceSheets.create'] = 'Create';
translations.en['presenceSheets.select_sheet'] = 'Select a sheet to view';
translations.en['presenceSheets.select_sheet.empty.date'] = 'No sheets for this period';
translations.en['presenceSheets.select_sheet.empty'] = 'No presence sheets';
translations.en['presenceSheets.select_sheet.first'] = 'Create your first sheet';
translations.en['presenceSheets.new_sheet.title'] = 'New presence sheet';
translations.en['presenceSheets.save'] = 'Save';
translations.en['presenceSheets.saving'] = 'Saving…';
translations.en['presenceSheets.send'] = 'Send to parents';
translations.en['presenceSheets.sending'] = 'Sending…';
translations.en['presenceSheets.signature.clear'] = 'Clear';
translations.en['presenceSheets.signature.cancel'] = 'Cancel';
translations.en['presenceSheets.signature.save'] = 'Save';
translations.en['presenceSheets.delete.title'] = 'Delete sheet';
translations.en['presenceSheets.delete.subtitle'] = 'This action is irreversible';
translations.en['presenceSheets.delete.confirm'] = 'Are you sure you want to delete this presence sheet? All entries and signatures will be permanently lost.';
translations.en['presenceSheets.delete.button'] = 'Delete';
translations.en['presenceSheets.delete.deleting'] = 'Deleting…';
translations.en['presenceSheets.signatureSheet.title'] = 'Signature {role} — Validation';
translations.en['presenceSheets.signatureSheet.desc'] = 'Sign to validate the full month presence sheet.';
translations.en['presenceSheets.signature.role.nanny'] = 'Nanny';
translations.en['presenceSheets.signature.role.parent'] = 'Parent';
translations.en['presenceSheets.signature.notSigned'] = 'Not signed';
translations.en['presenceSheets.signature.signedAt'] = 'Signed on {date}';
translations.en['presenceSheets.signature.btn'] = 'Sign';
translations.en['presenceSheets.signatures.title'] = 'Validation signatures';
translations.en['presenceSheets.signature.alt.nanny'] = 'Nanny signature';
translations.en['presenceSheets.signature.alt.parent'] = 'Parent signature';
translations.en['presenceSheets.new_sheet'] = 'New sheet';
translations.en['presenceSheets.month.all'] = 'All months';
translations.en['presenceSheets.year.all'] = 'All years';
translations.en['presenceSheets.parent.all'] = 'All parents';
translations.en['presenceSheets.center.all'] = 'All centres';
translations.en['presenceSheets.reopen.name'] = 'Reopen';
translations.en['presenceSheets.reopen.title'] = 'Reopen as Sent';
translations.en['presenceSheets.legend.nannySigned'] = 'Nanny signed';
translations.en['presenceSheets.legend.parentSigned'] = 'Parent signed';
translations.en['presenceSheets.legend.notSigned'] = 'Not signed';
translations.en['presenceSheets.create.child'] = 'Child';
translations.en['presenceSheets.create.selectChild'] = 'Select a child';
translations.en['presenceSheets.create.month'] = 'Month';
translations.en['presenceSheets.create.year'] = 'Year';
translations.en['presenceSheets.create.arrival'] = 'Default arrival';
translations.en['presenceSheets.create.arrivalPlaceholder'] = '08h30';
translations.en['presenceSheets.create.departure'] = 'Default departure';
translations.en['presenceSheets.create.departurePlaceholder'] = '17h30';
translations.en['presenceSheets.entry.arrival'] = 'Arrival';
translations.en['presenceSheets.entry.departure'] = 'Departure';
translations.en['presenceSheets.entry.commentPlaceholder'] = 'Comment…';
translations.en['presenceSheets.entry.nanny'] = 'Nanny';
translations.en['presenceSheets.entry.parent'] = 'Parent';
translations.en['presenceSheets.entry.signNanny'] = 'Sign (nanny)';
translations.en['presenceSheets.entry.signParent'] = 'Sign (parent)';
translations.en['presenceSheets.entry.locked'] = 'Entry locked - already signed';
translations.en['presenceSheets.entry.absent'] = 'Absent';
translations.en['presenceSheets.pdf'] = 'PDF';
translations.en['presenceSheets.billing.saving'] = 'Saving…';

// Additional strings for admin emaillogs
translations.en['admin.emaillogs.displaying'] = 'Showing {from} to {to} of {total} results';
translations.en['admin.emaillogs.choose_month'] = 'Choose a month';
translations.en['admin.emaillogs.resend_failed'] = 'Failed to resend: {msg}';
translations.en['admin.emaillogs.stat.total'] = 'Total';
translations.en['admin.emaillogs.stat.sent'] = 'Sent';
translations.en['admin.emaillogs.stat.errors'] = 'Errors';
translations.en['admin.emaillogs.export_csv'] = 'Export CSV';
translations.en['admin.emaillogs.refresh'] = 'Refresh';
translations.en['admin.emaillogs.empty'] = 'No emails found';

// Small stats labels used in ParentDashboard
translations.fr['stats.total'] = 'Total';
translations.fr['stats.active'] = 'Actifs';
translations.fr['stats.new'] = 'Nouveaux';

translations.en['stats.total'] = 'Total';
translations.en['stats.active'] = 'Active';
translations.en['stats.new'] = 'New';
translations.en['common.back'] = 'Back';

translations.fr['common.back'] = 'Retour';

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
translations.fr['nanny.form.name'] = 'Prénom & Nom';
translations.fr['nanny.form.experience'] = 'Expérience (années)';
translations.fr['nanny.form.birthDate'] = 'Date de naissance';
translations.fr['nanny.form.specializations'] = 'Spécialisations (séparées par virgule)';
translations.fr['nanny.form.contact'] = 'Téléphone';
translations.fr['nanny.form.email'] = 'Email';
translations.fr['nanny.form.password'] = 'Mot de passe';
translations.fr['nanny.form.confirmPassword'] = 'Confirmer le mot de passe';
translations.fr['nanny.form.availability'] = 'Disponibilité';
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
translations.en['nanny.form.name'] = 'First & Last name';
translations.en['nanny.form.experience'] = 'Experience (years)';
translations.en['nanny.form.birthDate'] = 'Birth date';
translations.en['nanny.form.specializations'] = 'Specializations (comma separated)';
translations.en['nanny.form.contact'] = 'Phone';
translations.en['nanny.form.email'] = 'Email';
translations.en['nanny.form.password'] = 'Password';
translations.en['nanny.form.confirmPassword'] = 'Confirm password';
translations.en['nanny.form.availability'] = 'Availability';
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

// nanny action success messages
translations.fr['nanny.added_success'] = 'Nounou ajoutée.';
translations.fr['nanny.update_success'] = 'Mise à jour effectuée';
translations.fr['nanny.delete_success'] = 'Nounou supprimée.';

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

// nanny action success messages
translations.en['nanny.added_success'] = 'Nanny created.';
translations.en['nanny.update_success'] = 'Nanny updated.';
translations.en['nanny.delete_success'] = 'Nanny deleted.';

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
translations.fr['notifications.swipe_delete'] = 'Supprimer';
translations.fr['notifications.review.created'] = 'Nouvel avis à modérer';
translations.fr['notifications.review.created.description'] = 'Un nouvel avis attend votre modération.';

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
translations.en['notifications.swipe_delete'] = 'Delete';
translations.en['notifications.review.created'] = 'New review to moderate';
translations.en['notifications.review.created.description'] = 'A new review is waiting for your moderation.';

translations.es['notifications.review.created'] = 'Nueva reseña por moderar';
translations.es['notifications.review.created.description'] = 'Una nueva reseña está esperando tu moderación.';

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
translations.fr['activities.modal.subtitle'] = 'Planifiez une activité pour la semaine';
translations.fr['activities.modal.name.placeholder'] = 'Ex : Atelier peinture, Lecture, Jeux libres…';
translations.fr['activities.modal.comment.placeholder'] = 'Matériel nécessaire, consignes particulières…';

translations.en['activities.add'] = '+ Add activity';
translations.en['activities.none'] = 'No activities';
translations.en['activities.modal.subtitle'] = 'Plan an activity for the week';
translations.en['activities.modal.name.placeholder'] = 'Eg: Painting workshop, Reading, Free play…';
translations.en['activities.modal.comment.placeholder'] = 'Required materials, special instructions…';
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
translations.fr['assignment.modal.help'] = 'Sélectionnez des enfants, jours et une nounou';
translations.fr['assignment.modal.no_days'] = 'Aucun jour sélectionné';
translations.fr['assignment.modal.day_selection'] = 'Sélection de jours';
translations.fr['assignment.modal.prev'] = 'Préc.';
translations.fr['assignment.modal.next'] = 'Suiv.';
translations.fr['activity.modal.nannies_assigned'] = 'Nounous assignées';
translations.fr['activity.modal.nannies_assigned_single'] = 'Nounou assignée';
translations.fr['activities.nannies.assigned'] = 'Nounous assignées';
translations.fr['activities.nannies.assigned_single'] = 'Nounou assignée';
translations.fr['activities.nannies.group_summary'] = 'Activité de groupe — {count} nounous assignées';
translations.fr['activity.modal.no_nannies'] = 'Aucune nounou disponible.';
translations.fr['parent.children.label'] = 'Enfants';
translations.fr['parent.password.requirements.title'] = 'Le mot de passe doit contenir :';
translations.fr['parent.password.requirements.upper'] = '1 majuscule';
translations.fr['parent.password.requirements.digit'] = '1 chiffre';
translations.fr['parent.password.requirements.special'] = '1 caractère spécial';
translations.fr['parent.password.requirements.length'] = '{min}+ caractères';
translations.fr['nanny.password.requirements.upper'] = 'Une majuscule (A-Z)';
translations.fr['nanny.password.requirements.digit'] = 'Un chiffre (0-9)';
translations.fr['nanny.password.requirements.special'] = 'Un caractère spécial';
translations.fr['nanny.password.requirements.length'] = '{min} caractères min.';

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
translations.en['assignment.modal.help'] = 'Select children, days and a nanny';
translations.en['assignment.modal.no_days'] = 'No days selected';
translations.en['assignment.modal.day_selection'] = 'Select days';
translations.en['assignment.modal.prev'] = 'Prev';
translations.en['assignment.modal.next'] = 'Next';
translations.en['activity.modal.nannies_assigned'] = 'Assigned nannies';
translations.en['activity.modal.nannies_assigned_single'] = 'Assigned nanny';
translations.en['activities.nannies.assigned'] = 'Assigned nannies';
translations.en['activities.nannies.assigned_single'] = 'Assigned nanny';
translations.en['activities.nannies.group_summary'] = 'Group activity — {count} assigned nannies';
translations.en['activity.modal.no_nannies'] = 'No nannies available.';
translations.en['parent.password.requirements.title'] = 'Password must contain:';
translations.en['parent.password.requirements.upper'] = '1 uppercase';
translations.en['parent.password.requirements.digit'] = '1 digit';
translations.en['parent.password.requirements.special'] = '1 special character';
translations.en['parent.password.requirements.length'] = '{min}+ characters';
translations.en['nanny.password.requirements.upper'] = '1 uppercase';
translations.en['nanny.password.requirements.digit'] = '1 digit';
translations.en['nanny.password.requirements.special'] = '1 special character';
translations.en['nanny.password.requirements.length'] = '{min} characters min.';
translations.en['assignment.modal.nanny'] = 'Nanny';
translations.en['assignment.modal.select'] = 'Select';
translations.en['assignment.modal.help'] = 'Select children, days and a nanny';
translations.en['assignment.modal.no_days'] = 'No days selected';
translations.en['assignment.modal.day_selection'] = 'Select days';
translations.en['assignment.modal.prev'] = 'Prev';
translations.en['assignment.modal.next'] = 'Next';

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
translations.en['children.photo_consent.toggle_label'] = 'Allow photos';
translations.en['children.photo_consent.allowed'] = 'Allowed';
translations.en['children.photo_consent.denied'] = 'Not allowed';
translations.en['children.photo_consent.loading'] = 'Loading consent...';

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
  translations.en['parent.form.deleted_success'] = 'Parent deleted.';
translations.en['parent.reset.confirm_title'] = 'Confirm password reset';
translations.en['parent.reset.confirm_body'] = 'You will reset the parent password. Continue?';
translations.en['parent.reset.cancel'] = 'Cancel';
translations.en['parent.reset.confirm'] = 'Confirm';
translations.en['parent.delete.confirm_body'] = 'Are you sure you want to delete this parent? This action is irreversible.';
translations.en['parent.children.count'] = '{n} child(ren)';
translations.en['parent.children.label'] = 'Children';
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

// Subscription Management page
translations.fr['subscription.title'] = 'Mon abonnement';
translations.fr['subscription.subtitle'] = 'Gérez votre plan, vos informations de facturation et suivez le statut de votre abonnement.';
translations.fr['subscription.loading'] = 'Chargement…';
translations.fr['subscription.error.load'] = 'Impossible de charger les informations d\'abonnement.';
translations.fr['subscription.forbidden'] = 'Cette page est réservée aux administrateurs.';
translations.fr['subscription.no_plan.title'] = 'Choisissez votre plan';
translations.fr['subscription.no_plan.subtitle'] = 'Aucun abonnement actif. Sélectionnez un plan ci-dessous pour accéder à toutes les fonctionnalités.';
translations.fr['subscription.current_plan'] = 'Plan actuel';
translations.fr['subscription.trial_end'] = 'Fin de la période d\'essai';
translations.fr['subscription.next_renewal'] = 'Prochain renouvellement';
translations.fr['subscription.access_until'] = 'Accès jusqu\'au';
translations.fr['subscription.cancel_warning'] = 'Résiliation programmée — votre accès reste actif jusqu\'à la fin de la période en cours.';
translations.fr['subscription.past_due_warning'] = 'Paiement en échec — mettez à jour votre moyen de paiement pour éviter la suspension.';
translations.fr['subscription.features_title'] = 'Inclus dans votre plan';
translations.fr['subscription.billing.title'] = 'Facturation & moyen de paiement';
translations.fr['subscription.billing.subtitle'] = 'Gérez votre carte, consultez vos factures Stripe et modifiez vos informations.';
translations.fr['subscription.billing.portal_btn'] = 'Portail de facturation';
translations.fr['subscription.upgrade.title'] = 'Passer à un plan payant';
translations.fr['subscription.upgrade.subtitle'] = 'Choisissez un plan pour continuer après la période d\'essai. Vous serez redirigé vers Stripe pour saisir vos informations de paiement.';
translations.fr['subscription.choose'] = 'Choisir';
translations.fr['plan.essentiel.price'] = '39,99 € / mois · sans engagement';
translations.fr['plan.pro.price'] = '69,99 € / mois · sans engagement';
translations.fr['subscription.coming_soon'] = 'Bientôt disponible';
translations.fr['subscription.feature.dashboard'] = 'Tableau de bord & planning';
translations.fr['subscription.feature.children_limit'] = 'Jusqu\'à 2 enfants';
translations.fr['subscription.feature.members_limit'] = 'Jusqu\'à 2 nounous & parents';
translations.fr['subscription.feature.daily_reports_limit'] = 'Rapports journaliers (2 max)';
translations.fr['subscription.feature.feed_photos'] = 'Fil d\'actualité & photos';
translations.fr['subscription.feature.realtime_notifications'] = 'Notifications en temps réel';
translations.fr['subscription.feature.presence_sheets'] = 'Feuilles de présence';
translations.fr['subscription.feature.instant_messaging'] = 'Messagerie instantanée';
translations.fr['subscription.feature.ai_assistant'] = 'Assistant IA';
translations.fr['subscription.feature.children_limit_10'] = 'Jusqu\'à 10 enfants';
translations.fr['subscription.feature.members_limit_10'] = 'Jusqu\'à 10 nounous & parents';
translations.fr['subscription.feature.daily_reports_unlimited'] = 'Rapports journaliers illimités';
translations.fr['subscription.feature.presence_sheets_digital'] = 'Feuilles de présence numériques';
translations.fr['subscription.feature.all_essentiel'] = 'Tout le plan Essentiel inclus';
translations.fr['subscription.feature.unlimited_people'] = 'Enfants, nounous & parents illimités';
translations.fr['subscription.feature.billing_history'] = 'Facturations & historique des paiements';
translations.fr['subscription.feature.presence_signature'] = 'Feuilles de présence + signature numérique';
translations.fr['subscription.feature.instant_messaging_realtime'] = 'Messagerie instantanée en temps réel';
translations.fr['subscription.feature.ai_assistant_report'] = 'Assistant IA (rédaction, comptes-rendus)';
translations.fr['subscription.feature.priority_support'] = 'Support prioritaire 7j/7';
translations.fr['subscription.feature.continuous_updates'] = 'Mises à jour en continu';
translations.fr['subscription.change.title'] = 'Changer de plan';
translations.fr['subscription.change.how_title'] = 'Comment ça fonctionne ?';
translations.fr['subscription.change.no_card'] = 'Aucune saisie de carte requise — votre moyen de paiement déjà enregistré est utilisé automatiquement.';
translations.fr['subscription.change.immediate'] = 'Changement immédiat — les nouvelles fonctionnalités sont accessibles dès la confirmation.';
translations.fr['subscription.change.proration'] = 'Facturation au prorata — vous ne payez que les jours restants du mois en cours au nouveau tarif.';
translations.fr['subscription.change.cancel'] = 'Annulation à tout moment — sans engagement, vous gardez l\'accès jusqu\'à la fin de la période en cours.';
translations.fr['subscription.change.confirm_msg'] = 'En confirmant, votre carte enregistrée sera débitée au prorata des jours restants ce mois-ci. Le changement est immédiat et sans interruption de service.';
translations.fr['subscription.change.confirm_btn'] = 'Confirmer le changement';
translations.fr['subscription.change.in_progress'] = 'En cours…';
translations.fr['subscription.change.switch_to'] = 'Passer au plan';
translations.fr['subscription.status.active'] = 'Actif';
translations.fr['subscription.status.trialing'] = 'Essai';
translations.fr['subscription.status.past_due'] = 'Paiement en retard';
translations.fr['subscription.status.canceled'] = 'Annulé';
translations.fr['subscription.status.unpaid'] = 'Impayé';

translations.en['subscription.title'] = 'My subscription';
translations.en['subscription.subtitle'] = 'Manage your plan, billing information and track your subscription status.';
translations.en['subscription.loading'] = 'Loading…';
translations.en['subscription.error.load'] = 'Unable to load subscription information.';
translations.en['subscription.forbidden'] = 'This page is reserved for administrators.';
translations.en['subscription.no_plan.title'] = 'Choose your plan';
translations.en['subscription.no_plan.subtitle'] = 'No active subscription. Select a plan below to access all features.';
translations.en['subscription.current_plan'] = 'Current plan';
translations.en['subscription.trial_end'] = 'Trial end date';
translations.en['subscription.next_renewal'] = 'Next renewal';
translations.en['subscription.access_until'] = 'Access until';
translations.en['subscription.cancel_warning'] = 'Cancellation scheduled — your access remains active until the end of the current period.';
translations.en['subscription.past_due_warning'] = 'Payment failed — update your payment method to avoid suspension.';
translations.en['subscription.features_title'] = 'Included in your plan';
translations.en['subscription.billing.title'] = 'Billing & payment method';
translations.en['subscription.billing.subtitle'] = 'Manage your card, view Stripe invoices and update your information.';
translations.en['subscription.billing.portal_btn'] = 'Billing portal';
translations.en['subscription.upgrade.title'] = 'Upgrade to a paid plan';
translations.en['subscription.upgrade.subtitle'] = 'Choose a plan to continue after the trial period. You will be redirected to Stripe to enter your payment details.';
translations.en['subscription.choose'] = 'Choose';
translations.en['plan.essentiel.price'] = '€39.99 / month · no commitment';
translations.en['plan.pro.price'] = '€69.99 / month · no commitment';
translations.en['subscription.coming_soon'] = 'Coming soon';
translations.en['subscription.feature.dashboard'] = 'Dashboard & scheduling';
translations.en['subscription.feature.children_limit'] = 'Up to 2 children';
translations.en['subscription.feature.members_limit'] = 'Up to 2 nannies & parents';
translations.en['subscription.feature.daily_reports_limit'] = 'Daily reports (2 max)';
translations.en['subscription.feature.feed_photos'] = 'News feed & photos';
translations.en['subscription.feature.realtime_notifications'] = 'Real-time notifications';
translations.en['subscription.feature.presence_sheets'] = 'Presence sheets';
translations.en['subscription.feature.instant_messaging'] = 'Instant messaging';
translations.en['subscription.feature.ai_assistant'] = 'AI assistant';
translations.en['subscription.feature.children_limit_10'] = 'Up to 10 children';
translations.en['subscription.feature.members_limit_10'] = 'Up to 10 nannies & parents';
translations.en['subscription.feature.daily_reports_unlimited'] = 'Unlimited daily reports';
translations.en['subscription.feature.presence_sheets_digital'] = 'Digital presence sheets';
translations.en['subscription.feature.all_essentiel'] = 'All Essentiel plan features included';
translations.en['subscription.feature.unlimited_people'] = 'Unlimited children, nannies & parents';
translations.en['subscription.feature.billing_history'] = 'Billing and payment history';
translations.en['subscription.feature.presence_signature'] = 'Presence sheets + digital signature';
translations.en['subscription.feature.instant_messaging_realtime'] = 'Real-time instant messaging';
translations.en['subscription.feature.ai_assistant_report'] = 'AI assistant (drafting, reporting)';
translations.en['subscription.feature.priority_support'] = 'Priority support 7d/7';
translations.en['subscription.feature.continuous_updates'] = 'Continuous updates';
translations.en['subscription.change.title'] = 'Change plan';
translations.en['subscription.change.how_title'] = 'How does it work?';
translations.en['subscription.change.no_card'] = 'No card entry required — your saved payment method is used automatically.';
translations.en['subscription.change.immediate'] = 'Immediate change — new features are available as soon as confirmed.';
translations.en['subscription.change.proration'] = 'Prorated billing — you only pay for the remaining days of the current month at the new rate.';
translations.en['subscription.change.cancel'] = 'Cancel anytime — no commitment, you keep access until the end of the current period.';
translations.en['subscription.change.confirm_msg'] = 'By confirming, your saved card will be charged for the remaining days this month. The change is immediate with no service interruption.';
translations.en['subscription.change.confirm_btn'] = 'Confirm change';
translations.en['subscription.change.in_progress'] = 'Processing…';
translations.en['subscription.change.switch_to'] = 'Switch to plan';
translations.en['subscription.status.active'] = 'Active';
translations.en['subscription.status.trialing'] = 'Trial';
translations.en['subscription.status.past_due'] = 'Past due';
translations.en['subscription.status.canceled'] = 'Canceled';
translations.en['subscription.status.unpaid'] = 'Unpaid';

translations.fr['plan.decouverte'] = 'Découverte';
translations.fr['plan.essentiel'] = 'Essentiel';
translations.fr['plan.pro'] = 'Pro';
translations.fr['plan.price.essentiel'] = '29,99 €/mois';
translations.fr['plan.price.pro'] = '59,99 €/mois';
translations.fr['plan.feature.decouverte.1'] = '2 enfants max';
translations.fr['plan.feature.decouverte.2'] = '2 nounous max';
translations.fr['plan.feature.decouverte.3'] = '2 parents max';
translations.fr['plan.feature.decouverte.4'] = "Période d'essai 7 jours";
translations.fr['plan.feature.essentiel.1'] = '10 enfants max';
translations.fr['plan.feature.essentiel.2'] = '10 nounous max';
translations.fr['plan.feature.essentiel.3'] = '10 parents max';
translations.fr['plan.feature.essentiel.4'] = 'Facturation mensuelle';
translations.fr['plan.feature.essentiel.5'] = 'Export PDF';
translations.fr['plan.feature.pro.1'] = 'Illimité';
translations.fr['plan.feature.pro.2'] = 'Assistant IA';
translations.fr['plan.feature.pro.3'] = 'Facturation mensuelle';
translations.fr['plan.feature.pro.4'] = 'Export PDF';
translations.fr['plan.feature.pro.5'] = 'Support prioritaire';

translations.en['plan.decouverte'] = 'Discovery';
translations.en['plan.essentiel'] = 'Essential';
translations.en['plan.pro'] = 'Pro';
translations.en['plan.price.essentiel'] = '€29.99/month';
translations.en['plan.price.pro'] = '€59.99/month';
translations.en['plan.feature.decouverte.1'] = '2 children max';
translations.en['plan.feature.decouverte.2'] = '2 nannies max';
translations.en['plan.feature.decouverte.3'] = '2 parents max';
translations.en['plan.feature.decouverte.4'] = '7-day free trial';
translations.en['plan.feature.essentiel.1'] = '10 children max';
translations.en['plan.feature.essentiel.2'] = '10 nannies max';
translations.en['plan.feature.essentiel.3'] = '10 parents max';
translations.en['plan.feature.essentiel.4'] = 'Monthly billing';
translations.en['plan.feature.essentiel.5'] = 'PDF export';
translations.en['plan.feature.pro.1'] = 'Unlimited';
translations.en['plan.feature.pro.2'] = 'AI Assistant';
translations.en['plan.feature.pro.3'] = 'Monthly billing';
translations.en['plan.feature.pro.4'] = 'PDF export';
translations.en['plan.feature.pro.5'] = 'Priority support';

// Billing settings section
translations.fr['settings.billing.title'] = 'Facturation';
translations.fr['settings.billing.subtitle'] = 'Ces montants sont utilisés pour le calcul automatique des factures et cotisations.';
translations.fr['settings.billing.daily_rate'] = 'Garde journalière';
translations.fr['settings.billing.daily_rate.desc'] = 'Montant facturé par jour de garde';
translations.fr['settings.billing.per_day'] = 'par jour';
translations.fr['settings.billing.child_fee'] = 'Cotisation enfant';
translations.fr['settings.billing.child_fee.desc'] = 'Cotisation annuelle par enfant';
translations.fr['settings.billing.per_year'] = 'par an';
translations.fr['settings.billing.nanny_fee'] = 'Cotisation nounou';
translations.fr['settings.billing.nanny_fee.desc'] = 'Cotisation mensuelle par nounou';
translations.fr['settings.billing.per_month'] = 'par mois';
translations.fr['settings.billing.saved'] = 'Paramètres de facturation enregistrés.';
translations.fr['settings.billing.save_btn'] = 'Enregistrer les modifications';

translations.en['settings.billing.title'] = 'Billing';
translations.en['settings.billing.subtitle'] = 'These amounts are used for automatic invoice and fee calculations.';
translations.en['settings.billing.daily_rate'] = 'Daily rate';
translations.en['settings.billing.daily_rate.desc'] = 'Amount charged per day of care';
translations.en['settings.billing.per_day'] = 'per day';
translations.en['settings.billing.child_fee'] = 'Child fee';
translations.en['settings.billing.child_fee.desc'] = 'Annual fee per child';
translations.en['settings.billing.per_year'] = 'per year';
translations.en['settings.billing.nanny_fee'] = 'Nanny fee';
translations.en['settings.billing.nanny_fee.desc'] = 'Monthly fee per nanny';
translations.en['settings.billing.per_month'] = 'per month';
translations.en['settings.billing.saved'] = 'Billing settings saved.';
translations.en['settings.billing.save_btn'] = 'Save changes';

translations.es['settings.billing.title'] = 'Facturación';
translations.es['settings.billing.subtitle'] = 'Estos importes se usan para el cálculo automático de facturas y cuotas.';
translations.es['settings.billing.daily_rate'] = 'Tarifa diaria';
translations.es['settings.billing.daily_rate.desc'] = 'Importe facturado por día de cuidado';
translations.es['settings.billing.per_day'] = 'por día';
translations.es['settings.billing.child_fee'] = 'Cuota niño';
translations.es['settings.billing.child_fee.desc'] = 'Cuota anual por niño';
translations.es['settings.billing.per_year'] = 'por año';
translations.es['settings.billing.nanny_fee'] = 'Cuota cuidadora';
translations.es['settings.billing.nanny_fee.desc'] = 'Cuota mensual por cuidadora';
translations.es['settings.billing.per_month'] = 'por mes';
translations.es['settings.billing.saved'] = 'Ajustes de facturación guardados.';
translations.es['settings.billing.save_btn'] = 'Guardar cambios';

// Tour names & descriptions
translations.fr['tour.onboarding.name'] = 'Prise en main';
translations.fr['tour.onboarding.description'] = 'Découvrez l\'interface et les fonctionnalités principales de Frimousse.';
translations.fr['tour.add-nanny.name'] = 'Créer une nounou';
translations.fr['tour.add-nanny.description'] = 'Apprenez à ajouter une assistante maternelle ou une professionnelle à votre équipe.';
translations.fr['tour.add-parent.name'] = 'Créer un parent';
translations.fr['tour.add-parent.description'] = 'Apprenez à inscrire un parent ou tuteur légal dans l\'application.';
translations.fr['tour.add-child.name'] = 'Inscrire un enfant';
translations.fr['tour.add-child.description'] = 'Apprenez à inscrire un enfant et le rattacher à un parent et une nounou.';
translations.fr['tour.planning.name'] = 'Gérer le planning';
translations.fr['tour.planning.description'] = 'Découvrez comment organiser le planning et les pointages.';
translations.fr['tour.presence-sheets.name'] = 'Feuilles de présence';
translations.fr['tour.presence-sheets.description'] = 'Créez et signez les relevés mensuels de présence avec les parents.';
translations.fr['tour.messaging.name'] = 'Messagerie instantanée';
translations.fr['tour.messaging.description'] = 'Échangez en direct avec les nounous et les parents de votre centre.';
translations.fr['tour.feed-reports.name'] = 'Fil d\'actualité';
translations.fr['tour.feed-reports.description'] = 'Communiquez avec les parents : humeur, repas, incidents, moments du quotidien.';

translations.en['tour.onboarding.name'] = 'Getting started';
translations.en['tour.onboarding.description'] = 'Discover the interface and main features of Frimousse.';
translations.en['tour.add-nanny.name'] = 'Create a nanny';
translations.en['tour.add-nanny.description'] = 'Learn how to add a childcare professional to your team.';
translations.en['tour.add-parent.name'] = 'Create a parent';
translations.en['tour.add-parent.description'] = 'Learn how to register a parent or legal guardian in the app.';
translations.en['tour.add-child.name'] = 'Register a child';
translations.en['tour.add-child.description'] = 'Learn how to register a child and link them to a parent and nanny.';
translations.en['tour.planning.name'] = 'Manage the schedule';
translations.en['tour.planning.description'] = 'Discover how to organize the schedule and attendance tracking.';
translations.en['tour.presence-sheets.name'] = 'Attendance sheets';
translations.en['tour.presence-sheets.description'] = 'Create and sign monthly attendance records with parents.';
translations.en['tour.messaging.name'] = 'Instant messaging';
translations.en['tour.messaging.description'] = 'Chat in real time with nannies and parents at your center.';
translations.en['tour.feed-reports.name'] = 'News feed';
translations.en['tour.feed-reports.description'] = 'Communicate with parents: mood, meals, incidents, daily moments.';

translations.es['tour.onboarding.name'] = 'Primeros pasos';
translations.es['tour.onboarding.description'] = 'Descubre la interfaz y las funcionalidades principales de Frimousse.';
translations.es['tour.add-nanny.name'] = 'Crear una cuidadora';
translations.es['tour.add-nanny.description'] = 'Aprende a añadir una cuidadora profesional a tu equipo.';
translations.es['tour.add-parent.name'] = 'Crear un padre/madre';
translations.es['tour.add-parent.description'] = 'Aprende a registrar un padre, madre o tutor legal en la aplicación.';
translations.es['tour.add-child.name'] = 'Inscribir un niño';
translations.es['tour.add-child.description'] = 'Aprende a inscribir un niño y vincularlo a un padre y una cuidadora.';
translations.es['tour.planning.name'] = 'Gestionar el horario';
translations.es['tour.planning.description'] = 'Descubre cómo organizar el horario y el control de asistencia.';
translations.es['tour.presence-sheets.name'] = 'Hojas de asistencia';
translations.es['tour.presence-sheets.description'] = 'Crea y firma los registros mensuales de asistencia con los padres.';
translations.es['tour.messaging.name'] = 'Mensajería instantánea';
translations.es['tour.messaging.description'] = 'Chatea en tiempo real con las cuidadoras y los padres de tu centro.';
translations.es['tour.feed-reports.name'] = 'Noticias';
translations.es['tour.feed-reports.description'] = 'Comunícate con los padres: estado de ánimo, comidas, incidentes, momentos del día.';

// Tutorials section
translations.fr['settings.tutorials.title'] = 'Tutoriels interactifs';
translations.fr['settings.tutorials.progress_label'] = 'Ta progression';
translations.fr['settings.tutorials.progress_detail'] = '{done} sur {total} tutoriel(s) complété(s)';
translations.fr['settings.tutorials.done'] = '✓ Complété';
translations.fr['settings.tutorials.not_started'] = 'Non commencé';
translations.fr['settings.tutorials.menu.title'] = 'Tutoriels';
translations.fr['settings.tutorials.menu.subtitle'] = 'Apprenez à utiliser Frimousse';
translations.fr['settings.tutorials.menu.footer'] = 'Vous pouvez relancer un tutoriel à tout moment depuis le bouton ? du menu.';

translations.en['settings.tutorials.title'] = 'Interactive tutorials';
translations.en['settings.tutorials.progress_label'] = 'Your progress';
translations.en['settings.tutorials.progress_detail'] = '{done} of {total} tutorial(s) completed';
translations.en['settings.tutorials.done'] = '✓ Completed';
translations.en['settings.tutorials.not_started'] = 'Not started';
translations.en['settings.tutorials.menu.title'] = 'Tutorials';
translations.en['settings.tutorials.menu.subtitle'] = 'Learn how to use Frimousse';
translations.en['settings.tutorials.menu.footer'] = 'You can restart a tutorial at any time from the ? button in the menu.';

translations.es['settings.tutorials.title'] = 'Tutoriales interactivos';
translations.es['settings.tutorials.progress_label'] = 'Tu progreso';
translations.es['settings.tutorials.progress_detail'] = '{done} de {total} tutorial(es) completado(s)';
translations.es['settings.tutorials.done'] = '✓ Completado';
translations.es['settings.tutorials.not_started'] = 'Sin empezar';
translations.es['settings.section.account'] = 'Perfil y cuenta';
translations.es['settings.section.account.subtitle'] = 'Editar tu información';
translations.es['settings.section.notifications'] = 'Notificaciones';
translations.es['settings.section.notifications.subtitle'] = 'Correo electrónico y push';
translations.es['settings.section.billing'] = 'Facturación';
translations.es['settings.section.billing.subtitle'] = 'Tarifas y cotizaciones';
translations.es['settings.section.tutorials'] = 'Tutoriales';
translations.es['settings.section.tutorials.completed'] = 'completado';
translations.es['settings.section.tutorials.progress'] = '{done}/{total} completados';
translations.es['settings.section.email_logs'] = 'Registro de emails';
translations.es['settings.section.email_logs.subtitle'] = 'Historial de emails enviados';
translations.es['settings.tutorials.menu.title'] = 'Tutoriales';
translations.es['settings.tutorials.menu.subtitle'] = 'Aprende a usar Frimousse';
translations.es['settings.tutorials.menu.footer'] = 'Puedes reiniciar un tutorial en cualquier momento desde el botón ? del menú.';

// ─── ESPAÑOL ────────────────────────────────────────────────────────────────
translations.es['nav.assistant'] = 'Asistente IA';
translations.es['assistant.title'] = 'Asistente Frimousse';
translations.es['assistant.header.title'] = 'Asistente Frimousse';
translations.es['assistant.header.subtitle'] = '· Consejos y ayuda para la primera infancia';
translations.es['assistant.intro.title'] = 'Asistente';
translations.es['assistant.intro.description'] = 'Soy tu asistente especializado en cuidado infantil. Puedo ayudarte con:';
translations.es['assistant.welcome'] = '👋 ¡Hola! Soy tu asistente especializado en cuidado infantil. Haz tu pregunta y te responderé de manera clara y amable.';
translations.es['assistant.option.nutrition'] = 'Consejos de nutrición';
translations.es['assistant.option.nutrition.example'] = '¿Qué cocinar para mi hijo?';
translations.es['assistant.option.education'] = 'Consejos pedagógicos';
translations.es['assistant.option.education.example'] = 'Desarrollo y aprendizajes adaptados a la edad';
translations.es['assistant.option.activities'] = 'Actividades sugeridas';
translations.es['assistant.option.activities.example'] = 'Juegos y ejercicios según la edad';
translations.es['assistant.user.fallback'] = 'Usted';
translations.es['assistant.input.aria'] = 'Tu pregunta';
translations.es['assistant.input.placeholder'] = 'Haz tu pregunta al asistente...';
translations.es['assistant.loading'] = 'Cargando...';
translations.es['assistant.send.button'] = 'Enviar';
translations.es['common.none'] = '—';
translations.es['common.view_more'] = 'Ver más';
translations.es['common.info'] = 'Información';
translations.es['common.ok'] = 'OK';
translations.es['common.at'] = 'a las';
translations.es['common.yes'] = 'Sí';
translations.es['common.no'] = 'No';
translations.es['common.confirm'] = 'Confirmar';
translations.es['common.close'] = 'Cerrar';
translations.es['common.search'] = 'Buscar';
translations.es['common.all'] = 'Todos';
translations.es['common.show_password'] = 'Mostrar contraseña';
translations.es['common.hide_password'] = 'Ocultar contraseña';
translations.es['loading'] = 'Cargando...';
translations.es['no_profile'] = 'No hay datos de perfil disponibles';

// payments
translations.es['payments.history.title'] = 'Historial de pagos';
translations.es['payments.history.empty'] = 'Sin registros para este período.';
translations.es['payments.total'] = 'Total';
translations.es['payments.days'] = 'días';
translations.es['payments.export_csv'] = 'Excel';
translations.es['payments.print'] = 'PDF';
translations.es['payments.filter.all_parents'] = 'Todos los padres';
translations.es['payments.download_invoice'] = 'Factura';
translations.es['payments.send_invoice'] = 'Enviar';
translations.es['payments.send_success'] = 'Correo enviado';
translations.es['payments.send_success_to'] = 'Correo enviado a {name}';
translations.es['payments.send_failed'] = 'Error al enviar el correo';
translations.es['payments.errors.no_email'] = 'No se encontró ninguna dirección de correo';
translations.es['payments.card.month_revenue'] = 'Ingresos del mes';
translations.es['payments.card.families_active'] = 'Familias activas';
translations.es['payments.card.unpaid'] = 'Pagos pendientes';
translations.es['payments.status.paid'] = 'Pagado';
translations.es['payments.status.unpaid'] = 'No pagado';
translations.es['payments.actions.mark_paid'] = 'Marcar como pagado';
translations.es['payments.actions.mark_unpaid'] = 'Marcar como no pagado';
translations.es['payments.detail.header'] = 'Detalle por niño - {month}';
translations.es['payments.family.total_label'] = 'Total familia';
translations.es['payments.family.summary'] = '{n} niño(s) • {days} días total';
translations.es['payments.errors.select_parent'] = 'Seleccione un padre primero para generar la factura.';
translations.es['payments.errors.no_record_parent'] = 'Sin registro para este padre este mes.';
translations.es['payments.errors.invoice_not_ready'] = 'El mes actual no ha terminado: no puede descargar esta factura todavía.';
translations.es['payments.errors.invoice_download'] = 'Error al descargar la factura';
translations.es['payments.no_child_this_month'] = 'Ningún niño presente este mes.';
translations.es['payments.view.by_family'] = 'Por familia';
translations.es['payments.view.by_nanny'] = 'Por cuidadora';
translations.es['payments.by_nanny.payments'] = 'pagos';

// adjustments
translations.es['adjustment.title'] = 'Descuentos para {month}';
translations.es['adjustment.loading'] = 'Cargando…';
translations.es['adjustment.none'] = 'Sin descuentos aplicados';
translations.es['adjustment.button'] = 'Añadir descuento';
translations.es['adjustment.amount'] = 'Importe';
translations.es['adjustment.comment'] = 'Comentario';
translations.es['adjustment.optional'] = 'opcional';
translations.es['adjustment.cancel'] = 'Cancelar';
translations.es['adjustment.save'] = 'Guardar';
translations.es['adjustment.saving'] = 'Guardando…';
translations.es['adjustment.delete'] = 'Eliminar';
translations.es['adjustment.confirm_delete'] = '¿Eliminar este descuento?';
translations.es['adjustment.load_error'] = 'Error al cargar los descuentos';
translations.es['adjustment.save_error'] = 'Error al guardar';
translations.es['adjustment.delete_error'] = 'Error al eliminar';
translations.es['adjustment.invalid_amount'] = 'Importe no válido';
translations.es['adjustment.exists'] = 'Descuento aplicado';
translations.es['adjustment.label'] = 'Descuento aplicado';

// reports
translations.es['reports.title'] = 'Informes';
translations.es['reports.new'] = 'Nuevo informe';
translations.es['reports.create'] = 'Crear';
translations.es['reports.save'] = 'Guardar';
translations.es['reports.delete'] = 'Eliminar';
translations.es['reports.cancel'] = 'Cancelar';
translations.es['reports.filter.last30'] = 'Últimos 30 días';
translations.es['reports.filter.allTypes'] = 'Todos los tipos';
translations.es['reports.filter.allPriorities'] = 'Todas las prioridades';
translations.es['reports.empty'] = 'Sin informes disponibles';
translations.es['reports.card.total'] = 'Total informes';
translations.es['reports.card.week'] = 'Esta semana';
translations.es['reports.modal.title.new'] = 'Nuevo informe';
translations.es['reports.modal.title.edit'] = 'Editar informe';
translations.es['reports.field.title'] = 'Título';
translations.es['reports.field.type'] = 'Tipo';
translations.es['reports.field.priority'] = 'Prioridad';
translations.es['reports.field.child'] = 'Seleccionar niño';
translations.es['reports.field.nanny'] = 'Seleccionar cuidadora';
translations.es['reports.field.role'] = 'Seleccionar rol';
translations.es['reports.field.group'] = 'Seleccionar grupo';
translations.es['reports.field.description'] = 'Descripción';
translations.es['reports.field.duration'] = 'Duración';
translations.es['reports.field.childrenInvolved'] = 'Niños implicados';
translations.es['reports.card.duration'] = 'Duración';
translations.es['reports.card.childrenInvolved'] = '{n} niños implicados';
translations.es['label.age'] = 'Edad';
translations.es['reports.field.summary'] = 'Resumen del informe';
translations.es['reports.summary.incident'] = 'Resumen del informe';
translations.es['reports.summary.comportement'] = 'Observación de comportamiento';
translations.es['reports.summary.soin'] = 'Observación de cuidados';
translations.es['reports.search.placeholder'] = 'Buscar por nombre del niño';
translations.es['reports.priority.haute'] = 'PRIORIDAD ALTA';
translations.es['reports.priority.moyenne'] = 'MEDIA';
translations.es['reports.priority.basse'] = 'BAJA';
translations.es['reports.type.incident'] = 'INCIDENTE';
translations.es['reports.type.comportement'] = 'COMPORTAMIENTO';
translations.es['reports.type.soin'] = 'CUIDADOS';

// child groups
translations.es['children.group.G1'] = 'Grupo 1 (0-1 años)';
translations.es['children.group.G2'] = 'Grupo 2 (1-2 años)';
translations.es['children.group.G3'] = 'Grupo 3 (2-3 años)';
translations.es['children.group.G4'] = 'Grupo 4 (3-4 años)';
translations.es['children.group.G5'] = 'Grupo 5 (4-5 años)';
translations.es['children.group.G6'] = 'Grupo 6 (5-6 años)';

// nanny roles
translations.es['nanny.role.senior'] = 'Cuidadora senior';
translations.es['nanny.role.manager'] = 'Responsable';
translations.es['nanny.role.trainee'] = 'Practicante';
translations.es['nanny.role.substitute'] = 'Sustituta';
translations.es['nanny.role.other'] = 'Otro';

// global
translations.es['global.add'] = 'Añadir';
translations.es['global.save'] = 'Guardar';
translations.es['global.cancel'] = 'Cancelar';
translations.es['global.delete'] = 'Eliminar';
translations.es['global.error'] = 'Se produjo un error.';

// pages
translations.es['page.dashboard'] = 'Inicio';
translations.es['dashboard.welcome'] = '¡Bienvenido! Esto es lo que ocurre hoy.';
translations.es['dashboard.children_registered'] = 'Niños registrados';
translations.es['dashboard.since_last_month'] = 'desde el mes pasado';
translations.es['dashboard.present_today'] = 'Presentes hoy';
translations.es['dashboard.presence_rate'] = 'Tasa de asistencia';
translations.es['dashboard.active_caregivers'] = 'Cuidadoras activas';
translations.es['dashboard.no_change'] = '— Sin cambio';
translations.es['dashboard.weekly_average'] = 'Media semanal';
translations.es['dashboard.since_last_week'] = 'desde la semana pasada';
translations.es['page.feed'] = 'Noticias';
translations.es['page.children'] = 'Niños';
translations.es['page.children.title'] = 'Gestión de niños';
translations.es['page.children.description'] = 'Gestiona perfiles, información médica y contactos de emergencia.';
translations.es['page.parent'] = 'Padres';
translations.es['page.parent.description'] = 'Gestiona cuentas de padres, contactos y niños asociados.';
translations.es['page.nannies'] = 'Cuidadoras';
translations.es['page.nannies.description'] = 'Gestiona perfiles, horarios, cualificaciones y asignaciones del personal.';
translations.es['page.activities'] = 'Actividades';
translations.es['page.reports'] = 'Informes';
translations.es['page.reports.description'] = 'Consulta todos los informes de las cuidadoras sobre incidentes, comportamientos y observaciones diarias de los niños.';
translations.es['page.payments'] = 'Pagos';
translations.es['page.payments.description'] = 'Consulta los totales mensuales calculados para cada padre.';

// nav
translations.es['nav.dashboard'] = 'Inicio';
translations.es['nav.feed'] = 'Noticias';
translations.es['nav.notifications'] = 'Notificaciones';
translations.es['nav.children'] = 'Niños';
translations.es['nav.children_my'] = 'Mis hijos';
translations.es['nav.parents'] = 'Padres';
translations.es['nav.nannies'] = 'Cuidadoras';
translations.es['nav.activities'] = 'Actividades';
translations.es['nav.reports'] = 'Informes';
translations.es['nav.payments'] = 'Historial de pagos';
translations.es['nav.settings'] = 'Configuración';
translations.es['nav.reviews'] = 'Reseñas';

// children
translations.es['children.add'] = 'Añadir un niño';
translations.es['children.prescription.noneTitle'] = 'Sin receta';
translations.es['children.prescription.noneMessage'] = 'No hay ninguna receta para {name}.';
translations.es['children.thisChild'] = 'este niño';
translations.es['children.search_placeholder'] = 'Buscar por nombre, padre...';
translations.es['children.group.all'] = 'Todos los grupos';
translations.es['children.sort.name'] = 'Nombre A-Z';
translations.es['children.sort.age'] = 'Edad ascendente';
translations.es['children.total'] = 'Total';
translations.es['children.present'] = 'Presentes';
translations.es['children.form.name'] = 'Nombre y apellidos';
translations.es['children.form.age'] = 'Edad';
translations.es['children.form.birthDate'] = 'Fecha de nacimiento';
translations.es['children.form.name_label'] = 'Nombre y apellidos';
translations.es['children.form.birthDate_label'] = 'Fecha de nacimiento';
translations.es['children.form.sexe_label'] = 'Sexo';
translations.es['children.form.group_label'] = 'Grupo';
translations.es['children.form.parentName_label'] = 'Nombre del padre/madre';
translations.es['children.form.parentPhone_label'] = 'Teléfono del padre/madre';
translations.es['children.form.parentEmail_label'] = 'Correo del padre/madre';
translations.es['children.form.allergies_label'] = 'Alergias';
translations.es['children.form.required_note'] = 'Campos obligatorios';
translations.es['children.form.sexe.m'] = 'Niño';
translations.es['children.form.sexe.f'] = 'Niña';
translations.es['children.form.group_placeholder'] = 'Grupo';
translations.es['children.form.parent_placeholder'] = 'Nombre del padre/madre (opcional)';
translations.es['children.form.parentPhone_placeholder'] = 'Teléfono del padre/madre (opcional)';
translations.es['children.form.parentEmail_placeholder'] = 'Correo del padre/madre (opcional)';
translations.es['children.nannies.label'] = 'Cuidadoras asignadas (selección múltiple)';
translations.es['children.nannies.none'] = 'Sin cuidadora disponible';
translations.es['children.form.allergies_placeholder'] = 'Alergias (opcional)';
translations.es['children.form.edit'] = 'Editar';
translations.es['children.form.added_success'] = '¡El niño ha sido añadido!';
translations.es['children.form.deleted_success'] = '¡El niño ha sido eliminado!';
translations.es['children.loading'] = 'Cargando...';
translations.es['children.presence.present_today'] = 'Presente hoy';
translations.es['children.presence.absent_today'] = 'Ausente hoy';
translations.es['children.new_badge'] = 'Nuevo';
translations.es['children.assigned'] = 'Asignado: {names}';
translations.es['children.not_assigned'] = 'Sin asignar';
translations.es['children.birthDate.undefined'] = 'No definida';
translations.es['children.allergies.label'] = 'Alergias:';
translations.es['children.allergies.none'] = 'Ninguna';
translations.es['children.parent.label'] = 'Padre/Madre:';
translations.es['children.call_parent_title'] = 'Llamar al padre/madre';
translations.es['children.present_on'] = 'Niños presentes el {date}';
translations.es['children.none_on_date'] = 'Ningún niño presente el {date}';
translations.es['children.delete_selected'] = 'Eliminar selección';
translations.es['children.delete_selected_success'] = '{n} asignación(es) eliminada(s)';
translations.es['children.email_parent_title'] = 'Enviar correo al padre/madre';
translations.es['children.cotisation.pay'] = 'Pagar';
translations.es['children.cotisation.label'] = 'Cuota anual';
translations.es['children.cotisation.this_month'] = 'A pagar este mes';
translations.es['children.cotisation.up_to_date'] = 'Cuota al día';
translations.es['children.cotisation.days_remaining'] = '{days} días restantes';
translations.es['children.cotisation.renew'] = 'Cuota a renovar';
translations.es['children.billing.calculating'] = 'calculando...';
translations.es['children.prescription.view_title'] = 'Receta de {name}';
translations.es['children.delete.confirm_title'] = 'Confirmar la eliminación';
translations.es['children.delete.confirm_body'] = '¿Desea eliminar este niño? Esta acción es irreversible.';
translations.es['children.prescription.view_button'] = 'Ver receta';
translations.es['children.action.edit'] = 'Editar';
translations.es['children.action.delete'] = 'Eliminar';
translations.es['children.deleting'] = 'Eliminando...';
translations.es['children.photo_consent.yes'] = 'Autorización fotos: Sí';
translations.es['children.photo_consent.no'] = 'Autorización fotos: No';
translations.es['children.photo_consent.unknown'] = 'Autorización: —';
translations.es['children.photo_consent.toggle_label'] = 'Permitir fotos';
translations.es['children.photo_consent.allowed'] = 'Autorizado';
translations.es['children.photo_consent.denied'] = 'No autorizado';
translations.es['children.photo_consent.loading'] = 'Cargando consentimiento...';

// parent form
translations.es['parent.form.required_note'] = 'Campo obligatorio';
translations.es['parent.form.firstName'] = 'Nombre';
translations.es['parent.form.lastName'] = 'Apellidos';
translations.es['parent.form.email'] = 'Correo electrónico';
translations.es['parent.form.phone'] = 'Teléfono';
translations.es['parent.form.address'] = 'Dirección';
translations.es['parent.form.postalCode'] = 'Código postal';
translations.es['parent.form.city'] = 'Ciudad';
translations.es['parent.form.region'] = 'Región';
translations.es['parent.form.country'] = 'País';
translations.es['parent.form.password.placeholder'] = 'Contraseña (dejar vacío para invitar)';
translations.es['parent.form.confirmPassword.placeholder'] = 'Confirmar contraseña';
translations.es['parent.form.submit.add'] = 'Añadir';
translations.es['parent.form.submit.save'] = 'Guardar';
translations.es['parent.form.cancel'] = 'Cancelar';
translations.es['parent.form.error.required'] = 'El nombre, apellidos y correo son obligatorios';
translations.es['parent.form.error.password_mismatch'] = 'Las contraseñas no coinciden';
translations.es['parent.form.success.created_with_password'] = 'Padre creado con contraseña.';
translations.es['parent.form.success.created_invited'] = 'Padre creado — se ha enviado una invitación.';
translations.es['parent.form.success.updated'] = 'Padre actualizado.';
translations.es['parent.form.deleted_success'] = 'Padre eliminado.';
translations.es['parent.reset.confirm_title'] = 'Confirmar restablecimiento de contraseña';
translations.es['parent.reset.confirm_body'] = 'Va a restablecer la contraseña de este padre. ¿Desea continuar?';
translations.es['parent.reset.cancel'] = 'Cancelar';
translations.es['parent.reset.confirm'] = 'Confirmar';
translations.es['parent.delete.confirm_body'] = '¿Desea eliminar a este padre? Esta acción es irreversible.';
translations.es['parent.children.count'] = '{n} niño(s)';
translations.es['parent.children.label'] = 'Niños';
translations.es['parent.password.requirements.title'] = 'La contraseña debe contener:';
translations.es['parent.password.requirements.upper'] = '1 mayúscula';
translations.es['parent.password.requirements.digit'] = '1 número';
translations.es['parent.password.requirements.special'] = '1 carácter especial';
translations.es['parent.password.requirements.length'] = '{min}+ caracteres';
translations.es['nanny.password.requirements.upper'] = 'Una mayúscula (A-Z)';
translations.es['nanny.password.requirements.digit'] = 'Un número (0-9)';
translations.es['nanny.password.requirements.special'] = 'Un carácter especial';
translations.es['nanny.password.requirements.length'] = '{min} caracteres mín.';
translations.es['parent.prescription.upload'] = 'Subir';
translations.es['parent.prescription.delete'] = 'Eliminar';
translations.es['parent.prescription.upload_failed'] = 'Error al subir la receta.';
translations.es['parent.prescription.delete_failed'] = 'Error al eliminar la receta.';
translations.es['parent.prescription.fetch_error'] = 'Error al recuperar la receta';
translations.es['parent.cotisation.this_month'] = 'A pagar este mes';
translations.es['parent.cotisation.annual_total'] = 'Cuota anual total';
translations.es['parent.add'] = 'Añadir un padre';

// nannies
translations.es['nanny.add'] = 'Añadir una cuidadora';
translations.es['nanny.available_label'] = 'Disponibles';
translations.es['nanny.on_leave_label'] = 'De baja';
translations.es['nanny.search_placeholder'] = 'Buscar por nombre...';
translations.es['nanny.filter.any'] = 'Cualquier disponibilidad';
translations.es['nanny.filter.disponible'] = 'Disponible';
translations.es['nanny.filter.en_conge'] = 'De baja';
translations.es['nanny.filter.experience_any'] = 'Cualquier experiencia';
translations.es['nanny.filter.experience_junior'] = 'Junior (-3 años)';
translations.es['nanny.filter.experience_senior'] = 'Senior (3+ años)';
translations.es['nanny.form.name'] = 'Nombre y apellidos';
translations.es['nanny.form.experience'] = 'Experiencia (años)';
translations.es['nanny.form.birthDate'] = 'Fecha de nacimiento';
translations.es['nanny.form.specializations'] = 'Especializaciones (separadas por coma)';
translations.es['nanny.form.contact'] = 'Teléfono';
translations.es['nanny.form.email'] = 'Correo electrónico';
translations.es['nanny.form.password'] = 'Contraseña';
translations.es['nanny.form.confirmPassword'] = 'Confirmar contraseña';
translations.es['nanny.form.availability'] = 'Disponibilidad';
translations.es['nanny.availability.available'] = 'Disponible';
translations.es['nanny.availability.on_leave'] = 'De baja';
translations.es['nanny.availability.sick'] = 'Enfermedad';
translations.es['nanny.available_today'] = 'Disponibles hoy';
translations.es['nanny.planning.of'] = 'Horario de {name}';
translations.es['nanny.planning.button'] = 'Horario';
translations.es['nanny.assignments_today'] = 'Asignaciones hoy';
translations.es['nanny.cotisation.label'] = 'Cuota mensual:';
translations.es['nanny.cotisation.days_remaining'] = '{n} día(s) restante(s)';
translations.es['nanny.cotisation.renew'] = 'Cuota a renovar';
translations.es['nanny.payment.pay'] = 'Pagar';
translations.es['nanny.payment.loading'] = 'Pagando...';
translations.es['nanny.payment.confirming'] = 'Confirmando...';
translations.es['nanny.cotisation.total_parents'] = 'Cuota mensual total de los padres';
translations.es['nanny.payment.success'] = 'Pago registrado';
translations.es['nanny.payment.error'] = 'Error en el pago';
translations.es['nanny.payment.confirm_title'] = 'Confirmar el pago';
translations.es['nanny.payment.confirm_body'] = '¿Desea registrar el pago de {amount}€ para esta cuidadora?';
translations.es['nanny.birth.label'] = 'Nacido/a el';
translations.es['nanny.delete.confirm_body'] = '¿Desea eliminar a esta cuidadora? Esta acción es irreversible.';
translations.es['nanny.added_success'] = 'Cuidadora añadida.';
translations.es['nanny.update_success'] = 'Cuidadora actualizada.';
translations.es['nanny.delete_success'] = 'Cuidadora eliminada.';

// feed
translations.es['feed.write_comment'] = 'Escribir un comentario...';
translations.es['feed.send'] = 'Enviar';
translations.es['feed.center_news'] = 'Noticias del centro';
translations.es['feed.composer_placeholder'] = '¿Qué quieres compartir hoy?';
translations.es['feed.photo'] = 'Foto';
translations.es['feed.gallery'] = 'Galería';
translations.es['feed.no_images'] = 'Ninguna imagen seleccionada';
translations.es['feed.images'] = 'imagen(es)';
translations.es['feed.identify'] = 'Identificar';
translations.es['feed.select_children'] = 'Seleccionar niños';
translations.es['feed.no_children_available'] = 'Sin niños disponibles';
translations.es['feed.no_child'] = 'Sin niño';
translations.es['feed.tag_children'] = 'Etiquetar niños';
translations.es['feed.no_authorization'] = 'Sin autorización';

// settings
translations.es['settings.title'] = 'Configuración';
translations.es['settings.description'] = 'Gestiona tus preferencias y tu cuenta';
translations.es['settings.email.title'] = 'Notificaciones por correo';
translations.es['settings.email.desc'] = 'Recibir un correo por cada nuevo informe o asignación';
translations.es['settings.push.title'] = 'Notificaciones push';
translations.es['settings.push.desc'] = 'Recibir notificaciones en tu navegador (recordatorios y anuncios)';
translations.es['settings.language.title'] = 'Idioma';
translations.es['settings.language.desc'] = 'Elige el idioma de la interfaz';
translations.es['settings.account.title'] = 'Gestión de la cuenta';
translations.es['settings.account.delete'] = 'Eliminar la cuenta';
translations.es['settings.profile.edit'] = 'Editar perfil';
translations.es['settings.save'] = 'Guardar';
translations.es['settings.cancel'] = 'Cancelar';
translations.es['settings.logout'] = 'Cerrar sesión';
translations.es['settings.change_password'] = 'Cambiar contraseña';
translations.es['supportpage.hero.tag'] = 'Soporte';
translations.es['supportpage.hero.title_line1'] = '¿Cómo podemos';
translations.es['supportpage.hero.title_highlight'] = 'ayudarte?';
translations.es['supportpage.hero.description'] = 'Encuentra todos los recursos para usar Frimousse, obtener ayuda o contactar con nuestro equipo.';
translations.es['supportpage.contact.title'] = 'Contáctanos';
translations.es['supportpage.contact.email_label'] = 'Correo electrónico';
translations.es['supportpage.contact.phone_label'] = 'Teléfono';
translations.es['supportpage.premium.title'] = 'Soporte premium';
translations.es['supportpage.premium.description'] = 'Asistencia prioritaria para suscriptores Essentiel & Pro (días laborables de 9 a 18 h).';
translations.es['supportpage.guides.title'] = 'Guías y documentación';
translations.es['supportpage.guides.quick_start'] = 'Guía de inicio rápido';
translations.es['supportpage.guides.add_child'] = 'Añadir un niño';
translations.es['supportpage.guides.manage_planning'] = 'Gestionar planificación';
translations.es['supportpage.guides.reports'] = 'Ver informes';
translations.es['supportpage.guides.privacy'] = 'Seguridad y RGPD';
translations.es['supportpage.legal.title'] = 'Recursos adicionales';
translations.es['supportpage.legal.privacy_policy'] = 'Política de privacidad';
translations.es['supportpage.legal.terms'] = 'Términos';
translations.es['supportpage.legal.legal_notice'] = 'Aviso legal';
translations.es['supportpage.cta.title'] = '¿Listo para comenzar?';
translations.es['supportpage.cta.description'] = 'Crea tu cuenta gratis y descubre todas las funcionalidades de Frimousse.';
translations.es['supportpage.seo.title'] = 'Soporte y ayuda | Frimousse - Aplicación de gestión de guardería';
translations.es['supportpage.seo.description'] = '¿Necesitas ayuda con Frimousse? Guías, asistencia técnica, documentación y FAQ para guarderías, micro-guarderías, MAM y centros infantiles. Soporte reactivo por correo electrónico.';
translations.es['supportpage.breadcrumb.home'] = 'Inicio';
translations.es['supportpage.breadcrumb.support'] = 'Soporte';
translations.es['settings.support.title'] = 'Soporte al cliente';
translations.es['settings.support.description'] = '¿Necesitas ayuda? Contacta con nuestro equipo de soporte';
translations.es['settings.support.open_ticket'] = 'Abrir un ticket';
translations.es['settings.delete_confirm.title'] = 'Confirmar la eliminación de la cuenta';
translations.es['settings.delete_confirm.body'] = '¿Desea eliminar su cuenta? Esta acción es irreversible y todos sus datos se perderán.';
translations.es['settings.delete_confirm.confirm'] = 'Eliminar';
translations.es['settings.saving'] = 'Guardando...';
translations.es['settings.delete_error'] = 'Error al eliminar la cuenta';
translations.es['settings.password.all_required'] = 'Todos los campos de contraseña son obligatorios';
translations.es['settings.password.mismatch'] = 'Las contraseñas no coinciden';

// Support page
translations.fr['supportpage.community.title'] = 'Communauté';
translations.fr['supportpage.community.description'] = "Échangez avec d'autres utilisateurs et partagez vos bonnes pratiques.";
translations.fr['supportpage.cta.primary'] = 'Essayer gratuitement';
translations.fr['supportpage.cta.secondary'] = "Retour à l'accueil";

translations.en['supportpage.community.title'] = 'Community';
translations.en['supportpage.community.description'] = 'Connect with other users and share best practices.';
translations.en['supportpage.cta.primary'] = 'Try for Free';
translations.en['supportpage.cta.secondary'] = 'Back to home';

translations.es['supportpage.community.title'] = 'Comunidad';
translations.es['supportpage.community.description'] = 'Conéctate con otros usuarios y comparte buenas prácticas.';
translations.es['supportpage.cta.primary'] = 'Probar gratis';
translations.es['supportpage.cta.secondary'] = 'Volver a inicio';

// availability
translations.es['availability.available'] = 'Disponible';
translations.es['availability.on_leave'] = 'De baja';
translations.es['availability.sick'] = 'Enfermedad';

// labels
translations.es['label.firstName'] = 'Nombre';
translations.es['label.lastName'] = 'Apellidos';
translations.es['label.email'] = 'Correo electrónico';
translations.es['label.phone'] = 'Teléfono';
translations.es['label.name'] = 'Nombre';
translations.es['label.contact'] = 'Contacto';
translations.es['label.experience'] = 'Experiencia (años)';
translations.es['label.availability'] = 'Disponibilidad';
translations.es['label.birthDate'] = 'Fecha de nacimiento';
translations.es['label.oldPassword'] = 'Contraseña antigua';
translations.es['label.newPassword'] = 'Nueva contraseña';
translations.es['label.confirmPassword'] = 'Confirmar nueva contraseña';
translations.es['label.start'] = 'Inicio';
translations.es['label.end'] = 'Fin';
translations.es['label.activityName'] = 'Nombre de la actividad';
translations.es['label.comment'] = 'Comentario';
translations.es['label.comment.optional'] = 'Comentario (opcional)';

// activities
translations.es['activities.title'] = 'Planificación de actividades';
translations.es['activities.table.hour'] = 'Hora';
translations.es['activities.none'] = 'Sin actividades';
translations.es['activities.slot.morning'] = 'Mañana';
translations.es['activities.slot.afternoon'] = 'Tarde';
translations.es['activities.modal.nannies_label'] = 'Cuidadoras';
translations.es['activities.nannies.assigned'] = 'Cuidadoras asignadas';
translations.es['activities.nannies.assigned_single'] = 'Cuidadora asignada';
translations.es['activities.nannies.group_summary'] = 'Actividad de grupo — {count} cuidadoras asignadas';
translations.es['activities.modal.no_nannies_loaded'] = 'Sin cuidadora cargada (verifica la API o la base de datos)';
translations.es['activities.add'] = '+ Añadir actividad';
translations.es['activities.modal.edit'] = 'Editar actividad';
translations.es['activities.modal.add'] = 'Añadir actividad';
translations.es['activities.modal.delete'] = 'Eliminar';

// assignment modal
translations.es['assignment.modal.title.add'] = 'Añadir al horario';
translations.es['assignment.modal.title.edit'] = 'Editar el horario';
translations.es['assignment.modal.date'] = 'Fecha';
translations.es['assignment.modal.child'] = 'Niño';
translations.es['assignment.modal.nanny'] = 'Cuidadora';
translations.es['assignment.modal.select'] = 'Seleccionar';

// notifications
translations.es['page.notifications.title'] = 'Notificaciones';
translations.es['page.notifications.desc'] = 'Historial de notificaciones.';
translations.es['notifications.mark_all'] = 'Marcar todo como leído';
translations.es['notifications.stats.unread'] = 'No leídas';
translations.es['notifications.stats.today'] = 'Hoy';
translations.es['notifications.stats.week'] = 'Esta semana';
translations.es['notifications.loading'] = 'Cargando...';
translations.es['notifications.none'] = 'Sin notificaciones.';
translations.es['notifications.confirm_delete.title'] = 'Confirmar la eliminación';
translations.es['notifications.confirm_delete.body'] = '¿Desea eliminar esta notificación?';
translations.es['notifications.confirm_delete.cancel'] = 'Cancelar';
translations.es['notifications.confirm_delete.confirm'] = 'Eliminar';
translations.es['notifications.deleting'] = 'Eliminando...';
translations.es['notifications.mark_read'] = 'Marcar como leído';
translations.es['notifications.mark_unread'] = 'Marcar como no leído';
translations.es['notifications.delete_all'] = 'Eliminar todo';
translations.es['notifications.confirm_delete_all'] = '¿Desea eliminar todas las notificaciones?';
translations.es['notifications.delete_all_failed'] = 'Error al eliminar todas las notificaciones';

// time
translations.es['time.now'] = 'ahora';
translations.es['time.minutes'] = '{n} min';
translations.es['time.hours'] = '{n}h';
translations.es['time.days'] = '{n}d';

// stats
translations.es['stats.total'] = 'Total';
translations.es['stats.active'] = 'Activos';
translations.es['stats.new'] = 'Nuevos';

// modal
translations.es['modal.delete.title'] = 'Confirmar la eliminación';
translations.es['modal.delete.body.generic'] = '¿Desea eliminar este elemento? Esta acción es irreversible.';
translations.es['modal.delete.confirm'] = 'Eliminar';
translations.es['modal.cancel'] = 'Cancelar';

// menu
translations.es['menu.open'] = 'Abrir menú';
translations.es['menu.close'] = 'Cerrar menú';
translations.es['nav.messages'] = 'Mensajes';
translations.es['nav.presenceSheets'] = 'Hojas de presencia';
translations.es['nav.reviews'] = 'Reseñas';
translations.es['nav.centers'] = 'Centros';
translations.es['nav.support'] = 'Soporte';
translations.es['nav.announcements'] = 'Anuncios';
translations.es['nav.subscription'] = 'Mi suscripción';

translations.es['page.messages'] = 'Mensajes';
translations.es['page.messages.description'] = 'Envía y recibe mensajes instantáneos con padres y niñeras.';
translations.es['messages.new.title'] = 'Nuevo mensaje';
translations.es['messages.search.placeholder'] = 'Buscar mensajes';
translations.es['messages.empty'] = 'No hay mensajes';
translations.es['messages.empty.action'] = 'Iniciar una nueva conversación';
translations.es['messages.empty.conversation'] = 'No hay mensajes. ¡Empieza la conversación!';
translations.es['messages.you'] = 'Tú';
translations.es['messages.media.video'] = '🎥 Video';
translations.es['messages.media.image'] = '📷 Foto';
translations.es['messages.unknown'] = 'Desconocido';
translations.es['messages.online'] = 'En línea';
translations.es['messages.role.admin'] = 'Admin';
translations.es['messages.role.superAdmin'] = 'Super Admin';
translations.es['messages.role.parent'] = 'Padre';
translations.es['messages.role.nanny'] = 'Niñera';
translations.es['messages.center.all'] = 'Todos los centros';
translations.es['messages.contactSearch.placeholder'] = 'Buscar persona…';
translations.es['messages.contacts.empty'] = 'No se encontraron contactos';
translations.es['messages.input.placeholder'] = 'Escribe un mensaje…';
translations.es['messages.input.helper'] = 'Enter para enviar · Shift+Enter para salto de línea';
translations.es['messages.delete'] = 'Eliminar';
translations.es['messages.action.edit'] = 'Editar';
translations.es['messages.cannot_edit'] = 'No puedes editar este mensaje';
translations.es['messages.emoji'] = 'Emoji';
translations.es['messages.attach'] = 'Adjuntar una imagen o vídeo';

// admin email logs
translations.es['admin.emaillogs.title'] = 'Registro de correos';
translations.es['admin.emaillogs.description'] = 'Historial de envíos de correos y gestión de reenvíos';
translations.es['admin.emaillogs.loading'] = 'Cargando...';
translations.es['admin.emaillogs.search_placeholder'] = 'Buscar por asunto, destinatario...';
translations.es['admin.emaillogs.export'] = 'Exportar';
translations.es['admin.emaillogs.all_recipients'] = 'Todos los destinatarios';
translations.es['admin.emaillogs.date_sent'] = 'Fecha de envío';
translations.es['admin.emaillogs.recipients'] = 'Destinatarios';
translations.es['admin.emaillogs.send_error'] = 'Error de envío';
translations.es['admin.emaillogs.view_invoice'] = 'Ver factura';
translations.es['admin.emaillogs.download'] = 'Descargar';
translations.es['admin.emaillogs.export_failed'] = 'No se pueden exportar los registros.';
translations.es['admin.emaillogs.open_invoice_failed'] = 'No se puede abrir la factura.';
translations.es['admin.emaillogs.download_invoice_failed'] = 'No se puede descargar la factura.';
translations.es['admin.emaillogs.last_attempt'] = 'Último intento {when}';
translations.es['emaillogs.status.sent'] = 'Enviado';
translations.es['emaillogs.status.pending'] = 'En proceso';
translations.es['emaillogs.status.error'] = 'Error';
translations.es['emaillogs.table.subject'] = 'Asunto';
translations.es['emaillogs.table.date'] = 'Fecha';
translations.es['emaillogs.table.recipients'] = 'Destinatarios';
translations.es['emaillogs.table.invoice_number'] = 'N° Factura';
translations.es['emaillogs.table.status'] = 'Estado';
translations.es['emaillogs.table.error'] = 'Error';
translations.es['emaillogs.table.actions'] = 'Acciones';
translations.es['emaillogs.pagination.prev'] = 'Anterior';
translations.es['emaillogs.pagination.next'] = 'Siguiente';
translations.es['admin.emaillogs.resend'] = 'Reenviar';
translations.es['admin.emaillogs.displaying'] = 'Mostrando {from} a {to} de {total} resultados';
translations.es['admin.emaillogs.choose_month'] = 'Elegir un mes';
translations.es['admin.emaillogs.resend_failed'] = 'Error al reenviar: {msg}';
translations.es['admin.emaillogs.stat.total'] = 'Total';
translations.es['admin.emaillogs.stat.sent'] = 'Enviados';
translations.es['admin.emaillogs.stat.errors'] = 'Errores';
translations.es['admin.emaillogs.export_csv'] = 'Exportar CSV';
translations.es['admin.emaillogs.refresh'] = 'Actualizar';
translations.es['admin.emaillogs.empty'] = 'No se encontraron correos';

// subscription
translations.es['subscription.title'] = 'Mi suscripción';
translations.es['subscription.subtitle'] = 'Gestiona tu plan, información de facturación y sigue el estado de tu suscripción.';
translations.es['subscription.loading'] = 'Cargando…';
translations.es['subscription.error.load'] = 'No se puede cargar la información de suscripción.';
translations.es['subscription.forbidden'] = 'Esta página está reservada a los administradores.';
translations.es['subscription.no_plan.title'] = 'Elige tu plan';
translations.es['subscription.no_plan.subtitle'] = 'Sin suscripción activa. Selecciona un plan para acceder a todas las funciones.';
translations.es['subscription.current_plan'] = 'Plan actual';
translations.es['subscription.trial_end'] = 'Fin del período de prueba';
translations.es['subscription.next_renewal'] = 'Próxima renovación';
translations.es['subscription.access_until'] = 'Acceso hasta';
translations.es['subscription.cancel_warning'] = 'Cancelación programada — tu acceso permanece activo hasta el final del período actual.';
translations.es['subscription.past_due_warning'] = 'Pago fallido — actualiza tu método de pago para evitar la suspensión.';
translations.es['subscription.features_title'] = 'Incluido en tu plan';
translations.es['subscription.billing.title'] = 'Facturación y método de pago';
translations.es['subscription.billing.subtitle'] = 'Gestiona tu tarjeta, consulta tus facturas de Stripe y actualiza tu información.';
translations.es['subscription.billing.portal_btn'] = 'Portal de facturación';
translations.es['subscription.upgrade.title'] = 'Pasar a un plan de pago';
translations.es['subscription.upgrade.subtitle'] = 'Elige un plan para continuar tras el período de prueba. Serás redirigido a Stripe para introducir tus datos de pago.';
translations.es['subscription.choose'] = 'Elegir';
translations.es['subscription.coming_soon'] = 'Próximamente disponible';
translations.es['subscription.change.title'] = 'Cambiar de plan';
translations.es['subscription.change.how_title'] = '¿Cómo funciona?';
translations.es['subscription.change.no_card'] = 'Sin introducción de tarjeta — tu método de pago guardado se usa automáticamente.';
translations.es['subscription.change.immediate'] = 'Cambio inmediato — las nuevas funciones están disponibles desde la confirmación.';
translations.es['subscription.change.proration'] = 'Facturación prorrateada — solo pagas los días restantes del mes actual al nuevo precio.';
translations.es['subscription.change.cancel'] = 'Cancelación en cualquier momento — sin compromiso, mantienes el acceso hasta el final del período actual.';
translations.es['subscription.change.confirm_msg'] = 'Al confirmar, tu tarjeta guardada será cargada por los días restantes de este mes. El cambio es inmediato y sin interrupción del servicio.';
translations.es['subscription.change.confirm_btn'] = 'Confirmar el cambio';
translations.es['subscription.change.in_progress'] = 'En proceso…';
translations.es['subscription.change.switch_to'] = 'Cambiar al plan';
translations.es['subscription.status.active'] = 'Activo';
translations.es['subscription.status.trialing'] = 'Prueba';
translations.es['subscription.status.past_due'] = 'Pago atrasado';
translations.es['subscription.status.canceled'] = 'Cancelado';
translations.es['subscription.status.unpaid'] = 'Impagado';

translations.es['subscription.feature.dashboard'] = 'Tablero y planificación';
translations.es['subscription.feature.children_limit'] = 'Hasta 2 niños';
translations.es['subscription.feature.members_limit'] = 'Hasta 2 niñeras y padres';
translations.es['subscription.feature.daily_reports_limit'] = 'Informes diarios (2 máx)';
translations.es['subscription.feature.feed_photos'] = 'Feed de noticias y fotos';
translations.es['subscription.feature.realtime_notifications'] = 'Notificaciones en tiempo real';
translations.es['subscription.feature.presence_sheets'] = 'Hojas de presencia';
translations.es['subscription.feature.instant_messaging'] = 'Mensajería instantánea';
translations.es['subscription.feature.ai_assistant'] = 'Asistente IA';
translations.es['subscription.feature.children_limit_10'] = 'Hasta 10 niños';
translations.es['subscription.feature.members_limit_10'] = 'Hasta 10 niñeras y padres';
translations.es['subscription.feature.daily_reports_unlimited'] = 'Informes diarios ilimitados';
translations.es['subscription.feature.presence_sheets_digital'] = 'Hojas de presencia digitales';
translations.es['subscription.feature.all_essentiel'] = 'Todo el plan Esencial incluido';
translations.es['subscription.feature.unlimited_people'] = 'Niños, niñeras y padres ilimitados';
translations.es['subscription.feature.billing_history'] = 'Facturación e historial de pagos';
translations.es['subscription.feature.presence_signature'] = 'Hojas de presencia + firma digital';
translations.es['subscription.feature.instant_messaging_realtime'] = 'Mensajería instantánea en tiempo real';
translations.es['subscription.feature.ai_assistant_report'] = 'Asistente IA (redacción, informes)';
translations.es['subscription.feature.priority_support'] = 'Soporte prioritario 7d/7';
translations.es['subscription.feature.continuous_updates'] = 'Actualizaciones continuas';

// plans
translations.es['plan.decouverte'] = 'Descubrimiento';
translations.es['plan.essentiel'] = 'Esencial';
translations.es['plan.pro'] = 'Pro';
translations.es['plan.price.essentiel'] = '29,99 €/mes';
translations.es['plan.price.pro'] = '59,99 €/mes';
translations.es['plan.feature.decouverte.1'] = '2 niños máx.';
translations.es['plan.feature.decouverte.2'] = '2 cuidadoras máx.';
translations.es['plan.feature.decouverte.3'] = '2 padres máx.';
translations.es['plan.feature.decouverte.4'] = 'Período de prueba 7 días';
translations.es['plan.feature.essentiel.1'] = '10 niños máx.';
translations.es['plan.feature.essentiel.2'] = '10 cuidadoras máx.';
translations.es['plan.feature.essentiel.3'] = '10 padres máx.';
translations.es['plan.feature.essentiel.4'] = 'Facturación mensual';
translations.es['plan.feature.essentiel.5'] = 'Exportar PDF';
translations.es['plan.feature.pro.1'] = 'Ilimitado';
translations.es['plan.feature.pro.2'] = 'Asistente IA';
translations.es['plan.feature.pro.3'] = 'Facturación mensual';
translations.es['plan.feature.pro.4'] = 'Exportar PDF';
translations.es['plan.feature.pro.5'] = 'Soporte prioritario';

// ── Tour step translations ──────────────────────────────────────────────────

// FR — onboarding
translations.fr['tour.onboarding.step0.title'] = 'Bienvenue sur Frimousse !';
translations.fr['tour.onboarding.step0.content'] = "Ce tutoriel va vous présenter chaque page de l'application une par une. Vous saurez à quoi sert chaque section en moins de 2 minutes.";
translations.fr['tour.onboarding.step1.title'] = 'Votre structure';
translations.fr['tour.onboarding.step1.content'] = "Le nom de votre structure s'affiche ici en haut du menu. Toutes les pages sont accessibles depuis cette barre latérale.";
translations.fr['tour.onboarding.step2.title'] = 'Tableau de bord';
translations.fr['tour.onboarding.step2.content'] = "Le tableau de bord est votre page d'accueil. Il affiche le calendrier du mois, les affectations prévues et un résumé de l'activité du jour.";
translations.fr['tour.onboarding.step3.title'] = "Fil d'actualité";
translations.fr['tour.onboarding.step3.content'] = "Le fil d'actualité est l'espace de communication entre la nounou et les parents. La nounou y publie ce qui s'est passé dans la journée. Si les parents ont donné leur autorisation, des photos de leur enfant peuvent également être partagées.";
translations.fr['tour.onboarding.step4.title'] = 'Notifications';
translations.fr['tour.onboarding.step4.content'] = "Les notifications vous alertent des nouveaux messages, publications ou événements importants. Le badge indique le nombre de notifications non lues.";
translations.fr['tour.onboarding.step5.title'] = 'Enfants';
translations.fr['tour.onboarding.step5.content'] = "La liste de tous les enfants inscrits dans votre structure. Vous pouvez ajouter un enfant, consulter ses informations, ses allergies, son groupe et le rattacher à ses parents.";
translations.fr['tour.onboarding.step6.title'] = 'Parents';
translations.fr['tour.onboarding.step6.content'] = "La liste des parents et tuteurs légaux. Chaque parent peut se connecter à son espace pour suivre les publications du fil d'actualité concernant son enfant.";
translations.fr['tour.onboarding.step7.title'] = 'Nounous';
translations.fr['tour.onboarding.step7.content'] = "La liste de votre équipe. Gérez les disponibilités, les plannings et les affectations de chaque professionnelle aux enfants dont elle s'occupe.";
translations.fr['tour.onboarding.step8.title'] = 'Activités';
translations.fr['tour.onboarding.step8.content'] = "Planifiez les activités de la semaine pour vos groupes d'enfants : éveil musical, motricité, arts plastiques, sorties... Visible par toute l'équipe.";
translations.fr['tour.onboarding.step9.title'] = 'Rapports';
translations.fr['tour.onboarding.step9.content'] = "La section Rapports permet à la nounou de rédiger un compte-rendu pour les parents : refus de manger, colère, fatigue, chute ou tout autre événement survenu dans la journée.";
translations.fr['tour.onboarding.step10.title'] = 'Assistant IA';
translations.fr['tour.onboarding.step10.content'] = "L'assistant IA vous aide à rédiger des messages, générer des comptes-rendus et gagner du temps au quotidien. Cette section est disponible uniquement avec un abonnement Pro.";
translations.fr['tour.onboarding.step11.title'] = 'Feuilles de présence';
translations.fr['tour.onboarding.step11.content'] = "Les feuilles de présence permettent de suivre les heures d'arrivée et de départ de chaque enfant jour par jour. La nounou remplit les horaires, envoie la feuille au parent concerné, puis chacun la signe numériquement. Les signatures se mettent à jour en temps réel.";
translations.fr['tour.onboarding.step12.title'] = 'Messages';
translations.fr['tour.onboarding.step12.content'] = "La messagerie instantanée permet d'échanger en direct entre l'admin, les nounous et les parents. Indicateur de frappe en temps réel, statut en ligne, modification et suppression des messages.";
translations.fr['tour.onboarding.step13.title'] = 'Paiements';
translations.fr['tour.onboarding.step13.content'] = "L'historique des paiements et des cotisations. Consultez les règlements effectués et suivez la facturation de votre structure.";
translations.fr['tour.onboarding.step14.title'] = 'Mon abonnement';
translations.fr['tour.onboarding.step14.content'] = "Gérez votre abonnement, consultez votre plan actuel et passez en Pro pour débloquer l'assistant IA et toutes les fonctionnalités avancées.";
translations.fr['tour.onboarding.step15.title'] = 'Paramètres';
translations.fr['tour.onboarding.step15.content'] = "Configurez votre profil, votre mot de passe, les notifications et retrouvez tous les tutoriels de l'application.";
translations.fr['tour.onboarding.step16.title'] = "C'est parti !";
translations.fr['tour.onboarding.step16.content'] = "Vous connaissez maintenant toutes les pages de Frimousse. Explorez les autres tutoriels pour apprendre à créer une nounou, un parent et un enfant !";

// FR — add-nanny
translations.fr['tour.add-nanny.step0.title'] = 'Ajouter une nounou';
translations.fr['tour.add-nanny.step0.content'] = "Suivez ce guide pour ajouter une nouvelle professionnelle (assistante maternelle, auxiliaire...) à votre équipe.";
translations.fr['tour.add-nanny.step1.title'] = 'Menu Nounous';
translations.fr['tour.add-nanny.step1.content'] = "Commencez par cliquer sur \"Nounous\" dans le menu pour accéder à la liste de votre équipe.";
translations.fr['tour.add-nanny.step2.title'] = 'Bouton Ajouter';
translations.fr['tour.add-nanny.step2.content'] = "Cliquez sur ce bouton pour ouvrir le formulaire d'ajout d'une nouvelle nounou.";
translations.fr['tour.add-nanny.step3.title'] = 'Remplir le formulaire';
translations.fr['tour.add-nanny.step3.content'] = "Renseignez le nom, l'email, le mot de passe et les informations de contact. L'email et le mot de passe permettront à la nounou de se connecter à son espace.";
translations.fr['tour.add-nanny.step4.title'] = 'Disponibilités & spécialisations';
translations.fr['tour.add-nanny.step4.content'] = "Indiquez la disponibilité (disponible ou en congé), les années d'expérience et les spécialisations éventuelles.";
translations.fr['tour.add-nanny.step5.title'] = 'Nounou créée !';
translations.fr['tour.add-nanny.step5.content'] = "Une fois validé, la nounou apparaît dans la liste et peut se connecter avec ses identifiants. Vous pourrez ensuite lui affecter des enfants dans le planning.";

// FR — add-parent
translations.fr['tour.add-parent.step0.title'] = 'Ajouter un parent';
translations.fr['tour.add-parent.step0.content'] = "Ce tutoriel vous montre comment créer un compte parent. Le parent pourra ensuite se connecter pour suivre son enfant.";
translations.fr['tour.add-parent.step1.title'] = 'Menu Parents';
translations.fr['tour.add-parent.step1.content'] = "Cliquez sur \"Parents\" dans le menu latéral pour accéder à la gestion des parents.";
translations.fr['tour.add-parent.step2.title'] = 'Bouton Ajouter';
translations.fr['tour.add-parent.step2.content'] = "Cliquez ici pour ouvrir le formulaire de création d'un nouveau parent.";
translations.fr['tour.add-parent.step3.title'] = 'Informations du parent';
translations.fr['tour.add-parent.step3.content'] = "Renseignez le prénom, le nom, l'email et le numéro de téléphone. L'email servira d'identifiant de connexion.";
translations.fr['tour.add-parent.step4.title'] = 'Adresse & mot de passe';
translations.fr['tour.add-parent.step4.content'] = "Ajoutez l'adresse du parent et définissez un mot de passe temporaire. Le parent pourra le modifier dans ses paramètres.";
translations.fr['tour.add-parent.step5.title'] = 'Parent créé !';
translations.fr['tour.add-parent.step5.content'] = "Le parent est maintenant inscrit ! Vous pourrez ensuite lui rattacher un ou plusieurs enfants lors de la création d'un enfant.";

// FR — add-child
translations.fr['tour.add-child.step0.title'] = 'Inscrire un enfant';
translations.fr['tour.add-child.step0.content'] = "Ce guide vous explique comment ajouter un enfant dans Frimousse et le rattacher à ses parents et sa nounou.";
translations.fr['tour.add-child.step1.title'] = 'Menu Enfants';
translations.fr['tour.add-child.step1.content'] = "Rendez-vous dans la section \"Enfants\" depuis le menu.";
translations.fr['tour.add-child.step2.title'] = 'Bouton Ajouter';
translations.fr['tour.add-child.step2.content'] = "Cliquez sur le bouton d'ajout pour ouvrir le formulaire d'inscription.";
translations.fr['tour.add-child.step3.title'] = "Informations de l'enfant";
translations.fr['tour.add-child.step3.content'] = "Renseignez le nom, la date de naissance, le sexe et le groupe (bébés, moyens, grands...). Le groupe permet d'organiser les enfants par âge.";
translations.fr['tour.add-child.step4.title'] = 'Rattacher un parent';
translations.fr['tour.add-child.step4.content'] = "Sélectionnez le parent dans la liste déroulante. Si le parent n'est pas encore créé, faites-le d'abord via le tutoriel \"Créer un parent\".";
translations.fr['tour.add-child.step5.title'] = 'Informations médicales';
translations.fr['tour.add-child.step5.content'] = "Ajoutez les allergies éventuelles et les informations de santé importantes. Ces informations seront visibles par les nounous.";
translations.fr['tour.add-child.step6.title'] = 'Enfant inscrit !';
translations.fr['tour.add-child.step6.content'] = "L'enfant apparaît maintenant dans la liste. Vous pouvez lui affecter une nounou via le planning et ses parents peuvent suivre son activité.";

// FR — planning
translations.fr['tour.planning.step0.title'] = 'Le planning';
translations.fr['tour.planning.step0.content'] = "Le planning vous permet de visualiser les affectations nounou-enfant et de gérer les pointages quotidiens.";
translations.fr['tour.planning.step1.title'] = 'Tableau de bord';
translations.fr['tour.planning.step1.content'] = "Le tableau de bord affiche le calendrier du mois avec les affectations prévues pour chaque jour.";
translations.fr['tour.planning.step2.title'] = 'Créer une affectation';
translations.fr['tour.planning.step2.content'] = "Cliquez sur un jour du calendrier pour créer une affectation : choisissez l'enfant et la nounou, puis validez.";
translations.fr['tour.planning.step3.title'] = 'Activités';
translations.fr['tour.planning.step3.content'] = "Dans la section Activités, planifiez les activités de la semaine : éveil musical, motricité, arts plastiques...";

// FR — presence-sheets
translations.fr['tour.presence-sheets.step0.title'] = 'Feuilles de présence';
translations.fr['tour.presence-sheets.step0.content'] = "Les feuilles de présence remplacent le carnet papier. Elles permettent à la nounou de saisir les heures d'arrivée et de départ de chaque enfant, puis d'obtenir la signature numérique des parents jour par jour.";
translations.fr['tour.presence-sheets.step1.title'] = 'Accéder aux feuilles';
translations.fr['tour.presence-sheets.step1.content'] = "Cliquez sur \"Feuilles de présence\" dans le menu pour accéder à la section.";
translations.fr['tour.presence-sheets.step2.title'] = 'Créer une feuille';
translations.fr['tour.presence-sheets.step2.content'] = "Cliquez sur \"Nouvelle feuille\", sélectionnez l'enfant concerné, le mois et l'année. Les horaires d'arrivée et de départ par défaut sont pré-remplis pour vous faire gagner du temps.";
translations.fr['tour.presence-sheets.step3.title'] = 'Saisir les horaires';
translations.fr['tour.presence-sheets.step3.content'] = "Pour chaque jour travaillé, modifiez l'heure d'arrivée et de départ si nécessaire. Cochez \"Absent\" si l'enfant n'était pas présent. Les week-ends et jours fériés sont automatiquement désactivés.";
translations.fr['tour.presence-sheets.step4.title'] = 'Envoyer au parent';
translations.fr['tour.presence-sheets.step4.content'] = "Une fois les horaires saisis, cliquez sur \"Envoyer aux parents\". Le parent reçoit une notification et peut accéder à la feuille depuis son espace.";
translations.fr['tour.presence-sheets.step5.title'] = 'Signature numérique';
translations.fr['tour.presence-sheets.step5.content'] = "Chaque jour peut être signé indépendamment. La nounou signe de son côté, le parent signe du sien. Les signatures apparaissent en temps réel grâce à la synchronisation instantanée.";
translations.fr['tour.presence-sheets.step6.title'] = 'Sécurité des signatures';
translations.fr['tour.presence-sheets.step6.content'] = "Une fois qu'un jour est signé, les horaires ne peuvent plus être modifiés par la nounou ou le parent. Seul un administrateur peut corriger une entrée déjà signée.";
translations.fr['tour.presence-sheets.step7.title'] = 'Export PDF';
translations.fr['tour.presence-sheets.step7.content'] = "À tout moment vous pouvez exporter la feuille en PDF pour l'archiver ou l'imprimer. Elle récapitule toutes les présences du mois ainsi que les signatures.";

// FR — messaging
translations.fr['tour.messaging.step0.title'] = 'Messagerie instantanée';
translations.fr['tour.messaging.step0.content'] = "La messagerie vous permet d'échanger en temps réel avec toutes les personnes de votre centre : nounous et parents. Les messages sont délivrés instantanément grâce aux WebSockets.";
translations.fr['tour.messaging.step1.title'] = 'Accéder aux messages';
translations.fr['tour.messaging.step1.content'] = "Cliquez sur \"Messages\" dans le menu pour ouvrir la messagerie.";
translations.fr['tour.messaging.step2.title'] = 'Liste des conversations';
translations.fr['tour.messaging.step2.content'] = "La page affiche la liste de vos conversations existantes. Chaque ligne montre le nom de votre interlocuteur, un aperçu du dernier message et un badge rouge si vous avez des messages non lus.";
translations.fr['tour.messaging.step3.title'] = 'Statut en ligne';
translations.fr['tour.messaging.step3.content'] = "Un point vert à côté de l'avatar indique que la personne est connectée en ce moment. Un point gris signifie qu'elle est hors ligne.";
translations.fr['tour.messaging.step4.title'] = 'Nouvelle conversation';
translations.fr['tour.messaging.step4.content'] = "Cliquez sur le crayon en haut à droite pour démarrer une nouvelle conversation. Seules les personnes autorisées apparaissent : l'admin voit tout le centre, un parent voit l'admin et la nounou de son enfant, une nounou voit l'admin et les parents de ses enfants.";
translations.fr['tour.messaging.step5.title'] = 'Envoyer un message';
translations.fr['tour.messaging.step5.content'] = "Tapez votre message dans la zone de saisie et appuyez sur Entrée pour envoyer. Utilisez Maj+Entrée pour un saut de ligne. Le destinataire reçoit une notification push même s'il n'a pas l'application ouverte.";
translations.fr['tour.messaging.step6.title'] = 'Indicateur de frappe';
translations.fr['tour.messaging.step6.content'] = "Lorsque votre interlocuteur est en train d'écrire, trois points animés apparaissent dans la conversation. C'est la même expérience que les grandes messageries modernes.";
translations.fr['tour.messaging.step7.title'] = 'Modifier ou supprimer un message';
translations.fr['tour.messaging.step7.content'] = "Restez appuyé sur une de vos bulles pour faire apparaître un menu contextuel. Vous pouvez modifier le texte ou supprimer le message. La modification est visible en temps réel par votre interlocuteur.";
translations.fr['tour.messaging.step8.title'] = 'Supprimer une conversation';
translations.fr['tour.messaging.step8.content'] = "Sur mobile, faites glisser une conversation vers la gauche pour révéler le bouton de suppression rouge. La conversation est retirée de votre liste instantanément.";

// FR — feed-reports
translations.fr['tour.feed-reports.step0.title'] = "Le fil d'actualité";
translations.fr['tour.feed-reports.step0.content'] = "Le fil d'actualité est l'outil de communication quotidienne entre la nounou et les parents. La nounou y signale tout ce qui s'est passé dans la journée avec l'enfant.";
translations.fr['tour.feed-reports.step1.title'] = 'Accéder au fil';
translations.fr['tour.feed-reports.step1.content'] = "Cliquez sur \"Fil d'actualité\" dans le menu pour accéder aux publications.";
translations.fr['tour.feed-reports.step2.title'] = 'Partager des moments';
translations.fr['tour.feed-reports.step2.content'] = "La nounou peut publier des photos des activités de la journée, partager des informations importantes concernant la crèche ou la MAM : sorties, événements, fermetures exceptionnelles...";
translations.fr['tour.feed-reports.step3.title'] = 'Réactions & réponses';
translations.fr['tour.feed-reports.step3.content'] = "Les parents peuvent liker la publication et voir qui d'autre a réagi. Cela crée un lien de confiance et de transparence entre la structure et les familles.";
translations.fr['tour.feed-reports.step4.title'] = 'Bonne pratique';
translations.fr['tour.feed-reports.step4.content'] = "Publiez au moins un message par enfant en fin de journée. Les parents apprécient savoir comment s'est passée la journée même quand tout va bien.";

// EN — onboarding
translations.en['tour.onboarding.step0.title'] = 'Welcome to Frimousse!';
translations.en['tour.onboarding.step0.content'] = 'This tutorial will walk you through each page of the app one by one. You will know what every section does in under 2 minutes.';
translations.en['tour.onboarding.step1.title'] = 'Your organisation';
translations.en['tour.onboarding.step1.content'] = 'Your organisation name is displayed here at the top of the menu. Every page is accessible from this sidebar.';
translations.en['tour.onboarding.step2.title'] = 'Dashboard';
translations.en['tour.onboarding.step2.content'] = "The dashboard is your home page. It shows the monthly calendar, planned assignments, and a summary of today's activity.";
translations.en['tour.onboarding.step3.title'] = 'Activity feed';
translations.en['tour.onboarding.step3.content'] = "The activity feed is the communication space between the nanny and the parents. The nanny posts what happened during the day. With parental consent, photos of the child can also be shared.";
translations.en['tour.onboarding.step4.title'] = 'Notifications';
translations.en['tour.onboarding.step4.content'] = 'Notifications alert you to new messages, posts, or important events. The badge shows the number of unread notifications.';
translations.en['tour.onboarding.step5.title'] = 'Children';
translations.en['tour.onboarding.step5.content'] = 'The list of all children enrolled in your organisation. You can add a child, view their info, allergies, group, and link them to their parents.';
translations.en['tour.onboarding.step6.title'] = 'Parents';
translations.en['tour.onboarding.step6.content'] = "The list of parents and legal guardians. Each parent can log in to their space to follow the activity feed posts about their child.";
translations.en['tour.onboarding.step7.title'] = 'Nannies';
translations.en['tour.onboarding.step7.content'] = "Your team list. Manage availability, schedules, and assignments for each professional to the children in their care.";
translations.en['tour.onboarding.step8.title'] = 'Activities';
translations.en['tour.onboarding.step8.content'] = "Plan weekly activities for your groups of children: music, motor skills, arts and crafts, outings... Visible to the whole team.";
translations.en['tour.onboarding.step9.title'] = 'Reports';
translations.en['tour.onboarding.step9.content'] = "The Reports section lets the nanny write a daily summary for the parents: food refusal, tantrums, fatigue, a fall, or any other event that occurred during the day.";
translations.en['tour.onboarding.step10.title'] = 'AI Assistant';
translations.en['tour.onboarding.step10.content'] = "The AI assistant helps you draft messages, generate summaries, and save time every day. This section is only available with a Pro subscription.";
translations.en['tour.onboarding.step11.title'] = 'Attendance sheets';
translations.en['tour.onboarding.step11.content'] = "Attendance sheets let you track each child's arrival and departure times day by day. The nanny fills in the times, sends the sheet to the parent, and both sign it digitally. Signatures update in real time.";
translations.en['tour.onboarding.step12.title'] = 'Messages';
translations.en['tour.onboarding.step12.content'] = "Instant messaging lets admins, nannies, and parents communicate in real time. Live typing indicator, online status, message editing and deletion.";
translations.en['tour.onboarding.step13.title'] = 'Payments';
translations.en['tour.onboarding.step13.content'] = "Payment history and contributions. Review completed transactions and track billing for your organisation.";
translations.en['tour.onboarding.step14.title'] = 'My subscription';
translations.en['tour.onboarding.step14.content'] = "Manage your subscription, view your current plan, and upgrade to Pro to unlock the AI assistant and all advanced features.";
translations.en['tour.onboarding.step15.title'] = 'Settings';
translations.en['tour.onboarding.step15.content'] = "Configure your profile, password, notifications, and find all application tutorials here.";
translations.en['tour.onboarding.step16.title'] = "Let's go!";
translations.en['tour.onboarding.step16.content'] = "You now know every page of Frimousse. Explore the other tutorials to learn how to create a nanny, a parent, and a child!";

// EN — add-nanny
translations.en['tour.add-nanny.step0.title'] = 'Add a nanny';
translations.en['tour.add-nanny.step0.content'] = 'Follow this guide to add a new professional (childminder, assistant...) to your team.';
translations.en['tour.add-nanny.step1.title'] = 'Nannies menu';
translations.en['tour.add-nanny.step1.content'] = 'Start by clicking "Nannies" in the menu to access your team list.';
translations.en['tour.add-nanny.step2.title'] = 'Add button';
translations.en['tour.add-nanny.step2.content'] = 'Click this button to open the form for adding a new nanny.';
translations.en['tour.add-nanny.step3.title'] = 'Fill in the form';
translations.en['tour.add-nanny.step3.content'] = 'Enter the name, email, password, and contact details. The email and password will let the nanny log in to their space.';
translations.en['tour.add-nanny.step4.title'] = 'Availability & specialisations';
translations.en['tour.add-nanny.step4.content'] = 'Set availability (available or on leave), years of experience, and any specialisations.';
translations.en['tour.add-nanny.step5.title'] = 'Nanny created!';
translations.en['tour.add-nanny.step5.content'] = 'Once confirmed, the nanny appears in the list and can log in with their credentials. You can then assign children to them in the schedule.';

// EN — add-parent
translations.en['tour.add-parent.step0.title'] = 'Add a parent';
translations.en['tour.add-parent.step0.content'] = 'This tutorial shows you how to create a parent account. The parent can then log in to follow their child.';
translations.en['tour.add-parent.step1.title'] = 'Parents menu';
translations.en['tour.add-parent.step1.content'] = 'Click "Parents" in the sidebar menu to access parent management.';
translations.en['tour.add-parent.step2.title'] = 'Add button';
translations.en['tour.add-parent.step2.content'] = 'Click here to open the form for creating a new parent.';
translations.en['tour.add-parent.step3.title'] = 'Parent information';
translations.en['tour.add-parent.step3.content'] = 'Enter the first name, last name, email, and phone number. The email will serve as the login identifier.';
translations.en['tour.add-parent.step4.title'] = 'Address & password';
translations.en['tour.add-parent.step4.content'] = "Add the parent's address and set a temporary password. The parent can change it in their settings.";
translations.en['tour.add-parent.step5.title'] = 'Parent created!';
translations.en['tour.add-parent.step5.content'] = 'The parent is now registered! You can then link one or more children to them when creating a child.';

// EN — add-child
translations.en['tour.add-child.step0.title'] = 'Enrol a child';
translations.en['tour.add-child.step0.content'] = 'This guide explains how to add a child to Frimousse and link them to their parents and nanny.';
translations.en['tour.add-child.step1.title'] = 'Children menu';
translations.en['tour.add-child.step1.content'] = 'Go to the "Children" section from the menu.';
translations.en['tour.add-child.step2.title'] = 'Add button';
translations.en['tour.add-child.step2.content'] = 'Click the add button to open the enrolment form.';
translations.en['tour.add-child.step3.title'] = "Child's information";
translations.en['tour.add-child.step3.content'] = 'Enter the name, date of birth, gender, and group (babies, toddlers, older...). The group helps organise children by age.';
translations.en['tour.add-child.step4.title'] = 'Link a parent';
translations.en['tour.add-child.step4.content'] = 'Select the parent from the dropdown. If the parent has not been created yet, do so first via the "Add a parent" tutorial.';
translations.en['tour.add-child.step5.title'] = 'Medical information';
translations.en['tour.add-child.step5.content'] = 'Add any allergies and important health information. This information will be visible to the nannies.';
translations.en['tour.add-child.step6.title'] = 'Child enrolled!';
translations.en['tour.add-child.step6.content'] = 'The child now appears in the list. You can assign a nanny to them via the schedule and their parents can follow their activity.';

// EN — planning
translations.en['tour.planning.step0.title'] = 'The schedule';
translations.en['tour.planning.step0.content'] = 'The schedule lets you view nanny-child assignments and manage daily attendance tracking.';
translations.en['tour.planning.step1.title'] = 'Dashboard';
translations.en['tour.planning.step1.content'] = 'The dashboard shows the monthly calendar with planned assignments for each day.';
translations.en['tour.planning.step2.title'] = 'Create an assignment';
translations.en['tour.planning.step2.content'] = 'Click on a day in the calendar to create an assignment: choose the child and the nanny, then confirm.';
translations.en['tour.planning.step3.title'] = 'Activities';
translations.en['tour.planning.step3.content'] = 'In the Activities section, plan weekly activities: music, motor skills, arts and crafts...';

// EN — presence-sheets
translations.en['tour.presence-sheets.step0.title'] = 'Attendance sheets';
translations.en['tour.presence-sheets.step0.content'] = "Attendance sheets replace the paper register. They let the nanny enter each child's arrival and departure times, then collect the parents' digital signature day by day.";
translations.en['tour.presence-sheets.step1.title'] = 'Access sheets';
translations.en['tour.presence-sheets.step1.content'] = 'Click "Attendance sheets" in the menu to access this section.';
translations.en['tour.presence-sheets.step2.title'] = 'Create a sheet';
translations.en['tour.presence-sheets.step2.content'] = 'Click "New sheet", select the child, month, and year. Default arrival and departure times are pre-filled to save you time.';
translations.en['tour.presence-sheets.step3.title'] = 'Enter times';
translations.en['tour.presence-sheets.step3.content'] = 'For each working day, adjust the arrival and departure times if needed. Check "Absent" if the child was not present. Weekends and public holidays are automatically disabled.';
translations.en['tour.presence-sheets.step4.title'] = 'Send to parent';
translations.en['tour.presence-sheets.step4.content'] = 'Once times are entered, click "Send to parents". The parent receives a notification and can access the sheet from their space.';
translations.en['tour.presence-sheets.step5.title'] = 'Digital signature';
translations.en['tour.presence-sheets.step5.content'] = 'Each day can be signed independently. The nanny signs on their side, the parent signs on theirs. Signatures appear in real time thanks to instant synchronisation.';
translations.en['tour.presence-sheets.step6.title'] = 'Signature security';
translations.en['tour.presence-sheets.step6.content'] = 'Once a day has been signed, the times can no longer be modified by the nanny or parent. Only an administrator can correct an already-signed entry.';
translations.en['tour.presence-sheets.step7.title'] = 'PDF export';
translations.en['tour.presence-sheets.step7.content'] = 'You can export the sheet to PDF at any time to archive or print it. It includes all monthly attendance records and signatures.';

// EN — messaging
translations.en['tour.messaging.step0.title'] = 'Instant messaging';
translations.en['tour.messaging.step0.content'] = 'Messaging lets you communicate in real time with everyone in your centre: nannies and parents. Messages are delivered instantly via WebSockets.';
translations.en['tour.messaging.step1.title'] = 'Access messages';
translations.en['tour.messaging.step1.content'] = 'Click "Messages" in the menu to open messaging.';
translations.en['tour.messaging.step2.title'] = 'Conversation list';
translations.en['tour.messaging.step2.content'] = 'The page shows your existing conversations. Each row displays your contact\'s name, a preview of the last message, and a red badge if you have unread messages.';
translations.en['tour.messaging.step3.title'] = 'Online status';
translations.en['tour.messaging.step3.content'] = 'A green dot next to the avatar means the person is currently connected. A grey dot means they are offline.';
translations.en['tour.messaging.step4.title'] = 'New conversation';
translations.en['tour.messaging.step4.content'] = "Click the pencil icon in the top right to start a new conversation. Only authorised people appear: the admin sees the whole centre, a parent sees the admin and their child's nanny, a nanny sees the admin and the parents of their children.";
translations.en['tour.messaging.step5.title'] = 'Send a message';
translations.en['tour.messaging.step5.content'] = 'Type your message in the input area and press Enter to send. Use Shift+Enter for a new line. The recipient receives a push notification even if they do not have the app open.';
translations.en['tour.messaging.step6.title'] = 'Typing indicator';
translations.en['tour.messaging.step6.content'] = 'When your contact is typing, three animated dots appear in the conversation. The same experience as modern messaging apps.';
translations.en['tour.messaging.step7.title'] = 'Edit or delete a message';
translations.en['tour.messaging.step7.content'] = 'Long-press one of your bubbles to reveal a context menu. You can edit the text or delete the message. Edits are visible in real time to your contact.';
translations.en['tour.messaging.step8.title'] = 'Delete a conversation';
translations.en['tour.messaging.step8.content'] = 'On mobile, swipe a conversation to the left to reveal the red delete button. The conversation is removed from your list instantly.';

// EN — feed-reports
translations.en['tour.feed-reports.step0.title'] = 'Activity feed';
translations.en['tour.feed-reports.step0.content'] = "The activity feed is the daily communication tool between the nanny and the parents. The nanny reports everything that happened during the day with the child.";
translations.en['tour.feed-reports.step1.title'] = 'Access the feed';
translations.en['tour.feed-reports.step1.content'] = 'Click "Activity feed" in the menu to access posts.';
translations.en['tour.feed-reports.step2.title'] = 'Share moments';
translations.en['tour.feed-reports.step2.content'] = "The nanny can post photos of the day's activities and share important information about the nursery or childminding setting: outings, events, unexpected closures...";
translations.en['tour.feed-reports.step3.title'] = 'Reactions & responses';
translations.en['tour.feed-reports.step3.content'] = 'Parents can like posts and see who else has reacted. This builds trust and transparency between the organisation and families.';
translations.en['tour.feed-reports.step4.title'] = 'Best practice';
translations.en['tour.feed-reports.step4.content'] = "Post at least one message per child at the end of the day. Parents appreciate knowing how the day went, even when everything is fine.";

// ES — onboarding
translations.es['tour.onboarding.step0.title'] = '¡Bienvenido a Frimousse!';
translations.es['tour.onboarding.step0.content'] = 'Este tutorial te presentará cada página de la aplicación una por una. Sabrás para qué sirve cada sección en menos de 2 minutos.';
translations.es['tour.onboarding.step1.title'] = 'Tu organización';
translations.es['tour.onboarding.step1.content'] = 'El nombre de tu organización aparece aquí en la parte superior del menú. Todas las páginas son accesibles desde esta barra lateral.';
translations.es['tour.onboarding.step2.title'] = 'Panel de control';
translations.es['tour.onboarding.step2.content'] = 'El panel de control es tu página de inicio. Muestra el calendario mensual, las asignaciones previstas y un resumen de la actividad del día.';
translations.es['tour.onboarding.step3.title'] = 'Novedades';
translations.es['tour.onboarding.step3.content'] = 'Las novedades son el espacio de comunicación entre la cuidadora y los padres. La cuidadora publica lo que ocurrió durante el día. Con el permiso de los padres, también se pueden compartir fotos de su hijo.';
translations.es['tour.onboarding.step4.title'] = 'Notificaciones';
translations.es['tour.onboarding.step4.content'] = 'Las notificaciones te alertan de nuevos mensajes, publicaciones o eventos importantes. El distintivo muestra el número de notificaciones no leídas.';
translations.es['tour.onboarding.step5.title'] = 'Niños';
translations.es['tour.onboarding.step5.content'] = 'La lista de todos los niños inscritos en tu organización. Puedes añadir un niño, consultar su información, alergias, grupo y vincularlo a sus padres.';
translations.es['tour.onboarding.step6.title'] = 'Padres';
translations.es['tour.onboarding.step6.content'] = 'La lista de padres y tutores legales. Cada padre puede conectarse a su espacio para seguir las publicaciones del feed relacionadas con su hijo.';
translations.es['tour.onboarding.step7.title'] = 'Cuidadoras';
translations.es['tour.onboarding.step7.content'] = 'Tu lista de equipo. Gestiona la disponibilidad, los horarios y las asignaciones de cada profesional a los niños a su cargo.';
translations.es['tour.onboarding.step8.title'] = 'Actividades';
translations.es['tour.onboarding.step8.content'] = 'Planifica las actividades semanales para tus grupos de niños: música, motricidad, manualidades, salidas... Visible para todo el equipo.';
translations.es['tour.onboarding.step9.title'] = 'Informes';
translations.es['tour.onboarding.step9.content'] = 'La sección de Informes permite a la cuidadora redactar un resumen diario para los padres: rechazo de comida, rabietas, cansancio, caída u otro evento ocurrido durante el día.';
translations.es['tour.onboarding.step10.title'] = 'Asistente IA';
translations.es['tour.onboarding.step10.content'] = 'El asistente IA te ayuda a redactar mensajes, generar resúmenes y ahorrar tiempo cada día. Esta sección solo está disponible con una suscripción Pro.';
translations.es['tour.onboarding.step11.title'] = 'Hojas de asistencia';
translations.es['tour.onboarding.step11.content'] = 'Las hojas de asistencia permiten registrar las horas de llegada y salida de cada niño día a día. La cuidadora rellena los horarios, envía la hoja al padre y ambos la firman digitalmente. Las firmas se actualizan en tiempo real.';
translations.es['tour.onboarding.step12.title'] = 'Mensajes';
translations.es['tour.onboarding.step12.content'] = 'La mensajería instantánea permite la comunicación en tiempo real entre administradores, cuidadoras y padres. Indicador de escritura en tiempo real, estado en línea, edición y eliminación de mensajes.';
translations.es['tour.onboarding.step13.title'] = 'Pagos';
translations.es['tour.onboarding.step13.content'] = 'Historial de pagos y aportaciones. Consulta los pagos realizados y realiza el seguimiento de la facturación de tu organización.';
translations.es['tour.onboarding.step14.title'] = 'Mi suscripción';
translations.es['tour.onboarding.step14.content'] = 'Gestiona tu suscripción, consulta tu plan actual y actualiza a Pro para desbloquear el asistente IA y todas las funciones avanzadas.';
translations.es['tour.onboarding.step15.title'] = 'Configuración';
translations.es['tour.onboarding.step15.content'] = 'Configura tu perfil, contraseña, notificaciones y encuentra todos los tutoriales de la aplicación aquí.';
translations.es['tour.onboarding.step16.title'] = '¡Vamos allá!';
translations.es['tour.onboarding.step16.content'] = '¡Ahora conoces todas las páginas de Frimousse! Explora los demás tutoriales para aprender a crear una cuidadora, un padre y un niño.';

// ES — add-nanny
translations.es['tour.add-nanny.step0.title'] = 'Añadir una cuidadora';
translations.es['tour.add-nanny.step0.content'] = 'Sigue esta guía para añadir una nueva profesional (niñera, auxiliar...) a tu equipo.';
translations.es['tour.add-nanny.step1.title'] = 'Menú Cuidadoras';
translations.es['tour.add-nanny.step1.content'] = 'Empieza haciendo clic en "Cuidadoras" en el menú para acceder a la lista de tu equipo.';
translations.es['tour.add-nanny.step2.title'] = 'Botón Añadir';
translations.es['tour.add-nanny.step2.content'] = 'Haz clic en este botón para abrir el formulario de alta de una nueva cuidadora.';
translations.es['tour.add-nanny.step3.title'] = 'Rellenar el formulario';
translations.es['tour.add-nanny.step3.content'] = 'Introduce el nombre, el correo, la contraseña y los datos de contacto. El correo y la contraseña le permitirán a la cuidadora acceder a su espacio.';
translations.es['tour.add-nanny.step4.title'] = 'Disponibilidad y especializaciones';
translations.es['tour.add-nanny.step4.content'] = 'Indica la disponibilidad (disponible o de baja), los años de experiencia y las posibles especializaciones.';
translations.es['tour.add-nanny.step5.title'] = '¡Cuidadora creada!';
translations.es['tour.add-nanny.step5.content'] = 'Una vez confirmada, la cuidadora aparece en la lista y puede iniciar sesión con sus credenciales. Después podrás asignarle niños en el horario.';

// ES — add-parent
translations.es['tour.add-parent.step0.title'] = 'Añadir un padre';
translations.es['tour.add-parent.step0.content'] = 'Este tutorial te muestra cómo crear una cuenta de padre. El padre podrá conectarse para seguir a su hijo.';
translations.es['tour.add-parent.step1.title'] = 'Menú Padres';
translations.es['tour.add-parent.step1.content'] = 'Haz clic en "Padres" en el menú lateral para acceder a la gestión de padres.';
translations.es['tour.add-parent.step2.title'] = 'Botón Añadir';
translations.es['tour.add-parent.step2.content'] = 'Haz clic aquí para abrir el formulario de creación de un nuevo padre.';
translations.es['tour.add-parent.step3.title'] = 'Información del padre';
translations.es['tour.add-parent.step3.content'] = 'Introduce el nombre, apellido, correo electrónico y número de teléfono. El correo servirá como identificador de acceso.';
translations.es['tour.add-parent.step4.title'] = 'Dirección y contraseña';
translations.es['tour.add-parent.step4.content'] = 'Añade la dirección del padre y establece una contraseña temporal. El padre podrá cambiarla en su configuración.';
translations.es['tour.add-parent.step5.title'] = '¡Padre creado!';
translations.es['tour.add-parent.step5.content'] = '¡El padre ya está registrado! Podrás vincularle uno o varios hijos al crear un niño.';

// ES — add-child
translations.es['tour.add-child.step0.title'] = 'Inscribir un niño';
translations.es['tour.add-child.step0.content'] = 'Esta guía explica cómo añadir un niño en Frimousse y vincularlo a sus padres y cuidadora.';
translations.es['tour.add-child.step1.title'] = 'Menú Niños';
translations.es['tour.add-child.step1.content'] = 'Ve a la sección "Niños" desde el menú.';
translations.es['tour.add-child.step2.title'] = 'Botón Añadir';
translations.es['tour.add-child.step2.content'] = 'Haz clic en el botón de añadir para abrir el formulario de inscripción.';
translations.es['tour.add-child.step3.title'] = 'Información del niño';
translations.es['tour.add-child.step3.content'] = 'Introduce el nombre, fecha de nacimiento, sexo y grupo (bebés, medianos, mayores...). El grupo ayuda a organizar los niños por edad.';
translations.es['tour.add-child.step4.title'] = 'Vincular un padre';
translations.es['tour.add-child.step4.content'] = 'Selecciona el padre en el desplegable. Si el padre aún no ha sido creado, hazlo primero mediante el tutorial "Añadir un padre".';
translations.es['tour.add-child.step5.title'] = 'Información médica';
translations.es['tour.add-child.step5.content'] = 'Añade las alergias y la información de salud importante. Esta información será visible para las cuidadoras.';
translations.es['tour.add-child.step6.title'] = '¡Niño inscrito!';
translations.es['tour.add-child.step6.content'] = 'El niño aparece ahora en la lista. Puedes asignarle una cuidadora mediante el horario y sus padres pueden seguir su actividad.';

// ES — planning
translations.es['tour.planning.step0.title'] = 'El horario';
translations.es['tour.planning.step0.content'] = 'El horario te permite visualizar las asignaciones cuidadora-niño y gestionar el control de asistencia diario.';
translations.es['tour.planning.step1.title'] = 'Panel de control';
translations.es['tour.planning.step1.content'] = 'El panel de control muestra el calendario mensual con las asignaciones previstas para cada día.';
translations.es['tour.planning.step2.title'] = 'Crear una asignación';
translations.es['tour.planning.step2.content'] = 'Haz clic en un día del calendario para crear una asignación: elige el niño y la cuidadora, luego confirma.';
translations.es['tour.planning.step3.title'] = 'Actividades';
translations.es['tour.planning.step3.content'] = 'En la sección Actividades, planifica las actividades de la semana: música, motricidad, manualidades...';

// ES — presence-sheets
translations.es['tour.presence-sheets.step0.title'] = 'Hojas de asistencia';
translations.es['tour.presence-sheets.step0.content'] = 'Las hojas de asistencia sustituyen al registro en papel. Permiten a la cuidadora registrar las horas de llegada y salida de cada niño y obtener la firma digital de los padres día a día.';
translations.es['tour.presence-sheets.step1.title'] = 'Acceder a las hojas';
translations.es['tour.presence-sheets.step1.content'] = 'Haz clic en "Hojas de asistencia" en el menú para acceder a esta sección.';
translations.es['tour.presence-sheets.step2.title'] = 'Crear una hoja';
translations.es['tour.presence-sheets.step2.content'] = 'Haz clic en "Nueva hoja", selecciona el niño, el mes y el año. Los horarios de llegada y salida predeterminados están prerellenos para ahorrarte tiempo.';
translations.es['tour.presence-sheets.step3.title'] = 'Introducir horarios';
translations.es['tour.presence-sheets.step3.content'] = 'Para cada día laborable, ajusta la hora de llegada y salida si es necesario. Marca "Ausente" si el niño no estuvo presente. Los fines de semana y festivos se desactivan automáticamente.';
translations.es['tour.presence-sheets.step4.title'] = 'Enviar al padre';
translations.es['tour.presence-sheets.step4.content'] = 'Una vez introducidos los horarios, haz clic en "Enviar a los padres". El padre recibe una notificación y puede acceder a la hoja desde su espacio.';
translations.es['tour.presence-sheets.step5.title'] = 'Firma digital';
translations.es['tour.presence-sheets.step5.content'] = 'Cada día puede firmarse de forma independiente. La cuidadora firma por su parte, el padre por la suya. Las firmas aparecen en tiempo real gracias a la sincronización instantánea.';
translations.es['tour.presence-sheets.step6.title'] = 'Seguridad de las firmas';
translations.es['tour.presence-sheets.step6.content'] = 'Una vez firmado un día, los horarios ya no pueden modificarse ni por la cuidadora ni por el padre. Solo un administrador puede corregir una entrada ya firmada.';
translations.es['tour.presence-sheets.step7.title'] = 'Exportar PDF';
translations.es['tour.presence-sheets.step7.content'] = 'Puedes exportar la hoja a PDF en cualquier momento para archivarla o imprimirla. Incluye todos los registros de asistencia del mes y las firmas.';

// ES — messaging
translations.es['tour.messaging.step0.title'] = 'Mensajería instantánea';
translations.es['tour.messaging.step0.content'] = 'La mensajería te permite comunicarte en tiempo real con todas las personas de tu centro: cuidadoras y padres. Los mensajes se entregan al instante gracias a WebSockets.';
translations.es['tour.messaging.step1.title'] = 'Acceder a los mensajes';
translations.es['tour.messaging.step1.content'] = 'Haz clic en "Mensajes" en el menú para abrir la mensajería.';
translations.es['tour.messaging.step2.title'] = 'Lista de conversaciones';
translations.es['tour.messaging.step2.content'] = 'La página muestra tus conversaciones existentes. Cada fila muestra el nombre de tu contacto, una vista previa del último mensaje y un distintivo rojo si tienes mensajes no leídos.';
translations.es['tour.messaging.step3.title'] = 'Estado en línea';
translations.es['tour.messaging.step3.content'] = 'Un punto verde junto al avatar indica que la persona está conectada en este momento. Un punto gris significa que está desconectada.';
translations.es['tour.messaging.step4.title'] = 'Nueva conversación';
translations.es['tour.messaging.step4.content'] = 'Haz clic en el icono de lápiz en la parte superior derecha para iniciar una nueva conversación. Solo aparecen las personas autorizadas: el administrador ve todo el centro, un padre ve al administrador y a la cuidadora de su hijo, una cuidadora ve al administrador y a los padres de sus niños.';
translations.es['tour.messaging.step5.title'] = 'Enviar un mensaje';
translations.es['tour.messaging.step5.content'] = 'Escribe tu mensaje en el área de texto y pulsa Intro para enviarlo. Usa Mayús+Intro para una nueva línea. El destinatario recibe una notificación push aunque no tenga la aplicación abierta.';
translations.es['tour.messaging.step6.title'] = 'Indicador de escritura';
translations.es['tour.messaging.step6.content'] = 'Cuando tu contacto está escribiendo, aparecen tres puntos animados en la conversación. La misma experiencia que las aplicaciones de mensajería modernas.';
translations.es['tour.messaging.step7.title'] = 'Editar o eliminar un mensaje';
translations.es['tour.messaging.step7.content'] = 'Mantén pulsado uno de tus globos para mostrar un menú contextual. Puedes editar el texto o eliminar el mensaje. Los cambios son visibles en tiempo real para tu contacto.';
translations.es['tour.messaging.step8.title'] = 'Eliminar una conversación';
translations.es['tour.messaging.step8.content'] = 'En móvil, desliza una conversación hacia la izquierda para revelar el botón rojo de eliminar. La conversación se elimina de tu lista instantáneamente.';

// ES — feed-reports
translations.es['tour.feed-reports.step0.title'] = 'Novedades';
translations.es['tour.feed-reports.step0.content'] = 'Las novedades son la herramienta de comunicación diaria entre la cuidadora y los padres. La cuidadora informa de todo lo que ocurrió durante el día con el niño.';
translations.es['tour.feed-reports.step1.title'] = 'Acceder al feed';
translations.es['tour.feed-reports.step1.content'] = 'Haz clic en "Novedades" en el menú para acceder a las publicaciones.';
translations.es['tour.feed-reports.step2.title'] = 'Compartir momentos';
translations.es['tour.feed-reports.step2.content'] = 'La cuidadora puede publicar fotos de las actividades del día y compartir información importante sobre la guardería o el centro: salidas, eventos, cierres excepcionales...';
translations.es['tour.feed-reports.step3.title'] = 'Reacciones y respuestas';
translations.es['tour.feed-reports.step3.content'] = 'Los padres pueden dar me gusta a las publicaciones y ver quién más ha reaccionado. Esto genera confianza y transparencia entre la organización y las familias.';
translations.es['tour.feed-reports.step4.title'] = 'Buena práctica';
translations.es['tour.feed-reports.step4.content'] = 'Publica al menos un mensaje por niño al final del día. Los padres aprecian saber cómo fue el día, incluso cuando todo fue bien.';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem('site_language');
      if (saved === 'en') return 'en';
      if (saved === 'es') return 'es';
      return 'fr';
    } catch {
      return 'fr';
    }
  });

  useEffect(() => {
    try {
      document.documentElement.lang = locale;
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
