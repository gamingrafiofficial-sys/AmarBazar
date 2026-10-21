import React, { useState } from 'react';
import { Order, DeliveryRiderAccount, OrderStatus } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { StatusBadge } from '../common/StatusBadge';
import { OrderChatModal } from '../common/OrderChatModal';
import { OrderNoteSection } from '../common/OrderNoteSection';
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
  MessageSquare,
  FileText,
  LogOut,
  Calendar,
  Filter,
  AlertTriangle,
  Wallet,
  TrendingUp,
  Check,
} from 'lucide-react';

interface RiderDashboardProps {
  rider: DeliveryRiderAccount;
  allOrders: Order[];
  onAcceptOrder: (orderId: string, rider: DeliveryRiderAccount) => Promise<void>;
  onTransitionOrder: (orderId: string, targetStatus: OrderStatus, reason?: string) => Promise<void>;
  onToggleOnline: (isOnline: boolean) => void;
  onRecordHandover: (riderId: string, amount: number, notes?: string) => Promise<void>;
  onSendMessage?: (orderId: string, text: string) => Promise<void>;
  onUpdateOrderNote?: (orderId: string, notes: string) => Promise<void>;
  onLogout?: () => void;
}

export const RiderDashboard: React.FC<RiderDashboardProps> = ({
  rider,
  allOrders,
  onAcceptOrder,
  onTransitionOrder,
  onToggleOnline,
  onRecordHandover,
  onSendMessage,
  onUpdateOrderNote,
  onLogout,
}) => {
  const { language, formatBDT } = useLanguage();
  const [failOrderId, setFailOrderId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverAmount, setHandoverAmount] = useState<number>(0);
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);

  // Date Filtering State for Rider Performance & History
  type RiderDateFilter = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
  const [dateFilter, setDateFilter] = useState<RiderDateFilter>('all');
  const [customDate, setCustomDate] = useState<string>('');

  // Date matching helper
  const isOrderInDateFilter = (dateStr: string) => {
    if (dateFilter === 'all') return true;
    if (!dateStr) return false;

    const d = new Date(dateStr);
    const now = new Date();
    const orderDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    if (dateFilter === 'today') {
      return orderDay === today;
    }
    if (dateFilter === 'yesterday') {
      return orderDay === today - ONE_DAY;
    }
    if (dateFilter === 'this_week') {
      return orderDay >= today - 7 * ONE_DAY && orderDay <= today;
    }
    if (dateFilter === 'this_month') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (dateFilter === 'custom') {
      if (!customDate) return true;
      const [cy, cm, cd] = customDate.split('-').map(Number);
      const selDay = new Date(cy, cm - 1, cd).getTime();
      return orderDay === selDay;
    }
    return true;
  };

  const getDateFilterLabel = (filter: RiderDateFilter) => {
    switch (filter) {
      case 'today':
        return 'আজকের';
      case 'yesterday':
        return 'গতকালের';
      case 'this_week':
        return 'গত ৭ দিনের';
      case 'this_month':
        return 'এই মাসের';
      case 'custom':
        return customDate ? `তারিখ: ${customDate}` : 'নির্দিষ্ট তারিখ';
      case 'all':
      default:
        return 'সর্বমোট';
    }
  };

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

  // All completed deliveries for this rider
  const allMyDeliveredOrders = allOrders.filter(
    (o) => o.riderId === rider.id && o.orderStatus === 'delivered'
  );

  // Completed deliveries for this rider (Filtered by selected Date)
  const myDeliveredOrdersFiltered = allMyDeliveredOrders.filter((o) =>
    isOrderInDateFilter(o.updatedAt || o.createdAt)
  );

  // Deliveries accepted / active for this rider (Pending deliveries)
  const myActiveDeliveries = allOrders.filter(
    (o) =>
      o.riderId === rider.id &&
      ['rider_assigned', 'picked_up', 'out_for_delivery'].includes(o.orderStatus)
  );

  // Total COD cash in hand across all delivered orders (outstanding to deposit to office)
  const cashInHand = allMyDeliveredOrders
    .filter((o) => o.paymentStatus === 'collected')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // Rider earnings for filtered period
  const riderFilteredEarnings = myDeliveredOrdersFiltered.reduce((sum, o) => {
    const split = calculateOrderFinancialSplit(o);
    return sum + split.riderPayout;
  }, 0);

  // Rider all-time earnings
  const riderTotalEarnings = allMyDeliveredOrders.reduce((sum, o) => {
    const split = calculateOrderFinancialSplit(o);
    return sum + split.riderPayout;
  }, 0);

  const handleClaimOrder = async (orderId: string) => {
    if (rider.isActive === false) {
      alert('আপনার অ্যাকাউন্ট সাময়িকভাবে স্থগিত রয়েছে। ব্যালেন্স জমা দিয়ে পুনরায় সক্রিয় করুন।');
      return;
    }
    setIsProcessing(true);
    const minAnim = new Promise((r) => setTimeout(r, 250));
    await onAcceptOrder(orderId, rider);
    await minAnim;
    setIsProcessing(false);
  };

  const handleNextStep = async (order: Order) => {
    setIsProcessing(true);
    const minAnim = new Promise((r) => setTimeout(r, 250));
    let nextStatus: OrderStatus = 'picked_up';

    if (order.orderStatus === 'rider_assigned') {
      nextStatus = 'picked_up';
    } else if (order.orderStatus === 'picked_up') {
      nextStatus = 'out_for_delivery';
    } else if (order.orderStatus === 'out_for_delivery') {
      nextStatus = 'delivered';
    }

    await onTransitionOrder(order.id, nextStatus);
    await minAnim;
    setIsProcessing(false);
  };

  const handleConfirmFail = async () => {
    if (!failOrderId || !failReason.trim()) return;
    setIsProcessing(true);
    const minAnim = new Promise((r) => setTimeout(r, 250));
    await onTransitionOrder(failOrderId, 'delivery_failed', failReason);
    await minAnim;
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

        {/* Online / Offline Toggle & Logout */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2 bg-slate-50 p-2 sm:p-2.5 rounded-2xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">ডিউটি স্ট্যাটাস:</span>
            <button
              onClick={() => onToggleOnline(!rider.isOnline)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 ${
                rider.isOnline
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/30'
                  : 'bg-slate-400 text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${rider.isOnline ? 'bg-amber-300 animate-ping' : 'bg-slate-200'}`}></span>
              <span>{rider.isOnline ? 'অনলাইন (সক্রিয়)' : 'অফলাইন'}</span>
            </button>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-2.5 rounded-2xl flex items-center gap-1.5 transition-colors shadow-2xs"
              title="রাইডার অ্যাকাউন্ট লগআউট করুন"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>লগআউট</span>
            </button>
          )}
        </div>
      </div>

      {/* DEACTIVATION WARNING BANNER (যদি এডমিন ব্যালেন্স জমা নেওয়ার জন্য সাময়িক ডিঅ্যাক্টিভ করে থাকে) */}
      {rider.isActive === false && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-5 mb-6 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 font-bold mt-0.5 shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-rose-900">
                  আপনার রাইডার অ্যাকাউন্টটি সাময়িকভাবে ডিঅ্যাক্টিভ (স্থগিত) করা হয়েছে
                </h3>
                <span className="bg-rose-700 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  ডিঅ্যাক্টিভ
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-1 font-medium">
                <strong>কারণ:</strong> {rider.deactivatedReason || 'ব্যালেন্স অফিসে জমা করার জন্য সামরিক ডিঅ্যাক্টিভ'}
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                হাতে থাকা বকেয়া ব্যালেন্স: <strong className="font-mono font-bold text-rose-950 text-xs">{formatBDT(cashInHand)}</strong> অফিসে জমা দিয়ে অ্যাকাউন্ট সক্রিয় করুন। স্থগিত থাকা অবস্থায় নতুন কোনো অর্ডার গ্রহণ করা যাবে না।
              </p>
            </div>
          </div>
          {cashInHand > 0 && (
            <button
              onClick={() => {
                setHandoverAmount(cashInHand);
                setShowHandoverModal(true);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors shrink-0"
            >
              এডমিন অফিসে ক্যাশ জমা দিন
            </button>
          )}
        </div>
      )}

      {/* Date-wise Filtering Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">তারিখ অনুযায়ী ডেলিভারি ও হিসাব ফিল্টারিং</h3>
              <p className="text-[10px] text-slate-500">নির্দিষ্ট সময়ের ডেলিভারি সংখ্যা, ব্যালেন্স ও আয় ফিল্টার করুন</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                dateFilter === 'all'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সকল সময়
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                dateFilter === 'today'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              আজকে
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('yesterday')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                dateFilter === 'yesterday'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              গতকাল
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('this_week')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                dateFilter === 'this_week'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              গত ৭ দিন
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('this_month')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                dateFilter === 'this_month'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              এই মাস
            </button>

            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500">তারিখ:</span>
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setDateFilter('custom');
                }}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-0.5 font-mono text-slate-800 focus:outline-hidden"
              />
              {dateFilter === 'custom' && customDate && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomDate('');
                    setDateFilter('all');
                  }}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xs"
                  title="রিসেট করুন"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row (Balance, Total Deliveries, Pending Deliveries, Earnings) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {/* Card 1: Balance (হাতে নগদ ক্যাশ ব্যালেন্স) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold text-rose-700 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" />
                <span>হাতে থাকা ব্যালেন্স</span>
              </span>
              <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded-md">
                COD ক্যাশ
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-rose-700 mt-1 block">
              {formatBDT(cashInHand)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {cashInHand > 0 ? 'অফিসে জমা দিতে হবে' : 'সম্পূর্ণ পরিশোধিত'}
            </span>
          </div>

          {cashInHand > 0 && (
            <button
              onClick={() => {
                setHandoverAmount(cashInHand);
                setShowHandoverModal(true);
              }}
              className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1"
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>অফিসে জমা দিন</span>
            </button>
          )}
        </div>

        {/* Card 2: Total Deliveries (টোটাল ডেলিভারি) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold text-emerald-800 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>টোটাল ডেলিভারি</span>
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded-md">
                {getDateFilterLabel(dateFilter)}
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
              {myDeliveredOrdersFiltered.length} টি
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              সর্বমোট সফল ডেলিভারি: {allMyDeliveredOrders.length} টি
            </span>
          </div>
        </div>

        {/* Card 3: Pending Deliveries (পেন্ডিং ডেলিভারি) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold text-amber-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>পেন্ডিং ডেলিভারি</span>
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${myActiveDeliveries.length > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-500'}`}>
                {myActiveDeliveries.length > 0 ? 'চলমান' : 'নেই'}
              </span>
            </div>
            <span className={`text-xl sm:text-2xl font-black mt-1 block ${myActiveDeliveries.length > 0 ? 'text-amber-800' : 'text-slate-800'}`}>
              {myActiveDeliveries.length} টি
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              বর্তমান সক্রিয় অর্ডার
            </span>
          </div>
        </div>

        {/* Card 4: Trip Earnings (মোট ট্রিপ আয়) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>ট্রিপ আয় (Earnings)</span>
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded-md">
                {getDateFilterLabel(dateFilter)}
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-emerald-800 mt-1 block">
              {formatBDT(riderFilteredEarnings)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              সর্বমোট ট্রিপ আয়: {formatBDT(riderTotalEarnings)}
            </span>
          </div>
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
                      {order.notes && (
                        <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-950 mt-1">
                          <strong>📝 কাস্টমার নোট:</strong> {order.notes}
                        </div>
                      )}
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

                  {/* Order Note Component for Rider */}
                  <div className="my-3">
                    <OrderNoteSection
                      orderId={order.id}
                      notes={order.notes}
                      userRole="rider"
                      onUpdateNote={async (oId, n) => {
                        if (onUpdateOrderNote) await onUpdateOrderNote(oId, n);
                      }}
                    />
                  </div>

                  {/* Rider Milestone Buttons and Chat */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveChatOrder(order)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs transition-colors shrink-0"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>কাস্টমারকে মেসেজ</span>
                      {order.messages && order.messages.length > 0 && (
                        <span className="bg-white text-blue-900 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                          {order.messages.length}
                        </span>
                      )}
                    </button>

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

      {/* SECTION 3: DELIVERED ORDERS HISTORY (Filtered by Date) */}
      <div className="mb-8 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-700" />
              <span>ডেলিভারি হিস্ট্রি ({getDateFilterLabel(dateFilter)})</span>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {myDeliveredOrdersFiltered.length} টি
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              নির্বাচিত সময়ে আপনার সম্পন্ন করা সফল ডেলিভারিসমূহ এবং অর্জিত আয়
            </p>
          </div>
          {myDeliveredOrdersFiltered.length > 0 && (
            <div className="text-right">
              <span className="text-xs text-slate-500">এই সময়ের ট্রিপ আয়: </span>
              <strong className="text-emerald-800 font-extrabold text-sm">{formatBDT(riderFilteredEarnings)}</strong>
            </div>
          )}
        </div>

        {myDeliveredOrdersFiltered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            {dateFilter === 'all'
              ? 'আপনার এখনো কোনো সম্পন্ন ডেলিভারি নেই।'
              : `${getDateFilterLabel(dateFilter)} কোনো সম্পন্ন ডেলিভারি পাওয়া যায়নি।`}
          </div>
        ) : (
          <div className="space-y-3">
            {myDeliveredOrdersFiltered.map((order) => {
              const split = calculateOrderFinancialSplit(order);
              return (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <span className="font-mono font-bold text-slate-900">#{order.id}</span>
                      <StatusBadge status={order.orderStatus} size="sm" />
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.paymentStatus === 'collected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {order.paymentStatus === 'collected' ? 'ক্যাশ জমা বাকি' : 'অফিসে জমা হয়েছে'}
                      </span>
                    </div>

                    <p className="text-slate-600">
                      <strong>গ্রাহক:</strong> {order.customerName} ({order.customerPhone}) • <span>{order.deliveryAddress}</span>
                    </p>

                    <p className="text-[11px] text-slate-400 flex items-center gap-2">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        ডেলিভারি তারিখ: {new Date(order.updatedAt || order.createdAt).toLocaleString('bn-BD', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-4 self-end md:self-auto shrink-0 text-right">
                    <div>
                      <span className="text-[10px] text-slate-400 block">ক্যাশ সংগৃহীত</span>
                      <span className="font-mono font-extrabold text-sm text-slate-900">
                        {formatBDT(order.totalAmount)}
                      </span>
                    </div>

                    <div className="bg-emerald-100/70 border border-emerald-200 px-3 py-1.5 rounded-xl">
                      <span className="text-[10px] text-emerald-800 font-bold block">আপনার আয়</span>
                      <span className="font-black text-xs text-emerald-900">
                        +{formatBDT(split.riderPayout)}
                      </span>
                    </div>
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

      {/* Real-time Order Chat Modal for Rider */}
      {activeChatOrder && (
        <OrderChatModal
          order={allOrders.find((o) => o.id === activeChatOrder.id) || activeChatOrder}
          currentUserRole="rider"
          currentUserName={rider.name}
          currentUserPhone={rider.phone}
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
