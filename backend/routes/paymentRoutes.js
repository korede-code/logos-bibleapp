// backend/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const https = require('https');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://magenta-capybara-231e57.netlify.app/';

// Initialize payment
router.post('/initialize', async (req, res) => {
  try {
    const { email, amount, plan, userId } = req.body;

    // Validate required fields
    if (!email || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Email and amount are required',
      });
    }

    // Check for Paystack secret
    if (!PAYSTACK_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'Payment service not configured',
      });
    }

    // Generate unique reference
    const reference = `LOGOS_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Paystack API call
    const params = JSON.stringify({
      email: email,
      amount: Math.round(amount * 100), // Convert to kobo
      currency: 'USD',
      reference: reference,
      callback_url: `${FRONTEND_URL}/payment-success`,
      metadata: {
        userId: userId || 'guest',
        plan: plan,
        source: 'logos-daily-app',
      },
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    };

    const paystackResponse = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse Paystack response'));
          }
        });
      });
      request.on('error', (err) => reject(new Error(`Paystack request failed: ${err.message}`)));
      request.write(params);
      request.end();
    });

    if (paystackResponse.status) {
      res.json({
        success: true,
        message: 'Payment initialized successfully',
        paymentUrl: paystackResponse.data.authorization_url,
        reference: paystackResponse.data.reference,
      });
    } else {
      throw new Error(paystackResponse.message || 'Payment initialization failed');
    }
  } catch (error) {
    console.error('Payment initialization error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Payment failed. Please try again.',
    });
  }
});

// Verify payment
router.get('/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;

    if (!PAYSTACK_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'Payment service not configured',
      });
    }

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${encodeURIComponent(reference)}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
      },
    };

    const paystackResponse = await new Promise((resolve, reject) => {
      https.get(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse Paystack response'));
          }
        });
      }).on('error', (err) => reject(new Error(`Paystack request failed: ${err.message}`)));
    });

    if (paystackResponse.status) {
      res.json({
        success: true,
        data: paystackResponse.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: paystackResponse.message || 'Verification failed',
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
    });
  }
});

// Webhook for Paystack events
router.post('/webhook', (req, res) => {
  const event = req.body;
  console.log('📨 Paystack webhook received:', event.event);

  if (event.event === 'charge.success') {
    console.log('✅ Payment successful - Reference:', event.data.reference);
    console.log('📧 Customer email:', event.data.customer?.email);
    console.log('💰 Amount:', event.data.amount / 100, event.data.currency);
  }

  res.sendStatus(200);
});

module.exports = router;