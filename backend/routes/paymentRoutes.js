// backend/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-admin');
const { google } = require('googleapis');

// Initialize Google Play Developer API
let androidPublisher = null;

function initGooglePlayAPI() {
  if (androidPublisher) return androidPublisher;
  
  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
    
    androidPublisher = google.androidpublisher({
      version: 'v3',
      auth: auth,
    });
    
    console.log('✅ Google Play API initialized');
    return androidPublisher;
  } catch (error) {
    console.error('❌ Failed to initialize Google Play API:', error);
    return null;
  }
}

// ============ GOOGLE PLAY BILLING ============

// Verify Google Play purchase
router.post('/verify-google-play-purchase', async (req, res) => {
  try {
    const { purchaseToken, productId, userId } = req.body;
    
    if (!purchaseToken || !productId || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    const api = initGooglePlayAPI();
    if (!api) {
      return res.status(500).json({ 
        success: false, 
        error: 'Google Play API not initialized' 
      });
    }
    
    // Get purchase details from Google Play
    const response = await api.purchases.subscriptions.get({
      packageName: 'com.logosdaily.app',
      subscriptionId: productId,
      token: purchaseToken,
    });
    
    const purchase = response.data;
    const isValid = purchase.paymentState === 1; // 1 = PAID
    
    if (isValid) {
      // Store payment record in Firestore
      await db.collection('payments').doc(purchaseToken).set({
        userId: userId,
        productId: productId,
        purchaseToken: purchaseToken,
        paymentState: purchase.paymentState,
        expiryTime: purchase.expiryTimeMillis,
        startTime: purchase.startTimeMillis,
        status: 'success',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // Update user's Pro status
      await db.collection('users').doc(userId).set({
        isPro: true,
        proSince: new Date().toISOString(),
        productId: productId,
        purchaseToken: purchaseToken,
        expiryTime: purchase.expiryTimeMillis,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log(`✅ Pro activated for ${userId} via Google Play`);
      
      res.json({
        success: true,
        isPro: true,
        userId: userId,
        expiryTime: purchase.expiryTimeMillis
      });
    } else {
      console.warn(`⚠️ Purchase not valid for ${userId}`);
      res.json({
        success: false,
        isPro: false,
        message: 'Purchase not valid'
      });
    }
  } catch (error) {
    console.error('❌ Verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify purchase'
    });
  }
});

// Check subscription status
router.get('/subscription-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.json({ success: true, isPro: false });
    }
    
    const userData = userDoc.data();
    
    if (userData && userData.isPro) {
      // Check if subscription expired
      if (userData.expiryTime) {
        const now = Date.now();
        const expiry = parseInt(userData.expiryTime);
        if (expiry < now) {
          // Subscription expired - update status
          await db.collection('users').doc(userId).set({
            isPro: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          return res.json({ 
            success: true, 
            isPro: false, 
            message: 'Subscription expired' 
          });
        }
      }
      
      return res.json({ 
        success: true, 
        isPro: true,
        data: userData
      });
    }
    
    res.json({ success: true, isPro: false });
  } catch (error) {
    console.error('❌ Subscription status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint to check Pro status (for app to call)
router.get('/pro-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userDoc = await db.collection('users').doc(userId).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      const isPro = userData?.isPro === true;
      
      // Check if expired
      if (isPro && userData.expiryTime) {
        const now = Date.now();
        const expiry = parseInt(userData.expiryTime);
        if (expiry < now) {
          // Subscription expired
          await db.collection('users').doc(userId).set({
            isPro: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          return res.json({ success: true, isPro: false });
        }
      }
      
      res.json({ success: true, isPro: isPro });
    } else {
      res.json({ success: true, isPro: false });
    }
  } catch (error) {
    console.error('❌ Error checking Pro status:', error);
    res.status(500).json({ 
      success: false, 
      isPro: false, 
      error: error.message 
    });
  }
});

// Test endpoint to verify Google Play API connection
router.get('/test-google-play', async (req, res) => {
  const api = initGooglePlayAPI();
  if (api) {
    res.json({ success: true, message: 'Google Play API connected' });
  } else {
    res.status(500).json({ success: false, error: 'Google Play API failed' });
  }
});

module.exports = router;