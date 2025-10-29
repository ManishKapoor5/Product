"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptionService = exports.EncryptionService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("@config/env");
class EncryptionService {
    algorithm = 'aes-256-cbc';
    key;
    constructor() {
        const encryptionKey = env_1.config.ENCRYPTION_KEY;
        if (!encryptionKey) {
            throw new Error('ENCRYPTION_KEY is not defined in environment variables');
        }
        if (encryptionKey.length !== 32) {
            throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
        }
        this.key = Buffer.from(encryptionKey, 'utf-8');
    }
    /**
     * Encrypt sensitive data
     * Returns: iv:encryptedData
     */
    encrypt(text) {
        try {
            // Generate random IV (Initialization Vector)
            const iv = crypto_1.default.randomBytes(16);
            // Create cipher
            const cipher = crypto_1.default.createCipheriv(this.algorithm, this.key, iv);
            // Encrypt the text
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            // Combine IV + encrypted data (separated by :)
            return iv.toString('hex') + ':' + encrypted;
        }
        catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }
    /**
     * Decrypt sensitive data
     */
    decrypt(encryptedText) {
        try {
            // Split the encrypted text
            const parts = encryptedText.split(':');
            if (parts.length !== 2) {
                throw new Error('Invalid encrypted data format');
            }
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            // Create decipher
            const decipher = crypto_1.default.createDecipheriv(this.algorithm, this.key, iv);
            // Decrypt the text
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }
}
exports.EncryptionService = EncryptionService;
// Export singleton instance
exports.encryptionService = new EncryptionService();
//# sourceMappingURL=encryption.service.js.map