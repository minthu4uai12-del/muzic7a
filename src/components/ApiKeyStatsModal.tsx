import React from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, Clock, CheckCircle, AlertCircle, BarChart3, Key } from 'lucide-react';

interface ApiKeyStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeyStats: Array<{
    index: number;
    usage: number;
    maxUsage: number;
    resetTime: Date;
    isActive: boolean;
    lastUsed: Date | null;
  }>;
  totalAvailableGenerations: number;
}

export default function ApiKeyStatsModal({ 
  isOpen, 
  onClose, 
  apiKeyStats, 
  totalAvailableGenerations 
}: ApiKeyStatsModalProps) {
  if (!isOpen) return null;

  const activeKeys = apiKeyStats.filter(key => key.isActive).length;
  const totalKeys = apiKeyStats.length;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-br from-gray-900/95 via-purple-900/95 to-blue-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">API Key Statistics</h2>
              <p className="text-sm text-gray-400">Monitor your API key usage and rotation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Key className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">{totalKeys}</p>
            <p className="text-xs text-gray-400">Total Keys</p>
          </div>
          
          <div className="bg-green-500/20 rounded-xl p-4 text-center border border-green-500/30">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-400">{activeKeys}</p>
            <p className="text-xs text-gray-400">Active Keys</p>
          </div>
          
          <div className="bg-red-500/20 rounded-xl p-4 text-center border border-red-500/30">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-400">{totalKeys - activeKeys}</p>
            <p className="text-xs text-gray-400">Rate Limited</p>
          </div>
          
          <div className="bg-purple-500/20 rounded-xl p-4 text-center border border-purple-500/30">
            <div className="flex items-center justify-center mb-2">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-400">{totalAvailableGenerations}</p>
            <p className="text-xs text-gray-400">Available</p>
          </div>
        </div>

        {/* Individual Key Stats */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Key className="w-5 h-5 mr-2" />
            Individual Key Status
          </h3>
          
          {apiKeyStats.map((keyStats) => {
            const usagePercentage = (keyStats.usage / keyStats.maxUsage) * 100;
            const isNearLimit = usagePercentage > 80;
            
            return (
              <div
                key={keyStats.index}
                className={`p-4 rounded-xl border transition-all ${
                  keyStats.isActive
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      keyStats.isActive ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                    <span className="text-white font-medium">
                      API Key #{keyStats.index}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      keyStats.isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {keyStats.isActive ? 'Active' : 'Rate Limited'}
                    </span>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      isNearLimit ? 'text-yellow-400' : 'text-white'
                    }`}>
                      {keyStats.usage}/{keyStats.maxUsage}
                    </p>
                    <p className="text-xs text-gray-400">requests</p>
                  </div>
                </div>
                
                {/* Usage Bar */}
                <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      keyStats.isActive
                        ? isNearLimit
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          : 'bg-gradient-to-r from-green-500 to-blue-500'
                        : 'bg-gradient-to-r from-red-500 to-red-600'
                    }`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  />
                </div>
                
                {/* Additional Info */}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Resets: {keyStats.resetTime.toLocaleTimeString()}</span>
                    </span>
                  </div>
                  
                  {keyStats.lastUsed && (
                    <span>
                      Last used: {keyStats.lastUsed.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
          <div className="flex items-start space-x-3">
              <span>Resets: {keyStats.resetTime.toLocaleString()}</span>
            <div>
              <h4 className="text-sm font-semibold text-blue-400 mb-1">Auto Key Rotation</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                The system automatically rotates between {apiKeyStats.length} API keys to distribute load and avoid rate limits. 
                Keys reset every hour and are temporarily blocked after rate limits. Currently {activeKeys}/{apiKeyStats.length} keys are active 
                with {totalAvailableGenerations} total generations available across all keys.
              Last used: {keyStats.lastUsed.toLocaleString()}
            </div>
          </div>
          
          {keyStats.isBlocked && (
            <span className="text-red-400 text-xs">
              🚫 Temporarily blocked
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
