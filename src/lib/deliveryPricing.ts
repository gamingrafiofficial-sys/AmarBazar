import { DistanceTier, DeliveryPricingConfig, Product, CartItem } from '../types';

export interface DistanceTierOption {
  id: DistanceTier;
  labelBn: string;
  labelEn: string;
  approxKm: number;
}

export const DISTANCE_TIER_OPTIONS: DistanceTierOption[] = [
  { id: '0-1', labelBn: '০–১ কিমি', labelEn: '0–1 km', approxKm: 0.8 },
  { id: '1-2', labelBn: '১–২ কিমি', labelEn: '1–2 km', approxKm: 1.5 },
  { id: '2-3', labelBn: '২–৩ কিমি', labelEn: '2–3 km', approxKm: 2.5 },
  { id: '3-4', labelBn: '৩–৪ কিমি', labelEn: '3–4 km', approxKm: 3.5 },
  { id: '4-5', labelBn: '৪–৫ কিমি', labelEn: '4–5 km', approxKm: 4.5 },
  { id: '5-6', labelBn: '৫–৬ কিমি', labelEn: '5–6 km', approxKm: 5.5 },
  { id: '6-8', labelBn: '৬–৮ কিমি', labelEn: '6–8 km', approxKm: 7.0 },
  { id: '8-10', labelBn: '৮–১০ কিমি', labelEn: '8–10 km', approxKm: 9.0 },
  { id: '10+', labelBn: '১০ কিমির বেশি', labelEn: '10+ km', approxKm: 12.0 },
];

export const DEFAULT_DELIVERY_PRICING_CONFIG: DeliveryPricingConfig = {
  distanceRates: {
    '0-1': 30, // ০–১ কিমি = ৳৩০
    '1-2': 35, // ১–২ কিমি = ৳৩৫
    '2-3': 40, // ২–৩ কিমি = ৳৪০
    '3-4': 45, // ৩–৪ কিমি = ৳৪৫
    '4-5': 50, // ৪–৫ কিমি = ৳৫০
    '5-6': 55, // ৫–৬ কিমি = ৳৫৫
    '6-8': 65, // ৬–৮ কিমি = ৳৬৫
    '8-10': 80, // ৮–১০ কিমি = ৳৮০
    '10+': 100, // ১০ কিমির বেশি = Admin নির্ধারিত চার্জ
  },
  weightRates: {
    '0-1': 0, // ০–১ কেজি = ৳০
    '1-2': 10, // ১–২ কেজি = ৳১০
    '2-4': 20, // ২–৪ কেজি = ৳২০
    '4-6': 30, // ৪–৬ কেজি = ৳৩০
    '6-8': 35, // ৬–৮ কেজি = ৳৩৫
    '8-15': 50, // ৮–১৫ কেজি = Admin নির্ধারিত চার্জ (default ৳50)
    '15-25': 70, // ১৫–২৫ কেজি = Admin নির্ধারিত চার্জ (default ৳70)
    exact_25: 45, // ঠিক ২৫ কেজি = ৳৪৫
    above_25: 100, // ২৫ কেজির বেশি = Admin নির্ধারিত চার্জ অথবা বিশেষ ডেলিভারি
  },
  specialHandlingFee: 0,
};

/**
 * Calculates item weight in KG based on quantity, unit, and product name attributes.
 */
export function calculateItemWeightKg(item: { product: Product; quantity: number }): number {
  const { product, quantity } = item;
  const unit = product.unit || 'kg';
  const name = (product.nameBn + ' ' + product.nameEn).toLowerCase();

  // 1. Explicit Gas Cylinders
  if (name.includes('১২ কেজি') || name.includes('12 kg') || name.includes('12kg')) {
    return 12.0 * quantity;
  }
  if (name.includes('৩৫ কেজি') || name.includes('35 kg') || name.includes('35kg')) {
    return 35.0 * quantity;
  }
  if (name.includes('৪৫ কেজি') || name.includes('45 kg') || name.includes('45kg')) {
    return 45.0 * quantity;
  }

  // 2. Kilogram Unit
  if (unit === 'kg') {
    return Math.max(0.1, Number(quantity) * 1.0);
  }

  // 3. Liter / Litre
  if (unit === 'liter' || unit === 'litre') {
    if (name.includes('৩ লিটার') || name.includes('3 liter')) return 3.0 * quantity;
    if (name.includes('৫ লিটার') || name.includes('5 liter')) return 5.0 * quantity;
    if (name.includes('১০ লিটার') || name.includes('10 liter')) return 10.0 * quantity;
    return Math.max(0.2, Number(quantity) * 1.0);
  }

  // 4. Grams
  if (unit === 'gm') {
    if (name.includes('৫০০ গ্রাম') || name.includes('500gm')) return 0.5 * quantity;
    return Math.max(0.1, Number(quantity) * 0.25);
  }

  // 5. Milliliters
  if (unit === 'ml') {
    if (name.includes('২৫০') || name.includes('250')) return 0.25 * quantity;
    if (name.includes('৫০০') || name.includes('500')) return 0.5 * quantity;
    return Math.max(0.1, Number(quantity) * 0.25);
  }

  // 6. Packs / Pieces with weight hints in title
  if (name.includes('২৫ কেজি') || name.includes('25kg') || name.includes('25 kg')) {
    return 25.0 * quantity;
  }
  if (name.includes('৫ কেজি') || name.includes('5kg') || name.includes('5 kg')) {
    return 5.0 * quantity;
  }
  if (name.includes('২ কেজি') || name.includes('2kg') || name.includes('2 kg')) {
    return 2.0 * quantity;
  }
  if (name.includes('১ লিটার') || name.includes('1l') || name.includes('1 liter')) {
    return 1.0 * quantity;
  }

  // Default piece / pack weight
  return Math.max(0.1, Number(quantity) * 0.25);
}

