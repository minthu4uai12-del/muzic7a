import React, { useState } from 'react';
import { X, CreditCard, Banknote, Smartphone, Copy, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { PaymentPackage, PaymentOrder } from '../types/payment';
import { usePayments } from '../hooks/usePayments';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage: PaymentPackage | null;
}

export default function PaymentModal({ isOpen, onClose, selectedPackage }: PaymentModalProps) {
  const [step, setStep] = useState<'select' | 'payment' | 'proof' | 'success'>('select');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'mobile_money'>('bank_transfer');
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const { createOrder, updateOrderPaymentProof, formatMMK } = usePayments();

  const handleCreateOrder = async () => {
    if (!selectedPackage) return;
    setLoading(true);
    try {
      const order = await createOrder(selectedPackage.id);
      if (order) {
        setCurrentOrder(order);
        setStep('payment');
      }
    } catch (err) {
      console.error('Failed to create order:', err);
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
      <div className="bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 backdrop-blur-md border border-white/20 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <CreditCard className="w-6 h-6 mr-2" />
            {step === 'select' && 'Purchase Package'}
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
                  <p className="text-2xl font-bold text-purple-400">{selectedPackage.generations}</p>
                  <p className="text-gray-400 text-sm">AI Generations</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{formatMMK(selectedPackage.price_mmk)}</p>
                  <p className="text-gray-400 text-sm">Myanmar Kyat</p>
                </div>
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
                    className="w-4 h-4 text-purple-600"
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
                    className="w-4 h-4 text-purple-600"
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
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-all"
            >
              {loading ? 'Creating Order...' : 'Continue to Payment'}
            </button>
          </div>
        )}

        {/* Step 2: Payment Instructions */}
        {step === 'payment' && currentOrder && (
          <div className="space-y-6">
            {/* Myanmar Instructions Header */}
            <div className="bg-gradient-to-r from-blue-600/20 to-green-600/20 rounded-xl p-4 border border-blue-500/30">
              <h4 className="text-lg font-semibold text-white mb-2 flex items-center">
                🇲🇲 Myanmar Payment Instructions | မြန်မာငွေပေးချေမှုလမ်းညွှန်
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-300 font-medium mb-1">English:</p>
                  <p className="text-gray-300">
     လွှဲအသေးစိတ်
                </h4>
                <div className="mb-4 p-3 bg-green-500/10 rounded-lg">
                  <p className="text-green-300 text-sm font-medium mb-2">
                    📱 How to transfer | လွှဲပုံလွှဲနည်း:
                  </p>
                  <div className="text-xs text-gray-300 space-y-1">
                    <p>• Open your mobile money app</p>
                    <p>• သင့် Kpay ငွေအက်ပ်ကို ဖွင့်ပါ</p>
                    <p>• Transfer to the number below</p>
                    <p>• အောက်ပါဖုန်းနံပါတ်သို့လွှဲပါ (Account Name - Yan Naing Soe)</p>
                  </div>
                </div>
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
                <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                  <p className="text-green-300 text-sm font-medium mb-1">
                    ✅ After transfer | လွှဲပြီးနောက်:
                  </p>
                  <div className="text-xs text-gray-300 space-y-1">
                    <p>• Note the transaction ID from your app</p>
                    <p>• သင့် Kpay အက်ပ်မှ Transaction ID ငွေလွှဲနံပါတ်ကို မှတ်ပါ</p>
                    <p>• Enter the transaction ID in the next step</p>
                    <p>• နောက်အဆင့်တွင် ငွေလွှဲနံပါတ်ကို ထည့်သွင်းပါ</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
              <p className="text-yellow-300 text-sm mb-2">
                <strong>⚠️ Very Important | အလွန်အရေးကြီး:</strong>
              </p>
              <div className="text-xs text-gray-300 space-y-1">
                <p>• Include order reference: <span className="font-mono text-white">{currentOrder.order_reference}</span></p>
                <p>• အော်ဒါနံပါတ်ထည့်ပါ: <span className="font-mono text-white">{currentOrder.order_reference}</span></p>
                <p>• Put this in payment description/memo/note</p>
                <p>• ငွေပေးချေမှုဖော်ပြချက်/မှတ်စု/မှတ်ချက်တွင်ထည့်ပါ</p>
              </div>
            </div>

            <button
              onClick={() => setStep('proof')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3 px-4 rounded-lg transition-all"
            >
              I Have Paid | ငွေပေးသွင်းပြီးပါပြီ
            </button>
          </div>
        )}

        {/* Step 3: Enter Transaction ID */}
        {step === 'proof' && (
          <div className="space-y-6">
            <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
              <p className="text-yellow-300 text-sm mb-2">
                <strong>📝 Enter Transaction ID | ငွေလွှဲနံပါတ်ထည့်သွင်းပါ</strong>
              </p>
              <div className="text-xs text-gray-300 space-y-1">
                <p>• Enter the transaction ID from your bank or mobile money app</p>
                <p>• သင့်ဘဏ် သို့မဟုတ် မိုဘိုင်းငွေအက်ပ်မှ ငွေလွှဲနံပါတ်ကို ထည့်သွင်းပါ</p>
              </div>
            </div>
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
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Additional Notes (Optional) | နောက်ထပ်မှတ်ချက်များ (ရွေးချယ်ခွင့်)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Any additional information about your payment..."
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
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
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Submit for Review | စစ်ဆေးရန်တင်သွင်းပါ</span>
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
                Order Submitted Successfully! | အော်ဒါအောင်မြင်စွာတင်သွင်းပြီးပါပြီ!
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-blue-300 text-sm font-medium mb-1">English:</p>
                  <p className="text-gray-300 text-sm">
                    Your transaction ID has been submitted for review. We'll process your order within 24 hours.
                  </p>
                </div>
                <div>
                  <p className="text-green-300 text-sm font-medium mb-1">မြန်မာ:</p>
                  <p className="text-gray-300 text-sm">
                    သင့်လက်ခံမှတ်နံပါတ်ကို စစ်ဆေးရန်တင်သွင်းပြီးပါပြီ။ ကျွန်ုပ်တို့သည် ၂၄ နာရီအတွင်း သင့်အော်ဒါကို လုပ်ဆောင်ပေးပါမည်။ အကယ်၍ မရရှိသေးပါက အမြန်လိုပါက Infinity Tech Facebook page သို့ ဖြစ်စေ viber no - 09740807009 သို့ ဖြစ်စေဆက်သွယ် အကြောင်းကြားနိုင်ပါသည်။
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <p className="text-gray-300 text-sm mb-2">
                <strong>Order Reference | အော်ဒါနံပါတ်:</strong> {currentOrder?.order_reference}
              </p>
              <p className="text-gray-300 text-sm mb-2">
                <strong>Transaction ID | လက်ခံမှတ်နံပါတ်:</strong> {transactionId}
              </p>
              <div className="text-xs text-gray-400 space-y-1">
                <p>• You can check your order status in the "Buy AI Packs" section</p>
                <p>• "AI Packs ဝယ်ယူရန်" ကဏ္ဍတွင် သင့်အော်ဒါအခြေအနေကို စစ်ဆေးနိုင်ပါသည်</p>
                <p>• We'll notify you once approved | အတည်ပြုပြီးပါက အကြောင်းကြားပါမည်</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3 px-4 rounded-lg transition-all"
            >
              Close | ပိတ်ရန်
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
