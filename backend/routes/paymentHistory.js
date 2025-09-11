const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/authMiddleware');

// Récupérer l’historique par mois/année
router.get('/:year/:month', auth, async (req, res) => {
  const { year, month } = req.params;
  const yearInt = parseInt(year, 10);
  const monthInt = parseInt(month, 10);
  if (!Number.isFinite(yearInt) || !Number.isFinite(monthInt)) {
    return res.status(400).json({ message: 'Paramètres year et month invalides' });
  }
  try {
    // Determine caller identity and restrict results accordingly
    const userId = req.user && req.user.id;

    // default where clause
    const whereBase = { year: yearInt, month: monthInt };

    if (!userId) {
      // unauthenticated: deny
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { nannyId: true, parentId: true, role: true } });

    // Admins / supers can see everything
    const role = (user && user.role) || '';
    const isAdmin = typeof role === 'string' && (role.toLowerCase().includes('admin') || role.toLowerCase().includes('super'));

    let data;
    if (user && user.nannyId) {
      // Nanny: only parents who have at least one child that has an assignment with this nanny
      data = await prisma.paymentHistory.findMany({
        where: {
          ...whereBase,
          parent: {
            children: {
              some: {
                child: {
                  assignments: {
                    some: { nannyId: user.nannyId }
                  }
                }
              }
            }
          }
        },
        include: { parent: true }
      });
    } else if (user && user.parentId) {
      // Parent: only their own records
      data = await prisma.paymentHistory.findMany({
        where: { ...whereBase, parentId: user.parentId },
        include: { parent: true }
      });
    } else if (isAdmin) {
      // Admin: all
      data = await prisma.paymentHistory.findMany({ where: whereBase, include: { parent: true } });
    } else {
      // Other authenticated users: deny
      return res.status(403).json({ message: 'Accès refusé' });
    }

    res.json(data);
  } catch (err) {
    console.error('Failed to fetch payment history for', { year: yearInt, month: monthInt }, err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
