"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
class AuthService {
    async register(data) {
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email }
        });
        if (existingUser) {
            throw new Error('Email already registered');
        }
        const passwordHash = await bcrypt_1.default.hash(data.password, 10);
        const user = await prisma.user.create({
            data: {
                email: data.email,
                passwordHash,
                firstName: data.firstName,
                lastName: data.lastName
            }
        });
        const token = this.generateToken(user.id);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            },
            token
        };
    }
    async login(data) {
        const user = await prisma.user.findUnique({
            where: { email: data.email }
        });
        if (!user) {
            throw new Error('Invalid credentials');
        }
        const validPassword = await bcrypt_1.default.compare(data.password, user.passwordHash);
        if (!validPassword) {
            throw new Error('Invalid credentials');
        }
        const token = this.generateToken(user.id);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            },
            token
        };
    }
    generateToken(userId) {
        return jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map