import React from 'react';
import { OrderStatus } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const { t } = useLanguage();

  const getStyle = (s: OrderStatus) => {
    switch (s) {
      case 'pending_shop_confirmation':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'shop_confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'rider_assigned':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'picked_up':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'out_for_delivery':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300 animate-pulse';
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'shop_rejected':
      case 'delivery_failed':
      case 'cancelled':
      case 'returned':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${getStyle(
        status
      )} ${sizeClasses[size]}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-75"></span>
      {t(status)}
    </span>
  );
};
