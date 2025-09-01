import React, { useEffect, useRef } from 'react';
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
  // --- Visualizer Logic ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array>(new Uint8Array(0));

  useEffect(() => {
    if (!currentTrack?.previewUrl) return;

    const setupVisualizer = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;

      const audioElement = new Audio(currentTrack.previewUrl);
      audioElement.crossOrigin = "anonymous";
      const source = audioContext.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      if (isPlaying) {
        audioElement.play().catch(console.error);
      }

      return () => {
        audioContext.close();
        cancelAnimationFrame(animationRef.current);
      };
    };

    setupVisualizer();

    return () => {
      audioContextRef.current?.close();
      cancelAnimationFrame(animationRef.current);
    };
  }, [currentTrack?.previewUrl, isPlaying]);

  useEffect(() => {
    if (!canvasRef.current || !analyserRef.current || !isPlaying) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgb(0, 0, 0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / analyser.frequencyBinCount) * 2.5;
      let x = 0;

      for (let i = 0; i < analyser.frequencyBinCount; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `hsl(${i * 2}, 100%, 50%)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, currentTrack?.previewUrl]);

  // --- Track Item Component ---
  const TrackItem = React.memo(({ track, index }: { track: Track; index: number }) => {
    const isCurrentTrack = currentTrack?.id === track.id;

    return (
      <div
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onPlayTrack(track);
        }}
        className={`group flex items-center p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${
          isCurrentTrack ? 'bg-white/10' : ''
        }`}
        onClick={() => onPlayTrack(track)}
      >
        <div className="relative">
          {!isCurrentTrack && (
            <span className="text-gray-400 text-sm w-6 text-center block group-hover:hidden">
              {index + 1}
            </span>
          )}
          {isCurrentTrack && isPlaying ? (
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="flex space-x-0.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-0.5 h-3 bg-green-500 animate-pulse"
                    style={{ height: `${3 + i}px`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
          ) : (
            <Play className="w-4 h-4 text-white hidden group-hover:block" />
          )}
        </div>

        <img
          loading="lazy"
          src={track.imageUrl}
          alt={track.title}
          className="w-12 h-12 rounded-lg object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800';
          }}
        />

        <div className="flex-1 min-w-0 pl-3">
          <h4 className={`font-medium truncate ${isCurrentTrack ? 'text-green-400' : 'text-white'}`}>
            {track.title}
            {track.isGenerated && (
              <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                AI
              </span>
            )}
          </h4>
          <p className="text-gray-400 text-sm truncate">{track.artist}</p>
          {track.tags && <p className="text-gray-500 text-xs truncate">{track.tags}</p>}
        </div>

        <div className="flex items-center space-x-4">
          <button
            aria-label="Like track"
            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-full transition-all"
          >
            <Heart className="w-4 h-4 text-gray-400 hover:text-red-400" />
          </button>
          <span className="text-gray-400 text-sm min-w-[40px] text-right">
            {formatTime(track.duration)}
          </span>
          <button
            aria-label="More options"
            onClick={(e) => {
              e.stopPropagation();
              console.log('More options for:', track.title);
            }}
            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-full transition-all"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    );
  });

  // --- Main UI ---
  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-8">
      {/* Visualizer (Mobile: Hidden on small screens) */}
      {currentTrack && isPlaying && (
        <div className="hidden md:block mb-4">
          <canvas
            ref={canvasRef}
            width={window.innerWidth}
            height={100}
            className="w-full h-20 bg-black rounded-lg"
          />
        </div>
      )}

      {/* Genre Selection */}
      <GenreSelector onGenreSelect={onGenreSelect} selectedGenre={selectedGenre} />

      {/* Featured Playlists */}
      {playlists.length > 0 && (
        <section>
          <h2 className="text-lg md:text-2xl font-bold text-white mb-3 md:mb-6">
            {selectedGenre && selectedGenre !== 'all'
              ? `${selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)} Albums`
              : 'Featured Albums & Playlists'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
            {playlists.slice(0, 6).map((playlist) => (
              <div
                key={playlist.id}
                className="bg-white/5 rounded-xl p-2 md:p-4 hover:bg-white/10 transition-all cursor-pointer group"
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
                <h3 className="text-white font-semibold text-sm md:text-base mb-1 truncate">
                  {playlist.name}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">{playlist.tracks.length} tracks</span>
                  <button
                    onClick={() => playlist.tracks.length > 0 && onPlayTrack(playlist.tracks[0])}
                    className="bg-green-600 hover:bg-green-500 text-white p-1.5 md:p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Play className="w-3 h-3 md:w-4 md:h-4" />
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
            {selectedGenre && selectedGenre !== 'all'
              ? `${selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)} Music`
              : 'Free Music from Jamendo'}
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-xs">{tracks.length} free tracks</span>
            <div className="flex items-center space-x-1">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={loading}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                  aria-label="Refresh music"
                >
                  <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                </button>
              )}
              {onShuffle && tracks.length > 0 && (
                <button
                  onClick={onShuffle}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Shuffle play"
                >
                  <Shuffle className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>

          {tracks.length > 0 ? (
            <div className="bg-white/5 rounded-xl p-2 md:p-4 border border-white/10">
              <div className="space-y-1">
                {tracks.map((track, index) => (
                  <TrackItem key={`${track.id}-${index}`} track={track} index={index} />
                ))}
              </div>

              {hasMore && (
                <div className="mt-4 text-center">
                  <button
                    onClick={onLoadMore}
                    disabled={loading}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 mx-auto text-sm disabled:opacity-50"
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
            <div className="bg-white/5 rounded-xl p-4 md:p-8 text-center border border-white/10">
              <p className="text-gray-400 text-sm md:text-base mb-2">
                {loading ? 'Loading tracks...' : 'No tracks found'}
              </p>
              <p className="text-gray-500 text-xs">
                {selectedGenre && selectedGenre !== 'all'
                  ? 'Try a different genre or search for tracks.'
                  : 'Search for music or generate AI tracks.'}
              </p>
            </div>
          )}
        </section>
      </div>
    );
  }
