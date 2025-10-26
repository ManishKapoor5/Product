import { Queue, Worker, QueueEvents } from 'bullmq';
import { redisConnection } from '@config/redis';

export const QUEUES = {
  TRADE_SYNC: 'trade-sync',
  ANALYTICS: 'analytics',
} as const;

// Trade Sync Queue
export const tradeSyncQueue = new Queue(QUEUES.TRADE_SYNC, {
  connection: redisConnection,
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

export interface TradeSyncJobData {
  brokerAccountId: string;
  userId: string;
  fromDate?: string;
  toDate?: string;
  priority?: number;
}

export async function enqueueTradeSyncJob(data: TradeSyncJobData) {
  return tradeSyncQueue.add('sync-trades', data, {
    priority: data.priority || 5,
    jobId: `sync-${data.brokerAccountId}-${Date.now()}`,
  });
}