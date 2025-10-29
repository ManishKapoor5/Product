export declare class EncryptionService {
    private algorithm;
    private key;
    constructor();
    /**
     * Encrypt sensitive data
     * Returns: iv:encryptedData
     */
    encrypt(text: string): string;
    /**
     * Decrypt sensitive data
     */
    decrypt(encryptedText: string): string;
}
export declare const encryptionService: EncryptionService;
//# sourceMappingURL=encryption.service.d.ts.map