// backend/config/firebase-admin.js
const admin = require('firebase-admin');

// Check env vars first
console.log('🔑 Checking Firebase credentials...');
console.log('   Project ID:', process.env.FIREBASE_PROJECT_ID || '❌');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Try with environment variable private key
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      
      console.log('   Private key length:', privateKey.length);
      console.log('   Client email:', process.env.FIREBASE_CLIENT_EMAIL);
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      
      console.log('✅ Firebase Admin initialized with service account');
    } else {
      // Fallback: Initialize with just project ID (limited functionality)
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'logos-daily',
      });
      console.log('⚠️  Firebase Admin initialized with project ID only');
    }
  } catch (error) {
    console.error('❌ Firebase Admin init error:', error.message);
    
    // Last resort: Initialize without credentials
    admin.initializeApp({
      projectId: 'logos-daily',
    });
  }
}

const db = admin.firestore();
const auth = admin.auth();

console.log('✅ Firebase services ready');

module.exports = { admin, db, auth };