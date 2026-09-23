import React from 'react';
import { FiAlertCircle, FiX } from 'react-icons/fi';
import { themeColors } from '../../theme';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'warning', // warning, danger, info
}) => {
  if (!isOpen) return null;

  const typeConfig = {
    warning: {
      iconColor: '#F59E0B',
      iconBg: '#FEF3C7',
    },
    danger: {
      iconColor: '#EF4444',
      iconBg: '#FEE2E2',
    },
    info: {
      iconColor: themeColors.button || '#00a6a6',
      iconBg: `${themeColors.button || '#00a6a6'}25`,
    },
  };

  const config = typeConfig[type] || typeConfig.warning;

  const hexToRgba = (hex, alpha) => {
    if (!hex || typeof hex !== 'string') return `rgba(0,0,0,${alpha})`;
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch (e) {
      return `rgba(0,0,0,${alpha})`;
    }
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl max-w-[320px] sm:max-w-sm w-full p-4 sm:p-5 relative animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FiX className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs"
          style={{
            background: config.iconBg,
          }}
        >
          <FiAlertCircle className="w-6 h-6" style={{ color: config.iconColor }} />
        </div>

        {/* Content */}
        <h3 className="text-base font-bold text-gray-900 text-center mb-1">{title}</h3>
        <p className="text-xs text-gray-500 text-center mb-4 leading-relaxed px-1">{message}</p>

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm border border-gray-200 text-gray-600 transition-all active:scale-95 hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white transition-all active:scale-95 hover:brightness-105 shadow-sm"
            style={{
              background: type === 'danger' ? '#EF4444' : (themeColors.button || '#00a6a6'),
              boxShadow: `0 4px 12px ${hexToRgba(type === 'danger' ? '#EF4444' : (themeColors.button || '#00a6a6'), 0.25)}`,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
