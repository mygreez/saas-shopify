// ============================================
// Redirection: Dashboard vers Partenaires
// ============================================

import { redirect } from 'next/navigation';

export default function DashboardPage() {
  redirect('/dashboard/partners');
}

