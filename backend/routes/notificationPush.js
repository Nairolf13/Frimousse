const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const requireAuth = require('../middleware/authMiddleware');

const logger = require('../lib/logger');

// Helper to mask a push endpoint so we don't leak it in logs
function maskEndpoint(ep) {
  if (!ep) return '<no-endpoint>';
  try {
    if (typeof ep !== 'string') ep = String(ep);
    if (ep.length <= 40) return ep;
    return ep.slice(0, 20) + '...' + ep.slice(-8);
  } catch (e) {
    return '<endpoint>'; 
  }
}


router.post('/save', requireAuth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: 'Missing subscription' });

    const user = req.user;
    const userId = user && user.id ? user.id : null;

    const endpoint = subscription && subscription.endpoint ? subscription.endpoint : null;
    if (endpoint) {
      // Try to find any existing row for this endpoint (regardless of userId)
      const existing = await prisma.pushSubscription.findFirst({ where: { subscription: { path: ['endpoint'], equals: endpoint } } });
      if (existing) {
        // If existing subscription already belongs to this user and payload is unchanged, no-op
        try {
          const existingStr = JSON.stringify(existing.subscription || {});
          const newStr = JSON.stringify(subscription || {});
          if (existing.userId && existing.userId === userId && existingStr === newStr) {
            return res.json({ success: true, id: existing.id, updated: false, note: 'no-op' });
          }
        } catch (e) {
          // ignore stringify issues and continue to update
        }
        // Update existing row to associate to this user (or null) and refresh payload
        const updated = await prisma.pushSubscription.update({ where: { id: existing.id }, data: { userId, subscription } });
        // Remove any other rows for this user to keep one row per user when possible
        if (userId) {
          await prisma.pushSubscription.deleteMany({ where: { userId, id: { not: updated.id } } });
        }
        // If there were multiple rows with same endpoint (race), clean them up
        try {
          await prisma.pushSubscription.deleteMany({ where: { subscription: { path: ['endpoint'], equals: endpoint }, id: { not: updated.id } } });
        } catch (e) {
          logger.warn('Failed to cleanup duplicate subscriptions for endpoint', maskEndpoint(endpoint), e && e.message ? e.message : e);
        }
        if (existing.userId && existing.userId !== userId) logger.warn('[push] /save: reassociated endpoint', maskEndpoint(endpoint), 'from user', existing.userId, 'to', userId);
        return res.json({ success: true, id: updated.id, updated: true });
      }
    }

    // No existing row -> create
    const created = await prisma.pushSubscription.create({ data: { userId: userId, subscription } });
    // Remove other rows for this user (keep only the created one)
    if (userId) {
      try { await prisma.pushSubscription.deleteMany({ where: { userId, id: { not: created.id } } }); } catch (e) { logger.warn('Failed to cleanup other subs for user', userId, e && e.message ? e.message : e); }
    }
    res.json({ success: true, id: created.id, created: true });
    } catch (err) {
    logger.error('Error saving subscription:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Associate an existing (anonymous) subscription to the authenticated user if it matches by endpoint.
router.post('/associate', requireAuth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: 'Missing subscription' });

    const endpoint = subscription.endpoint;
    const userId = req.user && req.user.id ? req.user.id : null;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let found = null;
    if (endpoint) {
      // Search any existing subscription matching this endpoint regardless of userId
      found = await prisma.pushSubscription.findFirst({ where: { subscription: { path: ['endpoint'], equals: endpoint } } });
    }

  if (found) {
      // If the subscription already belongs to this user and payload is unchanged, no-op to avoid duplicate processing
      try {
        const foundSubStr = JSON.stringify(found.subscription || {});
        const newSubStr = JSON.stringify(subscription || {});
        if (found.userId && found.userId === userId && foundSubStr === newSubStr) {
          // nothing to do
          return res.json({ updated: false, id: found.id, note: 'no-op' });
        }
      } catch (e) {
        // ignore stringify errors and continue
      }
      const updated = await prisma.pushSubscription.update({ where: { id: found.id }, data: { userId, subscription } });
      // Clean up any other rows with the same endpoint
  try { await prisma.pushSubscription.deleteMany({ where: { subscription: { path: ['endpoint'], equals: endpoint }, id: { not: updated.id } } }); } catch (e) { logger.warn('Failed cleanup after associate', e && e.message ? e.message : e); }
  if (found.userId && found.userId !== userId) logger.warn('[push] /associate: reassociated endpoint', maskEndpoint(endpoint), 'from user', found.userId, 'to', userId);
      return res.json({ updated: true, id: updated.id });
    }

    const created = await prisma.pushSubscription.create({ data: { userId, subscription } });
    return res.json({ created: true, id: created.id });
  } catch (err) {
    logger.error('Error associating subscription:', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Return current user's subscriptions
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user && req.user.id ? req.user.id : null;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    return res.json({ subscriptions: subs });
  } catch (err) {
    logger.error('Error listing subscriptions for user:', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Delete all subscriptions for current user (used to unsubscribe)
router.delete('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user && req.user.id ? req.user.id : null;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    await prisma.pushSubscription.deleteMany({ where: { userId } });
    return res.json({ deleted: true });
  } catch (err) {
    logger.error('Error deleting subscriptions for user:', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Delete a specific subscription by id (only if it belongs to the authenticated user)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user && req.user.id ? req.user.id : null;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const sub = await prisma.pushSubscription.findUnique({ where: { id } });
    if (!sub) return res.status(404).json({ error: 'Not found' });
    if (sub.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    await prisma.pushSubscription.delete({ where: { id } });
    return res.json({ deleted: true, id });
  } catch (err) {
    logger.error('Error deleting subscription by id:', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Debug endpoint: Service worker reports when it receives a push (only when PUSH_DEBUG=true)
router.post('/debug/received', async (req, res) => {
  try {
    if (process.env.PUSH_DEBUG !== 'true') {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[SW Debug] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
