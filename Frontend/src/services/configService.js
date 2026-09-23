import api from './api';

export const configService = {
  getSettings: async () => {
    try {
      const response = await api.get('/public/config');
      return response.data;
    } catch (error) {
      console.error('Error getting public settings', error);
      return { success: false, settings: { visitedCharges: 0, serviceGstPercentage: 0, partsGstPercentage: 0, instantBookingCharges: 0, servicePayoutPercentage: 0, partsPayoutPercentage: 0 } };
    }
  }
};
