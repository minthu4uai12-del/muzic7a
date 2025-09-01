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
  onShuffle,
}: MusicLibraryProps) {
  const TrackItem = React.memo(({ track, index }: { track: Track; index: number }) => {
    const isCurrentTrack = currentTrack?.id === track.id;

    return (
      <div
        className={`group flex flex-col md:flex-row items-start md:items-center p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${
          isCurrentTrack ? 'bg-white/10' : ''
        }`}
        onClick={() => onPlayTrack(track)}
      >
        <div className="flex items-center w-full">
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
            loading="lazy"
            src={track.imageUrl}
            alt={track.title}
            className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800';
            }}
          />
          <div className="flex-1 min-w-0 md:ml-3">
            <h4 className={`font-medium truncate text-sm md:text-base ${isCurrentTrack ? 'text-green-400' : 'text-white'}`}>
              {track.title}
              {track.isGenerated && (
                <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                  AI
                </span>
              )}
            </h4>
            <p className="text-gray-400 text-xs truncate">{track.artist}</p>
            {track.tags && <p className="text-gray-500 text-xs truncate md:hidden">{track.tags}</p>}
          </div>
          <div className="flex items-center space-x-2 mt-2 md:mt-0 md:ml-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Like track:', track.title);
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-all"
              aria-label="Like track"
            >
              <Heart className="w-4 h-4 text-gray-400 hover:text-red-400" />
            </button>
            <span className="text-gray-400 text-xs min-w-[40px] text-right">{formatTime(track.duration)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('More options for track:', track.title);
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-all"
              aria-label="More options"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    );
  });

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 pb-20">
      {/* Genre Selection */}
      <GenreSelector onGenreSelect={onGenreSelect} selectedGenre={selectedGenre} />

      {/* Featured Playlists */}
      {playlists.length > 0 && (
        <section>
          <h2 className="text-lg md:text-2xl font-bold text-white mb-3 md:mb-6">
            {selectedGenre && selectedGenre !== 'all' ? `${selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)} Albums` : 'Featured Albums'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
            {playlists.slice(0, 6).map((playlist) => (
              <div
                key={playlist.id}
                className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-all cursor-pointer group"
              >
                <img
                  loading="lazy"
                  src={playlist.imageUrl}
                  alt={playlist.name}
                  className="w-full aspect-square rounded-lg object-cover mb-2"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800';
                  }}
                />
                <h3 className="text-white font-semibold text-sm md:text-lg mb-1 truncate">{playlist.name}</h3>
                <p className="text-gray-400 text-xs mb-2 line-clamp-2 hidden md:block">{playlist.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">{playlist.tracks.length} tracks</span>
                  <button
                    onClick={() => playlist.tracks.length > 0 && onPlayTrack(playlist.tracks[0])}
                    className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                    aria-label="Play playlist"
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-2xl font-bold text-white">
            {selectedGenre && selectedGenre !== 'all' ? `${selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)} Music` : 'Free Music'}
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-xs">{tracks.length} tracks</span>
            <div className="flex items-center space-x-2">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={loading}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                  aria-label="Refresh music"
                >
                  <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                </button>
              )}
              {onShuffle && tracks.length > 0 && (
                <button
                  onClick={onShuffle}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Shuffle play"
                >
                  <Shuffle className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>

          {tracks.length > 0 ? (
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="space-y-1">
                {tracks.map((track, index) => (
                  <TrackItem key={`${track.id}-${index}`} track={track} index={index} />
                ))}
              </div>

              {hasMore && (
                <div className="mt-4">
                  <button
                    onClick={onLoadMore}
                    disabled={loading}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
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
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
              <p className="text-gray-400 text-sm md:text-base mb-4">
                {loading ? 'Loading tracks...' : 'No tracks found'}
              </p>
              <p className="text-gray-500 text-xs md:text-sm">
                {selectedGenre && selectedGenre !== 'all' ? 'Try selecting a different genre.' : 'Try searching for music or generate some AI tracks.'}
              </p>
            </div>
          )}
        </section>

      {/* Fixed Bottom Player Bar */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-3 flex items-center justify-between border-t border-white/10">
          <div className="flex items-center flex-1 min-w-0">
            <img
              loading="lazy"
              src={currentTrack.imageUrl}
              alt={currentTrack.title}
              className="w-10 h-10 rounded-lg object-cover mr-3"
            />
            <div className="min-w-0">
              <h4 className="font-medium truncate text-sm text-white">{currentTrack.title}</h4>
              <p className="text-gray-400 text-xs truncate">{currentTrack.artist}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onShuffle}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Shuffle"
            >
              <Shuffle className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => onPlayTrack(currentTrack)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <RefreshCw className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Like current track:', currentTrack.title);
              }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Like"
            >
              <Heart className="w-5 h-5 text-gray-400 hover:text-red-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
