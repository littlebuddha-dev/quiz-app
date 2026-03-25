'use client';

import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { useSession } from '@clerk/nextjs';

type MultisessionAppSupportProps = {
  children: ReactNode;
};

export default function MultisessionAppSupport({
  children,
}: MultisessionAppSupportProps) {
  const { session } = useSession();

  return <Fragment key={session ? session.id : 'no-users'}>{children}</Fragment>;
}
