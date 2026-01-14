// ============================================
// GÉNÉRATEUR IA (OpenAI / Claude)
// ============================================

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ProductInput, PromptConfig, GeneratedContent, AIGenerationResponse } from '@/types';
import { buildAIPrompt } from './prompt-builder';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const DEFAULT_PROVIDER = process.env.AI_PROVIDER || 'openai';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229';

/**
 * Génère le contenu produit via IA
 */
export async function generateProductContent(
  productInput: ProductInput,
  promptConfig: PromptConfig,
  provider: 'openai' | 'claude' = DEFAULT_PROVIDER as 'openai' | 'claude'
): Promise<AIGenerationResponse> {
  const startTime = Date.now();
  const prompt = buildAIPrompt(productInput, promptConfig);

  try {
    let content: GeneratedContent;
    let tokensUsed = 0;
    let cost = 0;

    if (provider === 'openai' && openai) {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en rédaction e-commerce. Tu génères toujours du JSON valide.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      tokensUsed = response.usage?.total_tokens || 0;
      cost = calculateOpenAICost(tokensUsed, OPENAI_MODEL);
      
      const jsonContent = JSON.parse(response.choices[0].message.content || '{}');
      content = parseGeneratedContent(jsonContent);

    } else if (provider === 'claude' && anthropic) {
      const response = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
      cost = calculateClaudeCost(response.usage.input_tokens, response.usage.output_tokens, ANTHROPIC_MODEL);
      
      const textContent = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonContent = extractJSONFromText(textContent);
      content = parseGeneratedContent(jsonContent);

    } else {
      throw new Error(`Provider ${provider} non configuré ou non disponible`);
    }

    const latencyMs = Date.now() - startTime;

    return {
      content,
      tokens_used: tokensUsed,
      cost,
      latency_ms: latencyMs,
    };

  } catch (error: any) {
    console.error('Erreur génération IA:', error);
    throw new Error(`Erreur génération IA: ${error.message}`);
  }
}

/**
 * Parse le contenu généré et valide la structure
 */
function parseGeneratedContent(json: any): GeneratedContent {
  return {
    title: json.title || '',
    short_description: json.short_description || '',
    long_description: json.long_description || '',
    bullet_points: Array.isArray(json.bullet_points) ? json.bullet_points : [],
    tags: Array.isArray(json.tags) ? json.tags : [],
    meta_title: json.meta_title || '',
    meta_description: json.meta_description || '',
  };
}

/**
 * Extrait le JSON d'un texte (pour Claude qui peut retourner du markdown)
 */
function extractJSONFromText(text: string): any {
  // Essaie de trouver un bloc JSON dans le texte
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.warn('Erreur parsing JSON extrait:', e);
    }
  }
  return {};
}

/**
 * Calcule le coût OpenAI (approximatif)
 */
function calculateOpenAICost(tokens: number, model: string): number {
  // Prix approximatifs par 1K tokens (à ajuster selon tarifs réels)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  };

  const prices = pricing[model] || pricing['gpt-4-turbo-preview'];
  // Approximation : 70% input, 30% output
  return (tokens * 0.7 * prices.input + tokens * 0.3 * prices.output) / 1000;
}

/**
 * Calcule le coût Claude (approximatif)
 */
function calculateClaudeCost(inputTokens: number, outputTokens: number, model: string): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
    'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
    'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
  };

  const prices = pricing[model] || pricing['claude-3-opus-20240229'];
  return (inputTokens * prices.input + outputTokens * prices.output) / 1000;
}

