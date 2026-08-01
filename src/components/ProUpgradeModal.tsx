// src/components/ProUpgradeModal.tsx
import React, { useState, useEffect } from 'react';
import { billingService, type ProductDetails } from '../services/GooglePlayBilling';
import { useAppStore } from '../store/appStore';
import { Capacitor } from '@capacitor/core';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: any;
}

const defaultTheme = {
  bg: '#1a1a2e',
  card: '#2d2d44',
  surface: '#3d3d5c',
  text: '#ffffff',
  textMuted: '#888888',
  accent: '#488AFF',
  border: '#4a4a6a',
  error: '#e53935',
  success: '#4CAF50',
};

// ✅ Updated product IDs to match RevenueCat exactly
const PRODUCT_IDS = {
  MONTHLY: 'synthesis_bible_monthly:monthly-base',
  YEARLY: 'synthesis_bible_yearly:yearly-base',
  LIFETIME: 'synthesis_bible_lifetime'
};

// ✅ Display names for the products
const PRODUCT_DISPLAY_NAMES: Record<string, string> = {
  'synthesis_bible_monthly:monthly-base': 'Monthly Pro',
  'synthesis_bible_yearly:yearly-base': 'Yearly Pro',
  'synthesis_bible_lifetime': 'Lifetime Pro'
};

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose, theme }) => {
  const t = theme || defaultTheme;
  
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<ProductDetails[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('MONTHLY');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && Capacitor.isNativePlatform()) {
      loadProductDetails();
    }
  }, [isOpen]);

  const loadProductDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🔍 Step 1: Initializing billing service...');
      await billingService.initialize();
      console.log('✅ Step 2: Billing service initialized');

      // ✅ Get all products with their exact IDs from RevenueCat
      const productIds = [
        PRODUCT_IDS.MONTHLY,
        PRODUCT_IDS.YEARLY, 
        PRODUCT_IDS.LIFETIME
      ];
      
      const productPromises = productIds.map(id => billingService.getProductDetails(id));
      const results = await Promise.all(productPromises);
      
      // ✅ Filter out null results and log what we found
      const availableProducts = results.filter(p => p !== null) as ProductDetails[];
      console.log('📦 Available products count:', availableProducts.length);
      console.log('📦 Products found:', availableProducts.map(p => ({
        id: p.productId,
        title: p.title,
        price: p.price
      })));
      
      if (availableProducts.length === 0) {
        console.error('❌ No products found! Check RevenueCat configuration.');
        setError('No products available. Please check your configuration.');
      } else {
        console.log('✅ Products loaded successfully:', availableProducts);
        setProducts(availableProducts);
        
        // ✅ Set first product as default
        const firstProduct = availableProducts[0];
        const planKey = Object.keys(PRODUCT_IDS).find(
          key => PRODUCT_IDS[key as keyof typeof PRODUCT_IDS] === firstProduct.productId
        );
        setSelectedPlan(planKey || 'MONTHLY');
      }
    } catch (err) {
      console.error('❌ Error loading products:', err);
      setError('Failed to load products. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const productId = PRODUCT_IDS[selectedPlan as keyof typeof PRODUCT_IDS];
      console.log('💰 Purchasing product:', productId);
      
      const result = await billingService.purchaseProduct(productId, 'SUBS');

      if (result.success && result.purchaseToken) {
        const userId = useAppStore.getState().currentUser?.uid || 
                       localStorage.getItem('currentUserId') || 'guest';
        
        console.log('🔍 Verifying purchase with backend...');
        
        const verifyResponse = await fetch(
          'https://logos-daily-backend.onrender.com/api/google-play/verify-purchase',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              purchaseToken: result.purchaseToken,
              productId: productId,
              userId: userId,
              customerInfo: result.customerInfo
            })
          }
        );
        
        const verifyData = await verifyResponse.json();
        console.log('📦 Verification response:', verifyData);
        
        if (verifyData.success && verifyData.isPro) {
          useAppStore.setState({ isPro: true });
          localStorage.setItem('logos_daily_pro', 'true');
          if (userId !== 'guest') {
            localStorage.setItem(`isPro_${userId}`, 'true');
          }
          
          // ✅ Trigger a refresh of the auth listener
          window.dispatchEvent(new Event('focus'));
          
          alert('🎉 Welcome to Pro! Your subscription is active.');
          onClose();
        } else {
          // ✅ Fallback: Check directly with RevenueCat
          console.log('⚠️ Backend verification failed, checking RevenueCat directly...');
          const status = await billingService.checkPurchaseStatus();
          if (status.isPurchased) {
            useAppStore.setState({ isPro: true });
            localStorage.setItem('logos_daily_pro', 'true');
            if (userId !== 'guest') {
              localStorage.setItem(`isPro_${userId}`, 'true');
            }
            alert('🎉 Welcome to Pro! Your subscription is active.');
            onClose();
          } else {
            setError('Purchase verification failed. Please contact support or try restoring purchases.');
          }
        }
      } else {
        if (result.error !== 'User cancelled purchase') {
          setError(result.error || 'Purchase failed. Please try again.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete purchase');
      console.error('Purchase error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const productIds = await billingService.restorePurchases();
      console.log('🔍 Restored product IDs:', productIds);
      
      if (productIds.length > 0) {
        const userId = useAppStore.getState().currentUser?.uid || 
                       localStorage.getItem('currentUserId') || 'guest';
        
        // ✅ Check if any restored product gives Pro access
        const status = await billingService.checkPurchaseStatus();
        
        if (status.isPurchased) {
          useAppStore.setState({ isPro: true });
          localStorage.setItem('logos_daily_pro', 'true');
          if (userId !== 'guest') {
            localStorage.setItem(`isPro_${userId}`, 'true');
          }
          
          // ✅ Sync with backend
          await billingService.syncProStatusWithBackend(userId);
          
          alert('✅ Your Pro subscription has been restored!');
          onClose();
        } else {
          alert('No active Pro subscription found.');
        }
      } else {
        alert('No purchases to restore.');
      }
    } catch (err) {
      setError('Failed to restore purchases. Please try again.');
      console.error('Restore error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Web fallback
  if (!Capacitor.isNativePlatform()) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: t.card,
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '400px',
            width: '100%'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 style={{ color: t.text, textAlign: 'center' }}>📱 Mobile App Required</h2>
          <p style={{ color: t.textMuted, textAlign: 'center' }}>
            In-app purchases are only available on the mobile app.
            Please download the app from Google Play Store to upgrade.
          </p>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: t.accent,
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: t.card,
          borderRadius: '16px',
          padding: '30px',
          maxWidth: '400px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ color: t.text, textAlign: 'center' }}>✨ Upgrade to Pro</h2>
        <p style={{ color: t.textMuted, textAlign: 'center' }}>
          Get unlimited access to all features
        </p>

        {error && (
          <div style={{
            backgroundColor: '#e5393515',
            color: '#e53935',
            padding: '10px',
            borderRadius: '8px',
            margin: '10px 0',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {isLoading && !products.length ? (
          <div style={{ textAlign: 'center', padding: '20px', color: t.textMuted }}>
            Loading products...
          </div>
        ) : (
          <>
            <div style={{ margin: '20px 0' }}>
              {products.map((product) => {
                const planKey = Object.keys(PRODUCT_IDS).find(
                  key => PRODUCT_IDS[key as keyof typeof PRODUCT_IDS] === product.productId
                );
                
                // ✅ Use display name from mapping if available
                const displayName = PRODUCT_DISPLAY_NAMES[product.productId] || product.title;
                
                return (
                  <div
                    key={product.productId}
                    style={{
                      padding: '15px',
                      margin: '10px 0',
                      border: selectedPlan === planKey ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                      borderRadius: '10px',
                      backgroundColor: selectedPlan === planKey ? 'rgba(72, 138, 255, 0.1)' : 'transparent',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedPlan(planKey || 'MONTHLY')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ color: t.text, margin: 0 }}>{displayName}</h4>
                        <p style={{ color: t.textMuted, margin: '5px 0 0', fontSize: '14px' }}>
                          {product.description}
                        </p>
                      </div>
                      <span style={{
                        color: t.accent,
                        fontSize: '18px',
                        fontWeight: 'bold'
                      }}>
                        {product.price}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handlePurchase}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: t.accent,
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? 'Processing...' : 'Subscribe Now'}
            </button>

            <button
              onClick={handleRestorePurchases}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'transparent',
                color: t.textMuted,
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Restore Purchases
            </button>

            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'transparent',
                color: t.textMuted,
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                marginTop: '5px'
              }}
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProUpgradeModal;