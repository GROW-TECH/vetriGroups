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
import { Employee } from '@/types';

export class EmployeesService {
  private static COLLECTION_NAME = 'employees';

  static async getAll(): Promise<Employee[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(
        (docSnap) => ({
          id: docSnap.id,
          name: docSnap.data().name || '',
          email: docSnap.data().email || '',
          phone: docSnap.data().phone || '',
          address: docSnap.data().address || '',
          role: docSnap.data().role || 'labor',
          salary: docSnap.data().salary || 0,
          profileImage: docSnap.data().profileImage || null,
          faceImage: docSnap.data().faceImage || null,
          faceEnrolled: docSnap.data().faceEnrolled || false,
          fingerprintEnrolled: docSnap.data().fingerprintEnrolled || false,
          createdAt: docSnap.data().createdAt?.toDate() || new Date(),
          updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
        } as Employee)
      );
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  }

  static async add(employee: Omit<Employee, 'id'>): Promise<string> {
    try {
      const employeeData = {
        name: employee.name,
        email: employee.email || '',
        phone: employee.phone || '',
        address: employee.address || '',
        role: employee.role,
        salary: employee.salary || 0,
        profileImage: employee.profileImage || null,
        faceImage: employee.faceImage || null,
        faceEnrolled: employee.faceEnrolled || false,
        fingerprintEnrolled: employee.fingerprintEnrolled || false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log('➕ Adding employee to Firestore:', employeeData);

      const docRef = await addDoc(
        collection(db, this.COLLECTION_NAME),
        employeeData
      );

      console.log('✅ Employee added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding employee:', error);
      throw error;
    }
  }

  static async update(
    id: string,
    updates: Partial<Employee>
  ): Promise<void> {
    try {
      const ref = doc(db, this.COLLECTION_NAME, id);

      await updateDoc(ref, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      
      console.log('✅ Employee updated:', id, updates);
    } catch (error) {
      console.error('❌ Error updating employee:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const ref = doc(db, this.COLLECTION_NAME, id);
      await deleteDoc(ref);
      console.log('🗑️ Employee deleted:', id);
    } catch (error) {
      console.error('❌ Error deleting employee:', error);
      throw error;
    }
  }

  static onEmployeesChange(
    callback: (employees: Employee[]) => void
  ) {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const employees = snapshot.docs.map(
        (docSnap) => ({
          id: docSnap.id,
          name: docSnap.data().name || '',
          email: docSnap.data().email || '',
          phone: docSnap.data().phone || '',
          address: docSnap.data().address || '',
          role: docSnap.data().role || 'labor',
          salary: docSnap.data().salary || 0,
          profileImage: docSnap.data().profileImage || null,
          faceImage: docSnap.data().faceImage || null,
          faceEnrolled: docSnap.data().faceEnrolled || false,
          fingerprintEnrolled: docSnap.data().fingerprintEnrolled || false,
          createdAt: docSnap.data().createdAt?.toDate() || new Date(),
          updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
        } as Employee)
      );

      console.log('📡 Employees updated, count:', employees.length);
      callback(employees);
    }, (error) => {
      console.error('❌ Error in employees listener:', error);
    });
  }

  // Helper to get employee by ID
  static async getById(id: string): Promise<Employee | null> {
    try {
      const snapshot = await getDocs(collection(db, this.COLLECTION_NAME));
      const doc = snapshot.docs.find(d => d.id === id);
      
      if (!doc) return null;
      
      return {
        id: doc.id,
        name: doc.data().name || '',
        email: doc.data().email || '',
        phone: doc.data().phone || '',
        address: doc.data().address || '',
        role: doc.data().role || 'labor',
        salary: doc.data().salary || 0,
        profileImage: doc.data().profileImage || null,
        faceImage: doc.data().faceImage || null,
        faceEnrolled: doc.data().faceEnrolled || false,
        fingerprintEnrolled: doc.data().fingerprintEnrolled || false,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      } as Employee;
    } catch (error) {
      console.error('❌ Error getting employee by ID:', error);
      return null;
    }
  }
}