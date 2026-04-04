/**
 * Address field validation and sanitization.
 *
 * Rules:
 *  - All fields are optional (null/undefined/empty string clears the field).
 *  - When provided, fields are trimmed, stripped of HTML/script tags,
 *    capped at a max length, and checked for disallowed characters.
 *  - Postal code must match the pattern: digits, letters, spaces, hyphens only.
 *
 * Usage:
 *   const { data, errors } = validateAddress({ address, postalCode, city, region, country });
 *   if (errors.length) return res.status(400).json({ error: errors.join(', ') });
 *   // use data.address, data.postalCode, etc. (null when cleared)
 */

const MAX_LENGTHS = {
  address: 200,
  postalCode: 12,
  city: 100,
  region: 100,
  country: 100,
};

// Strip HTML/script tags and null bytes from a string
function sanitize(value) {
  return value
    .replace(/\0/g, '')                    // null bytes
    .replace(/<[^>]*>/g, '')               // HTML tags
    .replace(/javascript\s*:/gi, '')        // javascript: URIs
    .trim();
}

/**
 * @param {Object} fields - Partial object with fields to validate.
 *   Accepted keys: address, postalCode, city, region, country.
 *   Pass `undefined` to skip a field (it will not appear in `data`).
 *   Pass `null` or `''` to explicitly clear the field (`data` will contain `null`).
 * @returns {{ data: Object, errors: string[] }}
 */
function validateAddress(fields) {
  const data = {};
  const errors = [];

  for (const field of ['address', 'postalCode', 'city', 'region', 'country']) {
    const raw = fields[field];

    // Skip fields not provided at all
    if (typeof raw === 'undefined') continue;

    // Explicit clear
    if (raw === null || raw === '') {
      data[field] = null;
      continue;
    }

    if (typeof raw !== 'string') {
      errors.push(`Le champ "${field}" doit être une chaîne de caractères`);
      continue;
    }

    const cleaned = sanitize(raw);

    if (cleaned.length === 0) {
      data[field] = null;
      continue;
    }

    if (cleaned.length > MAX_LENGTHS[field]) {
      errors.push(
        `Le champ "${field}" dépasse la longueur maximale autorisée (${MAX_LENGTHS[field]} caractères)`
      );
      continue;
    }

    // Postal code: only digits, letters, spaces and hyphens
    if (field === 'postalCode' && !/^[A-Z0-9 \-]+$/i.test(cleaned)) {
      errors.push('Le code postal contient des caractères non autorisés');
      continue;
    }

    // city / region / country: disallow digits-only strings and obvious injections
    if (['city', 'region', 'country'].includes(field)) {
      if (/[<>"'`]/.test(cleaned)) {
        errors.push(`Le champ "${field}" contient des caractères non autorisés`);
        continue;
      }
    }

    data[field] = cleaned;
  }

  return { data, errors };
}

module.exports = { validateAddress };
