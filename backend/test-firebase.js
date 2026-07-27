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





---------server.js--------
// Test endpoint - Manual set Pro
app.post('/api/payments/test-set-pro', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }
    
    const userData = {
      isPro: true,
      proSince: new Date().toISOString(),
      test: true,
      updatedAt: new Date().toISOString()
    };
    
    await saveUserData(userId, userData);
    console.log('✅ Pro status manually set for:', userId);
    
    res.json({ success: true, isPro: true, userId });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint - List all users
app.get('/api/debug/all-users', async (req, res) => {
  try {
    if (isFirebaseAvailable && db) {
      const snapshot = await db.collection('users').get();
      const users = [];
      snapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
      });
      res.json({ 
        success: true, 
        source: 'Firebase',
        count: users.length,
        users: users
      });
    } else {
      const data = readUsers();
      res.json({ 
        success: true, 
        source: 'JSON file',
        count: Object.keys(data.users).length,
        users: data.users
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test Firebase connection
app.get('/api/test-firebase', async (req, res) => {
  try {
    if (!isFirebaseAvailable || !db) {
      return res.json({ 
        success: false, 
        error: 'Firebase is not initialized',
        isFirebaseAvailable: isFirebaseAvailable,
        dbExists: !!db
      });
    }
    
    const testId = 'test_' + Date.now();
    await db.collection('test').doc(testId).set({
      test: true,
      timestamp: new Date().toISOString()
    });
    
    const doc = await db.collection('test').doc(testId).get();
    const data = doc.data();
    
    res.json({ 
      success: true, 
      message: 'Firebase is working!',
      data: data
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});