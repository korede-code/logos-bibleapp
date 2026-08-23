// backend/config/firebase-admin.js
const admin = require('firebase-admin');
const fs = require('fs');

let db = null;
let adminInstance = null;
let isFirebaseAvailable = false;

try {
  console.log('🔍 Initializing Firebase Admin SDK...');
  
  // ✅ Check if we have the credentials file
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (credentialsPath) {
    console.log(`📁 Looking for credentials at: ${credentialsPath}`);
    
    // Check if file exists
    if (fs.existsSync(credentialsPath)) {
      console.log('✅ Credentials file found');
      const serviceAccount = require(credentialsPath);
      
      adminInstance = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      isFirebaseAvailable = true;
      console.log('✅ Firebase initialized with service account file');
    } else {
      console.log(`❌ Credentials file NOT found at: ${credentialsPath}`);
      console.log('📁 Available files in /etc/secrets:');
      try {
        const files = fs.readdirSync('/etc/secrets');
        console.log(files);
      } catch (e) {
        console.log('Cannot read /etc/secrets:', e.message);
      }
    }
  }
  
  // ✅ Fallback: Try environment variables
  if (!isFirebaseAvailable && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    console.log('📁 Using environment variables for Firebase...');
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID || '',
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || ''
    };
    
    adminInstance = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    isFirebaseAvailable = true;
    console.log('✅ Firebase initialized with environment variables');
  }
  
  // ✅ Try default credentials
  if (!isFirebaseAvailable) {
    console.log('📁 Trying default application credentials...');
    adminInstance = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    isFirebaseAvailable = true;
    console.log('✅ Firebase initialized with default credentials');
  }

  if (isFirebaseAvailable && adminInstance) {
    db = adminInstance.firestore();
    console.log('✅ Firestore connected');
  } else {
    console.log('⚠️ Firebase not available - using JSON file fallback');
  }
  
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  console.log('⚠️ Firebase is disabled - using JSON file fallback');
}

module.exports = {
  admin: adminInstance,
  db: db,
  isFirebaseAvailable: isFirebaseAvailable
};