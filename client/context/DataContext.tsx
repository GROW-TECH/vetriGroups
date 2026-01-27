import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

import { EmployeesService } from '../firebaseServices/employeesService';
import { VendorsService } from '../firebaseServices/vendorsService';
import { ClientsService } from '../firebaseServices/clientsService';
import { SubContractorFirebaseService } from '../firebaseServices/firebaseSubContractorService';
import { MaterialOrdersService } from '../firebaseServices/materialOrdersService';


import {
  Employee,
  AttendanceRecord,
  Client,
  ProjectFile,
  PaymentStage,
  Transaction,
  Appointment,
  Material,
  Supplier,
  MaterialOrder,
  Vendor,
  SubContractor,
  SubContractorFile,
} from '@/types';

// ✅ ADD NEW IMPORTS FOR FIREBASE
import { 
  collection,
  addDoc,
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  query,
  where
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

/* ================= CONTEXT TYPE ================= */

interface DataContextType {
  employees: Employee[];
  attendance: AttendanceRecord[];
  clients: Client[];
  projectFiles: ProjectFile[];
  paymentStages: PaymentStage[];
  transactions: Transaction[];
  appointments: Appointment[];
  materials: Material[];
  suppliers: Supplier[];
  materialOrders: MaterialOrder[];
  vendors: Vendor[];
  subContractors: SubContractor[];
  subContractorFiles: SubContractorFile[];

  addEmployee(employee: Omit<Employee, 'id'>): Promise<void>;
  updateEmployee(employee: Employee): Promise<void>;
  deleteEmployee(employeeId: string): Promise<void>;

 markAttendance(
  employeeId: string,
  date: string,
  status: 'present' | 'absent',
  extra?: {
    siteId?: string;
    siteName?: string;
    checkInTime?: string;
    checkOutTime?: string;
    photoUrl?: string;
  }
): Promise<void>;

  deleteAttendance(employeeId: string, date: string): Promise<void>;

  add(client: Omit<Client, 'id'>): Promise<string>


  updateClient(client: Client): Promise<void>;
  deleteClient(clientId: string): Promise<void>;

  addVendor(vendor: Omit<Vendor, 'id' | 'createdAt'>): Promise<void>;
  updateVendor(vendor: Vendor): Promise<void>;
  deleteVendor(vendorId: string): Promise<void>;

  addMaterialOrder(order: MaterialOrder | Omit<MaterialOrder, 'id'>): Promise<void>;
  updateMaterialOrder(order: MaterialOrder): Promise<void>;
  deleteMaterialOrder(orderId: string): Promise<void>;

  addSubContractor(subContractor: Omit<SubContractor, 'id' | 'createdAt'>): Promise<void>;
  updateSubContractor(subContractor: SubContractor): Promise<void>;
  deleteSubContractor(subContractorId: string): Promise<void>;

  addSubContractorFile(file: SubContractorFile): Promise<void>;
  deleteSubContractorFile(fileId: string): Promise<void>;

  // ✅ UPDATED: Payment Stages with Firebase
  addPaymentStage(stage: PaymentStage): Promise<void>;
  updatePaymentStage(stage: PaymentStage): Promise<void>;
  deletePaymentStage(stageId: string): Promise<void>;

  // ✅ UPDATED: Transactions with Firebase
  addTransaction(transaction: Transaction): Promise<void>;

  // ✅ UPDATED: Appointments with Firebase
  addAppointment(appointment: Appointment): Promise<void>;
  
  // ✅ NEW: Project Files
  addProjectFile(file: ProjectFile): Promise<void>;
  deleteProjectFile(fileId: string): Promise<void>;

  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

/* ================= STATIC DATA ================= */

const INITIAL_MATERIALS: Material[] = [
  { id: '1', name: 'Cement', unitPrice: 350, unit: 'bag' },
  { id: '2', name: 'Steel Bars', unitPrice: 65, unit: 'kg' },
];

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: '1', name: 'ABC Building Materials' },
  { id: '2', name: 'XYZ Cement Works' },
];

/* ================= PROVIDER ================= */

