import { OrderStatus, UserRole } from '../types';

export interface StateTransitionRule {
  from: OrderStatus;
  to: OrderStatus;
  allowedRoles: UserRole[];
  requiresReason?: boolean;
}

export const ORDER_STATE_TRANSITIONS: StateTransitionRule[] = [
  // Shop confirms order
  {
    from: 'pending_shop_confirmation',
    to: 'shop_confirmed',
    allowedRoles: ['shopkeeper', 'admin'],
  },
  // Shop rejects order
  {
    from: 'pending_shop_confirmation',
    to: 'shop_rejected',
    allowedRoles: ['shopkeeper', 'admin'],
    requiresReason: true,
  },
  // Customer cancels order before shop confirms
  {
    from: 'pending_shop_confirmation',
    to: 'cancelled',
    allowedRoles: ['customer', 'admin'],
    requiresReason: true,
  },
  // Admin assigns rider (or auto-dispatch)
  {
    from: 'shop_confirmed',
    to: 'rider_assigned',
    allowedRoles: ['admin'],
  },
  // Rider picks up from shop
  {
    from: 'rider_assigned',
    to: 'picked_up',
    allowedRoles: ['rider', 'admin'],
  },
  // Rider starts transit to customer
  {
    from: 'picked_up',
    to: 'out_for_delivery',
    allowedRoles: ['rider', 'admin'],
  },
  // Rider delivers to customer and collects COD
  {
    from: 'out_for_delivery',
    to: 'delivered',
    allowedRoles: ['rider', 'admin'],
  },
  // Delivery failed (customer unreachable, wrong address, etc.)
  {
    from: 'out_for_delivery',
    to: 'delivery_failed',
    allowedRoles: ['rider', 'admin'],
    requiresReason: true,
  },
  // Customer rejects at doorstep / returned to shop
  {
    from: 'delivery_failed',
    to: 'returned',
    allowedRoles: ['rider', 'admin'],
    requiresReason: true,
  },
  // Admin emergency cancellation override from early states
  {
    from: 'shop_confirmed',
    to: 'cancelled',
    allowedRoles: ['admin'],
    requiresReason: true,
  },
  {
    from: 'rider_assigned',
    to: 'cancelled',
    allowedRoles: ['admin'],
    requiresReason: true,
  },
];

export const TERMINAL_ORDER_STATES: OrderStatus[] = [
  'delivered',
  'cancelled',
  'shop_rejected',
  'returned',
];

export function canTransitionOrder(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
  userRole: UserRole,
  reason?: string
): { allowed: boolean; error?: string } {
  if (currentStatus === targetStatus) {
    return { allowed: false, error: 'Order is already in the target status.' };
  }

  if (TERMINAL_ORDER_STATES.includes(currentStatus) && userRole !== 'admin') {
    return {
      allowed: false,
      error: `Order is in terminal state '${currentStatus}' and cannot be altered.`,
    };
  }

  const matchingRule = ORDER_STATE_TRANSITIONS.find(
    (rule) => rule.from === currentStatus && rule.to === targetStatus
  );

  if (!matchingRule) {
    return {
      allowed: false,
      error: `Invalid transition from '${currentStatus}' to '${targetStatus}'.`,
    };
  }

  if (!matchingRule.allowedRoles.includes(userRole)) {
    return {
      allowed: false,
      error: `Role '${userRole}' is not authorized to transition order to '${targetStatus}'.`,
    };
  }

  if (matchingRule.requiresReason && (!reason || reason.trim().length === 0)) {
    return {
      allowed: false,
      error: `A mandatory reason must be provided for status '${targetStatus}'.`,
    };
  }

  return { allowed: true };
}
