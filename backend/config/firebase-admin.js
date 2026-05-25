// backend/config/firebase-admin.js
const admin = require('firebase-admin');

// Path to your service account key file
// IMPORTANT: Add this file to .gitignore!
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };