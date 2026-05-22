import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Painel Admin | Do Cheff',
  robots: 'noindex',
};

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-gray-200">
      {children}
    </div>
  );
}
