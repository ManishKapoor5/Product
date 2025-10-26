import { Worker, Job } from 'bullmq';
import { redisConnection } from '@config/redis';
import { QUEUES, TradeSyncJobData } from '../queue.config';
import { prisma } from '@config/database';
import { brokerServiceClient } from '@shared/clients/broker-service.client';
import { decrypt } from '@shared/utils/encryption';

export function createTradeSyncWorker() {
  const worker = new Worker<TradeSyncJobData>(
    QUEUES.TRADE_SYNC,
    async (job: Job<TradeSyncJobData>) => {
      const { brokerAccountId, userId, fromDate, toDate } = job.data;

      console.log(`Processing trade sync for account: ${brokerAccountId}`);

      // Create sync log
      const syncLog = await prisma.syncLog.create({
        data: {
          brokerAccountId,
          status: 'IN_PROGRESS',
        },
      });

      try {
        // Get broker account with credentials
        const account = await prisma.brokerAccount.findUnique({
          where: { id: brokerAccountId },
        });

        if (!account) {
          throw new Error('Broker account not found');
        }

        const credentials = JSON.parse(decrypt(account.encryptedCredentials));

        // Update job progress
        await job.updateProgress(10);

        // Fetch trades from broker service
        const response = await brokerServiceClient.fetchTrades({
          brokerAccountId,
          credentials: {
            brokerType: account.brokerType,
            credentials,
          },
          fromDate: fromDate ? new Date(fromDate) : undefined,
          toDate: toDate ? new Date(toDate) : undefined,
        });

        await job.updateProgress(60);

        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch trades');
        }

        // Import trades
        let imported = 0;
        let failed = 0;

        for (const trade of response.trades) {
          try {
            await prisma.trade.upsert({
              where: {
                brokerAccountId_externalTradeId: {
                  brokerAccountId,
                  externalTradeId: trade.externalTradeId,
                },
              },
              update: {
                // Update if changed
                profit: trade.profit,
                commission: trade.commission,
                swap: trade.swap,
                rawData: trade.rawData,
              },
              create: {
                userId,
                brokerAccountId,
                externalTradeId: trade.externalTradeId,
                symbol: trade.symbol,
                tradeType: trade.tradeType,
                openTime: trade.openTime,
                closeTime: trade.closeTime,
                quantity: trade.quantity,
                openPrice: trade.openPrice,
                closePrice: trade.closePrice,
                profit: trade.profit,
                commission: trade.commission,
                swap: trade.swap,
                rawData: trade.rawData,
              },
            });
            imported++;
          } catch (error) {
            console.error(`Failed to import trade ${trade.externalTradeId}:`, error);
            failed++;
          }
        }

        await job.updateProgress(90);

        // Update sync log
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            tradesImported: imported,
            tradesFailed: failed,
          },
        });

        // Update broker account
        await prisma.brokerAccount.update({
          where: { id: brokerAccountId },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: 'COMPLETED',
          },
        });

        await job.updateProgress(100);

        return {
          success: true,
          imported,
          failed,
        };
      } catch (error: any) {
        // Update sync log with error
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage: error.message,
            errorDetails: {
              stack: error.stack,
              name: error.name,
            },
          },
        });

        // Update broker account
        await prisma.brokerAccount.update({
          where: { id: brokerAccountId },
          data: {
            lastSyncStatus: 'FAILED',
          },
        });

        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 5, // Process up to 5 syncs simultaneously
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Trade sync completed for job ${job.id}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`❌ Trade sync failed for job ${job?.id}:`, error);
  });

  return worker;
}