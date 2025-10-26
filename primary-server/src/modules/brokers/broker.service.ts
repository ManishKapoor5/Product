import { prisma } from '@config/database';
import { BrokerType } from '@prisma/client';
import { EncryptionService } from '@shared/services/encryption.service';
import { brokerServiceClient } from '@shared/clients/broker-service.client';

export interface CreateBrokerAccountDTO {
  userId: string;
  brokerType: BrokerType;
  accountNumber: string;
  displayName?: string;
  credentials: any; // Will be encrypted
}

export class BrokerService {
  private encryptionService: EncryptionService;

  constructor() {
    this.encryptionService = new EncryptionService();
  }

  async createBrokerAccount(data: CreateBrokerAccountDTO) {
    // Test connection in production, skip in development if service unavailable
    if (process.env.NODE_ENV !== 'development') {
      try {
        const isValid = await brokerServiceClient.testConnection({
          brokerType: data.brokerType,
          ...data.credentials,
        });

        if (!isValid) {
          throw new Error('Invalid broker credentials');
        }
      } catch (error: any) {
        throw new Error(`Connection test failed: ${error.message}`);
      }
    } else {
      // Development: try but don't fail
      try {
        await brokerServiceClient.testConnection({
          brokerType: data.brokerType,
          ...data.credentials,
        });
        console.log('✅ Broker connection validated');
      } catch (error: any) {
        console.warn('⚠️  Broker service unavailable, skipping validation');
      }
    }

    // Encrypt credentials
    const encryptedCredentials = this.encryptionService.encrypt(
      JSON.stringify(data.credentials)
    );

    const brokerAccount = await prisma.brokerAccount.create({
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

  async getBrokerAccounts(userId: string) {
    const accounts = await prisma.brokerAccount.findMany({
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

  async getBrokerAccountById(userId: string, accountId: string) {
    const account = await prisma.brokerAccount.findFirst({
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

  async getBrokerAccountWithCredentials(accountId: string, userId: string) {
    const account = await prisma.brokerAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new Error('Broker account not found');
    }

    const credentials = JSON.parse(
      this.encryptionService.decrypt(account.encryptedCredentials)
    );

    return {
      ...account,
      credentials,
    };
  }

  async updateBrokerAccount(accountId: string, userId: string, data: Partial<CreateBrokerAccountDTO>) {
    const updateData: any = {};

    if (data.displayName) {
      updateData.displayName = data.displayName;
    }

    if (data.credentials) {
      // Test new credentials first (skip in development)
      const existingAccount = await this.getBrokerAccountWithCredentials(accountId, userId);
      
      if (process.env.NODE_ENV !== 'development') {
        try {
          const isValid = await brokerServiceClient.testConnection({
            brokerType: existingAccount.brokerType,
            ...data.credentials,
          });

          if (!isValid) {
            throw new Error('Invalid broker credentials');
          }
        } catch (error: any) {
          throw new Error(`Connection test failed: ${error.message}`);
        }
      }

      updateData.encryptedCredentials = this.encryptionService.encrypt(
        JSON.stringify(data.credentials)
      );
    }

    const account = await prisma.brokerAccount.updateMany({
      where: { id: accountId, userId },
      data: updateData,
    });

    if (account.count === 0) {
      throw new Error('Broker account not found');
    }

    return { success: true, message: 'Broker account updated successfully' };
  }

  async deleteBrokerAccount(accountId: string, userId: string) {
    // Use deleteMany to check ownership
    const result = await prisma.brokerAccount.deleteMany({
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

  async testConnection(accountId: string, userId: string) {
    const account = await this.getBrokerAccountWithCredentials(accountId, userId);
    
    const isValid = await brokerServiceClient.testConnection({
      brokerType: account.brokerType,
      ...account.credentials,
    });

    return { success: isValid };
  }
}

export const brokerService = new BrokerService();