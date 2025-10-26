import { Router, Request, Response } from 'express';
import { authenticate } from '@modules/auth/auth.middleware';
import { brokerService } from './broker.service';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createBrokerAccountSchema = z.object({
  brokerType: z.enum(['MT5', 'MT4', 'IBKR']),
  accountNumber: z.string(),
  displayName: z.string().optional(),
  credentials: z.object({
    username: z.string().optional(),
    password: z.string().optional(),
    server: z.string().optional(),
    login: z.string().optional(),
    accountId: z.string().optional(),
    apiKey: z.string().optional(),
  }),
});

const updateBrokerAccountSchema = z.object({
  displayName: z.string().optional(),
  isActive: z.boolean().optional(),
  credentials: z.object({}).optional(),
});

// Get all broker accounts
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await brokerService.getBrokerAccounts(userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific broker account by ID
router.get('/:accountId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { accountId } = req.params;
    const result = await brokerService.getBrokerAccountById(userId, accountId);
    res.json(result);
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// Create broker account
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const validatedData = createBrokerAccountSchema.parse(req.body);
    
    const result = await brokerService.createBrokerAccount({
      userId,
      ...validatedData,
    });
    
    res.status(201).json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update broker account
router.patch('/:accountId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { accountId } = req.params;
    const validatedData = updateBrokerAccountSchema.parse(req.body);
    
    const result = await brokerService.updateBrokerAccount(accountId, userId, validatedData);
    res.json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete broker account
router.delete('/:accountId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { accountId } = req.params;
    
    const result = await brokerService.deleteBrokerAccount(accountId, userId);
    res.json(result);
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// Test broker connection
router.post('/:accountId/test', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { accountId } = req.params;
    
    const result = await brokerService.testConnection(accountId, userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;