export function DataProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [paymentStages, setPaymentStages] = useState<PaymentStage[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [subContractors, setSubContractors] = useState<SubContractor[]>([]);
  const [subContractorFiles, setSubContractorFiles] = useState<SubContractorFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /* ================= ATTENDANCE ================= */


const markAttendance = async (
  employeeId: string,
  date: string,
  status: 'present' | 'absent',
  extra?: {
    siteId?: string;
    siteName?: string;
    checkInTime?: string;
    checkOutTime?: string;
    photoUrl?: string;
  }
) => {
  await addDoc(collection(db, 'attendance'), {
    employeeId,
    date,
    status,

    siteId: extra?.siteId ?? null,
    siteName: extra?.siteName ?? null,
    checkInTime: extra?.checkInTime ?? null,
    checkOutTime: extra?.checkOutTime ?? null,

    photoUrl: extra?.photoUrl ?? null, // 🔥 PHP IMAGE URL

    createdAt: new Date().toISOString(),
  });
};


const deleteAttendance = async (employeeId: string, date: string) => {
  const q = query(
    collection(db, 'attendance'),
    where('employeeId', '==', employeeId),
    where('date', '==', date)
  );

  const snap = await getDocs(q);
  snap.forEach(doc => deleteDoc(doc.ref));
};
  /* ================= LOADERS ================= */

  const loadVendorsFromFirebase = async () => {
    const data = await VendorsService.getAll();
    setVendors(data);
  };

  const loadClientsFromFirebase = async () => {
    const data = await ClientsService.getAll();
    setClients(data);
  };

  const loadSubContractorsFromFirebase = async () => {
    const data = await SubContractorFirebaseService.getAll();
    setSubContractors(data);
  };

  // ✅ NEW: Load Payment Stages from Firebase
  const loadPaymentStagesFromFirebase = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'paymentStages'));
      const stages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentStage[];
      setPaymentStages(stages);
    } catch (error) {
      console.error('Error loading payment stages:', error);
    }
  };

  // ✅ NEW: Load Transactions from Firebase
  const loadTransactionsFromFirebase = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'transactions'));
      const txns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(txns);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  // ✅ NEW: Load Appointments from Firebase
  const loadAppointmentsFromFirebase = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'appointments'));
      const apts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Appointment[];
      setAppointments(apts);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  // ✅ NEW: Load Project Files from Firebase
  const loadProjectFilesFromFirebase = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'projectFiles'));
      const files = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProjectFile[];
      setProjectFiles(files);
    } catch (error) {
      console.error('Error loading project files:', error);
    }
  };

  
  useEffect(() => {

        const unsubscribeAttendance = onSnapshot(
  collection(db, 'attendance'),
  (snapshot) => {
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as unknown as AttendanceRecord[];

    setAttendance(records);
  }
); 
    const unsubscribeEmployees = EmployeesService.onEmployeesChange((emps) => {
  console.log('🔥 From Firestore (employees):', emps);
  setEmployees(emps);
});


    const unsubscribeMaterialOrders =
      MaterialOrdersService.onMaterialOrdersChange(setMaterialOrders);

    // ✅ NEW: Real-time listeners for payment stages, transactions, appointments
    const unsubscribePaymentStages = onSnapshot(
      collection(db, 'paymentStages'),
      (snapshot) => {
        const stages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PaymentStage[];
        setPaymentStages(stages);
      }
    );

    const unsubscribeTransactions = onSnapshot(
      collection(db, 'transactions'),
      (snapshot) => {
        const txns = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[];
        setTransactions(txns);
      }
    );

    const unsubscribeAppointments = onSnapshot(
      collection(db, 'appointments'),
      (snapshot) => {
        const apts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];
        setAppointments(apts);
      }
    );

    const unsubscribeProjectFiles = onSnapshot(
      collection(db, 'projectFiles'),
      (snapshot) => {
        const files = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ProjectFile[];
        setProjectFiles(files);
      }
    );

    loadVendorsFromFirebase();
    loadClientsFromFirebase();
    loadSubContractorsFromFirebase();
    setIsLoading(false);

    return () => {
      unsubscribeEmployees();
      unsubscribeMaterialOrders();
      unsubscribePaymentStages();
      unsubscribeTransactions();
      unsubscribeAppointments();
      unsubscribeProjectFiles();
              unsubscribeAttendance(); // 👈 ADD THIS

    };
  }, []);

  

  /* ================= EMPLOYEES ================= */

 const addEmployee = async (employee: Omit<Employee, 'id'>) => {
  await EmployeesService.add(employee);
  // ❌ DO NOTHING ELSE
  // ✅ Firestore listener will update state
};


  const updateEmployee = async (employee: Employee) => {
    const { id, ...data } = employee;
    await EmployeesService.update(id, data);
    setEmployees(prev =>
      prev.map(e => (e.id === id ? employee : e))
    );
  };

  const deleteEmployee = async (employeeId: string) => {
    await EmployeesService.delete(employeeId);
    setEmployees(prev =>
      prev.filter(e => e.id !== employeeId)
    );
  };

  /* ================= VENDORS ================= */

  const addVendor = async (vendor: Omit<Vendor, 'id' | 'createdAt'>) => {
    await VendorsService.add(vendor);
    loadVendorsFromFirebase();
  };

  const updateVendor = async (vendor: Vendor) => {
    const { id, createdAt, ...data } = vendor;
    await VendorsService.update(id, data);
    loadVendorsFromFirebase();
  };

  const deleteVendor = async (vendorId: string) => {
    await VendorsService.delete(vendorId);
    loadVendorsFromFirebase();
  };

  /* ================= CLIENTS ================= */

  const addClient = async (client: Client): Promise<string> => {
  const id = await ClientsService.add(client); // 👈 get client id
  loadClientsFromFirebase();
  return id; // 👈 IMPORTANT
};

  const updateClient = async (client: Client) => {
    const { id, ...data } = client;
    await ClientsService.update(id, data);
    loadClientsFromFirebase();
  };

  const deleteClient = async (clientId: string) => {
    try {
      // ✅ Delete all related payment stages
      const stagesQuery = query(
        collection(db, 'paymentStages'),
        where('clientId', '==', clientId)
      );
      const stagesSnapshot = await getDocs(stagesQuery);
      for (const doc of stagesSnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      // ✅ Delete all related transactions
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('clientId', '==', clientId)
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      for (const doc of transactionsSnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      // ✅ Delete all related appointments
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('clientId', '==', clientId)
      );
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      for (const doc of appointmentsSnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      // ✅ Delete all related project files
      const filesQuery = query(
        collection(db, 'projectFiles'),
        where('clientId', '==', clientId)
      );
      const filesSnapshot = await getDocs(filesQuery);
      for (const doc of filesSnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      // ✅ Finally delete the client
      await ClientsService.delete(clientId);
      loadClientsFromFirebase();
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  };

  /* ================= MATERIAL ORDERS ================= */

  const addMaterialOrder = async (order: MaterialOrder | Omit<MaterialOrder, 'id'>) => {
    try {
      const { id, ...orderData } = order as MaterialOrder;
      await MaterialOrdersService.add(orderData);
    } catch (error) {
      console.error('Error adding material order:', error);
      throw error;
    }
  };

  const updateMaterialOrder = async (order: MaterialOrder) => {
    try {
      const { id, ...orderData } = order;
      await MaterialOrdersService.update(id, orderData);
    } catch (error) {
      console.error('Error updating material order:', error);
      throw error;
    }
  };

  const deleteMaterialOrder = async (orderId: string) => {
    try {
      await MaterialOrdersService.delete(orderId);
    } catch (error) {
      console.error('Error deleting material order:', error);
      throw error;
    }
  };

  /* ================= SUB-CONTRACTORS ================= */

  const addSubContractor = async (subContractor: Omit<SubContractor, 'id' | 'createdAt'>) => {
    try {
      await SubContractorFirebaseService.add(subContractor);
      await loadSubContractorsFromFirebase();
    } catch (error) {
      console.error('Error adding sub-contractor:', error);
      throw error;
    }
  };

  const updateSubContractor = async (subContractor: SubContractor) => {
    try {
      const { id, createdAt, ...data } = subContractor;
      await SubContractorFirebaseService.update(id, data);
      await loadSubContractorsFromFirebase();
    } catch (error) {
      console.error('Error updating sub-contractor:', error);
      throw error;
    }
  };

  const deleteSubContractor = async (subContractorId: string) => {
    try {
      await SubContractorFirebaseService.delete(subContractorId);
      setSubContractors(prev => prev.filter(s => s.id !== subContractorId));
      setSubContractorFiles(prev => prev.filter(f => f.subContractorId !== subContractorId));
      setPaymentStages(prev => prev.filter(p => p.subContractorId !== subContractorId));
      setTransactions(prev => prev.filter(t => t.subContractorId !== subContractorId));
      setAppointments(prev => prev.filter(a => a.subContractorId !== subContractorId));
    } catch (error) {
      console.error('Error deleting sub-contractor:', error);
      throw error;
    }
  };

  /* ================= SUB-CONTRACTOR FILES ================= */

  const addSubContractorFile = async (file: SubContractorFile) => {
    setSubContractorFiles(prev => [...prev, file]);
  };

  const deleteSubContractorFile = async (fileId: string) => {
    setSubContractorFiles(prev => prev.filter(f => f.id !== fileId));
  };

  /* ================= PAYMENT STAGES (✅ FIREBASE SYNC) ================= */





  /* ================= PAYMENT STAGES (✅ FIREBASE SYNC WITH FORMAT) ================= */

const addPaymentStage = async (stage: PaymentStage) => {
  try {
    const total = stage.total; // example: 1000

    // Build formatted text like user wants
    const stageText = `
Total = ${total}

${stage.name}      ${stage.percentage}%   = ${stage.amount}
`;

    await addDoc(collection(db, 'paymentStages'), {
      clientId: stage.clientId,
      total: total,
      name: stage.name,
      percentage: stage.percentage,
      amount: stage.amount,
      stageText: stageText.trim(), // 👈 store formatted text
      isPaid: stage.isPaid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error adding payment stage:', error);
    throw error;
  }
};

const updatePaymentStage = async (stage: PaymentStage) => {
  try {
    const total = stage.total;

    const stageText = `
Total = ${total}

${stage.name}      ${stage.percentage}%   = ${stage.amount}
`;

    await updateDoc(doc(db, 'paymentStages', stage.id), {
      clientId: stage.clientId,
      total: total,
      name: stage.name,
      percentage: stage.percentage,
      amount: stage.amount,
      stageText: stageText.trim(),
      isPaid: stage.isPaid,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating payment stage:', error);
    throw error;
  }
};

const deletePaymentStage = async (stageId: string) => {
  try {
    await deleteDoc(doc(db, 'paymentStages', stageId));
  } catch (error) {
    console.error('Error deleting payment stage:', error);
    throw error;
  }
};


  /* ================= TRANSACTIONS (✅ FIREBASE SYNC) ================= */

  const addTransaction = async (transaction: Transaction) => {
    try {
      // Add transaction
      await setDoc(doc(db, 'transactions', transaction.id), {
        ...transaction,
        createdAt: new Date().toISOString()
      });

      // Update client's transaction list if clientId exists
      if (transaction.clientId) {
        const clientRef = doc(db, 'clients', transaction.clientId);
        await updateDoc(clientRef, {
          transactions: arrayUnion(transaction.id),
          updatedAt: new Date().toISOString()
        });
      }

      // Real-time listener will update state automatically
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  /* ================= APPOINTMENTS (✅ FIREBASE SYNC) ================= */

  const addAppointment = async (appointment: Appointment) => {
    try {
      // Add appointment
      await setDoc(doc(db, 'appointments', appointment.id), {
        ...appointment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Update client's appointment list if clientId exists
      if (appointment.clientId) {
        const clientRef = doc(db, 'clients', appointment.clientId);
        await updateDoc(clientRef, {
          appointments: arrayUnion(appointment.id),
          updatedAt: new Date().toISOString()
        });
      }

      // Real-time listener will update state automatically
    } catch (error) {
      console.error('Error adding appointment:', error);
      throw error;
    }
  };

  /* ================= PROJECT FILES (✅ FIREBASE SYNC) ================= */

  const addProjectFile = async (file: ProjectFile) => {
    try {
      await setDoc(doc(db, 'projectFiles', file.id), {
        ...file,
        uploadedAt: file.uploadedAt || new Date().toISOString()
      });

      // Update client's files list
      if (file.clientId) {
        const clientRef = doc(db, 'clients', file.clientId);
        await updateDoc(clientRef, {
          files: arrayUnion(file.id),
          updatedAt: new Date().toISOString()
        });
      }

      // Real-time listener will update state automatically
    } catch (error) {
      console.error('Error adding project file:', error);
      throw error;
    }
  };

  const deleteProjectFile = async (fileId: string) => {
  try {
    const file = projectFiles.find(f => f.id === fileId);
    if (!file) return;

    await deleteDoc(doc(db, 'projectFiles', fileId));

    if (file.clientId) {
      const clientRef = doc(db, 'clients', file.clientId);
      await updateDoc(clientRef, {
        files: arrayRemove(fileId),
        updatedAt: new Date().toISOString()
      });
    }

    // 🔥 ADD THIS (important for instant UI update)
    setProjectFiles(prev => prev.filter(f => f.id !== fileId));

  } catch (error) {
    console.error('Error deleting project file:', error);
    throw error;
  }
};


  /* ================= PROVIDER ================= */

  return (
    <DataContext.Provider
      value={{
        employees,
        attendance,
        clients,
        projectFiles,
        paymentStages,
        transactions,
        appointments,
        materials: INITIAL_MATERIALS,
        suppliers: INITIAL_SUPPLIERS,
        materialOrders,
        vendors,
        subContractors,
        subContractorFiles,

        addEmployee,
        updateEmployee,
        deleteEmployee,

        markAttendance,
        deleteAttendance,

        addClient,
        updateClient,
        deleteClient,

        addVendor,
        updateVendor,
        deleteVendor,

        addMaterialOrder,
        updateMaterialOrder,
        deleteMaterialOrder,

        addSubContractor,
        updateSubContractor,
        deleteSubContractor,

        addSubContractorFile,
        deleteSubContractorFile,

        addPaymentStage,
        updatePaymentStage,
        deletePaymentStage,

        addTransaction,
        addAppointment,

        addProjectFile,
        deleteProjectFile,

        isLoading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

/* ================= HOOK ================= */

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within DataProvider');
  }
  return ctx;
}