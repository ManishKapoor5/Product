"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("@modules/auth/auth.middleware");
const broker_service_1 = require("./broker.service");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Validation schemas
const createBrokerAccountSchema = zod_1.z.object({
    brokerType: zod_1.z.enum(['MT5', 'MT4', 'IBKR']),
    accountNumber: zod_1.z.string(),
    displayName: zod_1.z.string().optional(),
    credentials: zod_1.z.object({
        username: zod_1.z.string().optional(),
        password: zod_1.z.string().optional(),
        server: zod_1.z.string().optional(),
        login: zod_1.z.string().optional(),
        accountId: zod_1.z.string().optional(),
        apiKey: zod_1.z.string().optional(),
    }),
});
const updateBrokerAccountSchema = zod_1.z.object({
    displayName: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
    credentials: zod_1.z.object({}).optional(),
});
// Get all broker accounts
router.get('/', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await broker_service_1.brokerService.getBrokerAccounts(userId);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get specific broker account by ID
router.get('/:accountId', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { accountId } = req.params;
        const result = await broker_service_1.brokerService.getBrokerAccountById(userId, accountId);
        res.json(result);
    }
    catch (error) {
        res.status(404).json({ success: false, error: error.message });
    }
});
// Create broker account
router.post('/', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const validatedData = createBrokerAccountSchema.parse(req.body);
        const result = await broker_service_1.brokerService.createBrokerAccount({
            userId,
            ...validatedData,
        });
        res.status(201).json(result);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
        }
        res.status(400).json({ success: false, error: error.message });
    }
});
// Update broker account
router.patch('/:accountId', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { accountId } = req.params;
        const validatedData = updateBrokerAccountSchema.parse(req.body);
        const result = await broker_service_1.brokerService.updateBrokerAccount(accountId, userId, validatedData);
        res.json(result);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
        }
        res.status(400).json({ success: false, error: error.message });
    }
});
// Delete broker account
router.delete('/:accountId', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { accountId } = req.params;
        const result = await broker_service_1.brokerService.deleteBrokerAccount(accountId, userId);
        res.json(result);
    }
    catch (error) {
        res.status(404).json({ success: false, error: error.message });
    }
});
// Test broker connection
router.post('/:accountId/test', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { accountId } = req.params;
        const result = await broker_service_1.brokerService.testConnection(accountId, userId);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=broker.controller.js.map