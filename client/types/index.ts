export type UserRole =
  | 'admin'
  | 'engineer'
  | 'site-engineer'
  | 'supervisor'
  | 'client'
  | 'vendor';



export interface User {
  id: string; 
  role: UserRole;
  name: string;
}

export interface Employee {
  id: string;
  name: string;
  phone?: string;
  age: number;
  address: string;
  role: EmployeeRole;
  salary: number;
  faceImage?: string;
  faceEnrolled?: boolean;
  fingerprintEnrolled?: boolean;
}

export type EmployeeRole =
  | 'mason'
  | 'labor'
  | 'engineer'
  | 'site-engineer'
  | 'supervisor';


export interface AttendanceRecord {
  date: string;
  employeeId: string;
  status: 'present' | 'absent';
}

export interface Client {
  id: string;
  name: string;
  projectName: string;
  location?: string;
  ownerPhone?: string; // phone in international format without +, e.g., 919876543210
  totalAmount?: number;
  status: 'active' | 'completed' | 'pending';
  username?: string; // login username for client
  password?: string; // login password for client
}

export interface ProjectFile {
  id: string;
  clientId: string;
  type: 'plan' | 'agreement';
  name: string;
  uri: string;
  uploadedAt: string;
}

export interface PaymentStage {
  id: string;
  clientId: string;
  name: string;
  amount: number;
  isPaid: boolean;
}

export interface Transaction {
  id: string;
  clientId: string;
  stageId: string;
  amount: number;
  date: string;
  method: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  date: string;
  time: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Material {
  id: string;
  name: string;
  unitPrice: number;
  unit: string;
}

export interface Supplier {
  id: string;
  name: string;
}

export type MaterialCategory = 'steel' | 'm_sand' | 'p_sand' | 'cement' | 'aggregate' | 'bricks' | 'tiles' | 'electrical' | 'plumbing' | 'paint' | 'other';

export interface VendorMaterial {
  category: MaterialCategory;
  name: string;
  unitPrice: number;
  unit: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  materials: VendorMaterial[];
  gstNumber?: string;
  notes?: string;
  createdAt: string;
}

export const MATERIAL_CATEGORIES: { id: MaterialCategory; name: string }[] = [
  { id: 'steel', name: 'Steel' },
  { id: 'm_sand', name: 'M-Sand' },
  { id: 'p_sand', name: 'P-Sand' },
  { id: 'cement', name: 'Cement' },
  { id: 'aggregate', name: 'Aggregate' },
  { id: 'bricks', name: 'Bricks' },
  { id: 'tiles', name: 'Tiles' },
  { id: 'electrical', name: 'Electrical' },
  { id: 'plumbing', name: 'Plumbing' },
  { id: 'paint', name: 'Paint' },
  { id: 'other', name: 'Other' },
];

export interface MaterialOrder {
  id: string;
  date: string;
  clientId: string;
  materialId: string;
  supplierId: string;
  quantity: number;
  totalCost: number;
  paymentStatus: 'paid' | 'pending';
  stock: number;
}

export const DASHBOARD_CARDS: Record<UserRole, string[]> = {
  admin: ['Attendance', 'Material',  'Order Material',  'Client', 'Vendor', 'Sub Contractor', 'Photo',
    'Look Ahead',  'Management'],
  engineer: ['Attendance', 'Material',  'Order Material',  'Client', 'Vendor', 'Sub Contractor', 'Photo',
    'Look Ahead', 'Management'],
  'site-engineer': [
  'Attendance',
],

  supervisor: ['Attendance', 'Material', 'Client', 'Vendor', 'Sub Contractor', 'Photo', 'Look Ahead', 'App Integration', 'Management'],
  client: ['Plan', 'Agreement', 'Payment', 'Appointment'],
  vendor: ['Material', 'Vendor'],
};
export const EMPLOYEE_ROLES: EmployeeRole[] = [
  'mason',
  'labor',
  'engineer',
  'site-engineer',
  'supervisor',
];


export const PAYMENT_STAGES_TEMPLATE = [
  { name: 'Foundation', percentage: 15 },
  { name: 'Plinth', percentage: 15 },
  { name: 'Superstructure', percentage: 25 },
  { name: 'Roof', percentage: 20 },
  { name: 'Finishing', percentage: 15 },
  { name: 'Final', percentage: 10 },
];
