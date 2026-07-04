export type AffiliatePlacement = 'home' | 'watch';

export type AmazonMarketplace = 'jp' | 'us';

export type AmazonAffiliatePlacementSettings = {
  enabled: boolean;
  fallbackKeywords: string;
};

export type AmazonAffiliateSettings = {
  enabled: boolean;
  marketplace: AmazonMarketplace;
  associateTag: string;
  slots: Record<AffiliatePlacement, AmazonAffiliatePlacementSettings>;
};

export type PublicAmazonAffiliateSettings = AmazonAffiliateSettings;

const DEFAULT_SLOT_SETTINGS = {
  home: { enabled: true, fallbackKeywords: '' },
  watch: { enabled: true, fallbackKeywords: '' },
} satisfies Record<AffiliatePlacement, AmazonAffiliatePlacementSettings>;

export const DEFAULT_AMAZON_AFFILIATE_SETTINGS: AmazonAffiliateSettings = {
  enabled: false,
  marketplace: 'jp',
  associateTag: '',
  slots: DEFAULT_SLOT_SETTINGS,
};

function normalizePlacementSettings(
  value: unknown,
  fallback: AmazonAffiliatePlacementSettings
): AmazonAffiliatePlacementSettings {
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const raw = value as Record<string, unknown>;
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : fallback.enabled,
    fallbackKeywords: typeof raw.fallbackKeywords === 'string'
      ? raw.fallbackKeywords.trim()
      : fallback.fallbackKeywords,
  };
}

export function normalizeAmazonAffiliateSettings(value: unknown): AmazonAffiliateSettings {
  if (!value || typeof value !== 'object') {
    return DEFAULT_AMAZON_AFFILIATE_SETTINGS;
  }

  const raw = value as Record<string, unknown>;
  const rawSlots = raw.slots && typeof raw.slots === 'object' ? (raw.slots as Record<string, unknown>) : {};
  const marketplace = raw.marketplace === 'us' ? 'us' : 'jp';

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_AMAZON_AFFILIATE_SETTINGS.enabled,
    marketplace,
    associateTag: typeof raw.associateTag === 'string' ? raw.associateTag.trim() : '',
    slots: {
      home: normalizePlacementSettings(rawSlots.home, DEFAULT_SLOT_SETTINGS.home),
      watch: normalizePlacementSettings(rawSlots.watch, DEFAULT_SLOT_SETTINGS.watch),
    },
  };
}

export function buildAmazonAffiliateUrl(params: {
  marketplace: AmazonMarketplace;
  associateTag: string;
  keywords: string;
}) {
  const baseUrl = params.marketplace === 'us' ? 'https://www.amazon.com/s' : 'https://www.amazon.co.jp/s';
  const url = new URL(baseUrl);
  url.searchParams.set('k', params.keywords);
  url.searchParams.set('tag', params.associateTag);
  url.searchParams.set('linkCode', 'osi');
  return url.toString();
}
