// backend/config/firebase-admin.js
const fs = require('fs');

// Add this at the top of firebase-admin.js
console.log('🔍 Environment variables check:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✓ set' : '✗ missing');
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✓ set (' + process.env.FIREBASE_PRIVATE_KEY.length + ' chars)' : '✗ missing');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✓ set' : '✗ missing');
console.log('FIREBASE_CLIENT_CERT_URL:', process.env.FIREBASE_CLIENT_CERT_URL ? '✓ set' : '✗ missing');

// ✅ Try different import methods
let admin;
try {
  // Method 1: Standard require
  admin = require('firebase-admin');
  console.log('✅ firebase-admin loaded via require');
} catch (e) {
  console.log('⚠️ Standard require failed, trying alternative...');
  try {
    // Method 2: Dynamic import (for ES modules)
    admin = require('firebase-admin/app');
  } catch (e2) {
    console.error('❌ Failed to load firebase-admin');
    process.exit(1);
  }
}

let db = null;
let isFirebaseAvailable = false;

try {
  console.log('🔍 Initializing Firebase Admin SDK...');
  console.log('📁 firebase-admin version:', admin.SDK_VERSION || 'unknown');
  
  // ✅ Check if credential is available
  if (!admin.credential) {
    console.error('❌ admin.credential is undefined');
    console.log('📁 Available properties:', Object.keys(admin));
    throw new Error('admin.credential not available');
  }
  
  // ✅ Read credentials from file
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (credentialsPath && fs.existsSync(credentialsPath)) {
    console.log(`✅ Credentials file found: ${credentialsPath}`);
    
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log('📁 Project:', serviceAccount.project_id);
    console.log('📁 Client Email:', serviceAccount.client_email);
    
    // ✅ Initialize with explicit credential
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    db = admin.firestore();
    isFirebaseAvailable = true;
    console.log('✅ Firebase initialized successfully');
    
  } else {
    console.log('⚠️ No credentials file found');
    
    // ✅ Try environment variables
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      console.log('📁 Trying environment variables...');
      
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
        client_id: process.env.FIREBASE_CLIENT_ID || '',
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || ''
      };
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      
      db = admin.firestore();
      isFirebaseAvailable = true;
      console.log('✅ Firebase initialized with environment variables');
    }
  }
  
} catch (error) {
  console.error('❌ Firebase init error:', error.message);
  console.error('❌ Stack:', error.stack);
}

module.exports = {
  db: db,
  isFirebaseAvailable: isFirebaseAvailable
};