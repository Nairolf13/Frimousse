const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../lib/prismaClient');
const auth = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Availability enum values from schema
const VALID_AVAILABILITY = ['Disponible', 'En_congé', 'Maladie'];
// Sexe enum values from schema
const VALID_SEXE = ['masculin', 'feminin'];
// ChildGroup enum values from schema
const VALID_GROUP = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'Autre'];

function isSuperAdmin(user) {
  if (!user || !user.role) return false;
  const r = String(user.role).toLowerCase();
  return r === 'super-admin' || r === 'super_admin' || r.includes('super');
}

function isAdmin(user) {
  if (!user || !user.role) return false;
  const r = String(user.role).toLowerCase();
  return r === 'admin' || isSuperAdmin(user);
}

// Normalize a row: lowercase keys, strip annotations like " *", " (…)", trim string values
function normalizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    // Strip " *" markers and " (…)" descriptions from column headers, then normalize
    const cleanKey = k
      .replace(/\s*\*.*$/, '')      // remove " * ..." suffix
      .replace(/\s*\(.*$/, '')      // remove " (..." suffix
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');
    out[cleanKey] = typeof v === 'string' ? v.trim() : (v == null ? '' : String(v));
  }
  return out;
}

function parseSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows.map(normalizeRow);
}

// Nanny: required = name, email, experience, availability
function validateNanny(row, idx) {
  const errors = [];
  const line = idx + 2;
  if (!row.name) errors.push(`Nounous ligne ${line} : champ "name" manquant`);
  if (!row.email) errors.push(`Nounous ligne ${line} : champ "email" manquant`);
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push(`Nounous ligne ${line} : email "${row.email}" invalide`);
  if (row.experience === '' || row.experience === undefined) errors.push(`Nounous ligne ${line} : champ "experience" manquant`);
  else if (isNaN(Number(row.experience))) errors.push(`Nounous ligne ${line} : "experience" doit être un nombre entier`);
  if (!row.availability) errors.push(`Nounous ligne ${line} : champ "availability" manquant (valeurs : ${VALID_AVAILABILITY.join(', ')})`);
  else if (!VALID_AVAILABILITY.includes(row.availability)) errors.push(`Nounous ligne ${line} : "availability" invalide. Valeurs acceptées : ${VALID_AVAILABILITY.join(', ')}`);
  return errors;
}

// Parent: required = firstName, lastName, email
function validateParent(row, idx) {
  const errors = [];
  const line = idx + 2;
  if (!row.firstname) errors.push(`Parents ligne ${line} : champ "firstName" manquant`);
  if (!row.lastname) errors.push(`Parents ligne ${line} : champ "lastName" manquant`);
  if (!row.email) errors.push(`Parents ligne ${line} : champ "email" manquant`);
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push(`Parents ligne ${line} : email "${row.email}" invalide`);
  return errors;
}

// Child: required = name, birthDate, sexe, group — age est calculé depuis birthDate
function validateChild(row, idx) {
  const errors = [];
  const line = idx + 2;
  if (!row.name) errors.push(`Enfants ligne ${line} : champ "name" manquant`);
  if (!row.birthdate) errors.push(`Enfants ligne ${line} : champ "birthDate" manquant`);
  else if (isNaN(new Date(row.birthdate).getTime())) errors.push(`Enfants ligne ${line} : "birthDate" invalide (format attendu : AAAA-MM-JJ)`);
  if (!row.sexe) errors.push(`Enfants ligne ${line} : champ "sexe" manquant (valeurs : ${VALID_SEXE.join(', ')})`);
  else if (!VALID_SEXE.includes(row.sexe)) errors.push(`Enfants ligne ${line} : "sexe" invalide. Valeurs acceptées : ${VALID_SEXE.join(', ')}`);
  if (!row.group) errors.push(`Enfants ligne ${line} : champ "group" manquant (valeurs : ${VALID_GROUP.join(', ')})`);
  else if (!VALID_GROUP.includes(row.group)) errors.push(`Enfants ligne ${line} : "group" invalide. Valeurs acceptées : ${VALID_GROUP.join(', ')}`);
  if (row.email_parent1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email_parent1)) errors.push(`Enfants ligne ${line} : email_parent1 "${row.email_parent1}" invalide`);
  if (row.email_parent2 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email_parent2)) errors.push(`Enfants ligne ${line} : email_parent2 "${row.email_parent2}" invalide`);
  return errors;
}

