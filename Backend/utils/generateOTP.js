/**
 * Generate OTP and Token utilities
 */

const crypto = require('crypto');

/**
 * Generate a random OTP of specified length
 * @param {number} length - Length of OTP (default: 6)
 * @returns {string} - Generated OTP
 */
const generateOTP = (length = 6) => {
  // Default OTP only when explicitly enabled for testing
  if (process.env.USE_DEFAULT_OTP === 'true') {
    return '123456';
  }

  const digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < length; i++) {
    OTP += digits[crypto.randomInt(0, 10)];
  }
  return OTP;
};

/**
 * Generate a random token of specified length
 * @param {number} length - Length of token (default: 32)
 * @returns {string} - Generated token
 */
const generateToken = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

module.exports = {
  generateOTP,
  generateToken
};

