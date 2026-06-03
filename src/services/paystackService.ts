// src/services/paystackService.ts

export interface PaymentDetails {
  email: string;
  amount: number;
  reference?: string;
  metadata?: Record<string, any>;
  callback?: (response: any) => void;
  onClose?: () => void;
}

export interface ProPlan {
  id: string;
  name: string;
  amount: number;        // Amount in kobo (smallest currency unit)
  amountNaira: string;    // Display amount
  days: number;           // Subscription duration in days
}

export const PRO_PLANS: Record<string, ProPlan> = {
  MONTHLY: { 
    id: 'monthly', 
    name: 'Monthly Pro', 
    amount: 299000,           // ₦2,990 in kobo
    amountNaira: '₦2,990', 
    days: 30,
  },
  YEARLY: { 
    id: 'yearly', 
    name: 'Yearly Pro', 
    amount: 299000,          // ₦29,900 in kobo
    amountNaira: '₦29,900', 
    days: 365,
  },
  LIFETIME: { 
    id: 'lifetime', 
    name: 'Lifetime Access', 
    amount: 9990000,          // ₦99,900 in kobo
    amountNaira: '₦99,900', 
    days: 9999,
  },
};

const API_BASE_URL = 'https://logos-daily-backend.onrender.com/api';

/**
 * Initialize a payment with Paystack via your backend
 */
export const initializePayment = async (
  email: string,
  plan: ProPlan,
  userId?: string
): Promise<{ success: boolean; paymentUrl?: string; reference?: string; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        amount: plan.amount / 100, // Convert kobo to naira for the backend
        plan: plan.id,
        userId: userId || 'guest',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Payment initialization failed',
      };
    }

    return {
      success: true,
      paymentUrl: data.paymentUrl,
      reference: data.reference,
    };
  } catch (error: any) {
    console.error('Payment initialization error:', error);
    return {
      success: false,
      error: 'Unable to connect to payment service. Please try again.',
    };
  }
};

/**
 * Verify a payment with Paystack via your backend
 */
export const verifyPayment = async (reference: string): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/verify/${reference}`);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Payment verification failed',
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return {
      success: false,
      error: 'Unable to verify payment. Please try again.',
    };
  }
};

/**
 * Calculate amount in kobo from naira
 */
export const toKobo = (naira: number): number => {
  return Math.round(naira * 100);
};

/**
 * Format amount for display
 */
export const formatNaira = (kobo: number): string => {
  return `₦${(kobo / 100).toLocaleString()}`;
};