function calcAge(birthDateStr) {
  const birth = new Date(birthDateStr);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

// GET /api/import/template — download pre-filled Excel template
router.get('/template', auth, (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' });

  const wb = XLSX.utils.book_new();

  // --- Onglet Nounous ---
  // Champs requis (*) : name, availability, experience
  // availability : Disponible | En_congé | Maladie
  const nanniesRows = [
    {
      'name *': 'Dupont Marie',
      'availability * (Disponible | En_congé | Maladie)': 'Disponible',
      'experience * (nombre d\'années)': 3,
      'email (identifiant de connexion)': 'marie.dupont@example.com',
      'contact (téléphone)': '0612345678',
      'birthDate (AAAA-MM-JJ)': '1990-05-15',
    },
  ];

  // --- Onglet Parents ---
  // Champs requis (*) : firstName, lastName, email
  const parentsRows = [
    {
      'firstName *': 'Jean',
      'lastName *': 'Martin',
      'email * (identifiant de connexion)': 'jean.martin@example.com',
      'phone': '0623456789',
    },
  ];

  // --- Onglet Enfants ---
  // Champs requis (*) : name, birthDate, sexe, group
  // sexe : masculin | feminin
  // group : G1 (0-1 an) | G2 (1-2 ans) | G3 (2-3 ans) | G4 (3-4 ans) | G5 (4-5 ans) | G6 (5-6 ans) | Autre
  // email_parent1 / email_parent2 : emails des parents déjà importés pour lier l'enfant
  const childrenRows = [
    {
      'name *': 'Lucas Martin',
      'birthDate * (AAAA-MM-JJ)': '2021-03-10',
      'sexe * (masculin | feminin)': 'masculin',
      'group * (G1 | G2 | G3 | G4 | G5 | G6 | Autre)': 'G2',
      'allergies': 'arachides',
      'email_parent1 (email du parent principal)': 'jean.martin@example.com',
      'email_parent2 (email du 2ème parent, optionnel)': '',
    },
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(nanniesRows), 'Nounous');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(parentsRows), 'Parents');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(childrenRows), 'Enfants');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="template_import_frimousse.xlsx"');
  res.send(buf);
});

// POST /api/import/preview — parse file, return preview rows with validation status
router.post('/preview', auth, upload.single('file'), async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' });
    if (!req.file) return res.status(400).json({ error: 'Fichier manquant' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const nannies = parseSheet(workbook, 'Nounous');
    const parents = parseSheet(workbook, 'Parents');
    const children = parseSheet(workbook, 'Enfants');

    if (!nannies.length && !parents.length && !children.length) {
      return res.status(400).json({ error: 'Le fichier ne contient aucune donnée dans les onglets Nounous, Parents ou Enfants.' });
    }

    const errors = [];
    nannies.forEach((r, i) => errors.push(...validateNanny(r, i)));
    parents.forEach((r, i) => errors.push(...validateParent(r, i)));
    children.forEach((r, i) => errors.push(...validateChild(r, i)));
    if (errors.length) return res.status(422).json({ errors });

    // Check which emails already exist in DB
    const allEmails = [
      ...nannies.map(r => r.email),
      ...parents.map(r => r.email),
    ].filter(Boolean).map(e => e.toLowerCase());

    const existingUsers = allEmails.length
      ? await prisma.user.findMany({ where: { email: { in: allEmails } }, select: { email: true } })
      : [];
    const existingEmailSet = new Set(existingUsers.map(u => u.email.toLowerCase()));

    res.json({
      nannies: nannies.map(r => ({ ...r, _status: existingEmailSet.has(r.email.toLowerCase()) ? 'exists' : 'new' })),
      parents: parents.map(r => ({ ...r, _status: existingEmailSet.has(r.email.toLowerCase()) ? 'exists' : 'new' })),
      children: children.map(r => ({ ...r, _status: 'new' })),
    });
  } catch (e) {
    console.error('Import preview error', e);
    res.status(500).json({ error: 'Erreur lors de la lecture du fichier' });
  }
});

