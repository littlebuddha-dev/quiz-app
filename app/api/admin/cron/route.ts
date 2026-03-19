/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: app/api/admin/cron/route.ts
// Title: Scheduled Bulk Quiz Generator
// Purpose: Trigger automated quiz generation for all categories via Cron.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  // Authorization via URL query or header
  const authHeader = req.headers.get('Authorization');
  const querySecret = req.nextUrl.searchParams.get('secret');
  const secret = process.env.CRON_SECRET;

  if (!secret || (authHeader !== `Bearer ${secret}` && querySecret !== secret)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const baseUrl = new URL(req.url).origin;
  
  try {
    const res = await fetch(`${baseUrl}/api/admin/auto-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': secret
      },
      body: JSON.stringify({
        categoryId: 'all',
        targetAge: 8, // Default age for automated generation
        quantity: 1, // 1 quiz per category per run
        quizType: 'TEXT'
      })
    });

    const data = await res.json();
    return NextResponse.json({
      message: 'Cron job executed successfully',
      details: data
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'CRON_EXECUTION_FAILED',
      message: error.message
    }, { status: 500 });
  }
}
