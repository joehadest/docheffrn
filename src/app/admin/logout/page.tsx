import { redirect } from 'next/navigation';

/** Rota de logout: o middleware limpa o cookie; esta página garante o redirect no App Router. */
export default function AdminLogoutPage() {
  redirect('/admin/login');
}
