// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebase-admin');

// Middleware to verify Firebase ID token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Set user as Pro (call this after successful payment)
router.post('/set-pro-status', verifyToken, async (req, res) => {
  const { uid, isPro, expiryDate } = req.body;
  
  // Verify the user is setting their own status or admin
  if (req.user.uid !== uid && !req.user.admin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  try {
    // Set custom claim
    await auth.setCustomUserClaims(uid, { isPro: isPro });
    
    // Update Firestore user document
    const userRef = db.collection('users').doc(uid);
    await userRef.set({
      isPro: isPro,
      proExpiryDate: expiryDate || null,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log(`✅ User ${uid} pro status set to ${isPro}`);
    
    res.json({ 
      success: true, 
      message: `Pro status updated to ${isPro}` 
    });
  } catch (error) {
    console.error('Error setting pro status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user data (including custom claims)
router.get('/user/:uid', verifyToken, async (req, res) => {
  const { uid } = req.params;
  
  // Check authorization
  if (req.user.uid !== uid && !req.user.admin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  try {
    // Get user from Auth
    const userRecord = await auth.getUser(uid);
    
    // Get user from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    
    res.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        isPro: userRecord.customClaims?.isPro || false,
        ...userData
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync user stats (streak, highlights, etc.)
router.post('/sync-user-stats', verifyToken, async (req, res) => {
  const { uid, stats } = req.body;
  
  if (req.user.uid !== uid) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  try {
    const userRef = db.collection('users').doc(uid);
    await userRef.set({
      ...stats,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error syncing stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Refresh user token (to get new custom claims)
router.post('/refresh-token', verifyToken, async (req, res) => {
  const { uid } = req.body;
  
  try {
    // Generate a new custom token (optional - usually client refreshes)
    const customToken = await auth.createCustomToken(uid);
    res.json({ success: true, customToken });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;