// src/components/PaymentCallback.tsx
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { getTheme } from '../utils/themeUtils';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const PaymentCallback: React.FC = () => {
  const { readerSettings, setProStatus, navigate } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const verifyPayment = async () => {
      // Get reference from URL
      const urlParams = new URLSearchParams(window.location.search);
      const reference = urlParams.get('reference');
      
      if (!reference) {
        setStatus('error');
        setMessage('No payment reference found');
        setTimeout(() => navigate('settings'), 3000);
        return;
      }
      
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'https://logos-daily-backend.onrender.com/api';
        const response = await fetch(`${API_URL}/payments/verify/${reference}`);
        const data = await response.json();
        
        if (data.verified) {
          // Update pro status in your backend
          const userId = localStorage.getItem('userId') || 'user_' + Date.now();
          
          const updateResponse = await fetch(`${API_URL}/users/set-pro-status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uid: userId,
              isPro: true,
              planId: data.data?.planId || 'monthly',
              expiryDate: data.data?.expiryDate,
            }),
          });
          
          if (updateResponse.ok) {
            setProStatus(true);
            setStatus('success');
            setMessage('Payment successful! You are now a Pro member.');
            
            // Clear stored data
            localStorage.removeItem('paystack_reference');
            
            setTimeout(() => navigate('settings'), 2000);
          } else {
            throw new Error('Failed to update pro status');
          }
        } else {
          setStatus('error');
          setMessage('Payment verification failed. Please contact support.');
          setTimeout(() => navigate('settings'), 3000);
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('An error occurred during verification.');
        setTimeout(() => navigate('settings'), 3000);
      }
    };
    
    verifyPayment();
  }, [navigate, setProStatus]);
  
  return (
    <div className="flex items-center justify-center h-screen" style={{ backgroundColor: theme.bg }}>
      <div className="text-center p-8 max-w-md">
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: theme.accent }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: theme.text }}>Verifying Payment</h2>
            <p style={{ color: theme.textMuted }}>{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={48} className="mx-auto mb-4" style={{ color: '#4CAF50' }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: theme.text }}>Payment Successful!</h2>
            <p style={{ color: theme.textMuted }}>{message}</p>
            <p className="text-sm mt-4" style={{ color: theme.textFaint }}>Redirecting to settings...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={48} className="mx-auto mb-4" style={{ color: '#e53935' }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: theme.text }}>Payment Verification Failed</h2>
            <p style={{ color: theme.textMuted }}>{message}</p>
            <button
              onClick={() => navigate('settings')}
              className="mt-6 px-6 py-2 rounded-xl font-semibold"
              style={{ backgroundColor: theme.accent, color: 'white' }}
            >
              Back to Settings
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;