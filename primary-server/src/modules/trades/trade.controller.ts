import { Router, Request, Response } from 'express';
import { authenticate } from '@modules/auth/auth.middleware'; // Import the function, not the class
import { prisma } from '@config/database';
import { z } from 'zod';

const router = Router();

const tradeQuerySchema = z.object({
  brokerAccountId: z.string().optional(),
  symbol: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.string().default('1'),
  limit: z.string().default('50'),
});

// Get trades with filtering and pagination
router.get('/', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.userId; // Changed from .id to .userId
  const { brokerAccountId, symbol, fromDate, toDate, page, limit } = tradeQuerySchema.parse(req.query);

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const where: any = { userId };

  if (brokerAccountId) {
    where.brokerAccountId = brokerAccountId;
  }

  if (symbol) {
    where.symbol = symbol;
  }

  if (fromDate || toDate) {
    where.closeTime = {};
    if (fromDate) where.closeTime.gte = new Date(fromDate);
    if (toDate) where.closeTime.lte = new Date(toDate);
  }

  const [trades, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      include: {
        brokerAccount: {
          select: {
            displayName: true,
            brokerType: true,
          },
        },
      },
      orderBy: { closeTime: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.trade.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      trades,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
});

// Get single trade
router.get('/:tradeId', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.userId; // Changed from .id to .userId
  const { tradeId } = req.params;

  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId },
    include: {
      brokerAccount: true,
    },
  });

  if (!trade) {
    return res.status(404).json({ success: false, error: 'Trade not found' });
  }

  res.json({ success: true, data: trade });
});

// Update trade (notes, tags)
router.patch('/:tradeId', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.userId; // Changed from .id to .userId
  const { tradeId } = req.params;
  const { notes, tags } = req.body;

  const trade = await prisma.trade.updateMany({
    where: { id: tradeId, userId },
    data: {
      notes,
      tags,
    },
  });

  if (trade.count === 0) {
    return res.status(404).json({ success: false, error: 'Trade not found' });
  }

  res.json({ success: true, message: 'Trade updated successfully' });
});

export default router;