
export enum RoomStatus {
  VACANT = 'VACANT',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  DIRTY = 'DIRTY',
  REPAIR = 'REPAIR',
  MANAGEMENT = 'MANAGEMENT',
  STAFF_BLOCK = 'STAFF_BLOCK'
}

export enum RoomType {
  DELUXE = 'DELUXE ROOM',
  BUDGET = 'BUDGET ROOM',
  STANDARD = 'STANDARD ROOM',
  AC_FAMILY = 'AC FAMILY ROOM'
}

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'RECEPTIONIST' | 'ACCOUNTANT' | 'SUPERVISOR';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  password?: string;
}

export interface RoomInventoryItem {
  id: string;
  name: string;
  quantity: number;
}

export interface Guest {
  id: string;
  name: string;
  surName?: string;
  givenName?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string;
  phone: string;
  idNumber?: string;
  email: string;
  address: string;
  city: string;
  state: string;
  nationality: string;
  country?: string;
  gstin?: string;
  
  // C-Form Specific Fields
  arrivalFrom?: string;
  nextDestination?: string;
  arrivalInIndiaDate?: string;
  arrivalInIndiaTime?: string;
  hotelArrivalDate?: string;
  hotelArrivalTime?: string;
  hotelDepartureDate?: string;
  hotelDepartureTime?: string;
  
  embassyCountry?: string;
  passportNo?: string;
  passportPlaceOfIssue?: string;
  passportDateOfIssue?: string;
  passportDateOfExpiry?: string;
  
  visaNo?: string;
  visaPlaceOfIssue?: string;
  visaDateOfIssue?: string;
  visaDateOfExpiry?: string;
  visaType?: string;
  
  residentialAddress?: string;
  addressInIndia?: string;
  daysStayedInIndia?: number;
  purposeOfVisit?: string;
  isEmployedInIndia?: boolean;
  contactNoInIndia?: string;
  cellNoInIndia?: string;
  contactNoResidingCountry?: string;
  remarks?: string;
  applicationId?: string;

  documents: {
    aadharFront?: string;
    aadharBack?: string;
    pan?: string;
    passportFront?: string;
    passportBack?: string;
    voterId?: string;
    drivingLicense?: string;
    photo?: string;
  };
}

export interface ExtraOccupant {
  id: string;
  name: string;
  phone?: string;
  idNumber?: string;
  documents: {
    aadharFront?: string;
    aadharBack?: string;
    pan?: string;
    photo?: string;
  };
}

export interface GroupProfile {
  id: string;
  groupName: string;
  groupType: 'Tour' | 'Corporate' | 'Wedding' | 'School' | 'Religious' | 'Sports';
  headName: string;
  phone: string;
  email: string;
  orgName?: string;
  gstNumber?: string;
  billingPreference: 'Single' | 'Split' | 'Mixed';
  documents: {
    contract?: string;
    headId?: string;
  };
  status: 'ACTIVE' | 'CLOSED';
}

export interface Charge {
  id: string;
  description: string;
  amount: number;
  date: string;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
  remarks: string;
}

export type TransactionType = 'RECEIPT' | 'PAYMENT' | 'JOURNAL' | 'DEBIT_NOTE' | 'CREDIT_NOTE' | 'REFUND';

export type AccountGroupName = 
  | 'Capital' 
  | 'Fixed Asset' 
  | 'Current Asset' 
  | 'Direct Expense' 
  | 'Indirect Expense' 
  | 'Direct Income' 
  | 'Indirect Income' 
  | 'Current Liability' 
  | 'Operating';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  accountGroup: AccountGroupName;
  ledger: string;
  amount: number;
  description: string;
  referenceId?: string;
  entityName?: string;
}

export interface Booking {
  id: string;
  bookingNo: string;
  roomId: string;
  guestId: string;
  groupId?: string; 
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'RESERVED';
  charges: Charge[];
  payments: Payment[];
  basePrice: number;
  discount: number;
  purpose?: string;
  mealPlan?: string;
  agent?: string;
  adults?: number;
  children?: number;
  kids?: number;
  others?: number;
  totalPax?: number;
  extraBed?: boolean;
  extraOccupants?: ExtraOccupant[];
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: string;
  price: number;
  status: RoomStatus;
  currentBookingId?: string;
  inventory?: RoomInventoryItem[];
}

export interface AgentConfig {
  name: string;
  commission: number;
}

export interface HostelSettings {
  id: string;
  name: string;
  address: string;
  logo?: string;
  signature?: string;
  agents: AgentConfig[];
  roomTypes: string[];
  gstNumber?: string;
  taxRate?: number;
  hsnCode?: string;
  upiId?: string;
  licenseNumber?: string; // For C-Form
  superadminPassword?: string;
  adminPassword?: string;
  receptionistPassword?: string;
  accountantPassword?: string;
  supervisorPassword?: string;
}

export interface RoomShiftLog {
  id: string;
  roomId: string;
  fromStatus: RoomStatus;
  toStatus: RoomStatus;
  timestamp: string;
  userId: string;
}

export interface CleaningLog {
  id: string;
  roomId: string;
  cleanedBy: string;
  timestamp: string;
}

export interface Quotation {
  id: string;
  guestName: string;
  date: string;
  totalAmount: number;
}
