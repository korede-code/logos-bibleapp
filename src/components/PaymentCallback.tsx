// src/components/PaymentCallback.tsx
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Capacitor } from '@capacitor/core';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

const PaymentCallback: React.FC = () => {
  const { setProStatus, navigate } = useAppStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('reference') || params.get('trxref');

    console.log('🔍 PaymentCallback mounted');
    console.log('📝 URL params:', Object.fromEntries(params));
    console.log('📝 Reference:', ref);

    if (!ref) {
      setStatus('error');
      setMessage('No payment reference found');
      setTimeout(() => navigate('home'), 3000);
      return;
    }

    verifyAndActivate(ref);
  }, []);

  const verifyAndActivate = async (paymentRef: string) => {
    try {
      console.log('🔍 Verifying payment:', paymentRef);
      
      const response = await fetch(
        `https://logos-daily-backend.onrender.com/api/payments/verify/${paymentRef}`
      );
      
      const data = await response.json();
      console.log('📦 Verification response:', data);
      
      if (data.success && data.verified) {
        // Get userId from multiple sources
        let userId = localStorage.getItem('pendingProUserId');
        console.log('📝 pendingProUserId from localStorage:', userId);
        
        if (!userId) {
          const savedUser = localStorage.getItem('logos_user');
          console.log('📝 logos_user from localStorage:', savedUser);
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
        
        const storeUser = useAppStore.getState().currentUser;
        console.log('📝 storeUser:', storeUser);
        if (!userId && storeUser?.uid) {
          userId = storeUser.uid;
          console.log('📝 userId from store:', userId);
        }
        
        console.log('✅ Final userId:', userId);
        
        if (userId) {
          // Save Pro status
          localStorage.setItem(`isPro_${userId}`, 'true');
          localStorage.setItem('logos_daily_pro', 'true');
          setProStatus(true);
          console.log('✅ Pro status saved for user:', userId);
        } else {
          console.warn('⚠️ No userId found, cannot save Pro status');
        }
        
        // Clear pending data
        localStorage.removeItem('pendingProUserId');
        localStorage.removeItem('pendingProPlan');
        localStorage.removeItem('pendingPaymentRef');
        
        setStatus('success');
        setMessage('Payment successful! You are now a Pro member.');
        
        setTimeout(() => {
          navigate('home');
        }, 2000);
      } else {
        console.error('❌ Verification failed:', data);
        setStatus('error');
        setMessage(data.message || 'Payment verification failed. Please contact support.');
      }
    } catch (error) {
      console.error('❌ Payment verification error:', error);
      setStatus('error');
      setMessage('An error occurred while verifying your payment. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#1a1a2e' }}>
      <div className="text-center p-8 max-w-md w-full">
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: '#f59e0b' }} />
            <h2 className="text-xl font-bold text-white mb-2">Verifying Payment</h2>
            <p className="text-gray-400">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle size={48} className="mx-auto mb-4" style={{ color: '#4CAF50' }} />
            <h2 className="text-xl font-bold text-white mb-2">Payment Successful!</h2>
            <p className="text-gray-400 mb-6">{message}</p>
            <button
              onClick={() => navigate('home')}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-semibold"
              style={{ backgroundColor: '#4CAF50', color: 'white' }}
            >
              Go to Home <ArrowRight size={18} />
            </button>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle size={48} className="mx-auto mb-4" style={{ color: '#e53935' }} />
            <h2 className="text-xl font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-gray-400 mb-6">{message}</p>
            <button
              onClick={() => navigate('home')}
              className="w-full py-3 rounded-lg font-semibold"
              style={{ backgroundColor: '#8B4513', color: 'white' }}
            >
              Go to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;