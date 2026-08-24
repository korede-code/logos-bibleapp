// backend/config/firebase-admin.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

console.log('🔧 Initializing Firebase Admin SDK...');

let db = null;
let isFirebaseAvailable = false;

try {
  // Check if the module loaded
  if (!admin) {
    console.error('❌ firebase-admin module failed to load');
    throw new Error('Module not loaded');
  }

  console.log('✅ firebase-admin module loaded');

  // Try to get service account
  let serviceAccount = null;
  
  // Option 1: From environment variable (Render)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('📝 Trying FIREBASE_SERVICE_ACCOUNT from environment...');
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log('✅ Parsed service account from environment');
    } catch (e) {
      console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:', e.message);
    }
  }
  
  // Option 2: From local file (development)
  if (!serviceAccount) {
    const localPath = path.join(__dirname, '..', 'service-account.json');
    if (fs.existsSync(localPath)) {
      console.log('📝 Trying local service account file:', localPath);
      try {
        serviceAccount = JSON.parse(fs.readFileSync(localPath, 'utf8'));
        console.log('✅ Loaded local service account file');
      } catch (e) {
        console.error('❌ Failed to read local file:', e.message);
      }
    }
  }
  
  // Option 3: From individual environment variables
  if (!serviceAccount && process.env.FIREBASE_PROJECT_ID) {
    console.log('📝 Trying individual Firebase environment variables...');
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;
    
    if (process.env.FIREBASE_PROJECT_ID && privateKey && process.env.FIREBASE_CLIENT_EMAIL) {
      serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };
      console.log('✅ Loaded individual environment variables');
    }
  }
  
  // Initialize Firebase if we have service account
  if (serviceAccount) {
    console.log('📝 Initializing Firebase Admin SDK...');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}.firebaseio.com`,
    });
    console.log('✅ Firebase Admin initialized successfully');
    
    db = admin.firestore();
    isFirebaseAvailable = true;
    console.log('✅ Firestore is ready');
  } else {
    console.warn('⚠️ No service account found - Firebase is disabled');
  }
  
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  console.warn('⚠️ Firebase is disabled - using JSON file fallback');
}

module.exports = {
  admin,
  db,
  isFirebaseAvailable,
};