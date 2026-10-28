import React, { useState } from 'react';
import {
  Order,
  DeliveryRiderAccount,
  OrderStatus,
  RiderDepositRequest,
  PaymentTransactionRecord,
  OutletHub,
  DistanceTier,
  DeliveryPricingConfig,
} from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { StatusBadge } from '../common/StatusBadge';
import { OrderChatModal } from '../common/OrderChatModal';
import { OrderNoteSection } from '../common/OrderNoteSection';
import { getNavigationUrl } from '../../lib/maps';
import { calculateOrderFinancialSplit } from '../../lib/financialLedger';
import { SEED_UNIONS, SEED_OUTLETS } from '../../data/seedData';
import {
  DISTANCE_TIER_OPTIONS,
  calculateDeliveryChargeBreakdown,
  DEFAULT_DELIVERY_PRICING_CONFIG,
} from '../../lib/deliveryPricing';
import {
  getAvailableSalaryCycles,
  isTimestampInSalaryCycle,
  getSalaryMonthCycle,
} from '../../lib/salaryCycle';
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
  Lock,
  CheckCheck,
  RefreshCw,
  Store,
  Home,
  Package,
  Scale,
  SlidersHorizontal,
  DollarSign,
  Receipt,
} from 'lucide-react';

interface RiderDashboardProps {
  rider: DeliveryRiderAccount;
  allOrders: Order[];
  depositRequests?: RiderDepositRequest[];
  paymentTransactions?: PaymentTransactionRecord[];
  activeTab?: 'overview' | 'orders' | 'outlets' | 'profile';
  onSelectTab?: (tab: 'overview' | 'orders' | 'outlets' | 'profile') => void;
  outlets?: OutletHub[];
  pricingConfig?: DeliveryPricingConfig;
  onAdjustOrderDistance?: (
    orderId: string,
    newDistanceTier: DistanceTier,
    adjustmentNote: string
  ) => Promise<void> | void;
  onAcceptOrder: (orderId: string, rider: DeliveryRiderAccount) => Promise<void>;
  onCancelOrder?: (orderId: string, reason: string) => Promise<void> | void;
  onSubmitDeposit?: (amount: number, notes?: string) => Promise<void> | void;
  onTransitionOrder: (orderId: string, targetStatus: OrderStatus, reason?: string) => Promise<void>;
  onToggleOnline: (isOnline: boolean) => void;
  onRecordHandover: (riderId: string, amount: number, notes?: string) => Promise<void>;
  onSendMessage?: (orderId: string, text: string) => Promise<void>;
  onUpdateOrderNote?: (orderId: string, notes: string) => Promise<void>;
  onLogout?: () => void;
}

