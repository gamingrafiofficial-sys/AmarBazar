import { DeliveryPricingPolicy } from '../types';

export const DEFAULT_DELIVERY_PRICING: DeliveryPricingPolicy = {
  id: 'policy-default-v1',
  version: 'v1.0-bd-standard',
  baseFee: 30, // ৳30 base fee
  includedKm: 1.0, // First 1 km included
  perKmFee: 10, // ৳10 per started km
  maxDeliveryDistanceKm: 15.0, // Max delivery radius for own fleet
  isActive: true,
  updatedAt: new Date().toISOString(),
};

export interface DeliveryCalculationResult {
  fee: number;
  roadDistanceKm: number;
  policyVersion: string;
  isWithinServiceRadius: boolean;
  breakdown: {
    baseFee: number;
    includedKm: number;
    additionalDistanceKm: number;
    additionalChargedKm: number;
    perKmFee: number;
    additionalFee: number;
  };
}

/**
 * Calculates delivery fee according to the marketplace formula:
 * fee = baseFee + Math.ceil(Math.max(0, roadDistanceKm - includedKm)) * perKmFee
 * 
 * Example:
 * 1.0 km -> 30 + ceil(0) * 10 = 30 BDT
 * 2.0 km -> 30 + ceil(1.0) * 10 = 40 BDT
 * 2.4 km -> 30 + ceil(1.4) * 10 = 50 BDT
 */
export function calculateDeliveryFee(
  roadDistanceKm: number,
  policy: DeliveryPricingPolicy = DEFAULT_DELIVERY_PRICING
): DeliveryCalculationResult {
  if (roadDistanceKm < 0 || isNaN(roadDistanceKm)) {
    throw new Error('Invalid road distance: must be non-negative number.');
  }

  const isWithinServiceRadius = roadDistanceKm <= policy.maxDeliveryDistanceKm;
  const excessKm = Math.max(0, roadDistanceKm - policy.includedKm);
  const additionalChargedKm = Math.ceil(excessKm);
  const additionalFee = additionalChargedKm * policy.perKmFee;
  const totalFee = Math.round(policy.baseFee + additionalFee);

  return {
    fee: totalFee,
    roadDistanceKm: Number(roadDistanceKm.toFixed(2)),
    policyVersion: policy.version,
    isWithinServiceRadius,
    breakdown: {
      baseFee: policy.baseFee,
      includedKm: policy.includedKm,
      additionalDistanceKm: Number(excessKm.toFixed(2)),
      additionalChargedKm,
      perKmFee: policy.perKmFee,
      additionalFee,
    },
  };
}

/**
 * Haversine straight-line distance in kilometers between two geo-coordinates
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Road curvature multiplier for Dhaka and Bangladeshi urban terrain.
 * Urban roads in Dhaka/Chittagong have average route winding factor of 1.35x - 1.45x
 * when compared to direct Euclidean distance.
 */
export const URBAN_ROAD_FACTOR = 1.38;

export function estimateUrbanRoadDistance(straightLineKm: number): number {
  return Number((straightLineKm * URBAN_ROAD_FACTOR).toFixed(2));
}
