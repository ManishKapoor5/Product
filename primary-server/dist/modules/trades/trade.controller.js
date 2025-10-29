"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("@modules/auth/auth.middleware"); // Import the function, not the class
const database_1 = require("@config/database");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const tradeQuerySchema = zod_1.z.object({
    brokerAccountId: zod_1.z.string().optional(),
    symbol: zod_1.z.string().optional(),
    fromDate: zod_1.z.string().optional(),
    toDate: zod_1.z.string().optional(),
    page: zod_1.z.string().default('1'),
    limit: zod_1.z.string().default('50'),
});
// Get trades with filtering and pagination
router.get('/', auth_middleware_1.authenticate, async (req, res) => {
    const userId = req.user.userId; // Changed from .id to .userId
    const { brokerAccountId, symbol, fromDate, toDate, page, limit } = tradeQuerySchema.parse(req.query);
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const where = { userId };
    if (brokerAccountId) {
        where.brokerAccountId = brokerAccountId;
    }
    if (symbol) {
        where.symbol = symbol;
    }
    if (fromDate || toDate) {
        where.closeTime = {};
        if (fromDate)
            where.closeTime.gte = new Date(fromDate);
        if (toDate)
            where.closeTime.lte = new Date(toDate);
    }
    const [trades, total] = await Promise.all([
        database_1.prisma.trade.findMany({
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
        database_1.prisma.trade.count({ where }),
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
router.get('/:tradeId', auth_middleware_1.authenticate, async (req, res) => {
    const userId = req.user.userId; // Changed from .id to .userId
    const { tradeId } = req.params;
    const trade = await database_1.prisma.trade.findFirst({
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
router.patch('/:tradeId', auth_middleware_1.authenticate, async (req, res) => {
    const userId = req.user.userId; // Changed from .id to .userId
    const { tradeId } = req.params;
    const { notes, tags } = req.body;
    const trade = await database_1.prisma.trade.updateMany({
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
exports.default = router;
//# sourceMappingURL=trade.controller.js.map