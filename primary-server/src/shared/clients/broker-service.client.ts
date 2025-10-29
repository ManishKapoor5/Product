// src/shared/clients/broker-service.client.ts

import axios, { AxiosInstance } from 'axios';
import { config } from '@config/env';
import { mt5ConnectorService, MT5Trade } from '@shared/services/mt5-connector.service';

export interface BrokerCredentials {
  brokerType: 'MT5' | 'MT4' | 'IBKR';
  credentials: {
    login?: string;
    password?: string;
    server?: string;
    accountId?: string;
    apiKey?: string;
  };
}

export interface FetchTradesRequest {
  brokerAccountId: string;
  credentials: BrokerCredentials;
  fromDate?: Date;
  toDate?: Date;
}

export interface NormalizedTrade {
  externalTradeId: string;
  symbol: string;
  tradeType: 'BUY' | 'SELL';
  openTime: Date;
  closeTime: Date;
  quantity: number;
  openPrice: number;
  closePrice: number;
  profit: number;
  commission: number;
  swap?: number;
  rawData: any;
}

export interface FetchTradesResponse {
  success: boolean;
  trades: NormalizedTrade[];
  error?: string;
}

export class BrokerServiceClient {
  private client: AxiosInstance;
  private pythonBridgeClient: AxiosInstance;
  private isDevelopment: boolean;
  private useMock: boolean;
  private useRealMT5: boolean;
  private usePythonBridge: boolean;

  constructor() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 INITIALIZING BROKER SERVICE CLIENT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.useMock = process.env.USE_MOCK_BROKER === 'true';
    this.useRealMT5 = process.env.USE_REAL_MT5 === 'true';
    this.usePythonBridge = process.env.USE_PYTHON_MT5_BRIDGE === 'true';

