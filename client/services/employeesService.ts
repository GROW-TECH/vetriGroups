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
    console.log('================================================');
    console.log('🔥 EMPLOYEESSERVICE.ADD CALLED');
    console.log('================================================');
    console.log('📥 RECEIVED employee object:', employee);
    console.log('📥 Type of employee:', typeof employee);
    console.log('📥 Is array?:', Array.isArray(employee));
    console.log('📥 Keys received:', Object.keys(employee));
    console.log('📥 employee.aadhaarNo:', employee.aadhaarNo);
    console.log('📥 employee.username:', employee.username);
    console.log('📥 employee.password:', employee.password);
    console.log('📥 employee.age:', employee.age);
    console.log('================================================');

    try {
      const newDocRef = doc(collection(db, this.COLLECTION_NAME));
      const now = new Date().toISOString();

      // Build data object step by step with logging
      console.log('🔨 Building data object...');
      
      const data: any = {};
      
      data.name = employee.name;
      console.log('✅ Added name:', data.name);
      
      data.role = employee.role;
      console.log('✅ Added role:', data.role);
      
      data.phone = employee.phone || '';
      console.log('✅ Added phone:', data.phone);
      
      data.address = employee.address || '';
      console.log('✅ Added address:', data.address);
      
      data.salary = employee.salary;
      console.log('✅ Added salary:', data.salary);
      
      data.age = employee.age || 25;
      console.log('✅ Added age:', data.age);
      
      // Critical fields
      data.aadhaarNo = employee.aadhaarNo || '';
      console.log('✅ Added aadhaarNo:', data.aadhaarNo);
      
      data.username = employee.username || '';
      console.log('✅ Added username:', data.username);
      
      data.password = employee.password || '';
      console.log('✅ Added password:', data.password);
      
      data.faceImage = employee.faceImage || '';
      console.log('✅ Added faceImage:', data.faceImage);
      
      data.faceEnrolled = employee.faceEnrolled || false;
      console.log('✅ Added faceEnrolled:', data.faceEnrolled);
      
      data.fingerprintEnrolled = employee.fingerprintEnrolled || false;
      console.log('✅ Added fingerprintEnrolled:', data.fingerprintEnrolled);
      
      data.createdAt = now;
      console.log('✅ Added createdAt:', data.createdAt);
      
      data.updatedAt = now;
      console.log('✅ Added updatedAt:', data.updatedAt);

      console.log('================================================');
      console.log('🔥 FINAL DATA OBJECT TO SEND TO FIRESTORE:');
      console.log('================================================');
      console.log(JSON.stringify(data, null, 2));
      console.log('================================================');
      console.log('Keys in data object:', Object.keys(data));
      console.log('Has aadhaarNo key?:', 'aadhaarNo' in data);
      console.log('Has username key?:', 'username' in data);
      console.log('Has password key?:', 'password' in data);
      console.log('Has age key?:', 'age' in data);
      console.log('================================================');

      console.log('🚀 Calling setDoc...');
      await setDoc(newDocRef, data);
      console.log('✅ setDoc completed successfully!');
      console.log('✅ Document ID:', newDocRef.id);

      // Verify what was actually saved
      console.log('🔍 Verifying what was saved to Firestore...');
      const savedDoc = await getDoc(newDocRef);
      if (savedDoc.exists()) {
        const savedData = savedDoc.data();
        console.log('✅ Document exists in Firestore');
        console.log('✅ Saved data:', JSON.stringify(savedData, null, 2));
        console.log('✅ Saved keys:', Object.keys(savedData));
        console.log('✅ Has aadhaarNo?:', 'aadhaarNo' in savedData, '- Value:', savedData.aadhaarNo);
        console.log('✅ Has username?:', 'username' in savedData, '- Value:', savedData.username);
        console.log('✅ Has password?:', 'password' in savedData, '- Value:', savedData.password);
        console.log('✅ Has age?:', 'age' in savedData, '- Value:', savedData.age);
      } else {
        console.error('❌ Document does not exist after setDoc!');
      }

      console.log('================================================');
      return newDocRef.id;
    } catch (error) {
      console.error('================================================');
      console.error('❌ ERROR in EmployeesService.add:');
      console.error('================================================');
      console.error('Error object:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('================================================');
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