// Path: app/admin/AdminClientWrapper.tsx
// Title: Admin Client SSR Wrapper
// Purpose: Disables SSR for the AdminClient component to prevent hydration errors.

'use client';

import dynamic from 'next/dynamic';
import type { AdminClientProps } from './AdminClient';

const AdminClient = dynamic(() => import('./AdminClient'), { 
  ssr: false,
  loading: () => <div className="p-10 text-zinc-500 font-bold">読み込み中...</div>
});

export default function AdminClientWrapper(props: AdminClientProps) {
  return <AdminClient {...props} />;
}
