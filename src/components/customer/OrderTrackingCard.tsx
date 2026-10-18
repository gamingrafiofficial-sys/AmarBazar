import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { StatusBadge } from '../common/StatusBadge';
import {
  Package,
  Store,
  MapPin,
  Bike,
  CheckCircle2,
  Clock,
  XCircle,
  Phone,
  HelpCircle,
} from 'lucide-react';

interface OrderTrackingCardProps {
  order: Order;
  onCancelOrder: (orderId: string, reason: string) => Promise<void>;
}

export const OrderTrackingCard: React.FC<OrderTrackingCardProps> = ({
  order,
  onCancelOrder,
}) => {
  const { language, t, formatBDT } = useLanguage();
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);

  const canCancel = order.orderStatus === 'pending_shop_confirmation';

  const steps: { key: OrderStatus; labelBn: string; labelEn: string }[] = [
    { key: 'pending_shop_confirmation', labelBn: 'অর্ডার পাঠানো হয়েছে', labelEn: 'Order Placed' },
    { key: 'shop_confirmed', labelBn: 'দোকানে গৃহীত', labelEn: 'Shop Confirmed' },
    { key: 'rider_assigned', labelBn: 'রাইডার প্রস্তুত', labelEn: 'Rider Assigned' },
    { key: 'picked_up', labelBn: 'পণ্য সংগ্রহ', labelEn: 'Picked Up' },
    { key: 'out_for_delivery', labelBn: 'ডেলিভারিতে বের হয়েছে', labelEn: 'Out for Delivery' },
    { key: 'delivered', labelBn: 'ডেলিভারি সম্পন্ন', labelEn: 'Delivered' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === order.orderStatus);
  const isFailedOrCancelled = ['shop_rejected', 'delivery_failed', 'cancelled', 'returned'].includes(
    order.orderStatus
  );

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) return;
    setIsCancelling(true);
    await onCancelOrder(order.id, cancelReason);
    setIsCancelling(false);
    setShowCancelPrompt(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-bold text-slate-500">
              #{order.id}
            </span>
            <StatusBadge status={order.orderStatus} size="sm" />
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
            {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="text-right">
          <span className="text-base font-extrabold text-emerald-800">
            {formatBDT(order.totalAmount)}
          </span>
          <span className="text-[10px] text-slate-500 block">
            (পণ্য: {formatBDT(order.subtotal)} + ডেলিভারি: {formatBDT(order.deliveryFee)})
          </span>
        </div>
      </div>

      {/* Progress Milestone Line */}
      {!isFailedOrCancelled && (
        <div className="py-5 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[500px] relative">
            <div className="absolute top-3 left-4 right-4 h-0.5 bg-slate-200 z-0">
              <div
                className="h-full bg-emerald-600 transition-all duration-500"
                style={{
                  width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%`,
                }}
              />
            </div>

            {steps.map((step, idx) => {
              const isPast = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={step.key} className="flex flex-col items-center z-10 text-center w-20">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isCurrent
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 animate-pulse'
                        : isPast
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border-2 border-slate-200 text-slate-400'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] mt-1.5 font-medium leading-tight ${
                      isCurrent ? 'text-emerald-800 font-bold' : isPast ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {language === 'bn' ? step.labelBn : step.labelEn}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rejection / Failure Notice */}
      {isFailedOrCancelled && (
        <div className="my-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start space-x-2">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">
              {t(order.orderStatus)}
            </span>
            <p className="mt-0.5 text-rose-700">
              কারণ: {order.rejectionReason || order.failureReason || order.cancellationReason || 'প্রযোজ্য নয়'}
            </p>
          </div>
        </div>
      )}

      {/* Details Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
        <div>
          <span className="text-slate-500 block mb-1 flex items-center gap-1">
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            <span>দোকানের বিবরণ:</span>
          </span>
          <span className="font-bold text-slate-900 block">
            {language === 'bn' ? order.shopNameBn : order.shopNameEn}
          </span>
          <span className="text-slate-600 text-[11px] block">{order.shopAddressEn}</span>
        </div>

        <div>
          <span className="text-slate-500 block mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>ডেলিভারি গন্তব্য:</span>
          </span>
          <span className="font-semibold text-slate-800 block">{order.deliveryAddress}</span>
          <span className="text-[11px] text-emerald-700 font-medium">
            সড়ক দূরত্ব: {order.roadDistanceKm} কি.মি
          </span>
        </div>
      </div>

      {/* Items list */}
      <div className="mt-3 divide-y divide-slate-100 text-xs">
        {order.items.map((item) => (
          <div key={item.productId} className="py-1.5 flex justify-between items-center text-slate-700">
            <span>
              {language === 'bn' ? item.nameBn : item.nameEn} x {item.quantity} {item.unit}
            </span>
            <span className="font-semibold">{formatBDT(item.lineTotal)}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>হেল্পলাইন: 09612-BAZAAR (২৪/৭ সহায়তা)</span>
        </div>

        {canCancel && !showCancelPrompt && (
          <button
            onClick={() => setShowCancelPrompt(true)}
            className="text-xs text-rose-600 hover:text-rose-700 font-semibold border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
          >
            অর্ডার বাতিল করুন
          </button>
        )}
      </div>

      {/* Cancel Prompt Dialog */}
      {showCancelPrompt && (
        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs">
          <p className="font-semibold text-rose-800">
            অর্ডার বাতিলের কারণ লিখুন:
          </p>
          <input
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="যেমন: ভুল পণ্য অর্ডার করেছি বা পরে কিনবো"
            className="w-full text-xs p-2 rounded-lg border border-rose-200 bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={handleConfirmCancel}
              disabled={isCancelling || !cancelReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg disabled:opacity-40"
            >
              {isCancelling ? 'বাতিল হচ্ছে...' : 'বাতিল নিশ্চিত করুন'}
            </button>
            <button
              onClick={() => setShowCancelPrompt(false)}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium px-3 py-1.5 rounded-lg"
            >
              বন্ধ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
