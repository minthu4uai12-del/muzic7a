import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { VideoGenerationTask, VideoPackage, VideoSubscription } from '../types/video';
import { useAuth } from './useAuth';

export function useVideoGeneration() {
  const [videoTasks, setVideoTasks] = useState<VideoGenerationTask[]>([]);
  const [videoPackages, setVideoPackages] = useState<VideoPackage[]>([]);
  const [videoSubscription, setVideoSubscription] = useState<VideoSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadVideoPackages();
      loadVideoSubscription();
      loadVideoTasks();
    }
  }, [user]);

  const loadVideoPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('video_packages')
        .select('*')
        .eq('is_active', true)
        .order('price_mmk', { ascending: true });

      if (error) throw error;
      setVideoPackages(data || []);
    } catch (err) {
      console.error('Error loading video packages:', err);
      setError('Failed to load video packages');
    }
  };

  const loadVideoSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('video_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) {
        // Create default subscription
        const { data: newSub, error: createError } = await supabase
          .from('video_subscriptions')
          .insert({
            user_id: user.id,
            current_usage: 0,
            monthly_limit: 0
          })
          .select()
          .single();

        if (createError) throw createError;
        setVideoSubscription(newSub);
      } else {
        setVideoSubscription(data);
      }
    } catch (err) {
      console.error('Error loading video subscription:', err);
      setError('Failed to load video subscription');
    }
  };

  const loadVideoTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('video_generation_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideoTasks(data || []);
    } catch (err) {
      console.error('Error loading video tasks:', err);
      setError('Failed to load video tasks');
    }
  };

  const generateVideo = async (
    audioUrl: string,
    imageUrl: string,
    options: {
      prompt?: string;
      resolution?: '480p' | '720p';
      trackId?: string;
      trackTitle?: string;
    } = {}
  ): Promise<string | null> => {
    if (!user) {
      setError('Must be logged in to generate videos');
      return null;
    }

    if (!videoSubscription || videoSubscription.current_usage >= videoSubscription.monthly_limit) {
      setError('No video generations remaining. Please purchase a video pack.');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const session = await supabase.auth.getSession();
      
      if (!session.data.session?.access_token) {
        throw new Error('No valid session token');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-video`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioUrl,
          imageUrl,
          prompt: options.prompt || '',
          resolution: options.resolution || '480p',
          trackId: options.trackId,
          trackTitle: options.trackTitle
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Video generation failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Video generation failed');
      }
      
      console.log('🎬 Video generation started successfully. Task ID:', result.taskId);
      
      // Refresh data
      await loadVideoSubscription();
      await loadVideoTasks();
      
      return result.taskId;
      
    } catch (err: any) {
      console.error('Error generating video:', err);
      const errorMessage = err.message || 'Video generation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const checkVideoStatus = async (taskId: string) => {
    if (!user) {
      throw new Error('Must be logged in');
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const session = await supabase.auth.getSession();
      
      if (!session.data.session?.access_token) {
        throw new Error('No valid session token');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/check-video-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to check video status: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Status check failed');
      }
      
      return {
        status: result.status,
        outputs: result.outputs || [],
        error: result.error
      };
      
    } catch (err: any) {
      console.error('Error checking video status:', err);
      throw err;
    }
  };

  const formatMMK = (amount: number): string => {
    return new Intl.NumberFormat('my-MM', {
      style: 'currency',
      currency: 'MMK',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return {
    videoTasks,
    videoPackages,
    videoSubscription,
    loading,
    error,
    generateVideo,
    checkVideoStatus,
    refreshTasks: loadVideoTasks,
    refreshSubscription: loadVideoSubscription,
    formatMMK
  };
}