import React from 'react';
import { FiAlertCircle, FiX, FiCheck, FiInfo } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { vendorTheme as themeColors } from '../../../../theme';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'warning', // warning, danger, info, success
}) => {
  const typeConfig = {
    warning: {
      icon: <FiAlertCircle className="w-8 h-8" />,
      color: '#F59E0B',
      bg: '#FEF3C7',
    },
    danger: {
      icon: <FiAlertCircle className="w-8 h-8" />,
      color: '#EF4444',
      bg: '#FEE2E2',
    },
    info: {
      icon: <FiInfo className="w-8 h-8" />,
      color: themeColors.button,
      bg: `${themeColors.button}15`,
    },
    success: {
      icon: <FiCheck className="w-8 h-8" />,
      color: '#10B981',
      bg: '#D1FAE5',
    },
  };

  const config = typeConfig[type] || typeConfig.warning;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop with Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl max-w-[320px] sm:max-w-sm w-full p-5 relative z-10 overflow-hidden"
          >
            {/* Top Shine Effect */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-30" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-4 h-4" />
            </button>

            {/* Icon Container */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{
                background: config.bg,
                color: config.color,
                boxShadow: `0 4px 12px ${config.color}20`
              }}
            >
              {config.icon}
            </div>

            {/* Content */}
            <div className="text-center mb-5">
              <h3 className="text-base font-bold text-gray-900 mb-1">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium px-1">
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 transition-all active:scale-[0.98]"
              >
                {cancelLabel}
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition-all active:scale-[0.98]"
                style={{
                  background: type === 'danger' ? 'linear-gradient(135deg, #EF4444, #DC2626)' : `linear-gradient(135deg, ${themeColors.button}, ${themeColors.button}dd)`,
                  boxShadow: `0 4px 12px ${type === 'danger' ? '#EF444430' : themeColors.button + '30'}`
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;

