import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import {
  DEFAULT_ADSENSE_SETTINGS,
  normalizeAdSenseSettings,
  toPublicAdSenseSettings,
  type PublicAdSenseSettings,
} from '@/lib/adsense';

const SETTING_KEY = 'adsense_settings';

export async function getStoredPublicAdSenseSettings(): Promise<PublicAdSenseSettings> {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const setting = await prisma.setting.findUnique({
      where: { key: SETTING_KEY },
    });

    if (!setting) {
      return toPublicAdSenseSettings(DEFAULT_ADSENSE_SETTINGS);
    }

    return toPublicAdSenseSettings(normalizeAdSenseSettings(JSON.parse(setting.value)));
  } catch (error) {
    console.error('Failed to load stored AdSense settings:', error);
    return toPublicAdSenseSettings(DEFAULT_ADSENSE_SETTINGS);
  }
}
