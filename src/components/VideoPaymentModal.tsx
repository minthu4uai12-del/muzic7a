import React, { useState } from 'react';
import { X, CreditCard, Banknote, Smartphone, Copy, CheckCircle, FileText, Loader2, Video } from 'lucide-react';
import { VideoPackage } from '../types/video';
import { usePayments } from '../hooks/usePayments';

interface VideoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage: VideoPackage | null;
}

export default function VideoPaymentModal({ isOpen, onClose, selectedPackage }: VideoPaymentModalProps) {
  const [step, setStep] = useState<'select' | 'payment' | 'proof' | 'success'>('select');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'mobile_money'>('bank_transfer');
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [transactionId, setTransactionId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const { createOrder, updateOrderPaymentProof, formatMMK } = usePayments();

  const handleCreateOrder = async () => {
    if (!selectedPackage) return;
    setLoading(true);
    try {
      // Create a mock package for the payment system
      const mockPackage = {
        id: 'video-pack-1',
        name: 'Video Generation Pack',
        name_mm: 'ဗီဒီယိုထုတ်လုပ်မှုပက်ကေ့ဂျ်',
        generations: selectedPackage.generations,
        price_mmk: selectedPackage.price_mmk,
        description: selectedPackage.description,
        description_mm: selectedPackage.description_mm,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const order = await createOrder(mockPackage.id);
      if (order) {
        setCurrentOrder(order);
        setStep('payment');
      }
    } catch (err) {
      console.error('Failed to create video pack order:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPaymentProof = async () => {
    if (!currentOrder || !transactionId.trim()) return;
    setLoading(true);
    try {
      const success = await updateOrderPaymentProof(currentOrder.id, transactionId, paymentNotes);
      if (success) {
        setStep('success');
      }
    } catch (err) {
      console.error('Failed to submit payment proof:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleClose = () => {
    setStep('select');
    setCurrentOrder(null);
    setTransactionId('');
    setPaymentNotes('');
    onClose();
  };

  if (!isOpen || !selectedPackage) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-pink-900/90 via-purple-900/90 to-indigo-900/90 backdrop-blur-md border border-white/20 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Video className="w-6 h-6 mr-2" />
            {step === 'select' && 'Purchase Video Pack'}
            {step === 'payment' && 'Payment Instructions'}
            {step === 'proof' && 'Enter Transaction ID'}
            {step === 'success' && 'Order Submitted'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Step 1: Package Selection */}
        {step === 'select' && (
          <div className="space-y-6">
            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-2">{selectedPackage.name}</h3>
              <p className="text-gray-300 mb-4">{selectedPackage.description}</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-pink-400">{selectedPackage.generations}</p>
                  <p className="text-gray-400 text-sm">Video Generations</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{formatMMK(selectedPackage.price_mmk)}</p>
                  <p className="text-gray-400 text-sm">Myanmar Kyat</p>
                </div>
              </div>
              
              <div className="bg-pink-500/10 rounded-lg p-4 border border-pink-500/30">
                <h4 className="text-pink-300 font-medium mb-2">🎬 Video Features:</h4>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• Create singing videos from AI music</li>
                  <li>• Upload custom avatar images</li>
                  <li>• Support for 480p and 720p quality</li>
                  <li>• 30-second music track support</li>
                  <li>• Professional lip-sync animation</li>
                </ul>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">Select Payment Method</h4>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank_transfer"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'bank_transfer' | 'mobile_money')}
                    className="w-4 h-4 text-pink-600"
                  />
                  <Banknote className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">Bank Transfer</p>
                    <p className="text-gray-400 text-sm">Transfer to our bank account</p>
                  </div>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="mobile_money"
                    checked={paymentMethod === 'mobile_money'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'bank_transfer' | 'mobile_money')}
                    className="w-4 h-4 text-pink-600"
                  />
                  <Smartphone className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-white font-medium">Mobile Money</p>
                    <p className="text-gray-400 text-sm">KBZPay</p>
                  </div>
                </label>
              </div>
            </div>
            <button
              onClick={handleCreateOrder}
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-all"
            >
              {loading ? 'Creating Order...' : 'Continue to Payment'}
            </button>
          </div>
        )}

        {/* Step 2: Payment Instructions */}
        {step === 'payment' && currentOrder && (
          <div className="space-y-6">
            {/* Myanmar Instructions Header */}
            <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 rounded-xl p-4 border border-pink-500/30">
              <h4 className="text-lg font-semibold text-white mb-2 flex items-center">
                🇲🇲 Video Pack Payment | ဗီဒီယိုပက်ကေ့ဂျ်ငွေပေးချေမှု
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-pink-300 font-medium mb-1">English:</p>
                  <p className="text-gray-300">
                    Purchase video generation pack to create singing videos from your AI music.
                  </p>
                </div>
                <div>
                  <p className="text-purple-300 font-medium mb-1">မြန်မာ:</p>
                  <p className="text-gray-300">
                    သင့် AI ဂီတမှ သီဆိုသောဗီဒီယိုများဖန်တီးရန် ဗီဒီယိုထုတ်လုပ်မှုပက်ကေ့ဂျ်ဝယ်ယူပါ။
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Order Reference:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-mono">{currentOrder.order_reference}</span>
                  <button
                    onClick={() => copyToClipboard(currentOrder.order_reference)}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    {copySuccess ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Amount:</span>
                <span className="text-green-400 font-bold">{formatMMK(currentOrder.amount_mmk)}</span>
              </div>
            </div>

            {/* Bank Transfer Section */}
            {paymentMethod === 'bank_transfer' && (
              <div className="bg-blue-500/10 rounded-xl p-6 border border-blue-500/30">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Banknote className="w-5 h-5 mr-2" />
                  Bank Transfer Details | ဘဏ်လွှဲငွေအသေးစိတ်
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Bank Name | ဘဏ်အမည်:</span>
                    <span className="text-white">UAB Bank</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Account Name | အကောင့်အမည်:</span>
                    <span className="text-white">Yan Naing Soe</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Account Number | အကောင့်နံပါတ်:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-mono">019330100016013</span>
                      <button
                        onClick={() => copyToClipboard('019330100016013')}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        {copySuccess ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Money Section */}
            {paymentMethod === 'mobile_money' && (
              <div className="bg-green-500/10 rounded-xl p-6 border border-green-500/30">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Smartphone className="w-5 h-5 mr-2" />
                  Mobile Money Details | မိုဘိုင်းငွေအသေးစိတ်
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Phone Number | ဖုန်းနံပါတ်:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-mono">09974902335</span>
                      <button
                        onClick={() => copyToClipboard('09974902335')}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        {copySuccess ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setStep('proof')}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-all"
            >
              I Have Paid | ငွေပေးသွင်းပြီးပါပြီ
            </button>
          </div>
        )}

        {/* Step 3: Enter Transaction ID */}
        {step === 'proof' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Transaction ID | ငွေလွှဲနံပါတ်
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter your transaction ID..."
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Additional Notes (Optional) | နောက်ထပ်မှတ်ချက်များ
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Any additional information about your payment..."
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setStep('payment')}
                className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Back | နောက်သို့
              </button>
              <button
                onClick={handleSubmitPaymentProof}
                disabled={loading || !transactionId.trim()}
                className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Submit for Review</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="text-center space-y-6">
            <div className="bg-green-500/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Video Pack Order Submitted!
              </h3>
              <p className="text-gray-300 text-sm">
                Your video generation pack order has been submitted for review. We'll process your order within 24 hours.
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <p className="text-gray-300 text-sm mb-2">
                <strong>Order Reference:</strong> {currentOrder?.order_reference}
              </p>
              <p className="text-gray-300 text-sm mb-2">
                <strong>Transaction ID:</strong> {transactionId}
              </p>
              <p className="text-gray-300 text-sm">
                <strong>Video Generations:</strong> 5 videos
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-all"
            >
              Close | ပိတ်ရန်
            </button>
          </div>
        )}
      </div>
    </div>
  );
}