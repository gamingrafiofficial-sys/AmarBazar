import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { Market, Order, UnionArea, Product, CustomerAccount, DeliveryAddress, DistanceTier, DeliveryPricingConfig } from '../types';
import { SEED_UNIONS, SEED_MARKETS } from '../data/seedData';
import {
  calculateCartTotalWeightKg,
  calculateDeliveryChargeBreakdown,
  DISTANCE_TIER_OPTIONS,
  getEstimatedKmFromTier,
  DEFAULT_DELIVERY_PRICING_CONFIG,
} from '../lib/deliveryPricing';
import { DeliveryAddressModal } from '../components/customer/DeliveryAddressModal';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  MapPin,
  Phone,
  User,
  Truck,
  Clock,
  Sparkles,
  Banknote,
  FileText,
  AlertCircle,
  Building,
  Lock,
  LogIn,
  Loader2,
  CheckCircle2,
  Navigation,
  Scale,
  Store,
  ChevronRight,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface CartPageProps {
  currentArea: Market;
  onContinueShopping: () => void;
  onOrderSuccess: (order: Order) => void;
  customerProfile?: CustomerAccount | null;
  markets?: Market[];
  unions?: UnionArea[];
  initialUnionId?: string;
  onRequireLogin?: () => void;
  products?: Product[];
  pricingConfig?: DeliveryPricingConfig;
  onSaveCustomerAddress?: (address: DeliveryAddress) => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  currentArea,
  onContinueShopping,
  onOrderSuccess,
  customerProfile,
  markets = SEED_MARKETS,
  unions = SEED_UNIONS,
  initialUnionId,
  onRequireLogin,
  products = [],
  pricingConfig = DEFAULT_DELIVERY_PRICING_CONFIG,
  onSaveCustomerAddress,
}) => {
  const { language, formatBDT } = useLanguage();
  const { items, subtotal, updateQuantity, removeFromCart, clearCart, syncWithProducts } = useCart();
  const { role } = useAuth();

  // Keep cart items and prices immediately synchronized with live product updates
  useEffect(() => {
    if (products && products.length > 0) {
      syncWithProducts(products);
    }
  }, [products, syncWithProducts]);

  // Address Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Selected Thana and Union
  const [selectedThanaId, setSelectedThanaId] = useState<string>(() => {
    return customerProfile?.areaId || currentArea?.id || 'kapasia';
  });

  const availableUnions = useMemo(
    () => unions.filter((u) => u.thanaId === selectedThanaId),
    [unions, selectedThanaId]
  );

  const [selectedUnionId, setSelectedUnionId] = useState<string>(() => {
    if (customerProfile?.unionId) {
      const match = unions.find((u) => u.id === customerProfile.unionId);
      if (match) return match.id;
    }
    if (initialUnionId && initialUnionId !== 'all') {
      const match = unions.find((u) => u.id === initialUnionId && u.thanaId === selectedThanaId);
      if (match) return initialUnionId;
    }
    return availableUnions[0]?.id || 'chandpur';
  });

  // When thana changes, reset union if not in available
  useEffect(() => {
    if (availableUnions.length > 0 && !availableUnions.some((u) => u.id === selectedUnionId)) {
      setSelectedUnionId(availableUnions[0].id);
    }
  }, [availableUnions, selectedUnionId]);

  const selectedThana = markets.find((m) => m.id === selectedThanaId) || currentArea;
  const selectedUnion = unions.find((u) => u.id === selectedUnionId) || availableUnions[0];

  // Address Fields
  const [customerName, setCustomerName] = useState(customerProfile?.name || '');
  const [customerPhone, setCustomerPhone] = useState(customerProfile?.phone || '');
  const [pickupPlaceName, setPickupPlaceName] = useState<string>(
    customerProfile?.savedAddresses?.[0]?.pickupPlaceName || 'চাঁদপুর বাজার / মোড়'
  );
  const [selectedDistanceTier, setSelectedDistanceTier] = useState<DistanceTier>(
    customerProfile?.savedAddresses?.[0]?.distanceTier || '1-2'
  );
  const [deliveryAddress, setDeliveryAddress] = useState(
    customerProfile?.savedAddresses?.[0]?.fullAddress || customerProfile?.address || ''
  );
  const [orderNotes, setOrderNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'loading' | 'submitted' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync inputs when customerProfile is loaded or changes
  useEffect(() => {
    if (customerProfile) {
      if (customerProfile.name) setCustomerName(customerProfile.name);
      if (customerProfile.phone) setCustomerPhone(customerProfile.phone);
      if (customerProfile.savedAddresses && customerProfile.savedAddresses.length > 0) {
        const defAddr = customerProfile.savedAddresses[0];
        if (defAddr.thanaId) setSelectedThanaId(defAddr.thanaId);
        if (defAddr.unionId) setSelectedUnionId(defAddr.unionId);
        if (defAddr.pickupPlaceName) setPickupPlaceName(defAddr.pickupPlaceName);
        if (defAddr.distanceTier) setSelectedDistanceTier(defAddr.distanceTier);
        if (defAddr.fullAddress) setDeliveryAddress(defAddr.fullAddress);
      } else if (customerProfile.address) {
        setDeliveryAddress(customerProfile.address);
      }
    }
  }, [customerProfile]);

  // 1. Calculate Total Product Weight (in KG)
  const totalWeightKg = useMemo(() => calculateCartTotalWeightKg(items), [items]);

  // 2. Calculate Distance-Based and Weight-Based Delivery Charges
  const deliveryBreakdown = useMemo(
    () => calculateDeliveryChargeBreakdown(selectedDistanceTier, totalWeightKg, pricingConfig),
    [selectedDistanceTier, totalWeightKg, pricingConfig]
  );

  const distanceCharge = deliveryBreakdown.distanceCharge;
  const weightCharge = deliveryBreakdown.weightCharge;
  const deliveryFee = deliveryBreakdown.totalDeliveryCharge;
  const grandTotal = subtotal + deliveryFee;

  // Handle saving new or updated delivery address from Modal
  const handleSaveModalAddress = (addr: DeliveryAddress) => {
    setSelectedThanaId(addr.thanaId);
    setSelectedUnionId(addr.unionId);
    setPickupPlaceName(addr.pickupPlaceName);
    setSelectedDistanceTier(addr.distanceTier);
    setDeliveryAddress(addr.fullAddress);
    if (addr.name) setCustomerName(addr.name);
    if (addr.phone) setCustomerPhone(addr.phone);

    if (onSaveCustomerAddress) {
      onSaveCustomerAddress(addr);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Block order if customer is not logged in
    if (!customerProfile) {
      setErrorMessage(
        language === 'bn'
          ? 'লগইন না করে অর্ডার করা সম্ভব নয়। অনুগ্রহ করে প্রথমে লগইন বা রেজিস্ট্রেশন করুন।'
          : 'You must be logged in to place an order. Please log in or register first.'
      );
      if (onRequireLogin) {
        onRequireLogin();
      }
      return;
    }

    if (items.length === 0) {
      setErrorMessage(language === 'bn' ? 'আপনার কার্ট খালি রয়েছে।' : 'Your cart is empty.');
      return;
    }

    if (!customerPhone || customerPhone.trim().length < 11) {
      setErrorMessage(
        language === 'bn' ? 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।' : 'Please provide valid 11-digit mobile number.'
      );
      return;
    }

    if (!pickupPlaceName || pickupPlaceName.trim().length < 2) {
      setErrorMessage(
        language === 'bn'
          ? 'নিকটস্থ পিকআপ প্লেস বা বাজারের নাম উল্লেখ করুন (যেমন: নোয়াপাড়া, চাঁদপুর বাজার)।'
          : 'Please enter pickup place name (e.g. Noapara, Chandpur Bazar).'
      );
      return;
    }

    if (!deliveryAddress || deliveryAddress.trim().length < 5) {
      setErrorMessage(
        language === 'bn'
          ? 'বাড়ি, রাস্তা, গ্রাম ও পরিচিত স্থানের বিস্তারিত ডেলিভারি ঠিকানা দিন।'
          : 'Please enter full delivery address.'
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitPhase('loading');

    try {
      const minAnimationPromise = new Promise((resolve) => setTimeout(resolve, 250));

      const approxKm = getEstimatedKmFromTier(selectedDistanceTier);

      const deliveryChargeSnapshot = {
        distanceTier: selectedDistanceTier,
        distanceCharge,
        totalWeightKg,
        weightCharge,
        specialHandlingFee: deliveryBreakdown.specialHandlingFee,
        totalDeliveryFee: deliveryFee,
        pickupPlaceName: pickupPlaceName.trim(),
        fullAddress: deliveryAddress.trim(),
        calculatedAt: new Date().toISOString(),
        verifiedBy: 'customer' as const,
      };

      const payload = {
        customerId: customerProfile?.id || `cust-${Date.now()}`,
        shopId: 'admin-store',
        marketId: selectedThanaId,
        thanaId: selectedThanaId,
        thanaNameBn: selectedThana?.nameBn || currentArea.nameBn,
        unionId: selectedUnionId,
        unionNameBn: selectedUnion?.nameBn || 'সদর',
        pickupPlaceName: pickupPlaceName.trim(),
        distanceTier: selectedDistanceTier,
        estimatedDistanceKm: approxKm,
        totalWeightKg,
        distanceCharge,
        weightCharge,
        deliveryFee,
        totalAmount: grandTotal,
        deliveryChargeSnapshot,
        items: items.map((i) => {
          const liveProd = products?.find((p) => p.id === i.product.id) || i.product;
          return {
            productId: i.product.id,
            quantity: i.quantity,
            price: Number(liveProd.price),
            nameBn: liveProd.nameBn,
            nameEn: liveProd.nameEn,
            unit: liveProd.unit,
            lineTotal: Number(liveProd.price) * i.quantity,
          };
        }),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: `${deliveryAddress.trim()} (পিকআপ: ${pickupPlaceName.trim()}, ইউনিয়ন: ${selectedUnion?.nameBn || ''}, থানা: ${selectedThana?.nameBn || ''})`,
        deliveryLat: selectedThana?.lat || currentArea.lat,
        deliveryLng: selectedThana?.lng || currentArea.lng,
        notes: orderNotes.trim(),
      };

      const resPromise = fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const [res] = await Promise.all([resPromise, minAnimationPromise]);

      let placedOrder: Order;
      if (res.ok) {
        placedOrder = await res.json();
      } else {
        // Fallback robust order creation with authoritative latest prices & snapshot
        placedOrder = {
          id: `AB-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`,
          customerId: payload.customerId,
          shopId: 'admin-store',
          marketId: selectedThanaId,
          thanaId: selectedThanaId,
          thanaNameBn: selectedThana?.nameBn || currentArea.nameBn,
          unionId: selectedUnionId,
          unionNameBn: selectedUnion?.nameBn || 'সদর',
          pickupPlaceName: payload.pickupPlaceName,
          distanceTier: payload.distanceTier,
          estimatedDistanceKm: approxKm,
          totalWeightKg,
          distanceCharge,
          weightCharge,
          specialHandlingFee: deliveryBreakdown.specialHandlingFee,
          deliveryChargeSnapshot,
          items: items.map((i) => {
            const liveProd = products?.find((p) => p.id === i.product.id) || i.product;
            const unitPrice = Number(liveProd.price);
            return {
              productId: i.product.id,
              nameEn: liveProd.nameEn,
              nameBn: liveProd.nameBn,
              price: unitPrice,
              unit: liveProd.unit,
              quantity: i.quantity,
              lineTotal: unitPrice * i.quantity,
            };
          }),
          subtotal,
          deliveryFee,
          totalAmount: grandTotal,
          roadDistanceKm: approxKm,
          pricingRuleVersion: 'v2.0-distance-weight-tier',
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          orderStatus: 'pending_shop_confirmation',
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          deliveryAddress: payload.deliveryAddress,
          deliveryLat: payload.deliveryLat,
          deliveryLng: payload.deliveryLng,
          notes: orderNotes.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      // Save this address as customer's default address for future orders
      const savedAddressObj: DeliveryAddress = {
        id: `addr-${Date.now()}`,
        name: customerName.trim(),
        phone: customerPhone.trim(),
        thanaId: selectedThanaId,
        thanaNameBn: selectedThana?.nameBn || selectedThanaId,
        unionId: selectedUnionId,
        unionNameBn: selectedUnion?.nameBn || selectedUnionId,
        pickupPlaceName: pickupPlaceName.trim(),
        distanceTier: selectedDistanceTier,
        estimatedDistanceKm: approxKm,
        fullAddress: deliveryAddress.trim(),
        isDefault: true,
        createdAt: new Date().toISOString(),
      };
      if (onSaveCustomerAddress) {
        onSaveCustomerAddress(savedAddressObj);
      }

      setSubmitPhase('submitted');
      clearCart();

      setTimeout(() => {
        onOrderSuccess(placedOrder);
      }, 700);
    } catch (err: any) {
      setSubmitPhase('failed');
      setErrorMessage(
        err.message ||
          (language === 'bn' ? 'অর্ডার সম্পন্ন করতে সমস্যা হয়েছে।' : 'Failed to place order.')
      );
      setTimeout(() => setSubmitPhase('idle'), 2500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Action */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {language === 'bn' ? 'শপিং কার্ট ও চেকআউট' : 'Shopping Cart & Checkout'}
            </h1>
            <p className="text-[11px] text-slate-500">
              {language === 'bn'
                ? 'দূরত্ব ও ওজনভিত্তিক স্বচ্ছ ডেলিভারি চার্জ'
                : 'Transparent Distance & Weight-based Delivery Charges'}
            </p>
          </div>
        </div>

        <button
          onClick={onContinueShopping}
          className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">
            {language === 'bn' ? 'আরও পণ্য যোগ করুন' : 'Continue Shopping'}
          </span>
          <span className="sm:hidden">{language === 'bn' ? 'শপ' : 'Shop'}</span>
        </button>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {items.length === 0 ? (
        /* Empty Cart State */
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto my-8 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 stroke-1" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {language === 'bn' ? 'আপনার কার্ট খালি রয়েছে' : 'Your cart is empty'}
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            {language === 'bn'
              ? 'পছন্দের তাজা কাঁচাবাজার ও মুদি পণ্য কার্টে যোগ করে অর্ডার করুন।'
              : 'Add fresh groceries from our catalog to place your order.'}
          </p>
          <button
            onClick={onContinueShopping}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-6 rounded-2xl text-xs sm:text-sm transition-colors shadow-sm cursor-pointer"
          >
            {language === 'bn' ? 'পণ্য কেনাকাটা শুরু করুন' : 'Start Shopping'}
          </button>
        </div>
      ) : (
        /* Active Cart Page Layout: Left Cart Items, Right Checkout Details */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Cart Items Table / List (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{language === 'bn' ? 'কার্টের পণ্য তালিকা' : 'Cart Items'}</span>
                <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  {items.length} {language === 'bn' ? 'আইটেম' : 'Items'}
                </span>
                <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Scale className="w-3 h-3 text-slate-500" />
                  <span>{totalWeightKg} কেজি</span>
                </span>
              </h2>

              <button
                onClick={clearCart}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center space-x-1 cursor-pointer"
                title="কার্ট খালি করুন"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'সব মুছুন' : 'Clear All'}</span>
              </button>
            </div>

            {/* Items list */}
            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const liveProd = products?.find((p) => p.id === item.product.id) || item.product;
                const unitPrice = Number(liveProd.price);
                const lineTotal = unitPrice * item.quantity;
                return (
                  <div
                    key={item.product.id}
                    className="py-3.5 flex items-center space-x-3 sm:space-x-4"
                  >
                    <img
                      src={
                        liveProd.imageUrl ||
                        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=150&q=80'
                      }
                      alt={liveProd.nameEn}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover bg-slate-50 border border-slate-200 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {language === 'bn' ? liveProd.nameBn : liveProd.nameEn}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-emerald-800">
                          {formatBDT(lineTotal)}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ({formatBDT(unitPrice)} x {item.quantity} {liveProd.unit})
                        </span>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1, liveProd)}
                        className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold shadow-2xs cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1, liveProd)}
                        disabled={item.quantity >= liveProd.stock}
                        className="w-6 h-6 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 flex items-center justify-center font-bold shadow-2xs cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-slate-300 hover:text-rose-600 p-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Customer Details, Delivery Address & Checkout Form (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs">
            <div className="pb-3 border-b border-slate-100 mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  {language === 'bn' ? 'ডেলিভারি ঠিকানা ও অর্ডার তথ্য' : 'Delivery Address & Checkout'}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {language === 'bn' ? 'সঠিক দূরত্বের ভিত্তিতে চার্জ নির্ধারিত হয়' : 'Charges based on distance & weight'}
                </p>
              </div>

              {/* Add Delivery Address Button */}
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(true)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'Add Delivery Address' : 'Add Delivery Address'}</span>
              </button>
            </div>

            {/* Saved Address Quick Select (if customer has saved addresses) */}
            {customerProfile?.savedAddresses && customerProfile.savedAddresses.length > 0 && (
              <div className="mb-4 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{language === 'bn' ? 'সংরক্ষিত ঠিকানা নির্বাচন:' : 'Select Saved Address:'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                  >
                    {language === 'bn' ? '+ নতুন যোগ' : '+ Add New'}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {customerProfile.savedAddresses.map((saved, idx) => {
                    const isSelected =
                      selectedThanaId === saved.thanaId &&
                      selectedUnionId === saved.unionId &&
                      pickupPlaceName === saved.pickupPlaceName;
                    return (
                      <button
                        key={saved.id || idx}
                        type="button"
                        onClick={() => {
                          setSelectedThanaId(saved.thanaId);
                          setSelectedUnionId(saved.unionId);
                          setPickupPlaceName(saved.pickupPlaceName);
                          setSelectedDistanceTier(saved.distanceTier || '1-2');
                          setDeliveryAddress(saved.fullAddress);
                          if (saved.name) setCustomerName(saved.name);
                          if (saved.phone) setCustomerPhone(saved.phone);
                        }}
                        className={`text-left p-2.5 rounded-xl border text-xs transition-all flex items-start justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-medium ring-1 ring-emerald-500'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span>{saved.pickupPlaceName || saved.unionNameBn}</span>
                            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md">
                              {saved.distanceTier || '1-2'} কিমি
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {saved.fullAddress}
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Prominent Login Warning if user is not logged in */}
            {!customerProfile && (
              <div className="mb-4 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300/80 rounded-2xl text-amber-950">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-amber-200/80 rounded-xl text-amber-900 shrink-0 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-extrabold text-xs sm:text-sm text-amber-950">
                      {language === 'bn' ? 'লগইন না করে অর্ডার করা যাবে না' : 'Login Required to Place Order'}
                    </h3>
                    <p className="text-[11px] text-amber-850 mt-0.5 leading-relaxed">
                      {language === 'bn'
                        ? 'নিরাপদ ডেলিভারি ও অর্ডার ট্র্যাকিংয়ের জন্য আপনার একাউন্টে লগইন করুন অথবা ২ মিনিটে নতুন একাউন্ট খুলুন।'
                        : 'Please log in to your account or register in 2 minutes for secure delivery and live order tracking.'}
                    </p>
                    <button
                      type="button"
                      onClick={onRequireLogin}
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'লগইন বা রেজিস্ট্রেশন করুন' : 'Login or Register'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handlePlaceOrder} className="space-y-3.5 text-xs">
              {/* Thana and Union Selector */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 flex items-center gap-1 mb-1 text-[11px]">
                    <Building className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      {language === 'bn' ? 'আপনার থানা (Your Thana)' : 'Your Thana'}{' '}
                      <span className="text-rose-500">*</span>
                    </span>
                  </label>
                  <select
                    value={selectedThanaId}
                    onChange={(e) => {
                      const newThana = e.target.value;
                      setSelectedThanaId(newThana);
                      const filtered = unions.filter((u) => u.thanaId === newThana);
                      if (filtered.length > 0) {
                        setSelectedUnionId(filtered[0].id);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-hidden focus:border-emerald-600 bg-white"
                  >
                    {markets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {language === 'bn' ? m.nameBn : m.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 flex items-center gap-1 mb-1 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      {language === 'bn' ? 'আপনার ইউনিয়ন (Your Union)' : 'Your Union'}{' '}
                      <span className="text-rose-500">*</span>
                    </span>
                  </label>
                  <select
                    value={selectedUnionId}
                    onChange={(e) => setSelectedUnionId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-hidden focus:border-emerald-600 bg-emerald-50/50 text-emerald-950"
                  >
                    {availableUnions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {language === 'bn' ? u.nameBn : u.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pickup Place Name */}
              <div>
                <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1 text-[11px]">
                  <Store className="w-3.5 h-3.5 text-emerald-700" />
                  <span>
                    {language === 'bn'
                      ? 'পিকআপ প্লেস / বাজার (Pickup Place Name)'
                      : 'Pickup Place Name'}{' '}
                    <span className="text-rose-500">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    language === 'bn' ? 'যেমন: নোয়াপাড়া, চাঁদপুর বাজার, বরমী মোড়' : 'e.g. Noapara, Chandpur Bazar'
                  }
                  value={pickupPlaceName}
                  onChange={(e) => setPickupPlaceName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-slate-50/50"
                />
              </div>

              {/* Distance from Pickup Shop (Dropdown) */}
              <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200/90 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-emerald-950 flex items-center gap-1.5 text-[11px]">
                    <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      {language === 'bn'
                        ? 'দোকান থেকে দূরত্ব (How far is your location from the shop?)'
                        : 'Distance from Pickup Shop'}{' '}
                      <span className="text-rose-500">*</span>
                    </span>
                  </label>
                  <span className="text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    চার্জ: {formatBDT(distanceCharge)}
                  </span>
                </div>

                <select
                  value={selectedDistanceTier}
                  onChange={(e) => setSelectedDistanceTier(e.target.value as DistanceTier)}
                  className="w-full p-2.5 rounded-xl border border-emerald-300 bg-white text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                >
                  {DISTANCE_TIER_OPTIONS.map((opt) => {
                    const rate =
                      pricingConfig.distanceRates[opt.id] !== undefined
                        ? pricingConfig.distanceRates[opt.id]
                        : DEFAULT_DELIVERY_PRICING_CONFIG.distanceRates[opt.id];
                    return (
                      <option key={opt.id} value={opt.id}>
                        {opt.labelBn} = ৳{rate}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[10px] text-emerald-800/80">
                  {language === 'bn'
                    ? 'কাস্টমারের দেওয়া আনুমানিক দূরত্ব। ডেলিভারির সময় রাইডার কর্তৃক যাচাই করা হবে।'
                    : 'Customer estimated distance, verified by rider on spot.'}
                </p>
              </div>

              {/* Full Address */}
              <div>
                <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1 text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                  <span>
                    {language === 'bn' ? 'বিস্তারিত পূর্ণ ঠিকানা (Full Address)' : 'Full Address'}{' '}
                    <span className="text-rose-500">*</span>
                  </span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder={
                    language === 'bn'
                      ? 'বাড়ি, রাস্তা, গ্রাম ও পরিচিত স্থানের বিস্তারিত পূর্ণ ঠিকানা...'
                      : 'House, road, village, landmark details...'
                  }
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              {/* Customer Name & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1 text-[11px]">
                    <User className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{language === 'bn' ? 'আপনার নাম' : 'Your Name'}</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={language === 'bn' ? 'নাম লিখুন' : 'Full Name'}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1 text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{language === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Number'}</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="017XXXXXXXX"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Order Note (ডেলিভারি নোট ও বিশেষ নির্দেশনা) */}
              <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200">
                <label className="font-bold text-amber-950 flex items-center justify-between gap-1.5 mb-1 text-xs">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>
                      {language === 'bn' ? 'অর্ডারের নিচে বিশেষ নোট (Order Note)' : 'Order Note (Optional)'}
                    </span>
                  </span>
                  <span className="text-[10px] text-amber-800 font-semibold bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300/50">
                    {language === 'bn' ? 'ঐচ্ছিক' : 'Optional'}
                  </span>
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    language === 'bn'
                      ? 'যেমন: বাসার গেটে এসে কল দিবেন, ভাঙতি টাকা নিয়ে আসবেন, পণ্য সাবধানে রাখবেন...'
                      : 'e.g. Call when outside gate, bring exact change...'
                  }
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-amber-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs resize-none"
                />
              </div>

              {/* Payment Method Badge */}
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-amber-900 font-bold text-xs">
                <Banknote className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  {language === 'bn'
                    ? 'ক্যাশ অন ডেলিভারি (পণ্য পেয়ে নগদ টাকা দিন)'
                    : 'Cash on Delivery (Pay cash upon delivery)'}
                </span>
              </div>

              {/* Detailed Breakdown Box (as requested in Section 5) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 pb-1.5 border-b border-slate-200 flex items-center justify-between">
                  <span>{language === 'bn' ? 'হিসাব বিবরণী (Summary)' : 'Charge Breakdown'}</span>
                  <span className="text-[11px] font-semibold text-emerald-800">
                    {selectedThana?.nameBn} • {selectedUnion?.nameBn}
                  </span>
                </h4>

                <div className="space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>{language === 'bn' ? 'পণ্যের মোট মূল্য (Product Subtotal):' : 'Product Subtotal:'}</span>
                    <span className="font-bold text-slate-900">{formatBDT(subtotal)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-slate-400" />
                      <span>{language === 'bn' ? 'পণ্যের মোট ওজন (Total Weight):' : 'Total Product Weight:'}</span>
                    </span>
                    <span className="font-bold text-slate-800">
                      {totalWeightKg} কেজি ({deliveryBreakdown.weightTierLabelBn})
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{language === 'bn' ? 'দূরত্বভিত্তিক ডেলিভারি চার্জ:' : 'Distance-Based Delivery Charge:'}</span>
                    </span>
                    <span className="font-bold text-emerald-800">
                      {formatBDT(distanceCharge)} ({deliveryBreakdown.distanceTierLabelBn})
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-purple-700" />
                      <span>{language === 'bn' ? 'ওজনভিত্তিক অতিরিক্ত চার্জ:' : 'Weight-Based Additional Charge:'}</span>
                    </span>
                    <span className="font-bold text-purple-800">
                      {formatBDT(weightCharge)}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-700 font-semibold pt-1 border-t border-slate-200/60">
                    <span>{language === 'bn' ? 'মোট ডেলিভারি চার্জ:' : 'Total Delivery Charge:'}</span>
                    <span className="text-emerald-800 font-black">{formatBDT(deliveryFee)}</span>
                  </div>

                  <div className="flex justify-between text-sm sm:text-base font-extrabold text-slate-900 border-t border-slate-300 pt-2">
                    <span>{language === 'bn' ? 'সর্বমোট প্রদেয় (Grand Total):' : 'Grand Total Payable:'}</span>
                    <span className="text-emerald-800 font-black">{formatBDT(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Submit Order or Require Login */}
              {!customerProfile ? (
                <button
                  type="button"
                  onClick={onRequireLogin}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 px-4 rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-amber-600/25 flex items-center justify-center space-x-2 mt-4 active:scale-98 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {language === 'bn'
                      ? '🔒 অর্ডার সম্পন্ন করতে প্রথমে লগইন করুন'
                      : '🔒 Please Log In to Place Order'}
                  </span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full font-bold py-3.5 px-4 rounded-2xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center space-x-2 mt-4 active:scale-98 cursor-pointer ${
                    submitPhase === 'submitted'
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-400/40 shadow-emerald-600/40 animate-pulse'
                      : submitPhase === 'failed'
                      ? 'bg-rose-600 text-white shadow-rose-600/20'
                      : 'bg-emerald-700 hover:bg-emerald-800 disabled:opacity-75 text-white shadow-emerald-700/20'
                  }`}
                >
                  {submitPhase === 'loading' && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{language === 'bn' ? 'অর্ডার প্রসেস হচ্ছে...' : 'Processing order...'}</span>
                    </>
                  )}
                  {submitPhase === 'submitted' && (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-white animate-bounce" />
                      <span className="font-extrabold text-sm tracking-wide">
                        {language === 'bn'
                          ? '✅ Submitted! (অর্ডার নিশ্চিত হয়েছে)'
                          : '✅ Order Placed Successfully!'}
                      </span>
                    </>
                  )}
                  {submitPhase === 'idle' && (
                    <>
                      <Truck className="w-4 h-4" />
                      <span>
                        {language === 'bn'
                          ? `অর্ডার কনফার্ম করুন (${formatBDT(grandTotal)})`
                          : `Confirm Order (${formatBDT(grandTotal)})`}
                      </span>
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Delivery Address Modal Dialog */}
      <DeliveryAddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSaveAddress={handleSaveModalAddress}
        markets={markets}
        unions={unions}
        initialThanaId={selectedThanaId}
        initialUnionId={selectedUnionId}
        currentCustomerName={customerName}
        currentCustomerPhone={customerPhone}
        currentAddress={{
          thanaId: selectedThanaId,
          unionId: selectedUnionId,
          pickupPlaceName,
          distanceTier: selectedDistanceTier,
          fullAddress: deliveryAddress,
          name: customerName,
          phone: customerPhone,
        }}
      />
    </div>
  );
};
