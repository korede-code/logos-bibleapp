// backend/test-firebase.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Firebase Admin SDK...');
console.log('📂 Current directory:', __dirname);

try {
  // Check if admin module loaded
  console.log('📝 admin loaded:', !!admin);
  console.log('📝 admin.credential:', !!admin.credential);
  console.log('📝 admin.credential.cert:', typeof admin.credential.cert);
  console.log('📝 admin.apps:', admin.apps);
  
  // Check if service-account.json exists
  const serviceAccountPath = path.join(__dirname, 'service-account.json');
  console.log('📝 Looking for service account at:', serviceAccountPath);
  
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Service account file not found!');
    console.log('📝 Please create service-account.json in the backend folder');
    process.exit(1);
  }
  
  console.log('✅ Service account file found');
  
  // Read and parse service account
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  console.log('✅ Service account loaded successfully');
  console.log('📝 Project ID:', serviceAccount.project_id);
  console.log('📝 Client Email:', serviceAccount.client_email);
  
  // Initialize Firebase Admin
  console.log('📝 Initializing Firebase...');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}.firebaseio.com`,
  });
  
  console.log('✅ Firebase initialized successfully!');
  
  // Test Firestore
  const db = admin.firestore();
  console.log('✅ Firestore is ready');
  console.log('📝 Firestore connected to:', db._databaseId);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('📝 Stack:', error.stack);
}