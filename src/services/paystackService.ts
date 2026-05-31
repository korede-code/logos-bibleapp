// src/services/paystackService.ts

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
    amount: 2990,
    amountNaira: '₦2,990', 
    days: 30,
  },
  YEARLY: { 
    id: 'yearly', 
    name: 'Yearly Pro', 
    amount: 29900,
    amountNaira: '₦29,900', 
    days: 365,
  },
  LIFETIME: { 
    id: 'lifetime', 
    name: 'Lifetime Access', 
    amount: 99900,
    amountNaira: '₦99,900', 
    days: 9999,
  },
};

declare global {
  interface Window {
    PaystackPop: any;
  }
}

// Load Paystack script dynamically
const loadPaystackScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.PaystackPop) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => {
      // Wait a bit for Paystack to initialize
      setTimeout(() => {
        if (window.PaystackPop) {
          resolve();
        } else {
          reject(new Error('Paystack failed to initialize'));
        }
      }, 500);
    };
    script.onerror = () => {
      reject(new Error('Failed to load Paystack script'));
    };
    document.head.appendChild(script);
  });
};

export const initializePayment = async (details: PaymentDetails): Promise<any> => {
  try {
    // Ensure Paystack script is loaded
    await loadPaystackScript();
    
    if (!window.PaystackPop) {
      throw new Error('Paystack is not available');
    }
    
    const paystack = new window.PaystackPop();
    
    return new Promise((resolve, reject) => {
      paystack.newTransaction({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_',
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
    });
  } catch (error) {
    console.error('Paystack initialization error:', error);
    throw error;
  }
};