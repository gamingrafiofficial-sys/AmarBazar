import React, { useState } from 'react';
import { FileText, Edit2, Check, X, Sparkles } from 'lucide-react';

interface OrderNoteSectionProps {
  orderId: string;
  notes?: string;
  userRole?: 'admin' | 'rider' | 'customer';
  onUpdateNote: (orderId: string, newNotes: string) => Promise<void>;
  compact?: boolean;
}

export const OrderNoteSection: React.FC<OrderNoteSectionProps> = ({
  orderId,
  notes = '',
  userRole = 'customer',
  onUpdateNote,
  compact = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftNote, setDraftNote] = useState(notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedNotification, setShowSavedNotification] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateNote(orderId, draftNote.trim());
      setIsEditing(false);
      setShowSavedNotification(true);
      setTimeout(() => setShowSavedNotification(false), 2500);
    } catch (err) {
      console.error('Failed to save order note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftNote(notes || '');
    setIsEditing(false);
  };

  const roleLabel =
    userRole === 'admin' ? 'এডমিন নোট' : userRole === 'rider' ? 'রাইডার নোট' : 'অর্ডার নোট';

  return (
    <div
      className={`rounded-2xl border transition-all ${
        notes
          ? 'bg-amber-50/70 border-amber-200/80 text-amber-950'
          : 'bg-slate-50 border-dashed border-slate-200 text-slate-600'
      } ${compact ? 'p-2.5 text-xs' : 'p-3.5 text-xs'}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>অর্ডারের নোট (Order Note)</span>
          {showSavedNotification && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>নোট সেভ হয়েছে!</span>
            </span>
          )}
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              setDraftNote(notes || '');
              setIsEditing(true);
            }}
            className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-white/60 transition-colors"
          >
            <Edit2 className="w-3 h-3 text-emerald-700" />
            <span>{notes ? 'নোট এডিট করুন' : '+ নোট লিখুন'}</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2 mt-2">
          <textarea
            rows={2}
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            placeholder="অর্ডারের জন্য বিশেষ নির্দেশনা বা ডেলিভারি নোট লিখুন (যেমন: কল দিয়ে আসবেন, পণ্য সাবধানে রাখবেন...)"
            className="w-full p-2.5 rounded-xl border border-amber-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 shadow-2xs"
            autoFocus
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-3.5 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl shadow-2xs flex items-center gap-1 transition-colors"
            >
              <Check className="w-3 h-3" />
              <span>{isSaving ? 'সেভ হচ্ছে...' : 'নোট সেভ করুন'}</span>
            </button>
          </div>
        </div>
      ) : notes ? (
        <p className="text-slate-700 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-amber-200/60 font-medium">
          {notes}
        </p>
      ) : (
        <p className="text-slate-400 italic text-[11px]">
          এই অর্ডারে কোনো বিশেষ নির্দেশনা বা নোট যুক্ত করা হয়নি।
        </p>
      )}
    </div>
  );
};
