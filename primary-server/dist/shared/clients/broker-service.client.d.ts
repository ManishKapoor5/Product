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
export declare class BrokerServiceClient {
    private client;
    constructor();
    /**
     * Test connection to broker account
     */
    testConnection(credentials: any): Promise<boolean>;
    /**
     * Fetch trades from broker account
     */
    fetchTrades(request: FetchTradesRequest): Promise<FetchTradesResponse>;
    /**
     * Sync trades from broker account
     */
    syncTrades(brokerAccountId: string, credentials: BrokerCredentials): Promise<FetchTradesResponse>;
}
export declare const brokerServiceClient: BrokerServiceClient;
//# sourceMappingURL=broker-service.client.d.ts.map