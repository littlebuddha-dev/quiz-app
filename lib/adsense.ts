export type AdPlacement = 'home' | 'watch';

export type AdPlacementSettings = {
  enabled: boolean;
  slotId: string;
};

export type AdSenseSettings = {
  enabled: boolean;
  clientId: string;
  slots: Record<AdPlacement, AdPlacementSettings>;
  snippet?: string;
};

export type PublicAdSenseSettings = {
  enabled: boolean;
  clientId: string;
  slots: Record<AdPlacement, AdPlacementSettings>;
};

const DEFAULT_SLOT_SETTINGS = {
  home: { enabled: true, slotId: '' },
  watch: { enabled: true, slotId: '' },
} satisfies Record<AdPlacement, AdPlacementSettings>;

export const DEFAULT_ADSENSE_SETTINGS: AdSenseSettings = {
  enabled: false,
  clientId: '',
  slots: DEFAULT_SLOT_SETTINGS,
  snippet: '',
};

function normalizePlacementSettings(value: unknown, fallback: AdPlacementSettings): AdPlacementSettings {
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const raw = value as Record<string, unknown>;
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : fallback.enabled,
    slotId: typeof raw.slotId === 'string' ? raw.slotId.trim() : fallback.slotId,
  };
}

export function extractClientIdFromSnippet(snippet: string) {
  const match = snippet.match(/ca-pub-\d+/);
  return match?.[0] || '';
}

export function normalizeAdSenseSettings(value: unknown): AdSenseSettings {
  if (!value || typeof value !== 'object') {
    return DEFAULT_ADSENSE_SETTINGS;
  }

  const raw = value as Record<string, unknown>;
  const snippet = typeof raw.snippet === 'string' ? raw.snippet.trim() : '';
  const clientId = typeof raw.clientId === 'string' && raw.clientId.trim()
    ? raw.clientId.trim()
    : extractClientIdFromSnippet(snippet);
  const rawSlots = raw.slots && typeof raw.slots === 'object' ? (raw.slots as Record<string, unknown>) : {};

  const fallbackHome = {
    enabled: typeof rawSlots.home === 'boolean' ? rawSlots.home : DEFAULT_SLOT_SETTINGS.home.enabled,
    slotId: '',
  };
  const fallbackWatch = {
    enabled: typeof rawSlots.watch === 'boolean' ? rawSlots.watch : DEFAULT_SLOT_SETTINGS.watch.enabled,
    slotId: '',
  };

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_ADSENSE_SETTINGS.enabled,
    clientId,
    slots: {
      home: normalizePlacementSettings(rawSlots.home, fallbackHome),
      watch: normalizePlacementSettings(rawSlots.watch, fallbackWatch),
    },
    snippet,
  };
}

export function toPublicAdSenseSettings(settings: AdSenseSettings): PublicAdSenseSettings {
  return {
    enabled: settings.enabled,
    clientId: settings.clientId,
    slots: settings.slots,
  };
}

export function buildAdsTxtLine(clientId: string) {
  const publisherId = clientId.replace(/^ca-pub-/, 'pub-');
  return `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0`;
}
