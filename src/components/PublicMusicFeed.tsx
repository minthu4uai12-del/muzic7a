import React, { useState, useEffect } from 'react';
import { Play, Heart, Share2, User, Music, Globe, RefreshCw, Sparkles, Calendar, Eye } from 'lucide-react';
import { Track } from '../types/music';
import { formatTime } from '../utils/formatTime';
import { useSavedTracks } from '../hooks/useSavedTracks';

interface PublicMusicFeedProps {
  onPlayTrack: (track: Track) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
}

export default function PublicMusicFeed({ onPlayTrack, currentTrack, isPlaying }: PublicMusicFeedProps) {
  const [publicTracks, setPublicTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const { getPublicTracks } = useSavedTracks();

  useEffect(() => {
    loadPublicTracks();
  }, []);

  const loadPublicTracks = async () => {
    setLoading(true);
    try {
      const tracks = await getPublicTracks();
      setPublicTracks(tracks);
    } catch (error) {
      console.error('Error loading public tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const TrackCard = ({ track }: { track: Track }) => {
    const isCurrentTrack = currentTrack?.id === track.id;
    
    return (
      <div className="bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all group relative overflow-hidden">
        {/* Background gradient for AI tracks */}
        {track.isGenerated && (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 pointer-events-none" />
        )}
        
        <div className="relative z-10">
        <div className="flex items-start space-x-4">
          <div className="relative">
            <img
              src={track.imageUrl}
              alt={track.title}
              className="w-16 h-16 rounded-lg object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800';
              }}
            />
            <button
              onClick={() => onPlayTrack(track)}
              className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
            >
              <div className="bg-white/20 rounded-full p-2">
                <Play className="w-6 h-6 text-white ml-1" />
              </div>
            </button>
            {isCurrentTrack && isPlaying && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className={`font-semibold truncate ${isCurrentTrack ? 'text-green-400' : 'text-white'}`}>
                {track.title}
              </h3>
              {track.isGenerated && (
                <span className="px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs rounded-full flex items-center space-x-1">
                  <Sparkles className="w-3 h-3" />
                  <span>AI</span>
                </span>
              )}
              <Globe className="w-4 h-4 text-green-400" title="Public Track" />
            </div>
            
            <div className="flex items-center space-x-2 mb-2">
              <User className="w-4 h-4 text-gray-400" />
              <p className="text-gray-300 text-sm truncate font-medium">{track.artist}</p>
            </div>

            {track.tags && (
              <p className="text-gray-500 text-xs mb-2 truncate">{track.tags}</p>
            )}

            {track.prompt && (
              <div className="bg-white/5 rounded-lg p-3 mb-3">
                <p className="text-purple-300 text-sm italic font-medium">"{track.prompt}"</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-xs text-gray-400">
                <span className="flex items-center space-x-1">
                  <Music className="w-3 h-3" />
                  <span>{formatTime(track.duration)}</span>
                </span>
                {track.playCount !== undefined && (
                  <span className="flex items-center space-x-1">
                    <Eye className="w-3 h-3" />
                    <span>{track.playCount} plays</span>
                  </span>
                )}
                {track.createdAt && (
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(track.createdAt).toLocaleDateString()}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors group/btn">
                  <Heart className="w-4 h-4 text-gray-400 hover:text-red-400" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors group/btn">
                  <Share2 className="w-4 h-4 text-gray-400 hover:text-blue-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-gray-400 text-lg">Loading public music...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-2xl p-6 border border-green-500/30">
        <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center">
            <Globe className="w-8 h-8 mr-3 text-green-400" />
            Public Music Feed
          </h2>
            <p className="text-gray-300">Discover and enjoy music shared by the community</p>
        </div>
        <button
          onClick={loadPublicTracks}
          disabled={loading}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 shadow-lg"
          title="Refresh feed"
        >
          <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
        </button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{publicTracks.length}</p>
            <p className="text-gray-400 text-sm">Public Tracks</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{publicTracks.filter(t => t.isGenerated).length}</p>
            <p className="text-gray-400 text-sm">AI Generated</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{publicTracks.reduce((sum, t) => sum + (t.playCount || 0), 0)}</p>
            <p className="text-gray-400 text-sm">Total Plays</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{new Set(publicTracks.map(t => t.artist)).size}</p>
            <p className="text-gray-400 text-sm">Artists</p>
          </div>
        </div>
      </div>

      {publicTracks.length > 0 ? (
        <div className="space-y-6">
          {/* Filter Options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">
                All Public
              </button>
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-lg text-sm transition-colors">
                AI Generated
              </button>
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-lg text-sm transition-colors">
                Most Played
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">Sort by:</span>
              <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="newest" className="bg-gray-800">Newest First</option>
                <option value="popular" className="bg-gray-800">Most Popular</option>
                <option value="title" className="bg-gray-800">Title A-Z</option>
              </select>
            </div>
          </div>
          
          {/* Tracks Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {publicTracks.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
          </div>
        </div>
      ) : (
        <div className="bg-white/5 rounded-2xl p-12 border border-white/10 text-center relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-blue-600" />
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
          
          <div className="relative z-10">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-8 rounded-full w-32 h-32 mx-auto mb-8 flex items-center justify-center shadow-2xl">
            <Music className="w-12 h-12 text-white" />
          </div>
            <h3 className="text-3xl font-bold text-white mb-4">No Public Music Yet</h3>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto text-lg">
              Be the first to share your music with the community! Generate AI tracks or save existing ones as public to get started.
          </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('navigate-to-generator'));
            }}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
          >
                🎵 Generate AI Music
          </button>
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('navigate-to-mymusic'));
                }}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20 hover:border-white/40 font-medium"
              >
                📚 Share Existing Music
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}