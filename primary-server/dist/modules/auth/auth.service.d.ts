export declare class AuthService {
    register(data: {
        email: string;
        password: string;
        firstName?: string;
        lastName?: string;
    }): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
        token: string;
    }>;
    login(data: {
        email: string;
        password: string;
    }): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
        token: string;
    }>;
    private generateToken;
}
//# sourceMappingURL=auth.service.d.ts.map