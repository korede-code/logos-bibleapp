// backend/config/firebase-admin.js
const fs = require('fs');

// Add this at the top of firebase-admin.js
console.log('🔍 Environment variables check:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✓ set' : '✗ missing');
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✓ set (' + process.env.FIREBASE_PRIVATE_KEY.length + ' chars)' : '✗ missing');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✓ set' : '✗ missing');
console.log('FIREBASE_CLIENT_CERT_URL:', process.env.FIREBASE_CLIENT_CERT_URL ? '✓ set' : '✗ missing');

// ✅ Import credential separately for v14+
const { cert, applicationDefault } = require('firebase-admin/credential');
const { initializeApp, getApps, firestore } = require('firebase-admin');

let db = null;
let isFirebaseAvailable = false;

try {
  console.log('🔍 Initializing Firebase Admin SDK...');
  console.log('📁 Using firebase-admin v14+ with modular imports');
  
  // ✅ Check if already initialized
  if (getApps().length > 0) {
    console.log('✅ Firebase already initialized');
    db = firestore();
    isFirebaseAvailable = true;
  } else {
    // ✅ Method 1: Using service account file
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (credentialsPath && fs.existsSync(credentialsPath)) {
      console.log(`✅ Credentials file found: ${credentialsPath}`);
      
      const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      console.log('📁 Project:', serviceAccount.project_id);
      console.log('📁 Client Email:', serviceAccount.client_email);
      
      // ✅ Initialize with cert from credential module
      initializeApp({
        credential: cert(serviceAccount),
      });
      
      db = firestore();
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
        
        initializeApp({
          credential: cert(serviceAccount),
        });
        
        db = firestore();
        isFirebaseAvailable = true;
        console.log('✅ Firebase initialized with environment variables');
      }
      
      // ✅ Method 3: Try application default
      if (!isFirebaseAvailable) {
        console.log('📁 Trying application default credentials...');
        try {
          initializeApp({
            credential: applicationDefault(),
          });
          db = firestore();
          isFirebaseAvailable = true;
          console.log('✅ Firebase initialized with default credentials');
        } catch (defaultError) {
          console.error('❌ Default credentials failed:', defaultError.message);
        }
      }
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