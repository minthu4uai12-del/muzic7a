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
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'ai' | 'popular'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'title'>('newest');
  const { getPublicTracks } = useSavedTracks();

  useEffect(() => {
    loadPublicTracks();
  }, []);

  const loadPublicTracks = async () => {
    setLoading(true);
    setError(null);
    try {
      const tracks = await getPublicTracks();
      setPublicTracks(tracks);
    } catch (error) {
      console.error('Error loading public tracks:', error);
      setError('Failed to load public tracks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTracks = publicTracks.filter((track) => {
    if (filter === 'ai') return track.isGenerated;
    if (filter === 'popular') return (track.playCount || 0) > 0;
    return true;
  });

  const sortedTracks = [...filteredTracks].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'popular') return (b.playCount || 0) - (a.playCount || 0);
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return 0;
  });

  const TrackCard = React.memo(({ track }: { track: Track }) => {
    const isCurrentTrack = currentTrack?.id === track.id;

    return (
      <div className="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-all group relative">
        {/* Background gradient for AI tracks */}
        {track.isGenerated && (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 pointer-events-none rounded-lg" />
        )}

        <div className="relative z-10">
          <div className="flex items-start space-x-3">
            <div className="relative">
              <img
                src={track.imageUrl}
                alt={track.title}
                loading="lazy"
                className="w-12 h-12 rounded-lg object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=400';
                }}
              />
              <button
                onClick={() => onPlayTrack(track)}
                className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Play className="w-5 h-5 text-white" />
              </button>
              {isCurrentTrack && isPlaying && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1.5 mb-1">
                <h3 className={`font-medium text-sm truncate ${isCurrentTrack ? 'text-green-400' : 'text-white'}`}>
                  {track.title}
                </h3>
                {track.isGenerated && (
                  <span className="px-1.5 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[0.6rem] rounded-full flex items-center space-x-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>AI</span>
                  </span>
                )}
                <Globe className="w-3 h-3 text-green-400" title="Public Track" />
              </div>

              <div className="flex items-center space-x-1.5 mb-1.5">
                <User className="w-3 h-3 text-gray-400" />
                <p className="text-gray-400 text-xs truncate">{track.artist}</p>
              </div>

              {track.tags && (
                <p className="text-gray-500 text-[0.6rem] mb-1 truncate">{track.tags}</p>
              )}

              {track.prompt && (
                <div className="bg-white/5 rounded-lg p-2 mb-1.5">
                  <p className="text-purple-300 text-[0.7rem] italic font-medium">"{track.prompt}"</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[0.6rem] text-gray-400">
                  <span className="flex items-center space-x-0.5">
                    <Music className="w-2.5 h-2.5" />
                    <span>{formatTime(track.duration)}</span>
                  </span>
                  {track.playCount !== undefined && (
                    <span className="flex items-center space-x-0.5">
                      <Eye className="w-2.5 h-2.5" />
                      <span>{track.playCount} plays</span>
                    </span>
                  )}
                  {track.createdAt && (
                    <span className="flex items-center space-x-0.5">
                      <Calendar className="w-2.5 h-2.5" />
                      <span>{new Date(track.createdAt).toLocaleDateString()}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                    <Heart className="w-3 h-3 text-gray-400 hover:text-red-400" />
                  </button>
                  <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                    <Share2 className="w-3 h-3 text-gray-400 hover:text-blue-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin mb-3" />
        <p className="text-gray-400 text-sm text-center">Loading public music...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <p className="text-red-400 text-sm text-center mb-3">{error}</p>
        <button
          onClick={loadPublicTracks}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-xl p-4 sm:p-6 border border-green-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-3xl font-bold text-white mb-1 flex items-center justify-center sm:justify-start">
              <Globe className="w-6 h-6 mr-2 text-green-400" />
              Public Music Feed
            </h2>
            <p className="text-gray-300 text-sm">Discover and enjoy music shared by the community</p>
          </div>
          <button
            onClick={loadPublicTracks}
            disabled={loading}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 shadow-lg self-center sm:self-auto"
            title="Refresh feed"
          >
            <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4">
          <div className="bg-white/10 rounded-xl p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-white">{publicTracks.length}</p>
            <p className="text-gray-400 text-[0.7rem] sm:text-sm">Public Tracks</p>
          </div>
          <div className="bg-white/10 rounded-xl p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-white">{publicTracks.filter((t) => t.isGenerated).length}</p>
            <p className="text-gray-400 text-[0.7rem] sm:text-sm">AI Generated</p>
          </div>
          <div className="bg-white/10 rounded-xl p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-white">{publicTracks.reduce((sum, t) => sum + (t.playCount || 0), 0)}</p>
            <p className="text-gray-400 text-[0.7rem] sm:text-sm">Total Plays</p>
          </div>
          <div className="bg-white/10 rounded-xl p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-white">{new Set(publicTracks.map((t) => t.artist)).size}</p>
            <p className="text-gray-400 text-[0.7rem] sm:text-sm">Artists</p>
          </div>
        </div>
      </div>

      {/* Filter and Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-[0.7rem] sm:text-sm font-medium ${filter === 'all' ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
          >
            All Public
          </button>
          <button
            onClick={() => setFilter('ai')}
            className={`px-3 py-1.5 rounded-lg text-[0.7rem] sm:text-sm font-medium ${filter === 'ai' ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
          >
            AI Generated
          </button>
          <button
            onClick={() => setFilter('popular')}
            className={`px-3 py-1.5 rounded-lg text-[0.7rem] sm:text-sm font-medium ${filter === 'popular' ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
          >
            Most Played
          </button>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="text-gray-400 text-[0.7rem] sm:text-sm">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'popular' | 'title')}
            className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-[0.7rem] sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="newest">Newest First</option>
            <option value="popular">Most Popular</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>
      </div>

      {/* Tracks Grid */}
      {sortedTracks.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:gap-6">
          {sortedTracks.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      ) : (
        <div className="bg-white/5 rounded-xl p-6 sm:p-12 border border-white/10 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-blue-600" />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          </div>

          <div className="relative z-10">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-4 sm:p-8 rounded-full w-16 h-16 sm:w-32 sm:h-32 mx-auto mb-4 sm:mb-8 flex items-center justify-center shadow-xl">
              <Music className="w-6 h-6 sm:w-12 sm:h-12 text-white" />
            </div>
            <h3 className="text-xl sm:text-3xl font-bold text-white mb-2 sm:mb-4">No Public Music Yet</h3>
            <p className="text-gray-400 text-sm sm:text-lg mb-4 sm:mb-8 max-w-xs sm:max-w-lg mx-auto">
              Be the first to share your music with the community! Generate AI tracks or save existing ones as public to get started.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('navigate-to-generator'));
                }}
                className="px-4 py-2 sm:px-8 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg sm:rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-medium text-sm sm:text-base"
              >
                🎵 Generate AI Music
              </button>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('navigate-to-mymusic'));
                }}
                className="px-4 py-2 sm:px-8 sm:py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg sm:rounded-xl transition-all border border-white/20 hover:border-white/40 font-medium text-sm sm:text-base"
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
