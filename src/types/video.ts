export interface VideoGenerationOptions {
  audioUrl: string;
  imageUrl: string;
  maskImage?: string;
  prompt?: string;
  resolution?: '480p' | '720p';
  seed?: number;
}

export interface VideoGenerationTask {
  id: string;
  status: 'created' | 'processing' | 'completed' | 'failed';
  audioUrl: string;
  imageUrl: string;
  prompt?: string;
  resolution: '480p' | '720p';
  outputs?: string[];
  hasNsfwContents?: boolean[];
  createdAt: string;
  userId: string;
  trackId?: string;
  trackTitle?: string;
}

export interface VideoPackage {
  id: string;
  name: string;
  name_mm: string;
  generations: number;
  price_mmk: number;
  description: string;
  description_mm: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VideoSubscription {
  id: string;
  user_id: string;
  current_usage: number;
  monthly_limit: number;
  reset_date: string;
  created_at: string;
  updated_at: string;
}

export interface WavespeedResponse {
  id: string;
  model: string;
  status: 'created' | 'processing' | 'completed' | 'failed';
  outputs: string[];
  has_nsfw_contents: boolean[];
  created_at: string;
  urls?: {
    get?: string;
    cancel?: string;
  };
}