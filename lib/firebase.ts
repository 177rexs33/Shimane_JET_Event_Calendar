
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { 
  getAuth,
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut, 
  setPersistence,
  browserLocalPersistence,
  signInAnonymously
} from "firebase/auth";
import { 
  getFirestore,
  collection, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp,
  setDoc,
  increment
} from "firebase/firestore";
import { CalendarEvent } from "../types";
import { restoreAnonymousUser } from "./authBackup";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCw9kIH7GR5UaBS94tzP2ckNVS_yFtzJUg",
  authDomain: "ajet-cal-data.firebaseapp.com",
  projectId: "ajet-cal-data",
  storageBucket: "ajet-cal-data.firebasestorage.app",
  messagingSenderId: "306073746994",
  appId: "1:306073746994:web:7e5baa37e7257609f0062b"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('6LcugZ0sAAAAAFAcvguM11ZgJdC_nix7qrqGl7-e'),
    isTokenAutoRefreshEnabled: true
  });
} else {
  app = getApp();
}

// Initialize Auth with browser local persistence
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((error) => {
  if (error.code !== 'auth/already-initialized') {
    console.error("Persistence error:", error);
  }
});

export const db = getFirestore(app);

let isAuthenticating = false;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const visitorRef = doc(db, 'visitors', user.uid);
      await setDoc(visitorRef, {
        lastVisit: serverTimestamp(),
        visitCount: increment(1)
      }, { merge: true });
    } catch (err) {
      console.error("Error tracking visitor:", err);
    }
  } else {
    if (isAuthenticating) return;
    isAuthenticating = true;
    try {
      const restored = await restoreAnonymousUser();
      if (restored && !sessionStorage.getItem('auth_restored')) {
        sessionStorage.setItem('auth_restored', 'true');
        // If restored, we need to reload the page so Firebase Auth picks it up
        window.location.reload();
        return;
      }
      sessionStorage.removeItem('auth_restored');
      await signInAnonymously(auth);
    } catch (err) {
      console.error("Error signing in anonymously:", err);
    } finally {
      isAuthenticating = false;
    }
  }
});

export { signInWithEmailAndPassword, onAuthStateChanged, signOut };

// Route new events based on status
export const addEvent = async (event: Omit<CalendarEvent, 'id'>) => {
  try {
    const uid = auth.currentUser?.uid;

    if (event.status === 'pending') {
        const docRef = await addDoc(collection(db, "pending_events"), {
            ...event,
            userUid: uid,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } else {
        const docRef = await addDoc(collection(db, "events"), {
            ...event,
            userUid: uid
        });
        return docRef.id;
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, event.status === 'pending' ? 'pending_events' : 'events');
  }
};

// Get approved events from 'events' collection
export const getEvents = (onUpdate: (events: CalendarEvent[]) => void) => {
  const q = query(collection(db, "events"), where("status", "==", "approved"));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const events: CalendarEvent[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Explicitly set the ID from the document ID
      events.push({ ...data, id: doc.id } as CalendarEvent);
    });
    onUpdate(events);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "events");
  });
  return unsubscribe;
};

// Get pending NEW events from 'pending_events'
export const getPendingEvents = (onUpdate: (events: CalendarEvent[]) => void) => {
  const q = query(collection(db, "pending_events"), where("status", "==", "pending"));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const events: CalendarEvent[] = [];
    snapshot.forEach((doc) => {
      events.push({ ...doc.data(), id: doc.id } as CalendarEvent);
    });
    onUpdate(events);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "pending_events");
  });
  return unsubscribe;
};

// Get edited events from 'pending_events'
export const getEditedEvents = (onUpdate: (events: CalendarEvent[]) => void) => {
  const q = query(collection(db, "pending_events"), where("status", "==", "edited"));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const events: CalendarEvent[] = [];
    snapshot.forEach((doc) => {
      events.push({ ...doc.data(), id: doc.id } as CalendarEvent);
    });
    onUpdate(events);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "pending_events");
  });
  return unsubscribe;
};

// Get rejected events from 'rejected_events'
export const getRejectedEvents = (onUpdate: (events: CalendarEvent[]) => void) => {
  const q = query(collection(db, "rejected_events"));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const events: CalendarEvent[] = [];
    snapshot.forEach((doc) => {
      events.push({ ...doc.data(), id: doc.id } as CalendarEvent);
    });
    onUpdate(events);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "rejected_events");
  });
  return unsubscribe;
};

