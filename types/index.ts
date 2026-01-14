// ============================================
// TYPES PRINCIPAUX - GREEZ SAAS
// ============================================

// User
export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  updated_at: string;
}

// Shopify Connection
export interface ShopifyConnection {
  id: string;
  user_id: string;
  shop_domain: string;
  access_token_encrypted: string;
  scope: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Prompt Config (Calibration IA)
export interface BrandVoice {
  positioning: string;
  tone: string;
  target: string;
  values: string[];
  recurring_words: string[];
  do_not_say: string[];
}

export interface ProductStructure {
  title_length: 'short' | 'medium' | 'long';
  short_desc_length: 'short' | 'medium' | 'long';
  long_desc_length: 'short' | 'medium' | 'long';
  storytelling_enabled: boolean;
  bullet_points_enabled: boolean;
  bullet_count: number;
  cta_required: boolean;
  seo_format: {
    use_h2: boolean;
    short_sentences: boolean;
    keyword_density: number;
  };
}

export interface ProductExample {
  product_name: string;
  generated_content: GeneratedContent;
}

export interface PromptConfig {
  brand_voice: BrandVoice;
  structure: ProductStructure;
  examples: ProductExample[];
  rules: {
    never_invent_data: boolean;
    always_mention_material: boolean;
    stay_brand_coherent: boolean;
    never_use_forbidden_words: boolean;
  };
}

export interface PromptConfigRecord {
  id: string;
  user_id: string;
  shop_domain: string;
  config: PromptConfig;
  created_at: string;
  updated_at: string;
}

// Product
export interface ProductVariant {
  title: string; // ex: "S / Noir"
  price: string;
  sku?: string;
  inventory_quantity?: number;
  option1?: string; // Taille
  option2?: string; // Couleur
}

export interface GeneratedContent {
  title: string;
  short_description: string;
  long_description: string;
  bullet_points: string[];
  tags: string[];
  meta_title: string;
  meta_description: string;
}

export interface Product {
  id: string;
  user_id: string;
  shopify_product_id?: string;
  shopify_connection_id?: string;
  name: string;
  category?: string;
  material?: string;
  style?: string;
  price?: number;
  images: string[];
  variants: ProductVariant[];
  generated_content?: GeneratedContent;
  raw_data?: Record<string, any>;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

// Product Input (pour création)
export interface ProductInput {
  name: string;
  category?: string;
  material?: string;
  style?: string;
  price?: number;
  images: string[];
  variants: ProductVariant[];
}

// Shopify API Types
export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  handle: string;
  updated_at: string;
  published_at: string | null;
  template_suffix: string | null;
  status: 'active' | 'archived' | 'draft';
  published_scope: string;
  tags: string;
  admin_graphql_api_id: string;
  variants: ShopifyVariant[];
  options: ShopifyOption[];
  images: ShopifyImage[];
  image: ShopifyImage | null;
}

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku: string;
  position: number;
  inventory_policy: string;
  compare_at_price: string | null;
  fulfillment_service: string;
  inventory_management: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  created_at: string;
  updated_at: string;
  taxable: boolean;
  barcode: string | null;
  grams: number;
  image_id: number | null;
  weight: number;
  weight_unit: string;
  inventory_item_id: number;
  inventory_quantity: number;
  old_inventory_quantity: number;
  requires_shipping: boolean;
  admin_graphql_api_id: string;
}

export interface ShopifyOption {
  id: number;
  product_id: number;
  name: string;
  position: number;
  values: string[];
}

export interface ShopifyImage {
  id: number;
  product_id: number;
  position: number;
  created_at: string;
  updated_at: string;
  alt: string | null;
  width: number;
  height: number;
  src: string;
  variant_ids: number[];
  admin_graphql_api_id: string;
}

export interface ShopifyCollection {
  id: number;
  handle: string;
  title: string;
  updated_at: string;
  body_html: string;
  published_at: string;
  sort_order: string;
  template_suffix: string | null;
  published_scope: string;
  admin_graphql_api_id: string;
}

// AI Generation
export interface AIGenerationRequest {
  product_input: ProductInput;
  prompt_config?: PromptConfig;
}

export interface AIGenerationResponse {
  content: GeneratedContent;
  tokens_used?: number;
  cost?: number;
  latency_ms?: number;
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

