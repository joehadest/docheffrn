import type { Metadata } from 'next';
import '../admin.css';

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
    <div className="admin-theme">
      {children}
    </div>
  );
}
