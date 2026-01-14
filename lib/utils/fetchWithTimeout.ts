// ============================================
// Utilitaire: fetch avec timeout
// ============================================
// Wrapper autour de fetch() avec gestion de timeout pour éviter les requêtes qui pendent indéfiniment

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number; // Timeout en millisecondes (défaut: 10000ms = 10s)
}

/**
 * Effectue une requête fetch avec un timeout
 * @param url - URL à requêter
 * @param options - Options de fetch (incluant timeout personnalisé)
 * @returns Promise<Response>
 * @throws Error si le timeout est dépassé ou si la requête échoue
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options;

  // Créer un AbortController pour annuler la requête en cas de timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Vérifier si c'est une erreur de timeout
    if (error.name === 'AbortError') {
      throw new Error(`Requête timeout après ${timeout}ms: ${url}`);
    }

    // Sinon, propager l'erreur originale
    throw error;
  }
}

/**
 * Version avec parsing JSON automatique
 */
export async function fetchJsonWithTimeout<T = any>(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Erreur HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorMessage;
    } catch {
      // Si ce n'est pas du JSON, utiliser le texte brut
      if (errorText) {
        errorMessage = errorText;
      }
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

