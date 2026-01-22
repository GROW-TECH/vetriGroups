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

  // ✅ REQUIRED
  addMaterialOrder(order: MaterialOrder): Promise<void>;

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
  const [projectFiles] = useState<ProjectFile[]>([]);
  const [paymentStages] = useState<PaymentStage[]>([]);
  const [transactions] = useState<Transaction[]>([]);
  const [appointments] = useState<Appointment[]>([]);
  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /* ================= ATTENDANCE ================= */

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
      prev.filter(
        a => !(a.employeeId === employeeId && a.date === date)
      )
    );
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

  useEffect(() => {
    const unsubscribeEmployees =
      EmployeesService.onEmployeesChange(setEmployees);

    loadVendorsFromFirebase();
    loadClientsFromFirebase();
    setIsLoading(false);

    return () => unsubscribeEmployees();
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

  /* ================= MATERIAL ORDERS ================= */

  const addMaterialOrder = async (order: MaterialOrder) => {
    setMaterialOrders(prev => [...prev, order]);
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
