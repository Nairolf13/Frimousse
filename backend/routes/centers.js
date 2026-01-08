const express = require('express');
const router = express.Router();
const prisma = require('../lib/prismaClient');
const requireAuth = require('../middleware/authMiddleware');
// small debug wrapper: enable birthday logs only when SHOW_BIRTHDAY_LOGS=1
const debug = process.env.SHOW_BIRTHDAY_LOGS === '1' ? console.debug.bind(console) : () => {};

// GET /api/centers - Get all centers with admin info (super-admin only)
router.get('/', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const centers = await prisma.center.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        users: {
          where: {
            OR: [
              { role: 'admin' },
              { role: 'super-admin' }
            ]
          },
          select: {
            id: true,
            name: true,
            email: true,
            address: true,
            city: true,
            postalCode: true,
            region: true,
            country: true
          },
          take: 1
        },
        _count: {
          select: {
            users: true,
            parents: true,
            children: true,
            nannies: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Flatten admin info into center object
    const formattedCenters = centers.map(center => {
      const adminUser = center.users[0] || null;
      return {
        id: center.id,
        name: center.name,
        createdAt: center.createdAt,
        _count: center._count,
        address: adminUser?.address || null,
        city: adminUser?.city || null,
        postalCode: adminUser?.postalCode || null,
        region: adminUser?.region || null,
        country: adminUser?.country || null,
        email: adminUser?.email || null,
        phone: null
      };
    });

    res.json({ data: formattedCenters });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/centers/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const center = await prisma.center.findUnique({
      where: { id },
      select: { id: true, name: true }
    });
    if (!center) return res.status(404).json({ message: 'Centre non trouvé' });
    // Ensure the user belongs to the same center unless super-admin
    if (!req.user || (!req.user.centerId && req.user.role !== 'super-admin')) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    if (req.user.role !== 'super-admin' && req.user.centerId && req.user.centerId !== id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    res.json(center);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/centers/:id/birthdays/today
router.get('/:id/birthdays/today', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
  debug(`[birthdays] incoming request - user=${req.user && req.user.id ? req.user.id : 'anon'} centerParam=${id}`);
    // Authorization: only users belonging to the center or super-admins can access
    if (!req.user || (!req.user.centerId && req.user.role !== 'super-admin')) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    if (req.user.role !== 'super-admin' && req.user.centerId && req.user.centerId !== id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Fetch children with a birthDate for the center, then filter by month/day in JS
    const children = await prisma.child.findMany({
      where: { centerId: id, birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true, prescriptionUrl: true }
    });

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    const birthdays = (children || []).filter(c => {
      if (!c.birthDate) return false;
      const d = new Date(c.birthDate);
      return d.getMonth() + 1 === todayMonth && d.getDate() === todayDay;
    }).map(c => ({ id: c.id, name: c.name, dob: c.birthDate, photoUrl: c.prescriptionUrl || null }));

  debug(`[birthdays] resolved ${birthdays.length} birthday(s) for center=${id} user=${req.user && req.user.id ? req.user.id : 'anon'}`);
  if (birthdays.length) debug('[birthdays] list:', JSON.stringify(birthdays));
    // Return a wrapper object to match the frontend hook which expects { birthdays: [] }
    return res.json({ birthdays });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT /api/centers/:id - Update center and admin info (super-admin only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { name, address, city, postalCode, region, country, email, phone } = req.body;

    // Find center and its admin
    const center = await prisma.center.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        users: {
          where: {
            OR: [{ role: 'admin' }, { role: 'super-admin' }]
          },
          take: 1
        }
      }
    });

    if (!center) {
      return res.status(404).json({ error: 'Centre non trouvé' });
    }

    // Update center name if provided
    if (name && name.trim()) {
      await prisma.center.update({
        where: { id },
        data: { name: name.trim() }
      });
    }

    // Update admin user info if an admin exists
    if (center.users[0]) {
      const adminId = center.users[0].id;
      const updateData = {};
      if (email !== undefined) updateData.email = email;
      if (address !== undefined) updateData.address = address;
      if (city !== undefined) updateData.city = city;
      if (postalCode !== undefined) updateData.postalCode = postalCode;
      if (region !== undefined) updateData.region = region;
      if (country !== undefined) updateData.country = country;

      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { id: adminId },
          data: updateData
        });
      }
    }

    res.json({ message: 'Centre mis à jour' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// DELETE /api/centers/:id - Delete center and all associated data (super-admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;

    // Verify center exists
    const center = await prisma.center.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!center) {
      return res.status(404).json({ error: 'Centre non trouvé' });
    }

    // Delete center (cascade will handle related data based on schema)
    await prisma.center.delete({
      where: { id }
    });

    res.json({ message: 'Centre supprimé' });
  } catch (e) {
    console.error(e);
    if (e.code === 'P2003') {
      return res.status(400).json({ error: 'Impossible de supprimer le centre car il contient encore des données. Veuillez d\'abord supprimer les utilisateurs, parents, enfants et nounous associés.' });
    }
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
