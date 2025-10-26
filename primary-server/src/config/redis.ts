import Redis from 'ioredis';
import { config } from './env';

export const redis = new Redis({
  host: config.REDIS_HOST,
  port: parseInt(config.REDIS_PORT),
  password: config.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ
});

redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

export const redisConnection = {
  host: config.REDIS_HOST,
  port: parseInt(config.REDIS_PORT),
  password: config.REDIS_PASSWORD,
};