// src/components/PaymentCallback.tsx
import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { getTheme } from '../utils/themeUtils';
import { useAppStore } from '../store/appStore';
import { getFirebaseToken } from '../config/firebase';

interface PaymentCallbackProps {
  onClose?: () => void;
}

const PaymentCallback: React.FC<PaymentCallbackProps> = ({ onClose }) => {
  const { readerSettings, setProStatus, navigate } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  // Get reference from URL query string without react-router
  const getQueryParam = (param: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  };

  const reference = getQueryParam('reference');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setStatus('error');
        setMessage('No payment reference found');
        setTimeout(() => {
          if (onClose) onClose();
          navigate('settings');
        }, 3000);
        return;
      }

      try {
        const token = await getFirebaseToken();
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        
        const response = await fetch(`${API_BASE_URL}/payments/verify/${reference}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        const data = await response.json();

        if (data.success && data.verified) {
          setStatus('success');
          setMessage('Payment successful! Upgrading your account...');
          
          // Update pro status on backend
          const updateResponse = await fetch(`${API_BASE_URL}/users/set-pro-status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              uid: data.data?.userId,
              isPro: true,
              planId: data.data?.planId,
              expiryDate: data.data?.expiryDate,
            }),
          });
          
          if (updateResponse.ok) {
            setProStatus(true);
            setTimeout(() => {
              if (onClose) onClose();
              navigate('settings');
            }, 2000);
          } else {
            throw new Error('Failed to update pro status');
          }
        } else {
          setStatus('error');
          setMessage('Payment verification failed. Please contact support.');
          setTimeout(() => {
            if (onClose) onClose();
            navigate('settings');
          }, 3000);
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('An error occurred. Please contact support.');
        setTimeout(() => {
          if (onClose) onClose();
          navigate('settings');
        }, 3000);
      }
    };

    verifyPayment();
  }, [reference, navigate, setProStatus, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
      <div className="text-center p-8 max-w-md mx-auto">
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: theme.accent }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: theme.text }}>Processing Payment</h2>
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
            <h2 className="text-xl font-bold mb-2" style={{ color: theme.text }}>Payment Failed</h2>
            <p style={{ color: theme.textMuted }}>{message}</p>
            <button
              onClick={() => {
                if (onClose) onClose();
                navigate('settings');
              }}
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