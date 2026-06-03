// src/components/PaymentCallback.tsx
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { getTheme } from '../utils/themeUtils';

const PaymentCallback: React.FC = () => {
  const { readerSettings, setProStatus, navigate } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = localStorage.getItem('paystack_reference');
      const planId = localStorage.getItem('paystack_plan');
      
      if (!reference) {
        setStatus('error');
        setMessage('No payment reference found');
        setTimeout(() => navigate('settings'), 3000);
        return;
      }
      
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const response = await fetch(`${API_URL}/payments/verify/${reference}`);
        const data = await response.json();
        
        if (data.verified) {
          setStatus('success');
          setMessage('Payment successful! Upgrading your account...');
          
          // Update pro status
          setProStatus(true);
          
          // Clear stored data
          localStorage.removeItem('paystack_reference');
          localStorage.removeItem('paystack_plan');
          
          setTimeout(() => navigate('settings'), 2000);
        } else {
          setStatus('error');
          setMessage('Payment verification failed. Please contact support.');
          setTimeout(() => navigate('settings'), 3000);
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred during verification.');
        setTimeout(() => navigate('settings'), 3000);
      }
    };
    
    verifyPayment();
  }, [navigate, setProStatus]);
  
  return (
    <div className="flex items-center justify-center h-screen" style={{ backgroundColor: theme.bg }}>
      <div className="text-center p-8">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: theme.accent }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: theme.text }}>Processing Payment</h2>
            <p style={{ color: theme.textMuted }}>{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: theme.text }}>Payment Successful!</h2>
            <p style={{ color: theme.textMuted }}>{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: theme.text }}>Payment Failed</h2>
            <p style={{ color: theme.textMuted }}>{message}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;