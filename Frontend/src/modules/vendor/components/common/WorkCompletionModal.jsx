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
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <FiCheckCircle className="text-green-500 text-xl" />
            <h3 className="font-bold text-gray-800 text-lg">Complete Work</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Work Notes / Comments
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe work completed, remarks, etc..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm shadow-md shadow-teal-600/20"
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
