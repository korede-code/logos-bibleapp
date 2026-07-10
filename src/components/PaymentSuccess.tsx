// src/pages/PaymentSuccess.tsx
import React, { useEffect, useState } from 'react';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const PaymentSuccess: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('reference') || params.get('trxref');
    setReference(ref);

    if (!ref) {
      setStatus('error');
      setMessage('No payment reference found');
      return;
    }

    const isInApp = Capacitor.isNativePlatform();
    console.log('📱 Is in app:', isInApp);
    console.log('📱 URL:', window.location.href);

    if (isInApp) {
      // 🔥 MOBILE: Redirect to deep link to reopen the app
      console.log('📱 Mobile: Redirecting to deep link');
      const deepLink = `com.logosdaily.app://payment-success?reference=${ref}`;
      
      // Try to open the app via deep link
      window.location.href = deepLink;
      
      // Fallback: if deep link doesn't work, show success message
      setTimeout(() => {
        setStatus('success');
        setMessage('Payment successful! Please reopen the app.');
      }, 3000);
    } else {
      // 🌐 WEB: Verify directly
      verifyPaymentAndShowSuccess(ref);
    }
  }, []);

  const verifyPaymentAndShowSuccess = async (ref: string) => {
    try {
      const response = await fetch(`https://logos-daily-backend.onrender.com/api/payments/verify/${ref}`);
      const data = await response.json();
      
      console.log('Verification response:', data);
      
      if (data.success && data.verified) {
        const userId = localStorage.getItem('pendingProUserId');
        if (userId) {
          localStorage.setItem(`isPro_${userId}`, 'true');
          localStorage.setItem('logos_daily_pro', 'true');
          localStorage.removeItem('pendingProUserId');
          localStorage.removeItem('pendingProPlan');
        }
        setStatus('success');
        setMessage('Payment successful! You are now a Pro member.');
      } else {
        setStatus('error');
        setMessage('Payment verification failed. Please contact support.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage('Could not verify payment. Please check your connection.');
    }
  };

  const handleOpenApp = () => {
    if (reference) {
      const deepLink = `com.logosdaily.app://payment-success?reference=${reference}`;
      window.location.href = deepLink;
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      backgroundColor: '#1a1a2e',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        {status === 'loading' && (
          <>
            <Loader2 size={64} style={{ color: '#f59e0b', animation: 'spin 1s linear infinite' }} />
            <h2 style={{ color: 'white', marginTop: '20px' }}>Processing Payment</h2>
            <p style={{ color: '#aaa' }}>{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle size={64} style={{ color: '#4CAF50' }} />
            <h2 style={{ color: 'white', marginTop: '20px' }}>Payment Successful!</h2>
            <p style={{ color: '#aaa' }}>{message}</p>
            
            {Capacitor.isNativePlatform() && (
              <button
                onClick={handleOpenApp}
                style={{
                  marginTop: '20px',
                  padding: '12px 30px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '20px auto'
                }}
              >
                Open App <ArrowRight size={18} />
              </button>
            )}

            <button
              onClick={() => window.location.href = '/'}
              style={{
                marginTop: '10px',
                padding: '10px 20px',
                backgroundColor: '#8B4513',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Continue to Home
            </button>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div style={{ fontSize: '64px' }}>❌</div>
            <h2 style={{ color: 'white', marginTop: '20px' }}>Verification Failed</h2>
            <p style={{ color: '#aaa' }}>{message}</p>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                marginTop: '20px',
                padding: '12px 30px',
                backgroundColor: '#8B4513',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                margin: '20px auto'
              }}
            >
              Back to Home
            </button>
          </>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PaymentSuccess;