/**
 * Calculates total weight of all cart items in KG (rounded to 2 decimal places).
 */
export function calculateCartTotalWeightKg(items: { product: Product; quantity: number }[]): number {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const rawSum = items.reduce((sum, item) => sum + calculateItemWeightKg(item), 0);
  return Number(rawSum.toFixed(2));
}

export interface CalculatedDeliveryFeeBreakdown {
  distanceTier: DistanceTier;
  distanceTierLabelBn: string;
  distanceCharge: number;
  totalWeightKg: number;
  weightTierLabelBn: string;
  weightCharge: number;
  specialHandlingFee: number;
  totalDeliveryCharge: number;
}

/**
 * Authoritative Distance & Weight-Based Delivery Charge Engine
 *
 * Total Delivery Charge = Distance Charge + Weight Additional Charge + Special Handling Fee
 */
export function calculateDeliveryChargeBreakdown(
  distanceTier: DistanceTier | string = '0-1',
  totalWeightKg: number = 0,
  pricingConfig: DeliveryPricingConfig = DEFAULT_DELIVERY_PRICING_CONFIG
): CalculatedDeliveryFeeBreakdown {
  const validTier: DistanceTier = [
    '0-1',
    '1-2',
    '2-3',
    '3-4',
    '4-5',
    '5-6',
    '6-8',
    '8-10',
    '10+',
  ].includes(distanceTier as any)
    ? (distanceTier as DistanceTier)
    : '0-1';

  const tierOption = DISTANCE_TIER_OPTIONS.find((opt) => opt.id === validTier) || DISTANCE_TIER_OPTIONS[0];

  // 1. Distance Charge
  const distanceCharge =
    pricingConfig.distanceRates[validTier] !== undefined
      ? Number(pricingConfig.distanceRates[validTier])
      : DEFAULT_DELIVERY_PRICING_CONFIG.distanceRates[validTier] || 30;

  // 2. Weight-Based Additional Charge (Strict non-overlapping tiers)
  let weightCharge = 0;
  let weightTierLabelBn = '০–১ কেজি (৳০)';

  const weight = Number(totalWeightKg.toFixed(2));

  if (weight <= 1.0) {
    weightCharge = pricingConfig.weightRates['0-1'] ?? 0;
    weightTierLabelBn = '০–১ কেজি';
  } else if (weight <= 2.0) {
    weightCharge = pricingConfig.weightRates['1-2'] ?? 10;
    weightTierLabelBn = '১–২ কেজি';
  } else if (weight <= 4.0) {
    weightCharge = pricingConfig.weightRates['2-4'] ?? 20;
    weightTierLabelBn = '২–৪ কেজি';
  } else if (weight <= 6.0) {
    weightCharge = pricingConfig.weightRates['4-6'] ?? 30;
    weightTierLabelBn = '৪–৬ কেজি';
  } else if (weight <= 8.0) {
    weightCharge = pricingConfig.weightRates['6-8'] ?? 35;
    weightTierLabelBn = '৬–৮ কেজি';
  } else if (weight < 15.0) {
    weightCharge = pricingConfig.weightRates['8-15'] ?? 50;
    weightTierLabelBn = '৮–১৫ কেজি';
  } else if (weight < 25.0) {
    weightCharge = pricingConfig.weightRates['15-25'] ?? 70;
    weightTierLabelBn = '১৫–২৫ কেজি';
  } else if (Math.abs(weight - 25.0) <= 0.05) {
    // Exactly 25 kg special rule: "ঠিক ২৫ কেজি = ৳৪৫"
    weightCharge = pricingConfig.weightRates.exact_25 ?? 45;
    weightTierLabelBn = 'ঠিক ২৫ কেজি';
  } else {
    // Greater than 25 kg: "২৫ কেজির বেশি = Admin নির্ধারিত চার্জ অথবা বিশেষ ডেলিভারি"
    weightCharge = pricingConfig.weightRates.above_25 ?? 100;
    weightTierLabelBn = '২৫ কেজির বেশি (বিশেষ ডেলিভারি)';
  }

  const specialHandlingFee = pricingConfig.specialHandlingFee || 0;
  const totalDeliveryCharge = Math.max(0, distanceCharge + weightCharge + specialHandlingFee);

  return {
    distanceTier: validTier,
    distanceTierLabelBn: tierOption.labelBn,
    distanceCharge,
    totalWeightKg: weight,
    weightTierLabelBn,
    weightCharge,
    specialHandlingFee,
    totalDeliveryCharge,
  };
}

export function getEstimatedKmFromTier(tier: DistanceTier | string): number {
  const opt = DISTANCE_TIER_OPTIONS.find((o) => o.id === tier);
  return opt ? opt.approxKm : 1.5;
}

export function getTierFromKm(km: number): DistanceTier {
  if (km <= 1.0) return '0-1';
  if (km <= 2.0) return '1-2';
  if (km <= 3.0) return '2-3';
  if (km <= 4.0) return '3-4';
  if (km <= 5.0) return '4-5';
  if (km <= 6.0) return '5-6';
  if (km <= 8.0) return '6-8';
  if (km <= 10.0) return '8-10';
  return '10+';
}
