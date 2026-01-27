import { db } from '../firebaseConfig';
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
  setDoc
} from 'firebase/firestore';
import { Employee } from '@/types';

export class EmployeesService {
  private static COLLECTION_NAME = 'employees';

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

  static async add(employee: Omit<Employee, 'id'>): Promise<string> {
    console.log('🔥🔥🔥 EMPLOYEESSERVICE.ADD CALLED 🔥🔥🔥');
    console.log('Received employee:', JSON.stringify(employee, null, 2));
    
    try {
      const newDocRef = doc(collection(db, this.COLLECTION_NAME));
      const now = new Date().toISOString();

      // Build data object explicitly
      const data: Record<string, any> = {
        name: employee.name,
        role: employee.role,
        phone: employee.phone || '',
        address: employee.address || '',
        salary: employee.salary,
        age: employee.age || 25,
        
        // CRITICAL: Use empty string, NOT null
        aadhaarNo: employee.aadhaarNo || '',
        username: employee.username || '',
        password: employee.password || '',
        
        faceImage: employee.faceImage || '',
        faceEnrolled: employee.faceEnrolled || false,
        fingerprintEnrolled: employee.fingerprintEnrolled || false,
        
        createdAt: now,
        updatedAt: now,
      };

      console.log('🔥 SENDING TO FIRESTORE:', JSON.stringify(data, null, 2));
      console.log('🔥 Keys:', Object.keys(data));

      await setDoc(newDocRef, data);

      console.log('✅ Saved! Document ID:', newDocRef.id);
      
      // Verify what was saved
      const savedDoc = await getDoc(newDocRef);
      if (savedDoc.exists()) {
        console.log('✅ VERIFIED IN FIRESTORE:', JSON.stringify(savedDoc.data(), null, 2));
      }

      return newDocRef.id;
    } catch (error) {
      console.error('❌ ERROR:', error);
      throw error;
    }
  }

  static async update(id: string, updates: Partial<Employee>): Promise<void> {
    try {
      const employeeRef = doc(db, this.COLLECTION_NAME, id);
      const updateData: any = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(employeeRef, updateData);
      console.log('✅ Updated:', id);
    } catch (error) {
      console.error('❌ Error updating:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION_NAME, id));
      console.log('✅ Deleted:', id);
    } catch (error) {
      console.error('❌ Error deleting:', error);
      throw error;
    }
  }

  static async getById(id: string): Promise<Employee | null> {
    try {
      const docSnap = await getDoc(doc(db, this.COLLECTION_NAME, id));
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Employee : null;
    } catch (error) {
      console.error('❌ Error fetching by ID:', error);
      throw error;
    }
  }

  static async getByAadhaar(aadhaarNo: string): Promise<Employee | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME), 
        where('aadhaarNo', '==', aadhaarNo.replace(/\s/g, ''))
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Employee;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching by Aadhaar:', error);
      throw error;
    }
  }

  static async isAadhaarExists(aadhaarNo: string, excludeId?: string): Promise<boolean> {
    try {
      if (!aadhaarNo || aadhaarNo.trim() === '') {
        return false;
      }

      const q = query(
        collection(db, this.COLLECTION_NAME), 
        where('aadhaarNo', '==', aadhaarNo.replace(/\s/g, ''))
      );
      const querySnapshot = await getDocs(q);
      
      if (excludeId && !querySnapshot.empty) {
        return querySnapshot.docs[0].id !== excludeId;
      }
      
      return !querySnapshot.empty;
    } catch (error) {
      console.error('❌ Error checking Aadhaar:', error);
      throw error;
    }
  }

  static onEmployeesChange(callback: (employees: Employee[]) => void) {
    const q = query(collection(db, this.COLLECTION_NAME), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const employees = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Employee));
      callback(employees);
    });
  }

  static async getByRole(role: string): Promise<Employee[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME), 
        where('role', '==', role),
        orderBy('name', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
    } catch (error) {
      console.error('❌ Error fetching by role:', error);
      throw error;
    }
  }

  static async searchByName(searchTerm: string): Promise<Employee[]> {
    try {
      const q = query(collection(db, this.COLLECTION_NAME), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const allEmployees = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Employee));
      
      return allEmployees.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('❌ Error searching:', error);
      throw error;
    }
  }
}