const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Referral = require('../models/Referral');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../utils/constants');

const REWARDABLE_PAYMENT_STATUSES = new Set([
  PAYMENT_STATUS.SUCCESS,
  PAYMENT_STATUS.COLLECTED_BY_VENDOR,
  PAYMENT_STATUS.PLAN_COVERED
]);

const normalizeCode = (value) => String(value || '').trim().toUpperCase();

const isStandaloneTransactionError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('transaction numbers are only allowed')
    || message.includes('transactions are not supported')
    || message.includes('replica set');
};

// Local MongoDB installations often run as a standalone server. Use a
// transaction when available, while keeping the referral flow usable locally.
const executeWithOptionalTransaction = async (work) => {
  let session;
  try {
    session = await mongoose.startSession();
    return await session.withTransaction(() => work(session));
  } catch (error) {
    if (!isStandaloneTransactionError(error)) throw error;
    return work(null);
  } finally {
    if (session) await session.endSession();
  }
};
const createCandidateCode = () => {
  const randomPart = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `QWK${randomPart}`;
};

const ensureReferralCode = async (userId) => {
  const existing = await User.findById(userId).select('referralCode');
  if (!existing) return null;
  if (existing.referralCode) return existing;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createCandidateCode();
    try {
      const updated = await User.findOneAndUpdate(
        { _id: userId, $or: [{ referralCode: null }, { referralCode: { $exists: false } }] },
        { $set: { referralCode: code } },
        { new: true, runValidators: true }
      ).select('referralCode');

      if (updated) return updated;
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }

  throw new Error('Unable to generate a unique referral code');
};

const captureReferralForNewUser = async ({ referredUserId, referralCode }) => {
  const code = normalizeCode(referralCode);
  if (!code) return { applied: false, reason: 'NO_CODE' };

  const settings = await Settings.findOne({ type: 'global' })
    .select('referralEnabled referrerRewardAmount referredRewardAmount')
    .lean();

  if (settings?.referralEnabled === false) {
    return { applied: false, reason: 'DISABLED' };
  }

  const referrer = await User.findOne({ referralCode: code }).select('_id').lean();
  if (!referrer) return { applied: false, reason: 'INVALID_CODE' };
  if (String(referrer._id) === String(referredUserId)) {
    return { applied: false, reason: 'SELF_REFERRAL' };
  }

  const work = async (session) => {
    let result = { applied: false, reason: 'ALREADY_APPLIED' };
    const queryOptions = session ? { new: true, session } : { new: true };
    const user = await User.findOneAndUpdate(
      { _id: referredUserId, referredBy: null },
      {
        $set: {
          referredBy: referrer._id,
          referralAppliedAt: new Date()
        }
      },
      queryOptions
    );

    if (!user) return result;

    const created = await Referral.create([{
      referrerId: referrer._id,
      referredUserId,
      referralCode: code,
      status: 'pending',
      referrerRewardAmount: Math.max(0, Number(settings?.referrerRewardAmount ?? 100) || 0),
      referredRewardAmount: Math.max(0, Number(settings?.referredRewardAmount ?? 100) || 0)
    }], session ? { session } : {});

    result = {
      applied: true,
      referralId: created[0]._id,
      referrerId: referrer._id
    };
    return result;
  };

  try {
    return await executeWithOptionalTransaction(work);
  } catch (error) {
    if (error?.code === 11000) {
      return { applied: false, reason: 'ALREADY_APPLIED' };
    }
    throw error;
  }
};
const getReferralSummary = async (userId) => {
  const user = await ensureReferralCode(userId);
  if (!user) return null;

  const [settings, total, pending, rewarded] = await Promise.all([
    Settings.findOne({ type: 'global' })
      .select('referralEnabled referrerRewardAmount referredRewardAmount')
      .lean(),
    Referral.countDocuments({ referrerId: userId }),
    Referral.countDocuments({ referrerId: userId, status: 'pending' }),
    Referral.countDocuments({ referrerId: userId, status: 'rewarded' })
  ]);

  return {
    referralCode: user.referralCode,
    referralEnabled: settings?.referralEnabled !== false,
    referrerRewardAmount: Math.max(0, Number(settings?.referrerRewardAmount ?? 100) || 0),
    referredRewardAmount: Math.max(0, Number(settings?.referredRewardAmount ?? 100) || 0),
    stats: { total, pending, rewarded }
  };
};

