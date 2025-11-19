import React, { useState } from 'react';
import { Play, Heart, MoreHorizontal, Globe, Lock, Trash2, Edit3, Eye, Music, Crown, Calendar, TrendingUp } from 'lucide-react';
import { Track } from '../types/music';
import { formatTime } from '../utils/formatTime';
import { useSavedTracks } from '../hooks/useSavedTracks';
import { useUserUsage } from '../hooks/useUserUsage';

interface MyMusicLibraryProps {
  onPlayTrack: (track: Track) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  onViewChange?: (view: string) => void;
}

export default function MyMusicLibrary({ onPlayTrack, currentTrack, isPlaying, onViewChange }: MyMusicLibraryProps) {
  const { savedTracks, loading, updateTrackVisibility, deleteTrack } = useSavedTracks();
  const { usage } = useUserUsage();
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  const handleVisibilityToggle = async (track: Track) => {
    await updateTrackVisibility(track.id, !track.isPublic);
    setShowMenu(null);
  };

  const handleDelete = async (track: Track) => {
    if (confirm('Are you sure you want to delete this track? This action cannot be undone.')) {
      await deleteTrack(track.id);
      setShowMenu(null);
    }
  };

  const TrackItem = ({ track, index }: { track: Track; index: number }) => {
    const isCurrentTrack = currentTrack?.id === track.id;
    
    return (
      <div
        className={`group flex items-center p-4 rounded-lg hover:bg-white/5 transition-colors ${
          isCurrentTrack ? 'bg-white/10' : ''
        }`}
      >
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative">
            <span className="text-gray-400 text-sm w-6 text-center block group-hover:hidden">
              {index + 1}
            </span>
            <button
              onClick={() => onPlayTrack(track)}
              className="hidden group-hover:block"
            >
              <Play className="w-4 h-4 text-white" />
            </button>
            {isCurrentTrack && isPlaying && (
              <div className="w-4 h-4 flex items-center justify-center">
                <div className="flex space-x-0.5">
                  <div className="w-0.5 h-3 bg-green-500 animate-pulse"></div>
                  <div className="w-0.5 h-2 bg-green-500 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-0.5 h-4 bg-green-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            )}
          </div>

          <img
            src={track.imageUrl}
            alt={track.title}
            className="w-12 h-12 rounded-lg object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800';
            }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className={`font-medium truncate ${isCurrentTrack ? 'text-green-400' : 'text-white'}`}>
                {track.title}
              </h4>
              {track.isGenerated && (
                <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                  AI
                </span>
              )}
              {track.isPublic ? (
                <Globe className="w-4 h-4 text-green-400" title="Public" />
              ) : (
                <Lock className="w-4 h-4 text-gray-400" title="Private" />
              )}
            </div>
            <p className="text-gray-400 text-sm truncate">{track.artist}</p>
            {track.tags && (
              <p className="text-gray-500 text-xs truncate">{track.tags}</p>
            )}
            <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
              {track.playCount !== undefined && (
                <span className="flex items-center">
                  <Eye className="w-3 h-3 mr-1" />
                  {track.playCount} plays
                </span>
              )}
              {track.createdAt && (
                <span>
                  Saved {new Date(track.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-full transition-all">
            <Heart className="w-4 h-4 text-gray-400 hover:text-red-400" />
          </button>
          <span className="text-gray-400 text-sm min-w-[40px] text-right">
            {formatTime(track.duration)}
          </span>
          <div className="relative">
            <button
              onClick={() => setShowMenu(showMenu === track.id ? null : track.id)}
              className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-full transition-all"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>
            
            {showMenu === track.id && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(null)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg shadow-xl z-20">
                  <button
                    onClick={() => handleVisibilityToggle(track)}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {track.isPublic ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span className="text-sm">Make Private</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4" />
                        <span className="text-sm">Make Public</span>
                      </>
                    )}
                  </button>
                  <button className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                    <Edit3 className="w-4 h-4" />
                    <span className="text-sm">Edit Details</span>
                  </button>
                  <button
                    onClick={() => handleDelete(track)}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm">Delete Track</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading && savedTracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-gray-400 text-lg">Loading your music...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl p-6 border border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center">
              <Music className="w-8 h-8 mr-3 text-purple-400" />
              My Music Library
            </h2>
            <p className="text-gray-400">Your personal collection of saved and generated tracks</p>
          </div>
          {usage && (
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-2">
                <Crown className={`w-5 h-5 ${usage.planType === 'premium' ? 'text-yellow-400' : 'text-gray-400'}`} />
                <span className="text-white font-semibold capitalize">{usage.planType}</span>
              </div>
              <p className="text-gray-400 text-sm">{usage.remaining} generations left</p>
            </div>
          )}
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{savedTracks.length}</p>
            <p className="text-gray-400 text-sm">Total Tracks</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{savedTracks.filter(t => t.isGenerated).length}</p>
            <p className="text-gray-400 text-sm">AI Generated</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{savedTracks.filter(t => t.isPublic).length}</p>
            <p className="text-gray-400 text-sm">Public</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{savedTracks.reduce((sum, t) => sum + (t.playCount || 0), 0)}</p>
            <p className="text-gray-400 text-sm">Total Plays</p>
          </div>
        </div>
      </div>

      {savedTracks.length > 0 ? (
        <div className="space-y-6">
          {/* Filter/Sort Options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium">
                All Tracks
              </button>
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-lg text-sm transition-colors">
                AI Generated
              </button>
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-lg text-sm transition-colors">
                Public
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">Sort by:</span>
              <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="newest" className="bg-gray-800">Newest First</option>
                <option value="oldest" className="bg-gray-800">Oldest First</option>
                <option value="plays" className="bg-gray-800">Most Played</option>
                <option value="title" className="bg-gray-800">Title A-Z</option>
              </select>
            </div>
          </div>

          {/* Tracks List */}
          <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Your Tracks
              </h3>
            </div>
            <div className="divide-y divide-white/10">
            {savedTracks.map((track, index) => (
              <TrackItem key={track.id} track={track} index={index} />
            ))}
          </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 rounded-2xl p-12 border border-white/10 text-center relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600" />
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
          
          <div className="relative z-10">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 rounded-full w-32 h-32 mx-auto mb-8 flex items-center justify-center shadow-2xl">
            <Music className="w-12 h-12 text-white" />
          </div>
            <h3 className="text-3xl font-bold text-white mb-4">Your Music Library is Empty</h3>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto text-lg">
              Start building your personal music collection! Generate AI music or save tracks from the library to see them here.
          </p>
            
            {usage && (
              <div className="bg-white/10 rounded-xl p-4 mb-8 max-w-md mx-auto">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Crown className={`w-4 h-4 ${usage.planType === 'premium' ? 'text-yellow-400' : 'text-gray-400'}`} />
                  <span className="text-white font-medium">
                    {usage.remaining} {usage.planType === 'premium' ? 'premium' : 'free'} generations remaining
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                    style={{ width: `${((usage.limit - usage.remaining) / usage.limit) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => {
                onViewChange?.('generator');
              }}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
            >
                🎵 Generate AI Music
            </button>
            <button 
              onClick={() => {
                onViewChange?.('library');
              }}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20 hover:border-white/40 font-medium"
            >
                📚 Browse Music Library
            </button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}