import React, { useState } from 'react';
import { Shop, Product, Order, ProductUnit } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { StatusBadge } from '../common/StatusBadge';
import {
  Store,
  Package,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Percent,
  Banknote,
  Edit2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Phone,
  MapPin,
} from 'lucide-react';

interface ShopkeeperDashboardProps {
  shop: Shop;
  products: Product[];
  orders: Order[];
  onUpdateProduct: (product: Product) => void;
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onTransitionOrder: (orderId: string, targetStatus: any, reason?: string) => Promise<void>;
  onToggleShopOpen: (shopId: string, isOpen: boolean) => void;
}

export const ShopkeeperDashboard: React.FC<ShopkeeperDashboardProps> = ({
  shop,
  products,
  orders,
  onUpdateProduct,
  onAddProduct,
  onTransitionOrder,
  onToggleShopOpen,
}) => {
  const { language, t, formatBDT } = useLanguage();
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'finance'>('orders');

  // Order Rejection Modal State
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // New Product Modal State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProdNameEn, setNewProdNameEn] = useState('');
  const [newProdNameBn, setNewProdNameBn] = useState('');
  const [newProdPrice, setNewProdPrice] = useState<number>(100);
  const [newProdUnit, setNewProdUnit] = useState<ProductUnit>('kg');
  const [newProdStock, setNewProdStock] = useState<number>(20);
  const [newProdCategory, setNewProdCategory] = useState('groceries');
  const [newProdImage, setNewProdImage] = useState('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80');

  // Filter orders for this shop
  const shopOrders = orders.filter((o) => o.shopId === shop.id);
  const pendingOrders = shopOrders.filter((o) => o.orderStatus === 'pending_shop_confirmation');
  const activeOrders = shopOrders.filter((o) =>
    ['shop_confirmed', 'rider_assigned', 'picked_up', 'out_for_delivery'].includes(o.orderStatus)
  );
  const completedOrders = shopOrders.filter((o) => o.orderStatus === 'delivered');

  // Financial Calculations
  const grossMerchandiseSales = completedOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const platformCommissionRate = shop.commissionRate || 0.05;
  const platformCommission = Math.round(grossMerchandiseSales * platformCommissionRate);
  const netShopPayable = grossMerchandiseSales - platformCommission;

  const handleAcceptOrder = async (orderId: string) => {
    setIsProcessing(true);
    await onTransitionOrder(orderId, 'shop_confirmed');
    setIsProcessing(false);
  };

  const handleConfirmReject = async () => {
    if (!rejectOrderId || !rejectionReason.trim()) return;
    setIsProcessing(true);
    await onTransitionOrder(rejectOrderId, 'shop_rejected', rejectionReason);
    setIsProcessing(false);
    setRejectOrderId(null);
    setRejectionReason('');
  };

  const handleCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdNameEn || !newProdNameBn) return;

    onAddProduct({
      shopId: shop.id,
      marketId: shop.marketId,
      categoryId: newProdCategory,
      nameEn: newProdNameEn,
      nameBn: newProdNameBn,
      price: Number(newProdPrice),
      unit: newProdUnit,
      stock: Number(newProdStock),
      isAvailable: Number(newProdStock) > 0,
      imageUrl: newProdImage,
    });

    setShowAddProductModal(false);
    setNewProdNameEn('');
    setNewProdNameBn('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Shop Profile Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 overflow-hidden shrink-0 border border-emerald-200">
            <img
              src={shop.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80'}
              alt={shop.nameEn}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900">
                {language === 'bn' ? shop.nameBn : shop.nameEn}
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                অনুমোদিত বিক্রেতা
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'bn' ? shop.addressBn : shop.addressEn}</span>
              <span className="mx-1">•</span>
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>{shop.phone}</span>
            </p>
          </div>
        </div>

        {/* Shop Availability Toggle */}
        <div className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-700">দোকান খোলা/বন্ধ:</span>
          <button
            onClick={() => onToggleShopOpen(shop.id, !shop.isOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              shop.isOpen
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-rose-600 text-white shadow-xs'
            }`}
          >
            {shop.isOpen ? 'খোলা (অর্ডার নেওয়া হচ্ছে)' : 'বন্ধ (অর্ডার স্থগিত)'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 mb-6 pb-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'orders'
              ? 'bg-emerald-700 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{t('incomingOrders')}</span>
          {pendingOrders.length > 0 && (
            <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
              {pendingOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'inventory'
              ? 'bg-emerald-700 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>{t('myProducts')} ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('finance')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'finance'
              ? 'bg-emerald-700 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>হিসাব ও নিষ্পত্তি</span>
        </button>
      </div>

      {/* TAB 1: ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Pending Confirmation Orders */}
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span>নতুন অর্ডার (অনুমোদন প্রয়োজন)</span>
            </h2>

            {pendingOrders.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                কোনো নতুন পেন্ডিং অর্ডার নেই। নতুন অর্ডার এলে এখানে দেখতে পাবেন।
              </div>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border-2 border-amber-300 p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-700">
                          #{order.id}
                        </span>
                        <span className="ml-2 text-xs text-slate-500">
                          গ্রাহক: {order.customerName} ({order.customerPhone})
                        </span>
                      </div>
                      <span className="text-base font-extrabold text-emerald-800">
                        {formatBDT(order.subtotal)}
                      </span>
                    </div>

                    {/* Items list */}
                    <div className="py-3 space-y-1.5 text-xs text-slate-700">
                      {order.items.map((i) => (
                        <div key={i.productId} className="flex justify-between">
                          <span>
                            {language === 'bn' ? i.nameBn : i.nameEn} x {i.quantity} {i.unit}
                          </span>
                          <span className="font-semibold">{formatBDT(i.lineTotal)}</span>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mb-3">
                        নির্দেশনা: {order.notes}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleAcceptOrder(order.id)}
                        disabled={isProcessing}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{t('acceptOrder')}</span>
                      </button>

                      <button
                        onClick={() => setRejectOrderId(order.id)}
                        disabled={isProcessing}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>{t('rejectOrder')}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Orders */}
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3">
              চলমান অর্ডারসমূহ ({activeOrders.length})
            </h2>
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-700 mr-2">
                      #{order.id}
                    </span>
                    <StatusBadge status={order.orderStatus} size="sm" />
                    <p className="text-slate-500 mt-1">
                      গ্রাহক: {order.customerName} • {order.items.length} আইটেম
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-900 text-sm">
                      {formatBDT(order.subtotal)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      রাইডার: {order.riderId ? 'নিযুক্ত' : 'অপেক্ষমান'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY */}
      {activeTab === 'inventory' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-slate-900">
              পণ্যের মজুদ ও দরদাম ({products.length})
            </h2>
            <button
              onClick={() => setShowAddProductModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('addProduct')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="h-28 rounded-xl bg-slate-100 overflow-hidden mb-2">
                    <img src={p.imageUrl} alt={p.nameEn} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-bold text-xs text-slate-900 truncate">
                    {language === 'bn' ? p.nameBn : p.nameEn}
                  </h3>
                  <p className="text-[11px] text-emerald-800 font-extrabold mt-0.5">
                    {formatBDT(p.price)} / {p.unit}
                  </p>
                </div>

                {/* Stock Controls */}
                <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">মজুদ:</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() =>
                        onUpdateProduct({
                          ...p,
                          stock: Math.max(0, p.stock - 5),
                          isAvailable: p.stock - 5 > 0,
                        })
                      }
                      className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 hover:bg-slate-200"
                    >
                      -5
                    </button>
                    <span className="w-8 text-center font-bold">{p.stock}</span>
                    <button
                      onClick={() =>
                        onUpdateProduct({
                          ...p,
                          stock: p.stock + 5,
                          isAvailable: true,
                        })
                      }
                      className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 font-bold"
                    >
                      +5
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FINANCE & SETTLEMENT */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 block">{t('salesSummary')}</span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {formatBDT(grossMerchandiseSales)}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {completedOrders.length} টি সফল ডেলিভারি থেকে
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 block">{t('commissionDeducted')}</span>
              <span className="text-xl font-black text-rose-700 mt-1 block">
                - {formatBDT(platformCommission)}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                হার: ৫% প্ল্যাটফর্ম ফি
              </span>
            </div>

            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-2xs">
              <span className="text-xs text-emerald-800 font-semibold block">{t('netPayable')}</span>
              <span className="text-2xl font-black text-emerald-900 mt-1 block">
                {formatBDT(netShopPayable)}
              </span>
              <span className="text-[10px] text-emerald-700 mt-1 block font-medium">
                অ্যাডমিন কর্তৃক পরবর্তী সাইকেলে ব্যাংক/বিকাশ হস্তান্তর
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reject Reason */}
      {rejectOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200">
            <h3 className="font-bold text-slate-900 text-sm mb-2">
              অর্ডার প্রত্যাখ্যানের কারণ উল্লেখ করুন
            </h3>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="যেমন: এই মুহূর্তে চালের স্টক শেষ হয়ে গেছে..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-rose-500 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim() || isProcessing}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-xl text-xs disabled:opacity-40"
              >
                প্রত্যাখ্যান নিশ্চিত করুন
              </button>
              <button
                onClick={() => setRejectOrderId(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl text-xs"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Product */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">নতুন পণ্য যুক্ত করুন</h3>
              <button onClick={() => setShowAddProductModal(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreateProductSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">পণ্যের নাম (বাংলা)</label>
                <input
                  type="text"
                  required
                  value={newProdNameBn}
                  onChange={(e) => setNewProdNameBn(e.target.value)}
                  placeholder="যেমন: দেশি রসুনের কোয়া"
                  className="w-full p-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Name (English)</label>
                <input
                  type="text"
                  required
                  value={newProdNameEn}
                  onChange={(e) => setNewProdNameEn(e.target.value)}
                  placeholder="e.g. Deshi Garlic 250gm"
                  className="w-full p-2 rounded-lg border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">মূল্য (৳ BDT)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">একক (Unit)</label>
                  <select
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value as ProductUnit)}
                    className="w-full p-2 rounded-lg border border-slate-200"
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

              <div>
                <label className="font-semibold text-slate-700 block mb-1">প্রাথমিক মজুদ (Stock)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newProdStock}
                  onChange={(e) => setNewProdStock(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-slate-200"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs mt-3 shadow-sm"
              >
                পণ্য সংরক্ষণ করুন
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
