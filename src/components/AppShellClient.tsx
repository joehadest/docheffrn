'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import { StoreProvider } from '@/contexts/StoreContext';
import { MenuProvider } from '@/contexts/MenuContext';

export default function AppShellClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  return (
    <MenuProvider>
      <StoreProvider>
        {!isAdmin && <Header />}
        <main className="min-h-screen">{children}</main>
      </StoreProvider>
    </MenuProvider>
  );
}
