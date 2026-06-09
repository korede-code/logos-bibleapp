// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
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
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

// Your Firebase configuration (replace with your actual values)
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

// ============ USER DATA FUNCTIONS ============

// Save user to Firestore (creates new user document)
export const saveUserToFirestore = async (user: User) => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    const now = new Date().toISOString();
    
    if (!userDoc.exists()) {
      // Create new user document
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isPro: false,
        createdAt: now,
        lastLoginAt: now,
      });
      console.log(`📝 New user created in Firestore: ${user.uid}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to save user to Firestore:', error);
    return { success: false, error };
  }
};

// Get user data from Firestore
export const getUserData = async (uid: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log(`📦 User data from Firestore for ${uid}: isPro = ${userData.isPro}`);
      return userData;
    }
    console.log(`📦 No user document found for ${uid}, creating one...`);
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Update user pro status in Firestore
export const updateUserProStatus = async (uid: string, isPro: boolean, expiryDate?: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      isPro: isPro,
      proExpiryDate: expiryDate || null,
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ User ${uid} pro status updated to ${isPro} in Firestore`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update pro status:', error);
    return { success: false, error: error.message };
  }
};

// Update last login time
export const updateLastLogin = async (uid: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      lastLoginAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to update last login:', error);
    return { success: false };
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
    
    console.log('Firebase: Google sign in success', user.email);
    return { success: true, user };
  } catch (error: any) {
    console.error('Firebase: Google sign in error:', error);
    let errorMessage = 'Failed to sign in with Google';
    if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Popup was blocked. Please allow popups for this site.';
    }
    return { success: false, error: errorMessage };
  }
};

// Sign up with email
export const signUpWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    // Save user to Firestore
    await saveUserToFirestore(result.user);
    console.log('Firebase: Email sign up success', result.user.email);
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error('Firebase: Email sign up error:', error);
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
    console.log('Firebase: Email sign in success', result.user.email);
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error('Firebase: Email sign in error:', error);
    let errorMessage = 'Failed to sign in';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password';
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
    return { success: false, error: error.message };
  }
};

// Sign out
export const logoutUser = async () => {
  try {
    await signOut(auth);
    console.log('Firebase: Sign out success');
    return { success: true };
  } catch (error: any) {
    console.error('Firebase: Sign out error:', error);
    return { success: false, error: error.message };
  }
};

// Get Firebase ID Token
export const getFirebaseToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await getIdToken(user);
  } catch (error) {
    return null;
  }
};

// Auth state listener
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    console.log('Firebase: Auth state changed', user?.email || 'No user');
    callback(user);
  });
};

// Get or create user document (ensures user exists in Firestore)
export const ensureUserDocument = async (user: User) => {
  const userData = await getUserData(user.uid);
  if (!userData) {
    await saveUserToFirestore(user);
  }
  return getUserData(user.uid);
};