// Get deleted events from 'deleted_events'
export const getDeletedEvents = (onUpdate: (events: CalendarEvent[]) => void) => {
  const q = query(collection(db, "deleted_events"));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const events: CalendarEvent[] = [];
    snapshot.forEach((doc) => {
      events.push({ ...doc.data(), id: doc.id } as CalendarEvent);
    });
    onUpdate(events);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "deleted_events");
  });
  return unsubscribe;
};

export const getVisitorCount = (onUpdate: (count: number) => void) => {
  const q = query(collection(db, "visitors"));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    onUpdate(snapshot.size);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "visitors");
  });
  return unsubscribe;
};

export const updateEvent = async (event: CalendarEvent) => {
  try {
    const uid = auth.currentUser?.uid;

    if (event.status === 'edited') {
        const { id, ...data } = event;
        await addDoc(collection(db, "pending_events"), {
            ...data,
            originalId: id,
            userUid: uid,
            createdAt: serverTimestamp()
        });
    } else {
        const { id, ...eventData } = event;
        const eventRef = doc(db, "events", id);
        await updateDoc(eventRef, {
            ...eventData,
            adminUid: uid // If an admin updates directly
        } as any);
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.UPDATE, event.status === 'edited' ? 'pending_events' : `events/${event.id}`);
  }
};

export const approvePendingEvent = async (event: CalendarEvent) => {
    try {
        const { id, ...data } = event;
        const adminUid = auth.currentUser?.uid;
        await addDoc(collection(db, "events"), {
            ...data,
            status: 'approved',
            adminUid: adminUid,
            approvedAt: serverTimestamp()
        });
        await deleteDoc(doc(db, "pending_events", id));
    } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `pending_events/${event.id}`);
    }
};

export const approveEditedEvent = async (event: CalendarEvent) => {
    try {
        const { id, originalId, originalData, createdAt, ...newData } = event as any;
        if (!originalId) throw new Error("Missing originalId for edited event");

        const adminUid = auth.currentUser?.uid;
        const eventRef = doc(db, "events", originalId);
        await setDoc(eventRef, {
            ...newData,
            status: 'approved',
            adminUid: adminUid,
            approvedAt: serverTimestamp()
        });
        await deleteDoc(doc(db, "pending_events", id));
    } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `pending_events/${event.id}`);
    }
};

export const rejectRequest = async (event: CalendarEvent) => {
    try {
        const { id, ...data } = event;
        const adminUid = auth.currentUser?.uid;
        await addDoc(collection(db, "rejected_events"), {
            ...data,
            status: 'rejected',
            adminUid: adminUid,
            rejectedAt: serverTimestamp()
        });
        await deleteDoc(doc(db, "pending_events", id));
    } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `pending_events/${event.id}`);
    }
};

export const restoreRejectedEvent = async (event: CalendarEvent) => {
    try {
        const { id, ...data } = event;
        const adminUid = auth.currentUser?.uid;
        await addDoc(collection(db, "pending_events"), {
            ...data,
            status: event.originalData ? 'edited' : 'pending',
            restoredByAdminUid: adminUid,
            restoredAt: serverTimestamp()
        });
        await deleteDoc(doc(db, "rejected_events", id));
    } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `rejected_events/${event.id}`);
    }
};

export const softDeleteEvent = async (event: CalendarEvent) => {
  try {
    const { id, ...data } = event;
    const adminUid = auth.currentUser?.uid;
    // 1. Add to deleted_events collection
    await addDoc(collection(db, "deleted_events"), {
        ...data,
        originalId: id,
        adminUid: adminUid,
        deletedAt: serverTimestamp(),
        status: 'deleted'
    });
    // 2. Remove from active events collection
    await deleteDoc(doc(db, "events", id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `events/${event.id}`);
  }
};

export const restoreDeletedEvent = async (event: CalendarEvent) => {
  try {
    const { id, originalId, deletedAt, ...data } = event as any;
    const adminUid = auth.currentUser?.uid;
    
    // We need to restore it to the events collection
    await addDoc(collection(db, "events"), {
        ...data,
        status: 'approved',
        restoredByAdminUid: adminUid,
        restoredAt: serverTimestamp()
    });
    
    // Remove from deleted_events
    await deleteDoc(doc(db, "deleted_events", id));
  } catch (e) {
    handleFirestoreError(e, OperationType.UPDATE, `deleted_events/${event.id}`);
  }
};

export const hardDeleteEvent = async (eventId: string) => {
  try {
    await deleteDoc(doc(db, "deleted_events", eventId));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `deleted_events/${eventId}`);
  }
};

export const hardDeleteRejectedEvent = async (eventId: string) => {
  try {
    await deleteDoc(doc(db, "rejected_events", eventId));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `rejected_events/${eventId}`);
  }
};