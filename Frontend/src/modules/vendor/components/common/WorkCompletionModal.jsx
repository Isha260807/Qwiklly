import React, { useState } from 'react';
import { FiX, FiCheckCircle, FiUploadCloud } from 'react-icons/fi';
import ImageUploader from './ImageUploader';

const WorkCompletionModal = ({ isOpen, onClose, job, onComplete, loading }) => {
  const [completionPhotos, setCompletionPhotos] = useState([]);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onComplete) {
      onComplete({ photos: completionPhotos, notes });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-[310px] xs:max-w-xs rounded-2xl p-4 shadow-2xl mx-auto">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1.5">
            <FiCheckCircle className="text-emerald-600 text-lg" />
            <h3 className="font-bold text-gray-900 text-base">Complete Work</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Work Notes / Comments
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe work completed, remarks, etc..."
              rows={2}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#720C3E] focus:ring-1 focus:ring-[#720C3E]/20 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 text-white font-bold rounded-xl hover:brightness-105 transition-all disabled:opacity-50 text-xs shadow-xs cursor-pointer"
              style={{ background: '#720C3E' }}
            >
              {loading ? 'Submitting...' : 'Mark Completed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkCompletionModal;
