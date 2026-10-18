import React from 'react';
import { Market } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { MapPin, Check, X } from 'lucide-react';

interface MarketSelectorProps {
  markets: Market[];
  selectedMarketId: string;
  onSelectMarket: (marketId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const MarketSelector: React.FC<MarketSelectorProps> = ({
  markets,
  selectedMarketId,
  onSelectMarket,
  isOpen,
  onClose,
}) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {language === 'bn' ? 'আপনার বাজার/এলাকা বেছে নিন' : 'Select Your Area'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {language === 'bn'
                  ? 'গাজীপুর জেলা ও অনুমোদিত ডেলিভারি এরিয়া'
                  : 'Authorized Delivery Areas in Gazipur'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Markets List (Admin Added Areas) */}
        <div className="space-y-2.5 overflow-y-auto flex-1 py-4 pr-1">
          {markets.map((market) => {
            const isSelected = market.id === selectedMarketId;
            return (
              <div
                key={market.id}
                onClick={() => {
                  onSelectMarket(market.id);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50/80'
                }`}
              >
                <div className="pr-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-sm text-slate-900">
                      {language === 'bn' ? market.nameBn : market.nameEn}
                    </h4>
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-md">
                      {language === 'bn' ? market.cityBn : market.cityEn}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{language === 'bn' ? market.areaBn : market.areaEn}</span>
                  </p>

                  <span className="text-[11px] text-emerald-700 font-semibold mt-1 inline-block">
                    ডেলিভারি কাভারেজ: {market.radiusKm} কি.মি ব্যাসার্ধ
                  </span>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
