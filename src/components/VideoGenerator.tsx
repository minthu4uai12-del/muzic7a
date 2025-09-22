import React, { useState, useRef } from 'react';
import { Video, Upload, Wand2, Play, Download, Loader2, Image as ImageIcon, Music, AlertCircle, CheckCircle } from 'lucide-react';
import { Track } from '../types/music';
import { useVideoGeneration } from '../hooks/useVideoGeneration';
import { useSavedTracks } from '../hooks/useSavedTracks';

interface VideoGeneratorProps {
  onVideoGenerated?: (videoUrl: string) => void;
}

export default function VideoGenerator({ onVideoGenerated }: VideoGeneratorProps) {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<'480p' | '720p'>('480p');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { savedTracks } = useSavedTracks();
  const { videoSubscription, generateVideo, checkVideoStatus, formatMMK } = useVideoGeneration();
  
  // Filter tracks to only show AI generated ones (30 seconds or less)
  const eligibleTracks = savedTracks.filter(track => 
    track.isGenerated && track.duration <= 30
  );

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Image file must be smaller than 10MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarImage(e.target?.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTrack) {
      setError('Please select a music track');
      return;
    }

    if (!avatarImage) {
      setError('Please upload an avatar image');
      return;
    }

    if (!videoSubscription || videoSubscription.current_usage >= videoSubscription.monthly_limit) {
      setError('No video generations remaining. Please purchase a video pack.');
      return;
    }

    setIsGenerating(true);
    setError('');
    setSuccess('');
    setGenerationProgress('Starting video generation...');

    try {
      const taskId = await generateVideo(
        selectedTrack.audioUrl,
        avatarImage,
        {
          prompt,
          resolution,
          trackId: selectedTrack.id,
          trackTitle: selectedTrack.title
        }
      );

      if (!taskId) {
        throw new Error('Failed to start video generation');
      }

      setGenerationProgress('Video generation in progress...');

      // Poll for completion
      const pollForCompletion = async () => {
        try {
          const result = await checkVideoStatus(taskId);
          
          if (result.status === 'completed' && result.outputs.length > 0) {
            setGenerationProgress('Video generated successfully!');
            setSuccess(`Video generated successfully! Duration: ${selectedTrack.duration}s`);
            setIsGenerating(false);
            
            if (onVideoGenerated) {
              onVideoGenerated(result.outputs[0]);
            }
          } else if (result.status === 'failed') {
            throw new Error(result.error || 'Video generation failed');
          } else {
            setGenerationProgress(`Status: ${result.status}...`);
            setTimeout(pollForCompletion, 10000); // Check every 10 seconds
          }
        } catch (error) {
          console.error('Video generation failed:', error);
          setError(`Video generation failed: ${error.message}`);
          setIsGenerating(false);
        }
      };

      // Start polling after 10 seconds
      setTimeout(pollForCompletion, 10000);

    } catch (error) {
      console.error('Video generation failed:', error);
      setError(`Video generation failed: ${error.message}`);
      setIsGenerating(false);
    }
  };

  const handleBuyVideoPack = () => {
    window.dispatchEvent(new CustomEvent('navigate-to-video-packages'));
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-gradient-to-r from-pink-600 to-purple-600 p-4 rounded-full">
            <Video className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">AI Music Video Generator</h2>
        <p className="text-gray-400">Create singing videos from your AI-generated music tracks</p>
      </div>

      {/* Usage Status */}
      {videoSubscription && (
        <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 rounded-2xl p-6 border border-pink-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Video Generation Usage</h3>
            <div className="flex items-center space-x-2">
              <Video className="w-5 h-5 text-pink-400" />
              <span className="text-white font-medium">Video Pack</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{videoSubscription.current_usage}</p>
              <p className="text-gray-400 text-sm">Used</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{videoSubscription.monthly_limit - videoSubscription.current_usage}</p>
              <p className="text-gray-400 text-sm">Remaining</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{videoSubscription.monthly_limit}</p>
              <p className="text-gray-400 text-sm">Total</p>
            </div>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full transition-all"
              style={{ width: `${Math.min((videoSubscription.current_usage / videoSubscription.monthly_limit) * 100, 100)}%` }}
            />
          </div>
          
          {videoSubscription.monthly_limit === 0 && (
            <div className="mt-4 text-center">
              <button
                onClick={handleBuyVideoPack}
                className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all"
              >
                🎬 Buy Video Generation Pack
              </button>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
          {error.includes('No video generations remaining') && (
            <div className="mt-3 pt-3 border-t border-red-500/30">
              <button
                onClick={handleBuyVideoPack}
                className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all"
              >
                🎬 Buy Video Pack - 30,000 MMK
              </button>
            </div>
          )}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-400">{success}</p>
          </div>
        </div>
      )}

      {/* Generation Form */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="space-y-6">
          {/* Track Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Select AI Music Track (30 seconds max)
            </label>
            {eligibleTracks.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                {eligibleTracks.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => setSelectedTrack(track)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedTrack?.id === track.id
                        ? 'border-pink-500 bg-pink-500/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={track.imageUrl}
                        alt={track.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{track.title}</h4>
                        <p className="text-gray-400 text-sm">{track.artist}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Music className="w-3 h-3 text-purple-400" />
                          <span className="text-purple-400 text-xs">{track.duration}s</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10">
                <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No eligible tracks found</p>
                <p className="text-gray-500 text-sm">Generate AI music tracks (30 seconds or less) to create videos</p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-generator'))}
                  className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
                >
                  Generate Music
                </button>
              </div>
            )}
          </div>

          {/* Avatar Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Upload Singer Avatar
            </label>
            <div className="flex items-center space-x-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center cursor-pointer hover:border-pink-500 transition-colors bg-white/5"
              >
                {avatarImage ? (
                  <img
                    src={avatarImage}
                    alt="Avatar"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Click to upload</p>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-gray-300 text-sm mb-2">
                  Upload a clear photo of the person you want to animate
                </p>
                <ul className="text-gray-500 text-xs space-y-1">
                  <li>• Face should be clearly visible</li>
                  <li>• Maximum file size: 10MB</li>
                  <li>• Supported formats: JPG, PNG, WebP</li>
                  <li>• Best results with front-facing portraits</li>
                </ul>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Video Quality
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as '480p' | '720p')}
                className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="480p" className="bg-gray-800">480p (Standard)</option>
                <option value="720p" className="bg-gray-800">720p (HD)</option>
              </select>
              <p className="text-gray-500 text-xs mt-1">
                Higher quality takes longer to generate
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Style Prompt (Optional)
              </label>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., professional singer, concert stage"
                className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedTrack || !avatarImage || (videoSubscription && videoSubscription.current_usage >= videoSubscription.monthly_limit)}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-all flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{generationProgress}</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>Generate Music Video</span>
              </>
            )}
          </button>

          {/* Info */}
          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
            <div className="flex items-start space-x-3">
              <Video className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-400 mb-1">Video Generation Info</h4>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• Only AI-generated music tracks (30 seconds max) can be used</li>
                  <li>• Video generation takes 2-5 minutes depending on quality</li>
                  <li>• Each generation uses 1 credit from your video pack</li>
                  <li>• Videos are generated at {resolution} resolution</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}