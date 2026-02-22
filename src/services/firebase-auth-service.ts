import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getRuntimeEnv } from '../config/env';
import type { User } from '../types/entities';
import { getFirebaseAuth, getFirebaseDb } from './firebase';

function nowIso(): string {
  return new Date().toISOString();
}

export class FirebaseAuthService {
  async me(): Promise<User> {
    const env = getRuntimeEnv();
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();

    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const current = auth.currentUser;
    if (!current) {
      throw new Error('No authenticated Firebase user');
    }

    const userRef = doc(db, 'User', current.uid);
    const existing = await getDoc(userRef);

    if (existing.exists()) {
      const data = existing.data() as Omit<User, 'id'>;
      return { id: current.uid, ...data };
    }

    const role = env.VITE_DEFAULT_USER_ROLE ?? 'admin';
    const user: Omit<User, 'id'> = {
      email: current.email ?? `${current.uid}@local.firebase`,
      full_name: 'Firebase User',
      role,
      created_date: nowIso(),
      updated_date: nowIso(),
      created_by: current.uid,
      created_by_id: current.uid
    };

    await setDoc(userRef, user);
    return { id: current.uid, ...user };
  }
}
