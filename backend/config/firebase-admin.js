// backend/config/firebase-admin.js
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Check if we have a service account JSON in environment
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Parse the service account from environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://logos-daily.firebaseio.com',
    });
  } else {
    // Fallback for development: use Application Default Credentials
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://logos-daily.firebaseio.com',
      });
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin:', error);
    }
  }
}

// Get Firestore database instance
const db = admin.firestore();

// Export the admin instance and database
module.exports = {
  admin,
  db,
};