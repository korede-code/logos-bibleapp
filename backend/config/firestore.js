// config/firestore.js
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

// Get Firestore from the initialized app
const db = getFirestore(admin.apps[0]);

module.exports = { db };