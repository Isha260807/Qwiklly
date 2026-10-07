import api from './api';

export const referralService = {
  getSummary: async () => {
    const response = await api.get('/user/referral/me');
    return response.data;
  }
};

export default referralService;
