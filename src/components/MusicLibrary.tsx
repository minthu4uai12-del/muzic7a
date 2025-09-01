import React from 'react';
import { Play, Heart, MoreHorizontal, Plus, Shuffle, RefreshCw } from 'lucide-react';
import { Track, Playlist } from '../types/music';
import { formatTime } from '../utils/formatTime';
import GenreSelector from './GenreSelector';

interface MusicLibraryProps {
  tracks: Track[];
  playlists: Playlist[];
  onPlayTrack: (track: Track) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  onGenreSelect: (genre: string) => void;
  selectedGenre: string | null;
  onLoadMore: () => void;
  hasMore?: boolean;
  loading?: boolean;
  onRefresh?: () => void;
  onShuffle?: () => void;
}

export default function MusicLibrary({ 
  tracks, 
  playlists, 
  onPlayTrack, 
  currentTrack, 
  isPlaying,
  onGenreSelect,
  selectedGenre,
  onLoadMore,
  hasMore = true,
  loading = false,
  onRefresh,
  onShuffle
}: MusicLibraryProps) {
  const TrackItem = ({ track, index }: { track: Track; index: number }) => {
    const isCurrentTrack = currentTrack?.id === track.id;
    
    return (
      <div
        className={`group flex items-center p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${
          isCurrentTrack ? 'bg-white/10' : ''
        }`}
        onClick={() => onPlayTrack(track)}
      >
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative">
            <span className="text-gray-400 text-sm w-6 text-center block group-hover:hidden">
              {index + 1}
            </span>
            <Play className="w-4 h-4 text-white hidden group-hover:block" />
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
              target.src = 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800';
            }}
          />

          <div className="flex-1 min-w-0">
            <h4 className={`font-medium truncate ${isCurrentTrack ? 'text-green-400' : 'text-white'}`}>
              {track.title}
              {track.isGenerated && (
                <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                  AI
                </span>
              )}
            </h4>
            <p className="text-gray-400 text-sm truncate">{track.artist}</p>
            {track.tags && (
              <p className="text-gray-500 text-xs truncate">{track.tags}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-full transition-all">
            <Heart className="w-4 h-4 text-gray-400 hover:text-red-400" />
          </button>
          <span className="text-gray-400 text-sm min-w-[40px] text-right">
            {formatTime(track.duration)}
          </span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              // Add save functionality here if needed
              console.log('Save track:', track.title);
            }}
            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-full transition-all"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 md:p-6 space-y-6 md:space-y-8">
      {/* Genre Selection */}
      <GenreSelector onGenreSelect={onGenreSelect} selectedGenre={selectedGenre} />

      {/* Featured Playlists */}
      {playlists.length > 0 && (
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">
            {selectedGenre && selectedGenre !== 'all' ? `${selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)} Albums` : 'Featured Albums & Playlists'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {playlists.slice(0, 6).map((playlist) => (
              <div
                key={playlist.id}
                className="bg-white/5 rounded-xl md:rounded-2xl p-3 md:p-6 hover:bg-white/10 transition-all cursor-pointer group"
              >
                <img
                  src={playlist.imageUrl}
                  alt={playlist.name}
                  className="w-full aspect-square rounded-lg md:rounded-xl object-cover mb-2 md:mb-4"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800';
                  }}
                />
                <h3 className="text-white font-semibold text-sm md:text-lg mb-1 md:mb-2 truncate">{playlist.name}</h3>
                <p className="text-gray-400 text-xs md:text-sm mb-2 md:mb-4 line-clamp-2 hidden md:block">{playlist.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs md:text-sm">{playlist.tracks.length} tracks</span>
                  <button 
                    onClick={() => playlist.tracks.length > 0 && onPlayTrack(playlist.tracks[0])}
                    className="bg-green-600 hover:bg-green-500 text-white p-2 md:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0"
                  >
                    <Play className="w-3 md:w-4 h-3 md:h-4 ml-0.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Tracks */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white">
            {selectedGenre && selectedGenre !== 'all' 
              ? `${selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)} Music`
              : 'Free Music from Jamendo'
            }
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-gray-400 text-xs md:text-sm">
              {tracks.length} free tracks available
            </span>
            <div className="flex items-center space-x-2">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={loading}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                  title="Refresh music"
                >
                  <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                </button>
              )}
              {onShuffle && tracks.length > 0 && (
                <button
                  onClick={onShuffle}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  title="Shuffle play"
                >
                  <Shuffle className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {tracks.length > 0 ? (
          <div className="bg-white/5 rounded-xl md:rounded-2xl p-3 md:p-6 border border-white/10">
            <div className="space-y-1">
              {tracks.map((track, index) => (
                <TrackItem key={`${track.id}-${index}`} track={track} index={index} />
              ))}
            </div>
            
            {hasMore && (
              <div className="mt-4 md:mt-6 text-center">
                <button
                  onClick={onLoadMore}
                  disabled={loading}
                  className="px-4 md:px-6 py-2 md:py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center space-x-2 mx-auto text-sm md:text-base disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Load More Tracks</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/5 rounded-xl md:rounded-2xl p-6 md:p-12 border border-white/10 text-center">
            <p className="text-gray-400 text-base md:text-lg mb-4">
              {loading ? 'Loading tracks...' : 'No tracks found'}
            </p>
            <p className="text-gray-500 text-xs md:text-sm">
              {selectedGenre && selectedGenre !== 'all' 
                ? `Try selecting a different genre or search for specific tracks.`
                : 'Try searching for music or generate some AI tracks.'
              }
            </p>
          </div>
        )}
      </section>
    </div>
  );
}