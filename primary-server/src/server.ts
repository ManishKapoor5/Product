import app from './app';
import { config } from '@config/env';
import { connectDatabase } from '@config/database';
import { redis } from '@config/redis';
import { createTradeSyncWorker } from '@jobs/processors/trade-sync.processor';

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Start BullMQ workers
    const tradeSyncWorker = createTradeSyncWorker();
    console.log('✅ BullMQ workers started');

    // Start Express server
    const PORT = parseInt(config.PORT);
    app.listen(PORT, () => {
      console.log(`🚀 Primary server running on port ${PORT}`);
      console.log(`📊 Environment: ${config.NODE_ENV}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      await tradeSyncWorker.close();
      await redis.quit();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();