/**
 * Backend i18n helper.
 *
 * To add a new language:
 *  1. Add its code to SUPPORTED_LANGS
 *  2. Add its date locale to DATE_LOCALES
 *  3. Add its translations to SUBJECTS
 *  4. Create the email template files: emailTemplates/<template>_<lang>.html
 *
 * That's it — all routes pick it up automatically.
 */

const SUPPORTED_LANGS = ['fr', 'en', 'es', 'ar'];
const DEFAULT_LANG = 'fr';

/** BCP-47 locale used for date formatting per language */
const DATE_LOCALES = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
  ar: 'ar-MA',
};

/** Email subject translations keyed by [templateKey][lang] */
const SUBJECTS = {
  verification: {
    fr: 'Vérifiez votre adresse email - Frimousse',
    en: 'Verify your email - Frimousse',
    es: 'Verifica tu correo electrónico - Frimousse',
    ar: 'تحقق من بريدك الإلكتروني - Frimousse',
  },
  reset: {
    fr: 'Réinitialiser votre mot de passe',
    en: 'Reset your password',
    es: 'Restablecer tu contraseña',
    ar: 'إعادة تعيين كلمة المرور',
  },
  invite_nanny: {
    fr: 'Invitation - Accès Frimousse',
    en: 'Invitation - Access Frimousse',
    es: 'Invitación - Acceso a Frimousse',
    ar: 'دعوة - الوصول إلى Frimousse',
  },
  invite_parent: {
    fr: 'Invitation - Accès Frimousse',
    en: 'Invitation - Access Frimousse',
    es: 'Invitación - Acceso a Frimousse',
    ar: 'دعوة - الوصول إلى Frimousse',
  },
  assignment: {
    fr: (vars) => `Affectation pour ${vars.childName}`,
    en: (vars) => `Assignment for ${vars.childName}`,
    es: (vars) => `Asignación para ${vars.childName}`,
    ar: (vars) => `تكليف للطفل ${vars.childName}`,
  },
  assignment_updated: {
    fr: (vars) => `Affectation mise à jour pour ${vars.childName}`,
    en: (vars) => `Assignment updated for ${vars.childName}`,
    es: (vars) => `Asignación actualizada para ${vars.childName}`,
    ar: (vars) => `تم تحديث التكليف للطفل ${vars.childName}`,
  },
  assignment_deleted: {
    fr: (vars) => `Affectation supprimée pour ${vars.childName}`,
    en: (vars) => `Assignment removed for ${vars.childName}`,
    es: (vars) => `Asignación eliminada para ${vars.childName}`,
    ar: (vars) => `تم حذف التكليف للطفل ${vars.childName}`,
  },
  assignment_by_nanny: {
    fr: (vars) => `Nouvelle affectation créée par ${vars.nannyName}`,
    en: (vars) => `New assignment created by ${vars.nannyName}`,
    es: (vars) => `Nueva asignación creada por ${vars.nannyName}`,
    ar: (vars) => `تكليف جديد أنشأته المربية ${vars.nannyName}`,
  },
  assignment_modified_by_nanny: {
    fr: (vars) => `Modification d'affectation par ${vars.nannyName}`,
    en: (vars) => `Assignment modified by ${vars.nannyName}`,
    es: (vars) => `Asignación modificada por ${vars.nannyName}`,
    ar: (vars) => `تم تعديل التكليف من قِبَل المربية ${vars.nannyName}`,
  },
  assignment_deleted_by_nanny: {
    fr: (vars) => `Suppression d'affectation par ${vars.nannyName}`,
    en: (vars) => `Assignment deleted by ${vars.nannyName}`,
    es: (vars) => `Asignación eliminada por ${vars.nannyName}`,
    ar: (vars) => `تم حذف التكليف من قِبَل المربية ${vars.nannyName}`,
  },
  child_assigned: {
    fr: (vars) => `Nouvel enfant assigné: ${vars.childName}`,
    en: (vars) => `New child assigned: ${vars.childName}`,
    es: (vars) => `Nuevo niño/a asignado: ${vars.childName}`,
    ar: (vars) => `طفل جديد مُضاف: ${vars.childName}`,
  },
  child_unassigned: {
    fr: (vars) => `Affectation supprimée : ${vars.childName}`,
    en: (vars) => `Assignment removed: ${vars.childName}`,
    es: (vars) => `Asignación eliminada: ${vars.childName}`,
    ar: (vars) => `تم إلغاء التكليف: ${vars.childName}`,
  },
  activity_new: {
    fr: (vars) => `Nouvelle activité : ${vars.name}`,
    en: (vars) => `New activity: ${vars.name}`,
    es: (vars) => `Nueva actividad: ${vars.name}`,
    ar: (vars) => `نشاط جديد: ${vars.name}`,
  },
  activity_updated: {
    fr: (vars) => `Activité mise à jour : ${vars.name}`,
    en: (vars) => `Activity updated: ${vars.name}`,
    es: (vars) => `Actividad actualizada: ${vars.name}`,
    ar: (vars) => `تم تحديث النشاط: ${vars.name}`,
  },
  activity_deleted: {
    fr: (vars) => `Activité supprimée : ${vars.name}`,
    en: (vars) => `Activity removed: ${vars.name}`,
    es: (vars) => `Actividad eliminada: ${vars.name}`,
    ar: (vars) => `تم حذف النشاط: ${vars.name}`,
  },
  report_new: {
    fr: 'Nouveau rapport concernant votre enfant',
    en: 'New report about your child',
    es: 'Nuevo informe sobre tu hijo/a',
    ar: 'تقرير جديد بخصوص طفلك',
  },
  abandoned_signup: {
    fr: 'Finalisez votre inscription sur Frimousse',
    en: 'Finish your Frimousse signup',
    es: 'Finaliza tu registro en Frimousse',
    ar: 'أكمل تسجيلك في Frimousse',
  },
};

/**
 * Detect language from an Express request object.
 * Falls back to DEFAULT_LANG if the header is absent or unsupported.
 */
function detectLang(req) {
  const acceptLang = (
    (req && req.headers && req.headers['accept-language']) ||
    process.env.DEFAULT_LANG ||
    DEFAULT_LANG
  ).split(',')[0].split('-')[0].toLowerCase();
  return SUPPORTED_LANGS.includes(acceptLang) ? acceptLang : DEFAULT_LANG;
}

/**
 * Return the BCP-47 date locale for a given language code.
 * Falls back to the French locale if unknown.
 */
function dateLocale(lang) {
  return DATE_LOCALES[lang] || DATE_LOCALES[DEFAULT_LANG];
}

/**
 * Format a date for use in emails.
 * @param {Date|string} date
 * @param {string} lang
 * @param {Intl.DateTimeFormatOptions} [options]
 */
function formatDate(date, lang, options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) {
  return new Date(date).toLocaleDateString(dateLocale(lang), options);
}

/**
 * Get a translated email subject.
 * @param {string} key  - key from SUBJECTS
 * @param {string} lang
 * @param {object} [vars] - variables for dynamic subjects (e.g. { childName })
 */
function subject(key, lang, vars = {}) {
  const entry = SUBJECTS[key];
  if (!entry) return key;
  const translation = entry[lang] || entry[DEFAULT_LANG] || key;
  return typeof translation === 'function' ? translation(vars) : translation;
}

module.exports = { SUPPORTED_LANGS, DEFAULT_LANG, detectLang, dateLocale, formatDate, subject };
