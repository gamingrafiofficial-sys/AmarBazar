import React, { useState, useEffect } from 'react';
import { Market, UnionArea, DeliveryAddress, DistanceTier } from '../../types';
import { DISTANCE_TIER_OPTIONS } from '../../lib/deliveryPricing';
import { useLanguage } from '../../hooks/useLanguage';
import { MapPin, X, Check, Navigation, Home, Phone, User, Store, AlertCircle } from 'lucide-react';

interface DeliveryAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAddress: (address: DeliveryAddress) => void;
  markets: Market[];
  unions: UnionArea[];
  initialThanaId?: string;
  initialUnionId?: string;
  currentCustomerName?: string;
  currentCustomerPhone?: string;
  currentAddress?: Partial<DeliveryAddress> | null;
}

export const DeliveryAddressModal: React.FC<DeliveryAddressModalProps> = ({
  isOpen,
  onClose,
  onSaveAddress,
  markets,
  unions,
  initialThanaId = 'kapasia',
  initialUnionId,
  currentCustomerName = '',
  currentCustomerPhone = '',
  currentAddress,
}) => {
  const { language } = useLanguage();

  const [thanaId, setThanaId] = useState<string>(
    currentAddress?.thanaId || initialThanaId || (markets[0]?.id || 'kaliganj')
  );

  const availableUnions = unions.filter((u) => u.thanaId === thanaId);

  const [unionId, setUnionId] = useState<string>(() => {
    if (currentAddress?.unionId) return currentAddress.unionId;
    if (initialUnionId && initialUnionId !== 'all') {
      const match = unions.find((u) => u.id === initialUnionId && u.thanaId === thanaId);
      if (match) return match.id;
    }
    return availableUnions[0]?.id || 'chandpur';
  });

  const [pickupPlaceName, setPickupPlaceName] = useState<string>(currentAddress?.pickupPlaceName || '');
  const [distanceTier, setDistanceTier] = useState<DistanceTier>(currentAddress?.distanceTier || '1-2');
  const [fullAddress, setFullAddress] = useState<string>(currentAddress?.fullAddress || '');
  const [name, setName] = useState<string>(currentAddress?.name || currentCustomerName || '');
  const [phone, setPhone] = useState<string>(currentAddress?.phone || currentCustomerPhone || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update unions when thana changes
  useEffect(() => {
    const matchingUnions = unions.filter((u) => u.thanaId === thanaId);
    if (matchingUnions.length > 0 && !matchingUnions.some((u) => u.id === unionId)) {
      setUnionId(matchingUnions[0].id);
    }
  }, [thanaId, unions, unionId]);

  // Synchronize if currentAddress prop changes
  useEffect(() => {
    if (currentAddress) {
      if (currentAddress.thanaId) setThanaId(currentAddress.thanaId);
      if (currentAddress.unionId) setUnionId(currentAddress.unionId);
      if (currentAddress.pickupPlaceName) setPickupPlaceName(currentAddress.pickupPlaceName);
      if (currentAddress.distanceTier) setDistanceTier(currentAddress.distanceTier);
      if (currentAddress.fullAddress) setFullAddress(currentAddress.fullAddress);
      if (currentAddress.name) setName(currentAddress.name);
      if (currentAddress.phone) setPhone(currentAddress.phone);
    }
  }, [currentAddress]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg(language === 'bn' ? 'অনুগ্রহ করে আপনার নাম দিন।' : 'Please enter your name.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 11) {
      setErrorMsg(language === 'bn' ? 'সঠিক ১১ ডিজিটের মোবাইল নম্বর প্রদান করুন।' : 'Please enter valid 11-digit phone number.');
      return;
    }

    if (!pickupPlaceName.trim()) {
      setErrorMsg(
        language === 'bn'
          ? 'নিকটস্থ পিকআপ বা বাজারের নাম লিখুন (যেমন: নোয়াপাড়া, চাঁদপুর বাজার)।'
          : 'Please enter pickup place name (e.g. Noapara, Chandpur Bazar).'
      );
      return;
    }

    if (!fullAddress.trim() || fullAddress.trim().length < 5) {
      setErrorMsg(
        language === 'bn'
          ? 'বাড়ি, রাস্তা, গ্রাম ও পরিচিত স্থানের বিস্তারিত পূর্ণ ঠিকানা দিন।'
          : 'Please enter full detailed address.'
      );
      return;
    }

    const selectedThanaObj = markets.find((m) => m.id === thanaId);
    const selectedUnionObj = unions.find((u) => u.id === unionId);

    const tierOpt = DISTANCE_TIER_OPTIONS.find((opt) => opt.id === distanceTier);
    const approxKm = tierOpt ? tierOpt.approxKm : 1.5;

    const savedAddress: DeliveryAddress = {
      id: currentAddress?.id || `addr-${Date.now()}`,
      name: name.trim(),
      phone: cleanPhone,
      thanaId,
      thanaNameBn: selectedThanaObj?.nameBn || thanaId,
      unionId,
      unionNameBn: selectedUnionObj?.nameBn || unionId,
      pickupPlaceName: pickupPlaceName.trim(),
      distanceTier,
      estimatedDistanceKm: approxKm,
      fullAddress: fullAddress.trim(),
      isDefault: true,
      createdAt: currentAddress?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveAddress(savedAddress);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-700/80 flex items-center justify-center text-amber-300">
              <MapPin className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold">
                {language === 'bn' ? 'ডেলিভারি ঠিকানা যুক্ত / পরিবর্তন' : 'Add / Update Delivery Address'}
              </h3>
              <p className="text-[11px] text-emerald-100">
                {language === 'bn' ? 'থানা, ইউনিয়ন ও দূরত্বভিত্তিক সঠিক ডেলিভারি চার্জ নিশ্চিত করুন' : 'Ensure correct distance-based delivery calculation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Thana & Union Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {language === 'bn' ? 'আপনার থানা (Your Thana) *' : 'Your Thana *'}
              </label>
              <div className="relative">
                <select
                  value={thanaId}
                  onChange={(e) => setThanaId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-semibold focus:outline-hidden focus:border-emerald-600 focus:bg-white"
                >
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {language === 'bn' ? m.nameBn : m.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {language === 'bn' ? 'আপনার ইউনিয়ন (Your Union) *' : 'Your Union *'}
              </label>
              <div className="relative">
                <select
                  value={unionId}
                  onChange={(e) => setUnionId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-semibold focus:outline-hidden focus:border-emerald-600 focus:bg-white"
                >
                  {availableUnions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {language === 'bn' ? u.nameBn : u.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Pickup Place Name (যেমন Noapara, Chandpur Bazar) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {language === 'bn'
                ? 'নিকটস্থ পিকআপ প্লেস / বাজার (Pickup Place Name) *'
                : 'Pickup Place Name / Local Point *'}
            </label>
            <div className="relative">
              <Store className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={pickupPlaceName}
                onChange={(e) => setPickupPlaceName(e.target.value)}
                placeholder={language === 'bn' ? 'যেমন: নোয়াপাড়া মোড়, চাঁদপুর বাজার, টোক বাজার' : 'e.g. Noapara, Chandpur Bazar'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:bg-white font-medium"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {language === 'bn' ? 'রাইডার এই পয়েন্ট বা বাজারের সাপেক্ষে দ্রুত আপনার লোকেশনে পৌঁছাবে।' : 'Helps rider reach your exact neighborhood quickly.'}
            </p>
          </div>

          {/* 3. Distance Selection: "How far is your location from the shop?" */}
          <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                <span>
                  {language === 'bn'
                    ? 'দোকান থেকে আপনার আনুমানিক দূরত্ব (Distance from Pickup Shop) *'
                    : 'How far is your location from the shop? *'}
                </span>
              </label>
            </div>

            <select
              value={distanceTier}
              onChange={(e) => setDistanceTier(e.target.value as DistanceTier)}
              className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            >
              {DISTANCE_TIER_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.labelBn} ({opt.labelEn})
                </option>
              ))}
            </select>

            <p className="text-[10px] text-emerald-800/80 leading-relaxed">
              {language === 'bn'
                ? 'ℹ️ এটি কাস্টমারের দেওয়া আনুমানিক দূরত্ব। ডেলিভারির সময় সঠিক দূরত্ব অনুযায়ী রাইডার ও অফিস কর্তৃক যাচাই করা হতে পারে।'
                : 'Estimated distance submitted by customer. Verified by rider on actual drop-off.'}
            </p>
          </div>

          {/* 4. Full Detailed Address */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {language === 'bn' ? 'বিস্তারিত ঠিকানা (Full Address) *' : 'Full Address *'}
            </label>
            <div className="relative">
              <Home className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <textarea
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'বাড়ি, রাস্তা, গ্রাম, মসজিদের নাম ও পরিচিত স্থানের বিস্তারিত ঠিকানা লিখুন...'
                    : 'House, road, village, landmark or detailed directions...'
                }
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:bg-white font-medium resize-none"
                required
              />
            </div>
          </div>

          {/* 5. Name and Mobile Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {language === 'bn' ? 'আপনার নাম (Your Name) *' : 'Your Name *'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'bn' ? 'নাম লিখুন' : 'Full Name'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:bg-white font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {language === 'bn' ? 'মোবাইল নম্বর (Mobile Number) *' : 'Mobile Number *'}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017xxxxxxxx"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:bg-white font-medium font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Footer Submit Button */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold transition-colors cursor-pointer"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{language === 'bn' ? 'ঠিকানা সংরক্ষণ করুন (Save Address)' : 'Save Address'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
