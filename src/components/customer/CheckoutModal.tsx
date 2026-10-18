import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { Shop, Order } from '../../types';
import {
  MapPin,
  Phone,
  User,
  Truck,
  Banknote,
  AlertCircle,
  FileText,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Shop;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  shop,
  onOrderSuccess,
}) => {
  const { language, t, formatBDT } = useLanguage();
  const { items, subtotal, clearCart } = useCart();
  const { profile } = useAuth();

  const [customerName, setCustomerName] = useState(profile.displayName || 'তানভীর আহমেদ');
  const [customerPhone, setCustomerPhone] = useState(profile.phone || '01711002233');
  const [deliveryAddress, setDeliveryAddress] = useState(
    profile.defaultAddress || 'বাসা ১৮, রোড ৭, ধানমন্ডি, ঢাকা'
  );
  const [orderNotes, setOrderNotes] = useState('');

  // Routing and fee state from backend
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(true);
  const [roadDistanceKm, setRoadDistanceKm] = useState<number>(2.4);
  const [deliveryFee, setDeliveryFee] = useState<number>(50);
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [routingWarning, setRoutingWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Approximate destination coords (Dhanmondi relative to shop)
  const destLat = 23.7461;
  const destLng = 90.3742;

  useEffect(() => {
    if (!isOpen) return;

    async function fetchAuthoritativeRoute() {
      setIsCalculatingRoute(true);
      setErrorMessage(null);
      try {
        const response = await fetch('/api/delivery/calculate-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originLat: shop.lat,
            originLng: shop.lng,
            destLat,
            destLng,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setRoadDistanceKm(data.roadDistanceKm);
          setDeliveryFee(data.deliveryFee);
          setDurationMinutes(data.durationMinutes);
          setRoutingWarning(data.warning || null);
        } else {
          const err = await response.json();
          setErrorMessage(err.error || 'ডেলিভারি হিসাব করতে সমস্যা হয়েছে।');
        }
      } catch (err: any) {
        console.error('Routing calculation error:', err);
      } finally {
        setIsCalculatingRoute(false);
      }
    }

    fetchAuthoritativeRoute();
  }, [isOpen, shop]);

  if (!isOpen) return null;

  const totalAmount = subtotal + deliveryFee;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerPhone || customerPhone.trim().length < 11) {
      setErrorMessage(language === 'bn' ? 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।' : 'Please provide a valid 11-digit mobile number.');
      return;
    }

    if (!deliveryAddress || deliveryAddress.trim().length < 5) {
      setErrorMessage(language === 'bn' ? 'বিস্তারিত ডেলিভারি ঠিকানা দিন।' : 'Please provide a detailed delivery address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customerId: profile.uid,
        shopId: shop.id,
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
        customerName,
        customerPhone,
        deliveryAddress,
        deliveryLat: destLat,
        deliveryLng: destLng,
        notes: orderNotes,
      };

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'অর্ডার করতে ব্যর্থ হয়েছে।');
      }

      const createdOrder: Order = await response.json();
      clearCart();
      onOrderSuccess(createdOrder);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'অর্ডার প্রক্রিয়াকরণে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-emerald-100 my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              ক্যাশ অন ডেলিভারি (COD)
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">{t('checkout')}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg text-lg"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="mt-5 space-y-4">
          {/* Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('namePlaceholder')}</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('phonePlaceholder')}</span>
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('deliveryTo')}</span>
            </label>
            <textarea
              required
              rows={2}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder={t('deliveryAddressPlaceholder')}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Special Instructions */}
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('orderNotes')}</span>
            </label>
            <input
              type="text"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="যেমন: ৩য় তলা, বেল বাজাবেন"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Distance & Delivery Fee Policy Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 text-slate-600">
                <Truck className="w-4 h-4 text-emerald-700" />
                <span>{t('roadDistance')}:</span>
              </div>
              <span className="font-bold text-slate-900">
                {isCalculatingRoute ? 'হিসাব হচ্ছে...' : `${roadDistanceKm} কি.মি`}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 text-slate-600">
                <Clock className="w-4 h-4 text-emerald-700" />
                <span>{t('estimatedTime')}:</span>
              </div>
              <span className="font-semibold text-slate-700">
                ~{durationMinutes} {t('min')}
              </span>
            </div>

            <div className="text-[11px] text-emerald-800 bg-emerald-50/80 p-2 rounded-lg border border-emerald-100 flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">স্বচ্ছ সড়ক দূরত্ব মূল্যনীতি:</span>
                <span>বেস ফি ১ কি.মি পর্যন্ত ৳৩০ + পরবর্তী প্রতি কি.মি বা অংশে ৳১০।</span>
              </div>
            </div>

            {routingWarning && (
              <p className="text-[10px] text-slate-500 italic">
                ℹ️ {routingWarning}
              </p>
            )}
          </div>

          {/* Payment Method Badge */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-xs text-amber-900 font-medium">
            <Banknote className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{t('codOnly')}</span>
          </div>

          {/* Financial Breakdown */}
          <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>{t('subtotal')}</span>
              <span className="font-semibold">{formatBDT(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{t('deliveryFee')}</span>
              <span className="font-semibold text-emerald-700">
                {isCalculatingRoute ? '...' : formatBDT(deliveryFee)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
              <span>{t('totalAmount')}</span>
              <span className="text-base text-emerald-800">{formatBDT(totalAmount)}</span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || isCalculatingRoute}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center space-x-2 shadow-md shadow-emerald-700/20"
          >
            <CheckCircle className="w-4 h-4" />
            <span>
              {isSubmitting ? 'অর্ডার জমা হচ্ছে...' : `${t('placeOrder')} ${formatBDT(totalAmount)}`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