export const RiderDashboard: React.FC<RiderDashboardProps> = ({
  rider,
  allOrders: inputAllOrders,
  depositRequests = [],
  paymentTransactions = [],
  activeTab: controlledActiveTab,
  onSelectTab,
  outlets = SEED_OUTLETS,
  pricingConfig = DEFAULT_DELIVERY_PRICING_CONFIG,
  onAdjustOrderDistance,
  onAcceptOrder,
  onCancelOrder,
  onSubmitDeposit,
  onTransitionOrder,
  onToggleOnline,
  onRecordHandover,
  onSendMessage,
  onUpdateOrderNote,
  onLogout,
}) => {
  const { language, formatBDT } = useLanguage();

  // Deduplicate orders to prevent duplicate key errors and inconsistent totals
  const allOrders = React.useMemo(() => {
    if (!Array.isArray(inputAllOrders)) return [];
    const map = new Map<string, Order>();
    for (const o of inputAllOrders) {
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
  }, [inputAllOrders]);
  const [failOrderId, setFailOrderId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverAmount, setHandoverAmount] = useState<number>(0);
  const [handoverNotes, setHandoverNotes] = useState<string>('অফিসে ক্যাশ টাকা জমা দিয়েছি');
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string>('');
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);

  // Distance Adjustment / Verification Modal State (কাস্টমার যেন কম দূরত্ব দিয়ে কম টাকা না দিতে পারে)
  const [adjustingOrder, setAdjustingOrder] = useState<Order | null>(null);
  const [adjustDistanceTier, setAdjustDistanceTier] = useState<DistanceTier>('1-2');
  const [adjustNote, setAdjustNote] = useState<string>('কাস্টমারের বাড়ির প্রকৃত দূরত্ব যাচাই করে সংশোধন করা হলো');
  const [adjustSuccessMsg, setAdjustSuccessMsg] = useState<string>('');

  // Tab State: 'overview' (Home), 'orders' (Orders), 'outlets' (Area), 'profile' (Profile)
  const [internalTab, setInternalTab] = useState<'overview' | 'orders' | 'outlets' | 'profile'>('overview');
  const currentTab = controlledActiveTab || internalTab;
  const setCurrentTab = (tab: 'overview' | 'orders' | 'outlets' | 'profile') => {
    if (onSelectTab) onSelectTab(tab);
    setInternalTab(tab);
  };

  // Filter Outlets matching Rider's assigned union(s) (Area tap Rider Union থাকা Outlet Show করবে)
  const riderUnionOutlets = React.useMemo(() => {
    const outletList = Array.isArray(outlets) && outlets.length > 0 ? outlets : SEED_OUTLETS;
    const assigned = Array.isArray(rider.assignedUnionIds) ? rider.assignedUnionIds : [];
    if (assigned.length === 0) {
      return outletList.filter((o) => o.thanaId === (rider.thanaId || rider.area));
    }
    return outletList.filter((outlet) => {
      const hasUnionMatch = assigned.some((uId) => outlet.coverageUnionIds?.includes(uId));
      const hasThanaCentralMatch =
        outlet.thanaId === (rider.thanaId || rider.area) && outlet.hubType?.includes('সেন্ট্রাল');
      return hasUnionMatch || hasThanaCentralMatch;
    });
  }, [rider, outlets]);

  const assignedUnionNames = React.useMemo(() => {
    if (!rider.assignedUnionIds || rider.assignedUnionIds.length === 0) return [];
    return rider.assignedUnionIds.map((uId) => {
      const u = SEED_UNIONS.find((un) => un.id === uId);
      return u ? u.nameBn : uId;
    });
  }, [rider.assignedUnionIds]);

  // Rider Order Release / Cancel Modal State
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelPresetReason, setCancelPresetReason] = useState<string>('গ্রাহক ফোন রিসিভ করছেন না');
  const [cancelCustomReason, setCancelCustomReason] = useState<string>('');

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
        return language === 'bn' ? 'আজকের' : "Today's";
      case 'yesterday':
        return language === 'bn' ? 'গতকালের' : "Yesterday's";
      case 'this_week':
        return language === 'bn' ? 'গত ৭ দিনের' : 'Past 7 Days';
      case 'this_month':
        return language === 'bn' ? 'এই মাসের' : 'This Month';
      case 'custom':
        return customDate
          ? (language === 'bn' ? `তারিখ: ${customDate}` : `Date: ${customDate}`)
          : (language === 'bn' ? 'নির্দিষ্ট তারিখ' : 'Selected Date');
      case 'all':
      default:
        return language === 'bn' ? 'সর্বমোট' : 'All Time';
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

  // Current month salary cycle (1st to last-day 30th/31st with 1st of next month payout date)
  const currentMonthCycle = React.useMemo(() => {
    const now = new Date();
    return getSalaryMonthCycle(now.getFullYear(), now.getMonth());
  }, []);

  const currentMonthKey = currentMonthCycle.id;

  // Filter all salary payments received by this rider
  const mySalaryTransactions = React.useMemo(() => {
    return (paymentTransactions || [])
      .filter(
        (tx) =>
          tx.type === 'salary_payment' &&
          (tx.riderId === rider.id || tx.riderPhone === rider.phone)
      )
      .sort((a, b) => new Date(b.processedAt || b.createdAt).getTime() - new Date(a.processedAt || a.createdAt).getTime());
  }, [paymentTransactions, rider]);

  // Current month's salary payment record if already paid
  const currentMonthSalaryPayment = React.useMemo(() => {
    return mySalaryTransactions.find(
      (tx) => tx.monthPeriod === currentMonthKey && tx.status === 'approved'
    );
  }, [mySalaryTransactions, currentMonthKey]);

  // Rider's parcels delivered strictly in the current month cycle (1st 00:00:00 to last-day 23:59:59)
  const currentMonthDeliveredParcels = React.useMemo(() => {
    return allOrders.filter((o) => {
      if (o.riderId !== rider.id || o.orderStatus !== 'delivered') return false;
      const dStr = o.updatedAt || o.createdAt;
      return isTimestampInSalaryCycle(dStr, currentMonthCycle);
    });
  }, [allOrders, rider.id, currentMonthCycle]);

  // Rider's parcels cancelled in the current month cycle
  const currentMonthCancelledParcels = React.useMemo(() => {
    return allOrders.filter((o) => {
      if (o.riderId !== rider.id) return false;
      const isCancelled = o.orderStatus === 'cancelled' || o.isRiderCancelled;
      if (!isCancelled) return false;
      const dStr = o.updatedAt || o.createdAt;
      return isTimestampInSalaryCycle(dStr, currentMonthCycle);
    });
  }, [allOrders, rider.id, currentMonthCycle]);

  // Filter this rider's deposit requests
  const myDepositRequests = (depositRequests || []).filter((d) => d.riderId === rider.id);
  const pendingDepositRequest = myDepositRequests.find((d) => d.status === 'pending');

  const handleClaimOrder = async (orderId: string) => {
    if (rider.isActive === false || rider.isDeactivated === true) {
      alert('আপনার অ্যাকাউন্ট সাময়িকভাবে ডিঅ্যাক্টিভ করা রয়েছে। নতুন কোনো অর্ডার গ্রহণ করা সম্ভব নয়। অফিসে বকেয়া ব্যালেন্স জমা দিয়ে বা এডমিনের সাথে যোগাযোগ করে একাউন্ট সক্রিয় করুন।');
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

  // Confirm rider cancelling/releasing an accepted order
  const handleCancelSubmit = async () => {
    if (!cancelOrderId) return;
    const finalReason =
      cancelPresetReason === 'অন্যান্য কারণ' && cancelCustomReason.trim()
        ? cancelCustomReason.trim()
        : cancelPresetReason;

    setIsProcessing(true);
    if (onCancelOrder) {
      await onCancelOrder(cancelOrderId, finalReason);
    }
    setIsProcessing(false);
    setCancelOrderId(null);
    setCancelCustomReason('');
  };

  // Confirm rider adjusting/verifying customer delivery distance
  const handleAdjustDistanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingOrder) return;
    setIsProcessing(true);
    if (onAdjustOrderDistance) {
      await onAdjustOrderDistance(adjustingOrder.id, adjustDistanceTier, adjustNote);
    }
    setAdjustSuccessMsg(`অর্ডার #${adjustingOrder.id}-এর দূরত্ব সফলভাবে '${adjustDistanceTier}' কিমি হিসেবে সংশোধিত হয়েছে।`);
    setTimeout(() => setAdjustSuccessMsg(''), 6000);
    setIsProcessing(false);
    setAdjustingOrder(null);
  };

  const handleHandoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (handoverAmount <= 0) return;
    setIsProcessing(true);
    if (onSubmitDeposit) {
      await onSubmitDeposit(handoverAmount, handoverNotes);
      setDepositSuccessMsg(`৳${handoverAmount} জমার রিকোয়েস্ট এডমিন অফিসে পাঠানো হয়েছে। এডমিন টাকা বুঝে নিয়ে অনুমোদন করলে ব্যালেন্স কর্তন হবে ও ট্রানজাকশন মেমো তৈরি হবে।`);
      setTimeout(() => setDepositSuccessMsg(''), 7000);
    } else {
      await onRecordHandover(rider.id, handoverAmount, handoverNotes);
    }
    setIsProcessing(false);
    setShowHandoverModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Lightweight Header for Rider Pages */}
      <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 shadow-2xs mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0 border border-amber-200">
            <Bike className="w-5 h-5 text-amber-800" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 leading-tight">
              {currentTab === 'overview' && (language === 'bn' ? 'রাইডার ওভারভিউ' : 'Rider Overview')}
              {currentTab === 'orders' && (language === 'bn' ? 'অর্ডারসমূহ' : 'Orders')}
              {currentTab === 'outlets' && (language === 'bn' ? 'আমার এরিয়ার আউটলেট' : 'Union Outlets')}
              {currentTab === 'profile' && (language === 'bn' ? 'রাইডার প্রোফাইল' : 'Rider Profile')}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              {rider.name} • {rider.area === 'kapasia' ? 'কাপাসিয়া' : 'কালীগঞ্জ'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onToggleOnline(!rider.isOnline)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer ${
              rider.isOnline
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/30'
                : 'bg-slate-400 text-white'
            }`}
            title={language === 'bn' ? 'ডিউটি স্ট্যাটাস পরিবর্তন করুন' : 'Toggle duty status'}
          >
            <span className={`w-2 h-2 rounded-full ${rider.isOnline ? 'bg-amber-300 animate-ping' : 'bg-slate-200'}`}></span>
            <span>
              {rider.isOnline
                ? (language === 'bn' ? 'অনলাইন (সক্রিয়)' : 'Online')
                : (language === 'bn' ? 'অফলাইন' : 'Offline')}
            </span>
          </button>
        </div>
      </div>

      {/* NOTIFICATION: DEPOSIT REQUEST SUCCESS */}
      {depositSuccessMsg && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-4 mb-6 text-emerald-950 flex items-center gap-3 shadow-xs animate-in fade-in">
          <CheckCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-bold text-emerald-900">{depositSuccessMsg}</p>
        </div>
      )}

      {/* DEACTIVATION WARNING BANNER */}
      {(rider.isActive === false || rider.isDeactivated === true) && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-5 mb-6 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 font-bold mt-0.5 shadow-xs">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-rose-900">
                  {language === 'bn'
                    ? 'আপনার রাইডার অ্যাকাউন্টটি সাময়িকভাবে ডিঅ্যাক্টিভ (স্থগিত) করা হয়েছে'
                    : 'Your rider account is temporarily suspended (inactive)'}
                </h3>
                <span className="bg-rose-700 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {language === 'bn' ? 'ডিঅ্যাক্টিভ • নতুন অর্ডার বন্ধ' : 'Inactive • Claiming Locked'}
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-1 font-medium">
                <strong>{language === 'bn' ? 'কারণ: ' : 'Reason: '}</strong>
                {rider.deactivatedReason || (language === 'bn' ? 'ব্যালেন্স অফিসে জমা করার জন্য সাময়িক ডিঅ্যাক্টিভ' : 'Account deactivated for cash settlement')}
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                {language === 'bn'
                  ? <>হাতে থাকা বকেয়া ব্যালেন্স: <strong className="font-mono font-bold text-rose-950 text-xs">{formatBDT(cashInHand)}</strong> অফিসে জমা দেওয়ার রিকোয়েস্ট পাঠান। এডমিন ভেরিফাই করে অনুমোদন দিলে অ্যাকাউন্টটি পুনরায় অ্যাক্টিভ হবে।</>
                  : <>Cash in hand balance: <strong className="font-mono font-bold text-rose-950 text-xs">{formatBDT(cashInHand)}</strong>. Please submit a deposit request to office.</>}
              </p>
            </div>
          </div>
          {cashInHand > 0 && (
            <button
              onClick={() => {
                setHandoverAmount(cashInHand);
                setShowHandoverModal(true);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Banknote className="w-4 h-4" />
              <span>{language === 'bn' ? 'এডমিন অফিসে ক্যাশ জমা দিন' : 'Deposit Cash to Admin'}</span>
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. OVERVIEW TAB: Metrics & Cash Office Deposits (হোম / ওভারভিউ সেকশন) */}
      {/* ========================================================================= */}
      {currentTab === 'overview' && (
        <div className="space-y-6 mb-8">
          {/* Date-wise Filtering Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                {language === 'bn' ? 'তারিখ অনুযায়ী ডেলিভারি ও হিসাব ফিল্টারিং' : 'Date Filter & Earnings'}
              </h3>
              <p className="text-[10px] text-slate-500">
                {language === 'bn'
                  ? 'নির্দিষ্ট সময়ের ডেলিভারি সংখ্যা, ব্যালেন্স ও আয় ফিল্টার করুন'
                  : 'Filter deliveries, balances, and rider earnings by date'}
              </p>
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
              {language === 'bn' ? 'সকল সময়' : 'All Time'}
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
              {language === 'bn' ? 'আজকে' : 'Today'}
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
              {language === 'bn' ? 'গতকাল' : 'Yesterday'}
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
              {language === 'bn' ? 'গত ৭ দিন' : 'Past 7 Days'}
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
              {language === 'bn' ? 'এই মাস' : 'This Month'}
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

      {/* Quick Hub Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <button
          type="button"
          onClick={() => setCurrentTab('orders')}
          className="p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                ইনকামিং ও সক্রিয় অর্ডারসমূহ
              </h4>
              <p className="text-[11px] text-slate-600">
                {incomingAvailableOrders.length} টি নতুন অর্ডার অপেক্ষা করছে • {myActiveDeliveries.length} টি সক্রিয়
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-700 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('outlets')}
          className="p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-900">
                আমার ইউনিয়নের আউটলেট হাব
              </h4>
              <p className="text-[11px] text-slate-600">
                {riderUnionOutlets.length} টি আউটলেট পয়েন্ট • ম্যানেজার ফোন নম্বর ও ঠিকানা
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-700 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* SECTION: RIDER SALARY & PAYMENTS (আমার মাসিক বেতন ও কমিশন হিসাব) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-indigo-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-2xl bg-indigo-100 text-indigo-800">
                <DollarSign className="w-4 h-4" />
              </span>
              <h2 className="text-base font-extrabold text-slate-900">
                {language === 'bn' ? `${currentMonthCycle.monthNameBn} ${currentMonthCycle.year} – বেতন ও পেমেন্ট হিসাব` : 'My Monthly Salary & Payments'}
              </h2>
              <span className="bg-indigo-100 text-indigo-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                ০১-{currentMonthCycle.daysInMonth} {currentMonthCycle.monthNameBn}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              📅 <strong>কার্যকাল:</strong> {currentMonthCycle.dateRangeBn} &nbsp;|&nbsp; 💰 <strong>নির্ধারিত বেতন ডেট:</strong> <span className="text-emerald-800 font-bold">{currentMonthCycle.payoutDateBn}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              💡 {currentMonthCycle.daysInMonth} তারিখ রাত ১১:৫৯ পর্যন্ত সম্পন্ন পার্সেল এই মাসের বেতনে যুক্ত; ১ তারিখ থেকে নতুন কাজ পরবর্তী মাসে যোগ হবে।
            </p>
          </div>

          {currentMonthSalaryPayment ? (
            <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black px-3 py-1.5 rounded-2xl inline-flex items-center gap-1.5 self-start sm:self-auto">
              <CheckCircle className="w-4 h-4 text-emerald-700" />
              <span>চলতি মাসের বেতন পরিশোধিত (Paid)</span>
            </span>
          ) : (
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black px-3 py-1.5 rounded-2xl inline-flex items-center gap-1.5 self-start sm:self-auto">
              <Clock className="w-4 h-4 text-amber-700" />
              <span>চলতি মাসের বেতন প্রসেসিং চলছে</span>
            </span>
          )}
        </div>

        {/* Current Month Delivery Performance & Salary Card */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-bold block">চলতি মাসে ডেলিভারি</span>
            <span className="text-lg sm:text-xl font-black text-emerald-800 block mt-0.5">
              {currentMonthDeliveredParcels.length} টি
            </span>
            <span className="text-[9px] text-slate-400">সফল পার্সেল</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-bold block">চলতি মাসে বাতিল</span>
            <span className="text-lg sm:text-xl font-black text-rose-700 block mt-0.5">
              {currentMonthCancelledParcels.length} টি
            </span>
            <span className="text-[9px] text-slate-400">ক্যান্সেল পার্সেল</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-indigo-200 text-center col-span-2 sm:col-span-2">
            <span className="text-[10px] text-indigo-900 font-bold block">
              {currentMonthSalaryPayment ? 'পরিশোধিত বেতন' : 'অফিস কর্তৃক প্রদেয় বেতন'}
            </span>
            <span className="text-lg sm:text-xl font-black text-indigo-900 block mt-0.5">
              {currentMonthSalaryPayment
                ? formatBDT(currentMonthSalaryPayment.amount)
                : formatBDT(currentMonthDeliveredParcels.length * 40)}
            </span>
            <span className="text-[9px] text-slate-500">
              {currentMonthSalaryPayment
                ? `TrxID: ${currentMonthSalaryPayment.transactionId || currentMonthSalaryPayment.id}`
                : `প্রতি পার্সেল আনুমানিক ৳৪০ হারে হিসাব`}
            </span>
          </div>
        </div>

        {/* Active Payment Banner if Paid */}
        {currentMonthSalaryPayment && (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-300 text-emerald-950 text-xs space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5 text-emerald-900">
                <CheckCircle className="w-4 h-4 text-emerald-700" />
                <span>আপনার চলতি মাসের বেতন অফিস থেকে সফলভাবে বিকাশ/নগদে পাঠানো হয়েছে!</span>
              </span>
              <span className="bg-emerald-700 text-white font-mono px-2 py-0.5 rounded-lg text-[10px]">
                {formatBDT(currentMonthSalaryPayment.amount)}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200/70 text-[11px]">
              <div>
                <span className="text-emerald-800 font-semibold">ট্রানজেকশন আইডি (TrxID):</span>
                <span className="font-mono font-black text-emerald-950 block bg-white px-2 py-0.5 rounded border border-emerald-200 mt-0.5">
                  {currentMonthSalaryPayment.transactionId || currentMonthSalaryPayment.id}
                </span>
              </div>
              <div>
                <span className="text-emerald-800 font-semibold">পেমেন্ট মাধ্যম:</span>
                <span className="font-bold uppercase text-emerald-950 block mt-0.5">
                  {currentMonthSalaryPayment.paymentMethod || 'bKash'}
                </span>
              </div>
              <div>
                <span className="text-emerald-800 font-semibold">পরিশোধের তারিখ:</span>
                <span className="font-mono text-emerald-900 block mt-0.5">
                  {new Date(currentMonthSalaryPayment.processedAt || currentMonthSalaryPayment.createdAt).toLocaleString('bn-BD', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            </div>
            {currentMonthSalaryPayment.notes && (
              <p className="text-[10px] text-emerald-800 italic pt-1">
                অফিস নোট: {currentMonthSalaryPayment.notes}
              </p>
            )}
          </div>
        )}

        {/* Previous Salary Payment History Table / List */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-slate-600" />
            <span>সকল প্রাপ্ত বেতনের ট্রানজাকশন হিস্ট্রি ({mySalaryTransactions.length})</span>
          </h4>

          {mySalaryTransactions.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              এখনও কোনো বেতনের ট্রানজাকশন হিস্ট্রি তৈরি হয়নি। অফিস থেকে বেতন পাঠানোর সাথে সাথে TrxID সহ এখানে যুক্ত হবে।
            </div>
          ) : (
            <div className="space-y-2">
              {mySalaryTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-2 py-0.5 rounded-full text-[10px]">
                        Paid
                      </span>
                      <span className="font-bold text-slate-900">
                        {tx.monthPeriod || 'মাসিক'} ডেলিভারি বেতন
                      </span>
                      {tx.deliveredCount !== undefined && (
                        <span className="text-slate-500 font-semibold text-[11px]">
                          ({tx.deliveredCount} টি পার্সেল)
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span className="font-mono text-indigo-900 font-bold">
                        TrxID: {tx.transactionId || tx.id}
                      </span>
                      <span>•</span>
                      <span className="uppercase font-semibold">
                        মাধ্যম: {tx.paymentMethod || 'অনলাইন'}
                      </span>
                      <span>•</span>
                      <span className="font-mono">
                        {new Date(tx.processedAt || tx.createdAt).toLocaleDateString('bn-BD')}
                      </span>
                    </div>
                    {tx.notes && (
                      <p className="text-[10px] text-slate-400">
                        নোট: {tx.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-right sm:text-right shrink-0">
                    <span className="font-black font-mono text-emerald-700 text-sm block">
                      +{formatBDT(tx.amount)}
                    </span>
                    <span className="text-[10px] text-emerald-800 font-semibold">
                      পরিশোধ সম্পন্ন
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: CASH DEPOSIT REQUESTS & OFFICE MEMOS */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-700" />
              <span>ক্যাশ জমার রিকোয়েস্ট ও পেমেন্ট মেমো ({myDepositRequests.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              অফিসে টাকা জমা দেওয়ার রিকোয়েস্ট স্ট্যাটাস, এডমিনের অনুমোদন এবং ট্রানজাকশন মেমো
            </p>
          </div>
          {cashInHand > 0 && (
            <button
              onClick={() => {
                setHandoverAmount(cashInHand);
                setShowHandoverModal(true);
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-2xs self-start sm:self-auto flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>নতুন জমার রিকোয়েস্ট পাঠান</span>
            </button>
          )}
        </div>

        {myDepositRequests.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            আপনার কোনো ক্যাশ জমার রিকোয়েস্ট বা মেমো এখনো নেই। ডেলিভারি শেষে ক্যাশ জমা দিতে উপরে বাটনে চাপুন।
          </div>
        ) : (
          <div className="space-y-3">
            {myDepositRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                    <span className="font-mono font-bold text-slate-900">ID: #{req.id}</span>
                    {req.status === 'pending' && (
                      <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-700 animate-spin" />
                        <span>অপেক্ষমান (এডমিন ভেরিফিকেশন চলছে)</span>
                      </span>
                    )}
                    {req.status === 'approved' && (
                      <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCheck className="w-3 h-3 text-emerald-700" />
                        <span>অনুমোদিত • ক্যাশ অফিসে গৃহীত</span>
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="bg-rose-100 text-rose-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-rose-700" />
                        <span>প্রত্যাখ্যাত (ব্যালেন্স বৃদ্ধি বহাল)</span>
                      </span>
                    )}
                    {req.voucherId && (
                      <span className="bg-blue-100 text-blue-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                        মেমো: {req.voucherId}
                      </span>
                    )}
                  </div>

                  {req.notes && (
                    <p className="text-slate-600">
                      <strong>রাইডার নোট:</strong> {req.notes}
                    </p>
                  )}

                  {req.adminNotes && (
                    <p className="text-slate-700 bg-white p-2 rounded-xl border border-slate-200 text-[11px] mt-1 inline-block">
                      <strong>🏢 অফিস মন্তব্য:</strong> {req.adminNotes}
                    </p>
                  )}

                  <p className="text-[10px] text-slate-400 mt-1">
                    রিকোয়েস্টের সময়: {new Date(req.createdAt).toLocaleString('bn-BD', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block">জমার পরিমাণ</span>
                  <span className="font-mono font-black text-base text-emerald-900">
                    {formatBDT(req.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )}

  {/* ========================================================================= */}
  {/* 2. ORDERS TAB: Incoming Orders, Active Deliveries & History (অর্ডার সেকশন) */}
  {/* ========================================================================= */}
  {currentTab === 'orders' && (
    <div className="space-y-8 mb-8">
      {/* Duty status reminder if offline */}
      {!rider.isOnline && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center text-xs text-amber-900 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
            <span>আপনি বর্তমানে <strong>অফলাইনে</strong> আছেন। নতুন অর্ডার পাওয়ার জন্য ডিউটি স্ট্যাটাস অন করুন।</span>
          </div>
          <button
            type="button"
            onClick={() => onToggleOnline(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-1.5 rounded-xl text-xs shrink-0 cursor-pointer shadow-xs"
          >
            অনলাইন চালু করুন
          </button>
        </div>
      )}

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
              {incomingAvailableOrders.map((order, idx) => (
                <div
                  key={`${order.id}-${idx}`}
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
                      {order.pickupPlaceName && (
                        <p className="flex items-center gap-1.5 text-slate-900 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          <Store className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>পিকআপ শপ/পয়েন্ট: <span className="text-amber-900">{order.pickupPlaceName}</span></span>
                        </p>
                      )}
                      <p className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>গন্তব্য: <strong className="text-slate-800">{order.deliveryAddress}</strong></span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        গ্রাহক: {order.customerName} ({order.customerPhone})
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                        <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Package className="w-3 h-3 text-slate-600" />
                          {order.items.length} আইটেম ({formatBDT(order.subtotal)})
                        </span>
                        {order.totalWeightKg !== undefined && order.totalWeightKg > 0 && (
                          <span className="bg-purple-50 text-purple-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-purple-200">
                            <Scale className="w-3 h-3 text-purple-600" />
                            ওজন: {order.totalWeightKg} কেজি
                          </span>
                        )}
                        {order.distanceTier && (
                          <span className="bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-blue-200">
                            <Navigation className="w-3 h-3 text-blue-600" />
                            দূরত্ব: {order.distanceTier} কিমি
                          </span>
                        )}
                      </div>
                      {order.notes && (
                        <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-950 mt-1">
                          <strong>📝 কাস্টমার নোট:</strong> {order.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleClaimOrder(order.id)}
                    disabled={isProcessing || rider.isActive === false || rider.isDeactivated === true}
                    className={`w-full font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-xs ${
                      rider.isActive === false || rider.isDeactivated === true
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    }`}
                  >
                    {rider.isActive === false || rider.isDeactivated === true ? (
                      <>
                        <Lock className="w-4 h-4 text-slate-500" />
                        <span>অ্যাকাউন্ট ডিঅ্যাক্টিভ (অর্ডার গ্রহণ বন্ধ)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>অর্ডার গ্রহণ করুন (Accept Delivery)</span>
                      </>
                    )}
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
            {myActiveDeliveries.map((order, idx) => {
              const navUrl = getNavigationUrl(order.deliveryLat, order.deliveryLng);

              return (
                <div
                  key={`${order.id}-${idx}`}
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
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-700 block">ডেলিভারি ঠিকানা ও ফোন:</span>
                      {order.pickupPlaceName && (
                        <div className="bg-amber-50 text-amber-900 px-2.5 py-1 rounded-xl text-xs font-bold border border-amber-200 flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>পিকআপ পয়েন্ট: {order.pickupPlaceName}</span>
                        </div>
                      )}
                      <p className="font-semibold text-slate-900">{order.customerName}</p>
                      <p className="text-slate-600 leading-relaxed">{order.deliveryAddress}</p>
                      
                      {/* Distance & Weight Info */}
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Navigation className="w-3 h-3 text-blue-600" />
                            <span>দূরত্ব স্ল্যাব:</span>
                          </span>
                          <span className="font-bold text-slate-800">
                            {order.distanceTier ? `${order.distanceTier} কিমি` : '১-২ কিমি'} 
                            {order.distanceCharge ? ` (৳${order.distanceCharge})` : ''}
                          </span>
                        </div>
                        {order.totalWeightKg !== undefined && order.totalWeightKg > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1">
                              <Scale className="w-3 h-3 text-purple-600" />
                              <span>মোট পণ্যের ওজন:</span>
                            </span>
                            <span className="font-bold text-purple-900">
                              {order.totalWeightKg} কেজি {order.weightCharge ? ` (+৳${order.weightCharge})` : ''}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                          <span className="font-bold text-slate-700">মোট ডেলিভারি চার্জ:</span>
                          <span className="font-extrabold text-emerald-800">৳{order.deliveryFee}</span>
                        </div>

                        {order.distanceVerifiedBy && (
                          <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 mt-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>দূরত্ব যাচাইকৃত ({order.distanceVerifiedBy === 'admin' ? 'এডমিন' : 'রাইডার'})</span>
                            {order.distanceAdjustmentNote && (
                              <span className="text-slate-500 font-normal"> - {order.distanceAdjustmentNote}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-1 flex flex-wrap items-center gap-2">
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
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustingOrder(order);
                            setAdjustDistanceTier((order.distanceTier as DistanceTier) || '1-2');
                            setAdjustNote('কাস্টমারের বাড়ির প্রকৃত দূরত্ব যাচাই করে সংশোধন করা হলো');
                          }}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="কাস্টমার ভুল বা কম দূরত্ব নির্বাচন করলে এখান থেকে সংশোধন করুন"
                        >
                          <SlidersHorizontal className="w-3 h-3 text-indigo-600" />
                          <span>দূরত্ব যাচাই / সংশোধন</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 flex flex-col justify-between">
                      <div>
                        <span className="font-bold text-slate-700 block mb-1">পণ্য তালিকা ও হিসাব:</span>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {order.items.map((it) => (
                            <div key={it.productId} className="flex justify-between text-slate-600">
                              <span>{it.nameBn} x {it.quantity} {it.unit}</span>
                              <span className="font-semibold">{formatBDT(it.lineTotal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1">
                        <div className="flex justify-between text-slate-500">
                          <span>পণ্য সাবটোটাল:</span>
                          <span className="font-semibold">{formatBDT(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>ডেলিভারি ফি:</span>
                          <span className="font-semibold">{formatBDT(order.deliveryFee)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-900 text-xs pt-1 border-t border-slate-200">
                          <span>সর্বমোট ক্যাশ আদায়:</span>
                          <span className="text-emerald-800 font-extrabold">{formatBDT(order.totalAmount)}</span>
                        </div>
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
                      type="button"
                      onClick={() => {
                        setCancelOrderId(order.id);
                        setCancelPresetReason('গ্রাহক ফোন রিসিভ করছেন না');
                        setCancelCustomReason('');
                      }}
                      disabled={isProcessing}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0"
                      title="অর্ডারটি ছেড়ে দিলে অন্য কোনো রাইডার এটি নিতে পারবে"
                    >
                      <XCircle className="w-4 h-4 text-amber-600" />
                      <span>অর্ডার ছেড়ে দিন / বাতিল</span>
                    </button>

                    <button
                      onClick={() => setFailOrderId(order.id)}
                      disabled={isProcessing}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold py-2.5 px-3 rounded-xl text-xs"
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
            {myDeliveredOrdersFiltered.map((order, idx) => {
              const split = calculateOrderFinancialSplit(order);
              return (
                <div
                  key={`${order.id}-${idx}`}
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
    </div>
  )}

  {/* ========================================================================= */}
  {/* 3. OUTLETS TAB: Rider Union Outlets (এরিয়া ট্যাপে রাইডার ইউনিয়নের আউটলেট) */}
  {/* ========================================================================= */}
  {currentTab === 'outlets' && (
    <div className="space-y-6 mb-8">
      <div className="bg-emerald-800 text-white p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Store className="w-5 h-5 text-amber-300" />
            <h2 className="text-base sm:text-lg font-black">
              {language === 'bn' ? 'আমার ইউনিয়নের আউটলেট হাবসমূহ' : 'My Union Outlets & Hubs'}
            </h2>
            <span className="bg-emerald-700 text-emerald-100 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-600">
              {riderUnionOutlets.length} টি আউটলেট
            </span>
          </div>
          <p className="text-xs text-emerald-100 leading-relaxed max-w-2xl">
            {language === 'bn'
              ? `আপনার নির্ধারিত থানা (${rider.thanaNameBn || rider.area || 'কালীগঞ্জ'}) ও ইউনিয়নের ডেলিভারি অর্ডারগুলো নিচের আউটলেট পয়েন্টগুলো থেকে সংগ্রহ (Pick-up) করতে পারবেন। যেকোনো প্রয়োজনে আউটলেট ম্যানেজারের সাথে সরাসরি যোগাযোগ করুন।`
              : `Outlets and delivery distribution hubs serving your assigned union area. Call the hub manager directly for pickup and stock inquiries.`}
          </p>
        </div>
        <div className="bg-emerald-900/60 border border-emerald-700/60 rounded-2xl px-3.5 py-2 shrink-0 text-right">
          <span className="text-[10px] text-emerald-300 block">আপনার নির্ধারিত ইউনিয়ন</span>
          <span className="text-xs font-bold text-amber-300">
            {assignedUnionNames.join(', ') || 'সকল ইউনিয়ন'}
          </span>
        </div>
      </div>

      {riderUnionOutlets.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center text-slate-500">
          <Store className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h4 className="font-bold text-slate-800 text-sm mb-1">কোনো আউটলেট পাওয়া যায়নি</h4>
          <p className="text-xs text-slate-500">আপনার নির্ধারিত ইউনিয়নের জন্য বর্তমানে কোনো আউটলেট তালিকাভুক্ত নেই।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {riderUnionOutlets.map((outlet) => (
            <div
              key={outlet.id}
              className="bg-white rounded-3xl border-2 border-slate-200 hover:border-emerald-500 transition-all p-5 sm:p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                        {outlet.nameBn}
                      </h3>
                      {outlet.status === 'active' ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          সক্রিয়
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          স্থগিত
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                      {outlet.hubType} • {outlet.thanaNameBn}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                    <Store className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 mb-4">
                  <p className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-800">ঠিকানা:</strong> {outlet.addressBn}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span><strong className="text-slate-800">অপারেটিং সময়:</strong> {outlet.timing}</span>
                  </p>
                  <div className="pt-1">
                    <span className="text-[11px] font-bold text-slate-700 block mb-1">
                      কভারেজ ইউনিয়নসমূহ:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {outlet.coverageUnions?.map((uName, idx) => {
                        const isRiderCoverage = assignedUnionNames.includes(uName);
                        return (
                          <span
                            key={idx}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                              isRiderCoverage
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400/40'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {isRiderCoverage ? '★ ' : ''}{uName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom In-Charge Contact & Quick Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">ইন-চার্জ ম্যানেজার</span>
                  <span className="text-xs font-bold text-slate-800">{outlet.managerName}</span>
                </div>
                <a
                  href={`tel:${outlet.phone}`}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>কল দিন: {outlet.phone}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )}

  {/* ========================================================================= */}
  {/* 4. PROFILE TAB: Rider Profile, Unions & Duty Status (রাইডার প্রোফাইল পেজ) */}
  {/* ========================================================================= */}
  {currentTab === 'profile' && (
    <div className="space-y-6 mb-8">
      {/* Main Rider Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center space-x-3.5">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0 border border-amber-200 shadow-2xs">
              <Bike className="w-8 h-8 text-amber-800" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                <h2 className="text-xl font-black text-slate-900">{rider.name}</h2>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  রাইডার আইডি: {rider.id}
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                <a
                  href={`tel:${rider.phone}`}
                  className="flex items-center gap-1 font-mono font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{rider.phone}</span>
                </a>
                <span>•</span>
                <span className="font-bold text-slate-700">
                  থানা: {rider.area === 'kapasia' ? 'কাপাসিয়া' : 'কালীগঞ্জ'}
                </span>
              </div>
            </div>
          </div>

          {/* Online / Offline Duty Switch */}
          <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 self-start sm:self-auto">
            <span className="text-xs font-bold text-slate-700">
              {language === 'bn' ? 'ডিউটি স্ট্যাটাস:' : 'Duty Status:'}
            </span>
            <button
              type="button"
              onClick={() => onToggleOnline(!rider.isOnline)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer ${
                rider.isOnline
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/30'
                  : 'bg-slate-400 text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${rider.isOnline ? 'bg-amber-300 animate-ping' : 'bg-slate-200'}`}></span>
              <span>
                {rider.isOnline
                  ? (language === 'bn' ? 'অনলাইন (সক্রিয়)' : 'Online (Active)')
                  : (language === 'bn' ? 'অফলাইন' : 'Offline')}
              </span>
            </button>
          </div>
        </div>

        {/* Assigned Unions Section */}
        <div className="py-4 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
            <Layers className="w-4 h-4 text-emerald-700" />
            <span>আপনার নির্ধারিত ডেলিভারি ইউনিয়নসমূহ ({rider.assignedUnionIds?.length || 0}টি):</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {rider.assignedUnionIds && rider.assignedUnionIds.length > 0 ? (
              rider.assignedUnionIds.map((uId) => {
                const uObj = SEED_UNIONS.find((u) => u.id === uId);
                return (
                  <span
                    key={uId}
                    className="bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-xl shadow-2xs"
                  >
                    {uObj ? uObj.nameBn : uId}
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-xl">
                সকল ইউনিয়ন (আন-রেস্ট্রিক্টেড)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            * কাস্টমাররা এই ইউনিয়নগুলো থেকে কোনো অর্ডার করলে স্বয়ংক্রিয়ভাবে আপনার অর্ডার ট্যাবে চলে আসবে।
          </p>
        </div>

        {/* Account Financial & Delivery Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">হাতে নগদ ক্যাশ ব্যালেন্স</span>
              <span className="text-lg font-black text-rose-700 font-mono mt-0.5 block">{formatBDT(cashInHand)}</span>
              <span className="text-[10px] text-slate-400">{cashInHand > 0 ? 'অফিসে জমা প্রদেয়' : 'পরিশোধিত'}</span>
            </div>
            {cashInHand > 0 && (
              <button
                type="button"
                onClick={() => {
                  setHandoverAmount(cashInHand);
                  setShowHandoverModal(true);
                }}
                className="mt-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>অফিসে জমা দিন</span>
              </button>
            )}
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block">সর্বমোট সম্পন্ন ডেলিভারি</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">{allMyDeliveredOrders.length} টি</span>
            <span className="text-[10px] text-emerald-700 font-medium">সফল ডেলিভারি</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block">সর্বমোট অর্জিত আয়</span>
            <span className="text-lg font-black text-emerald-800 font-mono mt-0.5 block">{formatBDT(riderTotalEarnings)}</span>
            <span className="text-[10px] text-slate-400">ট্রিপ কমিশন ও ফি</span>
          </div>
        </div>

        {/* Emergency Hotline & Help */}
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">জরুরি এডমিন অফিস হেল্পলাইন</h4>
              <p className="text-[11px] text-amber-800 mt-0.5">যেকোনো টেকনিক্যাল সমস্যা, ক্যাশ মেমো ভেরিফিকেশন বা ইউনিয়ন পরিবর্তনের জন্য অফিসে যোগাযোগ করুন।</p>
            </div>
          </div>
          <a
            href="tel:01403751400"
            className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>অফিসে কল দিন</span>
          </a>
        </div>

        {/* Logout Action */}
        {onLogout && (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onLogout}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>রাইডার অ্যাকাউন্ট লগআউট করুন</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )}

      {/* Rider Cancel / Release Order Modal */}
      {cancelOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  অর্ডার ছেড়ে দিন / বাতিল করুন
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">অর্ডার: #{cancelOrderId}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-3 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              ⚠️ আপনি এই অর্ডারটি ছেড়ে দিলে এটি পুনরায় অন্য রাইডারদের জন্য উন্মুক্ত হবে এবং এডমিন ড্যাশবোর্ডে <strong>'রাইডার বাতিলকৃত'</strong> তালিকায় জমা হবে।
            </p>

            <div className="space-y-2 mb-4 text-xs">
              <label className="font-bold text-slate-800 block">বাতিল করার সুনির্দিষ্ট কারণ নির্বাচন করুন:</label>
              {[
                'গ্রাহক ফোন রিসিভ করছেন না',
                'অর্ডারের লোকেশন অনেক দূরে বা ভুল ঠিকানা',
                'জরুরি ব্যক্তিগত সমস্যা (বাইক নষ্ট / অসুস্থতা)',
                'সন্দেহজনক বা ফেক কাস্টমার অর্ডার',
                'অন্যান্য কারণ',
              ].map((reasonOption) => (
                <label
                  key={reasonOption}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                    cancelPresetReason === reasonOption
                      ? 'bg-amber-50 border-amber-400 font-bold text-amber-950'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancel_reason"
                    checked={cancelPresetReason === reasonOption}
                    onChange={() => setCancelPresetReason(reasonOption)}
                    className="text-amber-600"
                  />
                  <span>{reasonOption}</span>
                </label>
              ))}

              {cancelPresetReason === 'অন্যান্য কারণ' && (
                <textarea
                  rows={2}
                  value={cancelCustomReason}
                  onChange={(e) => setCancelCustomReason(e.target.value)}
                  placeholder="বিস্তারিত কারণ এখানে লিখুন..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 mt-2"
                />
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelSubmit}
                disabled={isProcessing || (cancelPresetReason === 'অন্যান্য কারণ' && !cancelCustomReason.trim())}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-xs disabled:opacity-40 transition-colors cursor-pointer"
              >
                অর্ডার ছেড়ে দেওয়া নিশ্চিত করুন
              </button>
              <button
                type="button"
                onClick={() => setCancelOrderId(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs cursor-pointer"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Cash Deposit Request to Office Modal */}
      {showHandoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  এডমিন অফিসে ক্যাশ জমা দেওয়ার রিকোয়েস্ট
                </h3>
                <p className="text-[11px] text-slate-500">
                  বর্তমান ক্যাশ ব্যালেন্স: <strong className="text-emerald-700 font-mono font-bold">{formatBDT(cashInHand)}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleHandoverSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  জমার পরিমাণ (৳) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={cashInHand}
                  value={handoverAmount}
                  onChange={(e) => setHandoverAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  জমার নোট / মেমো বিবরণ
                </label>
                <input
                  type="text"
                  placeholder="যেমন: অফিসে নগদ প্রদান / বিকাশ ট্রানজাকশন..."
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-[11px] text-emerald-950 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>স্বয়ংক্রিয় ভাউচার ও ডাটাবেজ সিস্টেম:</span>
                </p>
                <p>
                  রিকোয়েস্ট সাবমিট করার পর এডমিন অফিসে টাকা গ্রহণ করে অনুমোদন দিলে আপনার ব্যালেন্স স্বয়ংক্রিয়ভাবে মাইনাস হবে এবং একটি অফিস মেমো তৈরি হবে।
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isProcessing || handoverAmount <= 0}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  রিকোয়েস্ট পাঠান
                </button>
                <button
                  type="button"
                  onClick={() => setShowHandoverModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Distance Verification & Adjustment Modal for Rider */}
      {adjustingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-indigo-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    কাস্টমার দূরত্ব যাচাই ও সংশোধন
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    অর্ডার #{adjustingOrder.id} • {adjustingOrder.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustDistanceSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <p className="text-[11px] text-slate-500">
                  <strong>ডেলিভারি ঠিকানা:</strong> {adjustingOrder.deliveryAddress}
                </p>
                {adjustingOrder.pickupPlaceName && (
                  <p className="text-[11px] text-amber-800 font-medium">
                    <strong>পিকআপ শপ/পয়েন্ট:</strong> {adjustingOrder.pickupPlaceName}
                  </p>
                )}
                <p className="text-[11px] text-slate-600">
                  <strong>কাস্টমারের দেওয়া আনুমানিক দূরত্ব:</strong>{' '}
                  <span className="font-bold text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded">
                    {adjustingOrder.distanceTier || '১-২'} কিমি
                  </span>
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  সঠিক প্রকৃত দূরত্ব নির্বাচন করুন <span className="text-rose-500">*</span>
                </label>
                <select
                  value={adjustDistanceTier}
                  onChange={(e) => setAdjustDistanceTier(e.target.value as DistanceTier)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                >
                  {DISTANCE_TIER_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.labelBn} (চার্জ: ৳{pricingConfig.distanceRates[opt.id] || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic live calculation preview */}
              {(() => {
                const preview = calculateDeliveryChargeBreakdown(
                  adjustDistanceTier,
                  adjustingOrder.totalWeightKg || 0,
                  pricingConfig
                );
                const prevFee = adjustingOrder.deliveryFee;
                const newFee = preview.totalDeliveryCharge;
                const diff = newFee - prevFee;
                const newGrandTotal = adjustingOrder.subtotal + newFee;

                return (
                  <div className="p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-200 text-[11px] space-y-1.5">
                    <span className="font-bold text-indigo-950 block">সংশোধিত ডেলিভারি চার্জ হিসাব:</span>
                    <div className="flex justify-between text-slate-600">
                      <span>দূরত্ব চার্জ ({preview.distanceTierLabelBn}):</span>
                      <span className="font-bold">৳{preview.distanceCharge}</span>
                    </div>
                    {preview.weightCharge > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>ওজন অতিরিক্ত চার্জ ({preview.weightTierLabelBn}):</span>
                        <span className="font-bold">+৳{preview.weightCharge}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-indigo-900 pt-1 border-t border-indigo-200">
                      <span>নতুন মোট ডেলিভারি ফি:</span>
                      <span className="text-sm">৳{newFee}</span>
                    </div>
                    {diff !== 0 && (
                      <div className="text-[10px] text-slate-500 flex justify-between">
                        <span>আগের চার্জ থেকে পরিবর্তন:</span>
                        <span className={diff > 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                          {diff > 0 ? `+৳${diff} বৃদ্ধি পাবে` : `-৳${Math.abs(diff)} কমবে`}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-slate-900 text-xs pt-1.5 border-t border-indigo-200">
                      <span>গ্রাহক থেকে নতুন ক্যাশ আদায়:</span>
                      <span className="text-emerald-800 text-sm font-black">{formatBDT(newGrandTotal)}</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  সংশোধনের কারণ / রাইডার নোট <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="যেমন: কাস্টমারের বাড়ি ৩-৪ কিমি দূরে, ভুল দূরত্ব দেওয়া হয়েছিল"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 bg-indigo-700 hover:bg-indigo-800 text-white font-bold py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isProcessing ? 'আপডেট হচ্ছে...' : 'দূরত্ব আপডেট ও ক্যাশ সংশোধন করুন'}
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustingOrder(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl cursor-pointer"
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
