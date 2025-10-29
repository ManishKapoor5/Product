"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = exports.rateLimit = exports.authorizeBrokerAccount = exports.authorizeOwner = exports.optionalAuth = exports.authenticate = exports.AuthMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AuthMiddleware {
    /**
     * Verify JWT token and attach user to request
     */
    static authenticate = async (req, res, next) => {
        try {
            const token = AuthMiddleware.extractToken(req);
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            // Optionally verify user still exists in database
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true }
            });
            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }
            // Attach user info to request
            req.user = {
                userId: user.id,
                email: user.email
            };
            next();
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                return res.status(401).json({ error: 'Token expired' });
            }
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                return res.status(401).json({ error: 'Invalid token' });
            }
            return res.status(500).json({ error: 'Token verification failed' });
        }
    };
    /**
     * Optional auth - continues even if no valid token
     */
    static optionalAuth = async (req, res, next) => {
        try {
            const token = AuthMiddleware.extractToken(req);
            if (token) {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                const user = await prisma.user.findUnique({
                    where: { id: decoded.userId },
                    select: { id: true, email: true }
                });
                if (user) {
                    req.user = {
                        userId: user.id,
                        email: user.email
                    };
                }
            }
            next();
        }
        catch (error) {
            // Continue without user
            next();
        }
    };
    /**
     * Check if user owns the resource (for broker accounts, trades, etc.)
     */
    static authorizeOwner = (resourceUserIdParam = 'userId') => {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const resourceUserId = req.params[resourceUserIdParam] || req.body.userId;
            if (req.user.userId !== resourceUserId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            next();
        };
    };
    /**
     * Verify user owns a broker account
     */
    static authorizeBrokerAccount = async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const brokerAccountId = req.params.brokerAccountId || req.body.brokerAccountId;
            if (!brokerAccountId) {
                return res.status(400).json({ error: 'Broker account ID required' });
            }
            const brokerAccount = await prisma.brokerAccount.findUnique({
                where: { id: brokerAccountId },
                select: { userId: true }
            });
            if (!brokerAccount) {
                return res.status(404).json({ error: 'Broker account not found' });
            }
            if (brokerAccount.userId !== req.user.userId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            next();
        }
        catch (error) {
            res.status(500).json({ error: 'Authorization failed' });
        }
    };
    /**
     * Extract token from Authorization header or query parameter
     */
    static extractToken(req) {
        // Check Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        // Check query parameter (useful for WebSocket connections)
        if (req.query.token && typeof req.query.token === 'string') {
            return req.query.token;
        }
        return null;
    }
    /**
     * Rate limiting middleware (optional)
     */
    static rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
        const requests = new Map();
        return (req, res, next) => {
            const identifier = req.user?.userId || req.ip || 'anonymous';
            ;
            const now = Date.now();
            const userRequests = requests.get(identifier);
            if (!userRequests || now > userRequests.resetTime) {
                requests.set(identifier, {
                    count: 1,
                    resetTime: now + windowMs
                });
                return next();
            }
            if (userRequests.count >= maxRequests) {
                return res.status(429).json({
                    error: 'Too many requests',
                    retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
                });
            }
            userRequests.count++;
            next();
        };
    };
}
exports.AuthMiddleware = AuthMiddleware;
// Export individual middleware functions for convenience
exports.authenticate = AuthMiddleware.authenticate;
exports.optionalAuth = AuthMiddleware.optionalAuth;
exports.authorizeOwner = AuthMiddleware.authorizeOwner;
exports.authorizeBrokerAccount = AuthMiddleware.authorizeBrokerAccount;
exports.rateLimit = AuthMiddleware.rateLimit;
exports.authMiddleware = AuthMiddleware.authenticate;
//# sourceMappingURL=auth.middleware.js.map