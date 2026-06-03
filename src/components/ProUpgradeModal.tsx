// src/components/ProUpgradeModal.tsx
import React, { useState } from 'react';
import { X, Crown, Check, Star, Zap, Shield, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { getTheme } from '../utils/themeUtils';
import { PRO_PLANS, initializePayment } from '../services/paystackService';
import { useAppStore } from '../store/appStore';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userId: string;
  onSuccess: () => void;
  themeMode?: string;
}

const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ 
  isOpen, onClose, userEmail, userId, onSuccess, themeMode = 'dark' 
}) => {
  const [selectedPlan, setSelectedPlan] = useState(PRO_PLANS.MONTHLY);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const { setProStatus, readerSettings } = useAppStore();
  const theme = getTheme(themeMode as any);

  if (!isOpen) return null;

  const showToast = (message: string, bgColor: string) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: ${bgColor}; color: white; padding: 10px 20px;
      border-radius: 10px; z-index: 1000; font-size: 14px;
      animation: fadeInUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const handleUpgrade = async () => {
    setProcessing(true);
    setError('');
    
    try {
      console.log('🚀 Starting Paystack payment...');
      console.log('Selected plan:', selectedPlan);
      console.log('User email:', userEmail);
      
      const API_URL = import.meta.env.VITE_API_URL || 'https://logos-daily-backend.onrender.com/api';
      
      // Initialize payment with backend
      const response = await fetch(`${API_URL}/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          amount: selectedPlan.amount,
          planId: selectedPlan.id,
          userId: userId,
        }),
      });
      
      const data = await response.json();
      console.log('Payment init response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Payment initialization failed');
      }
      
      // Redirect to Paystack payment page
      if (data.authorization_url) {
        // Store the reference for verification after payment
        localStorage.setItem('paystack_reference', data.reference);
        localStorage.setItem('paystack_plan', selectedPlan.id);
        
        // Redirect to Paystack
        window.location.href = data.authorization_url;
      } else {
        throw new Error('No payment URL received');
      }
      
    } catch (err: any) {
      console.error('❌ Upgrade error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <Crown size={20} style={{ color: theme.accent }} />
            <h2 className="text-lg font-bold" style={{ color: theme.text }}>Upgrade to Logos Pro</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-80" style={{ color: theme.textMuted }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Hero */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3" style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}>
              <Zap size={12} />
              Limited Time Offer
            </div>
            <h3 className="text-2xl font-bold mb-2" style={{ color: theme.text }}>Unlock the Full Bible Study Experience</h3>
            <p className="text-sm" style={{ color: theme.textMuted }}>
              Get unlimited access to all features and transform your daily devotion
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2" style={{ backgroundColor: '#e5393520', color: '#e53935' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.values(PRO_PLANS).map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`p-4 rounded-xl text-left transition-all ${
                  selectedPlan.id === plan.id ? 'ring-2' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: selectedPlan.id === plan.id ? `${theme.accent}15` : theme.surface,
                  border: `1px solid ${selectedPlan.id === plan.id ? theme.accent : theme.border}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold" style={{ color: theme.text }}>{plan.name}</span>
                  {selectedPlan.id === plan.id && <Check size={16} style={{ color: theme.accent }} />}
                </div>
                <div className="mb-2">
                  <span className="text-2xl font-bold" style={{ color: theme.text }}>{plan.amountNaira}</span>
                  {plan.id !== 'lifetime' && <span className="text-xs" style={{ color: theme.textMuted }}>/month</span>}
                </div>
                <p className="text-xs" style={{ color: theme.textMuted }}>
                  {plan.id === 'lifetime' ? 'One-time payment' : `Billed ${plan.id === 'monthly' ? 'monthly' : 'annually'}`}
                </p>
                {plan.id === 'yearly' && (
                  <p className="text-xs mt-2" style={{ color: '#4CAF50' }}>Save 17%</p>
                )}
              </button>
            ))}
          </div>

          {/* Features */}
          <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: theme.surface }}>
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: theme.text }}>
              <Star size={14} style={{ color: theme.accent }} />
              Everything in Logos Pro:
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check size={12} style={{ color: '#4CAF50' }} />
                  <span className="text-xs" style={{ color: theme.textMuted }}>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Button */}
          <button
            onClick={handleUpgrade}
            disabled={processing}
            className="w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}CC)` }}
          >
            {processing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard size={18} />
                Pay {selectedPlan.amountNaira} with Paystack
              </>
            )}
          </button>

          {/* Guarantee */}
          <div className="flex items-center justify-center gap-2 mt-4 text-xs" style={{ color: theme.textFaint }}>
            <Shield size={12} />
            <span>Secure payment powered by Paystack</span>
          </div>
          <p className="text-center text-xs mt-2" style={{ color: theme.textFaint }}>
            30-day money-back guarantee · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProUpgradeModal;