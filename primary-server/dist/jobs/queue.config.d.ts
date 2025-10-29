import { Queue } from 'bullmq';
export declare const QUEUES: {
    readonly TRADE_SYNC: "trade-sync";
    readonly ANALYTICS: "analytics";
};
export declare const tradeSyncQueue: Queue<any, any, string, any, any, string>;
export interface TradeSyncJobData {
    brokerAccountId: string;
    userId: string;
    fromDate?: string;
    toDate?: string;
    priority?: number;
}
export declare function enqueueTradeSyncJob(data: TradeSyncJobData): Promise<import("bullmq").Job<any, any, string>>;
//# sourceMappingURL=queue.config.d.ts.map