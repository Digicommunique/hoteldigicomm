
import { RoomStatus, RoomType, Room } from './types';

export const STATUS_COLORS: Record<RoomStatus, string> = {
  [RoomStatus.VACANT]: 'bg-white border-green-400 text-green-900',
  [RoomStatus.OCCUPIED]: 'bg-blue-50 border-blue-600 text-blue-900 shadow-inner',
  [RoomStatus.RESERVED]: 'bg-orange-50 border-orange-500 text-orange-900',
  [RoomStatus.DIRTY]: 'bg-red-50 border-red-500 text-red-900',
  [RoomStatus.REPAIR]: 'bg-[#5c2d0a]/10 border-[#5c2d0a] text-[#5c2d0a]', // Brown as requested
  [RoomStatus.MANAGEMENT]: 'bg-purple-50 border-purple-400 text-purple-900',
  [RoomStatus.STAFF_BLOCK]: 'bg-gray-300 border-gray-500 text-gray-800',
};

/** 
 * Distinct color themes for occupied rooms. 
 * Deterministically assigned based on GuestId or GroupId.
 */
export const GUEST_OCCUPANCY_THEMES = [
  'bg-blue-50 border-blue-600 text-blue-900 shadow-inner',
  'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-inner',
  'bg-teal-50 border-teal-600 text-teal-900 shadow-inner',
  'bg-cyan-50 border-cyan-600 text-cyan-900 shadow-inner',
  'bg-rose-50 border-rose-600 text-rose-900 shadow-inner',
  'bg-pink-50 border-pink-600 text-pink-900 shadow-inner',
];

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", 
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

export const INITIAL_ROOMS: Room[] = [
  // First Floor
  { id: '101', number: '101', floor: 1, type: RoomType.DELUXE, price: 2900, status: RoomStatus.VACANT },
  { id: '102', number: '102', floor: 1, type: RoomType.DELUXE, price: 2900, status: RoomStatus.VACANT },
  { id: '103', number: '103', floor: 1, type: RoomType.BUDGET, price: 2000, status: RoomStatus.VACANT },
  { id: '104', number: '104', floor: 1, type: RoomType.BUDGET, price: 2000, status: RoomStatus.VACANT },
  { id: '105', number: '105', floor: 1, type: RoomType.BUDGET, price: 2000, status: RoomStatus.VACANT },
  { id: '106', number: '106', floor: 1, type: RoomType.BUDGET, price: 2000, status: RoomStatus.VACANT },
  { id: '107', number: '107', floor: 1, type: RoomType.BUDGET, price: 2000, status: RoomStatus.VACANT },
  { id: '108', number: '108', floor: 1, type: RoomType.AC_FAMILY, price: 4100, status: RoomStatus.VACANT },
  { id: '109', number: '109', floor: 1, type: RoomType.BUDGET, price: 2000, status: RoomStatus.VACANT },
  { id: '110', number: '110', floor: 1, type: RoomType.BUDGET, price: 2000, status: RoomStatus.VACANT },

  // Second Floor
  { id: '201', number: '201', floor: 2, type: RoomType.BUDGET, price: 2000, status: RoomStatus.VACANT },
  { id: '202', number: '202', floor: 2, type: RoomType.BUDGET, price: 2000, status: RoomStatus.VACANT },
  { id: '203', number: '203', floor: 2, type: RoomType.BUDGET, price: 2000, status: RoomStatus.VACANT },
  { id: '204', number: '204', floor: 2, type: RoomType.BUDGET, price: 2000, status: RoomStatus.VACANT },
  { id: '205', number: '205', floor: 2, type: RoomType.STANDARD, price: 2500, status: RoomStatus.VACANT },
  { id: '206', number: '206', floor: 2, type: RoomType.STANDARD, price: 2500, status: RoomStatus.VACANT },
  { id: '207', number: '207', floor: 2, type: RoomType.STANDARD, price: 2500, status: RoomStatus.VACANT },
  { id: '208', number: '208', floor: 2, type: RoomType.BUDGET, price: 2000, status: RoomStatus.VACANT },
  { id: '209', number: '209', floor: 2, type: RoomType.STANDARD, price: 2500, status: RoomStatus.VACANT },
  { id: '210', number: '210', floor: 2, type: RoomType.DELUXE, price: 2900, status: RoomStatus.VACANT },
  { id: '211', number: '211', floor: 2, type: RoomType.STANDARD, price: 2500, status: RoomStatus.VACANT },

  // Third Floor
  { id: '301', number: '301', floor: 3, type: RoomType.BUDGET, price: 2000, status: RoomStatus.VACANT },
  { id: '302', number: '302', floor: 3, type: RoomType.BUDGET, price: 2000, status: RoomStatus.VACANT },
  { id: '303', number: '303', floor: 3, type: RoomType.BUDGET, price: 2000, status: RoomStatus.VACANT },
];
