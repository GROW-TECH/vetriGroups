import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { MaterialOrder } from '@/types';

const COLLECTION_NAME = 'materialOrders';

export class MaterialOrdersService {
  /**
   * Add a new material order to Firestore
   */
  static async add(order: Omit<MaterialOrder, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...order,
        createdAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding material order:', error);
      throw error;
    }
  }

  /**
   * Update an existing material order
   */
  static async update(
    id: string,
    data: Partial<Omit<MaterialOrder, 'id'>>
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating material order:', error);
      throw error;
    }
  }

  /**
   * Delete a material order
   */
  static async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting material order:', error);
      throw error;
    }
  }

  /**
   * Get all material orders (one-time fetch)
   */
  static async getAll(): Promise<MaterialOrder[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as MaterialOrder[];
    } catch (error) {
      console.error('Error getting material orders:', error);
      throw error;
    }
  }

  /**
   * Listen to real-time updates for material orders
   */
  static onMaterialOrdersChange(
    callback: (orders: MaterialOrder[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('date', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        querySnapshot => {
          const orders = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as MaterialOrder[];
          callback(orders);
        },
        error => {
          console.error('Error listening to material orders:', error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up material orders listener:', error);
      throw error;
    }
  }

  /**
   * Get material orders by client ID
   */
  static async getByClientId(clientId: string): Promise<MaterialOrder[]> {
    try {
      const allOrders = await this.getAll();
      return allOrders.filter(order => order.clientId === clientId);
    } catch (error) {
      console.error('Error getting material orders by client:', error);
      throw error;
    }
  }

  /**
   * Get material orders by vendor/supplier ID
   */
  static async getBySupplierId(supplierId: string): Promise<MaterialOrder[]> {
    try {
      const allOrders = await this.getAll();
      return allOrders.filter(order => order.supplierId === supplierId);
    } catch (error) {
      console.error('Error getting material orders by supplier:', error);
      throw error;
    }
  }

  /**
   * Get material orders by material ID
   */
  static async getByMaterialId(materialId: string): Promise<MaterialOrder[]> {
    try {
      const allOrders = await this.getAll();
      return allOrders.filter(order => order.materialId === materialId);
    } catch (error) {
      console.error('Error getting material orders by material:', error);
      throw error;
    }
  }

  /**
   * Get pending payment orders
   */
  static async getPendingOrders(): Promise<MaterialOrder[]> {
    try {
      const allOrders = await this.getAll();
      return allOrders.filter(order => order.paymentStatus === 'pending');
    } catch (error) {
      console.error('Error getting pending orders:', error);
      throw error;
    }
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(
    id: string,
    paymentStatus: 'paid' | 'pending',
    paymentDetails?: {
      paymentMethod?: string;
      transactionId?: string;
    }
  ): Promise<void> {
    try {
      const updateData: any = {
        paymentStatus,
        updatedAt: Timestamp.now(),
      };

      if (paymentDetails) {
        if (paymentDetails.paymentMethod) {
          updateData.paymentMethod = paymentDetails.paymentMethod;
        }
        if (paymentDetails.transactionId) {
          updateData.transactionId = paymentDetails.transactionId;
        }
      }

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  /**
   * Update stock level
   */
  static async updateStock(id: string, stock: number): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        stock,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  }
}