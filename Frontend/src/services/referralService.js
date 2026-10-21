import api from './api';

export const referralService = {
  getSummary: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.historyPage) queryParams.append('historyPage', params.historyPage);
    if (params.historyLimit) queryParams.append('historyLimit', params.historyLimit);

    const query = queryParams.toString();
    const response = await api.get(query ? '/user/referral/me?' + query : '/user/referral/me');
    return response.data;
  }
};

export default referralService;
