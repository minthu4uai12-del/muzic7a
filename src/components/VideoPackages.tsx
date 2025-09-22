import React, { useState } from 'react';
import { Video, Zap, ShoppingCart, CheckCircle, CreditCard } from 'lucide-react';
import { useVideoGeneration } from '../hooks/useVideoGeneration';
import { usePayments } from '../hooks/usePayments';
import VideoPaymentModal from './VideoPaymentModal';
import { VideoPackage } from '../types/video';

export default function VideoPackages() {
  const { videoPackages, videoSubscription, formatMMK } = useVideoGeneration();
  const { orders } = usePayments();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<VideoPackage | null>(null);

  const handlePurchase = (pkg: VideoPackage) => {
    setSelectedPackage(pkg);
    setShowPaymentModal(true);
  };

  // Filter video orders
  const videoOrders = orders.filter(order => 
    order.package?.name.toLowerCase().includes('video')
  ).slice(0, 3);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-gradient-to-r from-pink-600 to-purple-600 p-4 rounded-full mr-4">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">AI Video Generation Packs</h2>
        </div>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Transform your AI-generated music into stunning singing videos with our advanced AI video generation technology.
        </p>
        <div className="mt-4 p-4 bg-pink-500/10 rounded-xl border border-pink-500/30 max-w-lg mx-auto">
          <p className="text-pink-300 text-sm">
            🎬 <strong>New Feature:</strong> Create singing videos from your AI music tracks with custom avatars!
          </p>
        </div>
      </div>

      {/* Current Usage */}
      {videoSubscription && (
        <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 rounded-2xl p-6 border border-pink-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Current Video Usage</h3>
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
              <p className="text-gray-400 text-sm">Total Limit</p>
            </div>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full transition-all"
              style={{ width: `${Math.min((videoSubscription.current_usage / videoSubscription.monthly_limit) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Resets on {new Date(videoSubscription.reset_date).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Video Package */}
      <div className="max-w-md mx-auto">
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-600 to-purple-600 opacity-5" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-r from-pink-600 to-purple-600 p-3 rounded-xl text-white">
                <Video className="w-8 h-8" />
              </div>
              <span className="px-3 py-1 bg-pink-500/20 text-pink-400 text-xs font-medium rounded-full border border-pink-500/30">
                NEW
              </span>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">Video Generation Pack</h3>
            <p className="text-gray-300 mb-4">Create singing videos from your AI music tracks</p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Video Generations:</span>
                <span className="text-white font-bold text-lg">5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Price:</span>
                <span className="text-green-400 font-bold text-xl">30,000 MMK</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Per Video:</span>
                <span className="text-gray-300">6,000 MMK</span>
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-4 mb-6">
              <h4 className="text-white font-medium mb-2">What's Included:</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• 5 AI video generations</li>
                <li>• Support for 480p and 720p quality</li>
                <li>• Custom avatar upload</li>
                <li>• 30-second music track support</li>
                <li>• Professional singing animation</li>
              </ul>
            </div>

            <button
              onClick={() => handlePurchase({
                id: 'video-pack-1',
                name: 'Video Generation Pack',
                name_mm: 'ဗီဒီယိုထုတ်လုပ်မှုပက်ကေ့ဂျ်',
                generations: 5,
                price_mmk: 30000,
                description: 'Create singing videos from your AI music tracks',
                description_mm: 'သင့် AI ဂီတသီချင်းများမှ သီဆိုသောဗီဒီယိုများဖန်တီးပါ',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 hover:scale-105 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-xl text-lg"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Buy Video Pack - 30,000 MMK</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      {videoOrders.length > 0 && (
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Recent Video Pack Orders
          </h3>
          <div className="space-y-3">
            {videoOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">{order.package?.name}</p>
                  <p className="text-gray-400 text-sm">Order: {order.order_reference}</p>
                  <p className="text-gray-500 text-xs">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-medium">{formatMMK(order.amount_mmk)}</p>
                  <div className="flex items-center space-x-1">
                    {order.status === 'approved' && <CheckCircle className="w-4 h-4 text-green-400" />}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      order.status === 'paid' ? 'bg-blue-500/20 text-blue-400' :
                      order.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      order.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <VideoPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        selectedPackage={selectedPackage}
      />
    </div>
  );
}