
declare module 'react-paystack' {
  import { Component } from 'react';
  
  interface PaystackProps {
    publicKey: string;
    email: string;
    amount: number;
    reference?: string;
    metadata?: any;
    onSuccess: (response: any) => void;
    onClose: () => void;
    text?: string;
    className?: string;
    disabled?: boolean;
  }
  
  export const PaystackButton: Component<PaystackProps>;
  export const PaystackConsumer: any;
  export default PaystackButton;
}