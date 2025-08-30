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
  onSearch?: (query: string) => void;
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
  onSearch,
}: MusicLibraryProps) {
  // Memoized TrackItem component for performance
  const TrackItem = React.memo(({ track, index }: { track: Track; index: number }) => {
    const isCurrentTrack = currentTrack?.id === track.id;
    const [isSwiped, setIsSwiped] = React.useState(false);

    return (
      <div
        className={`group flex items-center p-2 md:p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${
          isCurrentTrack ? 'bg-white/10' : ''
        }`}
        onClick={() => onPlayTrack(track)}
        onTouchStart={() => setIsSwiped(false)}
        onTouchMove={() => setIsSwiped(true)}
        onTouchEnd={() => setIsSwiped(false)}
      >
        {/* Play/Pause and Index */}
        <div className="relative w-10 md:w-12">
          {!isSwiped ? (
            <>
              <span className="text-gray-400 text-sm w-6 text-center block group-hover:hidden">
                {index + 1}
              </span>
              <Play className="w-4 h-4 text-white hidden group-hover:block" />
            </>
          ) : (
            <button
              className="bg-red-600 p-1 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                console.log('Saved:', track.title);
              }}
              aria-label="Save track"
            >
              <Heart className="w-4 h-4 text-white" />
            </button>
          )}
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

        {/* Track Image */}
        <img
          src={track.imageUrl}
          alt={track.title}
          className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800';
          }}
        />

        {/* Track Info */}
        <div className="flex-1 min-w-0 pl-2 md:pl-3">
          <h4 className={`font-medium text-sm md:text-base truncate ${isCurrentTrack ? 'text-green-400' : 'text-white'}`}>
            {track.title}
            {track.isGenerated && (
              <span className="ml-2 px-1.5 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                AI
              </span>
            )}
          </h4>
          <p className="text-gray-400 text-xs md:text-sm truncate">{track.artist}</p>
          {track.tags && (
            <p className="text-gray-500 text-xs truncate">{track.tags}</p>
          )}
        </div>

        {/* Duration and More Options */}
        <div className="flex items-center space-x-2 md:space-x-4">
          <span className="text-gray-400 text-xs min-w-[30px] md:min-w-[40px] text-right">
            {formatTime(track.duration)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('More options:', track.title);
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-all"
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    );
  });

  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-8">
      {/* Sticky Genre Selector and Search Bar */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md pt-2 pb-4">
        <GenreSelector
          onGenreSelect={onGenreSelect}
          selectedGenre={selectedGenre}
        />
        {onSearch && (
          <div className="mt-4 px-2 md:px-0">
            <input
              type="text"
              placeholder="Search tracks..."
              className="w-full p-3 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-500"
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Featured Playlists */}
      {playlists.length > 0 && (
        <section>
          <h2 className="text-lg md:text-2xl font-bold text-white mb-3 md:mb-6 px-2 md:px-0">
            {selectedGenre ? `${selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)} Albums` : 'Featured Albums'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 px-2 md:px-0">
            {playlists.slice(0, 6).map((playlist) => (
              <div
                key={playlist.id}
                className="bg-white/5 rounded-lg md:rounded-xl p-2 md:p-4 hover:bg-white/10 transition-all"
              >
                <img
                  src={playlist.imageUrl}
                  alt={playlist.name}
                  className="w-full aspect-square rounded-lg object-cover mb-1 md:mb-2"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800';
                  }}
                />
                <h3 className="text-white font-medium text-sm md:text-base truncate">{playlist.name}</h3>
                <button
                  onClick={() => playlist.tracks.length > 0 && onPlayTrack(playlist.tracks[0])}
                  className="mt-2 bg-green-600 hover:bg-green-500 text-white p-2 rounded-full w-full flex items-center justify-center"
                  aria-label={`Play ${playlist.name}`}
                >
                  <Play className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Tracks */}
      <section>
        <div className="flex items-center justify-between mb-4 px-2 md:px-0">
          <h2 className="text-lg md:text-2xl font-bold text-white">
            {selectedGenre && selectedGenre !== 'all'
              ? `${selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)} Music`
              : 'Free Music from Jamendo'}
          </h2>
          <div className="flex items-center space-x-2 md:space-x-4">
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
                  aria-label="Refresh music"
                >
                  <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                </button>
              )}
              {onShuffle && tracks.length > 0 && (
                <button
                  onClick={onShuffle}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  title="Shuffle play"
                  aria-label="Shuffle play"
                >
                  <Shuffle className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>
        </div>

        {tracks.length > 0 ? (
          <div className="bg-white/5 rounded-lg md:rounded-xl p-2 md:p-4 border border-white/10">
            <div className="space-y-1">
              {tracks.map((track, index) => (
                <TrackItem key={`${track.id}-${index}`} track={track} index={index} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-4 md:mt-6 text-center px-2 md:px-0">
                <button
                  onClick={onLoadMore}
                  disabled={loading}
                  className="w-full md:w-auto px-4 md:px-6 py-2 md:py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 mx-auto text-sm md:text-base disabled:opacity-50"
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
          <div className="bg-white/5 rounded-lg md:rounded-xl p-4 md:p-6 border border-white/10 text-center">
            <p className="text-gray-400 text-sm md:text-base mb-2">
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin inline-block mr-1" />
                  Loading tracks...
                </>
              ) : (
                'No tracks found'
              )}
            </p>
            <p className="text-gray-500 text-xs md:text-sm">
              {selectedGenre && selectedGenre !== 'all'
                ? `Try selecting a different genre or search for specific tracks.`
                : 'Try searching for music or generate some AI tracks.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
