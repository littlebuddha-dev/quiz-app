// Path: app/components/MultisessionAppSupport.tsx
// Title: Multisession Application Support
// Purpose: Provides multisession support for the application by wrapping children with Fragment, ensuring consistent session management.

'use client';

import type { ReactNode } from 'react';
import { Fragment } from 'react';

type MultisessionAppSupportProps = {
  children: ReactNode;
};

export default function MultisessionAppSupport({
  children,
}: MultisessionAppSupportProps) {
  return <Fragment>{children}</Fragment>;
}
