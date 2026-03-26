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
  // 注意: ここに unsafe_metadata を渡してはいけません。
  // resolveUserRole の呼び出し側で public/private metadata のみを渡すように制限します。
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

  // 1. メタデータ（public/private）にロールがあれば最優先
  if (metadataRole && VALID_ROLES.has(metadataRole)) {
    return metadataRole;
  }

  // 2. 環境変数に設定された管理者メールアドレスをチェック
  // これにより、既存のロールが何であれ、リストに含まれていれば即座に ADMIN になる
  if (getConfiguredAdminEmails().has(normalizeEmail(email))) {
    return 'ADMIN';
  }

  // 3. 既存のロールがあればそれを尊重（ただし 'CHILD' 以外）
  // ADMIN だったユーザーがリストから消えた場合、ここで 'ADMIN' が返るのを防ぐため
  // リストになければ CHILD に落とすか、手動設定を優先するか検討が必要。
  // ここでは「リストになく、かつメタデータもなければ CHILD」という安全側に倒す方針とする。
  if (existingRole === 'PARENT') {
    return 'PARENT';
  }

  // ADMIN だったユーザーがリストからもメタデータからも消えた場合は CHILD に戻す
  return 'CHILD';
}
