"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
class AuthController {
    authService = new auth_service_1.AuthService();
    register = async (req, res) => {
        try {
            const result = await this.authService.register(req.body);
            res.status(201).json(result);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    };
    login = async (req, res) => {
        try {
            const result = await this.authService.login(req.body);
            res.json(result);
        }
        catch (error) {
            res.status(401).json({ error: error.message });
        }
    };
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map