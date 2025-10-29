// src/modules/trades/trades.model.ts

import { z } from 'zod';

export const TradeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  brokerAccountId: z.string(),
  externalTradeId: z.string(),
  symbol: z.string(),
  tradeType: z.enum(['BUY', 'SELL']),
  openTime: z.date(),
  closeTime: z.date(),
  quantity: z.number(),
  openPrice: z.number(),
  closePrice: z.number(),
  profit: z.number(),
  commission: z.number(),
  swap: z.number().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  rawData: z.any().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateTradeSchema = z.object({
  brokerAccountId: z.string(),
  externalTradeId: z.string(),
  symbol: z.string(),
  tradeType: z.enum(['BUY', 'SELL']),
  openTime: z.date(),
  closeTime: z.date(),
  quantity: z.number(),
  openPrice: z.number(),
  closePrice: z.number(),
  profit: z.number(),
  commission: z.number(),
  swap: z.number().optional(),
  rawData: z.any().optional(),
});

export const UpdateTradeSchema = z.object({
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const TradeQuerySchema = z.object({
  brokerAccountId: z.string().optional(),
  symbol: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.string().default('1'),
  limit: z.string().default('50'),
});

export type Trade = z.infer<typeof TradeSchema>;
export type CreateTrade = z.infer<typeof CreateTradeSchema>;
export type UpdateTrade = z.infer<typeof UpdateTradeSchema>;
export type TradeQuery = z.infer<typeof TradeQuerySchema>;