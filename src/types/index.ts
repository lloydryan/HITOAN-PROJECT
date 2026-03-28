import { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "cashier" | "crew" | "kitchen";
export type OrderType = "dine-in" | "takeout";
export type OrderStatus = "pending" | "preparing" | "ready" | "served" | "cancelled";
export type PaymentStatus = "unpaid" | "paid";
export type PaymentMethod = "cash" | "gcash" | "qr";
export type DiscountType = "none" | "pwd" | "senior";

export interface AppUser {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  employeeId?: string;
  createdAt?: Timestamp;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  isAvailable: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CostLog {
  id: string;
  type: string;
  value: number;
  note?: string;
  createdAt?: Timestamp;
  createdBy: string;
}

export interface OrderLine {
  menuItemId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  qty: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  tableNumber?: string;
  orderNotes?: string;
  crewUid?: string;
  crewEmployeeId?: string;
  crewName?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderLine[];
  subtotal: number;
  tax: number;
  total: number;
  vatEnabled?: boolean;
  createdAt?: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
  updatedBy: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amountPaid: number;
  method: PaymentMethod;
  discountType?: DiscountType;
  discountRate?: number;
  totalPersons?: number;
  discountedPersons?: number;
  sharePerPerson?: number;
  discountAmount?: number;
  amountDue?: number;
  change: number;
  transferLast4?: string;
  createdAt?: Timestamp;
  cashierId: string;
}

export interface ActivityLog {
  id: string;
  action:
    | "MENU_CREATE"
    | "MENU_UPDATE"
    | "MENU_DELETE"
    | "COST_CREATE"
    | "ORDER_CREATE"
    | "ORDER_EDIT"
    | "ORDER_VOID"
    | "ORDER_STATUS_UPDATE"
    | "PAYMENT_CREATE"
    | "ORDER_PAYMENT_UPDATE"
    | "USER_ROLE_UPDATE"
    | "USER_EMPLOYEE_ID_UPDATE"
    | "USER_PROFILE_UPDATE";
  actorUid: string;
  actorRole: UserRole;
  actorName: string;
  entityType: string;
  entityId: string;
  message: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  createdAt?: Timestamp;
}
