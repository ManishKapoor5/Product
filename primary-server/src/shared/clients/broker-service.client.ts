import axios, { AxiosInstance } from 'axios';
import { config } from '@config/env';

export interface BrokerCredentials {
  brokerType: 'MT5' | 'MT4' | 'IBKR';
  credentials: {
    // MT5/MT4
    login?: string;
    password?: string;
    server?: string;
    
    // IBKR
    accountId?: string;
    apiKey?: string;
    // ... other fields
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

export interface TestConnectionRequest {
  credentials: BrokerCredentials;
}

export interface TestConnectionResponse {
  success: boolean;
  accountInfo?: {
    accountNumber: string;
    balance: number;
    currency: string;
  };
  error?: string;
}

export class BrokerServiceClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.BROKER_SERVICE_URL,
      timeout: 60000, // 60 seconds for broker operations
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.BROKER_SERVICE_API_KEY,
      },
    });
  }

  /**
   * Test connection to broker account
   */
  async testConnection(credentials: any): Promise<boolean> {
    // Skip validation in development if broker service is not available
    if (process.env.NODE_ENV === 'development') {
      try {
        const response = await this.client.post('/test-connection', credentials, {
          timeout: 3000, // 3 second timeout
        });
        return response.data.success;
      } catch (error) {
        console.warn('⚠️  Broker service not available, skipping validation');
        return true; // Allow creation in development without validation
      }
    }
    
    const response = await this.client.post('/test-connection', credentials);
    return response.data.success;
  }

  /**
   * Fetch trades from broker account
   */
  async fetchTrades(request: FetchTradesRequest): Promise<FetchTradesResponse> {
    try {
      const response = await this.client.post<FetchTradesResponse>(
        '/api/broker/fetch-trades',
        request
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching trades from broker service:', error.message);
      throw new Error(`Failed to fetch trades: ${error.message}`);
    }
  }

  /**
   * Sync trades from broker account
   */
  async syncTrades(brokerAccountId: string, credentials: BrokerCredentials): Promise<FetchTradesResponse> {
    try {
      const response = await this.client.post<FetchTradesResponse>(
        '/api/broker/sync-trades',
        { brokerAccountId, credentials }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error syncing trades from broker service:', error.message);
      throw new Error(`Failed to sync trades: ${error.message}`);
    }
  }
}

// Export singleton instance
export const brokerServiceClient = new BrokerServiceClient();