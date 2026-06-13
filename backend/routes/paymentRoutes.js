// backend/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const https = require('https');
const { db } = require('../config/firebase-admin');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://logos-daily.web.app';

// Initialize payment
router.post('/initialize', async (req, res) => {
  try {
    const { email, amount, plan, userId } = req.body;
    const reference = `LOGOS_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store payment intent in Firestore
    await db.collection('payments').doc(reference).set({
      email,
      amount,
      plan,
      userId,
      reference,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (!PAYSTACK_SECRET) {
      return res.status(500).json({ success: false, error: 'Payment service not configured' });
    }

    const params = JSON.stringify({
      email: email,
      amount: Math.round(amount * 100),
      currency: 'USD',
      reference: reference,
      callback_url: `${FRONTEND_URL}/payment-success`,
      metadata: {
        userId: userId || 'guest',
        plan: plan,
        source: 'logos-daily-app',
      },
    });

    // ... Paystack API call (same as before) ...
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook - THIS IS WHERE PRO STATUS IS SET
router.post('/webhook', async (req, res) => {
  const event = req.body;
  console.log('📨 Paystack webhook:', event.event);

  if (event.event === 'charge.success') {
    const { reference, metadata } = event.data;
    const userId = metadata?.userId;

    console.log('✅ Payment successful - Reference:', reference);
    console.log('👤 User ID:', userId);

    try {
      // Update payment status in Firestore
      await db.collection('payments').doc(reference).update({
        status: 'success',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Set user as Pro in Firestore
      if (userId) {
        await db.collection('users').doc(userId).set({
          isPro: true,
          proSince: admin.firestore.FieldValue.serverTimestamp(),
          plan: metadata?.plan || 'monthly',
          lastPaymentRef: reference,
        }, { merge: true });

        console.log('✅ User upgraded to Pro:', userId);
      }
    } catch (err) {
      console.error('❌ Failed to update Firestore:', err);
    }
  }

  res.sendStatus(200);
});

// Endpoint to check Pro status (for app to call)
router.get('/pro-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userDoc = await db.collection('users').doc(userId).get();

    if (userDoc.exists) {
      const data = userDoc.data();
      res.json({ success: true, isPro: data.isPro || false, data });
    } else {
      res.json({ success: true, isPro: false });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;