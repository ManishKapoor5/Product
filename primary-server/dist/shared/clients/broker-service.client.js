"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.brokerServiceClient = exports.BrokerServiceClient = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("@config/env");
class BrokerServiceClient {
    client;
    constructor() {
        this.client = axios_1.default.create({
            baseURL: env_1.config.BROKER_SERVICE_URL,
            timeout: 60000, // 60 seconds for broker operations
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': env_1.config.BROKER_SERVICE_API_KEY,
            },
        });
    }
    /**
     * Test connection to broker account
     */
    async testConnection(credentials) {
        // Skip validation in development if broker service is not available
        if (process.env.NODE_ENV === 'development') {
            try {
                const response = await this.client.post('/test-connection', credentials, {
                    timeout: 3000, // 3 second timeout
                });
                return response.data.success;
            }
            catch (error) {
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
    async fetchTrades(request) {
        try {
            const response = await this.client.post('/api/broker/fetch-trades', request);
            return response.data;
        }
        catch (error) {
            console.error('Error fetching trades from broker service:', error.message);
            throw new Error(`Failed to fetch trades: ${error.message}`);
        }
    }
    /**
     * Sync trades from broker account
     */
    async syncTrades(brokerAccountId, credentials) {
        try {
            const response = await this.client.post('/api/broker/sync-trades', { brokerAccountId, credentials });
            return response.data;
        }
        catch (error) {
            console.error('Error syncing trades from broker service:', error.message);
            throw new Error(`Failed to sync trades: ${error.message}`);
        }
    }
}
exports.BrokerServiceClient = BrokerServiceClient;
// Export singleton instance
exports.brokerServiceClient = new BrokerServiceClient();
//# sourceMappingURL=broker-service.client.js.map