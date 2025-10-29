"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const router = (0, express_1.Router)();
const authController = new auth_controller_1.AuthController();
// POST /api/auth/register
router.post('/register', authController.register);
// POST /api/auth/login
router.post('/login', authController.login);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map