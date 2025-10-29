import { Request, Response } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
  private authService = new AuthService();

  register = async (req: Request, res: Response) => {
    try {
      // ✅ Debug logging
      console.log('============ REGISTER REQUEST ============');
      console.log('📦 req.body:', JSON.stringify(req.body, null, 2));
      console.log('📧 Email:', req.body?.email);
      console.log('🔑 Password:', req.body?.password ? '[PROVIDED]' : '[MISSING]');
      console.log('📝 Content-Type:', req.headers['content-type']);
      console.log('=========================================');

      // ✅ Validate request body exists
      if (!req.body || Object.keys(req.body).length === 0) {
        console.log('❌ Empty request body');
        return res.status(400).json({ 
          success: false,
          error: 'Request body is empty. Please send JSON data in the request body.' 
        });
      }

      // ✅ Extract and validate fields
      const { email, password, firstName, lastName } = req.body;

      if (!email) {
        console.log('❌ Email missing');
        return res.status(400).json({ 
          success: false,
          error: 'Email is required',
          received: Object.keys(req.body)
        });
      }

      if (!password) {
        console.log('❌ Password missing');
        return res.status(400).json({ 
          success: false,
          error: 'Password is required' 
        });
      }

      // ✅ Call service with validated data
      console.log('✅ Calling service with:', { email, firstName, lastName });
      const result = await this.authService.register({
        email,
        password,
        firstName,
        lastName
      });

      console.log('✅ Registration successful for:', email);
      
      return res.status(201).json({
        success: true,
        data: result
      });
      
    } catch (error: any) {
      console.error('❌ Registration error:', error.message);
      console.error('Stack:', error.stack);
      
      return res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      // ✅ Debug logging
      console.log('============ LOGIN REQUEST ============');
      console.log('📦 req.body:', JSON.stringify(req.body, null, 2));
      console.log('📧 Email:', req.body?.email);
      console.log('======================================');

      // ✅ Validate request body
      if (!req.body || Object.keys(req.body).length === 0) {
        console.log('❌ Empty request body');
        return res.status(400).json({ 
          success: false,
          error: 'Request body is empty' 
        });
      }

      const { email, password } = req.body;

      if (!email) {
        console.log('❌ Email missing');
        return res.status(400).json({ 
          success: false,
          error: 'Email is required' 
        });
      }

      if (!password) {
        console.log('❌ Password missing');
        return res.status(400).json({ 
          success: false,
          error: 'Password is required' 
        });
      }

      // ✅ Call service
      console.log('✅ Attempting login for:', email);
      const result = await this.authService.login({
        email,
        password
      });

      console.log('✅ Login successful for:', email);
      
      return res.status(200).json({
        success: true,
        data: result
      });
      
    } catch (error: any) {
      console.error('❌ Login error:', error.message);
      
      return res.status(401).json({ 
        success: false,
        error: error.message 
      });
    }
  };
}