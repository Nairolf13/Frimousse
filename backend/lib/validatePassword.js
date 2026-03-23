/**
 * Validates password strength.
 * Returns null if valid, or an error message string if invalid.
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') return 'Mot de passe requis.';
  if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (password.length > 128) return 'Le mot de passe ne peut pas dépasser 128 caractères.';
  return null;
}

module.exports = { validatePassword };
