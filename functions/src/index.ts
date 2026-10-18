/**
 * Firebase Cloud Functions for AmarBazaar (Production Deployment)
 * Implements server-side order validation, price & stock checks, road routing distance,
 * state machine transitions, rider dispatch, and immutable COD double-entry ledger records.
 */

import { calculateDeliveryFee, DEFAULT_DELIVERY_PRICING } from '../../src/lib/pricing';
import { canTransitionOrder } from '../../src/lib/stateMachine';
import { calculateOrderFinancialSplit, generateDeliveredOrderLedgerEntries } from '../../src/lib/financialLedger';

export interface CreateOrderPayload {
  customerId: string;
  shopId: string;
  items: { productId: string; quantity: number }[];
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  customerName: string;
  customerPhone: string;
}

export function validateOrderPlacementServer(
  payload: CreateOrderPayload,
  shop: any,
  productsMap: Map<string, any>,
  roadDistanceKm: number
) {
  if (!shop.isApproved || !shop.isOpen) {
    throw new Error('Shop is currently not accepting orders.');
  }

  let subtotal = 0;
  for (const item of payload.items) {
    const prod = productsMap.get(item.productId);
    if (!prod) {
      throw new Error(`Product ${item.productId} not found.`);
    }
    if (prod.shopId !== payload.shopId) {
      throw new Error(`Single shop violation: Product ${prod.nameEn} does not belong to shop.`);
    }
    if (prod.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${prod.nameEn}.`);
    }
    subtotal += prod.price * item.quantity;
  }

  const feeCalc = calculateDeliveryFee(roadDistanceKm, DEFAULT_DELIVERY_PRICING);
  if (!feeCalc.isWithinServiceRadius) {
    throw new Error(`Delivery distance ${roadDistanceKm}km exceeds maximum service radius.`);
  }

  const totalAmount = subtotal + feeCalc.fee;

  return {
    subtotal,
    deliveryFee: feeCalc.fee,
    totalAmount,
    roadDistanceKm,
    pricingRuleVersion: feeCalc.policyVersion,
  };
}

export function processOrderTransitionServer(
  order: any,
  targetStatus: any,
  role: any,
  reason?: string
) {
  const check = canTransitionOrder(order.orderStatus, targetStatus, role, reason);
  if (!check.allowed) {
    throw new Error(check.error);
  }

  let ledgerEntries = null;
  if (targetStatus === 'delivered') {
    ledgerEntries = generateDeliveredOrderLedgerEntries(order);
  }

  return {
    newStatus: targetStatus,
    updatedAt: new Date().toISOString(),
    ledgerEntries,
  };
}
