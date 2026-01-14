// ============================================
// Providers: Wrapper pour tous les providers
// ============================================

'use client';

import { SessionProvider } from '@/components/SessionProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
