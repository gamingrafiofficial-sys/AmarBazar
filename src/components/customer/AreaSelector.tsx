import React from 'react';
import { Market } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { MapPin } from 'lucide-react';

interface AreaSelectorProps {
  markets: Market[];
  selectedAreaId: string;
  onSelectArea: (marketId: string) => void;
}

export const AreaSelector: React.FC<AreaSelectorProps> = ({
  markets,
  selectedAreaId,
  onSelectArea,
}) => {
  const { language } = useLanguage();

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3">
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1 hidden sm:inline">
          {language === 'bn' ? 'এরিয়া:' : 'Area:'}
        </span>
        {markets.map((market) => {
          const isSelected = market.id === selectedAreaId;
          return (
            <button
              key={market.id}
              onClick={() => onSelectArea(market.id)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                isSelected
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
              }`}
            >
              <MapPin className={`w-3 h-3 ${isSelected ? 'text-amber-300' : 'text-emerald-600'}`} />
              <span>{language === 'bn' ? market.nameBn : market.nameEn}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
