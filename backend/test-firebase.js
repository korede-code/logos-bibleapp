const admin = require('firebase-admin');
const fs = require('fs');

console.log('Testing Firebase initialization...');

try {
  // Read the service account file
  const serviceAccount = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));
  
  console.log('✅ Service account loaded');
  console.log('📝 Project:', serviceAccount.project_id);
  console.log('📝 Email:', serviceAccount.client_email);
  
  // Try to initialize
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
  });
  
  console.log('✅ Firebase initialized successfully!');
  
  // Test Firestore
  const db = admin.firestore();
  console.log('✅ Firestore is ready');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}