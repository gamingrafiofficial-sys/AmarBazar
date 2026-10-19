import React, { useState } from 'react';
import { Order, DeliveryRiderAccount, OrderStatus } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { StatusBadge } from '../common/StatusBadge';
import { getNavigationUrl } from '../../lib/maps';
import { calculateOrderFinancialSplit } from '../../lib/financialLedger';
import { SEED_UNIONS } from '../../data/seedData';
import {
  Bike,
  MapPin,
  Phone,
  Navigation,
  CheckCircle,
  XCircle,
  Clock,
  Banknote,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Send,
  BellRing,
  Layers,
} from 'lucide-react';

interface RiderDashboardProps {
  rider: DeliveryRiderAccount;
  allOrders: Order[];
  onAcceptOrder: (orderId: string, rider: DeliveryRiderAccount) => Promise<void>;
  onTransitionOrder: (orderId: string, targetStatus: OrderStatus, reason?: string) => Promise<void>;
  onToggleOnline: (isOnline: boolean) => void;
  onRecordHandover: (riderId: string, amount: number, notes?: string) => Promise<void>;
}

export const RiderDashboard: React.FC<RiderDashboardProps> = ({
  rider,
  allOrders,
  onAcceptOrder,
  onTransitionOrder,
  onToggleOnline,
  onRecordHandover,
}) => {
  const { language, formatBDT } = useLanguage();
  const [failOrderId, setFailOrderId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverAmount, setHandoverAmount] = useState<number>(0);

  // Available new orders strictly routed by customer's union
  // "কোনো Castumer যেই এরিয়া (ইউনিয়ন) সিলেক্ট করে অডার Submit করবে শুধু সেই এরিয়ার Rider কাছে অডার যাবে"
  const incomingAvailableOrders = allOrders.filter((o) => {
    const isUnassigned =
      (!o.riderId || o.riderId === '') &&
      ['pending_shop_confirmation', 'shop_confirmed'].includes(o.orderStatus);
    if (!isUnassigned) return false;

    // If rider has assigned unions, check if order belongs to one of those unions
    if (rider.assignedUnionIds && rider.assignedUnionIds.length > 0) {
      if (o.unionId) {
        return rider.assignedUnionIds.includes(o.unionId);
      }
      return o.thanaId === rider.area || o.marketId === rider.area;
    }

    // Default to matching thana/area
    return o.thanaId === rider.area || o.marketId === rider.area;
  });

  // Deliveries accepted / active for this rider
  const myActiveDeliveries = allOrders.filter(
    (o) =>
      o.riderId === rider.id &&
      ['rider_assigned', 'picked_up', 'out_for_delivery'].includes(o.orderStatus)
  );

  // Completed deliveries for this rider
  const myDeliveredOrders = allOrders.filter(
    (o) => o.riderId === rider.id && o.orderStatus === 'delivered'
  );

  // Total COD cash in hand
  const cashInHand = myDeliveredOrders
    .filter((o) => o.paymentStatus === 'collected')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // Rider earnings
  const riderTotalEarnings = myDeliveredOrders.reduce((sum, o) => {
    const split = calculateOrderFinancialSplit(o);
    return sum + split.riderPayout;
  }, 0);

  const handleClaimOrder = async (orderId: string) => {
    setIsProcessing(true);
    await onAcceptOrder(orderId, rider);
    setIsProcessing(false);
  };

  const handleNextStep = async (order: Order) => {
    setIsProcessing(true);
    let nextStatus: OrderStatus = 'picked_up';

    if (order.orderStatus === 'rider_assigned') {
      nextStatus = 'picked_up';
    } else if (order.orderStatus === 'picked_up') {
      nextStatus = 'out_for_delivery';
    } else if (order.orderStatus === 'out_for_delivery') {
      nextStatus = 'delivered';
    }

    await onTransitionOrder(order.id, nextStatus);
    setIsProcessing(false);
  };

  const handleConfirmFail = async () => {
    if (!failOrderId || !failReason.trim()) return;
    setIsProcessing(true);
    await onTransitionOrder(failOrderId, 'delivery_failed', failReason);
    setIsProcessing(false);
    setFailOrderId(null);
    setFailReason('');
  };

  const handleHandoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (handoverAmount <= 0) return;
    setIsProcessing(true);
    await onRecordHandover(rider.id, handoverAmount, `Rider ${rider.name} COD handover`);
    setIsProcessing(false);
    setShowHandoverModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Rider Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0 border border-amber-200">
            <Bike className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900">{rider.name}</h1>
              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                রাইডার আইডি: {rider.id}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-mono">{rider.phone}</span>
              </span>
              <span>•</span>
              <span className="font-bold text-slate-700">
                থানা: {rider.area === 'kapasia' ? 'কাপাসিয়া' : 'কালীগঞ্জ'}
              </span>
            </div>

            {/* Assigned Unions Badges */}
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <span className="text-[11px] font-bold text-slate-600 mr-1 flex items-center gap-1">
                <Layers className="w-3 h-3 text-emerald-700" />
                <span>নির্ধারিত ইউনিয়ন ({rider.assignedUnionIds?.length || 0}টি):</span>
              </span>
              {rider.assignedUnionIds && rider.assignedUnionIds.length > 0 ? (
                rider.assignedUnionIds.map((uId) => {
                  const uObj = SEED_UNIONS.find((u) => u.id === uId);
                  return (
                    <span
                      key={uId}
                      className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    >
                      {uObj ? uObj.nameBn : uId}
                    </span>
                  );
                })
              ) : (
                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  সকল ইউনিয়ন
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Online / Offline Toggle */}
        <div className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-700">ডিউটি স্ট্যাটাস:</span>
          <button
            onClick={() => onToggleOnline(!rider.isOnline)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 ${
              rider.isOnline
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/30'
                : 'bg-slate-400 text-white'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${rider.isOnline ? 'bg-amber-300 animate-ping' : 'bg-slate-200'}`}></span>
            <span>{rider.isOnline ? 'অনলাইন (কাজের জন্য প্রস্তুত)' : 'অফলাইন'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">হাতে থাকা নগদ ক্যাশ (COD)</span>
          <span className="text-2xl font-black text-rose-700 mt-1 block">
            {formatBDT(cashInHand)}
          </span>
          {cashInHand > 0 && (
            <button
              onClick={() => {
                setHandoverAmount(cashInHand);
                setShowHandoverModal(true);
              }}
              className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              এডমিন অফিসে জমা দিন
            </button>
          )}
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">মোট ট্রিপ আয় (Earnings)</span>
          <span className="text-2xl font-black text-emerald-800 mt-1 block">
            {formatBDT(riderTotalEarnings)}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">
            প্রতি ট্রিপ ৳২৫ + দূরত্ব বোনাস
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">সফল ডেলিভারি সংখ্যা</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {myDeliveredOrders.length} টি
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
            সক্রিয় ডেলিভারি ফ্লিট
          </span>
        </div>
      </div>

      {/* SECTION 1: INCOMING ORDERS (Real-time accept for online riders) */}
      {rider.isOnline ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-emerald-700 animate-bounce" />
              <span>নতুন কাস্টমার অর্ডারসমূহ (গ্রহণের জন্য উন্মুক্ত)</span>
              <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-2 py-0.5 rounded-full">
                {incomingAvailableOrders.length}
              </span>
            </h2>
          </div>

          {incomingAvailableOrders.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              এই মুহূর্তে কোনো আন-অ্যাসাইন্ড অর্ডার নেই। কাস্টমার নতুন অর্ডার করলেই এখানে শো করবে।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incomingAvailableOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border-2 border-amber-300 p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3 flex-wrap gap-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          #{order.id}
                        </span>
                        {order.unionNameBn && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {order.unionNameBn}
                          </span>
                        )}
                      </div>
                      <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-md">
                        নগদ আদায়: {formatBDT(order.totalAmount)}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                      <p className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>গন্তব্য: <strong className="text-slate-800">{order.deliveryAddress}</strong></span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        গ্রাহক: {order.customerName} ({order.customerPhone})
                      </p>
                      <p className="text-[11px] text-slate-500">
                        পণ্য সংখ্যা: {order.items.length} আইটেম ({formatBDT(order.subtotal)})
                      </p>
                      <p className="text-[11px] text-emerald-700 font-semibold">
                        সড়ক দূরত্ব: {order.roadDistanceKm} কি.মি
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleClaimOrder(order.id)}
                    disabled={isProcessing}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>অর্ডার গ্রহণ করুন (Accept Delivery)</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-8 p-4 bg-slate-100 rounded-2xl border border-slate-200 text-center text-xs text-slate-600">
          ⚠️ আপনি অফলাইনে আছেন। নতুন অর্ডার পাওয়ার জন্য উপরে <strong>'অনলাইন'</strong> বাটন চালু করুন।
        </div>
      )}

      {/* SECTION 2: MY ACTIVE DELIVERIES */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Bike className="w-4 h-4 text-emerald-700" />
          <span>আমার গৃহীত সক্রিয় ডেলিভারি ({myActiveDeliveries.length})</span>
        </h2>

        {myActiveDeliveries.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            আপনার কোনো সক্রিয় ডেলিভারি চলমান নেই।
          </div>
        ) : (
          <div className="space-y-4">
            {myActiveDeliveries.map((order) => {
              const navUrl = getNavigationUrl(order.deliveryLat, order.deliveryLng);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl border-2 border-emerald-500 p-5 sm:p-6 shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-800">
                        #{order.id}
                      </span>
                      <StatusBadge status={order.orderStatus} size="sm" />
                    </div>
                    <div className="bg-emerald-50 text-emerald-900 px-3 py-1 rounded-xl text-xs font-bold border border-emerald-200">
                      গ্রাহক থেকে প্রদেয়: {formatBDT(order.totalAmount)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                      <span className="font-bold text-slate-700 block">ডেলিভারি ঠিকানা ও ফোন:</span>
                      <p className="font-semibold text-slate-900">{order.customerName}</p>
                      <p className="text-slate-600">{order.deliveryAddress}</p>
                      <div className="pt-1 flex items-center gap-2">
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{order.customerPhone}</span>
                        </a>
                        <a
                          href={navUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 font-bold flex items-center gap-1 hover:underline"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>গুগল ম্যাপে পথ দেখুন</span>
                        </a>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                      <span className="font-bold text-slate-700 block">পণ্য তালিকা:</span>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {order.items.map((it) => (
                          <div key={it.productId} className="flex justify-between text-slate-600">
                            <span>{it.nameBn} x {it.quantity} {it.unit}</span>
                            <span className="font-semibold">{formatBDT(it.lineTotal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rider Milestone Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    {order.orderStatus === 'rider_assigned' && (
                      <button
                        onClick={() => handleNextStep(order)}
                        disabled={isProcessing}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>পণ্য সংগ্রহ করেছি (Mark Picked Up)</span>
                      </button>
                    )}

                    {order.orderStatus === 'picked_up' && (
                      <button
                        onClick={() => handleNextStep(order)}
                        disabled={isProcessing}
                        className="flex-1 bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>গ্রাহকের উদ্দেশ্যে রওনা হয়েছি (Out for Delivery)</span>
                      </button>
                    )}

                    {order.orderStatus === 'out_for_delivery' && (
                      <button
                        onClick={() => handleNextStep(order)}
                        disabled={isProcessing}
                        className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>ডেলিভারি সম্পন্ন ও ক্যাশ পেয়েছি ({formatBDT(order.totalAmount)})</span>
                      </button>
                    )}

                    <button
                      onClick={() => setFailOrderId(order.id)}
                      disabled={isProcessing}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold py-2.5 px-4 rounded-xl text-xs"
                    >
                      ব্যর্থ ডেলিভারি
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Failure Reason Modal */}
      {failOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200">
            <h3 className="font-bold text-slate-900 text-sm mb-2">
              ডেলিভারি ব্যর্থ হওয়ার কারণ
            </h3>
            <textarea
              rows={3}
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              placeholder="যেমন: গ্রাহক রিসিভ করেননি, ঠিকানা খুঁজে পাওয়া যায়নি..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleConfirmFail}
                disabled={!failReason.trim() || isProcessing}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-xl text-xs disabled:opacity-40"
              >
                নিশ্চিত করুন
              </button>
              <button
                onClick={() => setFailOrderId(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl text-xs"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handover Modal */}
      {showHandoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-emerald-200">
            <h3 className="font-bold text-slate-900 text-sm mb-2">
              এডমিন অফিসে ক্যাশ জমা দিন
            </h3>
            <form onSubmit={handleHandoverSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">জমার পরিমাণ (৳)</label>
                <input
                  type="number"
                  min="1"
                  max={cashInHand}
                  value={handoverAmount}
                  onChange={(e) => setHandoverAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-900"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl"
                >
                  জমা নিশ্চিত করুন
                </button>
                <button
                  type="button"
                  onClick={() => setShowHandoverModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl"
                >
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
