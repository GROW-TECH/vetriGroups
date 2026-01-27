import { db, auth, storage } from '../firebaseConfig';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Employee } from '@/types';

// Firebase Employees Service
export class EmployeesService {
  private static COLLECTION_NAME = 'employees';

  // Get all employees
  static async getAll(): Promise<Employee[]> {
    try {
      const q = query(collection(db, this.COLLECTION_NAME), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  }

  // Add new employee
  static async add(employee: Omit<Employee, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...employee,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  }

  // Update employee
  static async update(id: string, updates: Partial<Employee>): Promise<void> {
    try {
      const employeeRef = doc(db, this.COLLECTION_NAME, id);
      await updateDoc(employeeRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  }

  // Delete employee
  static async delete(id: string): Promise<void> {
    try {
      const employeeRef = doc(db, this.COLLECTION_NAME, id);
      await deleteDoc(employeeRef);
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }

  // Upload employee face image to Firebase Storage
  static async uploadFaceImage(employeeId: string, imageUri: string): Promise<string> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const filename = `employees/${employeeId}/face-${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error uploading face image:', error);
      throw error;
    }
  }

  // Real-time listener for employees
  static onEmployeesChange(callback: (employees: Employee[]) => void) {
    const q = query(collection(db, this.COLLECTION_NAME), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      callback(employees);
    });
  }
}
