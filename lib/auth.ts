// ============================================
// Helpers d'authentification
// ============================================

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

/**
 * Récupère la session utilisateur côté serveur
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Récupère l'ID utilisateur depuis la session
 */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return null;
  }
  
  // Rejeter les utilisateurs démo
  // Le mode démo est détecté si :
  // 1. L'ID est exactement 'demo-user-id'
  // 2. L'ID commence par 'demo-' ET l'email est 'demo@photify.app'
  const isDemo = session.user.id === 'demo-user-id' || 
                 (session.user.id.startsWith('demo-') && session.user.email === 'demo@photify.app');
  
  if (isDemo) {
    console.log('getUserId: Mode démo détecté, retour null');
    return null;
  }
  
  console.log('getUserId: Utilisateur valide, ID:', session.user.id);
  return session.user.id;
}

/**
 * Vérifie si l'utilisateur est authentifié
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session?.user;
}