// POST /api/import/confirm — execute the import
router.post('/confirm', auth, upload.single('file'), async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' });
    if (!req.file) return res.status(400).json({ error: 'Fichier manquant' });

    const centerId = req.user.centerId || null;
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteSecret = process.env.INVITE_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET;

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const nannies = parseSheet(workbook, 'Nounous');
    const parents = parseSheet(workbook, 'Parents');
    const children = parseSheet(workbook, 'Enfants');

    const report = {
      nannies: { created: 0, skipped: 0 },
      parents: { created: 0, skipped: 0 },
      children: { created: 0, skipped: 0 },
      errors: [],
    };

    // Map parent email → parentId for child linking (populated during parent import)
    const parentEmailToId = {};

    // --- Import Nannies ---
    for (const row of nannies) {
      const errs = validateNanny(row, nannies.indexOf(row));
      if (errs.length) { report.errors.push(...errs); continue; }
      const email = row.email.toLowerCase();
      try {
        await prisma.$transaction(async (tx) => {
          const existing = await tx.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
          if (existing) { report.nannies.skipped++; return; }

          const nanny = await tx.nanny.create({
            data: {
              name: row.name,
              contact: row.contact || null,
              email,
              experience: Number(row.experience),
              availability: row.availability,
              birthDate: row.birthdate ? new Date(row.birthdate) : null,
              centerId,
            },
          });

          const hash = await bcrypt.hash(crypto.randomBytes(12).toString('base64'), 10);
          const user = await tx.user.create({
            data: { email, password: hash, name: row.name, role: 'nanny', nannyId: nanny.id, centerId },
          });

          if (process.env.SMTP_HOST && inviteSecret) {
            setImmediate(async () => {
              try {
                const token = jwt.sign({ type: 'invite', userId: user.id }, inviteSecret, { expiresIn: '7d' });
                const inviteUrl = `${loginUrl}/invite?token=${token}`;
                await require('../lib/email').sendTemplatedMail({ templateName: 'welcome_nanny', lang: 'fr', to: email, subject: 'Invitation à rejoindre Frimousse', substitutions: { name: row.name || '', inviteUrl }, prisma });
              } catch (err) { console.error('Import: nanny invite email failed', err && err.message); }
            });
          }
          report.nannies.created++;
        });
      } catch (e) {
        report.errors.push(`Nounou "${row.name}" (${email}) : ${e && e.message ? e.message : 'erreur inconnue'}`);
      }
    }

    // --- Import Parents ---
    for (const row of parents) {
      const errs = validateParent(row, parents.indexOf(row));
      if (errs.length) { report.errors.push(...errs); continue; }
      const email = row.email.toLowerCase();
      try {
        await prisma.$transaction(async (tx) => {
          const existing = await tx.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
          if (existing) {
            if (existing.parentId) parentEmailToId[email] = existing.parentId;
            report.parents.skipped++;
            return;
          }

          const parent = await tx.parent.create({
            data: { firstName: row.firstname, lastName: row.lastname, email, phone: row.phone || null, centerId },
          });
          parentEmailToId[email] = parent.id;

          const hash = await bcrypt.hash(crypto.randomBytes(12).toString('base64'), 10);
          const user = await tx.user.create({
            data: { email, password: hash, name: `${row.firstname} ${row.lastname}`, role: 'parent', parentId: parent.id, centerId },
          });

          if (process.env.SMTP_HOST && inviteSecret) {
            setImmediate(async () => {
              try {
                const token = jwt.sign({ type: 'invite', userId: user.id }, inviteSecret, { expiresIn: '7d' });
                const inviteUrl = `${loginUrl}/invite?token=${token}`;
                await require('../lib/email').sendTemplatedMail({ templateName: 'welcome_parent', lang: 'fr', to: email, subject: 'Invitation à rejoindre Frimousse', substitutions: { name: row.firstname || '', inviteUrl }, prisma });
              } catch (err) { console.error('Import: parent invite email failed', err && err.message); }
            });
          }
          report.parents.created++;
        });
      } catch (e) {
        report.errors.push(`Parent "${row.firstname} ${row.lastname}" (${email}) : ${e && e.message ? e.message : 'erreur inconnue'}`);
      }
    }

    // --- Import Children ---
    for (const row of children) {
      const errs = validateChild(row, children.indexOf(row));
      if (errs.length) { report.errors.push(...errs); continue; }
      try {
        await prisma.$transaction(async (tx) => {
          const child = await tx.child.create({
            data: {
              name: row.name,
              age: calcAge(row.birthdate),
              sexe: row.sexe,
              group: row.group,
              birthDate: new Date(row.birthdate),
              allergies: row.allergies || null,
              centerId,
            },
          });

          // Link to parents via ParentChild join table
          const parentEmails = [row.email_parent1, row.email_parent2].filter(Boolean).map(e => e.toLowerCase());
          for (const pEmail of parentEmails) {
            let parentId = parentEmailToId[pEmail];
            if (!parentId) {
              const pUser = await tx.user.findFirst({ where: { email: { equals: pEmail, mode: 'insensitive' } }, select: { parentId: true } });
              if (pUser && pUser.parentId) parentId = pUser.parentId;
            }
            if (parentId) {
              const alreadyLinked = await tx.parentChild.findFirst({ where: { childId: child.id, parentId } });
              if (!alreadyLinked) await tx.parentChild.create({ data: { childId: child.id, parentId } });
            }
          }
          report.children.created++;
        });
      } catch (e) {
        report.errors.push(`Enfant "${row.name}" : ${e && e.message ? e.message : 'erreur inconnue'}`);
      }
    }

    res.json({ report });
  } catch (e) {
    console.error('Import confirm error', e);
    res.status(500).json({ error: "Erreur lors de l'import" });
  }
});

module.exports = router;
