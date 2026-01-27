// D:\projects\vetri_updated\client\firebaseServices\transactionsService.ts

import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Transaction } from '@/types';

const COLLECTION_NAME = 'transactions';

export class TransactionsService {
  /**
   * Get all transactions
   */
  static async getAll(): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  /**
   * Get transactions by client ID
   */
  static async getByClientId(clientId: string): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('clientId', '==', clientId),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];
    } catch (error) {
      console.error('Error getting transactions by client:', error);
      throw error;
    }
  }

  /**
   * Get transactions by stage ID
   */
  static async getByStageId(stageId: string): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('stageId', '==', stageId),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];
    } catch (error) {
      console.error('Error getting transactions by stage:', error);
      throw error;
    }
  }

  /**
   * Add a new transaction
   */
  static async add(transaction: Transaction): Promise<string> {
    try {
      const transactionRef = doc(db, COLLECTION_NAME, transaction.id);
      await setDoc(transactionRef, {
        ...transaction,
        createdAt: new Date().toISOString(),
      });
      return transaction.id;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }

  /**
   * Real-time listener for transactions
   */
  static onTransactionsChange(callback: (transactions: Transaction[]) => void): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('date', 'desc')
    );
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];
        callback(transactions);
      },
      (error) => {
        console.error('Error in transactions listener:', error);
      }
    );

    return unsubscribe;
  }

  /**
   * Get total transactions amount for a client
   */
  static async getTotalByClientId(clientId: string): Promise<number> {
    try {
      const transactions = await this.getByClientId(clientId);
      return transactions.reduce((sum, t) => sum + t.amount, 0);
    } catch (error) {
      console.error('Error calculating total transactions:', error);
      throw error;
    }
  }
}