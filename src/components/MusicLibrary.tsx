import React from 'react';
import { Play, Heart, MoreHorizontal, Plus, Shuffle, RefreshCw, Music2, Headphones, Radio, Disc3 } from 'lucide-react';
import { Track, Playlist } from '../types/music';
import { formatTime } from '../utils/formatTime';

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
  // GenreSelector component integrated directly
  const GenreSelector = () => {
    const genres = [
      { id: 'all', name: 'All Music', icon: Music2, color: 'from-purple-500 to-pink-500' },
      { id: 'electronic', name: 'Electronic', icon: Radio, color: 'from-blue-500 to-cyan-500' },
      { id: 'rock', name: 'Rock', icon: Disc3, color: 'from-red-500 to-orange-500' },
      { id: 'jazz', name: 'Jazz', icon: Headphones, color: 'from-yellow-500 to-amber-500' },
      { id: 'classical', name: 'Classical', icon: Music2, color: 'from-green-500 to-emerald-500' },
      { id: 'ambient', name: 'Ambient', icon: Radio, color: 'from-indigo-500 to-purple-500' },
      { id: 'folk', name: 'Folk', icon: Music2, color: 'from-teal-500 to-green-500' },
      { id: 'world', name: 'World', icon: Disc3, color: 'from-pink-500 to-rose-500' },
      { id: 'pop', name: 'Pop', icon: Music2, color: 'from-orange-500 to-red-500' },
      { id: 'hiphop', name: 'Hip Hop', icon: Radio, color: 'from-gray-500 to-slate-500' },
      { id: 'reggae', name: 'Reggae', icon: Disc3, color: 'from-lime-500 to-green-500' },
      { id: 'blues', name: 'Blues', icon: Headphones, color: 'from-blue-600 to-indigo-600' }
    ];

    return (
      <div className="w-full bg-black/80 backdrop-blur-md rounded-lg p-3 md:p-4 mb-4 md:mb-6">
        <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4 px-1">Browse by Genre</h3>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-12 gap-2 md:gap-3">
          {genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => onGenreSelect(genre.id)}
              className={`group relative overflow-hidden rounded-lg p-2 md:p-3 transition-all duration-200 hover:scale-105 ${
                selectedGenre === genre.id ? 'ring-2 ring-green-500/80 scale-105' : ''
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${genre.color} opacity-70 group-hover:opacity-90 transition-opacity`} />
              <div className="relative z-10 flex flex-col items-center space-y-1">
                <genre.icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                <span className="text-white text-xs font-medium text-center leading-tight">
                  {genre.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

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
              {!isCurrentTrack && <Play className="w-4 h-4 text-white hidden group-hover:block" />}
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
          className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover ml-2"
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
    <div className="w-full p-2 md:p-4 space-y-4">
      {/* Sticky Header with GenreSelector and Search */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-md pt-2 pb-4">
        <GenreSelector />
        {onSearch && (
          <div className="mt-2 px-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search tracks, artists..."
                className="w-full pl-10 pr-4 py-2 bg-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                onChange={(e) => onSearch(e.target.value)}
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Featured Playlists Section */}
      {playlists.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg md:text-2xl font-bold text-white mb-3 md:mb-4 px-1">
            {selectedGenre && selectedGenre !== 'all'
              ? `${selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)} Playlists`
              : 'Featured Playlists'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
            {playlists.slice(0, 8).map((playlist) => (
              <div
                key={playlist.id}
                className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => playlist.tracks.length > 0 && onPlayTrack(playlist.tracks[0])}
              >
                <div className="relative aspect-square rounded-lg overflow-hidden mb-2">
                  <img
                    src={playlist.imageUrl}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-3">
                    <Play className="w-6 h-6 text-white bg-black/60 rounded-full p-1" />
                  </div>
                </div>
                <h3 className="text-white font-medium text-sm md:text-base truncate">{playlist.name}</h3>
                <p className="text-gray-400 text-xs truncate">{playlist.tracks.length} tracks</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Tracks Section */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-lg md:text-2xl font-bold text-white">
            {selectedGenre && selectedGenre !== 'all'
              ? `${selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)} Music`
              : 'All Music'}
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-xs md:text-sm">
              {tracks.length} tracks
            </span>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            {onShuffle && (
              <button
                onClick={onShuffle}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>

        {tracks.length > 0 ? (
          <div className="bg-white/5 rounded-lg overflow-hidden">
            <div className="divide-y divide-white/10">
              {tracks.map((track, index) => (
                <TrackItem key={`${track.id}-${index}`} track={track} index={index} />
              ))}
            </div>

            {hasMore && (
              <div className="p-3 text-center">
                <button
                  onClick={onLoadMore}
                  disabled={loading}
                  className="w-full md:w-auto px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Load More</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/5 rounded-lg p-6 text-center">
            <p className="text-gray-400 mb-2">
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />
                  Loading tracks...
                </>
              ) : (
                'No tracks found'
              )}
            </p>
            <p className="text-gray-500 text-sm">
              {selectedGenre && selectedGenre !== 'all'
                ? `Try selecting a different genre.`
                : 'Try searching for music or select a genre.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
