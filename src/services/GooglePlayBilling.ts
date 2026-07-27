// src/services/GooglePlayBilling.ts

import { Purchases, PurchasesConfiguration, PurchasesPackage } from '@revenuecat/purchases-capacitor';
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
  private apiKey = 'goog_mvVUVCfGLAyhHPCYOdpuHEGSxPw'; // 🔥 Replace with your actual API key
  

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
      // Use a real user ID if available, otherwise fallback to a device-specific ID
      const appUserId = userId || this.getDeviceId();
      
      const config: PurchasesConfiguration = {
        apiKey: this.apiKey,
        appUserID: appUserId,  // ✅ Use a unique ID instead of 'anonymous'
      };
      await Purchases.configure(config);
      this.initialized = true;
      console.log(`✅ RevenueCat initialized for user: ${appUserId}`);
    } catch (error) {
      console.error('❌ Failed to initialize billing:', error);
      throw error;
    }
  }

  // Helper to get a unique device ID
  private getDeviceId(): string {
    // Use Firebase user ID if available, or generate a persistent UUID
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
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages?.find(
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
      return null;
    } catch (error) {
      console.error('❌ Error fetching product details:', error);
      return null;
    }
  }

  async purchaseProduct(productId: string): Promise<{ success: boolean; purchaseToken?: string; error?: string }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`💰 Initiating purchase for: ${productId}`);
      
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages?.find(
        p => p.product.identifier === productId
      );

      if (!pkg) {
        return { success: false, error: 'Product not found' };
      }

      const purchase = await Purchases.purchasePackage({ package: pkg });
      
      if (purchase) {
        return {
          success: true,
          purchaseToken: purchase.purchase?.transactionIdentifier || 'purchase_success',
        };
      }
      
      return { success: false, error: 'Purchase failed' };
    } catch (error: any) {
      console.error('❌ Purchase error:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete purchase',
      };
    }
  }

  async checkPurchaseStatus(): Promise<{ isPurchased: boolean; productId?: string }> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const customerInfo = await Purchases.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active['pro'];
      
      if (entitlement) {
        return {
          isPurchased: true,
          productId: entitlement.productIdentifier,
        };
      }
      return { isPurchased: false };
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
      
      const customerInfo = await Purchases.restorePurchases();
      const activeEntitlements = customerInfo.entitlements.active;
      const productIds = Object.values(activeEntitlements).map(e => e.productIdentifier);
      return productIds;
    } catch (error) {
      console.error('❌ Error restoring purchases:', error);
      return [];
    }
  }
}

export const billingService = GooglePlayBillingService.getInstance();
