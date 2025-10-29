"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brokerService = exports.BrokerService = void 0;
const database_1 = require("@config/database");
const encryption_service_1 = require("@shared/services/encryption.service");
const broker_service_client_1 = require("@shared/clients/broker-service.client");
class BrokerService {
    encryptionService;
    constructor() {
        this.encryptionService = new encryption_service_1.EncryptionService();
    }
    async createBrokerAccount(data) {
        // Test connection in production, skip in development if service unavailable
        if (process.env.NODE_ENV !== 'development') {
            try {
                const isValid = await broker_service_client_1.brokerServiceClient.testConnection({
                    brokerType: data.brokerType,
                    ...data.credentials,
                });
                if (!isValid) {
                    throw new Error('Invalid broker credentials');
                }
            }
            catch (error) {
                throw new Error(`Connection test failed: ${error.message}`);
            }
        }
        else {
            // Development: try but don't fail
            try {
                await broker_service_client_1.brokerServiceClient.testConnection({
                    brokerType: data.brokerType,
                    ...data.credentials,
                });
                console.log('✅ Broker connection validated');
            }
            catch (error) {
                console.warn('⚠️  Broker service unavailable, skipping validation');
            }
        }
        // Encrypt credentials
        const encryptedCredentials = this.encryptionService.encrypt(JSON.stringify(data.credentials));
        const brokerAccount = await database_1.prisma.brokerAccount.create({
            data: {
                userId: data.userId,
                brokerType: data.brokerType,
                accountNumber: data.accountNumber,
                displayName: data.displayName || `${data.brokerType} - ${data.accountNumber}`,
                encryptedCredentials,
                isActive: true,
            },
        });
        return {
            success: true,
            data: {
                id: brokerAccount.id,
                brokerType: brokerAccount.brokerType,
                accountNumber: brokerAccount.accountNumber,
                displayName: brokerAccount.displayName,
                isActive: brokerAccount.isActive,
            },
        };
    }
    async getBrokerAccounts(userId) {
        const accounts = await database_1.prisma.brokerAccount.findMany({
            where: { userId },
            select: {
                id: true,
                brokerType: true,
                accountNumber: true,
                displayName: true,
                isActive: true,
                lastSyncAt: true,
                lastSyncStatus: true,
                createdAt: true,
                // Never return encrypted credentials
            },
        });
        return { success: true, data: accounts };
    }
    async getBrokerAccountById(userId, accountId) {
        const account = await database_1.prisma.brokerAccount.findFirst({
            where: { id: accountId, userId },
            select: {
                id: true,
                brokerType: true,
                accountNumber: true,
                displayName: true,
                isActive: true,
                lastSyncAt: true,
                lastSyncStatus: true,
                createdAt: true,
            },
        });
        if (!account) {
            throw new Error('Broker account not found');
        }
        return { success: true, data: account };
    }
    async getBrokerAccountWithCredentials(accountId, userId) {
        const account = await database_1.prisma.brokerAccount.findFirst({
            where: { id: accountId, userId },
        });
        if (!account) {
            throw new Error('Broker account not found');
        }
        const credentials = JSON.parse(this.encryptionService.decrypt(account.encryptedCredentials));
        return {
            ...account,
            credentials,
        };
    }
    async updateBrokerAccount(accountId, userId, data) {
        const updateData = {};
        if (data.displayName) {
            updateData.displayName = data.displayName;
        }
        if (data.credentials) {
            // Test new credentials first (skip in development)
            const existingAccount = await this.getBrokerAccountWithCredentials(accountId, userId);
            if (process.env.NODE_ENV !== 'development') {
                try {
                    const isValid = await broker_service_client_1.brokerServiceClient.testConnection({
                        brokerType: existingAccount.brokerType,
                        ...data.credentials,
                    });
                    if (!isValid) {
                        throw new Error('Invalid broker credentials');
                    }
                }
                catch (error) {
                    throw new Error(`Connection test failed: ${error.message}`);
                }
            }
            updateData.encryptedCredentials = this.encryptionService.encrypt(JSON.stringify(data.credentials));
        }
        const account = await database_1.prisma.brokerAccount.updateMany({
            where: { id: accountId, userId },
            data: updateData,
        });
        if (account.count === 0) {
            throw new Error('Broker account not found');
        }
        return { success: true, message: 'Broker account updated successfully' };
    }
    async deleteBrokerAccount(accountId, userId) {
        // Use deleteMany to check ownership
        const result = await database_1.prisma.brokerAccount.deleteMany({
            where: {
                id: accountId,
                userId
            },
        });
        if (result.count === 0) {
            throw new Error('Broker account not found');
        }
        return { success: true, message: 'Broker account deleted successfully' };
    }
    async testConnection(accountId, userId) {
        const account = await this.getBrokerAccountWithCredentials(accountId, userId);
        const isValid = await broker_service_client_1.brokerServiceClient.testConnection({
            brokerType: account.brokerType,
            ...account.credentials,
        });
        return { success: isValid };
    }
}
exports.BrokerService = BrokerService;
exports.brokerService = new BrokerService();
//# sourceMappingURL=broker.service.js.map