// src/shared/services/mt5-connector.service.ts

import MetaApi, { MetatraderAccount } from 'metaapi.cloud-sdk';

export interface MT5Credentials {
  server: string;
  login: string;
  password: string;
  metaApiAccountId?: string;
}

export interface MT5Trade {
  ticket: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  openTime: Date;
  closeTime: Date;
  volume: number;
  openPrice: number;
  closePrice: number;
  profit: number;
  commission: number;
  swap: number;
}

export class MT5ConnectorService {
  private metaapi: MetaApi | null = null;
  private isEnabled: boolean;

  constructor() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 INITIALIZING MT5 CONNECTOR SERVICE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const token = process.env.METAAPI_TOKEN;
    
    console.log('Environment Check:');
    console.log(`  METAAPI_TOKEN: ${token ? `✅ SET (${token.substring(0, 15)}...)` : '❌ NOT SET'}`);
    console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`  USE_REAL_MT5: ${process.env.USE_REAL_MT5}`);
    
    if (!token) {
      console.warn('\n⚠️  METAAPI_TOKEN not set - MT5 real connection DISABLED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      this.isEnabled = false;
      return;
    }

    this.isEnabled = true;
    this.metaapi = new MetaApi(token);
    console.log('✅ MetaAPI initialized successfully');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Test connection to MT5 account
   */
  async testConnection(credentials: MT5Credentials): Promise<boolean> {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔌 TESTING MT5 CONNECTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (!this.isEnabled || !this.metaapi) {
      console.error('❌ MetaAPI not configured');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      throw new Error('MetaAPI not configured. Set METAAPI_TOKEN in .env');
    }

    console.log('Credentials:');
    console.log(`  Server: ${credentials.server}`);
    console.log(`  Login: ${credentials.login}`);
    console.log(`  Password: ${credentials.password ? '***SET***' : '❌ MISSING'}`);

    let account: MetatraderAccount | null = null;

    try {
      console.log(`\n⏳ Creating temporary test account...`);

      account = await this.metaapi.metatraderAccountApi.createAccount({
        name: `test-${Date.now()}`,
        type: 'cloud-g1' as any,
        login: credentials.login,
        password: credentials.password,
        server: credentials.server,
        platform: 'mt5',
        magic: 0,
      });

      console.log(`✅ Account created: ${account.id}`);

      console.log('⏳ Deploying account...');
      await account.deploy();
      
      console.log('⏳ Waiting for deployment (this may take 30-60 seconds)...');
      await account.waitDeployed();
      
      console.log('✅ MT5 connection test SUCCESSFUL!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return true;

    } catch (error: any) {
      console.error('\n❌ MT5 connection test FAILED');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      if (error.message.includes('authentication')) {
        throw new Error('Invalid MT5 credentials (wrong login/password)');
      } else if (error.message.includes('server')) {
        throw new Error('Invalid MT5 server address');
      } else if (error.message.includes('timeout')) {
        throw new Error('Connection timeout - MT5 server not responding');
      }
      
      throw new Error(`MT5 connection failed: ${error.message}`);
      
    } finally {
      if (account) {
        try {
          console.log('🧹 Cleaning up test account...');
          await account.undeploy();
          await account.remove();
          console.log('✅ Cleanup complete\n');
        } catch (err) {
          console.error('⚠️  Error during cleanup:', err);
        }
      }
    }
  }

  /**
   * Fetch trades from MT5 account
   */
  async fetchTrades(
    credentials: MT5Credentials,
    fromDate?: Date,
    toDate?: Date
  ): Promise<MT5Trade[]> {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 FETCHING MT5 TRADES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (!this.isEnabled || !this.metaapi) {
      console.error('❌ MetaAPI not configured');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      throw new Error('MetaAPI not configured. Set METAAPI_TOKEN in .env');
    }

    console.log('Connection Details:');
    console.log(`  Server: ${credentials.server}`);
    console.log(`  Login: ${credentials.login}`);
    console.log(`  Password: ${credentials.password ? '***SET***' : '❌ MISSING'}`);
    console.log('Date Range:');
    console.log(`  From: ${fromDate ? fromDate.toISOString() : 'Beginning of time'}`);
    console.log(`  To: ${toDate ? toDate.toISOString() : 'Now'}`);
    console.log('');

    let account: MetatraderAccount | null = null;
    let connection: any = null; // ✅ Use 'any' to avoid TypeScript issues
    let shouldCleanup = false;

    try {
      const accountName = `mt5-${credentials.login}-${Date.now()}`;
      
      console.log('⏳ Step 1/6: Creating MetaAPI account...');
      account = await this.metaapi.metatraderAccountApi.createAccount({
        name: accountName,
        type: 'cloud-g1' as any,
        login: credentials.login,
        password: credentials.password,
        server: credentials.server,
        platform: 'mt5',
        magic: 0,
      });
      shouldCleanup = true;
      console.log(`✅ Account created: ${account.id}`);

      if (account.state !== 'DEPLOYED') {
        console.log('⏳ Step 2/6: Deploying account...');
        await account.deploy();
        await account.waitDeployed();
        console.log('✅ Account deployed');
      } else {
        console.log('✅ Step 2/6: Account already deployed');
      }

      console.log('⏳ Step 3/6: Establishing streaming connection...');
      connection = account.getStreamingConnection();
      await connection.connect();
      console.log('✅ Connection established');
      
      console.log('⏳ Step 4/6: Synchronizing account data (30-60 seconds)...');
      await connection.waitSynchronized();
      console.log('✅ Account synchronized');

      // Get account information
      console.log('\n📈 Account Information:');
      try {
        const terminalState = connection.terminalState;
        const accountInfo = terminalState.accountInformation;
        if (accountInfo) {
          console.log(`  Balance: ${accountInfo.balance} ${accountInfo.currency}`);
          console.log(`  Equity: ${accountInfo.equity}`);
          console.log(`  Margin: ${accountInfo.margin || 0}`);
          console.log(`  Free Margin: ${accountInfo.freeMargin || 0}`);
        } else {
          console.log('  ⚠️  Account info not available');
        }
      } catch (err) {
        console.log('  ℹ️  Account info not loaded yet');
      }

      console.log('\n⏳ Step 5/6: Loading trade history...');
      const historyStorage = connection.historyStorage;
      
      console.log('   Waiting 5 seconds for initial history load...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // ✅ Access deals and orders safely
      let deals: any[] = historyStorage.deals || [];
      let orders: any[] = historyStorage.orders || [];

      console.log(`   📊 Initial deals loaded: ${deals.length}`);

      if (deals.length === 0) {
        console.log('   ℹ️  No deals yet, waiting additional 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        deals = historyStorage.deals || [];
        orders = historyStorage.orders || [];
        
        console.log(`   📊 Deals after extended wait: ${deals.length}`);
      }

      // Additional diagnostics
      console.log('\n📊 History Storage Analysis:');
      try {
        console.log(`   Last history order time: ${historyStorage.lastHistoryOrderTime || 'N/A'}`);
        console.log(`   Last deal time: ${historyStorage.lastDealTime || 'N/A'}`);
      } catch (e) {
        console.log('   ⚠️  Could not access history timestamps');
      }
      
      console.log(`   Orders: ${orders.length}`);
      console.log(`   Deals: ${deals.length}`);

      if (deals.length === 0) {
        console.log('\n⚠️  NO DEALS FOUND - Possible Reasons:');
        console.log('   1. Account has no trading history');
        console.log('   2. Account is brand new (no closed trades yet)');
        console.log('   3. All positions are still open (check terminal)');
        console.log('   4. MetaAPI subscription tier limitation');
        console.log('   5. Broker server not providing historical data');
        
        // Check for open positions
        try {
          const positions = connection.terminalState.positions || [];
          console.log(`\n   Open positions found: ${positions.length}`);
          if (positions.length > 0) {
            console.log('   ℹ️  You have open positions. Close them to see closed trades.');
            console.log('\n   Sample open position:');
            console.log('   ', JSON.stringify(positions[0], null, 2));
          }
        } catch (e) {
          console.log('   ⚠️  Could not access positions');
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return [];
      }

      // Analyze deal types
      console.log('\n📊 Deal Analysis:');
      const dealTypes: Record<string, number> = {};
      const entryTypes: Record<string, number> = {};
      
      deals.forEach((deal: any) => {
        if (deal.type) {
          dealTypes[deal.type] = (dealTypes[deal.type] || 0) + 1;
        }
        if (deal.entryType) {
          entryTypes[deal.entryType] = (entryTypes[deal.entryType] || 0) + 1;
        }
      });
      
      console.log('   Deal types:', dealTypes);
      console.log('   Entry types:', entryTypes);

      // Show sample deal
      if (deals.length > 0) {
        console.log('\n   Sample deal (first):');
        const sampleDeal = {
          positionId: deals[0].positionId,
          symbol: deals[0].symbol,
          type: deals[0].type,
          entryType: deals[0].entryType,
          time: deals[0].time,
          volume: deals[0].volume,
          price: deals[0].price,
          profit: deals[0].profit,
        };
        console.log('   ', JSON.stringify(sampleDeal, null, 2));
      }

      // Filter by date range
      console.log('\n⏳ Step 6/6: Filtering and converting trades...');
      let filteredDeals = deals;
      if (fromDate || toDate) {
        filteredDeals = deals.filter((deal: any) => {
          if (!deal.time) return false;
          const dealTime = new Date(deal.time);
          if (fromDate && dealTime < fromDate) return false;
          if (toDate && dealTime > toDate) return false;
          return true;
        });
        console.log(`   Filtered to ${filteredDeals.length} deals in date range`);
      }

      const trades = this.convertDealsToTrades(filteredDeals);
      
      console.log('\n✅ FETCH COMPLETE');
      console.log(`   Total closed positions: ${trades.length}`);
      if (trades.length > 0) {
        const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
        console.log(`   Total profit: ${totalProfit.toFixed(2)}`);
        
        console.log('\n   First trade:');
        console.log('   ', JSON.stringify(trades[0], null, 2));
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return trades;

    } catch (error: any) {
      console.error('\n❌ FETCH TRADES FAILED');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      throw new Error(`MT5 fetch failed: ${error.message}`);
      
    } finally {
      if (connection) {
        try {
          console.log('🔌 Closing connection...');
          await connection.close();
        } catch (err) {
          console.error('⚠️  Error closing connection:', err);
        }
      }
      
      if (account && shouldCleanup) {
        try {
          console.log('🧹 Cleaning up MT5 account...');
          await account.undeploy();
          await account.remove();
          console.log('✅ Cleanup complete\n');
        } catch (err) {
          console.error('⚠️  Cleanup error:', err);
        }
      }
    }
  }

  /**
   * Convert MT5 deals to normalized trades
   */
  private convertDealsToTrades(deals: any[]): MT5Trade[] {
    console.log('\n🔄 Converting deals to trades...');
    
    const positionMap = new Map<string, any[]>();

    deals.forEach((deal: any) => {
      // Skip balance operations and deals without position ID
      if (!deal.positionId || deal.type === 'DEAL_TYPE_BALANCE' || deal.type === 'DEAL_TYPE_CREDIT') {
        return;
      }

      if (!positionMap.has(deal.positionId)) {
        positionMap.set(deal.positionId, []);
      }
      positionMap.get(deal.positionId)!.push(deal);
    });

    console.log(`   Found ${positionMap.size} unique positions`);

    const trades: MT5Trade[] = [];
    let skippedOpen = 0;

    positionMap.forEach((positionDeals, positionId) => {
      // Sort by time
      positionDeals.sort((a: any, b: any) => {
        const timeA = new Date(a.time || 0).getTime();
        const timeB = new Date(b.time || 0).getTime();
        return timeA - timeB;
      });

      const openDeal = positionDeals[0];
      const closeDeal = positionDeals[positionDeals.length - 1];

      // Check if position is closed (has both entry and exit)
      const hasEntry = positionDeals.some((d: any) => d.entryType === 'DEAL_ENTRY_IN');
      const hasExit = positionDeals.some((d: any) => d.entryType === 'DEAL_ENTRY_OUT');

      if (hasEntry && hasExit) {
        // Calculate totals
        const totalProfit = positionDeals.reduce((sum: number, d: any) => sum + (d.profit || 0), 0);
        const totalCommission = positionDeals.reduce((sum: number, d: any) => sum + (d.commission || 0), 0);
        const totalSwap = positionDeals.reduce((sum: number, d: any) => sum + (d.swap || 0), 0);

        // Determine trade type
        let tradeType: 'BUY' | 'SELL' = 'BUY';
        if (openDeal.type === 'DEAL_TYPE_SELL') {
          tradeType = 'SELL';
        } else if (openDeal.type === 'DEAL_TYPE_BUY') {
          tradeType = 'BUY';
        }

        trades.push({
          ticket: positionId,
          symbol: openDeal.symbol || 'UNKNOWN',
          type: tradeType,
          openTime: new Date(openDeal.time || Date.now()),
          closeTime: new Date(closeDeal.time || Date.now()),
          volume: openDeal.volume || 0,
          openPrice: openDeal.price || 0,
          closePrice: closeDeal.price || 0,
          profit: totalProfit,
          commission: totalCommission,
          swap: totalSwap,
        });
      } else {
        skippedOpen++;
      }
    });

    if (skippedOpen > 0) {
      console.log(`   ℹ️  Skipped ${skippedOpen} open positions (not closed yet)`);
    }
    console.log(`   ✅ Converted ${trades.length} closed positions to trades`);

    return trades;
  }
}

export const mt5ConnectorService = new MT5ConnectorService();