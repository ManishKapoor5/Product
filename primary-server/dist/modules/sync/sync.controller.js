"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("@modules/auth/auth.middleware");
const queue_config_1 = require("@jobs/queue.config");
const database_1 = require("@config/database");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const syncRequestSchema = zod_1.z.object({
    fromDate: zod_1.z.string().optional(),
    toDate: zod_1.z.string().optional(),
});
// Trigger manual sync for a broker account
router.post('/:accountId/sync', auth_middleware_1.authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    const { accountId } = req.params;
    const { fromDate, toDate } = syncRequestSchema.parse(req.body);
    // Verify account belongs to user
    const account = await database_1.prisma.brokerAccount.findFirst({
        where: { id: accountId, userId },
    });
    if (!account) {
        return res.status(404).json({ success: false, error: 'Broker account not found' });
    }
    // Enqueue sync job
    const job = await (0, queue_config_1.enqueueTradeSyncJob)({
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
router.get('/:accountId/history', auth_middleware_1.authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    const { accountId } = req.params;
    // Verify account belongs to user
    const account = await database_1.prisma.brokerAccount.findFirst({
        where: { id: accountId, userId },
    });
    if (!account) {
        return res.status(404).json({ success: false, error: 'Broker account not found' });
    }
    const syncLogs = await database_1.prisma.syncLog.findMany({
        where: { brokerAccountId: accountId },
        orderBy: { startedAt: 'desc' },
        take: 50,
    });
    res.json({ success: true, data: syncLogs });
});
exports.default = router;
//# sourceMappingURL=sync.controller.js.map