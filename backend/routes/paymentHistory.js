const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/authMiddleware');
const requireActiveSubscription = require('../middleware/subscriptionMiddleware');

router.use(auth, requireActiveSubscription);

// Any change to RATE_PER_DAY should be mirrored in paymentCron.js
const RATE_PER_DAY = 2;

// Récupérer l’historique par mois/année
router.get('/:year/:month', async (req, res) => {
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

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { nannyId: true, parentId: true, role: true, centerId: true } });

  // Roles: distinguish regular admins from super-admins
  const role = (user && user.role) || '';
  const isSuperAdmin = typeof role === 'string' && role.toLowerCase().includes('super');
  const isAdmin = typeof role === 'string' && role.toLowerCase().includes('admin');

    // If the user's role explicitly indicates 'parent' but we don't have a parentId on the user record,
    // deny access rather than falling back to other checks.
    if (typeof role === 'string' && role.toLowerCase().includes('parent') && (!user || !user.parentId)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    let data;
    if (isSuperAdmin) {
      // Super-admin: full access
      data = await prisma.paymentHistory.findMany({ where: whereBase, include: { parent: true } });
    } else if (isAdmin) {
      // Regular admin: only parents belonging to the same center as the admin
      if (!user || !user.centerId) return res.status(403).json({ message: 'Accès refusé' });
      data = await prisma.paymentHistory.findMany({
        where: {
          ...whereBase,
          parent: { is: { centerId: user.centerId } }
        },
        include: { parent: true }
      });
    } else if (user && user.parentId) {
      // Parent: only their own records
      data = await prisma.paymentHistory.findMany({
        where: { ...whereBase, parentId: user.parentId },
        include: { parent: true }
      });
    } else if (user && user.nannyId) {
      // Nanny: only parents who have at least one child that has an assignment or an explicit childNanny with this nanny
      data = await prisma.paymentHistory.findMany({
        where: {
          ...whereBase,
          parent: {
            children: {
              some: {
                child: {
                  OR: [
                    { assignments: { some: { nannyId: user.nannyId } } },
                    { childNannies: { some: { nannyId: user.nannyId } } }
                  ]
                }
              }
            }
          }
        },
        include: { parent: true }
      });
    } else {
      // Other authenticated users: deny
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // compute adjustment sum for each record and ensure stored total matches reality
    const monthStr = `${year}-${String(monthInt).padStart(2,'0')}`;
    for (const rec of data || []) {
      try {
        const agg = await prisma.invoiceAdjustment.aggregate({ where: { parentId: rec.parentId, month: monthStr }, _sum: { amount: true } });
        rec.adjustment = (agg && agg._sum && agg._sum.amount) ? agg._sum.amount : 0;
      } catch (e) {
        rec.adjustment = 0;
      }

      // Recompute actual total using assignments to guard against drift
      try {
        let actual = 0;
        // find children of this parent
        const kids = await prisma.child.findMany({ where: { parents: { some: { parentId: rec.parentId } } }, select: { id: true } });
        if (kids && kids.length) {
          const start = new Date(yearInt, monthInt - 1, 1);
          const end = new Date(yearInt, monthInt, 0);
          for (const k of kids) {
            const days = await prisma.assignment.count({ where: { childId: k.id, date: { gte: start, lte: end } } });
            actual += days * RATE_PER_DAY;
          }
        }
        actual -= rec.adjustment || 0;
        if (actual < 0) actual = 0;
        if (rec.total !== actual) {
          // fix the DB so future requests are correct
          await prisma.paymentHistory.update({ where: { id: rec.id }, data: { total: actual } });
          rec.total = actual;
        }
      } catch (e) {
        // ignore calculation errors, leave rec.total as-is
        console.error('reconciliation error for paymentHistory', rec.id, e);
      }
    }

    // Compute invoiceNumber for each record so frontend can show a human-friendly invoice identifier
    const augmented = (data || []).map(rec => {
      try {
        const invoiceDate = rec && rec.createdAt ? new Date(rec.createdAt) : new Date();
        const invoiceNumber = `FA-${invoiceDate.getFullYear()}-${String(rec.id).slice(0, 6)}`;
        return { ...rec, invoiceNumber };
      } catch (e) {
        return { ...rec };
      }
    });

    res.json(augmented);
  } catch (err) {
    console.error('Failed to fetch payment history for', { year: yearInt, month: monthInt }, err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;

// Group payments by nanny for a given month/year
router.get('/:year/:month/group-by-nanny', async (req, res) => {
  const { year, month } = req.params;
  const yearInt = parseInt(year, 10);
  const monthInt = parseInt(month, 10);
  if (!Number.isFinite(yearInt) || !Number.isFinite(monthInt)) {
    return res.status(400).json({ message: 'Paramètres year et month invalides' });
  }

  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Non authentifié' });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { nannyId: true, parentId: true, role: true, centerId: true } });
    const role = (user && user.role) || '';
    const isSuperAdmin = typeof role === 'string' && role.toLowerCase().includes('super');
    const isAdmin = typeof role === 'string' && role.toLowerCase().includes('admin');

    const whereBase = { year: yearInt, month: monthInt };

    // Fetch payments according to caller permissions, but include parent->children with assignments/childNannies
    let payments;
    if (isSuperAdmin) {
      // Parent.children is a ParentChild relation; include the nested child and its assignments/childNannies
      payments = await prisma.paymentHistory.findMany({ where: whereBase, include: { parent: { include: { children: { include: { child: { include: { assignments: true, childNannies: true } } } } } } } });
    } else if (isAdmin) {
      if (!user || !user.centerId) return res.status(403).json({ message: 'Accès refusé' });
      payments = await prisma.paymentHistory.findMany({
        where: {
          ...whereBase,
          parent: { is: { centerId: user.centerId } }
        },
        include: { parent: { include: { children: { include: { child: { include: { assignments: true, childNannies: true } } } } } } }
      });
    } else if (user && user.parentId) {
      payments = await prisma.paymentHistory.findMany({ where: { ...whereBase, parentId: user.parentId }, include: { parent: { include: { children: { include: { child: { include: { assignments: true, childNannies: true } } } } } } } });
    } else if (user && user.nannyId) {
      // For nanny role, only parents who have at least one child linked to this nanny
      payments = await prisma.paymentHistory.findMany({
        where: {
          ...whereBase,
          parent: {
            children: {
              some: {
                child: {
                  OR: [
                    { assignments: { some: { nannyId: user.nannyId } } },
                    { childNannies: { some: { nannyId: user.nannyId } } }
                  ]
                }
              }
            }
          }
        },
        include: { parent: { include: { children: { include: { child: { include: { assignments: true, childNannies: true } } } } } } }
      });
    } else {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Build grouping map: nannyId -> { payments: [...], total }
    const groups = new Map();

    // compute adjustment for each record as in the base endpoint so UI can indicate it
    const monthStr = `${year}-${String(monthInt).padStart(2,'0')}`;
    for (const rec of (payments || [])) {
      try {
        const agg = await prisma.invoiceAdjustment.aggregate({ where: { parentId: rec.parentId, month: monthStr }, _sum: { amount: true } });
        rec.adjustment = (agg && agg._sum && agg._sum.amount) ? agg._sum.amount : 0;
      } catch (e) {
        rec.adjustment = 0;
      }
    }

    for (const rec of (payments || [])) {
      const parent = rec.parent;
      const parentChildren = (parent && parent.children) || [];
      const nannyIds = new Set();

      // parentChildren are ParentChild objects with a `.child` relation
      for (const pc of parentChildren) {
        const child = pc && pc.child ? pc.child : null;
        if (!child) continue;
        if (child.assignments && Array.isArray(child.assignments)) {
          for (const a of child.assignments) {
            if (a && a.nannyId) nannyIds.add(a.nannyId);
          }
        }
        if (child.childNannies && Array.isArray(child.childNannies)) {
          for (const cn of child.childNannies) {
            if (cn && cn.nannyId) nannyIds.add(cn.nannyId);
          }
        }
      }

      // If no nanny was found for these children, skip grouping (payments not linked to a nanny)
      if (nannyIds.size === 0) continue;

      // Compute invoiceNumber as in the base endpoint
      let invoiceNumber = null;
      try {
        const invoiceDate = rec && rec.createdAt ? new Date(rec.createdAt) : new Date();
        invoiceNumber = `FA-${invoiceDate.getFullYear()}-${String(rec.id).slice(0, 6)}`;
      } catch (e) {
        invoiceNumber = null;
      }

      for (const nid of nannyIds) {
        if (!groups.has(nid)) groups.set(nid, { nannyId: nid, payments: [], total: 0 });
        const g = groups.get(nid);
        // PaymentHistory model stores the full entry amount in `total` (not `amount`)
        const amount = Number(rec.total || 0);
        g.payments.push({ id: rec.id, amount, createdAt: rec.createdAt, parent: rec.parent, invoiceNumber });
        g.total = (g.total || 0) + amount;
      }
    }

    const nannyIds = Array.from(groups.keys());
    let nannies = [];
    if (nannyIds.length > 0) {
      // fetch basic nanny info
      nannies = await prisma.nanny.findMany({ where: { id: { in: nannyIds } } });
    }

    // Merge nanny info into groups and build final array
    const result = [];
    for (const [nid, group] of groups.entries()) {
      const nanny = nannies.find(n => String(n.id) === String(nid)) || { id: nid, name: '—' };
      result.push({ nanny, payments: group.payments, total: group.total });
    }

    // sort by nanny name
    result.sort((a, b) => (String((a.nanny && a.nanny.name) || '').localeCompare(String((b.nanny && b.nanny.name) || ''))));

    res.json(result);
  } catch (err) {
    console.error('Failed to fetch grouped payment history', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
