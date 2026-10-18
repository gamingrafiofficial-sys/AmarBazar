import { LedgerEntry, Order, FinancialReconciliationSummary } from '../types';

export interface OrderFinancialSplit {
  subtotal: number;
  deliveryFee: number;
  totalCollected: number;
  commissionRate: number;
  platformCommission: number;
  shopPayable: number;
  riderPayout: number;
  netPlatformRevenue: number;
}

export const DEFAULT_RIDER_BASE_PAYOUT = 25; // ৳25 base payout to rider per delivered order
export const DEFAULT_RIDER_PER_KM_SHARE = 5; // ৳5 per km beyond 1 km

export function calculateOrderFinancialSplit(
  order: Order,
  commissionRate: number = 0.05
): OrderFinancialSplit {
  const subtotal = order.subtotal;
  const deliveryFee = order.deliveryFee;
  const totalCollected = subtotal + deliveryFee;

  const platformCommission = Math.round(subtotal * commissionRate);
  const shopPayable = Math.max(0, subtotal - platformCommission);

  // Rider payout calculation (own fleet delivery incentive)
  const excessKm = Math.max(0, order.roadDistanceKm - 1);
  const riderPayout = Math.round(DEFAULT_RIDER_BASE_PAYOUT + Math.ceil(excessKm) * DEFAULT_RIDER_PER_KM_SHARE);

  const netPlatformRevenue = platformCommission + (deliveryFee - riderPayout);

  return {
    subtotal,
    deliveryFee,
    totalCollected,
    commissionRate,
    platformCommission,
    shopPayable,
    riderPayout,
    netPlatformRevenue,
  };
}

/**
 * Creates immutable double-entry ledger entries for a delivered COD order
 */
export function generateDeliveredOrderLedgerEntries(
  order: Order,
  commissionRate: number = 0.05
): Omit<LedgerEntry, 'id'>[] {
  const split = calculateOrderFinancialSplit(order, commissionRate);
  const now = new Date().toISOString();

  return [
    // 1. COD Collection: Cash held by Rider (Debit: Rider Cash In Hand, Credit: Customer Receivable)
    {
      orderId: order.id,
      type: 'cod_collection',
      debitAccount: `rider_cash_in_hand:${order.riderId || 'unassigned'}`,
      creditAccount: `customer_receivable:${order.customerId}`,
      amount: split.totalCollected,
      currency: 'BDT',
      referenceId: order.id,
      notes: `COD collected for order #${order.id}`,
      createdAt: now,
    },
    // 2. Shop Payable liability recorded (Debit: Merchandise Cost, Credit: Shop Payable Account)
    {
      orderId: order.id,
      type: 'shop_payable',
      debitAccount: 'platform_merchandise_clearing',
      creditAccount: `shop_payable:${order.shopId}`,
      amount: split.shopPayable,
      currency: 'BDT',
      referenceId: order.id,
      notes: `Shop net earnings payable for #${order.id}`,
      createdAt: now,
    },
    // 3. Platform Commission Earned
    {
      orderId: order.id,
      type: 'platform_commission',
      debitAccount: 'platform_merchandise_clearing',
      creditAccount: 'platform_commission_revenue',
      amount: split.platformCommission,
      currency: 'BDT',
      referenceId: order.id,
      notes: `${Math.round(split.commissionRate * 100)}% platform commission on #${order.id}`,
      createdAt: now,
    },
    // 4. Delivery Fee Revenue
    {
      orderId: order.id,
      type: 'delivery_fee_revenue',
      debitAccount: 'delivery_clearing',
      creditAccount: 'platform_delivery_revenue',
      amount: split.deliveryFee,
      currency: 'BDT',
      referenceId: order.id,
      notes: `Road delivery fee on #${order.id} (${order.roadDistanceKm} km)`,
      createdAt: now,
    },
    // 5. Rider Payout expense
    {
      orderId: order.id,
      type: 'rider_payout',
      debitAccount: 'rider_delivery_expense',
      creditAccount: `rider_payable:${order.riderId || 'unassigned'}`,
      amount: split.riderPayout,
      currency: 'BDT',
      referenceId: order.id,
      notes: `Rider trip compensation for #${order.id}`,
      createdAt: now,
    },
  ];
}

/**
 * Calculates financial reconciliation metrics across orders and ledger
 */
export function computeFinancialReconciliation(
  orders: Order[],
  ledgerEntries: LedgerEntry[]
): FinancialReconciliationSummary {
  const deliveredOrders = orders.filter((o) => o.orderStatus === 'delivered');

  let totalCodDue = 0;
  let totalCodCollected = 0;
  let totalPlatformCommission = 0;
  let totalDeliveryFeeRevenue = 0;
  let totalShopPayables = 0;
  let totalRiderPayouts = 0;

  deliveredOrders.forEach((o) => {
    totalCodDue += o.totalAmount;
    if (o.paymentStatus === 'collected' || o.paymentStatus === 'deposited') {
      totalCodCollected += o.totalAmount;
    }
    const split = calculateOrderFinancialSplit(o);
    totalPlatformCommission += split.platformCommission;
    totalDeliveryFeeRevenue += split.deliveryFee;
    totalShopPayables += split.shopPayable;
    totalRiderPayouts += split.riderPayout;
  });

  // Calculate deposited vs pending handovers from ledger
  let totalCodDeposited = 0;
  ledgerEntries.forEach((entry) => {
    if (entry.type === 'rider_handover') {
      totalCodDeposited += entry.amount;
    }
  });

  const totalPendingHandover = Math.max(0, totalCodCollected - totalCodDeposited);
  const netPlatformProfit =
    totalPlatformCommission + totalDeliveryFeeRevenue - totalRiderPayouts;

  return {
    totalOrdersDelivered: deliveredOrders.length,
    totalCodDue,
    totalCodCollected,
    totalCodDeposited,
    totalPendingHandover,
    totalPlatformCommission,
    totalDeliveryFeeRevenue,
    totalShopPayables,
    totalRiderPayouts,
    netPlatformProfit,
  };
}
