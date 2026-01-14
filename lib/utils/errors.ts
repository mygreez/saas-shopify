// ============================================
// UTILS: Error Handling
// ============================================

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(error: unknown): { statusCode: number; message: string; details?: any } {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      details: isDevelopment ? error.details : undefined,
    };
  }

  if (error instanceof Error) {
    // Détecter les types d'erreurs courants
    let errorMessage = error.message || 'Erreur serveur';
    let errorDetails: any = undefined;

    // Erreur de connexion à la base de données
    if (error.message.includes('P1001') || error.message.includes('connect')) {
      errorMessage = 'Erreur de connexion à la base de données';
      errorDetails = isDevelopment ? {
        original: error.message,
        hint: 'Vérifiez que DATABASE_URL est correctement configuré dans .env.local'
      } : undefined;
    }

    // Erreur Supabase
    if (error.message.includes('supabase') || error.message.includes('PGRST')) {
      errorMessage = 'Erreur de connexion à Supabase';
      errorDetails = isDevelopment ? {
        original: error.message,
        hint: 'Vérifiez que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont configurés'
      } : undefined;
    }

    // Erreur Prisma
    if (error.message.includes('Prisma') || error.message.includes('P2')) {
      errorMessage = 'Erreur de base de données';
      errorDetails = isDevelopment ? {
        original: error.message,
        hint: 'Vérifiez que la base de données est accessible et que les migrations sont à jour'
      } : undefined;
    }

    return {
      statusCode: 500,
      message: errorMessage,
      details: errorDetails,
      ...(isDevelopment && { stack: error.stack }),
    };
  }

  return {
    statusCode: 500,
    message: 'Erreur inconnue',
    details: isDevelopment ? { original: String(error) } : undefined,
  };
}

/**
 * Formate une erreur pour la réponse API avec plus de détails en développement
 */
export function formatApiError(error: unknown, context?: string): {
  error: string;
  details?: any;
  context?: string;
} {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const handled = handleError(error);

  const response: any = {
    error: handled.message,
  };

  if (isDevelopment) {
    if (handled.details) {
      response.details = handled.details;
    }
    if (context) {
      response.context = context;
    }
    if (error instanceof Error && error.stack) {
      response.stack = error.stack;
    }
  }

  return response;
}


