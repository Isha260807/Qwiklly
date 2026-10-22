const { getReferralSummary } = require('../../services/referralService');

const getMyReferralSummary = async (req, res) => {
  try {
    const summary = await getReferralSummary(req.user.id);
    if (!summary) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get referral summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load referral details'
    });
  }
};

module.exports = { getMyReferralSummary };
