// backend/config/firebase-admin.js
const { cert, initializeApp, getApp, getApps } = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

console.log('🔧 Initializing Firebase Admin SDK...');

let db = null;
let isFirebaseAvailable = false;
let adminApp = null;

function cleanPrivateKey(privateKey) {
  if (!privateKey) return null;
  
  // If the key has literal \n, convert to actual newlines
  if (privateKey.includes('\\n')) {
    console.log('📝 Converting literal \\n to actual newlines...');
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  
  privateKey = privateKey.trim();
  return privateKey;
}

function initializeFirebase() {
  try {
    // Check if already initialized
    const apps = getApps();
    if (apps.length > 0) {
      console.log('✅ Firebase Admin already initialized');
      adminApp = apps[0];
      db = getFirestore(adminApp);
      isFirebaseAvailable = true;
      console.log('✅ Firestore is ready');
      return true;
    }

    // Try to get service account
    let serviceAccount = null;
    
    // Option 1: From local file (development)
    const localPaths = [
      path.join(__dirname, '..', 'service-account.json'),
      path.join(__dirname, 'service-account.json'),
      path.join(process.cwd(), 'service-account.json'),
    ];
    
    for (const localPath of localPaths) {
      if (fs.existsSync(localPath)) {
        console.log('📝 Trying local service account file:', localPath);
        try {
          const parsed = JSON.parse(fs.readFileSync(localPath, 'utf8'));
          
          const projectId = parsed.projectId || parsed.project_id;
          const clientEmail = parsed.clientEmail || parsed.client_email;
          const privateKey = cleanPrivateKey(parsed.privateKey || parsed.private_key);
          
          if (projectId && privateKey && clientEmail) {
            serviceAccount = {
              projectId: projectId,
              privateKey: privateKey,
              clientEmail: clientEmail,
            };
            console.log('✅ Loaded local service account file');
            console.log(`📝 Project: ${serviceAccount.projectId}`);
            console.log(`📝 Email: ${serviceAccount.clientEmail}`);
            break;
          }
        } catch (e) {
          console.error('❌ Failed to read local file:', e.message);
        }
      }
    }
    
    // Option 2: From environment variable (Render)
    if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('📝 Trying FIREBASE_SERVICE_ACCOUNT from environment...');
      try {
        const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        const projectId = parsed.projectId || parsed.project_id;
        const clientEmail = parsed.clientEmail || parsed.client_email;
        const privateKey = cleanPrivateKey(parsed.privateKey || parsed.private_key);
        
        if (projectId && privateKey && clientEmail) {
          serviceAccount = {
            projectId: projectId,
            privateKey: privateKey,
            clientEmail: clientEmail,
          };
          console.log('✅ Parsed service account from environment');
          console.log(`📝 Project: ${serviceAccount.projectId}`);
          console.log(`📝 Email: ${serviceAccount.clientEmail}`);
        }
      } catch (e) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:', e.message);
      }
    }
    
    // Option 3: From individual environment variables
    if (!serviceAccount && process.env.FIREBASE_PROJECT_ID) {
      console.log('📝 Trying individual Firebase environment variables...');
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      if (projectId && clientEmail && privateKey) {
        privateKey = cleanPrivateKey(privateKey);
        
        serviceAccount = {
          projectId: projectId,
          privateKey: privateKey,
          clientEmail: clientEmail,
        };
        console.log('✅ Loaded individual environment variables');
        console.log(`📝 Project: ${serviceAccount.projectId}`);
        console.log(`📝 Email: ${serviceAccount.clientEmail}`);
      }
    }
    
    if (!serviceAccount) {
      console.warn('⚠️ No service account found - Firebase is disabled');
      return false;
    }
    
    // Validate credentials
    if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
      throw new Error('Service account missing required fields');
    }
    
    console.log('📝 Initializing Firebase Admin SDK...');
    
    // Initialize with cert
    const credential = cert(serviceAccount);
    adminApp = initializeApp({
      credential: credential,
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.projectId}.firebaseio.com`,
    });
    
    console.log('✅ Firebase Admin initialized successfully');
    
    // Get Firestore
    db = getFirestore(adminApp);
    isFirebaseAvailable = true;
    console.log('✅ Firestore is ready');
    return true;
    
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    return false;
  }
}

// Run initialization
const success = initializeFirebase();
if (!success) {
  console.warn('⚠️ Firebase is disabled - using JSON file fallback');
}

module.exports = {
  admin: adminApp,
  db,
  isFirebaseAvailable,
};