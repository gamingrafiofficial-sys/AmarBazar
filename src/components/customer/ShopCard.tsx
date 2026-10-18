import React from 'react';
import { Shop } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { Store, Clock, MapPin, Phone, CheckCircle2, ChevronRight } from 'lucide-react';

interface ShopCardProps {
  shop: Shop;
  isSelected: boolean;
  onSelect: () => void;
  distanceKm?: number;
}

export const ShopCard: React.FC<ShopCardProps> = ({
  shop,
  isSelected,
  onSelect,
  distanceKm = 1.8,
}) => {
  const { language, t } = useLanguage();

  return (
    <div
      onClick={onSelect}
      className={`rounded-2xl border bg-white p-4 transition-all cursor-pointer relative overflow-hidden group ${
        isSelected
          ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
          : 'border-slate-200 hover:border-emerald-400 hover:shadow-md'
      }`}
    >
      <div className="flex items-start space-x-3.5">
        <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative border border-slate-200">
          {shop.image ? (
            <img
              src={shop.image}
              alt={shop.nameEn}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <Store className="w-7 h-7" />
            </div>
          )}
          {shop.isOpen && (
            <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h3 className="font-bold text-sm text-slate-900 truncate">
              {language === 'bn' ? shop.nameBn : shop.nameEn}
            </h3>
            {shop.isApproved && (
              <span title="Verified Shop">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{language === 'bn' ? shop.addressBn : shop.addressEn}</span>
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
            <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
              {distanceKm} কি.মি দূরত্ব
            </span>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{shop.openingTime} - {shop.closingTime}</span>
            </span>
            <span className="text-amber-700 font-medium">
              ~২৫-৩৫ {t('min')}
            </span>
          </div>
        </div>

        <ChevronRight
          className={`w-5 h-5 transition-transform shrink-0 ${
            isSelected ? 'text-emerald-600 translate-x-0.5' : 'text-slate-300 group-hover:text-emerald-500'
          }`}
        />
      </div>
    </div>
  );
};
