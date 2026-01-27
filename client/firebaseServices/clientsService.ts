import { db } from '../firebaseConfig';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { Client } from '@/types';

// Firebase Clients Service
export class ClientsService {
  private static COLLECTION_NAME = 'clients';

  // Get all clients
  static async getAll(): Promise<Client[]> {
    try {
      const q = query(collection(db, this.COLLECTION_NAME), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
  }

  // Add new client
  static async add(client: Omit<Client, 'id'>): Promise<string> {
    try {
      const clientData: any = {
        name: client.name,
        projectName: client.projectName,
        status: client.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add optional fields only if non-empty strings (Firestore rejects undefined)
      if (typeof client.ownerPhone === 'string' && client.ownerPhone.trim().length > 0) {
        clientData.ownerPhone = client.ownerPhone.trim();
      }
      if (typeof client.location === 'string' && client.location.trim().length > 0) {
        clientData.location = client.location.trim();
      }
      if (typeof client.username === 'string' && client.username.trim().length > 0) {
        clientData.username = client.username.trim();
      }
      if (typeof client.password === 'string' && client.password.trim().length > 0) {
        clientData.password = client.password;
      }

      // Only add totalAmount if it exists and is a valid number
      if (client.totalAmount !== undefined && typeof client.totalAmount === 'number') {
        clientData.totalAmount = client.totalAmount;
      }

      // Remove any accidentally undefined keys
      Object.keys(clientData).forEach((k) => {
        if (clientData[k] === undefined) {
          delete clientData[k];
        }
      });
      // Debug payload removed to reduce console noise during add
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), clientData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding client:', error);
      throw error;
    }
  }

  // Update client
  static async update(id: string, updates: Partial<Client>): Promise<void> {
    try {
      const clientRef = doc(db, this.COLLECTION_NAME, id);
      // Filter out undefined values and id field
      const { id: _ignore, ...rest } = updates as any;
      const sanitized: any = { updatedAt: serverTimestamp() };
      Object.keys(rest).forEach((key) => {
        const value = (rest as any)[key];
        if (value !== undefined) {
          sanitized[key] = value;
        }
      });
      await updateDoc(clientRef, sanitized);
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  // Delete client
  static async delete(id: string): Promise<void> {
    try {
      const clientRef = doc(db, this.COLLECTION_NAME, id);
      await deleteDoc(clientRef);
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }

  // Get client by ID
  static async getById(id: string): Promise<Client | null> {
    try {
      const clientRef = doc(db, this.COLLECTION_NAME, id);
      const clientDoc = await getDoc(clientRef);
      if (clientDoc.exists()) {
        return { id: clientDoc.id, ...clientDoc.data() } as Client;
      }
      return null;
    } catch (error) {
      console.error('Error fetching client:', error);
      throw error;
    }
  }

  // Real-time listener for clients
  static onClientsChange(callback: (clients: Client[]) => void) {
    const q = query(collection(db, this.COLLECTION_NAME), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      callback(clients);
    });
  }
}
