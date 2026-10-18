import React, { useState } from 'react';
import {
  Order,
  Product,
  DeliveryRiderAccount,
  Market,
  Category,
  ProductUnit,
} from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { StatusBadge } from '../common/StatusBadge';
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
} from 'lucide-react';

interface AdminDashboardProps {
  orders: Order[];
  products: Product[];
  markets: Market[];
  categories: Category[];
  registeredRiders: DeliveryRiderAccount[];
  onAddProduct: (prod: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteProduct: (prodId: string) => void;
  onAddMarket: (market: Omit<Market, 'id'>) => void;
  onDeleteMarket: (marketId: string) => void;
  onRegisterRider: (rider: Omit<DeliveryRiderAccount, 'id' | 'createdAt'>) => void;
  onAssignRider: (orderId: string, riderId: string) => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  orders,
  products,
  markets,
  categories,
  registeredRiders,
  onAddProduct,
  onDeleteProduct,
  onAddMarket,
  onDeleteMarket,
  onRegisterRider,
  onAssignRider,
}) => {
  const { language, formatBDT } = useLanguage();
  const [activeTab, setActiveTab] = useState<'new_orders' | 'all_orders' | 'products' | 'areas' | 'riders'>('new_orders');

  // Search & Filter in all orders
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
  const [riderArea, setRiderArea] = useState<string>(markets[0]?.id || 'kaliganj');

  // New Orders (Pending assignment or unaccepted)
  const newOrders = orders.filter(
    (o) =>
      ['pending_shop_confirmation', 'shop_confirmed'].includes(o.orderStatus) ||
      !o.riderId
  );

  // Filtered All Orders
  const filteredOrders = orders.filter((o) => {
    const matchStatus = statusFilter === 'all' || o.orderStatus === statusFilter;
    const matchSearch =
      o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerPhone.includes(orderSearch) ||
      (o.riderName && o.riderName.toLowerCase().includes(orderSearch.toLowerCase()));
    return matchStatus && matchSearch;
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
      lat: 24.0, // Default central Gazipur coordinate
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

    onRegisterRider({
      name: riderName,
      phone: riderPhone,
      password: riderPassword,
      area: riderArea,
      isOnline: true,
      isActive: true,
    });

    setShowRegisterRiderModal(false);
    setRiderName('');
    setRiderPhone('');
    setRiderPassword('123');
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
              গাজীপুর (কালীগঞ্জ ও কাপাসিয়া) এরিয়া, প্রোডাক্ট ও রাইডার অপারেশনস
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddAreaModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <Building className="w-4 h-4" />
            <span>নতুন এরিয়া যুক্ত করুন</span>
          </button>
          <button
            onClick={() => setShowRegisterRiderModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <Bike className="w-4 h-4" />
            <span>রাইডার রেজিস্টার</span>
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
          onClick={() => setActiveTab('areas')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'areas'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>এরিয়া সমূহ ({markets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'products'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>পণ্য তালিকা ({products.length})</span>
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
          <span>রাইডার তালিকা ({registeredRiders.length})</span>
        </button>
      </div>

      {/* TAB 1: NEW ORDERS */}
      {activeTab === 'new_orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              নতুন গ্রাহক অর্ডার (রাইডার অ্যাসাইন ও এক্সেপ্ট স্ট্যাটাস)
            </h2>
          </div>

          {newOrders.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              এই মুহূর্তে কোনো নতুন অপেক্ষমান অর্ডার নেই।
            </div>
          ) : (
            <div className="space-y-3">
              {newOrders.map((order) => {
                const isAccepted = !!order.riderId;

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center space-x-2 mb-1.5">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          #{order.id}
                        </span>
                        <StatusBadge status={order.orderStatus} size="sm" />
                        <span className="text-xs font-extrabold text-emerald-800">
                          {formatBDT(order.totalAmount)} (COD)
                        </span>
                      </div>

                      <p className="text-xs text-slate-800 font-semibold">
                        গ্রাহক: {order.customerName} ({order.customerPhone})
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{order.deliveryAddress} ({order.roadDistanceKm} কি.মি)</span>
                      </p>

                      <div className="mt-2 text-[11px] text-slate-500">
                        আইটেম: {order.items.map((i) => i.nameBn).join(', ')}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shrink-0 min-w-[240px]">
                      {isAccepted ? (
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1 w-max">
                            <CheckCircle className="w-3 h-3" />
                            <span>রাইডার এক্সেপ্ট করেছেন</span>
                          </span>
                          <p className="text-xs font-bold text-slate-900 mt-1">
                            {order.riderName || 'অ্যাসাইনড রাইডার'}
                          </p>
                          {order.riderPhone && (
                            <p className="text-[11px] text-slate-500 font-mono">
                              ফোন: {order.riderPhone}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-amber-800 font-bold block">
                            রাইডার নিয়োগ করুন (Assign Rider):
                          </span>
                          <select
                            onChange={(e) => {
                              if (e.target.value) onAssignRider(order.id, e.target.value);
                            }}
                            defaultValue=""
                            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="" disabled>অনলাইন রাইডার বেছে নিন...</option>
                            {registeredRiders.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name} ({r.phone}) {r.isOnline ? '🟢' : '🔴'}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL ORDERS */}
      {activeTab === 'all_orders' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-bold text-slate-800">
              সকল অর্ডারের হিস্ট্রি ও স্ট্যাটাস ({filteredOrders.length})
            </h2>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="অর্ডার আইডি বা ফোন..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-44 focus:outline-hidden"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1.5 px-2.5 rounded-xl border border-slate-200 text-xs bg-white"
              >
                <option value="all">সব স্ট্যাটাস</option>
                <option value="pending_shop_confirmation">নতুন অর্ডার</option>
                <option value="rider_assigned">রাইডার এসাইন</option>
                <option value="picked_up">সংগৃহীত</option>
                <option value="out_for_delivery">ডেলিভারিতে বের</option>
                <option value="delivered">ডেলিভার্ড</option>
                <option value="cancelled">বাতিল</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">অর্ডার #</th>
                  <th className="py-2.5 px-3">গ্রাহক</th>
                  <th className="py-2.5 px-3">ঠিকানা</th>
                  <th className="py-2.5 px-3">স্ট্যাটাস</th>
                  <th className="py-2.5 px-3">রাইডার</th>
                  <th className="py-2.5 px-3 text-right">মূল্য (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      #{o.id}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold block">{o.customerName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{o.customerPhone}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                      {o.deliveryAddress}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DYNAMIC AREA MANAGEMENT (Kaliganj, Kapasia, etc.) */}
      {activeTab === 'areas' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                অনুমোদিত ডেলিভারি এরিয়া তালিকা (এডমিন পরিচালিত)
              </h2>
              <p className="text-xs text-slate-500">
                এডমিন এখানে যে এরিয়া যোগ করবে, কাস্টমার অ্যাপে ঠিক সেই এরিয়াগুলো প্রদর্শিত হবে।
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
            {markets.map((market) => (
              <div
                key={market.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">
                          {market.nameBn} ({market.nameEn})
                        </h3>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          জেলা/শহর: {market.cityBn} ({market.cityEn})
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      সক্রিয়
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 bg-white p-2.5 rounded-xl border border-slate-100">
                    <strong className="text-slate-700 block mb-0.5">কভারেজ এলাকা/ইউনিয়ন:</strong>
                    <span>{market.areaBn}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 mt-3 text-xs">
                  <span className="text-emerald-700 font-semibold">
                    ব্যাসার্ধ: {market.radiusKm} কি.মি
                  </span>

                  {markets.length > 1 && (
                    <button
                      onClick={() => onDeleteMarket(market.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                      title="এরিয়া মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PRODUCTS MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              এডমিন পণ্য সম্ভার ({products.length} টি পণ্য)
            </h2>
            <button
              onClick={() => setShowAddProductModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন প্রোডাক্ট যোগ করুন</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {products.map((p) => {
              const assignedArea = markets.find((m) => m.id === p.marketId);
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="h-28 rounded-xl bg-slate-100 overflow-hidden mb-2">
                      <img src={p.imageUrl} alt={p.nameEn} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold">
                      {assignedArea ? assignedArea.nameBn : p.marketId}
                    </span>
                    <h3 className="font-bold text-xs text-slate-900 mt-1 truncate">
                      {p.nameBn}
                    </h3>
                    <p className="text-xs text-emerald-800 font-extrabold mt-0.5">
                      {formatBDT(p.price)} / {p.unit}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">মজুদ: {p.stock}</span>
                    <button
                      onClick={() => onDeleteProduct(p.id)}
                      className="text-slate-300 hover:text-rose-600 p-1"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: REGISTERED RIDERS */}
      {activeTab === 'riders' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                রেজিস্টার্ড ডেলিভারি ম্যান তালিকা
              </h2>
            </div>
            <button
              onClick={() => setShowRegisterRiderModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন রাইডার রেজিস্টার</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {registeredRiders.map((r) => {
              const riderMarket = markets.find((m) => m.id === r.area);
              return (
                <div key={r.id} className="py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{r.name}</h4>
                      <p className="text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-emerald-800 font-semibold">{r.phone}</span>
                        <span>• পাসওয়ার্ড: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{r.password || '123'}</span></span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700">
                      এরিয়া: {riderMarket ? riderMarket.nameBn : r.area}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        r.isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {r.isOnline ? '🟢 অনলাইন' : '🔴 অফলাইন'}
                    </span>
                  </div>
                </div>
              );
            })}
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

      {/* MODAL: REGISTER RIDER */}
      {showRegisterRiderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">নতুন ডেলিভারি ম্যান রেজিস্টার</h3>
              <button onClick={() => setShowRegisterRiderModal(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleRiderSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">রাইডারের পূর্ণ নাম</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মোঃ জাহিদ হাসান"
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">মোবাইল নম্বর (লগইন আইডি হিসেবে ব্যবহৃত হবে)</label>
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
                <label className="font-semibold text-slate-700 block mb-1">পাসওয়ার্ড (লগইন পাসওয়ার্ড)</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: 123456"
                  value={riderPassword}
                  onChange={(e) => setRiderPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">নির্ধারিত এরিয়া</label>
                <select
                  value={riderArea}
                  onChange={(e) => setRiderArea(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                >
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nameBn} ({m.cityBn})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl shadow-xs transition-colors"
              >
                ডেলিভারি ম্যান একাউন্ট তৈরি করুন
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
