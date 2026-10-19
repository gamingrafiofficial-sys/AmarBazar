import React from 'react';
import { Market, UnionArea } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { MapPin, Check, ChevronRight } from 'lucide-react';

interface AreaSelectorProps {
  markets: Market[];
  selectedAreaId: string;
  onSelectArea: (marketId: string) => void;
  unions: UnionArea[];
  selectedUnionId: string;
  onSelectUnion: (unionId: string) => void;
}

export const AreaSelector: React.FC<AreaSelectorProps> = ({
  markets,
  selectedAreaId,
  onSelectArea,
  unions,
  selectedUnionId,
  onSelectUnion,
}) => {
  const { language } = useLanguage();

  // Unions belonging to the currently selected Thana
  const currentThanaUnions = unions.filter((u) => u.thanaId === selectedAreaId);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 space-y-2">
      {/* 1. Thana (থানা) Selector Row */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-0.5 scrollbar-none">
        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-emerald-700" />
          {language === 'bn' ? 'থানা:' : 'Thana:'}
        </span>
        {markets.map((market) => {
          const isSelected = market.id === selectedAreaId;
          return (
            <button
              key={market.id}
              onClick={() => {
                onSelectArea(market.id);
                // Auto reset union to all or first union
                onSelectUnion('all');
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all shadow-2xs ${
                isSelected
                  ? 'bg-emerald-700 text-white ring-2 ring-emerald-600/30 shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-400 hover:bg-slate-50'
              }`}
            >
              <span>{language === 'bn' ? market.nameBn : market.nameEn}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-100 text-slate-500'
              }`}>
                {language === 'bn' ? market.cityBn : market.cityEn}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Union (ইউনিয়ন) Selector Chips Row */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none pl-1">
        <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1">
          {language === 'bn' ? 'ইউনিয়ন:' : 'Union:'}
        </span>

        {/* All Unions option */}
        <button
          onClick={() => onSelectUnion('all')}
          className={`px-3 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
            selectedUnionId === 'all'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {language === 'bn' ? 'সকল ইউনিয়ন' : 'All Unions'}
        </button>

        {currentThanaUnions.map((union) => {
          const isSelected = union.id === selectedUnionId;
          return (
            <button
              key={union.id}
              onClick={() => onSelectUnion(union.id)}
              className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all border ${
                isSelected
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs ring-1 ring-emerald-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50'
              }`}
            >
              {isSelected && <Check className="w-3 h-3 text-emerald-600 shrink-0 stroke-[3]" />}
              <span>{language === 'bn' ? union.nameBn : union.nameEn}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
