// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  getIdToken
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc
} from 'firebase/firestore';

// Your Firebase configuration (REPLACE WITH YOUR ACTUAL CONFIG)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// User data interface
export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isPro: boolean;
  createdAt: string;
  lastLoginAt: string;
  readingStreak?: number;
  totalVersesHighlighted?: number;
  totalNotes?: number;
}

// Add this function to get Firebase ID token
export const getFirebaseToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await getIdToken(user);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};


// ============ AUTH FUNCTIONS ============

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Save or update user in Firestore
    await saveUserToFirestore(user);
    
    return { success: true, user };
  } catch (error: any) {
    console.error('Google sign in error:', error);
    let errorMessage = 'Failed to sign in with Google';
    
    if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Popup was blocked. Please allow popups for this site.';
    } else if (error.code === 'auth/cancelled-popup-request') {
      errorMessage = 'Sign in cancelled.';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Sign up with email
export const signUpWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with display name
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    
    // Save user to Firestore
    await saveUserToFirestore(result.user);
    
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error('Email sign up error:', error);
    let errorMessage = 'Failed to create account';
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Email already in use';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password should be at least 6 characters';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Sign in with email
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await updateLastLogin(result.user.uid);
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error('Email sign in error:', error);
    let errorMessage = 'Failed to sign in';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email format';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Reset password
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    console.error('Password reset error:', error);
    let errorMessage = 'Failed to send reset email';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Sign out
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
};

// ============ FIRESTORE FUNCTIONS ============

// Save user to Firestore
const saveUserToFirestore = async (user: User) => {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);
  
  const now = new Date().toISOString();
  
  if (!userDoc.exists()) {
    // New user - create document
    const userData: UserData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isPro: false,
      createdAt: now,
      lastLoginAt: now,
      readingStreak: 0,
      totalVersesHighlighted: 0,
      totalNotes: 0
    };
    await setDoc(userRef, userData);
  } else {
    // Existing user - update last login
    await setDoc(userRef, {
      lastLoginAt: now
    }, { merge: true });
  }
};

// Update last login timestamp
const updateLastLogin = async (uid: string) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    lastLoginAt: new Date().toISOString()
  }, { merge: true });
};

// Get user data
export const getUserData = async (uid: string): Promise<UserData | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    return userDoc.exists() ? userDoc.data() as UserData : null;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
};

// Update user pro status - FIXED: uses setDoc with merge
export const updateUserProStatus = async (uid: string, isPro: boolean, expiryDate?: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      isPro,
      proExpiryDate: expiryDate || null,
      updatedAt: new Date().toISOString()
    }, { merge: true }); // This creates the document if it doesn't exist
    return { success: true };
  } catch (error) {
    console.error('Failed to update pro status:', error);
    return { success: false, error };
  }
};

// Update user stats - FIXED: uses setDoc with merge
export const updateUserStats = async (uid: string, updates: Partial<UserData>) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, updates, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Failed to update user stats:', error);
    return { success: false, error };
  }
};

// Function to set pro status (call from backend)
export const setUserProStatusBackend = async (uid: string, isPro: boolean) => {
  const token = await getFirebaseToken();
  if (!token) throw new Error('Not authenticated');
  
  const response = await fetch('http://localhost:3000/api/users/set-pro-status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ uid, isPro })
  });
  
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  
  // Refresh user token to get new claims
  await auth.currentUser?.getIdToken(true);
  
  return data;
};

// Get user data with pro status
export const getUserDataWithClaims = async (uid: string) => {
  const token = await getFirebaseToken();
  if (!token) throw new Error('Not authenticated');
  
  const response = await fetch(`http://localhost:3000/api/users/user/${uid}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};

// Auth state listener hook helper
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};