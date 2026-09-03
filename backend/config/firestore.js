// config/firestore.js
const { db, isFirebaseAvailable } = require('./config/firebase-admin');

// Use db directly
if (isFirebaseAvailable && db) {
  const snapshot = await db.collection('users').get();
  // ...
}
