import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const setUserProStatus = async (userId: string, isPro: boolean) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isPro: isPro,
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ User ${userId} pro status set to ${isPro} in Firestore`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update pro status:', error);
    return { success: false, error };
  }
};