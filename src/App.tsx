import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MusicLibrary from './components/MusicLibrary';
import MusicGenerator from './components/MusicGenerator';
import MusicPlayer from './components/MusicPlayer';
import MyMusicLibrary from './components/MyMusicLibrary';
import PublicMusicFeed from './components/PublicMusicFeed';
import PaymentPackages from './components/PaymentPackages';
import VideoGenerator from './components/VideoGenerator';
import VideoPackages from './components/VideoPackages';
import AdminPanel from './components/AdminPanel';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useJamendoMusic } from './hooks/useJamendoMusic';
import { useSavedTracks } from './hooks/useSavedTracks';
import { useUserUsage } from './hooks/useUserUsage';
import { useAuth } from './hooks/useAuth';
import { Track } from './types/music';

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [generatedTracks, setGeneratedTracks] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [genreTracks, setGenreTracks] = useState<Track[]>([]);
  
  const { user } = useAuth();
  const { savedTracks } = useSavedTracks();
  const { usage } = useUserUsage();
  
  const {
    tracks: jamendoTracks,
    playlists: jamendoPlaylists,
    loading,
    error,
    hasMore,
    searchMusic,
    getTracksByGenre,
    loadMoreTracks,
    refreshMusic,
    getRandomTracks
  } = useJamendoMusic();

  const {
    currentTrack,
    isPlaying,
    currentTime,
    volume,
    audioRef,
    playTrack,
    togglePlayPause,
    seekTo,
    setVolumeLevel
  } = useAudioPlayer();

  const handleTrackGenerated = (newTrack: Track) => {
    setGeneratedTracks(prev => [newTrack, ...prev]);
  };

  // Listen for navigation events
  React.useEffect(() => {
    const handleNavigateToPackages = () => setCurrentView('packages');
    const handleNavigateToVideoPackages = () => setCurrentView('video-packages');
    const handleNavigateToGenerator = () => setCurrentView('generator');
    const handleNavigateToVideoGenerator = () => setCurrentView('video-generator');
    const handleNavigateToMyMusic = () => setCurrentView('mymusic');
    const handleNavigateToAdmin = () => setCurrentView('admin');
    
    window.addEventListener('navigate-to-packages', handleNavigateToPackages);
    window.addEventListener('navigate-to-video-packages', handleNavigateToVideoPackages);
    window.addEventListener('navigate-to-generator', handleNavigateToGenerator);
    window.addEventListener('navigate-to-video-generator', handleNavigateToVideoGenerator);
    window.addEventListener('navigate-to-mymusic', handleNavigateToMyMusic);
    window.addEventListener('navigate-to-admin', handleNavigateToAdmin);
    
    return () => {
      window.removeEventListener('navigate-to-packages', handleNavigateToPackages);
      window.removeEventListener('navigate-to-video-packages', handleNavigateToVideoPackages);
      window.removeEventListener('navigate-to-generator', handleNavigateToGenerator);
      window.removeEventListener('navigate-to-video-generator', handleNavigateToVideoGenerator);
      window.removeEventListener('navigate-to-mymusic', handleNavigateToMyMusic);
      window.removeEventListener('navigate-to-admin', handleNavigateToAdmin);
    };
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = await searchMusic(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleGenreSelect = async (genre: string) => {
    setSelectedGenre(genre);
    if (genre === 'all') {
      setGenreTracks([]);
    } else {
      const tracks = await getTracksByGenre(genre);
      setGenreTracks(tracks);
    }
  };

  const handleShuffle = async () => {
    const randomTracks = await getRandomTracks(50);
    if (randomTracks.length > 0) {
      const randomIndex = Math.floor(Math.random() * randomTracks.length);
      playTrack(randomTracks[randomIndex]);
    }
  };
  // Combine all tracks based on current view and filters
  const getAllTracks = () => {
    const allTracks = [...generatedTracks, ...jamendoTracks];
    
    if (searchQuery.trim() && searchResults.length > 0) {
      return [...generatedTracks.filter(track => 
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase())
      ), ...searchResults];
    }
    
    if (selectedGenre && selectedGenre !== 'all' && genreTracks.length > 0) {
      return [...generatedTracks, ...genreTracks];
    }
    
    return allTracks;
  };

  const getPlaylists = () => {
    const allPlaylists = [...jamendoPlaylists];
    
    // Add generated tracks playlist if there are any
    if (generatedTracks.length > 0) {
      allPlaylists.unshift({
        id: 'generated',
        name: 'AI Generated Music',
        description: 'Your custom AI-generated tracks',
        tracks: generatedTracks,
        imageUrl: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800',
        createdAt: new Date()
      });
    }
    
    return allPlaylists;
  };

  const renderContent = () => {
    if (loading && jamendoTracks.length === 0) {
      return <LoadingSpinner message="Loading free music from Jamendo..." />;
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <p className="text-red-400 text-lg">Error loading music: {error}</p>
          <button 
            onClick={refreshMusic}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    switch (currentView) {
      case 'generator':
        return (
          <ProtectedRoute requireAuth={true}>
            <MusicGenerator
              onTrackGenerated={handleTrackGenerated}
              onPlayTrack={playTrack}
            />
          </ProtectedRoute>
        );
      case 'mymusic':
        return (
          <ProtectedRoute requireAuth={true}>
            <MyMusicLibrary
              onPlayTrack={playTrack}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onViewChange={setCurrentView}
            />
          </ProtectedRoute>
        );
      case 'public':
        return <PublicMusicFeed onPlayTrack={playTrack} currentTrack={currentTrack} isPlaying={isPlaying} />;
      case 'packages':
        return (
          <ProtectedRoute requireAuth={true}>
            <PaymentPackages />
          </ProtectedRoute>
        );
      case 'video-generator':
        return (
          <ProtectedRoute requireAuth={true}>
            <VideoGenerator />
          </ProtectedRoute>
        );
      case 'video-packages':
        return (
          <ProtectedRoute requireAuth={true}>
            <VideoPackages />
          </ProtectedRoute>
        );
      case 'admin':
        return (
          <ProtectedRoute requireAuth={true}>
            <AdminPanel />
          </ProtectedRoute>
        );
      case 'liked':
        return (
          <ProtectedRoute requireAuth={true}>
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <h3 className="text-2xl font-bold text-white">Liked Songs</h3>
              <p className="text-gray-400">Your favorite tracks will appear here</p>
            </div>
          </ProtectedRoute>
        );
      case 'recent':
        return (
          <ProtectedRoute requireAuth={true}>
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <h3 className="text-2xl font-bold text-white">Recently Played</h3>
              <p className="text-gray-400">Your listening history will appear here</p>
            </div>
          </ProtectedRoute>
        );
      case 'library':
      case 'home':
      default:
        return (
          <MusicLibrary
            tracks={getAllTracks()}
            playlists={getPlaylists()}
            onPlayTrack={playTrack}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onGenreSelect={handleGenreSelect}
            selectedGenre={selectedGenre}
            onLoadMore={loadMoreTracks}
            hasMore={hasMore}
            loading={loading}
            onRefresh={refreshMusic}
            onShuffle={handleShuffle}
          />
        );
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col">
      <audio ref={audioRef} />
      
      <Header onSearch={handleSearch} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          currentView={currentView} 
          onViewChange={setCurrentView}
          user={user}
        />
        
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
      
      <MusicPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        volume={volume}
        onPlayPause={togglePlayPause}
        onSeek={seekTo}
        onVolumeChange={setVolumeLevel}
      />
    </div>
  );
}

export default App;