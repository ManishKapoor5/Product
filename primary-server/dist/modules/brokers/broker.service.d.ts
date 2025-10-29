import { BrokerType } from '@prisma/client';
export interface CreateBrokerAccountDTO {
    userId: string;
    brokerType: BrokerType;
    accountNumber: string;
    displayName?: string;
    credentials: any;
}
export declare class BrokerService {
    private encryptionService;
    constructor();
    createBrokerAccount(data: CreateBrokerAccountDTO): Promise<{
        success: boolean;
        data: {
            id: string;
            brokerType: import(".prisma/client").$Enums.BrokerType;
            accountNumber: string;
            displayName: string | null;
            isActive: boolean;
        };
    }>;
    getBrokerAccounts(userId: string): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            brokerType: import(".prisma/client").$Enums.BrokerType;
            accountNumber: string;
            displayName: string | null;
            isActive: boolean;
            lastSyncAt: Date | null;
            lastSyncStatus: import(".prisma/client").$Enums.SyncStatus | null;
        }[];
    }>;
    getBrokerAccountById(userId: string, accountId: string): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            brokerType: import(".prisma/client").$Enums.BrokerType;
            accountNumber: string;
            displayName: string | null;
            isActive: boolean;
            lastSyncAt: Date | null;
            lastSyncStatus: import(".prisma/client").$Enums.SyncStatus | null;
        };
    }>;
    getBrokerAccountWithCredentials(accountId: string, userId: string): Promise<{
        credentials: any;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        brokerType: import(".prisma/client").$Enums.BrokerType;
        accountNumber: string;
        displayName: string | null;
        encryptedCredentials: string;
        isActive: boolean;
        lastSyncAt: Date | null;
        lastSyncStatus: import(".prisma/client").$Enums.SyncStatus | null;
    }>;
    updateBrokerAccount(accountId: string, userId: string, data: Partial<CreateBrokerAccountDTO>): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteBrokerAccount(accountId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    testConnection(accountId: string, userId: string): Promise<{
        success: boolean;
    }>;
}
export declare const brokerService: BrokerService;
//# sourceMappingURL=broker.service.d.ts.map