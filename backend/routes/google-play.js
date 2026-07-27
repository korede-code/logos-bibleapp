// backend/routes/google-play.js
const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

// Initialize Google Play Developer API
const androidPublisher = google.androidpublisher('v3');

// Service account credentials (download from Google Cloud Console)
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});

router.post('/verify-purchase', async (req, res) => {
  const { purchaseToken, productId, userId } = req.body;

  try {
    // Verify the purchase with Google Play
    const response = await androidPublisher.purchases.subscriptions.get({
      auth,
      packageName: 'com.logosdaily.app',
      subscriptionId: productId,
      token: purchaseToken,
    });

    const purchase = response.data;
    const isValid = purchase.paymentState === 1; // 1 = PAID

    if (isValid) {
      // Update user's Pro status in your database
      const users = readUsers();
      users.users[userId] = {
        isPro: true,
        proSince: new Date().toISOString(),
        productId: productId,
        purchaseToken: purchaseToken,
        expiryTime: purchase.expiryTimeMillis,
        updatedAt: new Date().toISOString()
      };
      writeUsers(users);

      res.json({
        success: true,
        isPro: true,
        userId: userId
      });
    } else {
      res.json({
        success: false,
        isPro: false,
        message: 'Purchase not valid'
      });
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify purchase'
    });
  }
});

module.exports = router;