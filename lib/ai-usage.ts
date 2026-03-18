// Path: lib/ai-usage.ts
// Title: AI Usage Tracker & Budget Monitor
// Purpose: Logs API usage to the database and enforces monthly spending limits.

import { PrismaClient } from '@prisma/client';
import { calculateEstimatedCost } from './ai-models';

/**
 * Logs an AI API call to the database.
 */
export async function logApiUsage(prisma: PrismaClient, data: {
  modelId: string,
  promptTokens: number,
  candidateTokens: number,
  purpose?: string
}) {
  try {
    const estimatedCost = calculateEstimatedCost(data.modelId, data.promptTokens, data.candidateTokens);
    
    await (prisma as any).apiUsage.create({
      data: {
        modelId: data.modelId,
        promptTokens: data.promptTokens,
        candidateTokens: data.candidateTokens,
        totalTokens: data.promptTokens + data.candidateTokens,
        estimatedCost: estimatedCost,
        purpose: data.purpose
      }
    });
    
    return estimatedCost;
  } catch (error) {
    console.error('Failed to log API usage:', error);
    return 0;
  }
}

/**
 * Checks if the monthly API budget has been exceeded.
 */
export async function checkApiBudget(prisma: PrismaClient): Promise<{ 
  exceeded: boolean; 
  currentUsage: number; 
  limit: number 
}> {
  try {
    // 1. Get the current limit from Settings
    const limitSetting = await prisma.setting.findUnique({ where: { key: 'API_MONTHLY_BUDGET' } });
    const limit = limitSetting ? parseFloat(limitSetting.value) : 10.0; // Default $10

    // 2. Calculate current month's usage
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const usage = await (prisma as any).apiUsage.aggregate({
      where: {
        timestamp: {
          gte: firstDayOfMonth
        }
      },
      _sum: {
        estimatedCost: true
      }
    });

    const currentUsage = usage._sum.estimatedCost || 0;

    return {
      exceeded: currentUsage >= limit,
      currentUsage,
      limit
    };
  } catch (error) {
    console.error('Error checking API budget:', error);
    return { exceeded: false, currentUsage: 0, limit: 10 };
  }
}
