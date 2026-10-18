import React, { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { ADMIN_CREDENTIALS } from '../../data/seedData';
import { DeliveryRiderAccount } from '../../types';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  ArrowRight,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminLoginSuccess: () => void;
  onRiderLoginSuccess: (rider: DeliveryRiderAccount) => void;
  registeredRiders: DeliveryRiderAccount[];
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onAdminLoginSuccess,
  onRiderLoginSuccess,
  registeredRiders,
}) => {
  const { language } = useLanguage();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    setTimeout(() => {
      // 1. Check Admin Credentials
      if (
        cleanIdentifier === ADMIN_CREDENTIALS.email.toLowerCase() &&
        cleanPass === ADMIN_CREDENTIALS.password
      ) {
        setIsLoading(false);
        onAdminLoginSuccess();
        onClose();
        return;
      }

      // 2. Check Delivery Rider Credentials by Mobile Number
      const matchingRider = registeredRiders.find(
        (r) =>
          r.phone.replace(/\s+/g, '') === cleanIdentifier.replace(/\s+/g, '') &&
          (r.password === cleanPass || !r.password)
      );

      if (matchingRider) {
        setIsLoading(false);
        onRiderLoginSuccess(matchingRider);
        onClose();
        return;
      }

      // 3. Invalid credentials
      setIsLoading(false);
      setErrorMessage(
        language === 'bn'
          ? 'ইমেইল/মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়।'
          : 'Invalid email/mobile number or password. Please try again.'
      );
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {language === 'bn' ? 'লগইন করুন' : 'Sign In'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'bn'
                ? 'এডমিন অথবা ডেলিভারি রাইডার একাউন্টে প্রবেশ করুন'
                : 'Access Admin or Delivery Rider Account'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email or Phone Input */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              {language === 'bn' ? 'ইমেইল অথবা মোবাইল নম্বর' : 'Email or Mobile Number'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                autoFocus
                placeholder={language === 'bn' ? 'যেমন: 017XXXXXXXX বা admin@mail.com' : 'e.g. 017XXXXXXXX or admin@mail.com'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 transition-all bg-slate-50/50"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 transition-all bg-slate-50/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold py-3.5 px-4 rounded-2xl text-sm transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center space-x-2 mt-6 active:scale-98"
          >
            <span>{isLoading ? (language === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying...') : (language === 'bn' ? 'লগইন করুন' : 'Sign In')}</span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
