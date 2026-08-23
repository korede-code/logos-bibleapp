// backend/config/firebase-admin.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let db = null;
let adminInstance = null;
let isFirebaseAvailable = false;

try {
  console.log('🔍 Checking Firebase configuration...');
  console.log('📁 GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS || 'not set');
  console.log('📁 NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.log('📁 FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID || 'not set');
  console.log('📁 FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL || 'not set');
  
  // ✅ Check if credentials file exists
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (credentialsPath) {
    console.log(`🔍 Checking if file exists: ${credentialsPath}`);
    if (fs.existsSync(credentialsPath)) {
      console.log('✅ Credentials file found');
      const fileContent = fs.readFileSync(credentialsPath, 'utf8');
      console.log('📄 File size:', fileContent.length, 'bytes');
      
      // Try to parse the JSON
      try {
        const serviceAccount = JSON.parse(fileContent);
        console.log('✅ JSON parsed successfully');
        console.log('📁 Project ID:', serviceAccount.project_id);
        console.log('📁 Client Email:', serviceAccount.client_email);
        
        // Initialize Firebase
        adminInstance = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        isFirebaseAvailable = true;
        console.log('✅ Firebase initialized successfully with service account file');
      } catch (parseError) {
        console.error('❌ Failed to parse JSON file:', parseError.message);
      }
    } else {
      console.log('❌ Credentials file NOT found at:', credentialsPath);
      console.log('📁 Available files in /etc/secrets:');
      try {
        const files = fs.readdirSync('/etc/secrets');
        console.log(files);
      } catch (e) {
        console.log('Cannot read /etc/secrets:', e.message);
      }
    }
  }
  
  // ✅ If no file, try individual environment variables
  if (!isFirebaseAvailable && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    console.log('📁 Trying to initialize with environment variables...');
    try {
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
    } catch (envError) {
      console.error('❌ Failed to initialize with environment variables:', envError.message);
    }
  }
  
  // ✅ If still not available, try application default
  if (!isFirebaseAvailable) {
    console.log('📁 Trying application default credentials...');
    try {
      adminInstance = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      isFirebaseAvailable = true;
      console.log('✅ Firebase initialized with default credentials');
    } catch (defaultError) {
      console.error('❌ Failed to initialize with default credentials:', defaultError.message);
    }
  }

  if (isFirebaseAvailable && adminInstance) {
    db = adminInstance.firestore();
    console.log('✅ Firestore connected');
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