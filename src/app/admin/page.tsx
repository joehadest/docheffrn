import React from 'react';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export default function AdminPanel({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const tabRaw = searchParams?.tab;
    const tab = Array.isArray(tabRaw) ? tabRaw[0] : tabRaw;
    const activeTab: 'config' | 'menu' | 'pedidos' = tab === 'menu' ? 'menu' : tab === 'pedidos' ? 'pedidos' : 'config';

    return (
        <div>
        </div>
    );
}