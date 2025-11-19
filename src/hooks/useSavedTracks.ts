import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Track, SavedTrack } from '../types/music';
import { useAuth } from './useAuth';

export function useSavedTracks() {
  const [savedTracks, setSavedTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadSavedTracks();
    } else {
      setSavedTracks([]);
    }
  }, [user]);

  const loadSavedTracks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('saved_tracks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const tracks: Track[] = (data || []).map(convertSavedTrackToTrack);
      setSavedTracks(tracks);
    } catch (err) {
      console.error('Error loading saved tracks:', err);
      setError('Failed to load saved tracks');
    } finally {
      setLoading(false);
    }
  };

  const saveTrack = async (track: Track, isPublic: boolean = false): Promise<boolean> => {
    if (!user) {
      const errorMsg = 'You must be signed in to save tracks. Please sign in and try again.';
      console.error('Save track error: User not authenticated');
      setError(errorMsg);
      return false;
    }

    try {
      setError(null);
      setLoading(true);
      
      console.log('=== SAVE TRACK DEBUG ===');
      console.log('User ID:', user.id);
      console.log('Track data:', {
        id: track.id,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        audioUrl: track.audioUrl ? track.audioUrl.substring(0, 100) + '...' : 'NO URL',
        imageUrl: track.imageUrl ? 'Present' : 'Missing',
        isPublic: isPublic
      });

      // Validate track data
      if (!track.title || !track.audioUrl) {
        const missingFields = [];
        if (!track.title) missingFields.push('title');
        if (!track.audioUrl) missingFields.push('audio URL');
        const errorMsg = `Cannot save track: missing ${missingFields.join(' and ')}`;
        console.error('Validation failed:', errorMsg);
        setError(errorMsg);
        return false;
      }

      // Validate audio URL format
      if (!track.audioUrl.startsWith('http')) {
        const errorMsg = 'Invalid audio URL format - must start with http';
        console.error('Invalid audio URL:', track.audioUrl);
        setError(errorMsg);
        return false;
      }

      // Check if track already exists
      console.log('Checking for existing track...');
      const { data: existingTrack } = await supabase
        .from('saved_tracks')
        .select('id')
        .eq('user_id', user.id)
        .eq('title', track.title.trim())
        .eq('audio_url', track.audioUrl)
        .maybeSingle();

      if (existingTrack) {
        const errorMsg = 'This track has already been saved to your library';
        console.log('Track already exists:', existingTrack.id);
        setError(errorMsg);
        return false;
      }

      console.log('No existing track found, proceeding with save...');

      // Prepare track data for insertion
      const trackData = {
        user_id: user.id,
        title: track.title.trim(),
        artist: track.artist || 'Unknown Artist',
        duration: Math.max(1, Math.floor(track.duration) || 180),
        audio_url: track.audioUrl,
        image_url: track.imageUrl || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800',
        tags: track.tags ? (typeof track.tags === 'string' ? track.tags.split(',').map((t: string) => t.trim()) : track.tags) : null,
        prompt: track.prompt || null,
        task_id: track.taskId || null,
        is_public: isPublic,
        is_generated: track.isGenerated || false,
        play_count: 0
      };

      console.log('Prepared track data for insertion:', {
        ...trackData,
        audio_url: trackData.audio_url.substring(0, 100) + '...'
      });

      // Insert the track
      const { data, error: saveError } = await supabase
        .from('saved_tracks')
        .insert(trackData)
        .select()
        .single();

      if (saveError) {
        console.error('=== DATABASE SAVE ERROR ===');
        console.error('Error code:', saveError.code);
        console.error('Error message:', saveError.message);
        console.error('Error details:', saveError.details);
        console.error('Error hint:', saveError.hint);
        throw saveError;
      }

      if (!data) {
        const errorMsg = 'No data returned from save operation';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      console.log('=== SAVE SUCCESS ===');
      console.log('Saved track ID:', data.id);
      console.log('Public status:', data.is_public);

      // Update local state
      const savedTrack = convertSavedTrackToTrack(data);
      setSavedTracks(prev => [savedTrack, ...prev]);
      
      console.log('Track added to local state successfully');
      return true;
      
    } catch (err) {
      console.error('=== SAVE TRACK ERROR ===');
      console.error('Error type:', err.constructor.name);
      console.error('Error message:', err.message);
      console.error('Full error:', err);
      
      let errorMessage = 'Failed to save track';
      
      if (err?.message) {
        if (err.message.includes('duplicate key') || err.message.includes('unique constraint')) {
          errorMessage = 'This track has already been saved';
        } else if (err.message.includes('permission') || err.message.includes('policy')) {
          errorMessage = 'Permission denied. Please try signing out and back in';
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again';
        } else if (err.message.includes('JWT') || err.message.includes('auth')) {
          errorMessage = 'Authentication error. Please sign out and back in';
        } else {
          errorMessage = `Save failed: ${err.message}`;
        }
      }
      
      setError(errorMessage);
      return false;
      
    } finally {
      setLoading(false);
    }
  };

  const updateTrackVisibility = async (trackId: string, isPublic: boolean): Promise<boolean> => {
    if (!user) return false;

    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('saved_tracks')
        .update({ is_public: isPublic })
        .eq('id', trackId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setSavedTracks(prev =>
        prev.map(track =>
          track.id === trackId ? { ...track, isPublic } : track
        )
      );
      return true;
    } catch (err) {
      console.error('Error updating track visibility:', err);
      setError('Failed to update track visibility');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteTrack = async (trackId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('saved_tracks')
        .delete()
        .eq('id', trackId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setSavedTracks(prev => prev.filter(track => track.id !== trackId));
      return true;
    } catch (err) {
      console.error('Error deleting track:', err);
      setError('Failed to delete track');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const incrementPlayCount = async (trackId: string) => {
    try {
      const { error } = await supabase.rpc('increment_play_count', { track_id: trackId });
      if (error) {
        console.warn('Failed to increment play count:', error);
      }
    } catch (err) {
      console.error('Error incrementing play count:', err);
    }
  };

  const getPublicTracks = async (): Promise<Track[]> => {
    try {
      console.log('=== LOADING PUBLIC TRACKS ===');
      
      const { data, error: fetchError } = await supabase
        .from('saved_tracks')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      console.log('Public tracks loaded:', data?.length || 0);
      
      // Get unique user IDs from the tracks
      const userIds = [...new Set((data || []).map(track => track.user_id))];
      
      // Fetch user profiles separately
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);
      
      // Create a map of user profiles for quick lookup
      const profileMap = new Map();
      (profiles || []).forEach(profile => {
        profileMap.set(profile.id, profile);
      });
      
      const publicTracks = (data || []).map(item => {
        const profile = profileMap.get(item.user_id);
        return {
          ...convertSavedTrackToTrack(item),
          artist: profile?.display_name || profile?.username || item.artist || 'Anonymous User'
        };
      });
      
      console.log('Converted public tracks:', publicTracks.map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        isGenerated: t.isGenerated,
        isPublic: t.isPublic
      })));
      
      return publicTracks;
    } catch (err) {
      console.error('Error loading public tracks:', err);
      return [];
    }
  };

  return {
    savedTracks,
    loading,
    error,
    saveTrack,
    updateTrackVisibility,
    deleteTrack,
    incrementPlayCount,
    getPublicTracks,
    refreshTracks: loadSavedTracks
  };
}

function convertSavedTrackToTrack(savedTrack: SavedTrack): Track {
  return {
    id: savedTrack.id,
    title: savedTrack.title,
    artist: savedTrack.artist,
    duration: savedTrack.duration,
    audioUrl: savedTrack.audio_url,
    imageUrl: savedTrack.image_url,
    tags: savedTrack.tags,
    prompt: savedTrack.prompt,
    taskId: savedTrack.task_id,
    isGenerated: savedTrack.is_generated,
    isSaved: true,
    isPublic: savedTrack.is_public,
    playCount: savedTrack.play_count,
    userId: savedTrack.user_id,
    createdAt: new Date(savedTrack.created_at)
  };
}