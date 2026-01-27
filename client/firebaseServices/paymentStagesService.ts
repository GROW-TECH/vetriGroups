import { db } from '../firebaseConfig';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

/* ================= TYPE ================= */

export interface PaymentStage {
  id?: string;
  clientId: string;
  name: string;
  percentage: number;
  amount: number;
  total: number;
  stageText: string; // formatted text
  isPaid: boolean;
  createdAt?: any;
  updatedAt?: any;
}

const COLLECTION_NAME = 'paymentStages';

/* ================= SERVICE ================= */

export class PaymentStagesService {
  /* ---------- Add ---------- */
  static async add(stage: Omit<PaymentStage, 'id'>): Promise<string> {
    try {
      const payload = {
        clientId: stage.clientId,
        name: stage.name,
        percentage: stage.percentage,
        amount: stage.amount,
        total: stage.total,
        stageText: stage.stageText,
        isPaid: stage.isPaid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, COLLECTION_NAME),
        payload
      );

      return docRef.id;
    } catch (error) {
      console.error('Error adding payment stage:', error);
      throw error;
    }
  }

  /* ---------- Get by Client ID ---------- */
  static async getByClientId(clientId: string): Promise<PaymentStage[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('clientId', '==', clientId)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as PaymentStage[];
    } catch (error) {
      console.error('Error fetching stages:', error);
      throw error;
    }
  }

  /* ---------- Update ---------- */
  static async update(id: string, updates: Partial<PaymentStage>) {
    try {
      const { id: _ignore, ...rest } = updates;

      const payload: any = {
        updatedAt: serverTimestamp(),
      };

      Object.keys(rest).forEach((key) => {
        const value = (rest as any)[key];
        if (value !== undefined) {
          payload[key] = value;
        }
      });

      await updateDoc(doc(db, COLLECTION_NAME, id), payload);
    } catch (error) {
      console.error('Error updating payment stage:', error);
      throw error;
    }
  }

  /* ---------- Delete ---------- */
  static async delete(id: string) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.error('Error deleting payment stage:', error);
      throw error;
    }
  }

  /* ---------- Realtime Listener ---------- */
  static onStagesChange(
    clientId: string,
    cb: (stages: PaymentStage[]) => void
  ) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('clientId', '==', clientId)
    );

    return onSnapshot(q, snap => {
      const stages = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as PaymentStage[];

      cb(stages);
    });
  }
}
