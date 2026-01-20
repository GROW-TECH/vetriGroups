// context/DataContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

import { EmployeesService } from '@/firebaseServices/employeesService';
import { VendorsService } from '@/firebaseServices/vendorsService';
import { ClientsService } from '@/firebaseServices/clientsService';
import { SubContractorFirebaseService } from '@/firebaseServices/firebaseSubContractorService';

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
  PAYMENT_STAGES_TEMPLATE,
} from '@/types';

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
  
  // Add sub-contractor properties
  subContractors: SubContractor[];
  subContractorFiles: SubContractorFile[];

  addEmployee(employee: Omit<Employee, 'id'>): Promise<void>;
  updateEmployee(employee: Employee): Promise<void>;
  deleteEmployee(employeeId: string): Promise<void>;

  markAttendance(
    employeeId: string,
    date: string,
    status: 'present' | 'absent'
  ): Promise<void>;
  deleteAttendance(employeeId: string, date: string): Promise<void>;

  addClient(client: Client): Promise<void>;
  updateClient(client: Client): Promise<void>;
  deleteClient(clientId: string): Promise<void>;

  addVendor(vendor: Omit<Vendor, 'id' | 'createdAt'>): Promise<void>;
  updateVendor(vendor: Vendor): Promise<void>;
  deleteVendor(vendorId: string): Promise<void>;
  
  // Add sub-contractor functions
  addSubContractor(subContractor: Omit<SubContractor, 'id' | 'createdAt'>): Promise<void>;
  updateSubContractor(subContractor: SubContractor): Promise<void>;
  deleteSubContractor(subContractorId: string): Promise<void>;
  
  // Add file functions for both clients and sub-contractors
  addProjectFile(file: ProjectFile): Promise<void>;
  deleteProjectFile(fileId: string): Promise<void>;
  addSubContractorFile(file: SubContractorFile): Promise<void>;
  deleteSubContractorFile(fileId: string): Promise<void>;
  
  // Add payment stage functions
  updatePaymentStage(stage: PaymentStage): Promise<void>;
  addPaymentStage(stage: PaymentStage): Promise<void>;
  deletePaymentStage(stageId: string): Promise<void>;
  
  // Add transaction and appointment functions
  addTransaction(transaction: Transaction): Promise<void>;
  addAppointment(appointment: Appointment): Promise<void>;

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

  const markAttendance = async (
    employeeId: string,
    date: string,
    status: 'present' | 'absent'
  ) => {
    setAttendance(prev => {
      const existing = prev.find(
        a => a.employeeId === employeeId && a.date === date
      );

      if (existing) {
        return prev.map(a =>
          a.employeeId === employeeId && a.date === date
            ? { ...a, status }
            : a
        );
      }

      return [...prev, { employeeId, date, status }];
    });
  };

  const deleteAttendance = async (employeeId: string, date: string) => {
    setAttendance(prev =>
      prev.filter(a => !(a.employeeId === employeeId && a.date === date))
    );
  };

  /* ================= LOADERS ================= */

  const loadEmployeesFromFirebase = async () => {
    const data = await EmployeesService.getAll();
    setEmployees(data);
  };

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

  useEffect(() => {
    const unsubscribeEmployees = EmployeesService.onEmployeesChange(setEmployees);
    const unsubscribeSubContractors = SubContractorFirebaseService.onSubContractorsChange(setSubContractors);
    
    // Load initial data
    const loadInitialData = async () => {
      await Promise.all([
        loadVendorsFromFirebase(),
        loadClientsFromFirebase(),
        loadSubContractorsFromFirebase(),
      ]);
      setIsLoading(false);
    };
    
    loadInitialData();

    return () => {
      unsubscribeEmployees();
      unsubscribeSubContractors();
    };
  }, []);

  /* ================= EMPLOYEES ================= */

  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    const id = await EmployeesService.add(employee);
    setEmployees(prev => [...prev, { id, ...employee }]);
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
    setEmployees(prev => prev.filter(e => e.id !== employeeId));
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

  const addClient = async (client: Client) => {
    await ClientsService.add(client);
    loadClientsFromFirebase();
  };

  const updateClient = async (client: Client) => {
    const { id, ...data } = client;
    await ClientsService.update(id, data);
    loadClientsFromFirebase();
  };

  const deleteClient = async (clientId: string) => {
    await ClientsService.delete(clientId);
    loadClientsFromFirebase();
  };

  /* ================= SUB-CONTRACTORS ================= */

  const addSubContractor = async (subContractor: Omit<SubContractor, 'id' | 'createdAt'>) => {
    try {
      const id = await SubContractorFirebaseService.add(subContractor);
      const newSubContractor: SubContractor = {
        ...subContractor,
        id,
        createdAt: new Date().toISOString(),
      };
      setSubContractors(prev => [...prev, newSubContractor]);
    } catch (error) {
      console.error('Error adding sub-contractor:', error);
      throw error;
    }
  };

  const updateSubContractor = async (subContractor: SubContractor) => {
    const { id, createdAt, ...data } = subContractor;
    const success = await SubContractorFirebaseService.update(id, data);
    if (success) {
      setSubContractors(prev =>
        prev.map(sc => (sc.id === subContractor.id ? subContractor : sc))
      );
    }
  };

  const deleteSubContractor = async (subContractorId: string) => {
    const success = await SubContractorFirebaseService.delete(subContractorId);
    if (success) {
      setSubContractors(prev => prev.filter(sc => sc.id !== subContractorId));
    }
  };

  /* ================= FILES ================= */

  const addProjectFile = async (file: ProjectFile) => {
    setProjectFiles(prev => [...prev, file]);
  };

  const deleteProjectFile = async (fileId: string) => {
    setProjectFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const addSubContractorFile = async (file: SubContractorFile) => {
    setSubContractorFiles(prev => [...prev, file]);
  };

  const deleteSubContractorFile = async (fileId: string) => {
    setSubContractorFiles(prev => prev.filter(f => f.id !== fileId));
  };

  /* ================= PAYMENT STAGES ================= */

  const updatePaymentStage = async (stage: PaymentStage) => {
    setPaymentStages(prev =>
      prev.map(s => (s.id === stage.id ? stage : s))
    );
  };

  const addPaymentStage = async (stage: PaymentStage) => {
    setPaymentStages(prev => [...prev, stage]);
  };

  const deletePaymentStage = async (stageId: string) => {
    setPaymentStages(prev => prev.filter(s => s.id !== stageId));
  };

  /* ================= TRANSACTIONS & APPOINTMENTS ================= */

  const addTransaction = async (transaction: Transaction) => {
    setTransactions(prev => [...prev, transaction]);
  };

  const addAppointment = async (appointment: Appointment) => {
    setAppointments(prev => [...prev, appointment]);
  };

  /* ================= CONTEXT ================= */

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

        markAttendance: async () => {},
        deleteAttendance: async () => {},

        addClient,
        updateClient,
        deleteClient,

        addVendor,
        updateVendor,
        deleteVendor,
        
        addSubContractor,
        updateSubContractor,
        deleteSubContractor,
        
        addProjectFile,
        deleteProjectFile,
        addSubContractorFile,
        deleteSubContractorFile,
        
        updatePaymentStage,
        addPaymentStage,
        deletePaymentStage,
        
        addTransaction,
        addAppointment,

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