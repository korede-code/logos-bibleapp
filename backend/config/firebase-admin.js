// backend/config/firebase-admin.js
const admin = require('firebase-admin');
const fs = require('fs');

let db = null;
let isFirebaseAvailable = false;

try {
  console.log('🔍 Initializing Firebase Admin SDK...');
  
  // ✅ Read credentials from file
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (credentialsPath && fs.existsSync(credentialsPath)) {
    console.log(`✅ Credentials file found: ${credentialsPath}`);
    
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log('📁 Project:', serviceAccount.project_id);
    
    // ✅ Initialize
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
}

module.exports = {
  db: db,
  isFirebaseAvailable: isFirebaseAvailable
};