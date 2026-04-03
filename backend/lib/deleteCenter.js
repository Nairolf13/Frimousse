/**
 * deleteCenter(prisma, centerId)
 *
 * Supprime un centre et TOUTES ses données associées dans le bon ordre pour
 * respecter les contraintes de clés étrangères (le schéma n'a pas de
 * onDelete: Cascade sur la plupart des relations vers Center).
 *
 * Ordre de suppression :
 *  1. FeedComments / FeedLikes / FeedMedia → FeedPosts
 *  2. PhotoConsent / ParentChild / PresenceSheets (→ PresenceEntry cascade)
 *  3. Conversations (→ ConversationParticipant / Message cascade)
 *  4. Assignments / Reports (référencent Child + Nanny → à supprimer avant eux)
 *  5. Schedules (déconnexion many-to-many Nanny d'abord)
 *  6. Reviews / EmailLogs nullifiés → PaymentHistories
 *  7. PushSubscription / Subscription / AbandonedSignupReminder
 *  8. Nullification User.nannyId / User.parentId (évite Restrict FK)
 *  9. Children / Nannies / Parents (ChildNanny + InvoiceAdjustment cascadent)
 * 10. Users (RefreshToken / Notification / SupportTicket cascadent)
 * 11. Center
 */
async function deleteCenter(prisma, centerId) {
  await prisma.$transaction(async (tx) => {
    // ── 0. Vérifier que le centre existe ─────────────────────────────────────
    const center = await tx.center.findUnique({ where: { id: centerId } });
    if (!center) throw Object.assign(new Error('Centre non trouvé'), { code: 'NOT_FOUND' });

    // ── 1. Collecter les IDs de toutes les entités du centre ─────────────────
    const [children, nannies, parents, users, feedPosts, presenceSheets, conversations] =
      await Promise.all([
        tx.child.findMany({ where: { centerId }, select: { id: true } }),
        tx.nanny.findMany({ where: { centerId }, select: { id: true } }),
        tx.parent.findMany({ where: { centerId }, select: { id: true } }),
        tx.user.findMany({ where: { centerId }, select: { id: true } }),
        tx.feedPost.findMany({ where: { centerId }, select: { id: true } }),
        tx.presenceSheet.findMany({ where: { centerId }, select: { id: true } }),
        tx.conversation.findMany({ where: { centerId }, select: { id: true } }),
      ]);

    const childIds = children.map(c => c.id);
    const nannyIds = nannies.map(n => n.id);
    const parentIds = parents.map(p => p.id);
    const userIds = users.map(u => u.id);
    const feedPostIds = feedPosts.map(p => p.id);
    const presenceSheetIds = presenceSheets.map(s => s.id);
    const conversationIds = conversations.map(c => c.id);

    const paymentHistoryIds = parentIds.length
      ? (await tx.paymentHistory.findMany({ where: { parentId: { in: parentIds } }, select: { id: true } })).map(p => p.id)
      : [];

    // ── 2. FeedComments (self-ref → nullifier parentId d'abord), Likes, Media, Posts ──
    if (feedPostIds.length) {
      await tx.feedComment.updateMany({
        where: { postId: { in: feedPostIds }, parentId: { not: null } },
        data: { parentId: null },
      });
      await tx.feedComment.deleteMany({ where: { postId: { in: feedPostIds } } });
      await tx.feedLike.deleteMany({ where: { postId: { in: feedPostIds } } });
      await tx.feedMedia.deleteMany({ where: { postId: { in: feedPostIds } } });
      await tx.feedPost.deleteMany({ where: { centerId } });
    }

    // ── 3. PhotoConsent / ParentChild ─────────────────────────────────────────
    if (childIds.length) {
      await tx.photoConsent.deleteMany({ where: { childId: { in: childIds } } });
      await tx.parentChild.deleteMany({ where: { childId: { in: childIds } } });
    }

    // ── 4. PresenceSheets (PresenceEntry cascade) ─────────────────────────────
    if (presenceSheetIds.length) {
      await tx.presenceSheet.deleteMany({ where: { id: { in: presenceSheetIds } } });
    }
    // fallback : feuilles liées aux enfants avec centerId null
    if (childIds.length) {
      await tx.presenceSheet.deleteMany({ where: { childId: { in: childIds } } });
    }

    // ── 5. Conversations (ConversationParticipant + Message cascade) ──────────
    if (conversationIds.length) {
      await tx.conversation.deleteMany({ where: { id: { in: conversationIds } } });
    }

    // ── 6. Assignments (référencent Child + Nanny) ────────────────────────────
    await tx.assignment.deleteMany({ where: { centerId } });
    if (childIds.length) {
      await tx.assignment.deleteMany({ where: { childId: { in: childIds } } });
    }

    // ── 7. Reports (référencent Child + Nanny) ────────────────────────────────
    await tx.report.deleteMany({ where: { centerId } });
    if (childIds.length) {
      await tx.report.deleteMany({ where: { childId: { in: childIds } } });
    }

    // ── 8. Schedules (déconnecter la relation many-to-many Nanny d'abord) ─────
    if (nannyIds.length) {
      const schedules = await tx.schedule.findMany({ where: { centerId }, select: { id: true } });
      for (const schedule of schedules) {
        await tx.schedule.update({
          where: { id: schedule.id },
          data: { nannies: { disconnect: nannyIds.map(nid => ({ id: nid })) } },
        });
      }
    }
    await tx.schedule.deleteMany({ where: { centerId } });

    // ── 9. Reviews ────────────────────────────────────────────────────────────
    await tx.review.deleteMany({ where: { centerId } });

    // ── 10. EmailLogs nullifiés → PaymentHistories ────────────────────────────
    if (paymentHistoryIds.length) {
      await tx.emailLog.updateMany({
        where: { paymentHistoryId: { in: paymentHistoryIds } },
        data: { paymentHistoryId: null },
      });
      await tx.paymentHistory.deleteMany({ where: { parentId: { in: parentIds } } });
    }

    // ── 11. PushSubscription / Subscription / AbandonedSignupReminder ─────────
    if (userIds.length) {
      await tx.pushSubscription.deleteMany({ where: { userId: { in: userIds } } });
      await tx.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await tx.abandonedSignupReminder.deleteMany({ where: { userId: { in: userIds } } });
    }

    // ── 12. Nullifier User.nannyId / User.parentId (contrainte FK Restrict) ───
    if (userIds.length) {
      await tx.user.updateMany({
        where: { id: { in: userIds }, nannyId: { not: null } },
        data: { nannyId: null },
      });
      await tx.user.updateMany({
        where: { id: { in: userIds }, parentId: { not: null } },
        data: { parentId: null },
      });
    }

    // ── 13. Children / Nannies / Parents ─────────────────────────────────────
    // ChildNanny cascade quand Child ou Nanny est supprimé ✓
    // InvoiceAdjustment cascade quand Parent est supprimé ✓
    if (childIds.length) {
      await tx.child.deleteMany({ where: { id: { in: childIds } } });
    }
    if (nannyIds.length) {
      await tx.nanny.deleteMany({ where: { id: { in: nannyIds } } });
    }
    if (parentIds.length) {
      await tx.parent.deleteMany({ where: { id: { in: parentIds } } });
    }

    // ── 14. Users ─────────────────────────────────────────────────────────────
    // RefreshToken / Notification / SupportTicket(+Reply) cascadent ✓
    if (userIds.length) {
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    }

    // ── 15. Centre ────────────────────────────────────────────────────────────
    await tx.center.delete({ where: { id: centerId } });
  }, { timeout: 30000 });
}

module.exports = { deleteCenter };
