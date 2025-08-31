import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import SunoAPI from '../services/kieAI';

interface UserUsage {
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
  }>;
  totalAvailableGenerations?: number;
}

export function useUserUsage() {
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [sunoAPI] = useState(() => new SunoAPI());

  useEffect(() => {
    if (user) {
      loadUsage();
    } else {
      setUsage(null);
    }
  }, [user]);

  // Update usage with API key statistics
  const updateUsageWithApiStats = (baseUsage: UserUsage): UserUsage => {
    try {
      const apiKeyStats = sunoAPI.getApiKeyStats();
      const totalAvailableGenerations = sunoAPI.getTotalAvailableGenerations();
      
      return {
        ...baseUsage,
        apiKeyStats,
        totalAvailableGenerations
      };
    } catch (error) {
      console.warn('Failed to get API key stats:', error);
      return baseUsage;
    }
  };
  const loadUsage = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Check if Supabase is properly configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      console.log('Supabase configuration check:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        urlValue: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing',
        isPlaceholder: supabaseUrl === 'your_supabase_project_url'
      });
      
      if (!supabaseUrl || !supabaseKey || 
          supabaseUrl === 'your_supabase_project_url' || 
          supabaseKey === 'your_supabase_anon_key') {
        console.error('Supabase not properly configured');
        throw new Error('Supabase not configured - please check your .env file');
      }

      const apiUrl = `${supabaseUrl}/functions/v1/get-user-usage`;
      
      console.log('Fetching usage from:', apiUrl);
      
      // Check if we have a valid session token
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        console.error('No valid session token found');
        throw new Error('No valid session token');
      }

      console.log('Making request with token...');
      
      let response;
      try {
        response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.data.session.access_token}`,
            'Content-Type': 'application/json',
          },
          // Add timeout and other fetch options
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });
      } catch (fetchError) {
        console.error('Fetch request failed:', fetchError);
        if (fetchError.name === 'TimeoutError') {
          throw new Error('Request timeout - Supabase server may be unreachable');
        } else if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
          throw new Error('Cannot connect to Supabase - please check your VITE_SUPABASE_URL in .env file');
        }
        throw fetchError;
      }

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Supabase API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('Usage result:', result);
      
      if (result.success) {
        const usageData = {
          ...result.usage,
          apiKeyStats: result.apiKeyStats || [],
          totalAvailableGenerations: result.totalAvailableGenerations || 0
        };
        setUsage(updateUsageWithApiStats(usageData));
      } else {
        console.error('API error:', result);
        throw new Error(result.error || 'Failed to load usage data');
      }
    } catch (err: any) {
      console.error('Error loading usage:', err.message || err);
      console.error('Full error:', err);
      
      // Handle different types of fetch errors
      if (err.message?.includes('Supabase not configured') || err.message?.includes('check your .env file')) {
        setError('Supabase not configured. Please check your .env file and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
      } else if (err.message?.includes('Cannot connect to Supabase')) {
        setError('Cannot connect to Supabase. Please verify your VITE_SUPABASE_URL is correct and reachable.');
      } else if (err.message?.includes('Request timeout')) {
        setError('Connection timeout. Supabase server may be unreachable or slow.');
      } else if (err.message?.includes('No valid session token')) {
        setError('Authentication required. Please sign in again.');
      } else if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        setError('Unable to connect to Supabase. Please check your .env configuration and internet connection.');
      } else if (err.message.includes('Supabase API error')) {
        setError('Supabase server error. Please try again later.');
      } else {
        setError(`Failed to load usage data: ${err.message}`);
      }
      
      // Set default usage on error
      const defaultUsage = {
        current: 0,
        limit: 1,
        planType: 'free' as const,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        remaining: 1
      };
      setUsage(updateUsageWithApiStats(defaultUsage));
    } finally {
      setLoading(false);
    }
  };

  const generateMusic = async (prompt: string, options: any = {}) => {
    if (!user) {
      throw new Error('Must be logged in to generate music');
    }

    try {
      setLoading(true);
      setError(null);

      // Call the Supabase Edge Function instead of direct API
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const session = await supabase.auth.getSession();
      
      if (!session.data.session?.access_token) {
        throw new Error('No valid session token');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-music`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          options
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Generation failed');
      }
      
      console.log('🎵 Generation started successfully. Task ID:', result.taskId);
      
      // Update usage with API key stats if provided
      if (result.apiKeyStats || result.totalAvailableGenerations) {
        const updatedUsage = {
          ...usage,
          apiKeyStats: result.apiKeyStats || usage?.apiKeyStats || [],
          totalAvailableGenerations: result.totalAvailableGenerations || usage?.totalAvailableGenerations || 0,
          activeKeys: result.activeKeys || 0
        };
        setUsage(updatedUsage);
      }
      
      // Refresh usage data after generation starts
      await loadUsage();
      return result.taskId;
      
    } catch (err: any) {
      console.error('Error generating music:', err);
      const errorMessage = err.message || 'Music generation failed';
      setError(errorMessage);
      
      // Refresh usage in case of error to get accurate count
      await loadUsage();
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const checkGenerationStatus = async (taskId: string) => {
    if (!user) {
      throw new Error('Must be logged in');
    }

    try {
      // Call the Supabase Edge Function for status checking
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const session = await supabase.auth.getSession();
      
      if (!session.data.session?.access_token) {
        throw new Error('No valid session token');
      }

      console.log(`🔍 Checking generation status for task: ${taskId}`);

      const response = await fetch(`${supabaseUrl}/functions/v1/check-generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Status check failed:', response.status, errorText);
        throw new Error(`Failed to check generation status: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('📊 Status check result:', { 
        success: result.success, 
        status: result.status, 
        hasData: !!result.data?.length,
        error: result.error 
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Status check failed');
      }
      
      return {
        status: result.status,
        tracks: result.data || [],
        error: result.error
      };
      
    } catch (err: any) {
      console.error('Error checking status:', err);
      
      // Refresh usage data in case of errors to get accurate count
      try {
        await loadUsage();
      } catch (refreshError) {
        console.warn('Failed to refresh usage after error:', refreshError);
      }
      
      throw err;
    }
  };

  return {
    usage,
    loading,
    error,
    loadUsage,
    generateMusic,
    checkGenerationStatus,
    sunoAPI // Expose API instance for advanced usage
  };
}