    console.log('Environment Variables:');
    console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`  USE_MOCK_BROKER: ${process.env.USE_MOCK_BROKER}`);
    console.log(`  USE_REAL_MT5: ${process.env.USE_REAL_MT5}`);
    console.log(`  USE_PYTHON_MT5_BRIDGE: ${process.env.USE_PYTHON_MT5_BRIDGE}`);
    console.log(`  MT5_BRIDGE_URL: ${process.env.MT5_BRIDGE_URL || 'http://localhost:5000'}`);
    console.log('\nParsed Configuration:');
    console.log(`  isDevelopment: ${this.isDevelopment}`);
    console.log(`  useMock: ${this.useMock}`);
    console.log(`  useRealMT5 (MetaAPI): ${this.useRealMT5}`);
    console.log(`  usePythonBridge (FREE): ${this.usePythonBridge}`);
    console.log(`  Broker Service URL: ${config.BROKER_SERVICE_URL}`);

    // External broker service client
    this.client = axios.create({
      baseURL: config.BROKER_SERVICE_URL,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.BROKER_SERVICE_API_KEY,
      },
    });

    // ✅ Python MT5 Bridge client (FREE alternative)
    this.pythonBridgeClient = axios.create({
      baseURL: process.env.MT5_BRIDGE_URL || 'http://localhost:5000',
      timeout: 120000, // 2 minutes for large history fetches
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('\n🎯 Active Strategy:');
    if (this.usePythonBridge) {
      console.log('   ✅ Python MT5 Bridge (FREE) - Recommended');
    } else if (this.useRealMT5) {
      console.log('   💰 MetaAPI (PAID) - Requires credits');
    } else if (this.useMock) {
      console.log('   🔧 Mock Mode - For testing');
    } else {
      console.log('   🌐 External Broker Service');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Test connection to broker account
   */
  async testConnection(credentials: any): Promise<boolean> {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔌 TEST CONNECTION REQUEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Credentials:');
    console.log(`  brokerType: ${credentials.brokerType}`);
    console.log(`  server: ${credentials.server || credentials.credentials?.server}`);
    console.log(`  login: ${credentials.login || credentials.credentials?.login}`);
    console.log('\nConnection Strategy:');
    console.log(`  usePythonBridge: ${this.usePythonBridge}`);
    console.log(`  useRealMT5 (MetaAPI): ${this.useRealMT5}`);
    console.log(`  useMock: ${this.useMock}`);
    console.log('');

    // ✅ Priority 1: Use Python MT5 Bridge (FREE)
    if (this.usePythonBridge && credentials.brokerType === 'MT5') {
      console.log('✅ Using PYTHON MT5 BRIDGE (FREE)\n');
      try {
        const response = await this.pythonBridgeClient.post('/connect', {
          login: credentials.login || credentials.credentials?.login,
          password: credentials.password || credentials.credentials?.password,
          server: credentials.server || credentials.credentials?.server,
        });

        if (response.data.success) {
          console.log('✅ Python Bridge connection SUCCESSFUL');
          console.log(`   Account: ${response.data.data?.login}`);
          console.log(`   Balance: ${response.data.data?.balance} ${response.data.data?.currency}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          return true;
        }

        throw new Error(response.data.error || 'Connection failed');
      } catch (error: any) {
        console.error('❌ Python Bridge connection failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
          console.error('\n⚠️  Python MT5 Bridge is not running!');
          console.error('   Start it with: python mt5_bridge.py');
          console.error('   Or set USE_PYTHON_MT5_BRIDGE=false in .env\n');
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        throw new Error(`MT5 Bridge connection failed: ${error.response?.data?.error || error.message}`);
      }
    }

    // Priority 2: Use MetaAPI (PAID)
    if (this.useRealMT5 && credentials.brokerType === 'MT5') {
      console.log('💰 Using MetaAPI (PAID)\n');
      try {
        return await mt5ConnectorService.testConnection({
          server: credentials.server || credentials.credentials?.server,
          login: credentials.login || credentials.credentials?.login,
          password: credentials.password || credentials.credentials?.password,
        });
      } catch (error: any) {
        console.error('❌ MetaAPI connection test failed:', error.message);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        throw error;
      }
    }

    // Priority 3: Mock mode
    if (this.useMock) {
      console.log('🔧 [MOCK MODE] Simulating connection test...');
      console.log('✅ Mock connection test PASSED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return true;
    }

    // Priority 4: External broker service
    console.log('⏳ Calling external broker service...\n');
    try {
      const response = await this.client.post('/test-connection', credentials, {
        timeout: 5000,
      });
      console.log('✅ External broker service responded');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return response.data.success;
    } catch (error: any) {
      console.error('❌ External broker service failed:', error.message);

      if (this.isDevelopment) {
        console.warn('⚠️  Development mode: Falling back to mock');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return true;
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  /**
   * Fetch trades from broker account
   */
  async fetchTrades(request: FetchTradesRequest): Promise<FetchTradesResponse> {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 FETCH TRADES REQUEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Request Details:');
    console.log(`  brokerAccountId: ${request.brokerAccountId}`);
    console.log(`  brokerType: ${request.credentials.brokerType}`);
    console.log(`  server: ${request.credentials.credentials.server}`);
    console.log(`  login: ${request.credentials.credentials.login}`);
    console.log(`  fromDate: ${request.fromDate?.toISOString() || 'N/A'}`);
    console.log(`  toDate: ${request.toDate?.toISOString() || 'N/A'}`);
    console.log('\nClient Configuration:');
    console.log(`  usePythonBridge: ${this.usePythonBridge}`);
    console.log(`  useRealMT5 (MetaAPI): ${this.useRealMT5}`);
    console.log(`  useMock: ${this.useMock}`);
    console.log(`  isDevelopment: ${this.isDevelopment}`);
    console.log('\nStrategy Decision:');
    const willUsePythonBridge = this.usePythonBridge && request.credentials.brokerType === 'MT5';
    const willUseMetaAPI = !this.usePythonBridge && this.useRealMT5 && request.credentials.brokerType === 'MT5';
    console.log(`  Will use Python Bridge: ${willUsePythonBridge}`);
    console.log(`  Will use MetaAPI: ${willUseMetaAPI}`);
    console.log('');

    // ✅ Priority 1: Use Python MT5 Bridge (FREE)
    if (this.usePythonBridge && request.credentials.brokerType === 'MT5') {
      console.log('✅ USING PYTHON MT5 BRIDGE (FREE)\n');
      
      try {
        const response = await this.pythonBridgeClient.post('/trades', {
          credentials: {
            login: request.credentials.credentials.login,
            password: request.credentials.credentials.password,
            server: request.credentials.credentials.server,
          },
          fromDate: request.fromDate?.toISOString() || '2020-01-01T00:00:00',
          toDate: request.toDate?.toISOString() || new Date().toISOString(),
        });

        if (!response.data.success) {
          throw new Error(response.data.error || 'Failed to fetch trades from Python Bridge');
        }

        console.log(`📦 Received ${response.data.trades.length} trades from Python Bridge`);

        // Convert to normalized format
        const normalizedTrades: NormalizedTrade[] = response.data.trades.map((trade: any) => ({
          externalTradeId: trade.externalTradeId,
          symbol: trade.symbol,
          tradeType: trade.tradeType,
          openTime: new Date(trade.openTime),
          closeTime: new Date(trade.closeTime),
          quantity: trade.quantity,
          openPrice: trade.openPrice,
          closePrice: trade.closePrice,
          profit: trade.profit,
          commission: trade.commission,
          swap: trade.swap || 0,
          rawData: {
            ...trade.rawData,
            source: 'Python-MT5-Bridge',
            fetchedAt: new Date().toISOString(),
          },
        }));

        console.log(`✅ Successfully fetched ${normalizedTrades.length} trades from Python Bridge`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return {
          success: true,
          trades: normalizedTrades,
        };

      } catch (error: any) {
        console.error('❌ Python Bridge fetch failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
          console.error('\n⚠️  Python MT5 Bridge is not running!');
          console.error('   Start it with: python mt5_bridge.py');
          console.error('   Or set USE_PYTHON_MT5_BRIDGE=false in .env\n');
          throw new Error('Python MT5 Bridge is not running. Start it with: python mt5_bridge.py');
        }
        
        console.error('Stack:', error.stack);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        throw new Error(`Python Bridge fetch failed: ${error.response?.data?.error || error.message}`);
      }
    }

    // Priority 2: Use MetaAPI (PAID)
    if (this.useRealMT5 && request.credentials.brokerType === 'MT5') {
      console.log('💰 USING MetaAPI (PAID)\n');
      
      try {
        const mt5Trades = await mt5ConnectorService.fetchTrades(
          {
            server: request.credentials.credentials.server!,
            login: request.credentials.credentials.login!,
            password: request.credentials.credentials.password!,
          },
          request.fromDate,
          request.toDate
        );

        console.log('🔄 Converting MT5 trades to normalized format...');
        const normalizedTrades: NormalizedTrade[] = mt5Trades.map((trade) => ({
          externalTradeId: trade.ticket,
          symbol: trade.symbol,
          tradeType: trade.type,
          openTime: trade.openTime,
          closeTime: trade.closeTime,
          quantity: trade.volume,
          openPrice: trade.openPrice,
          closePrice: trade.closePrice,
          profit: trade.profit,
          commission: trade.commission,
          swap: trade.swap,
          rawData: {
            ticket: trade.ticket,
            realMT5Data: true,
            source: 'MetaAPI',
            broker: request.credentials.credentials.server,
            fetchedAt: new Date().toISOString(),
          },
        }));

        console.log(`✅ Successfully fetched ${normalizedTrades.length} trades from MetaAPI`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return {
          success: true,
          trades: normalizedTrades,
        };

      } catch (error: any) {
        console.error('❌ MetaAPI fetch failed:', error.message);
        console.error('Stack:', error.stack);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        throw error;
      }
    }

    // Priority 3: Mock mode
    if (this.useMock) {
      console.log('🔧 [MOCK MODE] Returning empty trades');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return {
        success: true,
        trades: [],
      };
    }

    // Priority 4: External broker service
    console.log('⏳ Calling external broker service...\n');
    try {
      const response = await this.client.post<FetchTradesResponse>(
        '/api/broker/fetch-trades',
        {
          brokerAccountId: request.brokerAccountId,
          brokerType: request.credentials.brokerType,
          credentials: request.credentials.credentials,
          fromDate: request.fromDate?.toISOString(),
          toDate: request.toDate?.toISOString(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Unknown error from broker service');
      }

      console.log(`✅ External broker service returned ${response.data.trades.length} trades`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return response.data;
    } catch (error: any) {
      console.error('❌ External broker service error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const errorMsg = error.response?.data?.error || error.message;
      throw new Error(`Failed to fetch trades: ${errorMsg}`);
    }
  }

  /**
   * Check Python Bridge health
   */
  async checkPythonBridgeHealth(): Promise<boolean> {
    if (!this.usePythonBridge) {
      return false;
    }

    try {
      const response = await this.pythonBridgeClient.get('/health', {
        timeout: 3000,
      });
      return response.data.status === 'ok';
    } catch (error) {
      return false;
    }
  }

  async syncTrades(brokerAccountId: string, credentials: BrokerCredentials): Promise<FetchTradesResponse> {
    return this.fetchTrades({ brokerAccountId, credentials });
  }
}

export const brokerServiceClient = new BrokerServiceClient();