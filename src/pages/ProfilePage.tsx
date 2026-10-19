import React, { useState } from 'react';
import { CustomerAccount, Order, OrderStatus } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  User,
  Phone,
  MapPin,
  Calendar,
  Package,
  Clock,
  CheckCircle2,
  Bike,
  LogOut,
  ShoppingBag,
  ArrowLeft,
  FileText,
  AlertCircle,
  Truck,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import { OrderChatModal } from '../components/common/OrderChatModal';
import { OrderNoteSection } from '../components/common/OrderNoteSection';

interface ProfilePageProps {
  customer: CustomerAccount;
  orders: Order[];
  onLogout: () => void;
  onBackToShop: () => void;
  onViewOrderMemo: (order: Order) => void;
  onCancelOrder: (orderId: string, reason: string) => Promise<void>;
  onSendMessage?: (orderId: string, text: string) => Promise<void>;
  onUpdateOrderNote?: (orderId: string, notes: string) => Promise<void>;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  customer,
  orders,
  onLogout,
  onBackToShop,
  onViewOrderMemo,
  onCancelOrder,
  onSendMessage,
  onUpdateOrderNote,
}) => {
  const { language, formatBDT } = useLanguage();
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'delivered'>('all');
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);

  // Filter orders specifically for this customer
  const cleanCustomerPhone = customer.phone.replace(/\s+/g, '');
  const customerOrders = orders.filter(
    (o) =>
      o.customerId === customer.id ||
      (o.customerPhone && o.customerPhone.replace(/\s+/g, '') === cleanCustomerPhone)
  );

  // Stats calculation
  const totalOrdersCount = customerOrders.length;
  const activeOrders = customerOrders.filter(
    (o) =>
      o.orderStatus !== 'delivered' &&
      o.orderStatus !== 'cancelled' &&
      o.orderStatus !== 'shop_rejected' &&
      o.orderStatus !== 'delivery_failed'
  );
  const deliveredOrders = customerOrders.filter((o) => o.orderStatus === 'delivered');
  const totalSpent = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  // Orders displayed according to selected filter
  const displayedOrders = customerOrders.filter((o) => {
    if (filterTab === 'active') {
      return (
        o.orderStatus !== 'delivered' &&
        o.orderStatus !== 'cancelled' &&
        o.orderStatus !== 'shop_rejected'
      );
    }
    if (filterTab === 'delivered') {
      return o.orderStatus === 'delivered';
    }
    return true;
  });

  const handleConfirmCancel = async () => {
    if (!cancellingOrderId || !cancelReason.trim()) return;
    setIsCancelling(true);
    await onCancelOrder(cancellingOrderId, cancelReason);
    setIsCancelling(false);
    setCancellingOrderId(null);
    setCancelReason('');
  };

  // Helper for tracking progress steps
  const getProgressStep = (status: OrderStatus): number => {
    switch (status) {
      case 'pending_shop_confirmation':
        return 1;
      case 'shop_confirmed':
        return 2;
      case 'rider_assigned':
      case 'picked_up':
        return 3;
      case 'out_for_delivery':
        return 4;
      case 'delivered':
        return 5;
      default:
        return 1;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 animate-in fade-in duration-200">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
        <button
          onClick={onBackToShop}
          className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'bn' ? 'হোমে ফিরে যান' : 'Back to Shop'}</span>
        </button>

        <span className="text-xs font-semibold text-slate-500">
          গ্রাহক প্রোফাইল ও অর্ডার ট্র্যাকিং
        </span>
      </div>

      {/* 1. CUSTOMER PROFILE CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md">
                {customer.name ? customer.name.slice(0, 1) : 'গ'}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                  {customer.name}
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  ভেরিফাইড গ্রাহক
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 flex items-center gap-1 mt-0.5 font-mono">
                <Phone className="w-3.5 h-3.5 text-emerald-700" />
                <span>{customer.phone}</span>
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="line-clamp-1">{customer.address}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <LogOut className="w-4 h-4" />
              <span>লগআউট করুন</span>
            </button>
          </div>
        </div>

        {/* 2. STATS COUNTERS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
            <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-emerald-700" />
              <span>মোট অর্ডার</span>
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
              {totalOrdersCount}
            </p>
          </div>

          <div className="bg-amber-50/60 border border-amber-200/80 p-3.5 rounded-2xl">
            <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>চলমান ডেলিভারি</span>
            </p>
            <p className="text-xl sm:text-2xl font-black text-amber-900 mt-1 font-mono">
              {activeOrders.length}
            </p>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200/80 p-3.5 rounded-2xl">
            <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>সফল ডেলিভারি</span>
            </p>
            <p className="text-xl sm:text-2xl font-black text-emerald-900 mt-1 font-mono">
              {deliveredOrders.length}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
            <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-slate-600" />
              <span>মোট কেনাকাটা</span>
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
              {formatBDT(totalSpent)}
            </p>
          </div>
        </div>
      </div>

      {/* 3. ORDER TRACKING SECTION */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-700" />
              <span>আমার অর্ডার ট্র্যাকিং ও ইতিহাস</span>
            </h2>
            <p className="text-xs text-slate-500">
              লাইভ ডেলিভারি স্ট্যাটাস এবং ক্যাশ মেমো রিসিট
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterTab === 'all'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              সকল ({totalOrdersCount})
            </button>
            <button
              onClick={() => setFilterTab('active')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterTab === 'active'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              চলমান ({activeOrders.length})
            </button>
            <button
              onClick={() => setFilterTab('delivered')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterTab === 'delivered'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              সম্পন্ন ({deliveredOrders.length})
            </button>
          </div>
        </div>

        {/* Orders List */}
        {displayedOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-2 stroke-1" />
            <p className="text-xs font-semibold">কোনো অর্ডার পাওয়া যায়নি।</p>
            <button
              onClick={onBackToShop}
              className="mt-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              এখনই কেনাকাটা করুন
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedOrders.map((order) => {
              const step = getProgressStep(order.orderStatus);
              const isCancelled =
                order.orderStatus === 'cancelled' ||
                order.orderStatus === 'shop_rejected' ||
                order.orderStatus === 'delivery_failed';

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs transition-all hover:shadow-sm"
                >
                  {/* Top line: Order ID, Date & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        #{order.id}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(order.createdAt).toLocaleDateString('bn-BD')} •{' '}
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <StatusBadge status={order.orderStatus} />
                    </div>
                  </div>

                  {/* VISUAL ORDER TIMELINE (5 STEPS) */}
                  {!isCancelled && (
                    <div className="my-5 px-1 sm:px-4">
                      <div className="grid grid-cols-5 gap-1 relative text-center">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              step >= 1
                                ? 'bg-emerald-700 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            ১
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 mt-1">
                            অর্ডার প্লেসড
                          </span>
                        </div>

                        <div className="flex flex-col items-center">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              step >= 2
                                ? 'bg-emerald-700 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            ২
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 mt-1">
                            কনফার্মড
                          </span>
                        </div>

                        <div className="flex flex-col items-center">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              step >= 3
                                ? 'bg-emerald-700 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            ৩
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 mt-1">
                            রাইডার পিকআপ
                          </span>
                        </div>

                        <div className="flex flex-col items-center">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              step >= 4
                                ? 'bg-emerald-700 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            ৪
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 mt-1">
                            ডেলিভারির পথে
                          </span>
                        </div>

                        <div className="flex flex-col items-center">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              step >= 5
                                ? 'bg-emerald-700 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            ৫
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 mt-1">
                            ডেলিভার্ড
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rider Contact Card (if assigned) */}
                  {order.riderName && (
                    <div className="mb-4 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center">
                          <Bike className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-emerald-950">
                            ডেলিভারি রাইডার: {order.riderName}
                          </p>
                          <p className="text-[11px] text-emerald-800 font-mono">
                            {order.riderPhone || 'রাইডার'}
                          </p>
                        </div>
                      </div>

                      {order.riderPhone && (
                        <a
                          href={`tel:${order.riderPhone}`}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-colors shadow-2xs flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>কল দিন</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Order Items Summary */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4">
                    <p className="text-[11px] font-bold text-slate-500 mb-2">পণ্যের তালিকা:</p>
                    <div className="divide-y divide-slate-200/70 text-xs">
                      {order.items.map((item) => (
                        <div key={item.productId} className="py-1.5 flex justify-between">
                          <span className="text-slate-800 font-medium">
                            {item.nameBn} <span className="text-slate-400">({item.quantity} {item.unit})</span>
                          </span>
                          <span className="font-bold text-slate-900 font-mono">
                            {formatBDT(item.lineTotal)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs mt-2">
                      <span className="text-slate-600">
                        ডেলিভারি ফি: <strong className="text-slate-800">{formatBDT(order.deliveryFee)}</strong>
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        সর্বমোট (COD): <strong className="text-emerald-800">{formatBDT(order.totalAmount)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Order Note Component for Customer */}
                  <div className="my-3">
                    <OrderNoteSection
                      orderId={order.id}
                      notes={order.notes}
                      userRole="customer"
                      onUpdateNote={async (oId, n) => {
                        if (onUpdateOrderNote) await onUpdateOrderNote(oId, n);
                      }}
                    />
                  </div>

                  {/* Bottom Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="line-clamp-1">{order.deliveryAddress}</span>
                    </div>

                    <div className="flex flex-wrap items-center space-x-2">
                      {/* Message & Chat Button */}
                      <button
                        type="button"
                        onClick={() => setActiveChatOrder(order)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 flex items-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                        <span>মেসেজ ও চ্যাট</span>
                        {order.messages && order.messages.length > 0 && (
                          <span className="bg-emerald-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                            {order.messages.length}
                          </span>
                        )}
                      </button>

                      {/* Cancel button if pending */}
                      {order.orderStatus === 'pending_shop_confirmation' && (
                        <button
                          onClick={() => setCancellingOrderId(order.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                        >
                          অর্ডার বাতিল
                        </button>
                      )}

                      {/* View Official Cash Memo Voucher */}
                      <button
                        onClick={() => onViewOrderMemo(order)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 flex items-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>ক্যাশ মেমো দেখুন</span>
                      </button>
                    </div>
                  </div>

                  {/* Cancel Dialog Inline */}
                  {cancellingOrderId === order.id && (
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-2">
                      <p className="font-bold text-rose-900">
                        অর্ডার #{order.id} বাতিলের কারণ লিখুন:
                      </p>
                      <input
                        type="text"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="যেমন: ভুল পণ্য যোগ করেছিলাম"
                        className="w-full text-xs p-2 rounded-xl border border-rose-300 bg-white"
                      />
                      <div className="flex justify-end space-x-2 pt-1">
                        <button
                          onClick={() => setCancellingOrderId(null)}
                          className="px-3 py-1 rounded-lg text-slate-600 hover:text-slate-900 font-semibold"
                        >
                          বন্ধ করুন
                        </button>
                        <button
                          onClick={handleConfirmCancel}
                          disabled={isCancelling || !cancelReason.trim()}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50"
                        >
                          {isCancelling ? 'বাতিল হচ্ছে...' : 'বাতিল নিশ্চিত করুন'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Real-time Order Chat Modal for Customer */}
      {activeChatOrder && (
        <OrderChatModal
          order={orders.find((o) => o.id === activeChatOrder.id) || activeChatOrder}
          currentUserRole="customer"
          currentUserName={customer.name}
          currentUserPhone={customer.phone}
          isOpen={true}
          onClose={() => setActiveChatOrder(null)}
          onSendMessage={async (oId, text) => {
            if (onSendMessage) await onSendMessage(oId, text);
          }}
        />
      )}
    </div>
  );
};
