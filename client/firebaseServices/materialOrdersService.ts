import { db } from '../firebaseConfig';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { MaterialOrder } from '@/types';

export class MaterialOrdersService {
  private static COLLECTION_NAME = 'materialOrders';

  static async getAll(): Promise<MaterialOrder[]> {
    try {
      const q = query(collection(db, this.COLLECTION_NAME), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MaterialOrder));
    } catch (error) {
      console.error('Error fetching material orders:', error);
      throw error;
    }
  }

  static async add(order: Omit<MaterialOrder, 'id'>): Promise<string> {
    try {
      const payload: any = {
        ...order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), payload);
      return docRef.id;
    } catch (error) {
      console.error('Error adding material order:', error);
      throw error;
    }
  }

  static async update(id: string, updates: Partial<MaterialOrder>): Promise<void> {
    try {
      const ref = doc(db, this.COLLECTION_NAME, id);
      await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
    } catch (error) {
      console.error('Error updating material order:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const ref = doc(db, this.COLLECTION_NAME, id);
      await deleteDoc(ref);
    } catch (error) {
      console.error('Error deleting material order:', error);
      throw error;
    }
  }

  static onChange(callback: (orders: MaterialOrder[]) => void) {
    const q = query(collection(db, this.COLLECTION_NAME), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MaterialOrder));
      callback(orders);
    });
  }
}
