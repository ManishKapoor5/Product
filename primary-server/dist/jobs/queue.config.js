"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradeSyncQueue = exports.QUEUES = void 0;
exports.enqueueTradeSyncJob = enqueueTradeSyncJob;
const bullmq_1 = require("bullmq");
const redis_1 = require("@config/redis");
exports.QUEUES = {
    TRADE_SYNC: 'trade-sync',
    ANALYTICS: 'analytics',
};
// Trade Sync Queue
exports.tradeSyncQueue = new bullmq_1.Queue(exports.QUEUES.TRADE_SYNC, {
    connection: redis_1.redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: {
            count: 100,
            age: 24 * 3600, // 24 hours
        },
        removeOnFail: {
            count: 1000,
        },
    },
});
async function enqueueTradeSyncJob(data) {
    return exports.tradeSyncQueue.add('sync-trades', data, {
        priority: data.priority || 5,
        jobId: `sync-${data.brokerAccountId}-${Date.now()}`,
    });
}
//# sourceMappingURL=queue.config.js.map