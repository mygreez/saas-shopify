// ============================================
// Layout: Dashboard - Layout partagé avec header
// ============================================

// Mode test : imports d'authentification désactivés
// import { getSession } from '@/lib/auth';
// import { redirect } from 'next/navigation';
import DashboardHeaderSimple from '@/components/DashboardHeaderSimple';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Mode test : pas de vérification de session
  // const session = await getSession();
  // if (!session) {
  //   redirect('/auth/login');
  // }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <DashboardHeaderSimple />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

