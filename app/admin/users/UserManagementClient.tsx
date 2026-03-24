/* eslint-disable @typescript-eslint/no-explicit-any */
// /Users/Shared/Program/nextjs/quiz-app/app/admin/users/UserManagementClient.tsx
// Title: User Management Client Component
// Purpose: Interactive UI for managing users, roles, and progress.

'use client';

import { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { usePreferredLocale } from '../../hooks/usePreferredLocale';

export default function UserManagementClient({ initialUsers, userStatus, currentClerkId }: any) {
  const { locale, setLocale } = usePreferredLocale();
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredUsers = users.filter((u: any) => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.clerkId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setLoadingId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      if (res.ok) {
        const updated = (await res.json()) as any;
        setUsers(users.map((u: any) => u.id === userId ? { ...u, role: updated.role } : u));
      } else {
        alert('更新に失敗しました');
      }
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    }
    setLoadingId(null);
  };

  return (
    <div className="pt-20 text-[var(--foreground)] min-h-screen bg-[var(--background)]">
      <Header locale={locale} setLocale={setLocale} userStatus={userStatus} hideSearch={true} />
      
      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-black mb-2">ユーザー管理</h1>
          <p className="text-zinc-500 font-bold">アプリを利用しているユーザーの権限やステータスを管理します。</p>
          <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-xs font-bold text-zinc-500">
            <span className="text-[10px] uppercase tracking-[0.2em] text-amber-500">Current Clerk ID</span>
            <code className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-zinc-700">{currentClerkId}</code>
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] overflow-hidden">
          <div className="p-6 border-b border-[var(--border)] bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input 
                type="text" 
                placeholder="名前、メール、IDで検索..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>
            <div className="text-xs font-black text-zinc-400 bg-[var(--background)] px-4 py-2 rounded-full border border-[var(--border)]">
              TOTAL: {users.length} USERS
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/30 dark:bg-zinc-900/30 border-b border-[var(--border)]">
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">User</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status / Activity</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Role</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredUsers.map((user: any) => (
                  <tr key={user.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-black text-sm">{user.name || 'ゲスト'}</span>
                        <span className="text-[10px] font-bold text-zinc-400">{user.email || user.clerkId}</span>
                        <span className="mt-1 break-all font-mono text-[9px] text-zinc-500">Clerk ID: {user.clerkId || '未同期'}</span>
                        <span className="text-[8px] text-zinc-300 mt-1 uppercase tracking-tighter">ID: {user.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded">LV.{user.level}</span>
                          <span className="text-[10px] font-bold text-zinc-500">{user.xp} XP</span>
                        </div>
                        <div className="flex gap-2 text-[9px] font-bold text-zinc-400 uppercase">
                          <span>✅ {user._count?.histories || 0} Solved</span>
                          <span>★ {user._count?.bookmarks || 0} Bookmarks</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
                        user.role === 'ADMIN' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                        user.role === 'PARENT' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                        'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-[var(--border)]'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <select 
                        value={user.role} 
                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                        disabled={loadingId === user.id}
                        className="bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none cursor-pointer disabled:opacity-50"
                      >
                        <option value="CHILD">CHILD</option>
                        <option value="PARENT">PARENT</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center gap-2">
              <span className="text-4xl text-zinc-200">🔍</span>
              <p className="text-zinc-400 font-bold">該当するユーザーが見つかりませんでした。</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
