// src/modules/trades/trades.service.ts

import { prisma } from '@config/database';
import { brokerServiceClient } from '@shared/clients/broker-service.client';
import { UpdateTrade, TradeQuery } from './trade.model';
import { Decimal } from '@prisma/client/runtime/library';

export class TradeService {
  /**
   * Sync trades from broker account
   */
  async syncTradesFromBroker(
    userId: string,
    brokerAccountId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<{ imported: number; updated: number; skipped: number }> {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 SYNCING TRADES FROM BROKER');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`User ID: ${userId}`);
    console.log(`Broker Account ID: ${brokerAccountId}`);
    console.log(`Date Range: ${fromDate?.toISOString() || 'All'} to ${toDate?.toISOString() || 'Now'}`);
    console.log('');

    // 1. Get broker account with credentials
    const brokerAccount = await prisma.brokerAccount.findFirst({
      where: {
        id: brokerAccountId,
        userId,
      },
    });

    if (!brokerAccount) {
      throw new Error('Broker account not found');
    }

    console.log(`✅ Found broker account: ${brokerAccount.displayName} (${brokerAccount.brokerType})`);

    // 2. Get credentials
    const credentials = brokerAccount.encryptedCredentials as any;
    
    console.log('📋 Broker credentials:');
    console.log(`   Server: ${credentials.server}`);
    console.log(`   Login: ${credentials.login}`);
    console.log(`   Has Password: ${!!credentials.password}`);
    console.log('');

    // 3. Fetch trades from broker
    console.log('⏳ Fetching trades from broker...\n');
    
    const response = await brokerServiceClient.fetchTrades({
      brokerAccountId: brokerAccount.id,
      credentials: {
        brokerType: brokerAccount.brokerType as any,
        credentials: credentials,
      },
      fromDate,
      toDate,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch trades from broker');
    }

    console.log(`\n✅ Fetched ${response.trades.length} trades from broker\n`);

    // 4. Save trades to database
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    console.log('💾 Saving trades to database...\n');

    for (const trade of response.trades) {
      try {
        // Check if trade already exists
        const existing = await prisma.trade.findFirst({
          where: {
            userId,
            brokerAccountId: brokerAccount.id,
            externalTradeId: trade.externalTradeId,
          },
        });

        if (existing) {
          // Update existing trade
          await prisma.trade.update({
            where: { id: existing.id },
            data: {
              symbol: trade.symbol,
              tradeType: trade.tradeType,
              openTime: trade.openTime,
              closeTime: trade.closeTime,
              quantity: trade.quantity,
              openPrice: trade.openPrice,
              closePrice: trade.closePrice,
              profit: trade.profit,
              commission: trade.commission,
              swap: trade.swap || 0,
              rawData: trade.rawData,
              updatedAt: new Date(),
            },
          });
          updated++;
          console.log(`   ✅ Updated: ${trade.symbol} ${trade.externalTradeId}`);
        } else {
          // Create new trade
          await prisma.trade.create({
            data: {
              userId,
              brokerAccountId: brokerAccount.id,
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
              swap: trade.swap || 0,
              rawData: trade.rawData,
            },
          });
          imported++;
          console.log(`   ✅ Imported: ${trade.symbol} ${trade.externalTradeId}`);
        }
      } catch (error: any) {
        console.error(`   ❌ Error saving trade ${trade.externalTradeId}:`, error.message);
        skipped++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SYNC COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Imported: ${imported}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return { imported, updated, skipped };
  }

  /**
   * Get trades with filtering and pagination
   */
  async getTrades(userId: string, query: TradeQuery) {
    const pageNum = parseInt(query.page);
    const limitNum = parseInt(query.limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId };

    if (query.brokerAccountId) {
      where.brokerAccountId = query.brokerAccountId;
    }

    if (query.symbol) {
      where.symbol = query.symbol;
    }

    if (query.fromDate || query.toDate) {
      where.closeTime = {};
      if (query.fromDate) where.closeTime.gte = new Date(query.fromDate);
      if (query.toDate) where.closeTime.lte = new Date(query.toDate);
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

    return {
      trades,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get single trade
   */
  async getTrade(userId: string, tradeId: string) {
    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId },
      include: {
        brokerAccount: true,
      },
    });

    if (!trade) {
      throw new Error('Trade not found');
    }

    return trade;
  }

  /**
   * Update trade (notes, tags)
   */
  async updateTrade(userId: string, tradeId: string, data: UpdateTrade) {
    const result = await prisma.trade.updateMany({
      where: { id: tradeId, userId },
      data: {
        notes: data.notes,
        tags: data.tags,
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new Error('Trade not found');
    }

    return { success: true };
  }

  /**
   * Delete trade
   */
  async deleteTrade(userId: string, tradeId: string) {
    const result = await prisma.trade.deleteMany({
      where: { id: tradeId, userId },
    });

    if (result.count === 0) {
      throw new Error('Trade not found');
    }

    return { success: true };
  }

  /**
   * Get trade statistics
   */
  async getTradeStats(userId: string, brokerAccountId?: string) {
    const where: any = { userId };
    if (brokerAccountId) {
      where.brokerAccountId = brokerAccountId;
    }

    const trades = await prisma.trade.findMany({ where });

    const totalTrades = trades.length;

    // ✅ Convert Decimal to number
    const totalProfit = trades.reduce((sum, t) => sum + this.toNumber(t.profit), 0);
    const totalCommission = trades.reduce((sum, t) => sum + this.toNumber(t.commission), 0);
    const totalSwap = trades.reduce((sum, t) => sum + this.toNumber(t.swap || 0), 0);
    const netProfit = totalProfit + totalCommission + totalSwap;

    const winningTrades = trades.filter((t) => this.toNumber(t.profit) > 0).length;
    const losingTrades = trades.filter((t) => this.toNumber(t.profit) < 0).length;
    const breakEvenTrades = trades.filter((t) => this.toNumber(t.profit) === 0).length;

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
      totalTrades,
      totalProfit,
      totalCommission,
      totalSwap,
      netProfit,
      winningTrades,
      losingTrades,
      breakEvenTrades,
      winRate,
    };
  }

  /**
   * Helper: Convert Prisma Decimal to number
   */
  private toNumber(value: number | Decimal | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (value instanceof Decimal) {
      return value.toNumber();
    }
    return Number(value);
  }
}

export const tradeService = new TradeService();