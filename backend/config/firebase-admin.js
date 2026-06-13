// backend/config/firebase-admin.js
// Simple fallback - store Pro status in a local file instead of Firestore
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'users.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize empty data if file doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {} }), 'utf8');
}

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { users: {} };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Simple Firestore-like API
const db = {
  collection: (name) => ({
    doc: (id) => ({
      get: async () => {
        const data = readData();
        const user = data.users[id];
        return {
          exists: !!user,
          data: () => user || null,
        };
      },
      set: async (newData, options = {}) => {
        const data = readData();
        if (options.merge) {
          data.users[id] = { ...data.users[id], ...newData };
        } else {
          data.users[id] = newData;
        }
        writeData(data);
      },
      update: async (updates) => {
        const data = readData();
        data.users[id] = { ...data.users[id], ...updates };
        writeData(data);
      },
    }),
  }),
};

const auth = {
  // Basic auth placeholder
};

const admin = {
  firestore: () => db,
  auth: () => auth,
};

console.log('✅ Local storage initialized (Firebase Admin not configured)');

module.exports = { admin, db, auth };