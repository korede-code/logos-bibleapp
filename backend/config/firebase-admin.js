// backend/config/firebase-admin.js
const admin = require('firebase-admin');
const fs = require('fs');

let db = null;
let isFirebaseAvailable = false;

try {
  console.log('🔍 Initializing Firebase Admin SDK...');
  console.log('📁 firebase-admin version:', admin.SDK_VERSION);
  
  // ✅ Method 1: Using service account file
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (credentialsPath) {
    console.log(`📁 Looking for credentials at: ${credentialsPath}`);
    
    if (fs.existsSync(credentialsPath)) {
      console.log('✅ Credentials file found');
      
      // ✅ Read the file
      const fileContent = fs.readFileSync(credentialsPath, 'utf8');
      let serviceAccount;
      
      try {
        serviceAccount = JSON.parse(fileContent);
        console.log('✅ JSON parsed successfully');
        console.log('📁 Project ID:', serviceAccount.project_id);
        console.log('📁 Client Email:', serviceAccount.client_email);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError.message);
        throw parseError;
      }
      
      // ✅ Initialize Firebase
      try {
        // Check if already initialized
        if (admin.apps.length === 0) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          console.log('✅ Firebase initialized with service account');
        } else {
          console.log('✅ Firebase already initialized');
        }
        
        db = admin.firestore();
        isFirebaseAvailable = true;
        console.log('✅ Firestore connected');
        
      } catch (initError) {
        console.error('❌ Firebase initialization failed:', initError.message);
        throw initError;
      }
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
  
  // ✅ Method 2: Using environment variables (fallback)
  if (!isFirebaseAvailable && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    console.log('📁 Trying environment variables...');
    
    try {
      // ✅ Clean the private key
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      // Handle both \n and actual newlines
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
        private_key: privateKey,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID || '',
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || ''
      };
      
      // Check if already initialized
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }
      
      db = admin.firestore();
      isFirebaseAvailable = true;
      console.log('✅ Firebase initialized with environment variables');
      
    } catch (envError) {
      console.error('❌ Environment variables failed:', envError.message);
    }
  }
  
  // ✅ Method 3: Try application default credentials
  if (!isFirebaseAvailable) {
    console.log('📁 Trying application default credentials...');
    try {
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
      }
      db = admin.firestore();
      isFirebaseAvailable = true;
      console.log('✅ Firebase initialized with default credentials');
    } catch (defaultError) {
      console.error('❌ Default credentials failed:', defaultError.message);
    }
  }
  
  if (!isFirebaseAvailable) {
    console.log('⚠️ Firebase not available - using JSON file fallback');
  }
  
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  console.error('❌ Stack:', error.stack);
  console.log('⚠️ Firebase is disabled - using JSON file fallback');
}

module.exports = {
  db: db,
  isFirebaseAvailable: isFirebaseAvailable
};