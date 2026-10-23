export type UserRole = 'customer' | 'shopkeeper' | 'rider' | 'admin';

export type ProductUnit = 'kg' | 'gm' | 'litre' | 'liter' | 'ml' | 'piece' | 'dozen' | 'pack' | 'bundle' | 'bottle';

export type OrderStatus =
  | 'pending_shop_confirmation'
  | 'shop_confirmed'
  | 'shop_rejected'
  | 'rider_assigned'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_failed'
  | 'cancelled'
  | 'returned';

export type PaymentStatus = 'pending' | 'collected' | 'deposited' | 'failed';

export type DeliveryTaskStatus = 'assigned' | 'arrived_at_shop' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'failed';

export type CashHandoverStatus = 'pending' | 'verified' | 'deposited';

export type LedgerEntryType =
  | 'cod_collection'
  | 'shop_payable'
  | 'platform_commission'
  | 'delivery_fee_revenue'
  | 'rider_payout'
  | 'rider_handover'
  | 'shop_settlement';

export interface UnionArea {
  id: string;
  nameEn: string;
  nameBn: string;
  thanaId: string; // 'kaliganj' | 'kapasia'
  thanaNameBn: string;
}

export interface CustomerAccount {
  id: string;
  name: string;
  phone: string;
  address: string;
  password?: string;
  areaId: string;
  unionId?: string;
  unionName?: string;
  createdAt: string;
}

export interface DeliveryRiderAccount {
  id: string;
  name: string;
  phone: string;
  password?: string;
  area: string; // Thana ID e.g. 'kaliganj' | 'kapasia'
  thanaId?: string;
  assignedUnionIds: string[]; // List of assigned union IDs for order routing
  isOnline: boolean;
  isActive: boolean;
  isDeactivated?: boolean;
  deactivatedReason?: string;
  currentBalance?: number;
  completedDeliveries?: number;
  pendingDeliveries?: number;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email?: string;
  displayName: string;
  phone?: string;
  role: UserRole;
  defaultAddress?: string;
  marketId?: string;
  shopId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Market {
  id: string;
  nameEn: string;
  nameBn: string;
  areaEn: string;
  areaBn: string;
  cityEn: string;
  cityBn: string;
  lat: number;
  lng: number;
  radiusKm: number;
  isActive: boolean;
  createdAt?: string;
}

export interface Shop {
  id: string;
  ownerId: string;
  marketId: string;
  nameEn: string;
  nameBn: string;
  category: string;
  addressEn: string;
  addressBn: string;
  lat: number;
  lng: number;
  phone: string;
  openingTime: string;
  closingTime: string;
  isApproved: boolean;
  isOpen: boolean;
  commissionRate: number; // e.g. 0.05 for 5%
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  nameEn: string;
  nameBn: string;
  icon: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  shopId: string;
  marketId: string;
  area?: string;
  categoryId: string;
  nameEn: string;
  nameBn: string;
  descriptionEn?: string;
  descriptionBn?: string;
  price: number; // In BDT (৳)
  unit: ProductUnit;
  stock: number;
  isAvailable: boolean;
  isPrivate?: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartState {
  shopId: string | null;
  items: CartItem[];
}

export interface OrderItemSnapshot {
  productId: string;
  nameEn: string;
  nameBn: string;
  price: number;
  unit: ProductUnit;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  customerId: string;
  shopId: string;
  marketId: string;
  thanaId?: string;
  thanaNameBn?: string;
  unionId?: string;
  unionNameBn?: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  acceptedAt?: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  roadDistanceKm: number;
  pricingRuleVersion: string;
  paymentMethod: 'cod';
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  shopNameEn?: string;
  shopNameBn?: string;
  shopAddressEn?: string;
  rejectionReason?: string;
  failureReason?: string;
  cancellationReason?: string;
  notes?: string;
  messages?: OrderMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderMessage {
  id: string;
  orderId: string;
  senderRole: 'admin' | 'rider' | 'customer';
  senderName: string;
  senderPhone?: string;
  text: string;
  createdAt: string;
}

export interface DeliveryTask {
  id: string;
  orderId: string;
  riderId: string;
  shopId: string;
  customerId: string;
  status: DeliveryTaskStatus;
  codAmountToCollect: number;
  codAmountCollected?: number;
  riderPayout: number;
  pickupTime?: string;
  deliveryTime?: string;
  failedReason?: string;
  handoverStatus: CashHandoverStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryPricingPolicy {
  id: string;
  version: string;
  baseFee: number; // e.g., BDT 30
  includedKm: number; // e.g., 1.0 km
  perKmFee: number; // e.g., BDT 10 per started km
  maxDeliveryDistanceKm: number; // e.g., 15.0 km
  isActive: boolean;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  orderId: string;
  type: LedgerEntryType;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  currency: 'BDT';
  referenceId?: string;
  notes?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  createdAt: string;
}

export interface FinancialReconciliationSummary {
  totalOrdersDelivered: number;
  totalCodDue: number;
  totalCodCollected: number;
  totalCodDeposited: number;
  totalPendingHandover: number;
  totalPlatformCommission: number;
  totalDeliveryFeeRevenue: number;
  totalShopPayables: number;
  totalRiderPayouts: number;
  netPlatformProfit: number;
}
