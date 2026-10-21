import React from 'react';
import { FiFileText } from 'react-icons/fi';

const getWorkDoneNote = (booking) => {
  const candidates = [
    booking?.workDoneDetails?.notes,
    booking?.vendorNotes,
    booking?.workerNotes
  ];

  return candidates.find((value) => (
    typeof value === 'string' && value.trim().length > 0
  ))?.trim() || '';
};

const WorkDoneNote = ({ booking, className = '' }) => {
  const note = getWorkDoneNote(booking);

  if (!note) return null;

  return (
    <section className={`bg-amber-50 rounded-2xl p-4 border border-amber-100 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <FiFileText className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Work Done Note</h3>
          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">Added by professional</p>
        </div>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{note}</p>
    </section>
  );
};

export default WorkDoneNote;
