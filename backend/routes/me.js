const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const requireAuth = require('../middleware/authMiddleware');

router.get('/', requireAuth, async (req, res) => {
  try {
    // Return the user plus address fields and include linked parent / nanny minimal data
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        nannyId: true,
        parentId: true,
        centerId: true,
        address: true,
        postalCode: true,
        city: true,
        region: true,
        country: true,
        parent: {
          select: {
            id: true,
            phone: true,
          },
        },
        nanny: {
          select: {
            id: true,
            birthDate: true,
          },
        },
      },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    // Normalize phone and birthDate into top-level fields so frontend can read u.phone and u.birthDate
    try {
      const out = Object.assign({}, user);
      // parent.phone vs nanny.contact
      const parentPhone = user.parent && user.parent.phone ? user.parent.phone : null;
      const nannyContact = user.nanny && user.nanny.contact ? user.nanny.contact : null;
      out.phone = parentPhone || nannyContact || null;
      // birthDate from nanny (nannies have birthDate in schema)
      out.birthDate = user.nanny && user.nanny.birthDate ? user.nanny.birthDate : null;
      // remove nested objects if you prefer to keep response small
      // delete out.parent; delete out.nanny;
      res.json(out);
    } catch (e) {
      // fallback: return raw user record
      res.json(user);
    }
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
