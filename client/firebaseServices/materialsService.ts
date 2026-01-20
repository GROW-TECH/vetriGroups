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
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { Material } from '@/types';

// Firebase Materials Service
export class MaterialsService {
  private static COLLECTION_NAME = 'materials';

  // Get all materials (master list)
  static async getAll(): Promise<Material[]> {
    try {
      const q = query(collection(db, this.COLLECTION_NAME), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material));
    } catch (error) {
      console.error('Error fetching materials:', error);
      throw error;
    }
  }

  // Add new material (master list)
  static async add(material: Omit<Material, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...material,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding material:', error);
      throw error;
    }
  }

  // Update material
  static async update(id: string, updates: Partial<Material>): Promise<void> {
    try {
      const materialRef = doc(db, this.COLLECTION_NAME, id);
      await updateDoc(materialRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating material:', error);
      throw error;
    }
  }

  // Delete material
  static async delete(id: string): Promise<void> {
    try {
      const materialRef = doc(db, this.COLLECTION_NAME, id);
      await deleteDoc(materialRef);
    } catch (error) {
      console.error('Error deleting material:', error);
      throw error;
    }
  }

  // Real-time listener for materials
  static onMaterialsChange(callback: (materials: Material[]) => void) {
    const q = query(collection(db, this.COLLECTION_NAME), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const materials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material));
      callback(materials);
    });
  }
}
