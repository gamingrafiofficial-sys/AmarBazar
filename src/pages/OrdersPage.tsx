import React, { useState } from 'react';
import { Order, CustomerAccount } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { normalizePhone } from '../lib/phone';
import { StatusBadge } from '../components/common/StatusBadge';
import { OrderChatModal } from '../components/common/OrderChatModal';
import { OrderNoteSection } from '../components/common/OrderNoteSection';
import {
  Package,
  FileText,
  Printer,
  ArrowLeft,
  MapPin,
  Phone,
  Bike,
  CheckCircle2,
  Calendar,
  XCircle,
  HelpCircle,
  Clock,
  MessageSquare,
  Lock,
  LogIn,
} from 'lucide-react';

interface OrdersPageProps {
  orders: Order[];
  loggedInCustomer?: CustomerAccount | null;
  onNavigateToLogin?: () => void;
  onBackToShop: () => void;
  onCancelOrder: (orderId: string, reason: string) => Promise<void>;
  onSendMessage?: (orderId: string, text: string) => Promise<void>;
  onUpdateOrderNote?: (orderId: string, notes: string) => Promise<void>;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({
  orders,
  loggedInCustomer,
  onNavigateToLogin,
  onBackToShop,
  onCancelOrder,
  onSendMessage,
  onUpdateOrderNote,
}) => {
  const { language, formatBDT } = useLanguage();

  // Deduplicate orders to prevent duplicate key errors and inconsistent counts
  const uniqueOrders = React.useMemo(() => {
    if (!Array.isArray(orders)) return [];
    const map = new Map<string, Order>();
    for (const o of orders) {
      if (o && o.id) {
        if (!map.has(o.id)) {
          map.set(o.id, o);
        } else {
          const existing = map.get(o.id)!;
          const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          const incomingTime = new Date(o.updatedAt || o.createdAt || 0).getTime();
          if (incomingTime >= existingTime) {
            map.set(o.id, o);
          }
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders]);

  // Filter orders strictly for the logged-in customer (guests see NO order data)
  const userOrders = React.useMemo(() => {
    if (!loggedInCustomer || !loggedInCustomer.phone) return [];
    const normCustPhone = normalizePhone(loggedInCustomer.phone);
    return uniqueOrders.filter((o) => {
      const normOrderPhone = normalizePhone(o.customerPhone);
      return (
        (normCustPhone && normOrderPhone && normCustPhone === normOrderPhone) ||
        (o.customerId && o.customerId === loggedInCustomer.id)
      );
    });
  }, [uniqueOrders, loggedInCustomer]);

  const [selectedMemoOrder, setSelectedMemoOrder] = useState<Order | null>(userOrders[0] || null);
  const [activeTab, setActiveTab] = useState<'list' | 'memo'>('list');
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);

  // Sync selectedMemoOrder if orders change
  React.useEffect(() => {
    if (userOrders.length > 0 && (!selectedMemoOrder || !userOrders.some((o) => o.id === selectedMemoOrder.id))) {
      setSelectedMemoOrder(userOrders[0]);
    }
  }, [userOrders, selectedMemoOrder]);

  // Cancel prompt
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmCancel = async () => {
    if (!cancelOrderId || !cancelReason.trim()) return;
    setIsCancelling(true);
    const minAnim = new Promise((r) => setTimeout(r, 250));
    await onCancelOrder(cancelOrderId, cancelReason);
    await minAnim;
    setIsCancelling(false);
    setCancelOrderId(null);
    setCancelReason('');
  };

  // If user is NOT logged in, show login required gate (NO data exposed)
  if (!loggedInCustomer) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-2xs">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900 mb-1.5">
            {language === 'bn' ? 'অর্ডার দেখতে লগইন করুন' : 'Login to View Your Orders'}
          </h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            {language === 'bn'
              ? 'আপনার অ্যাকাউন্টের পূর্ববর্তী অর্ডারসমূহ, লাইভ ডেলিভারি ট্র্যাকিং ও অফিসিয়াল ক্যাশ মেমো দেখতে অনুগ্রহ করে লগইন করুন।'
              : 'Please log in to your account to view your orders, live tracking status, and official cash memos.'}
          </p>
          <div className="space-y-2.5">
            {onNavigateToLogin && (
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-6 rounded-2xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{language === 'bn' ? 'লগইন বা অ্যাকাউন্ট খুলুন' : 'Login or Register'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onBackToShop}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold py-2.5 px-6 rounded-2xl text-xs transition-colors border border-slate-200 cursor-pointer"
            >
              {language === 'bn' ? 'শপে ফিরে যান' : 'Back to Shop'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {language === 'bn' ? 'আমার অর্ডার ও ক্যাশ মেমো' : 'My Orders & Invoices'}
            </h1>
            <p className="text-xs text-slate-500">
              {language === 'bn'
                ? 'লাইভ ডেলিভারি ট্র্যাকিং ও অফিসিয়াল ভাউচার রিসিট'
                : 'Live order tracking & official cash memo receipts'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'list'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {language === 'bn' ? `অর্ডার তালিকা (${userOrders.length})` : `Order List (${userOrders.length})`}
          </button>

          {selectedMemoOrder && (
            <button
              onClick={() => setActiveTab('memo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                activeTab === 'memo'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>
                {language === 'bn'
                  ? `ক্যাশ মেমো (#${selectedMemoOrder.id})`
                  : `Cash Memo (#${selectedMemoOrder.id})`}
              </span>
            </button>
          )}

          <button
            onClick={onBackToShop}
            className="flex items-center space-x-1 text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'শপ' : 'Shop'}</span>
          </button>
        </div>
      </div>

      {userOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto my-8">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-3 stroke-1" />
          <h3 className="font-bold text-slate-800 text-base mb-1">
            {language === 'bn' ? 'আপনার কোনো অর্ডার হিস্ট্রি নেই' : 'No Order History Yet'}
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            {language === 'bn'
              ? 'পণ্য পছন্দ করে অর্ডার করলে এখানে তার বিস্তারিত ও ক্যাশ মেমো দেখতে পাবেন।'
              : 'Order your groceries and fresh items to track status and view receipts here.'}
          </p>
          <button
            onClick={onBackToShop}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-6 rounded-2xl text-xs"
          >
            {language === 'bn' ? 'কেনাকাটা শুরু করুন' : 'Start Shopping'}
          </button>
        </div>
      ) : activeTab === 'memo' && selectedMemoOrder ? (
        /* TAB 2: CASH MEMO RECEIPT VIEW */
        <div className="max-w-2xl mx-auto">
          {/* Print button on top */}
          <div className="flex justify-between items-center mb-3 px-1 print:hidden">
            <button
              onClick={() => setActiveTab('list')}
              className="text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'তালিকায় ফিরে যান' : 'Back to Order List'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'মেমো প্রিন্ট / ডাউনলোড করুন' : 'Print / Download Memo'}</span>
            </button>
          </div>

          {/* REALISTIC CASH MEMO VOUCHER */}
          <div className="bg-white rounded-3xl border-2 border-slate-300 p-6 sm:p-8 shadow-md font-sans print:shadow-none print:border-none print:p-0">
            {/* Memo Header */}
            <div className="text-center pb-4 border-b-2 border-slate-900 mb-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {language === 'bn' ? 'আমারবাজার (AmarBazaar)' : 'AmarBazaar Express'}
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                {language === 'bn'
                  ? 'কালীগঞ্জ ও কাপাসিয়া এক্সপ্রেস ডেলিভারি সার্ভিস, গাজীপুর'
                  : 'Kaliganj & Kapasia Express Delivery Service, Gazipur'}
              </p>
              <div className="inline-block bg-slate-900 text-white font-bold text-xs uppercase px-4 py-0.5 rounded-full mt-2">
                {language === 'bn' ? 'অফিসিয়াল ক্যাশ মেমো / Cash Memo' : 'Official Cash Memo / Invoice'}
              </div>
            </div>

            {/* Memo Metadata */}
            <div className="grid grid-cols-2 gap-4 text-xs pb-4 border-b border-slate-200 mb-4">
              <div>
                <p className="text-slate-500">{language === 'bn' ? 'ভাউচার নম্বর:' : 'Voucher No:'}</p>
                <p className="font-mono font-bold text-sm text-slate-900">
                  #{selectedMemoOrder.id}
                </p>
                <p className="text-slate-500 mt-1">{language === 'bn' ? 'তারিখ ও সময়:' : 'Date & Time:'}</p>
                <p className="font-semibold text-slate-800">
                  {new Date(selectedMemoOrder.createdAt).toLocaleDateString()} •{' '}
                  {new Date(selectedMemoOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="text-right">
                <p className="text-slate-500">{language === 'bn' ? 'গ্রাহকের নাম:' : 'Customer Name:'}</p>
                <p className="font-bold text-slate-900">{selectedMemoOrder.customerName}</p>
                <p className="text-slate-500 mt-1">{language === 'bn' ? 'মোবাইল নম্বর:' : 'Mobile Number:'}</p>
                <p className="font-mono font-bold text-slate-800">{selectedMemoOrder.customerPhone}</p>
                <p className="text-slate-500 mt-1">{language === 'bn' ? 'ডেলিভারি ঠিকানা:' : 'Delivery Address:'}</p>
                <p className="font-medium text-slate-700">{selectedMemoOrder.deliveryAddress}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-800 font-bold bg-slate-50">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">{language === 'bn' ? 'পণ্যের বিবরণ' : 'Item Description'}</th>
                    <th className="py-2 px-2 text-center">{language === 'bn' ? 'পরিমাণ' : 'Qty'}</th>
                    <th className="py-2 px-2 text-right">{language === 'bn' ? 'দর (৳)' : 'Price (৳)'}</th>
                    <th className="py-2 px-2 text-right">{language === 'bn' ? 'মোট (৳)' : 'Total (৳)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedMemoOrder.items.map((item, idx) => (
                    <tr key={`${item.productId}-${idx}`}>
                      <td className="py-2.5 px-2 text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-2 font-semibold text-slate-900">
                        {language === 'bn' ? item.nameBn : (item.nameEn || item.nameBn)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono">
                        {formatBDT(item.price)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                        {formatBDT(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="border-t-2 border-slate-300 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>{language === 'bn' ? 'পণ্যের মোট উপমোট (Subtotal):' : 'Items Subtotal:'}</span>
                <span className="font-bold">{formatBDT(selectedMemoOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>
                  {language === 'bn'
                    ? `সড়ক ডেলিভারি ফি (${selectedMemoOrder.roadDistanceKm} কি.মি):`
                    : `Road Delivery Fee (${selectedMemoOrder.roadDistanceKm} km):`}
                </span>
                <span className="font-bold text-emerald-800">
                  {formatBDT(selectedMemoOrder.deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between text-sm sm:text-base font-black text-slate-900 border-t-2 border-slate-900 pt-2">
                <span>{language === 'bn' ? 'সর্বমোট প্রদেয় (Cash to Pay):' : 'Total Payable (COD):'}</span>
                <span className="text-emerald-900 font-black">
                  {formatBDT(selectedMemoOrder.totalAmount)}
                </span>
              </div>
            </div>

            {/* Delivery Rider & Payment Stamp */}
            <div className="mt-6 pt-4 border-t border-dashed border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="text-slate-500 text-[11px]">{language === 'bn' ? 'ডেলিভারি রাইডার:' : 'Delivery Rider:'}</p>
                {selectedMemoOrder.riderName ? (
                  <p className="font-bold text-slate-900 flex items-center gap-1">
                    <Bike className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      {selectedMemoOrder.riderName} ({selectedMemoOrder.riderPhone || (language === 'bn' ? 'রাইডার' : 'Rider')})
                    </span>
                  </p>
                ) : (
                  <p className="text-amber-700 font-semibold italic">
                    {language === 'bn' ? 'রাইডার নিযুক্তির অপেক্ষায়' : 'Awaiting Rider Assignment'}
                  </p>
                )}
              </div>

              <div className="border border-emerald-600 bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-xl font-bold text-center self-start sm:self-auto">
                {language === 'bn' ? 'পেমেন্ট মাধ্যম: ক্যাশ অন ডেলিভারি (COD)' : 'Payment Method: Cash on Delivery (COD)'}
              </div>
            </div>

            {/* Order Note Component in Memo */}
            <div className="mt-4 print:hidden">
              <OrderNoteSection
                orderId={selectedMemoOrder.id}
                notes={selectedMemoOrder.notes}
                userRole="customer"
                onUpdateNote={async (oId, n) => {
                  if (onUpdateOrderNote) await onUpdateOrderNote(oId, n);
                }}
              />
            </div>

            {/* Chat button in Memo */}
            <div className="mt-3 flex justify-center print:hidden">
              <button
                type="button"
                onClick={() => setActiveChatOrder(selectedMemoOrder)}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-emerald-300" />
                <span>{language === 'bn' ? 'রাইডার ও এডমিনকে মেসেজ পাঠান (Chat)' : 'Chat with Rider & Support'}</span>
                {selectedMemoOrder.messages && selectedMemoOrder.messages.length > 0 && (
                  <span className="bg-white text-emerald-900 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                    {selectedMemoOrder.messages.length} {language === 'bn' ? 'টি মেসেজ' : 'msgs'}
                  </span>
                )}
              </button>
            </div>

            {/* Footer note */}
            <p className="text-[10px] text-center text-slate-400 mt-6 pt-2 border-t border-slate-100">
              {language === 'bn'
                ? 'আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ। প্রয়োজনে যোগাযোগ: 09612-BAZAAR (২৪/৭ হেল্পলাইন)'
                : 'Thank you for shopping with AmarBazaar. 24/7 Helpline: 09612-BAZAAR'}
            </p>
          </div>
        </div>
      ) : (
        /* TAB 1: ALL ORDERS LIST */
        <div className="space-y-4 max-w-4xl mx-auto">
          {userOrders.map((order, idx) => (
            <div
              key={`${order.id}-${idx}`}
              className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="font-mono text-xs font-bold text-slate-700">
                      #{order.id}
                    </span>
                    <StatusBadge status={order.orderStatus} size="sm" />
                    {order.unionNameBn && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        {order.thanaNameBn ? `${order.thanaNameBn} • ` : ''}{order.unionNameBn}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString()} •{' '}
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-base sm:text-lg font-black text-emerald-800">
                    {formatBDT(order.totalAmount)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {language === 'bn'
                      ? `(পণ্য: ${formatBDT(order.subtotal)} + ডেলিভারি: ${formatBDT(order.deliveryFee)})`
                      : `(Items: ${formatBDT(order.subtotal)} + Delivery: ${formatBDT(order.deliveryFee)})`}
                  </span>
                </div>
              </div>

              {/* Items summary */}
              <div className="py-3 text-xs text-slate-700 space-y-1">
                {order.items.map((it, itemIdx) => (
                  <div key={`${it.productId}-${itemIdx}`} className="flex justify-between">
                    <span>{language === 'bn' ? it.nameBn : (it.nameEn || it.nameBn)} x {it.quantity} {it.unit}</span>
                    <span className="font-semibold">{formatBDT(it.lineTotal)}</span>
                  </div>
                ))}
              </div>

              {/* Address & Rider Info */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                <div>
                  <p className="text-slate-600 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>{order.deliveryAddress}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {language === 'bn'
                      ? `সড়ক দূরত্ব: ${order.roadDistanceKm} কি.মি`
                      : `Road Distance: ${order.roadDistanceKm} km`} • {order.customerPhone}
                  </p>
                </div>

                {order.riderName && (
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 block">
                      {language === 'bn' ? 'নিযুক্ত রাইডার:' : 'Assigned Rider:'}
                    </span>
                    <span className="font-bold text-emerald-800 flex items-center sm:justify-end gap-1">
                      <Bike className="w-3.5 h-3.5" />
                      <span>{order.riderName}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Order Note Component for Customer */}
              <div className="mt-3">
                <OrderNoteSection
                  orderId={order.id}
                  notes={order.notes}
                  userRole="customer"
                  onUpdateNote={async (oId, n) => {
                    if (onUpdateOrderNote) await onUpdateOrderNote(oId, n);
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedMemoOrder(order);
                      setActiveTab('memo');
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition-colors shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'bn' ? 'ক্যাশ মেমো দেখুন' : 'View Cash Memo'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveChatOrder(order)}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition-colors shadow-2xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{language === 'bn' ? 'মেসেজ ও সহায়তা' : 'Support Chat'}</span>
                    {order.messages && order.messages.length > 0 && (
                      <span className="bg-emerald-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                        {order.messages.length}
                      </span>
                    )}
                  </button>
                </div>

                {order.orderStatus === 'pending_shop_confirmation' && (
                  <button
                    onClick={() => setCancelOrderId(order.id)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold border border-rose-200 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    {language === 'bn' ? 'অর্ডার বাতিল করুন' : 'Cancel Order'}
                  </button>
                )}
              </div>

              {/* Cancel dialog */}
              {cancelOrderId === order.id && (
                <div className="mt-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-2">
                  <p className="font-bold text-rose-800">
                    {language === 'bn' ? 'অর্ডার বাতিলের কারণ লিখুন:' : 'Reason for cancellation:'}
                  </p>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder={language === 'bn' ? 'যেমন: ভুল পণ্য সিলেক্ট করেছিলাম' : 'e.g. Selected wrong item by mistake'}
                    className="w-full p-2 rounded-xl border border-rose-200 bg-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirmCancel}
                      disabled={isCancelling || !cancelReason.trim()}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3.5 py-1.5 rounded-xl disabled:opacity-50"
                    >
                      {isCancelling
                        ? (language === 'bn' ? 'বাতিল হচ্ছে...' : 'Cancelling...')
                        : (language === 'bn' ? 'বাতিল নিশ্চিত করুন' : 'Confirm Cancel')}
                    </button>
                    <button
                      onClick={() => setCancelOrderId(null)}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-3 py-1.5 rounded-xl"
                    >
                      {language === 'bn' ? 'বন্ধ' : 'Close'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Real-time Order Chat Modal for Customer */}
      {activeChatOrder && (
        <OrderChatModal
          order={orders.find((o) => o.id === activeChatOrder.id) || activeChatOrder}
          currentUserRole="customer"
          currentUserName={activeChatOrder.customerName || 'গ্রাহক'}
          currentUserPhone={activeChatOrder.customerPhone}
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
