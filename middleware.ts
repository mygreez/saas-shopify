// ============================================
// Middleware: Protection des routes
// ============================================

// Mode test : authentification désactivée
// import { withAuth } from 'next-auth/middleware';
import { NextResponse, NextRequest } from 'next/server';

// Mode test : désactivation de l'authentification
import { NextRequest } from 'next/server';

export default function middleware(req: NextRequest) {
  // Laisser passer toutes les routes pour les tests
  return NextResponse.next();
}

// Ancien middleware avec authentification (désactivé pour les tests)
// export default withAuth(
//   function middleware(req) {
//     // Pour les routes API, on laisse toujours passer
//     if (req.nextUrl.pathname.startsWith('/api/')) {
//       return NextResponse.next();
//     }
//     return NextResponse.next();
//   },
//   {
//     callbacks: {
//       authorized: ({ token, req }) => {
//         // Pour les routes API, on laisse toujours passer (l'auth sera vérifiée dans la route)
//         if (req.nextUrl.pathname.startsWith('/api/')) {
//           return true;
//         }
//         // Pour les autres routes, vérifier le token
//         return !!token;
//       },
//     },
//     pages: {
//       signIn: '/auth/login',
//     },
//   }
// );

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/products/:path*',
    '/api/prompt-system/:path*',
    '/api/shopify/:path*',
    '/api/folders/:path*',
    '/api/images/:path*',
  ],
};

