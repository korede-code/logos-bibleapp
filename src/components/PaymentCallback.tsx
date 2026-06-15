// src/components/PaymentCallback.tsx
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const PaymentCallback: React.FC = () => {
  const { setProStatus, setCurrentUser, currentUser } = useAppStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const verifyPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const reference = urlParams.get('reference');
      const transactionRef = urlParams.get('trxref');
      
      const paymentRef = reference || transactionRef;
      
      if (!paymentRef) {
        setStatus('error');
        setMessage('No payment reference found');
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
        return;
      }
      
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'https://logos-daily-backend.onrender.com/api';
        const response = await fetch(`${API_URL}/payments/verify/${paymentRef}`);
        const data = await response.json();
        
        console.log('Payment verification response:', data);
        
        // ✅ Only set Pro if payment is verified
        if (data.success && data.verified === true) {
          // Get user ID from multiple sources
          let userId = localStorage.getItem('pendingProUserId');
          
          if (!userId) {
            const savedUser = localStorage.getItem('logos_user');
            if (savedUser) {
              try {
                const user = JSON.parse(savedUser);
                userId = user.uid;
                console.log('Found user ID from logos_user:', userId);
              } catch (e) {
                console.error('Error parsing saved user:', e);
              }
            }
          }
          
          // Get current user from store
          const storeUser = useAppStore.getState().currentUser;
          if (!userId && storeUser?.uid) {
            userId = storeUser.uid;
            console.log('Found user ID from store:', userId);
          }
          
          console.log('Final User ID for pro status:', userId);
          
          // Save pro status
          if (userId) {
            localStorage.setItem(`isPro_${userId}`, 'true');
            localStorage.setItem('logos_daily_pro', 'true');
            setProStatus(true);
            console.log(`✅ Pro status saved for user: ${userId}`);
          } else {
            console.warn('⚠️ No user ID found, cannot save pro status');
          }
          
          // Clear pending data
          localStorage.removeItem('pendingProUserId');
          localStorage.removeItem('pendingProPlan');
          
          setStatus('success');
          setMessage('Payment successful! You are now a Pro member.');
          
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Payment verification failed. Please contact support.');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setMessage('An error occurred while verifying your payment. Please try again.');
      }
    };
    
    verifyPayment();
  }, [setProStatus, setCurrentUser, currentUser]);

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#1a1a2e' }}>
      <div className="text-center p-8">
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
            <p className="text-gray-400">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle size={48} className="mx-auto mb-4" style={{ color: '#e53935' }} />
            <h2 className="text-xl font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-gray-400">{message}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-4 px-6 py-2 rounded-lg font-semibold"
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