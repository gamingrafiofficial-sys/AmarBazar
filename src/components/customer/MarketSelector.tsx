import React, { useState } from 'react';
import { Market, UnionArea } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { MapPin, Check, X, ChevronRight, Navigation } from 'lucide-react';

interface MarketSelectorProps {
  markets: Market[];
  selectedMarketId: string;
  onSelectMarket: (marketId: string) => void;
  unions: UnionArea[];
  selectedUnionId: string;
  onSelectUnion: (unionId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const MarketSelector: React.FC<MarketSelectorProps> = ({
  markets,
  selectedMarketId,
  onSelectMarket,
  unions,
  selectedUnionId,
  onSelectUnion,
  isOpen,
  onClose,
}) => {
  const { language } = useLanguage();
  const [activeThanaTab, setActiveThanaTab] = useState<string>(selectedMarketId || 'kaliganj');

  if (!isOpen) return null;

  const currentThanaUnions = unions.filter((u) => u.thanaId === activeThanaTab);
  const activeThana = markets.find((m) => m.id === activeThanaTab) || markets[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                {language === 'bn' ? 'থানা ও ইউনিয়ন বেছে নিন' : 'Select Thana & Union'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {language === 'bn'
                  ? 'কালীগঞ্জ ও কাপাসিয়া থানার প্রতিটি ইউনিয়নে দ্রুত ডেলিভারি'
                  : 'Fast doorstep delivery across all unions in Gazipur'}
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

        {/* Step 1: Thana Selector Tabs */}
        <div className="pt-3">
          <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider">
            {language === 'bn' ? '১. থানা নির্বাচন করুন:' : '1. Select Thana:'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {markets.map((market) => {
              const isSelected = market.id === activeThanaTab;
              const count = unions.filter((u) => u.thanaId === market.id).length;
              return (
                <button
                  key={market.id}
                  onClick={() => {
                    setActiveThanaTab(market.id);
                  }}
                  className={`p-3 rounded-2xl text-left border transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black">
                      {language === 'bn' ? market.nameBn : market.nameEn}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {count} {language === 'bn' ? 'ইউনিয়ন' : 'Unions'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {market.cityBn} জেলা
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Union List for chosen Thana */}
        <div className="pt-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {language === 'bn'
                ? `২. ${activeThana?.nameBn} থানার ইউনিয়ন নির্বাচন করুন:`
                : `2. Select Union in ${activeThana?.nameEn}:`}
            </label>

            {/* Select whole thana shortcut */}
            <button
              onClick={() => {
                onSelectMarket(activeThanaTab);
                onSelectUnion('all');
                onClose();
              }}
              className="text-[11px] font-bold text-emerald-700 hover:underline"
            >
              {language === 'bn' ? 'সমগ্র থানা নির্বাচন করুন' : 'Select entire thana'}
            </button>
          </div>

          <div className="space-y-1.5 pr-1">
            {currentThanaUnions.map((union, idx) => {
              const isSelected =
                selectedMarketId === activeThanaTab && selectedUnionId === union.id;

              return (
                <div
                  key={union.id}
                  onClick={() => {
                    onSelectMarket(activeThanaTab);
                    onSelectUnion(union.id);
                    onClose();
                  }}
                  className={`p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-2xs'
                      : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50/80 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold">
                        {language === 'bn' ? union.nameBn : union.nameEn}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {activeThana.nameBn} থানা, গাজীপুর
                      </p>
                    </div>
                  </div>

                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-100 mt-2 text-center">
          <p className="text-[11px] text-slate-500">
            {language === 'bn'
              ? '💡 আপনার নির্দিষ্ট ইউনিয়নে অর্ডার করলেই কেবল সেই ইউনিয়নের রাইডারের কাছে অর্ডার যাবে।'
              : 'Orders are routed specifically to the dedicated rider of your selected union.'}
          </p>
        </div>
      </div>
    </div>
  );
};
