import { Router, Request, Response } from 'express';
import { authMiddleware } from '@modules/auth/auth.middleware';
import { enqueueTradeSyncJob } from '@jobs/queue.config';
import { prisma } from '@config/database';
import { z } from 'zod';

const router = Router();

const syncRequestSchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

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
    priority: 1, // High priority for manual syncs
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

export default router;