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

/**
 * Firebase Employees Service
 * Collection: employees
 */
export class EmployeesService {
  private static COLLECTION_NAME = 'employees';

  /* ===============================
     GET ALL EMPLOYEES (ONE-TIME)
  ================================ */
  static async getAll(): Promise<Employee[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('name', 'asc')
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(
        (docSnap) =>
          ({
            id: docSnap.id,
            ...docSnap.data(),
          } as Employee)
      );
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  }

  /* ===============================
     ADD EMPLOYEE
  ================================ */
  static async add(employee: Omit<Employee, 'id'>): Promise<string> {
    try {
    const employeeData = {
  name: employee.name,
  email: employee.email ?? '',          // ✅ ADD THIS LINE
  phone: employee.phone ?? '',
  address: employee.address ?? 'No address',
  role: employee.role,
  salary: employee.salary,
  faceImage: employee.faceImage ?? null,
  faceEnrolled: employee.faceEnrolled ?? false,
  fingerprintEnrolled: employee.fingerprintEnrolled ?? false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
};


      const docRef = await addDoc(
        collection(db, this.COLLECTION_NAME),
        employeeData
      );

      return docRef.id;
    } catch (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  }

  /* ===============================
     UPDATE EMPLOYEE
  ================================ */
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
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  }

  /* ===============================
     DELETE EMPLOYEE
  ================================ */
  static async delete(id: string): Promise<void> {
    try {
      const ref = doc(db, this.COLLECTION_NAME, id);
      await deleteDoc(ref);
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }

  /* ===============================
     REAL-TIME LISTENER
  ================================ */
  static onEmployeesChange(
    callback: (employees: Employee[]) => void
  ) {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      orderBy('name', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const employees = snapshot.docs.map(
        (docSnap) =>
          ({
            id: docSnap.id,
            ...docSnap.data(),
          } as Employee)
      );

      callback(employees);
    });
  }
}
