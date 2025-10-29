// src/modules/broker-accounts/broker-sync.routes.ts

import { Router, Request, Response } from 'express';
import { authMiddleware } from '@modules/auth/auth.middleware';
import { enqueueTradeSyncJob } from '@jobs/queue.config';
import { prisma } from '@config/database';
import { tradeService } from '@modules/trades/trade.service'; // ✅ ADD
import { z } from 'zod';

const router = Router();

const syncRequestSchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

// ═══════════════════════════════════════
// SYNC OPERATIONS
// ═══════════════════════════════════════

// Trigger manual sync for a broker account
router.post('/:accountId/sync', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { accountId } = req.params;
  const { fromDate, toDate } = syncRequestSchema.parse(req.body);

  // Verify account belongs to user
  const account = await prisma.brokerAccount.findFirst({
    where: { id: accountId, userId },
  });

  if (!account) {
    return res.status(404).json({ success: false, error: 'Broker account not found' });
  }

  // Enqueue sync job
  const job = await enqueueTradeSyncJob({
    brokerAccountId: accountId,
    userId,
    fromDate,
    toDate,
    priority: 1,
  });

  res.json({
    success: true,
    data: {
      jobId: job.id,
      message: 'Sync job queued successfully',
    },
  });
});

// Get sync history for an account
router.get('/:accountId/history', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { accountId } = req.params;

  // Verify account belongs to user
  const account = await prisma.brokerAccount.findFirst({
    where: { id: accountId, userId },
  });

  if (!account) {
    return res.status(404).json({ success: false, error: 'Broker account not found' });
  }

  const syncLogs = await prisma.syncLog.findMany({
    where: { brokerAccountId: accountId },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });

  res.json({ success: true, data: syncLogs });
});

// ═══════════════════════════════════════
// TRADE OPERATIONS (✅ NEW)
// ═══════════════════════════════════════

// Get trades for a broker account
router.get('/:accountId/trades', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { accountId } = req.params;

    // Verify account belongs to user
    const account = await prisma.brokerAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      return res.status(404).json({ success: false, error: 'Broker account not found' });
    }

    // Get trades with filtering
    const result = await tradeService.getTrades(userId, {
      brokerAccountId: accountId,
      ...req.query, // Allows filtering by symbol, date, etc.
    } as any);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get trade statistics for a broker account
router.get('/:accountId/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { accountId } = req.params;

    // Verify account belongs to user
    const account = await prisma.brokerAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      return res.status(404).json({ success: false, error: 'Broker account not found' });
    }

    const stats = await tradeService.getTradeStats(userId, accountId);

    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;