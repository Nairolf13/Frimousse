const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const requireAuth = require('../middleware/authMiddleware');

// GET /api/admin/centers
router.get('/centers', requireAuth, async (req, res) => {
  try {
    // only super-admins
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
      console.log('Center:', center.name, '- Admin User:', adminUser);
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

    console.log('Formatted centers:', JSON.stringify(formattedCenters, null, 2));
    res.json({ data: formattedCenters });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT /api/admin/centers/:id
router.put('/centers/:id', requireAuth, async (req, res) => {
  try {
    // only super-admins
    if (!req.user || req.user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { name, address, city, postalCode, region, country, email } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    // Mettre à jour le nom du centre
    const center = await prisma.center.update({
      where: { id },
      data: { name: name.trim() }
    });

    // Mettre à jour les informations de l'admin du centre
    const adminUser = await prisma.user.findFirst({
      where: {
        centerId: id,
        OR: [
          { role: 'admin' },
          { role: 'super-admin' }
        ]
      }
    });

    if (adminUser) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          email: email?.trim() || adminUser.email,
          address: address?.trim() || null,
          city: city?.trim() || null,
          postalCode: postalCode?.trim() || null,
          region: region?.trim() || null,
          country: country?.trim() || null
        }
      });
    }

    res.json({ data: center });
  } catch (e) {
    console.error(e);
    if (e.code === 'P2025') {
      return res.status(404).json({ error: 'Centre non trouvé' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/admin/centers/:id
router.delete('/centers/:id', requireAuth, async (req, res) => {
  try {
    // only super-admins
    if (!req.user || req.user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;

    // Vérifier que le centre existe
    const center = await prisma.center.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            parents: true,
            children: true,
            nannies: true,
          }
        }
      }
    });

    if (!center) {
      return res.status(404).json({ error: 'Centre non trouvé' });
    }

    // Supprimer en cascade (Prisma devrait gérer les relations automatiquement selon le schéma)
    await prisma.center.delete({
      where: { id }
    });

    res.json({ message: 'Centre supprimé avec succès' });
  } catch (e) {
    console.error(e);
    if (e.code === 'P2025') {
      return res.status(404).json({ error: 'Centre non trouvé' });
    }
    if (e.code === 'P2003') {
      return res.status(400).json({ error: 'Impossible de supprimer le centre car il contient des données liées' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;