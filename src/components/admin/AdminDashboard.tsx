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
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  orders,
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
}) => {
  const { language, formatBDT } = useLanguage();
  const [activeTab, setActiveTab] = useState<'new_orders' | 'all_orders' | 'products' | 'areas' | 'riders'>('new_orders');

  // Search & Filter in all orders
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [thanaFilter, setThanaFilter] = useState<string>('all');
  const [unionFilter, setUnionFilter] = useState<string>('all');

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

  // New Orders (Pending assignment or unaccepted)
  const newOrders = orders.filter(
    (o) =>
      ['pending_shop_confirmation', 'shop_confirmed'].includes(o.orderStatus) ||
      !o.riderId
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
              {newOrders.map((order) => {
                // Filter riders that cover this order's union or thana
                const matchingRiders = registeredRiders.filter((r) => {
                  if (order.unionId && r.assignedUnionIds?.length > 0) {
                    return r.assignedUnionIds.includes(order.unionId);
                  }
                  return r.area === order.marketId || r.thanaId === order.thanaId;
                });

                return (
                  <div
                    key={order.id}
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
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
                  <th className="py-2.5 px-3 text-right">মূল্য (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                      কোনো অর্ডার পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
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
                      </div>
                    </div>

                    {/* Edit Unions button */}
                    <div className="flex items-center space-x-2 self-start md:self-auto">
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
    </div>
  );
};
