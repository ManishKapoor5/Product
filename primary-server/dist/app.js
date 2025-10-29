"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("express-async-errors");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("@config/env");
// Import routers
const auth_routes_1 = __importDefault(require("@modules/auth/auth.routes"));
const broker_controller_1 = __importDefault(require("@modules/brokers/broker.controller"));
const trade_controller_1 = __importDefault(require("@modules/trades/trade.controller"));
const sync_controller_1 = __importDefault(require("@modules/sync/sync.controller"));
const app = (0, express_1.default)();
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: env_1.config.CORS_ORIGIN, credentials: true }));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/brokers', broker_controller_1.default);
app.use('/api/trades', trade_controller_1.default);
app.use('/api/sync', sync_controller_1.default);
// 404 Handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});
// Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    if (err.name === 'ZodError') {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            details: err.errors,
        });
    }
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(env_1.config.NODE_ENV === 'development' && { stack: err.stack }),
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map