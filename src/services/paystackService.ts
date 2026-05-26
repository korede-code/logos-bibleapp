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

export const initializePayment = async (details: PaymentDetails): Promise<any> => {
  console.log('Mock payment initialized:', details);
  
  // Simulate payment success
  setTimeout(() => {
    if (details.callback) {
      details.callback({ reference: `mock_${Date.now()}` });
    }
  }, 1000);
  
  return { reference: `mock_${Date.now()}` };
};

export const verifyPayment = async (reference: string) => {
  return { success: true, verified: true };
};