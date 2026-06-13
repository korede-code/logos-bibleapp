// backend/config/firebase-admin.js
const admin = require('firebase-admin');

// Check if required env vars exist
if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
  console.error('❌ Missing Firebase Admin environment variables!');
  console.error('   FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅' : '❌');
  console.error('   FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅' : '❌');
  console.error('   FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✅' : '❌');
}

// Initialize Firebase Admin
function initializeFirebaseAdmin() {
  try {
    // Parse the private key correctly
    const privateKey = process.env.FIREBASE_PRIVATE_KEY 
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
      : undefined;

    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
      universe_domain: 'googleapis.com'
    };

    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    console.log('✅ Firebase Admin initialized successfully');
    console.log('   Project:', serviceAccount.project_id);
    console.log('   Client Email:', serviceAccount.client_email);

    return app;
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    
    // Fallback: Initialize without credentials (for basic functionality)
    console.log('⚠️  Initializing Firebase Admin without credentials (limited mode)');
    const app = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'logos-daily',
    });
    return app;
  }
}

// Initialize
const app = initializeFirebaseAdmin();
const db = admin.firestore();
const auth = admin.auth();

console.log('✅ Firebase services ready');

module.exports = { admin, db, auth };