const rewardReferralForCompletedBooking = async (bookingOrId) => {
  const booking = bookingOrId?._id
    ? bookingOrId
    : await Booking.findById(bookingOrId).select('userId status paymentStatus bookingNumber').lean();

  if (!booking || booking.status !== BOOKING_STATUS.COMPLETED) {
    return { rewarded: false, reason: 'BOOKING_NOT_COMPLETED' };
  }

  if (!REWARDABLE_PAYMENT_STATUSES.has(booking.paymentStatus)) {
    return { rewarded: false, reason: 'PAYMENT_NOT_ELIGIBLE' };
  }

  const work = async (session) => {
    let result = { rewarded: false, reason: 'NO_PENDING_REFERRAL' };
    const queryOptions = session ? { new: true, session } : { new: true };
    const referral = await Referral.findOneAndUpdate(
      { referredUserId: booking.userId, status: 'pending' },
      {
        $set: {
          status: 'rewarded',
          qualifyingBookingId: booking._id,
          rewardedAt: new Date()
        }
      },
      queryOptions
    );

    if (!referral) return result;

    const referrerReward = Math.max(0, Number(referral.referrerRewardAmount) || 0);
    const referredReward = Math.max(0, Number(referral.referredRewardAmount) || 0);
    const updateOptions = session ? { new: true, session } : { new: true };
    const referrer = await User.findByIdAndUpdate(
      referral.referrerId,
      { $inc: { 'wallet.balance': referrerReward } },
      updateOptions
    );
    const referredUser = await User.findByIdAndUpdate(
      referral.referredUserId,
      { $inc: { 'wallet.balance': referredReward } },
      updateOptions
    );

    if (!referrer || !referredUser) {
      throw new Error('Referral users no longer exist');
    }

    const transactions = [];
    if (referrerReward > 0) {
      transactions.push({
        userId: referrer._id,
        amount: referrerReward,
        type: 'referral',
        paymentMethod: 'system',
        status: 'completed',
        description: `Referral reward credited for ${referredUser.name || 'a referred user'}`,
        referenceId: referral._id.toString(),
        balanceBefore: (referrer.wallet?.balance || 0) - referrerReward,
        balanceAfter: referrer.wallet?.balance || 0,
        metadata: {
          type: 'referrer_reward',
          referralId: referral._id.toString(),
          qualifyingBookingId: booking._id.toString(),
          referredUserId: referredUser._id.toString()
        }
      });
    }
    if (referredReward > 0) {
      transactions.push({
        userId: referredUser._id,
        amount: referredReward,
        type: 'referral',
        paymentMethod: 'system',
        status: 'completed',
        description: 'Referral welcome reward credited',
        referenceId: referral._id.toString(),
        balanceBefore: (referredUser.wallet?.balance || 0) - referredReward,
        balanceAfter: referredUser.wallet?.balance || 0,
        metadata: {
          type: 'referred_user_reward',
          referralId: referral._id.toString(),
          qualifyingBookingId: booking._id.toString(),
          referrerId: referrer._id.toString()
        }
      });
    }

    const createdTransactions = transactions.length > 0
      ? await Transaction.insertMany(transactions, session ? { session } : {})
      : [];

    await Referral.updateOne(
      { _id: referral._id },
      { $set: { rewardTransactionIds: createdTransactions.map(item => item._id) } },
      session ? { session } : {}
    );

    result = {
      rewarded: true,
      referralId: referral._id,
      referrerAmount: referrerReward,
      referredAmount: referredReward
    };
    return result;
  };

  return executeWithOptionalTransaction(work);
};
module.exports = {
  ensureReferralCode,
  captureReferralForNewUser,
  getReferralSummary,
  rewardReferralForCompletedBooking
};
