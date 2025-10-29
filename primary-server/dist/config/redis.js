"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConnection = exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
exports.redis = new ioredis_1.default({
    host: env_1.config.REDIS_HOST,
    port: parseInt(env_1.config.REDIS_PORT),
    password: env_1.config.REDIS_PASSWORD,
    maxRetriesPerRequest: null, // Required for BullMQ
});
exports.redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
});
exports.redis.on('error', (error) => {
    console.error('❌ Redis connection error:', error);
});
exports.redisConnection = {
    host: env_1.config.REDIS_HOST,
    port: parseInt(env_1.config.REDIS_PORT),
    password: env_1.config.REDIS_PASSWORD,
};
//# sourceMappingURL=redis.js.map