import React, { useState } from 'react';
import {
  Order,
  Product,
  DeliveryRiderAccount,
  Market,
  Category,
  ProductUnit,
  UnionArea,
} from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { StatusBadge } from '../common/StatusBadge';
import { OrderChatModal } from '../common/OrderChatModal';
import { OrderNoteSection } from '../common/OrderNoteSection';
import { SEED_UNIONS } from '../../data/seedData';
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
} from 'lucide-react';

interface AdminDashboardProps {
  orders: Order[];
  products: Product[];
  markets: Market[];
  categories: Category[];
  registeredRiders: DeliveryRiderAccount[];
  unions?: UnionArea[];
  onAddProduct: (prod: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteProduct: (prodId: string) => void;
  onAddMarket: (market: Omit<Market, 'id'>) => void;
  onDeleteMarket: (marketId: string) => void;
  onRegisterRider: (rider: Omit<DeliveryRiderAccount, 'id' | 'createdAt'>) => void;
  onAssignRider: (orderId: string, riderId: string) => Promise<void>;
  onUpdateRiderUnions?: (riderId: string, assignedUnionIds: string[]) => void;
  onToggleRiderActive?: (riderId: string, isActive: boolean, reason?: string) => Promise<void> | void;
  onRecordHandover?: (riderId: string, amount: number, notes?: string) => Promise<void> | void;
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
  onAddProduct,
  onDeleteProduct,
  onAddMarket,
  onDeleteMarket,
  onRegisterRider,
  onAssignRider,
  onUpdateRiderUnions,
  onToggleRiderActive,
  onRecordHandover,
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

  const [activeTab, setActiveTab] = useState<'new_orders' | 'all_orders' | 'rider_balances' | 'products' | 'areas' | 'riders'>('new_orders');

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
  const [prodCategory, setProdCategory] = useState<string>('groceries');
  const [prodArea, setProdArea] = useState<string>(markets[0]?.id || 'kaliganj');
  const [prodImage, setProdImage] = useState<string>(
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80'
  );

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

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNameBn.trim() || !prodNameEn.trim()) return;

    onAddProduct({
      shopId: 'admin-store',
      marketId: prodArea,
      categoryId: prodCategory,
      nameEn: prodNameEn,
      nameBn: prodNameBn,
      price: Number(prodPrice),
      unit: prodUnit,
      stock: Number(prodStock),
      isAvailable: Number(prodStock) > 0,
      imageUrl: prodImage,
    });

    setShowAddProductModal(false);
    setProdNameBn('');
    setProdNameEn('');
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

    const newRiderPayload = {
      name: riderName.trim(),
      phone: riderPhone.trim(),
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
            <h1 className="text-xl font-bold">এডমিন কন্ট্রোল প্যানেল (Admin Panel)</h1>
            <p className="text-xs text-slate-300 mt-0.5">
              গাজীপুর (কালীগঞ্জ ও কাপাসিয়া) এরিয়া, ইউনিয়নভিত্তিক রাইডার ম্যানেজমেন্ট ও অর্ডার ডিস্ট্রিবিউশন
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
            <span>নতুন রাইডার রেজিস্টার</span>
          </button>
          <button
            onClick={() => setShowAddProductModal(true)}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold py-2 px-3 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>পণ্য যোগ করুন</span>
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold py-2 px-3 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-colors"
              title="এডমিন প্যানেল থেকে লগআউট করুন"
            >
              <LogOut className="w-4 h-4" />
              <span>লগআউট</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 mb-6">
        <button
          onClick={() => setActiveTab('new_orders')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'new_orders'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>নতুন Order ({newOrders.length})</span>
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
          <span>ALL order ({orders.length})</span>
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
          <span>রাইডার ব্যালেন্স ও রিপোর্ট ({registeredRiders.length})</span>
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
          <span>রাইডার ম্যানেজমেন্ট ({registeredRiders.length})</span>
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
          <span>এরিয়া ও ইউনিয়ন ({markets.length} থানা / {unions.length} ইউনিয়ন)</span>
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
          <span>প্রোডাক্ট ক্যাটালগ ({products.length})</span>
        </button>
      </div>

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
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                এডমিন প্রোডাক্ট তালিকা ({products.length} টি)
              </h2>
              <p className="text-xs text-slate-500">
                দোকানদার কোনো কিছু এড করতে পারে না; এডমিন যা এড করে তাই শুধু ওয়েবসাইটে দেখায়।
              </p>
            </div>
            <button
              onClick={() => setShowAddProductModal(true)}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold py-2 px-3.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন প্রোডাক্ট যোগ করুন</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold bg-slate-50">
                  <th className="py-2.5 px-3">ছবি</th>
                  <th className="py-2.5 px-3">নাম (বাংলা)</th>
                  <th className="py-2.5 px-3">ক্যাটাগরি</th>
                  <th className="py-2.5 px-3">মূল্য</th>
                  <th className="py-2.5 px-3">মজুদ</th>
                  <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3">
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="w-10 h-10 object-cover rounded-xl border border-slate-200"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{p.nameBn}</td>
                    <td className="py-2.5 px-3 text-slate-500">{p.categoryId}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-800">
                      {formatBDT(p.price)} / {p.unit}
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{p.stock} {p.unit}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onDeleteProduct(p.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50"
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">নতুন প্রোডাক্ট যোগ করুন (এডমিন)</h3>
              <button onClick={() => setShowAddProductModal(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">পণ্যের নাম (বাংলা)</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: দেশি পাকা কলা"
                  value={prodNameBn}
                  onChange={(e) => setProdNameBn(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Name (English)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fresh Ripe Banana"
                  value={prodNameEn}
                  onChange={(e) => setProdNameEn(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">মূল্য (৳ BDT)</label>
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
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  >
                    <option value="kg">কেজি (kg)</option>
                    <option value="gm">গ্রাম (gm)</option>
                    <option value="litre">লিটার (litre)</option>
                    <option value="piece">টি / পিস (piece)</option>
                    <option value="dozen">ডজন (dozen)</option>
                    <option value="pack">প্যাকেট (pack)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">মজুদ (Stock)</label>
                  <input
                    type="number"
                    min="1"
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
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  >
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
                  value={prodImage}
                  onChange={(e) => setProdImage(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl shadow-xs transition-colors"
              >
                প্রোডাক্ট প্রকাশ করুন
              </button>
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
