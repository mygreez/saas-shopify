// ============================================
// NextAuth Configuration
// ============================================
// Ce fichier contient la configuration NextAuth qui peut être partagée
// entre les routes API et les autres fichiers

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { supabaseAdmin } from '@/lib/db/supabase';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Vérification si Supabase est configuré
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (!supabaseUrl || supabaseUrl === '') {
            return null;
          }

          // Récupération de l'utilisateur depuis Supabase
          const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', credentials.email)
            .single();

          if (error || !user) {
            return null;
          }

          // VÉRIFICATION DU RÔLE ADMIN - Seuls les admins peuvent se connecter
          if (user.role !== 'admin') {
            console.log(`Tentative de connexion refusée: utilisateur ${user.email} n'est pas admin (role: ${user.role})`);
            return null;
          }

          // Si l'utilisateur n'a pas de password_hash, on accepte (première connexion)
          if (!user.password_hash) {
            // Pour le MVP, on accepte la connexion
            return {
              id: user.id,
              email: user.email,
              name: user.name || user.email,
            };
          }

          // Vérification du mot de passe avec bcrypt
          const isValid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || user.email,
          };
        } catch (error) {
          console.error('Erreur authentification:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

