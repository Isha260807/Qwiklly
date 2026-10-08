import api from './api';

export const vendorSalaryService = {
  getWallet: async (params = {}) => {
    const response = await api.get('/vendors/salary/wallet', { params });
    return response.data;
  },
  getEarnings: async (params = {}) => {
    const response = await api.get('/vendors/salary/earnings', { params });
    return response.data;
  },
  getPayments: async (params = {}) => {
    const response = await api.get('/vendors/salary/payments', { params });
    return response.data;
  }
};

export const adminSalaryService = {
  getWallets: async (params = {}) => {
    const response = await api.get('/admin/vendor-wallets', { params });
    return response.data;
  },
  getVendorWallet: async (vendorId, params = {}) => {
    const response = await api.get(`/admin/vendors/${vendorId}/salary-wallet`, { params });
    return response.data;
  },
  getVendorPayments: async (vendorId, params = {}) => {
    const response = await api.get(`/admin/vendors/${vendorId}/salary-payments`, { params });
    return response.data;
  },
  getAllPayments: async (params = {}) => {
    const response = await api.get('/admin/salary-payments', { params });
    return response.data;
  },
  updateRate: async (vendorId, data) => {
    const response = await api.patch(`/admin/vendors/${vendorId}/salary-rate`, data);
    return response.data;
  },
  markPaymentDone: async (vendorId, data) => {
    const response = await api.post(`/admin/vendors/${vendorId}/salary-payments`, data);
    return response.data;
  }
};
