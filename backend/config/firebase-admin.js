// backend/config/firebase-admin.js
const admin = require('firebase-admin');

// Try to initialize Firebase Admin
try {
  // Check if credentials exist
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    console.log('✅ Firebase Admin initialized with credentials');
  } else {
    // Initialize without credentials (won't have Firestore access)
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'logos-daily',
    });
    console.log('⚠️  Firebase Admin initialized without credentials');
  }
} catch (error) {
  console.error('❌ Firebase Admin init error:', error.message);
}

// Check if initialized successfully
console.log('   Apps count:', admin.apps?.length || 0);

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };