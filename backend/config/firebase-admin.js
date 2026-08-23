// backend/config/firebase-admin.js
const fs = require('fs');

// ✅ For v14+, import from the main package
const admin = require('firebase-admin');

let db = null;
let isFirebaseAvailable = false;

try {
  console.log('🔍 Initializing Firebase Admin SDK...');
  console.log('📁 firebase-admin version:', admin.SDK_VERSION || 'unknown');
  
  // ✅ Check if we can access cert
  const cert = admin.credential ? admin.credential.cert : (admin.cert || null);
  
  if (!cert) {
    console.error('❌ cert function not available');
    console.log('📁 Available admin properties:', Object.keys(admin));
    console.log('📁 Available admin.credential:', admin.credential ? Object.keys(admin.credential) : 'undefined');
    throw new Error('cert function not available');
  }
  
  // ✅ Method 1: Using service account file
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (credentialsPath && fs.existsSync(credentialsPath)) {
    console.log(`✅ Credentials file found: ${credentialsPath}`);
    
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log('📁 Project:', serviceAccount.project_id);
    console.log('📁 Client Email:', serviceAccount.client_email);
    
    // ✅ Initialize using the correct method
    admin.initializeApp({
      credential: cert(serviceAccount),
    });
    
    db = admin.firestore();
    isFirebaseAvailable = true;
    console.log('✅ Firebase initialized with service account');
    
  } else {
    console.log('⚠️ No credentials file found');
    
    // ✅ Method 2: Using environment variables
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      console.log('📁 Trying environment variables...');
      
      // ✅ Clean the private key
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: privateKey,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
        client_id: process.env.FIREBASE_CLIENT_ID || '',
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || ''
      };
      
      admin.initializeApp({
        credential: cert(serviceAccount),
      });
      
      db = admin.firestore();
      isFirebaseAvailable = true;
      console.log('✅ Firebase initialized with environment variables');
    }
  }
  
  if (!isFirebaseAvailable) {
    console.log('⚠️ Firebase not available - using JSON file fallback');
  }
  
} catch (error) {
  console.error('❌ Firebase init error:', error.message);
  console.error('❌ Stack:', error.stack);
}

module.exports = {
  db: db,
  isFirebaseAvailable: isFirebaseAvailable
};