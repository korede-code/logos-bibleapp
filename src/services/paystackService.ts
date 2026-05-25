// src/services/paystackService.ts
import { getFirebaseToken } from '../config/firebase';

export interface PaymentDetails {
  email: string;
  amount: number;
  reference?: string;
  metadata?: Record<string, any>;
  callback?: (response: any) => void;
  onClose?: () => void;
}

export const PRO_PLANS = {
  MONTHLY: { 
    id: 'monthly', 
    name: 'Monthly Pro', 
    amount: 2990, // ₦2,990 in kobo
    amountNaira: '₦2,990', 
    days: 30,
    planCode: 'PLN_monthly' // You'll get this from Paystack
  },
  YEARLY: { 
    id: 'yearly', 
    name: 'Yearly Pro', 
    amount: 29900, // ₦29,900 in kobo (save ~17%)
    amountNaira: '₦29,900', 
    days: 365,
    planCode: 'PLN_yearly'
  },
  LIFETIME: { 
    id: 'lifetime', 
    name: 'Lifetime Access', 
    amount: 99900, // ₦99,900 in kobo
    amountNaira: '₦99,900', 
    days: 9999,
    planCode: 'PLN_lifetime'
  },
};

export const initializePayment = (details: PaymentDetails) => {
  return new Promise((resolve, reject) => {
    // Load Paystack script dynamically
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = () => {
      const paystack = new (window as any).PaystackPop();
      
      paystack.newTransaction({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: details.email,
        amount: details.amount,
        reference: details.reference,
        metadata: details.metadata,
        onSuccess: (response: any) => {
          console.log('Payment successful:', response);
          resolve(response);
          if (details.callback) details.callback(response);
        },
        onCancel: () => {
          console.log('Payment cancelled');
          reject(new Error('Payment cancelled'));
          if (details.onClose) details.onClose();
        },
      });
    };
    script.onerror = () => {
      reject(new Error('Failed to load Paystack'));
    };
    document.body.appendChild(script);
  });
};

export const verifyPayment = async (reference: string) => {
  try {
    const token = await getFirebaseToken();
    const response = await fetch(`${import.meta.env.VITE_API_URL}/payments/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Payment verification failed:', error);
    return { success: false, error: error.message };
  }
};