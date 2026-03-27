// Path: lib/clerk-sync.ts
// Title: Clerk sync helpers
// Purpose: Resolve primary emails consistently and ensure a local Prisma user exists for an authenticated Clerk user.

import { clerkClient } from '@clerk/nextjs/server';
import type { PrismaClient, User } from '@prisma/client';
import { extractRoleFromMetadata, resolveUserRole } from '@/lib/authz';

type ClerkEmailAddress = {
  id?: string | null;
  emailAddress?: string | null;
};

type WebhookEmailAddress = {
  id?: string | null;
  email_address?: string | null;
};

function firstNonEmpty(values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === 'string' && value.trim() !== '') || '';
}

export function getPrimaryEmailFromClerkUser(user: {
  primaryEmailAddressId?: string | null;
  emailAddresses?: ClerkEmailAddress[];
}) {
  const primary = user.emailAddresses?.find(
    (email) => email.id && email.id === user.primaryEmailAddressId
  );

  return firstNonEmpty([
    primary?.emailAddress,
    ...((user.emailAddresses || []).map((email) => email.emailAddress)),
  ]);
}

export function getPrimaryEmailFromWebhookUser(user: {
  primary_email_address_id?: string | null;
  email_addresses?: WebhookEmailAddress[];
}) {
  const primary = user.email_addresses?.find(
    (email) => email.id && email.id === user.primary_email_address_id
  );

  return firstNonEmpty([
    primary?.email_address,
    ...((user.email_addresses || []).map((email) => email.email_address)),
  ]);
}

export async function ensureLocalUser(clerkId: string, prisma: PrismaClient): Promise<User> {
  const existingUser = await prisma.user.findUnique({ where: { clerkId } });

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkId);
  const email = getPrimaryEmailFromClerkUser(clerkUser);

  if (!email) {
    if (existingUser) return existingUser;
    throw new Error(`Clerk user ${clerkId} does not have a usable primary email`);
  }

  const conflictingUser = await prisma.user.findUnique({
    where: { email },
  });

  // 自分自身（existingUser）以外でメールが重複しているユーザーがいれば再リンクの対象
  const needsRelink = conflictingUser && conflictingUser.clerkId !== clerkId;
  if (needsRelink) {
    console.warn(`Clerk ID mismatch for ${email}. Re-linking from ${conflictingUser.clerkId} to ${clerkId}`);
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || undefined;
  const role = resolveUserRole({
    email,
    existingRole: conflictingUser?.role,
    metadataRole: extractRoleFromMetadata(
      (clerkUser.publicMetadata as Record<string, unknown> | undefined)?.role,
      (clerkUser.privateMetadata as Record<string, unknown> | undefined)?.role
    ),
  });

  // 更新対象のID（自分自身、またはメール重複している他ユーザーのID）
  const targetUser = existingUser || conflictingUser;

  if (targetUser) {
    // ロールや名前、IDが変わっている場合のみ更新を実行
    if (
      targetUser.clerkId !== clerkId ||
      targetUser.role !== role ||
      targetUser.name !== name
    ) {
      return prisma.user.update({
        where: { id: targetUser.id },
        data: {
          clerkId,
          name,
          role,
        },
      });
    }
    return targetUser;
  }

  return prisma.user.create({
    data: {
      clerkId,
      email,
      name,
      role,
    },
  });
}
