// Path: lib/authz.ts
// Title: Authorization helpers
// Purpose: Centralize role checks and safe role resolution during Clerk sync.

export const ADMIN_ACCESS_ROLES = new Set(['ADMIN', 'PARENT']);
const VALID_ROLES = new Set(['CHILD', 'PARENT', 'ADMIN']);

export function canAccessAdmin(role?: string | null) {
  return !!role && ADMIN_ACCESS_ROLES.has(role);
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || '';
}

function getConfiguredAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '';
  return new Set(
    raw
      .split(',')
      .map((email) => normalizeEmail(email))
      .filter(Boolean)
  );
}

export function extractRoleFromMetadata(...candidates: unknown[]) {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && VALID_ROLES.has(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export function resolveUserRole(options: {
  email?: string | null;
  existingRole?: string | null;
  metadataRole?: string | null;
}) {
  const { email, existingRole, metadataRole } = options;

  if (metadataRole && VALID_ROLES.has(metadataRole)) {
    return metadataRole;
  }

  if (existingRole && VALID_ROLES.has(existingRole) && existingRole !== 'CHILD') {
    return existingRole;
  }

  if (getConfiguredAdminEmails().has(normalizeEmail(email))) {
    return 'ADMIN';
  }

  if (existingRole && VALID_ROLES.has(existingRole)) {
    return existingRole;
  }

  return 'CHILD';
}
