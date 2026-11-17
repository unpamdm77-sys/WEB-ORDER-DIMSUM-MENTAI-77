import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
] as const;

const app = initializeApp(firebaseConfig);
const firestoreDatabaseId = (
  firebaseConfig as { firestoreDatabaseId?: string }
).firestoreDatabaseId;
export const db = firestoreDatabaseId
  ? getFirestore(app, firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
for (const scope of DRIVE_SCOPES) {
  googleProvider.addScope(scope);
}
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory cache ONLY for Google Drive OAuth access token (never stored in localStorage/sessionStorage)
let cachedDriveAccessToken: string | null = null;
let isSigningIn = false;

export function setDriveAccessToken(token: string | null) {
  cachedDriveAccessToken = token;
}

export function getDriveAccessToken(): string | null {
  return cachedDriveAccessToken;
}

export function clearDriveAccessToken() {
  cachedDriveAccessToken = null;
}

export function captureDriveTokenFromResult(
  result: Awaited<ReturnType<typeof signInWithPopup>> | null
): string | null {
  if (!result) return null;
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) {
    cachedDriveAccessToken = credential.accessToken;
    return credential.accessToken;
  }
  return null;
}

export function initDriveAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthCleared?: () => void
) {
  return onAuthStateChanged(auth, (user) => {
    if (user && cachedDriveAccessToken) {
      onAuthSuccess?.(user, cachedDriveAccessToken);
    } else if (!user && !isSigningIn) {
      cachedDriveAccessToken = null;
      onAuthCleared?.();
    } else if (user && !cachedDriveAccessToken && !isSigningIn) {
      onAuthCleared?.();
    }
  });
}

export async function signInWithGoogleDrive(): Promise<{
  user: User;
  accessToken: string;
}> {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const accessToken = captureDriveTokenFromResult(result);
    if (!accessToken) {
      throw new Error('Gagal mendapatkan token akses Google Drive dari Google Sign-In.');
    }
    return { user: result.user, accessToken };
  } finally {
    isSigningIn = false;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const OWNER_EMAIL = 'unpam.dm77@gmail.com';
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    return true;
  }
}
