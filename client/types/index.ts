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

// D:\projects\vetri_updated\client\types\index.ts
// Add/Update these types

export interface Client {
  id: string;
  name: string;
  username: string;
  password: string;
  projectName: string;
  location: string;
  status: 'active' | 'completed' | 'on-hold';
  totalAmount: number;
  ownerPhone?: string;
  
  // ✅ Firebase reference arrays
  paymentStages?: string[];
  transactions?: string[];
  files?: string[];
  appointments?: string[];
  
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentStage {
  id: string;
  clientId?: string;
  subContractorId?: string;
  name: string;
  amount: number;
  isPaid: boolean;
  createdAt?: string;
  updatedAt?: string;
}


  
  // Payment request states
  export interface PaymentRequest {
    id: string;
    clientId: string;
    clientName: string;
    message: string;
    createdAt: string;
    status: 'pending' | 'accepted' | 'declined' | 'read';
    archived: boolean // false by default

    type: 'payment';
    sentBy: string;
  }
  


// The rest of your types remain the same...
export interface Transaction {
  id: string;
  clientId?: string;
  subContractorId?: string;
  stageId: string;
  amount: number;
  date: string;
  method: string;
  createdAt?: string;
}

export interface Appointment {
  id: string;
  clientId?: string;
  subContractorId?: string;
  date: string;
  time: string;
  reason: string;
  archived: boolean // false by default

  status: 'pending' | 'accepted' | 'declined';
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectFile {
  id: string;
  clientId: string;
  type: 'plan' | 'agreement' | 'photo';
  name: string;
  uri: string;
  uploadedAt: string;
}

// Keep all your other existing types...
export interface SubContractorFile {
  id: string;
  subContractorId: string;
  name: string;
  url: string;
  type: 'document' | 'image' | 'other';
  createdAt: number;
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
  vendorStatus?: 'pending' | 'accepted' | 'declined';
  stock: number;
  vendorRead?: boolean;

}

// NEW: Transport interface
export interface Transport {
  id: string;
  name: string;
  phone: string;
  from: string;
  to: string;
  materialType: string;
  weight: string;
  payment: 'paid' | 'pending';
  createdAt: any;
  updatedAt: any;
}

// NEW: SubContractor interface (if not already defined elsewhere)
export interface SubContractor {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  specialty?: string;
  notes?: string;
  createdAt: string;
}

export const DASHBOARD_CARDS: Record<UserRole, string[]> = {
  admin: [
    'Attendance',
    'Material',
    'Order Material',
    'Client',
    'Vendor',
    'Sub Contractor',
    'Transport',  // Added
    'Request Management',
    'Photo',
    'Look Ahead',
    'Management'
  ],
  engineer: [
    'Attendance',
    'Material',
    'Order Material',
    'Client',
    'Vendor',
    'Sub Contractor',
    'Transport',  // Added
    'Request Management',
    'Photo',
    'Look Ahead',
    'Management'
  ],
  'site-engineer': [
    'Attendance',
    'Transport',  // Added - site engineers might need to track material transport
  ],
  supervisor: [
    'Attendance',
    'Material',
    'Client',
    'Vendor',
    'Sub Contractor',
    'Transport',  // Added
    'Photo',
    'Look Ahead',
    'App Integration',
    'Management'
  ],
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