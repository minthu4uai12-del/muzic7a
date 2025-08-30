import React from 'react';
import { Music2, Headphones, Radio, Disc3 } from 'lucide-react';

interface GenreSelectorProps {
  onGenreSelect: (genre: string) => void;
  selectedGenre: string | null;
}

export default function GenreSelector({ onGenreSelect, selectedGenre }: GenreSelectorProps) {
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
}
