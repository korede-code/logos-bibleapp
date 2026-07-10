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
// Also fix the webhook
router.post('/webhook', async (req, res) => {
  const event = req.body;
  console.log('📨 Paystack webhook received:', JSON.stringify(event, null, 2));

  if (event.event === 'charge.success') {
    const { reference, metadata, customer } = event.data;
    const userId = metadata?.userId;

    if (userId) {
      try {
        // Update payment record
        await db.collection('payments').doc(reference).set({
          status: 'success',
          userId: userId,
          email: customer?.email,
          amount: event.data.amount,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // SET USER AS PRO
        await db.collection('users').doc(userId).set({
          isPro: true,
          proSince: admin.firestore.FieldValue.serverTimestamp(),
          plan: metadata?.plan || 'monthly',
          lastPaymentRef: reference,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log('✅ User', userId, 'is now PRO');
      } catch (err) {
        console.error('❌ Firestore update failed:', err);
      }
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
      res.json({ success: true, isPro: userDoc.data().isPro === true });
    } else {
      res.json({ success: true, isPro: false });
    }
  } catch (error) {
    res.status(500).json({ success: false, isPro: false, error: error.message });
  }
});

module.exports = router;