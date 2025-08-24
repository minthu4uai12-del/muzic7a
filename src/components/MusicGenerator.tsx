import React, { useState } from 'react';
import { Sparkles, Wand2, Music, Download, Play, Loader2, Save, ShoppingCart, RotateCcw, CheckCircle } from 'lucide-react';
import { GenerationOptions, Track } from '../types/music';
import SaveTrackModal from './SaveTrackModal';
import { useSavedTracks } from '../hooks/useSavedTracks';
import { useUserUsage } from '../hooks/useUserUsage';

interface MusicGeneratorProps {
  onTrackGenerated: (track: Track) => void;
  onPlayTrack: (track: Track) => void;
}

const styles = [
  'Pop', 'Rock', 'Electronic', 'Hip-Hop', 'Jazz', 'Classical',
  'Ambient', 'Folk', 'R&B', 'Country', 'Indie', 'Synthwave'
];

export default function MusicGenerator({ onTrackGenerated, onPlayTrack }: MusicGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<GenerationOptions>({
    customMode: true,
    instrumental: false,
    model: 'V3_5',
    style: '',
    title: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTracks, setGeneratedTracks] = useState<Track[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [trackToSave, setTrackToSave] = useState<Track | null>(null);
  const [downloadingTrackId, setDownloadingTrackId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [error, setError] = useState('');
  const { saveTrack } = useSavedTracks();
  const { generateMusic, checkGenerationStatus } = useUserUsage();

  const downloadAudio = async (url: string, title: string) => {
    try {
      // Create a safe filename
      const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      // Fetch the audio file
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch audio');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${safeTitle}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  const handleDownload = async (url: string, title: string, trackId: string) => {
    if (!url) {
      alert('Audio URL not available for download');
      return;
    }
    
    setDownloadingTrackId(trackId);
    try {
      await downloadAudio(url, title);
    } finally {
      setDownloadingTrackId(null);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a music prompt');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsGenerating(true);
    setError('');
    
    try {
      const taskId = await generateMusic(prompt, options);

      // Poll for completion
      const pollForCompletion = async () => {
        try {
          const result = await checkGenerationStatus(taskId);
          
          if (result.status === 'SUCCESS' && result.tracks.length > 0) {
            const tracks: Track[] = result.tracks.map((track: any) => ({
              id: track.id,
              title: track.title || options.title || 'Generated Track',
              artist: 'AI Generated',
              duration: track.duration || 180,
              audioUrl: track.audioUrl,
              imageUrl: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800',
              tags: track.tags,
              isGenerated: true,
              taskId,
              prompt
            }));

            setGeneratedTracks(prev => [...prev, ...tracks]);
            tracks.forEach(track => onTrackGenerated(track));
            setIsGenerating(false);
            setSaveMessage('Music generated successfully!');
            setTimeout(() => setSaveMessage(''), 3000);
          } else if (result.status?.includes('FAILED') || result.error) {
            throw new Error(result.error || 'Generation failed');
          } else {
            // Still processing, check again in 10 seconds
            setTimeout(pollForCompletion, 10000);
          }
        } catch (error) {
          console.error('Generation failed:', error);
          setError(`Generation failed: ${error.message}`);
          setIsGenerating(false);
        }
      };

      // Start polling after 10 seconds
      setTimeout(pollForCompletion, 10000);
    } catch (error) {
      console.error('Generation failed:', error);
      setError(`Generation failed: ${error.message}`);
      setIsGenerating(false);
    }
  };

  const handleSaveTrack = (track: Track) => {
    setTrackToSave(track);
    setShowSaveModal(true);
  };

  const handleSaveConfirm = async (track: Track, isPublic: boolean) => {
    const success = await saveTrack(track, isPublic);
    return success;
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-full">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">AI Music Generator</h2>
        <p className="text-gray-400 text-sm md:text-base">Create unique music tracks with artificial intelligence</p>
      </div>

      {/* Messages */}
      {saveMessage && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
          <p className="text-green-400 text-sm flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            {saveMessage}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Generation Form */}
      <div className="bg-white/5 rounded-2xl p-4 md:p-6 border border-white/10">
        <div className="space-y-4 md:space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Music Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the music you want to generate..."
              className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none h-24"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Track Title
              </label>
              <input
                type="text"
                value={options.title}
                onChange={(e) => setOptions({ ...options, title: e.target.value })}
                placeholder="Enter track title"
                className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Style
              </label>
              <input
                type="text"
                value={options.style}
                onChange={(e) => setOptions({ ...options, style: e.target.value })}
                placeholder="e.g., Folk, Acoustic, Nostalgic"
                className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs md:text-sm text-gray-400">Quick styles:</span>
            {styles.map(style => (
              <button
                key={style}
                onClick={() => setOptions({ ...options, style })}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs text-gray-300 hover:text-white transition-colors"
              >
                {style}
              </button>
            ))}
          </div>
          <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={options.instrumental}
                onChange={(e) => setOptions({ ...options, instrumental: e.target.checked })}
                className="rounded border-gray-600 bg-white/10 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-gray-300">Instrumental only</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={options.customMode}
                onChange={(e) => setOptions({ ...options, customMode: e.target.checked })}
                className="rounded border-gray-600 bg-white/10 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-gray-300">Custom mode</span>
            </label>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-all flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Music...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>Generate Music</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Tracks */}
      {generatedTracks.length > 0 && (
        <div className="bg-white/5 rounded-2xl p-4 md:p-6 border border-white/10">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Music className="w-5 h-5 mr-2" />
            Generated Tracks
          </h3>
          <div className="space-y-3">
            {generatedTracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
                  <img
                    src={track.imageUrl}
                    alt={track.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div>
                    <h4 className="text-white font-medium text-sm md:text-base truncate">{track.title}</h4>
                    <p className="text-gray-400 text-xs md:text-sm">{track.artist}</p>
                    {track.tags && (
                      <p className="text-gray-500 text-xs truncate">{track.tags}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                  <button
                    onClick={() => onPlayTrack(track)}
                    title="Play track"
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <Play className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => handleDownload(track.audioUrl, track.title, track.id)}
                    disabled={downloadingTrackId === track.id}
                    title="Download track"
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                  >
                    {downloadingTrackId === track.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 text-white" />
                    )}
                  </button>
                  <button
                    onClick={() => handleSaveTrack(track)}
                    title="Save track"
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <Save className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <SaveTrackModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        track={trackToSave}
        onSave={handleSaveConfirm}
      />
    </div>
  );
}
