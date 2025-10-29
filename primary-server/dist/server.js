"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("@config/env");
const database_1 = require("@config/database");
const redis_1 = require("@config/redis");
const trade_sync_processor_1 = require("@jobs/processors/trade-sync.processor");
async function startServer() {
    try {
        // Connect to database
        await (0, database_1.connectDatabase)();
        // Start BullMQ workers
        const tradeSyncWorker = (0, trade_sync_processor_1.createTradeSyncWorker)();
        console.log('✅ BullMQ workers started');
        // Start Express server
        const PORT = parseInt(env_1.config.PORT);
        app_1.default.listen(PORT, () => {
            console.log(`🚀 Primary server running on port ${PORT}`);
            console.log(`📊 Environment: ${env_1.config.NODE_ENV}`);
        });
        // Graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('SIGTERM received, shutting down gracefully...');
            await tradeSyncWorker.close();
            await redis_1.redis.quit();
            process.exit(0);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map