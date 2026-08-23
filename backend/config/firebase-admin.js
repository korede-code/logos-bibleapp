// backend/config/firebase-admin.js
const admin = require('firebase-admin');

// ✅ Check if we're in production (Render) or development
const isProduction = process.env.NODE_ENV === 'production';

let db = null;
let adminInstance = null;
let isFirebaseAvailable = false;

try {
  // ✅ For Render, use environment variables
  if (isProduction) {
    // Get the service account from environment variables
    const serviceAccount = {
      type: process.env.FIREBASE_TYPE || "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    };

    adminInstance = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Development - try local file
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                               path.join(__dirname, '../../firebase-service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      adminInstance = admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath)),
      });
    } else {
      console.log('⚠️ No service account file found, using default credentials');
      adminInstance = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  }

  db = adminInstance.firestore();
  isFirebaseAvailable = true;
  console.log('✅ Firebase Admin SDK initialized successfully');
  
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  console.log('⚠️ Firebase is disabled - using JSON file fallback');
}

module.exports = {
  admin: adminInstance,
  db: db,
  isFirebaseAvailable: isFirebaseAvailable
};