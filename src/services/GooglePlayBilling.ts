// src/services/GooglePlayBilling.ts
import { Purchases, PurchasesConfiguration } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

export interface ProductDetails {
  productId: string;
  title: string;
  description: string;
  price: string;
  currencyCode: string;
}

export class GooglePlayBillingService {
  private static instance: GooglePlayBillingService;
  private initialized = false;
  private apiKey: string;

  private constructor() {
    // ✅ Fix: Use import.meta.env instead of process.env
    // In Vite, use import.meta.env.VITE_REVENUECAT_API_KEY
    // In Create React App, you can use a hardcoded fallback or window env
    this.apiKey = (import.meta as any)?.env?.VITE_REVENUECAT_API_KEY || 
                   'goog_mvVUVCfGLAyhHPCYOdpuHEGSxPw';
  }

  static getInstance(): GooglePlayBillingService {
    if (!GooglePlayBillingService.instance) {
      GooglePlayBillingService.instance = new GooglePlayBillingService();
    }
    return GooglePlayBillingService.instance;
  }

  async initialize(userId?: string) {
    if (this.initialized) return;

    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Web platform - skipping billing');
      return;
    }

    try {
      const appUserId = userId || this.getDeviceId();
      
      const config: PurchasesConfiguration = {
        apiKey: this.apiKey,
        appUserID: appUserId,
      };
      await Purchases.configure(config);
      this.initialized = true;
      console.log(`✅ RevenueCat initialized for user: ${appUserId}`);
    } catch (error) {
      console.error('❌ Failed to initialize billing:', error);
      throw error;
    }
  }

  private getDeviceId(): string {
    const storedId = localStorage.getItem('revenuecat_user_id');
    if (storedId) return storedId;
    
    const newId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    localStorage.setItem('revenuecat_user_id', newId);
    return newId;
  }

  async getProductDetails(productId: string): Promise<ProductDetails | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`🔍 Fetching product: ${productId}`);
      const offerings = await Purchases.getOfferings();
      const allPackages = offerings.current?.availablePackages || [];
      
      const pkg = allPackages.find(
        p => p.product.identifier === productId
      );
      
      if (pkg) {
        const product = pkg.product;
        return {
          productId: product.identifier,
          title: product.title || 'Pro Subscription',
          description: product.description || 'Unlock all Pro features',
          price: product.priceString || '$2.99',
          currencyCode: product.currencyCode || 'USD',
        };
      }
      console.warn(`⚠️ Product not found: ${productId}`);
      return null;
    } catch (error) {
      console.error('❌ Error fetching product details:', error);
      return null;
    }
  }

  async purchaseProduct(productId: string, type: string): Promise<{ 
    success: boolean; 
    purchaseToken?: string; 
    customerInfo?: any;
    error?: string 
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`💰 Initiating purchase for: ${productId}`);
      
      const offerings = await Purchases.getOfferings();
      const allPackages = offerings.current?.availablePackages || [];
      console.log('📦 Available packages:', allPackages.map(p => p.product.identifier));
      
      const pkg = allPackages.find(
        p => p.product.identifier === productId
      );

      if (!pkg) {
        return { success: false, error: `Product "${productId}" not found` };
      }

      console.log(`✅ Found package for ${productId}`);

      const purchaseResult = await Purchases.purchaseStoreProduct({
        product: pkg.product,
      });
      
      console.log('📦 Purchase result:', purchaseResult);
      
      const customerInfo = purchaseResult.customerInfo;
      
      if (customerInfo) {
        const entitlement = customerInfo.entitlements?.active?.['logos_daily_pro'];
        
        if (entitlement) {
          const purchaseToken = (entitlement as any).purchaseToken || 
                               (entitlement as any).productIdentifier || 
                               productId;
          
          console.log('✅ Entitlement active, purchase token:', purchaseToken);
          
          return {
            success: true,
            purchaseToken: purchaseToken,
            customerInfo: customerInfo
          };
        }
        
        console.log('⚠️ Entitlement not active, checking transaction...');
        const transaction = (purchaseResult as any).transaction;
        if (transaction) {
          const purchaseToken = transaction.transactionIdentifier || 
                               transaction.productIdentifier || 
                               productId;
          
          return {
            success: true,
            purchaseToken: purchaseToken,
            customerInfo: customerInfo
          };
        }
        
        return {
          success: true,
          purchaseToken: productId,
          customerInfo: customerInfo
        };
      }
      
      return { success: false, error: 'No customer info returned from purchase' };
    } catch (error: any) {
      console.error('❌ Purchase error:', error);
      if (error.message?.includes('User cancelled') || error.message?.includes('user cancelled')) {
        return { success: false, error: 'User cancelled purchase' };
      }
      return {
        success: false,
        error: error.message || 'Failed to complete purchase',
      };
    }
  }

  async getCustomerInfo() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      const info = await Purchases.getCustomerInfo();
      console.log('📦 Customer info retrieved');
      return info;
    } catch (error) {
      console.error('❌ Error getting customer info:', error);
      return null;
    }
  }

  async checkPurchaseStatus(): Promise<{ isPurchased: boolean; productId?: string; customerInfo?: any }> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      const getInfoResult = await Purchases.getCustomerInfo();
      const customerInfo = (getInfoResult as any).customerInfo || getInfoResult;
      const entitlement = customerInfo.entitlements?.active?.['logos_daily_pro'];
      
      if (entitlement) {
        return {
          isPurchased: true,
          productId: entitlement.productIdentifier,
          customerInfo: customerInfo
        };
      }
      return { isPurchased: false, customerInfo: customerInfo };
    } catch (error) {
      console.error('❌ Error checking purchase status:', error);
      return { isPurchased: false };
    }
  }

  async restorePurchases(): Promise<string[]> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      const restoreResult = await Purchases.restorePurchases();
      const customerInfo = (restoreResult as any).customerInfo || restoreResult;
      const activeEntitlements = customerInfo.entitlements?.active || {};
      const productIds = Object.values(activeEntitlements).map((e: any) => e.productIdentifier);
      console.log('✅ Restored purchases:', productIds);
      return productIds;
    } catch (error) {
      console.error('❌ Error restoring purchases:', error);
      return [];
    }
  }

  async syncProStatusWithBackend(userId: string): Promise<boolean> {
    try {
      const status = await this.checkPurchaseStatus();
      if (status.isPurchased) {
        const response = await fetch(
          'https://logos-daily-backend.onrender.com/api/payments/sync-revenuecat',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
              isPro: true,
              customerInfo: status.customerInfo
            })
          }
        );
        const data = await response.json();
        console.log('📦 Sync response:', data);
        return data.success === true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error syncing with backend:', error);
      return false;
    }
  }
}

export const billingService = GooglePlayBillingService.getInstance();