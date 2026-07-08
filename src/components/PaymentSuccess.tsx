// src/pages/PaymentSuccess.tsx
import React, { useEffect, useState } from 'react';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';

const PaymentSuccess: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');

    if (!reference) {
      setStatus('error');
      setMessage('No payment reference found');
      return;
    }

    // Verify payment
    fetch(`https://logos-daily-backend.onrender.com/api/payments/verify/${reference}`)
      .then(r => r.json())
      .then(data => {
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
          
          // Redirect to home after 2 seconds
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Payment verification failed. Please contact support.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Could not verify payment. Please check your connection.');
      });
  }, []);

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
            <h2 style={{ color: 'white', marginTop: '20px' }}>Verifying Payment</h2>
            <p style={{ color: '#aaa' }}>{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle size={64} style={{ color: '#4CAF50' }} />
            <h2 style={{ color: 'white', marginTop: '20px' }}>Payment Successful!</h2>
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
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '20px auto'
              }}
            >
              Go to App <ArrowRight size={18} />
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