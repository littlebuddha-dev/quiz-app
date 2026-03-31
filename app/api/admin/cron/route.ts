/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: app/api/admin/cron/route.ts
// Title: Scheduled Bulk Quiz Generator
// Purpose: Trigger automated quiz generation for all categories via Cron.

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import { DEFAULT_MODEL_ID } from '@/lib/ai-models';

type AutoGenerationSchedule = {
  enabled: boolean;
  time: string;
  quantity: number;
  quizType: 'TEXT' | 'CHOICE';
  modelId: string;
};

const AUTO_GENERATION_SETTING_KEY = 'auto_generation_schedule';
const AUTO_GENERATION_LAST_RUN_KEY = 'auto_generation_last_run_at';

function getTokyoClock(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const record = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    dateKey: `${record.year}-${record.month}-${record.day}`,
    hour: Number(record.hour || '0'),
    minute: Number(record.minute || '0'),
  };
}

function isDueToRun(schedule: AutoGenerationSchedule, lastRunAt: string | null, now: Date) {
  if (!schedule.enabled) return false;
  const [hours, minutes] = schedule.time.split(':').map((value) => Number(value));
  const tokyoNow = getTokyoClock(now);
  const currentMinutes = tokyoNow.hour * 60 + tokyoNow.minute;
  const targetMinutes = (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);

  if (currentMinutes < targetMinutes) {
    return false;
  }

  if (!lastRunAt) {
    return true;
  }

  const lastTokyo = getTokyoClock(new Date(lastRunAt));
  return lastTokyo.dateKey !== tokyoNow.dateKey;
}

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
    const { env } = await getCloudflareContext({ async: true });
    const prisma = createPrisma(env);
    const [scheduleSetting, lastRunSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: AUTO_GENERATION_SETTING_KEY } }),
      prisma.setting.findUnique({ where: { key: AUTO_GENERATION_LAST_RUN_KEY } }),
    ]);

    let parsedSchedule: Partial<AutoGenerationSchedule> = {};
    if (scheduleSetting?.value) {
      try {
        parsedSchedule = JSON.parse(scheduleSetting.value) as Partial<AutoGenerationSchedule>;
      } catch (error) {
        console.error('Failed to parse auto generation schedule:', error);
      }
    }

    const schedule: AutoGenerationSchedule = {
      enabled: parsedSchedule.enabled ?? false,
      time: parsedSchedule.time || '03:00',
      quantity: Math.max(1, Math.min(Number(parsedSchedule.quantity) || 1, 10)),
      quizType: parsedSchedule.quizType === 'CHOICE' ? 'CHOICE' : 'TEXT',
      modelId: parsedSchedule.modelId || DEFAULT_MODEL_ID,
    };

    if (!schedule.enabled) {
      return NextResponse.json({
        skipped: true,
        reason: 'AUTO_GENERATION_DISABLED',
      });
    }

    if (!isDueToRun(schedule, lastRunSetting?.value || null, new Date())) {
      return NextResponse.json({
        skipped: true,
        reason: 'NOT_SCHEDULED_TIME',
        schedule,
        lastRunAt: lastRunSetting?.value || null,
      });
    }

    const res = await fetch(`${baseUrl}/api/admin/auto-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': secret
      },
      body: JSON.stringify({
        categoryId: 'all',
        targetAge: 8,
        quantity: Math.max(1, Math.min(schedule.quantity || 1, 10)),
        quizType: schedule.quizType || 'TEXT',
        modelId: schedule.modelId,
        autoBalance: true,
      })
    });

    const data = await res.json();
    if (res.ok) {
      await prisma.setting.upsert({
        where: { key: AUTO_GENERATION_LAST_RUN_KEY },
        update: { value: new Date().toISOString() },
        create: { key: AUTO_GENERATION_LAST_RUN_KEY, value: new Date().toISOString() },
      });
    }
    return NextResponse.json({
      message: 'Cron job executed successfully',
      schedule,
      details: data
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'CRON_EXECUTION_FAILED',
      message: error.message
    }, { status: 500 });
  }
}
