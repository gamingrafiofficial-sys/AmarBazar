import React, { useState } from 'react';
import {
  Order,
  Product,
  DeliveryRiderAccount,
  Market,
  Category,
  ProductUnit,
  UnionArea,
  RiderDepositRequest,
  PaymentTransactionRecord,
} from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { StatusBadge } from '../common/StatusBadge';
import { OrderChatModal } from '../common/OrderChatModal';
import { OrderNoteSection } from '../common/OrderNoteSection';
import { SEED_UNIONS } from '../../data/seedData';
import { normalizePhone } from '../../lib/phone';
import {
  ShieldAlert,
  Package,
  Plus,
  Bike,
  Search,
  CheckCircle,
  Clock,
  MapPin,
  Trash2,
  Layers,
  Building,
  Edit2,
  Users,
  Check,
  X,
  Filter,
  MessageSquare,
  FileText,
  LogOut,
  Wallet,
  PauseCircle,
  PlayCircle,
  Banknote,
  AlertCircle,
  AlertTriangle,
  History,
  Phone,
  Eye,
  EyeOff,
  Lock,
  Globe,
  BarChart3,
  TrendingUp,
  Award,
  Crown,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  XCircle,
  CreditCard,
  ArrowDownLeft,
  Receipt,
  CheckCheck,
  RefreshCw,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';

interface AdminDashboardProps {
  orders: Order[];
  products: Product[];
  markets: Market[];
  categories: Category[];
  registeredRiders: DeliveryRiderAccount[];
  unions?: UnionArea[];
  depositRequests?: RiderDepositRequest[];
  paymentTransactions?: PaymentTransactionRecord[];
  onAddProduct: (prod: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateProduct?: (prodId: string, updates: Partial<Product>) => void;
  onToggleProductPrivate?: (prodId: string, isPrivate: boolean) => void;
  onDeleteProduct: (prodId: string) => void;
  onAddMarket: (market: Omit<Market, 'id'>) => void;
  onDeleteMarket: (marketId: string) => void;
  onRegisterRider: (rider: Omit<DeliveryRiderAccount, 'id' | 'createdAt'>) => void;
  onAssignRider: (orderId: string, riderId: string) => Promise<void>;
  onUpdateRiderUnions?: (riderId: string, assignedUnionIds: string[]) => void;
  onToggleRiderActive?: (riderId: string, isActive: boolean, reason?: string) => Promise<void> | void;
  onRecordHandover?: (riderId: string, amount: number, notes?: string) => Promise<void> | void;
  onApproveDeposit?: (requestId: string, adminNotes?: string) => Promise<void> | void;
  onRejectDeposit?: (requestId: string, adminNotes?: string) => Promise<void> | void;
  onMarkFakeOrder?: (orderId: string, reason: string) => Promise<void> | void;
  onSendMessage?: (orderId: string, text: string) => Promise<void>;
  onUpdateOrderNote?: (orderId: string, notes: string) => Promise<void>;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  orders: inputOrders,
  products,
  markets,
  categories,
  registeredRiders,
  unions = SEED_UNIONS,
  depositRequests = [],
  paymentTransactions = [],
  onAddProduct,
  onUpdateProduct,
  onToggleProductPrivate,
  onDeleteProduct,
  onAddMarket,
  onDeleteMarket,
  onRegisterRider,
  onAssignRider,
  onUpdateRiderUnions,
  onToggleRiderActive,
  onRecordHandover,
  onApproveDeposit,
  onRejectDeposit,
  onMarkFakeOrder,
  onSendMessage,
  onUpdateOrderNote,
  onLogout,
}) => {
  const { language, formatBDT } = useLanguage();

  // Deduplicate orders to prevent duplicate key errors and inconsistent statistics
  const orders = React.useMemo(() => {
    if (!Array.isArray(inputOrders)) return [];
    const map = new Map<string, Order>();
    for (const o of inputOrders) {
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
  }, [inputOrders]);

  const [activeTab, setActiveTab] = useState<
    | 'summary'
    | 'new_orders'
    | 'all_orders'
    | 'rider_balances'
    | 'products'
    | 'areas'
    | 'riders'
    | 'rider_cancelled'
    | 'fake_orders'
    | 'deposit_requests'
    | 'transactions'
  >('summary');

  // Rider Cancelled & Fake Order State
  const [riderCancelledSearch, setRiderCancelledSearch] = useState('');
  const [fakeOrderSearch, setFakeOrderSearch] = useState('');
  const [reassignModalOrder, setReassignModalOrder] = useState<Order | null>(null);
  const [reassignRiderId, setReassignRiderId] = useState<string>('');
  const [markFakeModalOrder, setMarkFakeModalOrder] = useState<Order | null>(null);
  const [markFakeReasonInput, setMarkFakeReasonInput] = useState<string>('গ্রাহকের সাথে কথা বলে নিশ্চিত হওয়া গেছে এটি ফেক/অসত্য অর্ডার');

  // Deposit Request Verification & Approval State
  const [depositSearch, setDepositSearch] = useState('');
  const [depositFilterStatus, setDepositFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [approvingDeposit, setApprovingDeposit] = useState<RiderDepositRequest | null>(null);
  const [approveNoteInput, setApproveNoteInput] = useState<string>('অফিসে নগদ ক্যাশ টাকা বুঝে গ্রহণ করা হয়েছে');
  const [rejectingDeposit, setRejectingDeposit] = useState<RiderDepositRequest | null>(null);
  const [rejectNoteInput, setRejectNoteInput] = useState<string>('টাকা অফিসে জমা পাওয়া যায়নি বা পরিমাপে গরমিল রয়েছে');

  // Transactions State
  const [txSearch, setTxSearch] = useState('');

  // Summary Overview State & Filtering
  const [summaryTimeFilter, setSummaryTimeFilter] = useState<'today' | 'month' | 'all'>('all');
  const [topProductSearch, setTopProductSearch] = useState('');
  const [topCustomerSearch, setTopCustomerSearch] = useState('');

  // Summary Detail Drilldown Modal State (যখন কোনো মেট্রিক কার্ডে ক্লিক করা হবে)
  const [summaryDetailType, setSummaryDetailType] = useState<
    'total_orders' | 'total_delivered' | 'total_pending' | 'total_cancelled' | 'rider_balance' | 'office_deposit' | 'total_sale' | null
  >(null);
  const [summaryDetailSearch, setSummaryDetailSearch] = useState('');
  const [expandedRiderId, setExpandedRiderId] = useState<string | null>(null);

  // Search & Filter in all orders
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [thanaFilter, setThanaFilter] = useState<string>('all');
  const [unionFilter, setUnionFilter] = useState<string>('all');
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);

  // Rider Balances, Handover & Deactivation State
  const [riderBalanceSearch, setRiderBalanceSearch] = useState('');
  const [riderBalanceStatusFilter, setRiderBalanceStatusFilter] = useState<'all' | 'with_balance' | 'active' | 'deactivated'>('all');
  const [settlingRider, setSettlingRider] = useState<DeliveryRiderAccount | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleNotes, setSettleNotes] = useState('');
  const [isSettling, setIsSettling] = useState(false);
  const [settleSuccessMsg, setSettleSuccessMsg] = useState('');
  const [deactivatingRider, setDeactivatingRider] = useState<DeliveryRiderAccount | null>(null);
  const [deactivateReasonInput, setDeactivateReasonInput] = useState('ব্যালেন্স অফিসে জমা করার জন্য সামরিক ডিঅ্যাক্টিভ');
  const [viewingRiderDeliveries, setViewingRiderDeliveries] = useState<DeliveryRiderAccount | null>(null);

  // Rider Filter & Management
  const [riderAreaFilter, setRiderAreaFilter] = useState<string>('all');

  // Add Product Form State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [prodNameBn, setProdNameBn] = useState('');
  const [prodNameEn, setProdNameEn] = useState('');
  const [prodPrice, setProdPrice] = useState<number>(100);
  const [prodUnit, setProdUnit] = useState<ProductUnit>('kg');
  const [prodStock, setProdStock] = useState<number>(50);
  const [prodCategory, setProdCategory] = useState<string>('daily_products');
  const [prodArea, setProdArea] = useState<string>('all');
  const [prodDescBn, setProdDescBn] = useState('');
  const [prodDescEn, setProdDescEn] = useState('');
  const [prodIsPrivate, setProdIsPrivate] = useState<boolean>(false);
  const [prodImage, setProdImage] = useState<string>('https://placehold.co/600x600?text=Product');

  // Edit Product Form State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProdNameBn, setEditProdNameBn] = useState('');
  const [editProdNameEn, setEditProdNameEn] = useState('');
  const [editProdPrice, setEditProdPrice] = useState<number>(100);
  const [editProdUnit, setEditProdUnit] = useState<ProductUnit>('kg');
  const [editProdStock, setEditProdStock] = useState<number>(50);
  const [editProdCategory, setEditProdCategory] = useState<string>('daily_products');
  const [editProdArea, setEditProdArea] = useState<string>('all');
  const [editProdDescBn, setEditProdDescBn] = useState('');
  const [editProdDescEn, setEditProdDescEn] = useState('');
  const [editProdIsPrivate, setEditProdIsPrivate] = useState<boolean>(false);
  const [editProdImage, setEditProdImage] = useState<string>('');

  // Admin Product Table Search & Filter
  const [adminProductSearch, setAdminProductSearch] = useState('');
  const [adminProductCategoryFilter, setAdminProductCategoryFilter] = useState('all');

  // Add Area Form State
  const [showAddAreaModal, setShowAddAreaModal] = useState(false);
  const [areaNameBn, setAreaNameBn] = useState('');
  const [areaNameEn, setAreaNameEn] = useState('');
  const [areaCoverageBn, setAreaCoverageBn] = useState('');
  const [areaCoverageEn, setAreaCoverageEn] = useState('');
  const [areaCityBn, setAreaCityBn] = useState('গাজীপুর');
  const [areaCityEn, setAreaCityEn] = useState('Gazipur');
  const [areaRadiusKm, setAreaRadiusKm] = useState<number>(6.0);

  // Register Rider Form State
  const [showRegisterRiderModal, setShowRegisterRiderModal] = useState(false);
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [riderPassword, setRiderPassword] = useState('123');
  const [riderThana, setRiderThana] = useState<string>('kaliganj');
  const [riderSelectedUnions, setRiderSelectedUnions] = useState<string[]>([]);
  const [riderSuccessAlert, setRiderSuccessAlert] = useState<{
    name: string;
    phone: string;
    password: string;
  } | null>(null);

  // Edit Existing Rider's Unions Modal
  const [editingRider, setEditingRider] = useState<DeliveryRiderAccount | null>(null);
  const [editRiderUnions, setEditRiderUnions] = useState<string[]>([]);

  // Unions for the rider registration thana
  const unionsForRiderThana = unions.filter((u) => u.thanaId === riderThana);

  // Helper: Count riders assigned to a union
  const getRiderCountForUnion = (unionId: string) => {
    return registeredRiders.filter((r) => r.assignedUnionIds?.includes(unionId)).length;
  };

  // Helper: Count riders assigned to a thana
  const getRiderCountForThana = (thanaId: string) => {
    return registeredRiders.filter((r) => r.area === thanaId || r.thanaId === thanaId).length;
  };

  // Helper: Get comprehensive metrics for each rider
  const getRiderMetrics = (riderId: string) => {
    const riderOrders = orders.filter((o) => o.riderId === riderId);
    const deliveredOrders = riderOrders.filter((o) => o.orderStatus === 'delivered');
    const pendingOrders = riderOrders.filter((o) =>
      ['rider_assigned', 'picked_up', 'out_for_delivery'].includes(o.orderStatus)
    );
    // Outstanding COD cash in hand with rider (collected from customer but not yet deposited to office)
    const cashBalance = deliveredOrders
      .filter((o) => o.paymentStatus === 'collected')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const totalDeposited = deliveredOrders
      .filter((o) => o.paymentStatus === 'deposited')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      totalOrders: riderOrders.length,
      deliveredCount: deliveredOrders.length,
      pendingCount: pendingOrders.length,
      cashBalance,
      totalDeposited,
      deliveredOrders,
      pendingOrders,
    };
  };

  // Aggregate stats across all riders
  const totalUnsettledCashAllRiders = registeredRiders.reduce((sum, r) => {
    return sum + getRiderMetrics(r.id).cashBalance;
  }, 0);

  const totalDeliveredAllRiders = orders.filter((o) => o.orderStatus === 'delivered' && o.riderId).length;

  const totalPendingDeliveriesAllRiders = orders.filter((o) =>
    ['rider_assigned', 'picked_up', 'out_for_delivery'].includes(o.orderStatus)
  ).length;

  const activeRidersCount = registeredRiders.filter((r) => r.isActive !== false).length;
  const deactivatedRidersCount = registeredRiders.filter((r) => r.isActive === false).length;

  // New Orders: যতক্ষন পর্যন্ত অডার ডেলিভারি কনফার্ম না হবে ততক্ষন New Order Section থাকবে
  // এবং Delivered কম্পিলিট হয়ে গেলে All Order সেকশনে চলে যাবে।
  const newOrders = orders.filter(
    (o) => o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled' && o.orderStatus !== 'returned'
  );

  // Filtered All Orders (Admin sees ALL orders across all areas)
  const filteredOrders = orders.filter((o) => {
    const matchStatus = statusFilter === 'all' || o.orderStatus === statusFilter;
    const matchThana =
      thanaFilter === 'all' ||
      o.thanaId === thanaFilter ||
      o.marketId === thanaFilter;
    const matchUnion = unionFilter === 'all' || o.unionId === unionFilter;
    const matchSearch =
      o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerPhone.includes(orderSearch) ||
      (o.riderName && o.riderName.toLowerCase().includes(orderSearch.toLowerCase())) ||
      (o.unionNameBn && o.unionNameBn.includes(orderSearch));

    return matchStatus && matchThana && matchUnion && matchSearch;
  });

  // Rider Cancelled Orders & Fake Orders Lists
  const riderCancelledOrders = orders.filter((o) => o.isRiderCancelled && !o.isFakeOrder);
  const fakeOrders = orders.filter((o) => o.isFakeOrder);

  // Filtered Rider Cancelled Orders
  const filteredRiderCancelledOrders = riderCancelledOrders.filter((o) => {
    if (!riderCancelledSearch.trim()) return true;
    const q = riderCancelledSearch.toLowerCase().trim();
    return (
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      (o.cancelledByRiderName && o.cancelledByRiderName.toLowerCase().includes(q)) ||
      (o.cancelledByRiderPhone && o.cancelledByRiderPhone.includes(q)) ||
      (o.riderCancelReason && o.riderCancelReason.toLowerCase().includes(q))
    );
  });

  // Filtered Fake Orders
  const filteredFakeOrders = fakeOrders.filter((o) => {
    if (!fakeOrderSearch.trim()) return true;
    const q = fakeOrderSearch.toLowerCase().trim();
    return (
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      (o.fakeOrderReason && o.fakeOrderReason.toLowerCase().includes(q))
    );
  });

  // Deposit Requests & Transactions Lists
  const allDepositRequests = depositRequests || [];
  const pendingDepositRequests = allDepositRequests.filter((d) => d.status === 'pending');

  const filteredDepositRequests = allDepositRequests.filter((d) => {
    const matchStatus = depositFilterStatus === 'all' || d.status === depositFilterStatus;
    if (!matchStatus) return false;
    if (!depositSearch.trim()) return true;
    const q = depositSearch.toLowerCase().trim();
    return (
      d.id.toLowerCase().includes(q) ||
      d.riderName.toLowerCase().includes(q) ||
      d.riderPhone.includes(q) ||
      (d.voucherId && d.voucherId.toLowerCase().includes(q)) ||
      (d.notes && d.notes.toLowerCase().includes(q)) ||
      (d.adminNotes && d.adminNotes.toLowerCase().includes(q))
    );
  });

  const allTransactions = paymentTransactions || [];
  const filteredTransactions = allTransactions.filter((tx) => {
    if (!txSearch.trim()) return true;
    const q = txSearch.toLowerCase().trim();
    return (
      tx.id.toLowerCase().includes(q) ||
      tx.riderName.toLowerCase().includes(q) ||
      tx.riderPhone.includes(q) ||
      (tx.notes && tx.notes.toLowerCase().includes(q)) ||
      (tx.adminNotes && tx.adminNotes.toLowerCase().includes(q))
    );
  });

  // Filtered orders for Summary Overview based on Time Range (today, month, all)
  const filteredSummaryOrders = React.useMemo(() => {
    if (summaryTimeFilter === 'all') return orders;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    return orders.filter((o) => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt);
      if (isNaN(d.getTime())) return false;
      if (summaryTimeFilter === 'today') {
        return (
          d.getFullYear() === currentYear &&
          d.getMonth() === currentMonth &&
          d.getDate() === currentDate
        );
      }
      if (summaryTimeFilter === 'month') {
        return (
          d.getFullYear() === currentYear &&
          d.getMonth() === currentMonth
        );
      }
      return true;
    });
  }, [orders, summaryTimeFilter]);

  // 7 Key KPI Overview Metrics
  const summaryMetrics = React.useMemo(() => {
    // 1. Total Order (সর্বমোট অর্ডার)
    const totalOrders = filteredSummaryOrders.length;

    // 2. Total Delivery (মোট ডেলিভারি সম্পন্ন)
    const totalDelivered = filteredSummaryOrders.filter(
      (o) => o.orderStatus === 'delivered'
    ).length;

    // 3. Total Pending (অপেক্ষমান ও চলমান অর্ডার)
    const totalPending = filteredSummaryOrders.filter((o) =>
      ['pending', 'confirmed', 'processing', 'rider_assigned', 'picked_up', 'out_for_delivery'].includes(
        o.orderStatus
      )
    ).length;

    // 4. Total Cancelled (বাতিলকৃত বা রিটার্ন অর্ডার)
    const totalCancelled = filteredSummaryOrders.filter(
      (o) => o.orderStatus === 'cancelled' || o.orderStatus === 'returned'
    ).length;

    // 5. Total Balance: যেটা রাইডারের কাছে বকেয়া ক্যাশ আছে (paymentStatus === 'collected')
    const totalBalanceRider = filteredSummaryOrders
      .filter((o) => o.paymentStatus === 'collected')
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    // 6. Total Cash: যেটা রাইডার অফিসে টাকা জমা দিয়েছে (paymentStatus === 'deposited')
    const totalCashOffice = filteredSummaryOrders
      .filter((o) => o.paymentStatus === 'deposited')
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    // 7. Total Sale: কত টাকার প্রোডাক্ট বিক্রি হয়েছে (delivered orders revenue)
    const totalSale = filteredSummaryOrders
      .filter((o) => o.orderStatus === 'delivered')
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    return {
      totalOrders,
      totalDelivered,
      totalPending,
      totalCancelled,
      totalBalanceRider,
      totalCashOffice,
      totalSale,
    };
  }, [filteredSummaryOrders]);

  // Top Sales Products List (সর্বাধিক বিক্রীত পণ্য - রেংকিং অনুযায়ী)
  const topSellingProducts = React.useMemo(() => {
    const validOrders = filteredSummaryOrders.filter(
      (o) => o.orderStatus !== 'cancelled' && o.orderStatus !== 'returned'
    );

    const productMap = new Map<
      string,
      {
        productId: string;
        nameBn: string;
        nameEn: string;
        category: string;
        imageUrl: string;
        unit: string;
        quantitySold: number;
        totalRevenue: number;
        orderCount: number;
      }
    >();

    validOrders.forEach((o) => {
      if (!Array.isArray(o.items)) return;
      o.items.forEach((item) => {
        const pid = item.productId || item.nameEn || 'unknown';
        const catalogProd = products.find((p) => p.id === item.productId);

        const existing = productMap.get(pid) || {
          productId: pid,
          nameBn: item.nameBn || catalogProd?.nameBn || 'পণ্য',
          nameEn: item.nameEn || catalogProd?.nameEn || 'Product',
          category: catalogProd?.categoryId || 'daily_products',
          imageUrl: catalogProd?.imageUrl || 'https://placehold.co/100x100?text=Product',
          unit: item.unit || catalogProd?.unit || 'টি',
          quantitySold: 0,
          totalRevenue: 0,
          orderCount: 0,
        };

        const itemQty = Number(item.quantity) || 1;
        const itemSubtotal =
          Number(item.lineTotal) || (Number(item.price) || 0) * itemQty;

        existing.quantitySold += itemQty;
        existing.totalRevenue += itemSubtotal;
        existing.orderCount += 1;

        productMap.set(pid, existing);
      });
    });

    const list = Array.from(productMap.values()).sort(
      (a, b) => b.quantitySold - a.quantitySold || b.totalRevenue - a.totalRevenue
    );

    if (!topProductSearch.trim()) return list;
    const q = topProductSearch.toLowerCase().trim();
    return list.filter(
      (p) =>
        p.nameBn.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [filteredSummaryOrders, products, topProductSearch]);

  // Top Customer List (সর্বোচ্চ ক্রয় করা কাস্টমার তালিকা - রেংকিং অনুযায়ী)
  const topCustomers = React.useMemo(() => {
    const validOrders = filteredSummaryOrders.filter(
      (o) => o.orderStatus !== 'cancelled' && o.orderStatus !== 'returned'
    );

    const customerMap = new Map<
      string,
      {
        phone: string;
        name: string;
        address: string;
        thana: string;
        union: string;
        totalOrders: number;
        deliveredOrders: number;
        totalSpent: number;
        lastOrderDate: string;
      }
    >();

    validOrders.forEach((o) => {
      const rawPhone = (o.customerPhone || '').trim();
      const cleanPhone = normalizePhone(rawPhone) || rawPhone;
      if (!cleanPhone) return;

      const existing = customerMap.get(cleanPhone) || {
        phone: rawPhone,
        name: o.customerName || 'সম্মানিত গ্রাহক',
        address: o.deliveryAddress || '',
        thana: o.thanaNameBn || o.marketId || '',
        union: o.unionNameBn || '',
        totalOrders: 0,
        deliveredOrders: 0,
        totalSpent: 0,
        lastOrderDate: o.createdAt || '',
      };

      existing.totalOrders += 1;
      if (o.orderStatus === 'delivered') {
        existing.deliveredOrders += 1;
      }
      existing.totalSpent += Number(o.totalAmount) || 0;
      if (new Date(o.createdAt).getTime() > new Date(existing.lastOrderDate || 0).getTime()) {
        existing.lastOrderDate = o.createdAt;
        if (o.deliveryAddress) existing.address = o.deliveryAddress;
        if (o.customerName) existing.name = o.customerName;
      }

      customerMap.set(cleanPhone, existing);
    });

    const list = Array.from(customerMap.values()).sort(
      (a, b) => b.totalSpent - a.totalSpent || b.totalOrders - a.totalOrders
    );

    if (!topCustomerSearch.trim()) return list;
    const q = topCustomerSearch.toLowerCase().trim();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.union.toLowerCase().includes(q)
    );
  }, [filteredSummaryOrders, topCustomerSearch]);

  // Breakdown of riders with cash balance in hand (ক্যাশ সংগ্রহ করেছে কিন্তু এখনো অফিসে জমা দেয়নি)
  const riderBalanceBreakdown = React.useMemo(() => {
    const collectedOrders = filteredSummaryOrders.filter(
      (o) => o.paymentStatus === 'collected'
    );
    const riderMap = new Map<
      string,
      {
        riderId: string;
        riderName: string;
        riderPhone: string;
        thana: string;
        unions: string[];
        totalBalance: number;
        orders: Order[];
      }
    >();

    // Seed with registered riders
    registeredRiders.forEach((r) => {
      riderMap.set(r.id, {
        riderId: r.id,
        riderName: r.name,
        riderPhone: r.phone,
        thana: r.area || r.thanaId || '',
        unions: r.assignedUnionIds || [],
        totalBalance: 0,
        orders: [],
      });
    });

    collectedOrders.forEach((o) => {
      const rid = o.riderId || 'unassigned';
      let entry = riderMap.get(rid);
      if (!entry) {
        entry = {
          riderId: rid,
          riderName: o.riderName || 'অজানা বা অনির্ধারিত রাইডার',
          riderPhone: o.riderPhone || '',
          thana: o.thanaNameBn || o.marketId || '',
          unions: o.unionNameBn ? [o.unionNameBn] : [],
          totalBalance: 0,
          orders: [],
        };
        riderMap.set(rid, entry);
      }
      entry.totalBalance += Number(o.totalAmount) || 0;
      entry.orders.push(o);
    });

    const list = Array.from(riderMap.values()).filter((r) => r.totalBalance > 0);
    list.sort((a, b) => b.totalBalance - a.totalBalance);

    if (!summaryDetailSearch.trim()) return list;
    const q = summaryDetailSearch.toLowerCase().trim();
    return list.filter(
      (r) =>
        r.riderName.toLowerCase().includes(q) ||
        r.riderPhone.includes(q) ||
        r.thana.toLowerCase().includes(q) ||
        r.orders.some(
          (o) =>
            o.id.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            o.customerPhone.includes(q)
        )
    );
  }, [filteredSummaryOrders, registeredRiders, summaryDetailSearch]);

  // Breakdown of riders who deposited money to office (রাইডার অফিসে টাকা জমা দিছে)
  const officeDepositBreakdown = React.useMemo(() => {
    const depositedOrders = filteredSummaryOrders.filter(
      (o) => o.paymentStatus === 'deposited'
    );
    const riderMap = new Map<
      string,
      {
        riderId: string;
        riderName: string;
        riderPhone: string;
        thana: string;
        unions: string[];
        totalDeposited: number;
        orders: Order[];
      }
    >();

    registeredRiders.forEach((r) => {
      riderMap.set(r.id, {
        riderId: r.id,
        riderName: r.name,
        riderPhone: r.phone,
        thana: r.area || r.thanaId || '',
        unions: r.assignedUnionIds || [],
        totalDeposited: 0,
        orders: [],
      });
    });

    depositedOrders.forEach((o) => {
      const rid = o.riderId || 'unassigned';
      let entry = riderMap.get(rid);
      if (!entry) {
        entry = {
          riderId: rid,
          riderName: o.riderName || 'অজানা বা অনির্ধারিত রাইডার',
          riderPhone: o.riderPhone || '',
          thana: o.thanaNameBn || o.marketId || '',
          unions: o.unionNameBn ? [o.unionNameBn] : [],
          totalDeposited: 0,
          orders: [],
        };
        riderMap.set(rid, entry);
      }
      entry.totalDeposited += Number(o.totalAmount) || 0;
      entry.orders.push(o);
    });

    const list = Array.from(riderMap.values()).filter((r) => r.totalDeposited > 0);
    list.sort((a, b) => b.totalDeposited - a.totalDeposited);

    if (!summaryDetailSearch.trim()) return list;
    const q = summaryDetailSearch.toLowerCase().trim();
    return list.filter(
      (r) =>
        r.riderName.toLowerCase().includes(q) ||
        r.riderPhone.includes(q) ||
        r.thana.toLowerCase().includes(q) ||
        r.orders.some(
          (o) =>
            o.id.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            o.customerPhone.includes(q)
        )
    );
  }, [filteredSummaryOrders, registeredRiders, summaryDetailSearch]);

  // Filtered orders for detail modal (Total Order, Delivery, Pending, Cancelled, Total Sale)
  const detailModalOrders = React.useMemo(() => {
    if (!summaryDetailType) return [];
    let baseOrders: Order[] = [];

    if (summaryDetailType === 'total_orders') {
      baseOrders = filteredSummaryOrders;
    } else if (summaryDetailType === 'total_delivered') {
      baseOrders = filteredSummaryOrders.filter((o) => o.orderStatus === 'delivered');
    } else if (summaryDetailType === 'total_pending') {
      baseOrders = filteredSummaryOrders.filter((o) =>
        ['pending', 'confirmed', 'processing', 'rider_assigned', 'picked_up', 'out_for_delivery'].includes(
          o.orderStatus
        )
      );
    } else if (summaryDetailType === 'total_cancelled') {
      baseOrders = filteredSummaryOrders.filter(
        (o) => o.orderStatus === 'cancelled' || o.orderStatus === 'returned'
      );
    } else if (summaryDetailType === 'total_sale') {
      baseOrders = filteredSummaryOrders.filter((o) => o.orderStatus === 'delivered');
    }

    // Sort by date descending
    const sorted = [...baseOrders].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    if (!summaryDetailSearch.trim()) return sorted;
    const q = summaryDetailSearch.toLowerCase().trim();
    return sorted.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        (o.riderName && o.riderName.toLowerCase().includes(q)) ||
        (o.riderPhone && o.riderPhone.includes(q)) ||
        o.deliveryAddress.toLowerCase().includes(q) ||
        (o.unionNameBn && o.unionNameBn.toLowerCase().includes(q)) ||
        (o.thanaNameBn && o.thanaNameBn.toLowerCase().includes(q))
    );
  }, [summaryDetailType, filteredSummaryOrders, summaryDetailSearch]);

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNameBn.trim() || !prodNameEn.trim()) return;

    onAddProduct({
      shopId: 'admin-store',
      marketId: prodArea === 'all' ? 'all' : prodArea,
      area: prodArea === 'all' ? 'সকল এরিয়া' : markets.find((m) => m.id === prodArea)?.nameBn || prodArea,
      categoryId: prodCategory,
      nameEn: prodNameEn.trim(),
      nameBn: prodNameBn.trim(),
      descriptionBn: prodDescBn.trim() || undefined,
      descriptionEn: prodDescEn.trim() || undefined,
      price: Number(prodPrice),
      unit: prodUnit,
      stock: Number(prodStock),
      isAvailable: Number(prodStock) > 0,
      imageUrl: prodImage.trim() || `https://placehold.co/600x600?text=${encodeURIComponent(prodNameEn.trim())}`,
      isPrivate: prodIsPrivate,
    });

    setShowAddProductModal(false);
    setProdNameBn('');
    setProdNameEn('');
    setProdDescBn('');
    setProdDescEn('');
    setProdIsPrivate(false);
  };

  const openEditProductModal = (p: Product) => {
    setEditingProduct(p);
    setEditProdNameBn(p.nameBn || '');
    setEditProdNameEn(p.nameEn || '');
    setEditProdCategory(p.categoryId || 'daily_products');
    setEditProdPrice(p.price || 0);
    setEditProdUnit(p.unit || 'kg');
    setEditProdStock(p.stock || 0);
    setEditProdArea(p.marketId === 'all' || p.area === 'সকল এরিয়া' ? 'all' : p.marketId || 'all');
    setEditProdImage(p.imageUrl || '');
    setEditProdDescBn(p.descriptionBn || '');
    setEditProdDescEn(p.descriptionEn || '');
    setEditProdIsPrivate(Boolean(p.isPrivate));
  };

  const handleEditProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editProdNameBn.trim() || !editProdNameEn.trim()) return;

    if (onUpdateProduct) {
      onUpdateProduct(editingProduct.id, {
        nameBn: editProdNameBn.trim(),
        nameEn: editProdNameEn.trim(),
        categoryId: editProdCategory,
        price: Number(editProdPrice),
        unit: editProdUnit,
        stock: Number(editProdStock),
        isAvailable: Number(editProdStock) > 0,
        marketId: editProdArea === 'all' ? 'all' : editProdArea,
        area: editProdArea === 'all' ? 'সকল এরিয়া' : markets.find((m) => m.id === editProdArea)?.nameBn || editProdArea,
        imageUrl: editProdImage.trim() || editingProduct.imageUrl,
        descriptionBn: editProdDescBn.trim() || undefined,
        descriptionEn: editProdDescEn.trim() || undefined,
        isPrivate: editProdIsPrivate,
      });
    }

    setEditingProduct(null);
  };

  const handleAreaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaNameBn.trim() || !areaNameEn.trim()) return;

    onAddMarket({
      nameBn: areaNameBn.trim(),
      nameEn: areaNameEn.trim(),
      areaBn: areaCoverageBn.trim() || areaNameBn.trim(),
      areaEn: areaCoverageEn.trim() || areaNameEn.trim(),
      cityBn: areaCityBn.trim(),
      cityEn: areaCityEn.trim(),
      lat: 24.0,
      lng: 90.5,
      radiusKm: Number(areaRadiusKm) || 6.0,
      isActive: true,
    });

    setShowAddAreaModal(false);
    setAreaNameBn('');
    setAreaNameEn('');
    setAreaCoverageBn('');
    setAreaCoverageEn('');
  };

  const handleRiderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!riderName.trim() || !riderPhone.trim() || !riderPassword.trim()) return;

    // If no specific union was checked, default to all unions of that thana
    const finalUnions =
      riderSelectedUnions.length > 0
        ? riderSelectedUnions
        : unionsForRiderThana.map((u) => u.id);

    const cleanPhone = normalizePhone(riderPhone) || riderPhone.trim();

    const newRiderPayload = {
      name: riderName.trim(),
      phone: cleanPhone,
      password: riderPassword.trim(),
      area: riderThana,
      thanaId: riderThana,
      assignedUnionIds: finalUnions,
      isOnline: true,
      isActive: true,
    };

    onRegisterRider(newRiderPayload);
    setRiderSuccessAlert({
      name: newRiderPayload.name,
      phone: newRiderPayload.phone,
      password: newRiderPayload.password,
    });

    setShowRegisterRiderModal(false);
    setRiderName('');
    setRiderPhone('');
    setRiderPassword('123');
    setRiderSelectedUnions([]);
  };

  const handleSaveEditRiderUnions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRider) return;

    if (onUpdateRiderUnions) {
      onUpdateRiderUnions(editingRider.id, editRiderUnions);
    } else {
      // Direct local update
      editingRider.assignedUnionIds = editRiderUnions;
    }
    setEditingRider(null);
  };

  const toggleRegisterUnion = (unionId: string) => {
    setRiderSelectedUnions((prev) =>
      prev.includes(unionId) ? prev.filter((id) => id !== unionId) : [...prev, unionId]
    );
  };

  const toggleEditUnion = (unionId: string) => {
    setEditRiderUnions((prev) =>
      prev.includes(unionId) ? prev.filter((id) => id !== unionId) : [...prev, unionId]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5">
      {/* Admin Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-lg mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {language === 'bn' ? 'এডমিন কন্ট্রোল প্যানেল' : 'Admin Control Panel'}
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              {language === 'bn'
                ? 'গাজীপুর (কালীগঞ্জ ও কাপাসিয়া) এরিয়া, ইউনিয়নভিত্তিক রাইডার ম্যানেজমেন্ট ও অর্ডার ডিস্ট্রিবিউশন'
                : 'Gazipur (Kaliganj & Kapasia) Regional & Union-based Rider Dispatch & Operations'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setRiderSelectedUnions(unions.filter((u) => u.thanaId === riderThana).map((u) => u.id));
              setShowRegisterRiderModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <Bike className="w-4 h-4" />
            <span>{language === 'bn' ? 'নতুন রাইডার রেজিস্টার' : 'Register Rider'}</span>
          </button>
          <button
            onClick={() => setShowAddProductModal(true)}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold py-2 px-3 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? 'পণ্য যোগ করুন' : 'Add Product'}</span>
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold py-2 px-3 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-colors"
              title={language === 'bn' ? 'এডমিন প্যানেল থেকে লগআউট করুন' : 'Log out from admin panel'}
            >
              <LogOut className="w-4 h-4" />
              <span>{language === 'bn' ? 'লগআউট' : 'Logout'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 mb-6">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'summary'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{language === 'bn' ? 'সামারি ওভারভিউ' : 'Summary Overview'}</span>
        </button>

        <button
          onClick={() => setActiveTab('new_orders')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'new_orders'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{language === 'bn' ? 'নতুন অর্ডার' : 'New Orders'} ({newOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('all_orders')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'all_orders'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{language === 'bn' ? 'সকল অর্ডার' : 'All Orders'} ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rider_balances')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'rider_balances'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>{language === 'bn' ? 'রাইডার ব্যালেন্স ও রিপোর্ট' : 'Rider Balances & Reports'} ({registeredRiders.length})</span>
          {totalUnsettledCashAllRiders > 0 && (
            <span
              className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                activeTab === 'rider_balances'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-rose-500 text-white'
              }`}
            >
              ৳{totalUnsettledCashAllRiders}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('riders')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'riders'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bike className="w-4 h-4" />
          <span>{language === 'bn' ? 'রাইডার ম্যানেজমেন্ট' : 'Riders'} ({registeredRiders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rider_cancelled')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'rider_cancelled'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <XCircle className="w-4 h-4 text-amber-500" />
          <span>{language === 'bn' ? 'রাইডার বাতিলকৃত' : 'Rider Cancelled'}</span>
          <span
            className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              riderCancelledOrders.length > 0
                ? activeTab === 'rider_cancelled'
                  ? 'bg-white text-amber-900'
                  : 'bg-amber-500 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {riderCancelledOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('fake_orders')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'fake_orders'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>{language === 'bn' ? 'ফেক অর্ডার তালিকা' : 'Fake Orders'}</span>
          <span
            className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              fakeOrders.length > 0
                ? activeTab === 'fake_orders'
                  ? 'bg-white text-rose-900'
                  : 'bg-rose-500 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {fakeOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('deposit_requests')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'deposit_requests'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Banknote className="w-4 h-4" />
          <span>{language === 'bn' ? 'ক্যাশ জমার রিকোয়েস্ট' : 'Deposit Requests'}</span>
          {pendingDepositRequests.length > 0 ? (
            <span
              className={`text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse ${
                activeTab === 'deposit_requests'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-rose-600 text-white'
              }`}
            >
              {pendingDepositRequests.length} নতুন
            </span>
          ) : (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-600">
              {allDepositRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'transactions'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{language === 'bn' ? 'সকল পেমেন্ট ও ট্রানজাকশন' : 'Transactions'}</span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
              activeTab === 'transactions'
                ? 'bg-white text-slate-900'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {allTransactions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('areas')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'areas'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>{language === 'bn' ? `এরিয়া ও ইউনিয়ন (${markets.length} থানা / ${unions.length} ইউনিয়ন)` : `Areas & Unions (${markets.length} Thanas / ${unions.length} Unions)`}</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'products'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{language === 'bn' ? 'প্রোডাক্ট ক্যাটালগ' : 'Product Catalog'} ({products.length})</span>
        </button>
      </div>

      {/* TAB 0: SUMMARY OVERVIEW (সামারি ও পারফরম্যান্স ওভারভিউ) */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Header & Time Filters */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-2xl bg-emerald-100 text-emerald-800">
                  <BarChart3 className="w-5 h-5" />
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  {language === 'bn' ? 'টোটাল সামারি ও পারফরম্যান্স ওভারভিউ' : 'Total Summary & Performance Overview'}
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'bn'
                  ? 'অর্ডার, ডেলিভারি, বকেয়া ব্যালেন্স, অফিস ক্যাশ জমা ও বিক্রয়ের রিয়েলটাইম হিসাব'
                  : 'Real-time overview of orders, deliveries, rider balances, office deposits, and sales'}
              </p>
            </div>

            {/* Time Filtering Pills */}
            <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl self-start md:self-auto gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setSummaryTimeFilter('today')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  summaryTimeFilter === 'today'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'আজকের হিসাব' : "Today's Stats"}</span>
              </button>

              <button
                type="button"
                onClick={() => setSummaryTimeFilter('month')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  summaryTimeFilter === 'month'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'এই মাসের হিসাব' : 'This Month'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSummaryTimeFilter('all')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  summaryTimeFilter === 'all'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'লাইফটাইম হিসাব' : 'Lifetime (All)'}</span>
              </button>
            </div>
          </div>

          {/* 7 KEY KPI OVERVIEW CARDS (CLICKABLE FOR FULL DETAILS) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
            {/* 1. Total Order */}
            <button
              type="button"
              onClick={() => {
                setSummaryDetailType('total_orders');
                setSummaryDetailSearch('');
                setExpandedRiderId(null);
              }}
              className="text-left w-full bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <div className="flex items-center justify-between mb-2 w-full">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {language === 'bn' ? 'সর্বমোট অর্ডার' : 'Total Order'}
                </span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Package className="w-4 h-4" />
                </span>
              </div>
              <div className="w-full">
                <div className="text-xl sm:text-2xl font-black text-slate-900">
                  {summaryMetrics.totalOrders}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {language === 'bn' ? 'মোট প্রাপ্ত অর্ডার' : 'Total orders placed'}
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-blue-600">
                  <span>{language === 'bn' ? 'বিস্তারিত দেখুন' : 'View Details'}</span>
                  <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </button>

            {/* 2. Total Delivery */}
            <button
              type="button"
              onClick={() => {
                setSummaryDetailType('total_delivered');
                setSummaryDetailSearch('');
                setExpandedRiderId(null);
              }}
              className="text-left w-full bg-white rounded-3xl p-4 sm:p-5 border border-emerald-200/80 bg-emerald-50/20 shadow-xs flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <div className="flex items-center justify-between mb-2 w-full">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  {language === 'bn' ? 'মোট ডেলিভারি' : 'Total Delivery'}
                </span>
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <CheckCircle className="w-4 h-4" />
                </span>
              </div>
              <div className="w-full">
                <div className="text-xl sm:text-2xl font-black text-emerald-800">
                  {summaryMetrics.totalDelivered}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">
                  {language === 'bn' ? 'ডেলিভারি সম্পন্ন' : 'Delivered successfully'}
                </div>
                <div className="mt-2.5 pt-2 border-t border-emerald-100 flex items-center justify-between text-[10px] font-bold text-emerald-700">
                  <span>{language === 'bn' ? 'ডেলিভারি ডাটা' : 'View Deliveries'}</span>
                  <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </button>

            {/* 3. Total Pending */}
            <button
              type="button"
              onClick={() => {
                setSummaryDetailType('total_pending');
                setSummaryDetailSearch('');
                setExpandedRiderId(null);
              }}
              className="text-left w-full bg-white rounded-3xl p-4 sm:p-5 border border-amber-200/80 bg-amber-50/20 shadow-xs flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <div className="flex items-center justify-between mb-2 w-full">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                  {language === 'bn' ? 'পেন্ডিং অর্ডার' : 'Total Pending'}
                </span>
                <span className="p-2 rounded-xl bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="w-full">
                <div className="text-xl sm:text-2xl font-black text-amber-800">
                  {summaryMetrics.totalPending}
                </div>
                <div className="text-[10px] text-amber-600 mt-0.5">
                  {language === 'bn' ? 'চলমান ও অপেক্ষমান' : 'Active & in transit'}
                </div>
                <div className="mt-2.5 pt-2 border-t border-amber-100 flex items-center justify-between text-[10px] font-bold text-amber-700">
                  <span>{language === 'bn' ? 'পেন্ডিং তালিকা' : 'View Pending'}</span>
                  <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </button>

            {/* 4. Total Cancelled */}
            <button
              type="button"
              onClick={() => {
                setSummaryDetailType('total_cancelled');
                setSummaryDetailSearch('');
                setExpandedRiderId(null);
              }}
              className="text-left w-full bg-white rounded-3xl p-4 sm:p-5 border border-rose-200/80 bg-rose-50/20 shadow-xs flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              <div className="flex items-center justify-between mb-2 w-full">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                  {language === 'bn' ? 'বাতিলকৃত' : 'Total Cancelled'}
                </span>
                <span className="p-2 rounded-xl bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <AlertCircle className="w-4 h-4" />
                </span>
              </div>
              <div className="w-full">
                <div className="text-xl sm:text-2xl font-black text-rose-800">
                  {summaryMetrics.totalCancelled}
                </div>
                <div className="text-[10px] text-rose-600 mt-0.5">
                  {language === 'bn' ? 'বাতিল বা ফেরতকৃত' : 'Cancelled or returned'}
                </div>
                <div className="mt-2.5 pt-2 border-t border-rose-100 flex items-center justify-between text-[10px] font-bold text-rose-700">
                  <span>{language === 'bn' ? 'বাতিল তালিকা' : 'View Cancelled'}</span>
                  <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </button>

            {/* 5. Total Balance (যেটা রাইডারের কাছে আছে) */}
            <button
              type="button"
              onClick={() => {
                setSummaryDetailType('rider_balance');
                setSummaryDetailSearch('');
                setExpandedRiderId(null);
              }}
              className="text-left w-full bg-white rounded-3xl p-4 sm:p-5 border border-amber-300 bg-amber-500/10 shadow-xs flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <div className="flex items-center justify-between mb-2 w-full">
                <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider">
                  {language === 'bn' ? 'রাইডার ব্যালেন্স' : 'Rider Balance'}
                </span>
                <span className="p-2 rounded-xl bg-amber-200 text-amber-900 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Wallet className="w-4 h-4" />
                </span>
              </div>
              <div className="w-full">
                <div className="text-lg sm:text-xl font-black text-amber-950">
                  {formatBDT(summaryMetrics.totalBalanceRider)}
                </div>
                <div className="text-[10px] text-amber-800 font-medium mt-0.5">
                  {language === 'bn' ? 'রাইডারের হাতে বকেয়া' : 'Pending with riders'}
                </div>
                <div className="mt-2.5 pt-2 border-t border-amber-200/80 flex items-center justify-between text-[10px] font-bold text-amber-900">
                  <span>{language === 'bn' ? 'রাইডার তালিকা' : 'View Riders'}</span>
                  <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </button>

            {/* 6. Total Cash (যেটা রাইডার অফিসে জমা দিয়েছে) */}
            <button
              type="button"
              onClick={() => {
                setSummaryDetailType('office_deposit');
                setSummaryDetailSearch('');
                setExpandedRiderId(null);
              }}
              className="text-left w-full bg-white rounded-3xl p-4 sm:p-5 border border-sky-300 bg-sky-500/10 shadow-xs flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <div className="flex items-center justify-between mb-2 w-full">
                <span className="text-[11px] font-black text-sky-900 uppercase tracking-wider">
                  {language === 'bn' ? 'অফিস ক্যাশ জমা' : 'Office Deposited'}
                </span>
                <span className="p-2 rounded-xl bg-sky-200 text-sky-900 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <Banknote className="w-4 h-4" />
                </span>
              </div>
              <div className="w-full">
                <div className="text-lg sm:text-xl font-black text-sky-950">
                  {formatBDT(summaryMetrics.totalCashOffice)}
                </div>
                <div className="text-[10px] text-sky-800 font-medium mt-0.5">
                  {language === 'bn' ? 'অফিসে জমা প্রাপ্ত ক্যাশ' : 'Deposited to office'}
                </div>
                <div className="mt-2.5 pt-2 border-t border-sky-200/80 flex items-center justify-between text-[10px] font-bold text-sky-900">
                  <span>{language === 'bn' ? 'কে কে জমা দিছে' : 'View Deposited'}</span>
                  <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </button>

            {/* 7. Total Sale (কত টাকার প্রোডাক্ট বিক্রি হয়েছে) */}
            <button
              type="button"
              onClick={() => {
                setSummaryDetailType('total_sale');
                setSummaryDetailSearch('');
                setExpandedRiderId(null);
              }}
              className="text-left w-full bg-white rounded-3xl p-4 sm:p-5 border border-emerald-400 bg-emerald-600 text-white shadow-md flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              <div className="flex items-center justify-between mb-2 w-full">
                <span className="text-[11px] font-black text-emerald-100 uppercase tracking-wider">
                  {language === 'bn' ? 'মোট বিক্রয় (সেল)' : 'Total Sale'}
                </span>
                <span className="p-2 rounded-xl bg-white/20 text-white group-hover:bg-white group-hover:text-emerald-700 transition-colors">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="w-full">
                <div className="text-lg sm:text-xl font-black text-white">
                  {formatBDT(summaryMetrics.totalSale)}
                </div>
                <div className="text-[10px] text-emerald-100 font-medium mt-0.5">
                  {language === 'bn' ? 'মোট ডেলিভারি বিক্রয়' : 'Delivered sales revenue'}
                </div>
                <div className="mt-2.5 pt-2 border-t border-emerald-500 flex items-center justify-between text-[10px] font-bold text-white">
                  <span>{language === 'bn' ? 'সেলস ডাটা' : 'View Sales'}</span>
                  <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </button>
          </div>

          {/* SUMMARY DRILLDOWN DETAIL MODAL */}
          {summaryDetailType && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="p-2.5 rounded-2xl bg-white border border-slate-200 shadow-2xs shrink-0">
                      {summaryDetailType === 'total_orders' && <Package className="w-5 h-5 text-blue-600" />}
                      {summaryDetailType === 'total_delivered' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                      {summaryDetailType === 'total_pending' && <Clock className="w-5 h-5 text-amber-600" />}
                      {summaryDetailType === 'total_cancelled' && <AlertCircle className="w-5 h-5 text-rose-600" />}
                      {summaryDetailType === 'rider_balance' && <Wallet className="w-5 h-5 text-amber-700" />}
                      {summaryDetailType === 'office_deposit' && <Banknote className="w-5 h-5 text-sky-700" />}
                      {summaryDetailType === 'total_sale' && <TrendingUp className="w-5 h-5 text-emerald-700" />}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                        {summaryDetailType === 'total_orders' &&
                          (language === 'bn' ? 'সকল অর্ডার তালিকা (Total Orders)' : 'All Orders Details')}
                        {summaryDetailType === 'total_delivered' &&
                          (language === 'bn' ? 'মোট ডেলিভারি সম্পন্ন অর্ডারসমূহ (Delivered Orders)' : 'Delivered Orders Details')}
                        {summaryDetailType === 'total_pending' &&
                          (language === 'bn' ? 'পেন্ডিং ও চলমান অর্ডারসমূহ (Pending Orders)' : 'Pending Orders Details')}
                        {summaryDetailType === 'total_cancelled' &&
                          (language === 'bn' ? 'বাতিলকৃত অর্ডারসমূহ (Cancelled Orders)' : 'Cancelled Orders Details')}
                        {summaryDetailType === 'rider_balance' &&
                          (language === 'bn' ? 'রাইডারদের বকেয়া ব্যালেন্স (Rider Balances in Hand)' : 'Rider Cash Balances')}
                        {summaryDetailType === 'office_deposit' &&
                          (language === 'bn' ? 'অফিসে ক্যাশ জমা দেওয়া রাইডার তালিকা (Office Deposited)' : 'Office Cash Deposits')}
                        {summaryDetailType === 'total_sale' &&
                          (language === 'bn' ? 'মোট বিক্রয় ও ডেলিভারি বিবরণ (Sales Revenue Breakdown)' : 'Sales Revenue Details')}
                      </h3>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>
                          {language === 'bn' ? 'ফিল্টার:' : 'Filter:'}{' '}
                          <strong className="text-slate-700">
                            {summaryTimeFilter === 'today'
                              ? language === 'bn'
                                ? 'আজকের হিসাব'
                                : 'Today'
                              : summaryTimeFilter === 'month'
                              ? language === 'bn'
                                ? 'এই মাসের হিসাব'
                                : 'This Month'
                              : language === 'bn'
                              ? 'লাইফটাইম হিসাব'
                              : 'Lifetime'}
                          </strong>
                        </span>
                        <span>•</span>
                        <span className="font-bold text-emerald-700">
                          {summaryDetailType === 'rider_balance'
                            ? `${riderBalanceBreakdown.length} জন রাইডার | মোট বকেয়া ৳${summaryMetrics.totalBalanceRider}`
                            : summaryDetailType === 'office_deposit'
                            ? `${officeDepositBreakdown.length} জন রাইডার | মোট জমা ৳${summaryMetrics.totalCashOffice}`
                            : `${detailModalOrders.length} টি অর্ডার | সর্বমোট মূল্য ৳${detailModalOrders.reduce(
                                (sum, o) => sum + (Number(o.totalAmount) || 0),
                                0
                              )}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSummaryDetailType(null);
                      setSummaryDetailSearch('');
                      setExpandedRiderId(null);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                    title="বন্ধ করুন"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Search Bar */}
                <div className="p-3 sm:p-4 border-b border-slate-100 bg-white">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={summaryDetailSearch}
                      onChange={(e) => setSummaryDetailSearch(e.target.value)}
                      placeholder={
                        summaryDetailType === 'rider_balance' || summaryDetailType === 'office_deposit'
                          ? language === 'bn'
                            ? 'রাইডারের নাম, ফোন নম্বর, বা অর্ডার দিয়ে খুঁজুন...'
                            : 'Search riders by name, phone or order...'
                          : language === 'bn'
                          ? 'অর্ডার আইডি, কাস্টমার, রাইডার, ফোন বা ঠিকানা দিয়ে খুঁজুন...'
                          : 'Search orders by ID, customer, rider, phone, or address...'
                      }
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {summaryDetailSearch && (
                      <button
                        type="button"
                        onClick={() => setSummaryDetailSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 bg-slate-50/50 flex-1">
                  {/* TYPE A: Rider Balance Breakdown */}
                  {summaryDetailType === 'rider_balance' &&
                    (riderBalanceBreakdown.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs bg-white rounded-3xl border border-slate-200">
                        {language === 'bn'
                          ? 'বর্তমানে কোনো রাইডারের কাছে বকেয়া ক্যাশ ব্যালেন্স নেই।'
                          : 'No riders currently have outstanding cash balance.'}
                      </div>
                    ) : (
                      riderBalanceBreakdown.map((rider, idx) => {
                        const isExpanded = expandedRiderId === rider.riderId;
                        return (
                          <div
                            key={`rb-rider-${rider.riderId}-${idx}`}
                            className="bg-white rounded-2xl border border-amber-200 shadow-xs p-4 overflow-hidden transition-all"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-black text-sm shrink-0">
                                  <Bike className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h4 className="text-sm font-bold text-slate-900">{rider.riderName}</h4>
                                    <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                      বকেয়া ক্যাশ
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                                    <a
                                      href={`tel:${rider.riderPhone}`}
                                      className="text-emerald-700 hover:underline font-mono font-medium flex items-center space-x-1"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>{rider.riderPhone}</span>
                                    </a>
                                    <span>•</span>
                                    <span>{rider.thana || 'কালীগঞ্জ/কাপাসিয়া'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                <div className="text-right">
                                  <div className="text-base font-black text-amber-900">
                                    {formatBDT(rider.totalBalance)}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-semibold">
                                    {rider.orders.length} টি অর্ডারে সংগৃহীত
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setExpandedRiderId(isExpanded ? null : rider.riderId)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 flex items-center space-x-1"
                                >
                                  <span>{isExpanded ? 'অর্ডার লুকান' : 'অর্ডার দেখুন'}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Expanded Orders List for this Rider */}
                            {isExpanded && (
                              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 bg-amber-50/30 -mx-4 -mb-4 p-4">
                                <div className="text-xs font-bold text-slate-700 mb-2">
                                  এই রাইডারের সংগৃহীত ক্যাশ অর্ডারের তালিকা:
                                </div>
                                {rider.orders.map((ord, oIdx) => (
                                  <div
                                    key={`ord-sub-${ord.id}-${oIdx}`}
                                    className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                  >
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-mono font-bold text-slate-900">#{ord.id}</span>
                                        <span className="text-[10px] text-slate-500">
                                          {new Date(ord.createdAt).toLocaleDateString('bn-BD', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                          })}
                                        </span>
                                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                                          ক্যাশ সংগ্রহ হয়েছে (অফিসে জমা হয়নি)
                                        </span>
                                      </div>
                                      <div className="text-slate-600 mt-1">
                                        গ্রাহক:{' '}
                                        <strong className="text-slate-800">{ord.customerName}</strong> (
                                        {ord.customerPhone})
                                      </div>
                                      <div className="text-slate-500 text-[11px]">
                                        ঠিকানা: {ord.deliveryAddress}{' '}
                                        {ord.unionNameBn ? `• ${ord.unionNameBn}` : ''}
                                      </div>
                                    </div>
                                    <div className="text-right sm:self-center font-black text-amber-950 text-sm">
                                      {formatBDT(ord.totalAmount)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ))}

                  {/* TYPE B: Office Deposit Breakdown */}
                  {summaryDetailType === 'office_deposit' &&
                    (officeDepositBreakdown.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs bg-white rounded-3xl border border-slate-200">
                        {language === 'bn'
                          ? 'এই সময়ে অফিসে কোনো রাইডারের ক্যাশ জমা পাওয়া যায়নি।'
                          : 'No rider cash deposits recorded for this period.'}
                      </div>
                    ) : (
                      officeDepositBreakdown.map((rider, idx) => {
                        const isExpanded = expandedRiderId === rider.riderId;
                        return (
                          <div
                            key={`od-rider-${rider.riderId}-${idx}`}
                            className="bg-white rounded-2xl border border-sky-200 shadow-xs p-4 overflow-hidden transition-all"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-900 flex items-center justify-center font-black text-sm shrink-0">
                                  <Banknote className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h4 className="text-sm font-bold text-slate-900">{rider.riderName}</h4>
                                    <span className="bg-sky-100 text-sky-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                      অফিসে জমা দিয়েছে
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                                    <a
                                      href={`tel:${rider.riderPhone}`}
                                      className="text-emerald-700 hover:underline font-mono font-medium flex items-center space-x-1"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>{rider.riderPhone}</span>
                                    </a>
                                    <span>•</span>
                                    <span>{rider.thana || 'কালীগঞ্জ/কাপাসিয়া'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                <div className="text-right">
                                  <div className="text-base font-black text-sky-950">
                                    {formatBDT(rider.totalDeposited)}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-semibold">
                                    {rider.orders.length} টি অর্ডারের টাকা জমা হয়েছে
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setExpandedRiderId(isExpanded ? null : rider.riderId)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 flex items-center space-x-1"
                                >
                                  <span>{isExpanded ? 'অর্ডার লুকান' : 'অর্ডার দেখুন'}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Expanded Orders List for this Deposited Rider */}
                            {isExpanded && (
                              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 bg-sky-50/30 -mx-4 -mb-4 p-4">
                                <div className="text-xs font-bold text-slate-700 mb-2">
                                  এই রাইডারের অফিসে জমা হওয়া অর্ডারের তালিকা:
                                </div>
                                {rider.orders.map((ord, oIdx) => (
                                  <div
                                    key={`dep-sub-${ord.id}-${oIdx}`}
                                    className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                  >
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-mono font-bold text-slate-900">#{ord.id}</span>
                                        <span className="text-[10px] text-slate-500">
                                          {new Date(ord.createdAt).toLocaleDateString('bn-BD', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                          })}
                                        </span>
                                        <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                                          ✅ অফিসে জমা প্রাপ্ত
                                        </span>
                                      </div>
                                      <div className="text-slate-600 mt-1">
                                        গ্রাহক:{' '}
                                        <strong className="text-slate-800">{ord.customerName}</strong> (
                                        {ord.customerPhone})
                                      </div>
                                      <div className="text-slate-500 text-[11px]">
                                        ঠিকানা: {ord.deliveryAddress}{' '}
                                        {ord.unionNameBn ? `• ${ord.unionNameBn}` : ''}
                                      </div>
                                    </div>
                                    <div className="text-right sm:self-center font-black text-sky-950 text-sm">
                                      {formatBDT(ord.totalAmount)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ))}

                  {/* TYPE C: Order Lists (Total Orders, Total Delivery, Total Pending, Total Cancelled, Total Sale) */}
                  {['total_orders', 'total_delivered', 'total_pending', 'total_cancelled', 'total_sale'].includes(
                    summaryDetailType
                  ) &&
                    (detailModalOrders.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs bg-white rounded-3xl border border-slate-200">
                        {language === 'bn'
                          ? 'এই ক্যাটাগরিতে কোনো অর্ডার পাওয়া যায়নি।'
                          : 'No orders found matching this filter.'}
                      </div>
                    ) : (
                      detailModalOrders.map((ord, idx) => (
                        <div
                          key={`modal-ord-${ord.id}-${idx}`}
                          className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 hover:border-slate-300 transition-all"
                        >
                          {/* Order Top Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-xs sm:text-sm text-slate-900">
                                #{ord.id}
                              </span>
                              <StatusBadge status={ord.orderStatus} size="sm" />
                              <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>
                                  {new Date(ord.createdAt).toLocaleString('bn-BD', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              {ord.paymentStatus === 'deposited' ? (
                                <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  🏦 অফিসে টাকা জমা প্রাপ্ত
                                </span>
                              ) : ord.paymentStatus === 'collected' ? (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  🛵 রাইডারের কাছে ক্যাশ আছে
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  COD ক্যাশ অন ডেলিভারি
                                </span>
                              )}
                              <span className="text-sm font-black text-emerald-800">
                                {formatBDT(ord.totalAmount)}
                              </span>
                            </div>
                          </div>

                          {/* Customer and Rider Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 text-xs">
                            {/* Customer Block */}
                            <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                              <div className="font-bold text-slate-800 flex items-center space-x-1.5 mb-1.5">
                                <Users className="w-3.5 h-3.5 text-slate-500" />
                                <span>কাস্টমারের তথ্য (Customer)</span>
                              </div>
                              <div className="space-y-1">
                                <div className="font-semibold text-slate-900">{ord.customerName}</div>
                                <div className="flex items-center space-x-1">
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  <a
                                    href={`tel:${ord.customerPhone}`}
                                    className="text-emerald-700 font-mono hover:underline"
                                  >
                                    {ord.customerPhone}
                                  </a>
                                </div>
                                <div className="text-slate-500 flex items-start space-x-1">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                  <span>
                                    {ord.deliveryAddress}
                                    {ord.unionNameBn ? ` • ইউনিয়ন: ${ord.unionNameBn}` : ''}
                                    {ord.thanaNameBn ? ` • থানা: ${ord.thanaNameBn}` : ''}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Rider Block */}
                            <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                              <div className="font-bold text-slate-800 flex items-center space-x-1.5 mb-1.5">
                                <Bike className="w-3.5 h-3.5 text-slate-500" />
                                <span>ডেলিভারি রাইডার (Delivery Rider)</span>
                              </div>
                              {ord.riderId ? (
                                <div className="space-y-1">
                                  <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
                                    <span>{ord.riderName || 'রাইডার'}</span>
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                                      {ord.orderStatus === 'delivered' ? 'ডেলিভারি করেছে' : 'ডেলিভারিতে নিয়োজিত'}
                                    </span>
                                  </div>
                                  {ord.riderPhone && (
                                    <div className="flex items-center space-x-1">
                                      <Phone className="w-3 h-3 text-emerald-600" />
                                      <a
                                        href={`tel:${ord.riderPhone}`}
                                        className="text-emerald-700 font-mono hover:underline"
                                      >
                                        {ord.riderPhone}
                                      </a>
                                    </div>
                                  )}
                                  <div className="text-[11px] text-slate-500">
                                    রাইডার আইডি: <span className="font-mono">{ord.riderId}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-slate-400 py-2">
                                  ⚠️ এই অর্ডারে এখনো কোনো রাইডার এসাইন করা হয়নি।
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Ordered Items Summary */}
                          {Array.isArray(ord.items) && ord.items.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                              <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="font-bold text-slate-700">পণ্য তালিকা:</span>
                                {ord.items.map((it, iIdx) => (
                                  <span
                                    key={`ord-item-${iIdx}`}
                                    className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700"
                                  >
                                    {it.nameBn || it.nameEn} ({it.quantity} {it.unit || 'টি'})
                                  </span>
                                ))}
                              </div>

                              <div className="text-slate-500 font-medium">
                                সাবটোটাল: ৳{ord.subtotal} + ডেলিভারি ফি: ৳{ord.deliveryFee} ={' '}
                                <strong>৳{ord.totalAmount}</strong>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ))}
                </div>

                {/* Modal Footer */}
                <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {summaryDetailType === 'rider_balance' || summaryDetailType === 'office_deposit'
                      ? 'রাইডারের নামের পাশে "অর্ডার দেখুন" ক্লিক করে বিস্তারিত দেখতে পারেন'
                      : 'অর্ডারের সাথে রাইডার ও কাস্টমারের সরাসরি যোগাযোগের নম্বর যুক্ত আছে'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSummaryDetailType(null);
                      setSummaryDetailSearch('');
                      setExpandedRiderId(null);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors"
                  >
                    বন্ধ করুন (Close)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TWO MAIN RANKED LISTS: TOP SALES PRODUCTS & TOP CUSTOMERS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SECTION 1: TOP SALES PRODUCTS LIST */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="p-2 rounded-2xl bg-amber-100 text-amber-800">
                      <Award className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900">
                        {language === 'bn' ? 'সর্বাধিক বিক্রীত পণ্য (Top Sales Products)' : 'Top Sales Products Ranking'}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {language === 'bn'
                          ? 'বিক্রির পরিমাণ ও মোট আয়ের ভিত্তিতে র‍্যাংকিং'
                          : 'Ranked by quantity sold & total revenue generated'}
                      </p>
                    </div>
                  </div>

                  <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-xl">
                    {topSellingProducts.length} {language === 'bn' ? 'টি পণ্য' : 'products'}
                  </span>
                </div>

                {/* Product Search Filter */}
                <div className="relative mb-4">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={topProductSearch}
                    onChange={(e) => setTopProductSearch(e.target.value)}
                    placeholder={
                      language === 'bn'
                        ? 'পণ্য বা ক্যাটাগরি দিয়ে খুঁজুন...'
                        : 'Search top products by name or category...'
                    }
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {topProductSearch && (
                    <button
                      type="button"
                      onClick={() => setTopProductSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Products Table/List */}
                {topSellingProducts.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    {language === 'bn'
                      ? 'এই সময়ে কোনো বিক্রিত পণ্য পাওয়া যায়নি।'
                      : 'No product sales recorded in this period.'}
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {topSellingProducts.map((p, idx) => {
                      const rank = idx + 1;
                      const isTop1 = rank === 1;
                      const isTop2 = rank === 2;
                      const isTop3 = rank === 3;

                      return (
                        <div
                          key={`top-prod-${p.productId}-${idx}`}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                            isTop1
                              ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                              : isTop2
                              ? 'bg-slate-50 border-slate-300'
                              : isTop3
                              ? 'bg-orange-50/50 border-orange-200'
                              : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          {/* Rank badge & Image */}
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="relative shrink-0">
                              <span
                                className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                                  isTop1
                                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                                    : isTop2
                                    ? 'bg-slate-300 text-slate-800'
                                    : isTop3
                                    ? 'bg-amber-700 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {isTop1 ? <Crown className="w-3.5 h-3.5" /> : `#${rank}`}
                              </span>
                            </div>

                            <img
                              src={p.imageUrl}
                              alt={p.nameEn}
                              className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://placehold.co/100x100?text=Product';
                              }}
                            />

                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {language === 'bn' ? p.nameBn : p.nameEn}
                              </h4>
                              <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                                <span className="bg-slate-200/70 px-1.5 py-0.5 rounded-md font-medium">
                                  {p.category}
                                </span>
                                <span>{p.orderCount} টি অর্ডারে</span>
                              </div>
                            </div>
                          </div>

                          {/* Sales Count & Total Revenue */}
                          <div className="text-right shrink-0 ml-3">
                            <div className="text-xs font-black text-emerald-700">
                              {p.quantitySold} {p.unit}
                            </div>
                            <div className="text-[11px] font-bold text-slate-800 mt-0.5">
                              {formatBDT(p.totalRevenue)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: TOP CUSTOMER LIST */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="p-2 rounded-2xl bg-indigo-100 text-indigo-800">
                      <Users className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900">
                        {language === 'bn' ? 'শীর্ষ কাস্টমার তালিকা (Top Customers)' : 'Top Customer Rankings'}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {language === 'bn'
                          ? 'সর্বোচ্চ কেনাকাটার পরিমাণ ও অর্ডার সংখ্যার ভিত্তিতে'
                          : 'Ranked by total purchase amount and order frequency'}
                      </p>
                    </div>
                  </div>

                  <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-xl">
                    {topCustomers.length} {language === 'bn' ? 'জন গ্রাহক' : 'customers'}
                  </span>
                </div>

                {/* Customer Search Filter */}
                <div className="relative mb-4">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={topCustomerSearch}
                    onChange={(e) => setTopCustomerSearch(e.target.value)}
                    placeholder={
                      language === 'bn'
                        ? 'কাস্টমারের নাম, ফোন নম্বর বা এলাকা দিয়ে খুঁজুন...'
                        : 'Search top customers by name, phone or location...'
                    }
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {topCustomerSearch && (
                    <button
                      type="button"
                      onClick={() => setTopCustomerSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Customers Table/List */}
                {topCustomers.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    {language === 'bn'
                      ? 'এই সময়ে কোনো কাস্টমার অর্ডার পাওয়া যায়নি।'
                      : 'No customer purchases recorded in this period.'}
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {topCustomers.map((c, idx) => {
                      const rank = idx + 1;
                      const isTop1 = rank === 1;
                      const isTop2 = rank === 2;
                      const isTop3 = rank === 3;

                      return (
                        <div
                          key={`top-cust-${c.phone}-${idx}`}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                            isTop1
                              ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                              : isTop2
                              ? 'bg-indigo-50/40 border-indigo-200'
                              : isTop3
                              ? 'bg-emerald-50/30 border-emerald-200'
                              : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          {/* Rank badge & Customer info */}
                          <div className="flex items-center space-x-3 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                                isTop1
                                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                                  : isTop2
                                  ? 'bg-slate-300 text-slate-800'
                                  : isTop3
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {isTop1 ? <Crown className="w-3.5 h-3.5" /> : `#${rank}`}
                            </span>

                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-xs font-bold text-slate-900 truncate">
                                  {c.name}
                                </h4>
                                {isTop1 && (
                                  <span className="bg-amber-400/90 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-md">
                                    VIP #1
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5 flex-wrap gap-y-0.5">
                                <a
                                  href={`tel:${c.phone}`}
                                  className="text-emerald-700 hover:underline font-mono font-medium flex items-center space-x-0.5"
                                  title="কল করুন"
                                >
                                  <Phone className="w-2.5 h-2.5 mr-0.5 inline" />
                                  <span>{c.phone}</span>
                                </a>
                                {(c.union || c.thana) && (
                                  <span className="text-slate-400">
                                    • {c.union ? c.union : c.thana}
                                  </span>
                                )}
                              </div>
                              {c.address && (
                                <p className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[200px] sm:max-w-[280px]">
                                  📍 {c.address}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Purchase amount & Order count */}
                          <div className="text-right shrink-0 ml-3">
                            <div className="text-xs font-black text-emerald-800">
                              {formatBDT(c.totalSpent)}
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              {c.totalOrders} টি অর্ডার ({c.deliveredOrders} সম্পন্ন)
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: NEW ORDERS */}
      {activeTab === 'new_orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              নতুন ও অপেক্ষমান অর্ডারসমূহ (রাইডার এসাইন করুন)
            </h2>
            <span className="text-xs text-slate-500 font-semibold">
              মোট: {newOrders.length} টি
            </span>
          </div>

          {newOrders.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
              বর্তমানে কোনো নতুন অপেক্ষমান অর্ডার নেই।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newOrders.map((order, idx) => {
                // Filter riders that cover this order's union or thana
                const matchingRiders = registeredRiders.filter((r) => {
                  if (order.unionId && r.assignedUnionIds?.length > 0) {
                    return r.assignedUnionIds.includes(order.unionId);
                  }
                  return r.area === order.marketId || r.thanaId === order.thanaId;
                });

                return (
                  <div
                    key={`${order.id}-${idx}`}
                    className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3 flex-wrap gap-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            #{order.id}
                          </span>
                          <StatusBadge status={order.orderStatus} size="sm" />
                          {order.unionNameBn && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {order.thanaNameBn ? `${order.thanaNameBn} • ` : ''}{order.unionNameBn}
                            </span>
                          )}
                        </div>
                        <span className="text-emerald-800 font-black text-sm">
                          {formatBDT(order.totalAmount)}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                        <p>
                          <strong className="text-slate-800">গ্রাহক:</strong> {order.customerName} (
                          <span className="font-mono">{order.customerPhone}</span>)
                        </p>
                        <p>
                          <strong className="text-slate-800">ডেলিভারি ঠিকানা:</strong> {order.deliveryAddress}
                        </p>
                        <p>
                          <strong className="text-slate-800">আইটেম:</strong>{' '}
                          {order.items.map((i) => `${i.nameBn} (${i.quantity} ${i.unit})`).join(', ')}
                        </p>
                      </div>

                      {/* Order Note Component */}
                      <div className="mb-3">
                        <OrderNoteSection
                          orderId={order.id}
                          notes={order.notes}
                          userRole="admin"
                          compact={true}
                          onUpdateNote={async (oId, n) => {
                            if (onUpdateOrderNote) await onUpdateOrderNote(oId, n);
                          }}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveChatOrder(order)}
                        className="px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-2xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                        <span>কাস্টমারকে মেসেজ</span>
                        {order.messages && order.messages.length > 0 && (
                          <span className="bg-emerald-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                            {order.messages.length}
                          </span>
                        )}
                      </button>

                      {order.riderName || order.riderId ? (
                        <div className="flex flex-wrap items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-950 px-2.5 py-1.5 rounded-xl text-xs font-bold flex-1 justify-between">
                          <span className="flex items-center gap-1.5">
                            <Bike className="w-3.5 h-3.5 text-emerald-700" />
                            <span>রাইডার: {order.riderName || 'এসাইনড'} {order.riderPhone ? `(${order.riderPhone})` : ''}</span>
                          </span>
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                onAssignRider(order.id, e.target.value);
                              }
                            }}
                            className="p-1 rounded-lg border border-emerald-300 text-[10px] font-bold text-emerald-900 bg-white"
                          >
                            <option value="">রাইডার পরিবর্তন</option>
                            {registeredRiders.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name} ({r.phone})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              onAssignRider(order.id, e.target.value);
                            }
                          }}
                          className="p-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 flex-1 focus:outline-hidden focus:border-emerald-600"
                        >
                          <option value="">
                            {matchingRiders.length > 0
                              ? `এই ইউনিয়নের রাইডার এসাইন করুন (${matchingRiders.length} জন)`
                              : 'রাইডার এসাইন করুন'}
                          </option>
                          {registeredRiders.map((r) => {
                            const isRecommended = order.unionId && r.assignedUnionIds?.includes(order.unionId);
                            return (
                              <option key={r.id} value={r.id}>
                                {isRecommended ? '⭐ ' : ''}{r.name} ({r.phone}) {r.isOnline ? '🟢' : '🔴'}
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL ORDERS (Admin sees orders from all areas & unions) */}
      {activeTab === 'all_orders' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                সকল এরিয়ার সার্বিক অর্ডার হিস্ট্রি (ALL Orders)
              </h2>
              <p className="text-xs text-slate-500">
                এডমিন প্যানেলে কালীগঞ্জ ও কাপাসিয়া সহ সকল ইউনিয়নের সমস্ত অর্ডার একনজরে দৃশ্যমান।
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Thana filter */}
              <select
                value={thanaFilter}
                onChange={(e) => {
                  setThanaFilter(e.target.value);
                  setUnionFilter('all');
                }}
                className="p-2 rounded-xl border border-slate-200 font-bold bg-slate-50"
              >
                <option value="all">সকল থানা</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nameBn}
                  </option>
                ))}
              </select>

              {/* Union filter */}
              <select
                value={unionFilter}
                onChange={(e) => setUnionFilter(e.target.value)}
                className="p-2 rounded-xl border border-slate-200 font-bold bg-slate-50"
              >
                <option value="all">সকল ইউনিয়ন</option>
                {(thanaFilter === 'all'
                  ? unions
                  : unions.filter((u) => u.thanaId === thanaFilter)
                ).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nameBn} ({u.thanaNameBn})
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 rounded-xl border border-slate-200 font-bold bg-slate-50"
              >
                <option value="all">সকল স্ট্যাটাস</option>
                <option value="pending_shop_confirmation">অপেক্ষমান</option>
                <option value="rider_assigned">রাইডার এসাইনড</option>
                <option value="out_for_delivery">ডেলিভারির পথে</option>
                <option value="delivered">ডেলিভার্ড</option>
                <option value="cancelled">বাতিল</option>
              </select>

              {/* Search box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="অর্ডার #, গ্রাহক, ফোন..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold bg-slate-50">
                  <th className="py-2.5 px-3">অর্ডার #</th>
                  <th className="py-2.5 px-3">গ্রাহক</th>
                  <th className="py-2.5 px-3">ইউনিয়ন ও ঠিকানা</th>
                  <th className="py-2.5 px-3">স্ট্যাটাস</th>
                  <th className="py-2.5 px-3">রাইডার</th>
                  <th className="py-2.5 px-3">নোট ও চ্যাট</th>
                  <th className="py-2.5 px-3 text-right">মূল্য (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                      কোনো অর্ডার পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o, idx) => (
                    <tr key={`${o.id}-${idx}`} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        #{o.id}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold block">{o.customerName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{o.customerPhone}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs">
                        {o.unionNameBn && (
                          <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md mb-0.5 mr-1">
                            {o.thanaNameBn ? `${o.thanaNameBn} • ` : ''}{o.unionNameBn}
                          </span>
                        )}
                        <p className="truncate text-[11px] text-slate-500">{o.deliveryAddress}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={o.orderStatus} size="sm" />
                      </td>
                      <td className="py-2.5 px-3">
                        {o.riderName ? (
                          <span className="font-semibold text-emerald-800 flex items-center gap-1">
                            <Bike className="w-3.5 h-3.5" />
                            <span>{o.riderName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">অপেক্ষমান</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-1 items-start">
                          <button
                            type="button"
                            onClick={() => setActiveChatOrder(o)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold text-[11px] transition-colors"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-700" />
                            <span>মেসেজ</span>
                            {o.messages && o.messages.length > 0 && (
                              <span className="bg-emerald-700 text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono">
                                {o.messages.length}
                              </span>
                            )}
                          </button>
                          {o.notes ? (
                            <span
                              className="text-[10px] text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded truncate max-w-[130px]"
                              title={o.notes}
                            >
                              📝 {o.notes}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300 italic">নোট নেই</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                        {formatBDT(o.totalAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: RIDER BALANCES & PERFORMANCE (কয়টা ডেলিভারি, কত ব্যালেন্স, পেন্ডিং ও সামরিক ডিঅ্যাক্টিভেশন) */}
      {activeTab === 'rider_balances' && (
        <div className="space-y-6">
          {/* Header & Overview */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-700" />
                  <span>রাইডার ডেলিভারি রিপোর্ট, ব্যালেন্স ও সাময়িক ডিঅ্যাক্টিভেশন</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  কোন রাইডার কয়টা ডেলিভারি করেছে, তার কাছে কত টাকা ক্যাশ ব্যালেন্স রয়েছে এবং কয়টা পেন্ডিং ডেলিভারি রয়েছে তা পর্যবেক্ষণ করুন। ব্যালেন্স অফিসে জমা নেওয়ার জন্য প্রয়োজনে সাময়িক ডিঅ্যাক্টিভ করুন।
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setRiderSelectedUnions(unions.filter((u) => u.thanaId === riderThana).map((u) => u.id));
                    setShowRegisterRiderModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন রাইডার</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-5">
              <div className="bg-rose-50/80 border border-rose-200 p-4 rounded-2xl">
                <span className="text-[11px] font-bold text-rose-700 block">রাইডারদের কাছে মোট বকেয়া ক্যাশ</span>
                <span className="text-xl sm:text-2xl font-black text-rose-800 mt-0.5 block">
                  {formatBDT(totalUnsettledCashAllRiders)}
                </span>
                <span className="text-[10px] text-rose-600 font-semibold block mt-1">
                  {totalUnsettledCashAllRiders > 0 ? '⚠️ অফিসে জমা নেওয়া বাকি' : '✅ সম্পূর্ণ পরিশোধিত'}
                </span>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl">
                <span className="text-[11px] font-bold text-emerald-700 block">মোট সম্পন্ন ডেলিভারি</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-900 mt-0.5 block">
                  {totalDeliveredAllRiders} টি
                </span>
                <span className="text-[10px] text-emerald-600 block mt-1">
                  সফলভাবে গ্রাহকের হাতে পৌঁছেছে
                </span>
              </div>

              <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl">
                <span className="text-[11px] font-bold text-amber-700 block">চলমান পেন্ডিং ডেলিভারি</span>
                <span className="text-xl sm:text-2xl font-black text-amber-900 mt-0.5 block">
                  {totalPendingDeliveriesAllRiders} টি
                </span>
                <span className="text-[10px] text-amber-600 block mt-1">
                  রাইডারের পথে বা অপেক্ষমান
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <span className="text-[11px] font-bold text-slate-700 block">রাইডার ফ্লিট অবস্থা</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                    {activeRidersCount} সক্রিয়
                  </span>
                  <span className="text-sm font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg">
                    {deactivatedRidersCount} ডিঅ্যাক্টিভ
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  মোট নিবন্ধিত: {registeredRiders.length} জন
                </span>
              </div>
            </div>
          </div>

          {/* Success Notification if settled */}
          {settleSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-xs text-emerald-900 font-bold shadow-2xs">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{settleSuccessMsg}</span>
              </span>
              <button onClick={() => setSettleSuccessMsg('')} className="text-emerald-700 hover:text-emerald-950 font-black">✕</button>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={riderBalanceSearch}
                onChange={(e) => setRiderBalanceSearch(e.target.value)}
                placeholder="রাইডারের নাম, মোবাইল নম্বর বা থানা দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden focus:border-emerald-600 font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600 shrink-0">ফিল্টার:</span>
              <select
                value={riderBalanceStatusFilter}
                onChange={(e) => setRiderBalanceStatusFilter(e.target.value as any)}
                className="p-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 focus:outline-hidden focus:border-emerald-600"
              >
                <option value="all">সকল রাইডার ({registeredRiders.length})</option>
                <option value="with_balance">ক্যাশ ব্যালেন্স বাকি আছে</option>
                <option value="active">সক্রিয় রাইডার ({activeRidersCount})</option>
                <option value="deactivated">সাময়িক ডিঅ্যাক্টিভ ({deactivatedRidersCount})</option>
              </select>
            </div>
          </div>

          {/* Rider Cards List */}
          <div className="space-y-3.5">
            {registeredRiders
              .filter((r) => {
                const metrics = getRiderMetrics(r.id);
                // Search filter
                const matchesSearch =
                  r.name.toLowerCase().includes(riderBalanceSearch.toLowerCase()) ||
                  r.phone.includes(riderBalanceSearch) ||
                  (r.area && r.area.toLowerCase().includes(riderBalanceSearch.toLowerCase()));

                if (!matchesSearch) return false;

                // Status filter
                if (riderBalanceStatusFilter === 'with_balance') return metrics.cashBalance > 0;
                if (riderBalanceStatusFilter === 'active') return r.isActive !== false;
                if (riderBalanceStatusFilter === 'deactivated') return r.isActive === false;

                return true;
              })
              .map((rider) => {
                const metrics = getRiderMetrics(rider.id);
                const isDeactivated = rider.isActive === false;

                return (
                  <div
                    key={rider.id}
                    className={`bg-white rounded-3xl border transition-all p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      isDeactivated
                        ? 'border-rose-300 bg-rose-50/30 ring-1 ring-rose-200'
                        : metrics.cashBalance > 0
                        ? 'border-amber-300'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* 1. Rider Info */}
                    <div className="flex items-start space-x-3.5 min-w-[260px]">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 mt-0.5 ${
                          isDeactivated
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}
                      >
                        <Bike className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-1">
                          <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                            {rider.name}
                          </h3>
                          {isDeactivated ? (
                            <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                              <PauseCircle className="w-3 h-3" />
                              <span>সাময়িক ডিঅ্যাক্টিভ</span>
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                              <span>সক্রিয় (Active)</span>
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                              rider.isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {rider.isOnline ? '🟢 অনলাইন' : '⚪ অফলাইন'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                          <span className="font-mono text-emerald-900 font-bold flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{rider.phone}</span>
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">
                            থানা: {rider.area === 'kapasia' ? 'কাপাসিয়া' : 'কালীগঞ্জ'}
                          </span>
                          <span>•</span>
                          <span className="text-[11px] text-slate-500">
                            ইউনিয়ন: {rider.assignedUnionIds?.length || 0}টি
                          </span>
                        </div>

                        {/* Deactivation Reason Warning Note */}
                        {isDeactivated && (
                          <div className="mt-2 bg-rose-100/80 border border-rose-300 text-rose-950 p-2 rounded-xl text-[11px] font-medium flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-700 shrink-0 mt-0.5" />
                            <div>
                              <strong>স্থগিত কারণ:</strong>{' '}
                              <span>{rider.deactivatedReason || 'ব্যালেন্স অফিসে জমা করার জন্য সামরিক ডিঅ্যাক্টিভ'}</span>
                              <span className="block text-[10px] text-rose-700 mt-0.5">
                                ব্যালেন্স জমা নিয়ে নিচের সবুজ বাটন দিয়ে পুনরায় সক্রিয় করুন।
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. Core Metrics: কয়টা ডেলিভারি, কত ব্যালেন্স, কয়টা পেন্ডিং */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/90 text-center shrink-0">
                      {/* কয়টা ডেলিভারি করছে */}
                      <div className="px-2">
                        <span className="text-[10px] text-slate-500 block font-semibold">মোট ডেলিভারি</span>
                        <span className="text-base font-black text-emerald-800 mt-0.5 block">
                          {metrics.deliveredCount} টি
                        </span>
                        <span className="text-[9px] text-slate-400 block">সম্পন্ন</span>
                      </div>

                      {/* কয়টা পেন্ডিং রয়েছে */}
                      <div className="px-2 border-x border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-semibold">পেন্ডিং রয়েছে</span>
                        <span className={`text-base font-black mt-0.5 block ${metrics.pendingCount > 0 ? 'text-amber-700' : 'text-slate-600'}`}>
                          {metrics.pendingCount} টি
                        </span>
                        <span className="text-[9px] text-slate-400 block">চলমান ডেলিভারি</span>
                      </div>

                      {/* কত টাকা ব্যালেন্স আছে */}
                      <div className="px-2">
                        <span className="text-[10px] text-slate-500 block font-semibold">হাতে ব্যালেন্স (COD)</span>
                        <span
                          className={`text-base font-black mt-0.5 block ${
                            metrics.cashBalance > 0 ? 'text-rose-700 font-mono' : 'text-slate-700'
                          }`}
                        >
                          {formatBDT(metrics.cashBalance)}
                        </span>
                        <span
                          className={`text-[9px] font-bold block ${
                            metrics.cashBalance > 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {metrics.cashBalance > 0 ? 'অফিসে বকেয়া' : 'পরিশোধিত'}
                        </span>
                      </div>
                    </div>

                    {/* 3. Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      {/* Settle Balance Button */}
                      {metrics.cashBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSettlingRider(rider);
                            setSettleAmount(metrics.cashBalance);
                            setSettleNotes(`অফিসে ক্যাশ ব্যালেন্স জমা - রাইডার ${rider.name}`);
                          }}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                          title="রাইডার থেকে ক্যাশ ব্যালেন্স অফিসে জমা গ্রহণ করুন"
                        >
                          <Banknote className="w-3.5 h-3.5 text-emerald-200" />
                          <span>ব্যালেন্স জমা নিন ({formatBDT(metrics.cashBalance)})</span>
                        </button>
                      )}

                      {/* Deactivate / Reactivate Action Button */}
                      {isDeactivated ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onToggleRiderActive) {
                              onToggleRiderActive(rider.id, true);
                              setSettleSuccessMsg(`রাইডার ${rider.name} এর অ্যাকাউন্ট সফলভাবে পুনরায় সক্রিয় করা হয়েছে!`);
                            }
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                          title="রাইডারের অ্যাকাউন্ট পুনরায় সক্রিয় করুন"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>পুনরায় সক্রিয় (Activate) করুন</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDeactivatingRider(rider);
                            setDeactivateReasonInput('ব্যালেন্স অফিসে জমা করার জন্য সামরিক ডিঅ্যাক্টিভ');
                          }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 transition-colors"
                          title="ব্যালেন্স অফিসে জমা করার জন্য সাময়িকভাবে ডিঅ্যাক্টিভ করুন"
                        >
                          <PauseCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>সাময়িক ডিঅ্যাক্টিভ করুন</span>
                        </button>
                      )}

                      {/* View Deliveries History Button */}
                      <button
                        type="button"
                        onClick={() => setViewingRiderDeliveries(rider)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 border border-slate-200 transition-colors"
                        title="রাইডারের সম্পন্ন ও পেন্ডিং ডেলিভারি তালিকা দেখুন"
                      >
                        <History className="w-3.5 h-3.5 text-slate-500" />
                        <span>ডেলিভারি বিবরণ ({metrics.totalOrders})</span>
                      </button>
                    </div>
                  </div>
                );
              })}

            {registeredRiders.length === 0 && (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
                কোনো রাইডার নিবন্ধিত নেই। উপরের বাটন দিয়ে নতুন রাইডার যোগ করুন।
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RIDER MANAGEMENT (Union Breakdown + Multi-Union Assignment) */}
      {activeTab === 'riders' && (
        <div className="space-y-6">
          {/* Top Info & Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Bike className="w-5 h-5 text-emerald-700" />
                <span>ইউনিয়নভিত্তিক রাইডার পরিচালনা ও মনিটরিং</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                প্রতিটি ইউনিয়নে কতজন রাইডার রয়েছে তা দেখুন এবং নতুন রাইডারকে এক বা একাধিক ইউনিয়ন এসাইন করুন।
              </p>
            </div>
            <button
              onClick={() => {
                setRiderSelectedUnions(unions.filter((u) => u.thanaId === riderThana).map((u) => u.id));
                setShowRegisterRiderModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন রাইডার যুক্ত করুন</span>
            </button>
          </div>

          {/* Rider Success Alert Banner */}
          {riderSuccessAlert && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-start justify-between gap-3 text-emerald-950 shadow-xs animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-200/80 rounded-xl text-emerald-800 shrink-0 mt-0.5">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-950">রাইডার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!</h4>
                  <p className="text-xs text-emerald-850 mt-1 flex flex-wrap items-center gap-2">
                    <span>রাইডারের নাম: <strong className="text-emerald-950">{riderSuccessAlert.name}</strong></span>
                    <span>•</span>
                    <span>মোবাইল নম্বর: <strong className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900">{riderSuccessAlert.phone}</strong></span>
                    <span>•</span>
                    <span>পাসওয়ার্ড: <strong className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900">{riderSuccessAlert.password}</strong></span>
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                    রাইডার এই মোবাইল নম্বর এবং পাসওয়ার্ড দিয়ে যে কোনো সময় সরাসরি লগইন করতে পারবে।
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRiderSuccessAlert(null)}
                className="text-emerald-700 hover:text-emerald-950 font-bold text-xs p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* REQUIREMENT: "কোন এরিয়া কয়টা রাইটার রয়েছে তা দেখতে পারবে" (Riders count per Union analytics) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-700" />
                <span>ইউনিয়ন অনুযায়ী রাইডার সংখ্যা (Riders Count by Union)</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                প্রতিটি ইউনিয়নের জন্য নির্ধারিত সক্রিয় রাইডারের রিয়েল-টাইম তথ্য
              </p>
            </div>

            {/* Kaliganj Unions Breakdown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                  <span>কালীগঞ্জ থানা (মোট {getRiderCountForThana('kaliganj')} জন রাইডার)</span>
                </h4>
                <span className="text-[10px] text-slate-400">৭টি ইউনিয়ন</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {unions
                  .filter((u) => u.thanaId === 'kaliganj')
                  .map((union) => {
                    const count = getRiderCountForUnion(union.id);
                    return (
                      <div
                        key={union.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          count > 0
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold truncate">{union.nameBn}</span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              count > 0
                                ? 'bg-emerald-700 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {count} জন
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-1">
                          {count > 0 ? '🟢 ডেলিভারি প্রস্তুত' : '⚠️ রাইডার প্রয়োজন'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Kapasia Unions Breakdown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                  <span>কাপাসিয়া থানা (মোট {getRiderCountForThana('kapasia')} জন রাইডার)</span>
                </h4>
                <span className="text-[10px] text-slate-400">১১টি ইউনিয়ন</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {unions
                  .filter((u) => u.thanaId === 'kapasia')
                  .map((union) => {
                    const count = getRiderCountForUnion(union.id);
                    return (
                      <div
                        key={union.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          count > 0
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold truncate">{union.nameBn}</span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              count > 0
                                ? 'bg-emerald-700 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {count} জন
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-1">
                          {count > 0 ? '🟢 ডেলিভারি প্রস্তুত' : '⚠️ রাইডার প্রয়োজন'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* REGISTERED RIDERS LIST */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                সকল নিবন্ধিত রাইডার তালিকা ({registeredRiders.length} জন)
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              {registeredRiders.map((r) => {
                const assignedCount = r.assignedUnionIds?.length || 0;
                return (
                  <div key={r.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                    <div className="flex items-start space-x-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0 mt-0.5">
                        <Bike className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-extrabold text-sm text-slate-900">{r.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              r.isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {r.isOnline ? '🟢 অনলাইন' : '🔴 অফলাইন'}
                          </span>
                        </div>

                        <p className="text-slate-500 flex items-center gap-2 mt-1">
                          <span className="font-mono text-emerald-800 font-bold">{r.phone}</span>
                          <span>•</span>
                          <span>পাসওয়ার্ড: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-800">{r.password || '123'}</span></span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">
                            থানা: {r.area === 'kapasia' ? 'কাপাসিয়া' : 'কালীগঞ্জ'}
                          </span>
                        </p>

                        {/* Assigned Unions */}
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-400 mr-1">
                            নির্ধারিত ইউনিয়ন ({assignedCount}টি):
                          </span>
                          {r.assignedUnionIds && r.assignedUnionIds.length > 0 ? (
                            r.assignedUnionIds.map((uId) => {
                              const uObj = unions.find((u) => u.id === uId);
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
                            <span className="text-[10px] text-slate-400 italic">সকল ইউনিয়ন উন্মুক্ত</span>
                          )}
                        </div>
                        {/* Balance & Deliveries Summary Pill */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {(() => {
                            const rMet = getRiderMetrics(r.id);
                            return (
                              <>
                                <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  ডেলিভারি: {rMet.deliveredCount} টি
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  rMet.cashBalance > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  বকেয়া ক্যাশ: {formatBDT(rMet.cashBalance)}
                                </span>
                                {r.isActive === false && (
                                  <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    সাময়িক ডিঅ্যাক্টিভ
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Edit Unions & View Balance button */}
                    <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('rider_balances');
                          setRiderBalanceSearch(r.name);
                        }}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Wallet className="w-3.5 h-3.5 text-emerald-700" />
                        <span>ব্যালেন্স ও একশন</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingRider(r);
                          setEditRiderUnions(r.assignedUnionIds || []);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-200"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>ইউনিয়ন পরিবর্তন করুন</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AREAS & UNIONS */}
      {activeTab === 'areas' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                অনুমোদিত ডেলিভারি এরিয়া ও ইউনিয়নসমূহ
              </h2>
              <p className="text-xs text-slate-500">
                কালীগঞ্জ (৭ ইউনিয়ন) এবং কাপাসিয়া (১১ ইউনিয়ন) সম্পূর্ণ কনফিগার করা আছে।
              </p>
            </div>
            <button
              onClick={() => setShowAddAreaModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm self-start"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন এরিয়া যুক্ত করুন</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {markets.map((market) => {
              const marketUnions = unions.filter((u) => u.thanaId === market.id);
              const ridersInThana = getRiderCountForThana(market.id);
              return (
                <div
                  key={market.id}
                  className="p-5 rounded-3xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">
                            {market.nameBn} থানা ({market.nameEn})
                          </h3>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            জেলা: {market.cityBn} • রাইডার: {ridersInThana} জন
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                        {marketUnions.length}টি ইউনিয়ন
                      </span>
                    </div>

                    <div className="mt-3">
                      <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                        অন্তর্ভুক্ত ইউনিয়নসমূহ:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {marketUnions.map((u) => (
                          <span
                            key={u.id}
                            className="bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-lg shadow-2xs"
                          >
                            {u.nameBn}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                    <span>কভারেজ ব্যাসার্ধ: {market.radiusKm} কি.মি</span>
                    <span className="text-emerald-700 font-bold">অনলাইন স্টোরে চালু</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                এডমিন প্রোডাক্ট তালিকা ({products.length} টি)
              </h2>
              <p className="text-xs text-slate-500">
                ৩টি ক্যাটাগরি: Daily Products, Personal Care, Fuel & Energy। এডমিন এখান থেকে যেকোনো প্রোডাক্ট Edit, Delete ও Private করতে পারেন।
              </p>
            </div>
            <button
              onClick={() => setShowAddProductModal(true)}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold py-2 px-3.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন প্রোডাক্ট যোগ করুন</span>
            </button>
          </div>

          {/* Product Category Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pt-2">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'সকল প্রোডাক্ট (All)' },
                { id: 'daily_products', label: 'Daily Products' },
                { id: 'personal_care', label: 'Personal Care' },
                { id: 'fuel_energy', label: 'Fuel & Energy' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAdminProductCategoryFilter(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                    adminProductCategoryFilter === c.id
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={adminProductSearch}
                onChange={(e) => setAdminProductSearch(e.target.value)}
                placeholder="প্রোডাক্ট খুঁজুন (নাম বা এরিয়া)..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Products Table */}
          {(() => {
            const filtered = products.filter((p) => {
              const matchCat =
                adminProductCategoryFilter === 'all' || p.categoryId === adminProductCategoryFilter;
              const q = adminProductSearch.toLowerCase().trim();
              const matchQuery =
                !q ||
                p.nameBn.toLowerCase().includes(q) ||
                p.nameEn.toLowerCase().includes(q) ||
                (p.area && p.area.toLowerCase().includes(q)) ||
                (p.marketId && p.marketId.toLowerCase().includes(q));
              return matchCat && matchQuery;
            });

            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold bg-slate-50">
                      <th className="py-2.5 px-3">ছবি</th>
                      <th className="py-2.5 px-3">নাম (English / বাংলা)</th>
                      <th className="py-2.5 px-3">ক্যাটাগরি</th>
                      <th className="py-2.5 px-3">এরিয়া</th>
                      <th className="py-2.5 px-3">মূল্য</th>
                      <th className="py-2.5 px-3">মজুদ</th>
                      <th className="py-2.5 px-3">দৃশ্যমানতা</th>
                      <th className="py-2.5 px-3 text-right">অ্যাকশন (Edit / Private / Delete)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          কোনো প্রোডাক্ট পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      filtered.map((p) => {
                        const isCatDaily = p.categoryId === 'daily_products';
                        const isCatPersonal = p.categoryId === 'personal_care';
                        const isCatFuel = p.categoryId === 'fuel_energy';

                        return (
                          <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${p.isPrivate ? 'bg-amber-50/40' : ''}`}>
                            <td className="py-2.5 px-3">
                              <img
                                src={p.imageUrl}
                                alt={p.nameEn}
                                className="w-10 h-10 object-cover rounded-xl border border-slate-200 bg-white"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://placehold.co/600x600?text=' + encodeURIComponent(p.nameEn || 'Product');
                                }}
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{p.nameEn || p.nameBn}</div>
                              <div className="text-[11px] text-slate-500 font-medium">{p.nameBn}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isCatDaily
                                    ? 'bg-blue-100 text-blue-800'
                                    : isCatPersonal
                                    ? 'bg-purple-100 text-purple-800'
                                    : isCatFuel
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {isCatDaily ? 'Daily Products' : isCatPersonal ? 'Personal Care' : isCatFuel ? 'Fuel & Energy' : p.categoryId}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                                {p.marketId === 'all' || p.area === 'সকল এরিয়া'
                                  ? '🌐 সকল এরিয়া (All)'
                                  : p.area || p.marketId}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-emerald-800">
                              {formatBDT(p.price)} / {p.unit}
                            </td>
                            <td className="py-2.5 px-3 font-semibold">
                              <span className={p.stock < 10 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                                {p.stock} {p.unit}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {p.isPrivate ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <Lock className="w-3 h-3 text-amber-700" />
                                  <span>Private (গোপন)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Globe className="w-3 h-3 text-emerald-700" />
                                  <span>Public (উন্মুক্ত)</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Edit Product */}
                                <button
                                  type="button"
                                  onClick={() => openEditProductModal(p)}
                                  className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                                  title="Edit Product (সম্পাদনা করুন)"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Toggle Private / Public */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onToggleProductPrivate) {
                                      onToggleProductPrivate(p.id, !p.isPrivate);
                                    }
                                  }}
                                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                    p.isPrivate
                                      ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                  }`}
                                  title={p.isPrivate ? 'Make Public (উন্মুক্ত করুন)' : 'Make Private (গোপন করুন)'}
                                >
                                  {p.isPrivate ? (
                                    <Eye className="w-3.5 h-3.5" />
                                  ) : (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                {/* Delete Product */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete "${p.nameEn || p.nameBn}"?`)) {
                                      onDeleteProduct(p.id);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                                  title="Delete Product (মুছে ফেলুন)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB: RIDER CANCELLED ORDERS (রাইডার বাতিলকৃত অর্ডার) */}
      {activeTab === 'rider_cancelled' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-2xl bg-amber-100 text-amber-800">
                  <XCircle className="w-5 h-5" />
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {language === 'bn' ? 'রাইডার বাতিলকৃত অর্ডারসমূহ' : 'Rider Cancelled Orders'}
                </h2>
                <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {riderCancelledOrders.length} টি
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'bn'
                  ? 'যেসব অর্ডার কোনো রাইডার প্রথমে গ্রহণ করে পরবর্তীতে ছেড়ে দিয়েছেন বা বাতিল করেছেন। এখান থেকে অন্য রাইডার অ্যাসাইন করুন বা ফেক অর্ডার হলে ফেক তালিকায় পাঠান।'
                  : 'Orders initially accepted by a rider and later released/cancelled. Reassign to another rider or mark as fake.'}
              </p>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'bn' ? 'অর্ডার ID, কাস্টমার বা রাইডার খুঁজুন...' : 'Search order, customer, or rider...'}
                value={riderCancelledSearch}
                onChange={(e) => setRiderCancelledSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:outline-emerald-600"
              />
            </div>
          </div>

          {filteredRiderCancelledOrders.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
              {riderCancelledSearch.trim()
                ? 'অনুসন্ধানের সাথে মেলে এমন কোনো বাতিলকৃত অর্ডার পাওয়া যায়নি।'
                : 'এই মুহূর্তে কোনো রাইডার বাতিলকৃত অর্ডার নেই। সব অর্ডার স্বাভাবিক গতিতে চলছে।'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredRiderCancelledOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl border-2 border-amber-300 p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Header: ID, Badge, Amount */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-black text-slate-900">
                          #{order.id}
                        </span>
                        <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          রাইডার ছেড়ে দিয়েছেন
                        </span>
                        {order.unionNameBn && (
                          <span className="bg-emerald-50 text-emerald-800 text-xs px-2 py-0.5 rounded-md font-semibold border border-emerald-200">
                            {order.unionNameBn}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">মোট মূল্য</span>
                        <span className="font-mono font-black text-base text-emerald-800">
                          {formatBDT(order.totalAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Rider Cancellation Reason Box */}
                    <div className="my-3 p-3.5 bg-amber-50 rounded-2xl border border-amber-200/90 text-xs space-y-1 text-amber-950">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="font-bold flex items-center gap-1.5 text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>বাতিলকারী রাইডার: {order.cancelledByRiderName || 'রাইডার'}</span>
                          {order.cancelledByRiderPhone && (
                            <a
                              href={`tel:${order.cancelledByRiderPhone}`}
                              className="text-amber-800 underline font-mono text-[11px]"
                            >
                              ({order.cancelledByRiderPhone})
                            </a>
                          )}
                        </span>
                        {order.riderCancelledAt && (
                          <span className="text-[10px] text-amber-800">
                            {new Date(order.riderCancelledAt).toLocaleString('bn-BD', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-amber-900 pt-1">
                        <strong>বাতিল করার কারণ: </strong>
                        <span className="font-semibold text-rose-900">{order.riderCancelReason || 'কোনো কারণ উল্লেখ করা হয়নি'}</span>
                      </p>
                    </div>

                    {/* Customer Info & Order Items */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-3">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                        <span className="font-bold text-slate-700 block">কাস্টমার তথ্য:</span>
                        <p className="font-bold text-slate-900">{order.customerName}</p>
                        <p className="text-slate-600">ফোন: <span className="font-mono font-semibold">{order.customerPhone}</span></p>
                        <p className="text-slate-600">ঠিকানা: {order.deliveryAddress}</p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                        <span className="font-bold text-slate-700 block">অর্ডারের পণ্যসমূহ ({order.items.length}টি):</span>
                        <div className="max-h-20 overflow-y-auto space-y-1 pr-1">
                          {order.items.map((it) => (
                            <div key={it.productId} className="flex justify-between text-slate-600 text-[11px]">
                              <span>{it.nameBn} x {it.quantity} {it.unit}</span>
                              <span className="font-mono font-semibold">{formatBDT(it.lineTotal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setReassignModalOrder(order);
                        setReassignRiderId('');
                      }}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>অন্য রাইডার অ্যাসাইন করুন</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMarkFakeModalOrder(order);
                        setMarkFakeReasonInput('গ্রাহকের সাথে কথা বলে নিশ্চিত হওয়া গেছে এটি ফেক/অসত্য অর্ডার');
                      }}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>ফেক অর্ডার ঘোষণা করুন</span>
                    </button>

                    {order.cancelledByRiderPhone && (
                      <a
                        href={`tel:${order.cancelledByRiderPhone}`}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-600" />
                        <span>রাইডারের সাথে কথা বলুন</span>
                      </a>
                    )}

                    <a
                      href={`tel:${order.customerPhone}`}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-600" />
                      <span>কাস্টমারকে কল</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setActiveChatOrder(order)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>মেসেজ</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: FAKE ORDERS LIST (ফেক অর্ডার তালিকা) */}
      {activeTab === 'fake_orders' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-2xl bg-rose-100 text-rose-800">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {language === 'bn' ? 'ফেক / প্রতারণামূলক অর্ডার তালিকা' : 'Fake / Fraudulent Orders'}
                </h2>
                <span className="bg-rose-100 text-rose-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {fakeOrders.length} টি
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'bn'
                  ? 'কাস্টমার ভেরিফিকেশনের পর চিহ্নিত অসত্য বা ফেক অর্ডার। এগুলো সাধারণ রিপোর্ট ও ডেলিভারি হিসেব থেকে আলাদা রাখা হয়েছে।'
                  : 'Orders quarantined as fake after verification. Kept separate from valid sales metrics.'}
              </p>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'bn' ? 'ফেক অর্ডার খুঁজুন...' : 'Search fake orders...'}
                value={fakeOrderSearch}
                onChange={(e) => setFakeOrderSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:outline-rose-600"
              />
            </div>
          </div>

          {filteredFakeOrders.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
              {fakeOrderSearch.trim()
                ? 'অনুসন্ধানের সাথে কোনো ফেক অর্ডার মেলেনি।'
                : 'তালিকায় কোনো ফেক অর্ডার নেই।'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredFakeOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl border-2 border-rose-300 p-5 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-black text-slate-900">
                        #{order.id}
                      </span>
                      <span className="bg-rose-100 text-rose-900 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>ফেক অর্ডার</span>
                      </span>
                    </div>
                    <span className="font-mono font-bold text-sm text-slate-500 line-through">
                      মূল্য: {formatBDT(order.totalAmount)}
                    </span>
                  </div>

                  <div className="my-3 p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-950 space-y-1">
                    <p className="font-bold text-rose-900">
                      চিহ্নিত করার কারণ: <span className="font-normal">{order.fakeOrderReason || 'অসত্য অর্ডার'}</span>
                    </p>
                    {order.fakeOrderMarkedAt && (
                      <p className="text-[10px] text-rose-700">
                        তারিখ: {new Date(order.fakeOrderMarkedAt).toLocaleString('bn-BD', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
                    <p>
                      <strong>কাস্টমার:</strong> {order.customerName} (
                      <a href={`tel:${order.customerPhone}`} className="text-emerald-700 font-mono font-bold hover:underline">
                        {order.customerPhone}
                      </a>
                      )
                    </p>
                    <p>
                      <strong>ঠিকানা:</strong> {order.deliveryAddress}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: DEPOSIT REQUESTS (ক্যাশ জমার রিকোয়েস্ট) */}
      {activeTab === 'deposit_requests' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-2xl bg-emerald-100 text-emerald-800">
                  <Banknote className="w-5 h-5" />
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {language === 'bn' ? 'রাইডারদের ক্যাশ জমার রিকোয়েস্ট' : 'Rider Cash Deposit Requests'}
                </h2>
                {pendingDepositRequests.length > 0 && (
                  <span className="bg-rose-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full animate-pulse">
                    {pendingDepositRequests.length} টি নতুন
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'bn'
                  ? 'রাইডার ঢাকা অফিসে টাকা জমা দেওয়ার রিকোয়েস্ট পাঠালে এখানে শো করে। টাকা হাতে বুঝে পেয়ে অনুমোদন দিলে রাইডারের ব্যালেন্স কমে যাবে এবং অফিস মেমো হিস্ট্রিতে সংরক্ষিত হবে।'
                  : 'Rider cash remittances to office. Approving deducts rider balance, logs payment transaction, and generates official memo.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs gap-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setDepositFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    depositFilterStatus === 'all'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  সব ({allDepositRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDepositFilterStatus('pending')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    depositFilterStatus === 'pending'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  অপেক্ষমান ({pendingDepositRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDepositFilterStatus('approved')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    depositFilterStatus === 'approved'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  অনুমোদিত
                </button>
                <button
                  type="button"
                  onClick={() => setDepositFilterStatus('rejected')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    depositFilterStatus === 'rejected'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  প্রত্যাখ্যাত
                </button>
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="রাইডার বা মেমো খুঁজুন..."
                  value={depositSearch}
                  onChange={(e) => setDepositSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:outline-emerald-600"
                />
              </div>
            </div>
          </div>

          {filteredDepositRequests.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
              কোনো জমার রিকোয়েস্ট পাওয়া যায়নি।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDepositRequests.map((req) => {
                const riderCurrentMetrics = getRiderMetrics(req.riderId);

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-3xl p-5 border-2 shadow-xs flex flex-col justify-between ${
                      req.status === 'pending'
                        ? 'border-amber-400 bg-amber-50/20'
                        : req.status === 'approved'
                        ? 'border-emerald-200'
                        : 'border-rose-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 mb-3 flex-wrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-xs font-bold text-slate-700">
                            #{req.id}
                          </span>
                          {req.status === 'pending' && (
                            <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-700 animate-spin" />
                              <span>অপেক্ষমান</span>
                            </span>
                          )}
                          {req.status === 'approved' && (
                            <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCheck className="w-3 h-3 text-emerald-700" />
                              <span>অনুমোদিত</span>
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="bg-rose-100 text-rose-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-rose-700" />
                              <span>প্রত্যাখ্যাত</span>
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">জমার রিকোয়েস্ট</span>
                          <span className="font-mono font-black text-lg text-emerald-800">
                            {formatBDT(req.amount)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-700 mb-3">
                        <p className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{req.riderName}</span>
                          <a
                            href={`tel:${req.riderPhone}`}
                            className="text-emerald-700 font-mono font-bold hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{req.riderPhone}</span>
                          </a>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          বর্তমানে রাইডারের হাতে বকেয়া ক্যাশ: <strong className="font-mono font-bold text-slate-900">{formatBDT(riderCurrentMetrics.cashBalance)}</strong>
                        </p>
                        {req.notes && (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-800">
                            <strong>রাইডার নোট:</strong> {req.notes}
                          </div>
                        )}
                        {req.adminNotes && (
                          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-950">
                            <strong>অফিস মন্তব্য:</strong> {req.adminNotes}
                          </div>
                        )}
                        {req.voucherId && (
                          <p className="text-[11px] text-blue-800 font-mono font-bold">
                            অফিস মেমো নং: {req.voucherId}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400">
                          রিকোয়েস্ট তারিখ: {new Date(req.createdAt).toLocaleString('bn-BD', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setApprovingDeposit(req);
                            setApproveNoteInput('অফিসে নগদ ক্যাশ টাকা বুঝে গ্রহণ করা হয়েছে');
                          }}
                          className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <CheckCheck className="w-4 h-4" />
                          <span>টাকা বুঝে পেয়েছি (অনুমোদন)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingDeposit(req);
                            setRejectNoteInput('টাকা অফিসে জমা পাওয়া যায়নি বা পরিমাপে গরমিল রয়েছে');
                          }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>প্রত্যাখ্যান</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: TRANSACTIONS & MEMOS (সকল পেমেন্ট ও ট্রানজাকশন) */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-2xl bg-emerald-100 text-emerald-800">
                  <Receipt className="w-5 h-5" />
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {language === 'bn' ? 'সকল পেমেন্ট ও রাইডার ট্রানজাকশন লেজার' : 'Payment Ledger & Voucher Memos'}
                </h2>
                <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {allTransactions.length} টি রেকর্ড
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'bn'
                  ? 'ডাটাবেজে সংরক্ষিত প্রতিটি রাইডার ক্যাশ ডিপোজিট, অনুমোদন এবং ব্যালেন্স সমন্বয়ের ভাউচার মেমো'
                  : 'Real-time database ledger of all cash deposit vouchers, approvals, and adjustments'}
              </p>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="মেমো নং, রাইডার বা ফোন খুঁজুন..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:outline-emerald-600"
              />
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
              কোনো ট্রানজাকশন রেকর্ড পাওয়া যায়নি।
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-3 px-4">মেমো / ভাউচার ID</th>
                      <th className="py-3 px-4">তারিখ ও সময়</th>
                      <th className="py-3 px-4">রাইডার বিবরণ</th>
                      <th className="py-3 px-4">ট্রানজাকশন ধরন</th>
                      <th className="py-3 px-4 text-right">পরিমাণ (৳)</th>
                      <th className="py-3 px-4">স্ট্যাটাস</th>
                      <th className="py-3 px-4">অফিস মন্তব্য / মেমো নোট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-black text-slate-900">
                          {tx.id}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-500">
                          {new Date(tx.processedAt || tx.createdAt).toLocaleString('bn-BD', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{tx.riderName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{tx.riderPhone}</span>
                        </td>
                        <td className="py-3 px-4">
                          {tx.type === 'deposit_handover' ? (
                            <span className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                              অফিস ক্যাশ ডিপোজিট
                            </span>
                          ) : (
                            <span className="bg-rose-50 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-md border border-rose-200">
                              ব্যালেন্স সমন্বয়
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-sm">
                          {tx.status === 'approved' ? (
                            <span className="text-emerald-700">+{formatBDT(tx.amount)}</span>
                          ) : (
                            <span className="text-rose-700">৳0 (বাতিল)</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {tx.status === 'approved' ? (
                            <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              অনুমোদিত
                            </span>
                          ) : (
                            <span className="bg-rose-100 text-rose-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              প্রত্যাখ্যাত
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-700">
                          {tx.adminNotes || tx.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: REGISTER RIDER (Multi-Union Checkboxes & Thana Selection) */}
      {showRegisterRiderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">নতুন ডেলিভারি ম্যান রেজিস্টার</h3>
                <p className="text-[11px] text-slate-500">
                  প্রতিটি ইউনিয়নের জন্য এক বা একাধিক রাইডার যুক্ত করুন
                </p>
              </div>
              <button onClick={() => setShowRegisterRiderModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleRiderSubmit} className="space-y-3.5 text-xs overflow-y-auto pr-1 flex-1">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  রাইডারের পূর্ণ নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মোঃ জাহিদ হাসান"
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  মোবাইল নম্বর (লগইন নম্বর) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="017XXXXXXXX"
                  value={riderPhone}
                  onChange={(e) => setRiderPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  পাসওয়ার্ড (লগইন পাসওয়ার্ড) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: 123456"
                  value={riderPassword}
                  onChange={(e) => setRiderPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              {/* Thana Selection */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  নির্ধারিত থানা <span className="text-rose-500">*</span>
                </label>
                <select
                  value={riderThana}
                  onChange={(e) => {
                    const newThana = e.target.value;
                    setRiderThana(newThana);
                    // Update union checklist for new thana
                    const filtered = unions.filter((u) => u.thanaId === newThana);
                    setRiderSelectedUnions(filtered.map((u) => u.id));
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50"
                >
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nameBn} থানা ({m.cityBn})
                    </option>
                  ))}
                </select>
              </div>

              {/* REQUIREMENT: "Admin যদি চায় একাধিক এরিয়া একজন রাইটার কে দিবে তাহলে দিতে পারবে" */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-800 block">
                    নির্ধারিত ইউনিয়নসমূহ নির্বাচন করুন ({riderSelectedUnions.length}টি নির্বাচিত):
                  </label>
                  <div className="space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setRiderSelectedUnions(unionsForRiderThana.map((u) => u.id))}
                      className="text-emerald-700 font-bold hover:underline"
                    >
                      সব সিলেক্ট
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setRiderSelectedUnions([])}
                      className="text-rose-600 font-bold hover:underline"
                    >
                      সব বাতিল
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto">
                  {unionsForRiderThana.map((union) => {
                    const isChecked = riderSelectedUnions.includes(union.id);
                    return (
                      <label
                        key={union.id}
                        className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center space-x-2 text-xs ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRegisterUnion(union.id)}
                          className="rounded text-emerald-700 focus:ring-emerald-600"
                        />
                        <span className="truncate">{union.nameBn}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl shadow-xs transition-colors mt-2"
              >
                ডেলিভারি ম্যান একাউন্ট তৈরি করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT EXISTING RIDER'S UNIONS */}
      {editingRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingRider.name} - এর নির্ধারিত ইউনিয়ন পরিবর্তন
                </h3>
                <p className="text-[11px] text-slate-500">
                  থানা: {editingRider.area === 'kapasia' ? 'কাপাসিয়া' : 'কালীগঞ্জ'}
                </p>
              </div>
              <button onClick={() => setEditingRider(null)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleSaveEditRiderUnions} className="space-y-4 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-700">
                  ইউনিয়নসমূহ ({editRiderUnions.length}টি নির্বাচিত):
                </span>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditRiderUnions(
                        unions
                          .filter((u) => u.thanaId === editingRider.area)
                          .map((u) => u.id)
                      )
                    }
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    সব সিলেক্ট
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setEditRiderUnions([])}
                    className="text-rose-600 font-bold hover:underline"
                  >
                    সব বাতিল
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                {unions
                  .filter((u) => u.thanaId === editingRider.area)
                  .map((union) => {
                    const isChecked = editRiderUnions.includes(union.id);
                    return (
                      <label
                        key={union.id}
                        className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center space-x-2 ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEditUnion(union.id)}
                          className="rounded text-emerald-700"
                        />
                        <span className="truncate">{union.nameBn}</span>
                      </label>
                    );
                  })}
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRider(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD AREA */}
      {showAddAreaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">নতুন ডেলিভারি এরিয়া যুক্ত করুন</h3>
              <button onClick={() => setShowAddAreaModal(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleAreaSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">এরিয়া / থানার নাম (বাংলা)</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: শ্রীপুর বা টঙ্গী"
                  value={areaNameBn}
                  onChange={(e) => setAreaNameBn(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Area Name (English)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sreepur or Tongi"
                  value={areaNameEn}
                  onChange={(e) => setAreaNameEn(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">কভার করা সাব-এলাকা / ইউনিয়নসমূহ (বাংলা)</label>
                <input
                  type="text"
                  placeholder="যেমন: মাওনা চৌরাস্তা, গোসিংগা, বরমী"
                  value={areaCoverageBn}
                  onChange={(e) => setAreaCoverageBn(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">জেলা / সিটি (বাংলা)</label>
                  <input
                    type="text"
                    required
                    value={areaCityBn}
                    onChange={(e) => setAreaCityBn(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ডেলিভারি ব্যাসার্ধ (কি.মি)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={areaRadiusKm}
                    onChange={(e) => setAreaRadiusKm(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl shadow-xs transition-colors mt-2"
              >
                এরিয়া সংরক্ষণ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD PRODUCT */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">নতুন প্রোডাক্ট যোগ করুন (এডমিন)</h3>
                <p className="text-[11px] text-slate-500">৩টি প্রধান ক্যাটাগরি ও সকল এরিয়া সাপোর্ট সহ</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    পণ্যের নাম (বাংলা) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: মিনিকেট চাল"
                    value={prodNameBn}
                    onChange={(e) => setProdNameBn(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Name (English) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Miniket Rice"
                    value={prodNameEn}
                    onChange={(e) => setProdNameEn(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  ক্যাটাগরি নির্বাচন করুন <span className="text-rose-500">*</span>
                </label>
                <select
                  value={prodCategory}
                  onChange={(e) => setProdCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50"
                >
                  <option value="daily_products">১. Daily Products (নিত্যপ্রয়োজনীয় বাজার)</option>
                  <option value="personal_care">২. Personal Care (ব্যক্তিগত যত্ন ও প্রসাধন)</option>
                  <option value="fuel_energy">৩. Fuel & Energy (জ্বালানি ও গ্যাস)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    মূল্য (৳ BDT) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">একক (Unit)</label>
                  <select
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value as ProductUnit)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  >
                    <option value="kg">কেজি (kg)</option>
                    <option value="gm">গ্রাম (gm)</option>
                    <option value="liter">লিটার (liter)</option>
                    <option value="litre">লিটার (litre)</option>
                    <option value="piece">টি / পিস (piece)</option>
                    <option value="pack">প্যাকেট (pack)</option>
                    <option value="bottle">বোতল (bottle)</option>
                    <option value="dozen">ডজন (dozen)</option>
                    <option value="cylinder">সিলিন্ডার (cylinder)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">মজুদ (Stock)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">এরিয়া (Area)</label>
                  <select
                    value={prodArea}
                    onChange={(e) => setProdArea(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50"
                  >
                    <option value="all">🌐 সকল এরিয়া (All Areas)</option>
                    {markets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nameBn} ({m.cityBn})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">ছবির লিংক (Image URL)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={prodImage}
                  onChange={(e) => setProdImage(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-[11px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">বিবরণ (বাংলা)</label>
                  <textarea
                    rows={2}
                    placeholder="প্রোডাক্টের সংক্ষিপ্ত বিবরণ..."
                    value={prodDescBn}
                    onChange={(e) => setProdDescBn(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 resize-none text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Description (English)</label>
                  <textarea
                    rows={2}
                    placeholder="Short product description..."
                    value={prodDescEn}
                    onChange={(e) => setProdDescEn(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 resize-none text-[11px]"
                  />
                </div>
              </div>

              {/* Private Checkbox */}
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">গোপন রাখুন (Private Product)</span>
                  <span className="text-[11px] text-slate-500">
                    চেক করা থাকলে সাধারণ ক্রেতারা এটি দেখতে পাবে না (কেবল এডমিন দেখবে)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={prodIsPrivate}
                  onChange={(e) => setProdIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  প্রোডাক্ট প্রকাশ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PRODUCT */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">প্রোডাক্ট সম্পাদনা করুন (Edit Product)</h3>
                <p className="text-[11px] text-slate-500">ID: {editingProduct.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditProductSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    পণ্যের নাম (বাংলা) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editProdNameBn}
                    onChange={(e) => setEditProdNameBn(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Name (English) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editProdNameEn}
                    onChange={(e) => setEditProdNameEn(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  ক্যাটাগরি <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editProdCategory}
                  onChange={(e) => setEditProdCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50"
                >
                  <option value="daily_products">১. Daily Products (নিত্যপ্রয়োজনীয় বাজার)</option>
                  <option value="personal_care">২. Personal Care (ব্যক্তিগত যত্ন ও প্রসাধন)</option>
                  <option value="fuel_energy">৩. Fuel & Energy (জ্বালানি ও গ্যাস)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    মূল্য (৳ BDT) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editProdPrice}
                    onChange={(e) => setEditProdPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">একক (Unit)</label>
                  <select
                    value={editProdUnit}
                    onChange={(e) => setEditProdUnit(e.target.value as ProductUnit)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  >
                    <option value="kg">কেজি (kg)</option>
                    <option value="gm">গ্রাম (gm)</option>
                    <option value="liter">লিটার (liter)</option>
                    <option value="litre">লিটার (litre)</option>
                    <option value="piece">টি / পিস (piece)</option>
                    <option value="pack">প্যাকেট (pack)</option>
                    <option value="bottle">বোতল (bottle)</option>
                    <option value="dozen">ডজন (dozen)</option>
                    <option value="cylinder">সিলিন্ডার (cylinder)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">মজুদ (Stock)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editProdStock}
                    onChange={(e) => setEditProdStock(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">এরিয়া (Area)</label>
                  <select
                    value={editProdArea}
                    onChange={(e) => setEditProdArea(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50"
                  >
                    <option value="all">🌐 সকল এরিয়া (All Areas)</option>
                    {markets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nameBn} ({m.cityBn})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">ছবির লিংক (Image URL)</label>
                <input
                  type="text"
                  value={editProdImage}
                  onChange={(e) => setEditProdImage(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-[11px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">বিবরণ (বাংলা)</label>
                  <textarea
                    rows={2}
                    value={editProdDescBn}
                    onChange={(e) => setEditProdDescBn(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 resize-none text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Description (English)</label>
                  <textarea
                    rows={2}
                    value={editProdDescEn}
                    onChange={(e) => setEditProdDescEn(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 resize-none text-[11px]"
                  />
                </div>
              </div>

              {/* Private Checkbox */}
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">গোপন রাখুন (Private Product)</span>
                  <span className="text-[11px] text-slate-500">
                    চেক করা থাকলে সাধারণ ক্রেতারা এটি দেখতে পাবে না (শুধু এডমিন দেখবে)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={editProdIsPrivate}
                  onChange={(e) => setEditProdIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  পরিবর্তন সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Settle Rider Balance (Record COD Handover) */}
      {settlingRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">রাইডারের ব্যালেন্স অফিসে জমা গ্রহণ</h3>
                  <p className="text-[11px] text-slate-500">ক্যাশ অন ডেলিভারি (COD) টাকা জমা নেওয়া</p>
                </div>
              </div>
              <button
                onClick={() => setSettlingRider(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (settleAmount <= 0) return;
                setIsSettling(true);
                if (onRecordHandover) {
                  await onRecordHandover(settlingRider.id, settleAmount, settleNotes);
                }
                setIsSettling(false);
                setSettleSuccessMsg(
                  `রাইডার ${settlingRider.name} এর কাছ থেকে ৳${settleAmount} ক্যাশ ব্যালেন্স সফলভাবে অফিসে জমা নেওয়া হয়েছে!`
                );
                setSettlingRider(null);
              }}
              className="space-y-4 text-xs"
            >
              <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200 text-emerald-950">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold">রাইডারের নাম:</span>
                  <span className="font-extrabold">{settlingRider.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">মোবাইল নম্বর:</span>
                  <span className="font-mono font-bold">{settlingRider.phone}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  জমা গ্রহণের পরিমাণ (টাকা / BDT) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    required
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-base font-black text-slate-900 focus:outline-hidden focus:border-emerald-600"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                    ৳ BDT
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  রাইডারের বকেয়া সম্পূর্ণ বা আংশিক জমা নিতে পারেন।
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">জমার বিবরণ / নোট</label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="যেমন: অফিসে নগদ ক্যাশ জমা"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSettling || settleAmount <= 0}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSettling ? 'প্রসেসিং হচ্ছে...' : 'জমা নিশ্চিত করুন'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettlingRider(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
                >
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Temporary Deactivate Rider Confirmation */}
      {deactivatingRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                  <PauseCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">রাইডার সাময়িক ডিঅ্যাক্টিভ করুন</h3>
                  <p className="text-[11px] text-slate-500">ব্যালেন্স অফিসে জমা করার জন্য অ্যাকাউন্ট স্থগিত</p>
                </div>
              </div>
              <button
                onClick={() => setDeactivatingRider(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-amber-950 space-y-1">
                <p className="font-bold text-xs flex items-center gap-1.5 text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <span>রাইডার: {deactivatingRider.name} ({deactivatingRider.phone})</span>
                </p>
                <p className="text-[11px] text-amber-800">
                  বর্তমানে এই রাইডারের কাছে বকেয়া ক্যাশ ব্যালেন্স:{' '}
                  <strong className="text-rose-700 text-xs font-mono font-black">
                    {formatBDT(getRiderMetrics(deactivatingRider.id).cashBalance)}
                  </strong>
                </p>
                <p className="text-[11px] text-slate-600 mt-1">
                  সাময়িক ডিঅ্যাক্টিভ করার পর এই রাইডার নতুন কোনো অর্ডার গ্রহণ করতে পারবেন না যতক্ষণ না এডমিন অ্যাকাউন্টটি পুনরায় সক্রিয় করবেন।
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  ডিঅ্যাক্টিভ করার কারণ / নোটিশ
                </label>
                <textarea
                  rows={2}
                  value={deactivateReasonInput}
                  onChange={(e) => setDeactivateReasonInput(e.target.value)}
                  placeholder="যেমন: অফিসে ব্যালেন্স জমা করার জন্য সাময়িক ডিঅ্যাক্টিভ"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onToggleRiderActive) {
                      onToggleRiderActive(deactivatingRider.id, false, deactivateReasonInput);
                      setSettleSuccessMsg(
                        `রাইডার ${deactivatingRider.name} কে সাময়িকভাবে ডিঅ্যাক্টিভ করা হয়েছে।`
                      );
                    }
                    setDeactivatingRider(null);
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-colors"
                >
                  <PauseCircle className="w-4 h-4" />
                  <span>ডিঅ্যাক্টিভ নিশ্চিত করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeactivatingRider(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
                >
                  বাতিল
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View Rider Deliveries History */}
      {viewingRiderDeliveries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {viewingRiderDeliveries.name} - এর ডেলিভারি রেকর্ড
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    মোবাইল: <span className="font-mono">{viewingRiderDeliveries.phone}</span> • থানা:{' '}
                    {viewingRiderDeliveries.area === 'kapasia' ? 'কাপাসিয়া' : 'কালীগঞ্জ'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingRiderDeliveries(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics of this Rider */}
            {(() => {
              const rMetrics = getRiderMetrics(viewingRiderDeliveries.id);
              const riderOrders = orders.filter((o) => o.riderId === viewingRiderDeliveries.id);

              return (
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block">মোট ডেলিভারি</span>
                      <span className="text-base font-black text-emerald-800">{rMetrics.deliveredCount} টি</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">পেন্ডিং ডেলিভারি</span>
                      <span className="text-base font-black text-amber-700">{rMetrics.pendingCount} টি</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">ক্যাশ ব্যালেন্স (বকেয়া)</span>
                      <span className="text-base font-black text-rose-700 font-mono">
                        {formatBDT(rMetrics.cashBalance)}
                      </span>
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-800 text-xs">অর্ডার তালিকা ({riderOrders.length} টি)</h4>

                  {riderOrders.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 border border-dashed rounded-2xl">
                      এই রাইডারের এখনো কোনো অর্ডার রেকর্ড নেই।
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {riderOrders.map((o, idx) => (
                        <div
                          key={`${o.id}-${idx}`}
                          className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-slate-900">#{o.id}</span>
                              <StatusBadge status={o.orderStatus} size="sm" />
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  o.paymentStatus === 'collected'
                                    ? 'bg-rose-100 text-rose-800'
                                    : o.paymentStatus === 'deposited'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {o.paymentStatus === 'collected'
                                  ? 'ক্যাশ রাইডারের কাছে'
                                  : o.paymentStatus === 'deposited'
                                  ? 'অফিসে জমা হয়েছে'
                                  : 'পেমেন্ট অপেক্ষমান'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1">
                              <strong>গ্রাহক:</strong> {o.customerName} ({o.customerPhone}) •{' '}
                              <span>{o.deliveryAddress}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(o.createdAt).toLocaleString('bn-BD', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-slate-900 block">
                              {formatBDT(o.totalAmount)}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold block">
                              COD ক্যাশ
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: REASSIGN RIDER (রাইডার পরিবর্তন / নতুন রাইডার অ্যাসাইন) */}
      {reassignModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">নতুন রাইডার অ্যাসাইন করুন</h3>
                <p className="text-[11px] text-slate-500 font-mono">অর্ডার: #{reassignModalOrder.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setReassignModalOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <p className="text-slate-700">
                  <strong>গ্রাহক:</strong> {reassignModalOrder.customerName} ({reassignModalOrder.customerPhone})
                </p>
                <p className="text-slate-600">
                  <strong>ঠিকানা:</strong> {reassignModalOrder.deliveryAddress}
                </p>
                <p className="text-slate-600">
                  <strong>এরিয়া/ইউনিয়ন:</strong> {reassignModalOrder.unionNameBn || reassignModalOrder.thanaNameBn || '—'}
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  কোন রাইডারকে অ্যাসাইন করবেন? <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reassignRiderId}
                  onChange={(e) => setReassignRiderId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-white"
                >
                  <option value="">-- রাইডার নির্বাচন করুন --</option>
                  {registeredRiders.map((r) => (
                    <option key={r.id} value={r.id} disabled={r.isActive === false}>
                      {r.name} ({r.phone}) {r.area === 'kapasia' ? '• কাপাসিয়া' : '• কালীগঞ্জ'} {r.isActive === false ? '• [ডিঅ্যাক্টিভ]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={!reassignRiderId}
                  onClick={async () => {
                    if (!reassignRiderId || !reassignModalOrder) return;
                    await onAssignRider(reassignModalOrder.id, reassignRiderId);
                    setReassignModalOrder(null);
                    setReassignRiderId('');
                  }}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  অ্যাসাইন নিশ্চিত করুন
                </button>
                <button
                  type="button"
                  onClick={() => setReassignModalOrder(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MARK AS FAKE ORDER (ফেক অর্ডার নিশ্চিতকরণ) */}
      {markFakeModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">ফেক অর্ডার হিসেবে চিহ্নিত করুন</h3>
                <p className="text-[11px] text-slate-500 font-mono">অর্ডার: #{markFakeModalOrder.id}</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-rose-950 space-y-1">
                <p className="font-bold">⚠️ সতর্কতা:</p>
                <p className="text-[11px]">
                  এই অর্ডারটিকে ফেক অর্ডার হিসেবে চিহ্নিত করলে এটি সাধারণ অর্ডার ও রাইডার পুল থেকে সরিয়ে <strong>'ফেক অর্ডার তালিকা'</strong>-তে রাখা হবে।
                </p>
                <p className="text-[11px] pt-1">
                  <strong>গ্রাহক:</strong> {markFakeModalOrder.customerName} ({markFakeModalOrder.customerPhone})
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  ফেক অর্ডার হিসেবে চিহ্নিত করার কারণ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={markFakeReasonInput}
                  onChange={(e) => setMarkFakeReasonInput(e.target.value)}
                  placeholder="যেমন: গ্রাহক ফোন রিসিভ করেনি এবং ঠিকানা অস্তিত্বহীন..."
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={!markFakeReasonInput.trim()}
                  onClick={async () => {
                    if (onMarkFakeOrder && markFakeModalOrder) {
                      await onMarkFakeOrder(markFakeModalOrder.id, markFakeReasonInput.trim());
                    }
                    setMarkFakeModalOrder(null);
                  }}
                  className="flex-1 bg-rose-700 hover:bg-rose-800 text-white font-bold py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                >
                  ফেক ঘোষণা নিশ্চিত করুন
                </button>
                <button
                  type="button"
                  onClick={() => setMarkFakeModalOrder(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: APPROVE DEPOSIT REQUEST (টাকা বুঝে পেয়ে অনুমোদন) */}
      {approvingDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <CheckCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">ক্যাশ জমার রিকোয়েস্ট অনুমোদন</h3>
                <p className="text-[11px] text-slate-500 font-mono">আইডি: #{approvingDeposit.id}</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">রাইডার:</span>
                  <span className="font-bold text-slate-900">{approvingDeposit.riderName} ({approvingDeposit.riderPhone})</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-emerald-200/60">
                  <span className="text-slate-600 font-medium">জমার পরিমাণ:</span>
                  <span className="font-mono font-black text-emerald-900 text-base">{formatBDT(approvingDeposit.amount)}</span>
                </div>
                {approvingDeposit.notes && (
                  <p className="text-[11px] text-slate-600 pt-1">
                    <strong>রাইডার নোট:</strong> {approvingDeposit.notes}
                  </p>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  অফিস অনুমোদন মন্তব্য / মেমো নোট
                </label>
                <input
                  type="text"
                  value={approveNoteInput}
                  onChange={(e) => setApproveNoteInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                ✅ অনুমোদন বাটনে ক্লিক করার সাথে সাথে ডাটাবেজ আপডেট হবে, রাইডারের একাউন্ট ব্যালেন্স কমে যাবে এবং মেমো ভাউচার তৈরি হবে।
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (onApproveDeposit && approvingDeposit) {
                      await onApproveDeposit(approvingDeposit.id, approveNoteInput);
                    }
                    setApprovingDeposit(null);
                  }}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  অনুমোদন ও মেমো ইস্যু করুন
                </button>
                <button
                  type="button"
                  onClick={() => setApprovingDeposit(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REJECT DEPOSIT REQUEST (টাকা না পেলে প্রত্যাখ্যান) */}
      {rejectingDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">জমার রিকোয়েস্ট প্রত্যাখ্যান করুন</h3>
                <p className="text-[11px] text-slate-500 font-mono">আইডি: #{rejectingDeposit.id}</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">রাইডার:</span>
                  <span className="font-bold text-slate-900">{rejectingDeposit.riderName} ({rejectingDeposit.riderPhone})</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-rose-200/60">
                  <span className="text-slate-600 font-medium">দাবিকৃত পরিমাণ:</span>
                  <span className="font-mono font-bold text-rose-900">{formatBDT(rejectingDeposit.amount)}</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  প্রত্যাখ্যানের সুনির্দিষ্ট কারণ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={rejectNoteInput}
                  onChange={(e) => setRejectNoteInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <p className="text-[11px] text-rose-700">
                ⚠️ এই রিকোয়েস্টটি প্রত্যাখ্যান করলে রাইডারের বকেয়া ক্যাশ ব্যালেন্স হ্রাস পাবে না এবং রাইডার ড্যাশবোর্ডে কারণটি দেখা যাবে।
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={!rejectNoteInput.trim()}
                  onClick={async () => {
                    if (onRejectDeposit && rejectingDeposit) {
                      await onRejectDeposit(rejectingDeposit.id, rejectNoteInput.trim());
                    }
                    setRejectingDeposit(null);
                  }}
                  className="flex-1 bg-rose-700 hover:bg-rose-800 text-white font-bold py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                >
                  প্রত্যাখ্যান নিশ্চিত করুন
                </button>
                <button
                  type="button"
                  onClick={() => setRejectingDeposit(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Order Chat Modal for Admin */}
      {activeChatOrder && (
        <OrderChatModal
          order={orders.find((o) => o.id === activeChatOrder.id) || activeChatOrder}
          currentUserRole="admin"
          currentUserName="সুপার এডমিন"
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
