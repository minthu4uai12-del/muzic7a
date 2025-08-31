export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  audioUrl: string;
  imageUrl: string;
  tags?: string;
  isGenerated?: boolean;
  taskId?: string;
  prompt?: string;
  isSaved?: boolean;
  isPublic?: boolean;
  playCount?: number;
  userId?: string;
  createdAt?: Date;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  tracks: Track[];
  imageUrl: string;
  createdAt: Date;
}

export interface GenerationOptions {
  customMode?: boolean;
  instrumental?: boolean;
  model?: string;
  style?: string;
  title?: string;
  negativeTags?: string;
}

export interface GenerationTask {
  taskId: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  prompt: string;
  options: GenerationOptions;
  createdAt: Date;
  result?: Track[];
}

export interface KieAIResponse {
  code: number;
  msg: string;
  data: {
    taskId?: string;
    sunoData?: Array<{
      id: string;
      title: string;
      audioUrl: string;
      duration: number;
      tags: string;
    }>;
    status?: string;
    errorMessage?: string;
    response?: {
      sunoData: Array<{
        id: string;
        title: string;
        audioUrl: string;
        duration: number;
        tags: string;
      }>;
    };
  };
}

export interface SavedTrack {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  duration: number;
  audio_url: string;
  image_url: string;
  tags?: string;
  prompt?: string;
  task_id?: string;
  is_public: boolean;
  is_generated: boolean;
  play_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface UserUsage {
  current: number;
  limit: number;
  planType: 'free' | 'premium';
  resetDate: string;
  remaining: number;
  apiKeyStats?: Array<{
    index: number;
    usage: number;
    maxUsage: number;
    resetTime: Date;
    isActive: boolean;
    lastUsed: Date | null;
    isBlocked?: boolean;
  }>;
  totalAvailableGenerations?: number;
  activeKeys?: number;
}