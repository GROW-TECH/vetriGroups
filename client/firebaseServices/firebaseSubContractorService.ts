// firebaseServices/subContractorService.ts
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { SubContractor } from '@/types';

// Rename to avoid conflict with the SubContractorService type
export const SubContractorFirebaseService = {
  // Get all sub-contractors
  getAll: async (): Promise<SubContractor[]> => {
    try {
      const subContractorsRef = collection(db, 'subContractors');
      const q = query(subContractorsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const subContractors: SubContractor[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        subContractors.push({
          id: doc.id,
          companyName: data.companyName || '',
          contactPerson: data.contactPerson || '',
          phone: data.phone || '',
          email: data.email || '',
          workType: data.workType || '',
          specialization: data.specialization || '',
          address: data.address || '',
          gstNumber: data.gstNumber || '',
          licenseNumber: data.licenseNumber || '',
          status: data.status || 'active',
          services: data.services || [],
          notes: data.notes || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as SubContractor);
      });
      
      return subContractors;
    } catch (error) {
      console.error('Error fetching sub-contractors:', error);
      return [];
    }
  },

  // Add new sub-contractor
  add: async (subContractor: Omit<SubContractor, 'id' | 'createdAt'>): Promise<string> => {
    try {
      // Generate a unique ID
      const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const subContractorRef = doc(db, 'subContractors', id);
      await setDoc(subContractorRef, {
        ...subContractor,
        services: subContractor.services || [],
        createdAt: Timestamp.now(),
      });
      
      return id;
    } catch (error) {
      console.error('Error adding sub-contractor:', error);
      throw error;
    }
  },

  // Update sub-contractor
  update: async (id: string, data: Partial<SubContractor>): Promise<boolean> => {
    try {
      const subContractorRef = doc(db, 'subContractors', id);
      
      // Remove id and createdAt from update data
      const { id: _, createdAt, ...updateData } = data;
      
      await updateDoc(subContractorRef, updateData);
      return true;
    } catch (error) {
      console.error('Error updating sub-contractor:', error);
      return false;
    }
  },

  // Delete sub-contractor
  delete: async (id: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, 'subContractors', id));
      return true;
    } catch (error) {
      console.error('Error deleting sub-contractor:', error);
      return false;
    }
  },

  // Listen to real-time changes
  onSubContractorsChange: (callback: (subContractors: SubContractor[]) => void) => {
    const subContractorsRef = collection(db, 'subContractors');
    const q = query(subContractorsRef, orderBy('createdAt', 'desc'));
    
    // For real-time updates
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const subContractors: SubContractor[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        subContractors.push({
          id: doc.id,
          companyName: data.companyName || '',
          contactPerson: data.contactPerson || '',
          phone: data.phone || '',
          email: data.email || '',
          workType: data.workType || '',
          specialization: data.specialization || '',
          address: data.address || '',
          gstNumber: data.gstNumber || '',
          licenseNumber: data.licenseNumber || '',
          status: data.status || 'active',
          services: data.services || [],
          notes: data.notes || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as SubContractor);
      });
      callback(subContractors);
    }, (error) => {
      console.error('Error listening to sub-contractors:', error);
    });

    // Return unsubscribe function
    return unsubscribe;
  },
};

// Alternatively, you could export with a different name:
// export default SubContractorFirebaseService;