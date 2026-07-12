// src/pages/PaymentSuccess.tsx
import React, { useEffect, useState } from 'react';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const PaymentSuccess: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    // Get reference from URL
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('reference') || params.get('trxref');
    console.log('🔍 PaymentSuccess mounted, reference:', ref);
    console.log('🔍 Full URL:', window.location.href);
    console.log('🔍 All params:', Object.fromEntries(params));
    
    setReference(ref);

    if (!ref) {
      setStatus('error');
      setMessage('No payment reference found');
      return;
    }

    // 🔥 CRITICAL: ALWAYS verify the payment when this page loads
    console.log('🔍 Starting verification for:', ref);
    verifyPaymentAndActivate(ref);
    
  }, []);

  const verifyPaymentAndActivate = async (ref: string) => {
    try {
      console.log('🔍 Calling verification API for:', ref);
      
      const response = await fetch(`https://logos-daily-backend.onrender.com/api/payments/verify/${ref}`);
      const data = await response.json();
      
      console.log('📦 Verification response:', data);
      
      if (data.success && data.verified) {
        // Get userId from localStorage
        let userId = localStorage.getItem('pendingProUserId');
        console.log('📝 pendingProUserId:', userId);
        
        if (!userId) {
          const savedUser = localStorage.getItem('logos_user');
          if (savedUser) {
            try {
              const user = JSON.parse(savedUser);
              userId = user.uid;
              console.log('📝 userId from logos_user:', userId);
            } catch (e) {
              console.error('Error parsing saved user:', e);
            }
          }
        }
        
        if (userId) {
          // Save Pro status
          localStorage.setItem(`isPro_${userId}`, 'true');
          localStorage.setItem('logos_daily_pro', 'true');
          localStorage.removeItem('pendingProUserId');
          localStorage.removeItem('pendingProPlan');
          console.log('✅ Pro status saved for user:', userId);
          
          // 🔥 Force a Pro status check
          const checkResponse = await fetch(
            `https://logos-daily-backend.onrender.com/api/payments/pro-status/${userId}`
          );
          const checkData = await checkResponse.json();
          console.log('📦 Pro status check after verification:', checkData);
        } else {
          console.warn('⚠️ No userId found, cannot save Pro status');
        }
        
        setStatus('success');
        setMessage('Payment successful! You are now a Pro member.');
        
        // Redirect to home after 3 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } else {
        console.error('❌ Verification failed:', data);
        setStatus('error');
        setMessage(data.message || 'Payment verification failed. Please contact support.');
      }
    } catch (error) {
      console.error('❌ Verification error:', error);
      setStatus('error');
      setMessage('Could not verify payment. Please check your connection.');
    }
  };
  

  // Render UI...
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
            <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>
              Reference: {reference}
            </p>
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
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Go to Home
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
                cursor: 'pointer'
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