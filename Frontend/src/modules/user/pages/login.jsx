import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiPhone, FiArrowRight, FiChevronLeft, FiCheckCircle, FiGift } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { userAuthService } from '../../../services/authService';
import LogoLoader from '../../../components/common/LogoLoader';
import Logo from '../../../components/common/Logo';
import { z } from 'zod';

// Zod schema for phone validation
const phoneSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),
});

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpToken, setOtpToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [hasReferral, setHasReferral] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  // Focus refs
  const phoneInputRef = useRef(null);
  const otpInputRefs = useRef([]);

  // Timer countdown
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Auto-focus logic & authenticated redirect
  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      navigate('/user', { replace: true });
      return;
    }

    if (step === 'phone' && phoneInputRef.current) {
      setTimeout(() => phoneInputRef.current?.focus(), 150);
    } else if (step === 'otp' && otpInputRefs.current[0]) {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
    }
  }, [step, navigate]);

  // Handle phone submit / Send OTP
  const handlePhoneSubmit = async (e) => {
    if (e) e.preventDefault();

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const validationResult = phoneSchema.safeParse({ phone: cleanPhone });
    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const response = await userAuthService.sendOTP(cleanPhone);

      if (response.success) {
        setOtpToken(response.token || 'verification-pending');
        setIsLoading(false);
        setStep('otp');
        setResendTimer(120);
        toast.success(
          <div className="flex items-center gap-2">
            <FiCheckCircle className="text-emerald-500 text-lg" />
            <span className="font-semibold">OTP sent successfully!</span>
          </div>
        );
      } else {
        setIsLoading(false);
        toast.error(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      setIsLoading(false);
      toast.error(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    }
  };

  // OTP inputs handling
  const handleOtpChange = (index, value) => {
    if (value && !/^\d+$/.test(value)) return;

    if (value.length > 1) {
      if (index === 0 && value.length === 6) {
        const chars = value.split('');
        setOtp(chars);
        otpInputRefs.current[5]?.focus();
        return;
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Auto-verify as 6th digit is entered
  useEffect(() => {
    const otpValue = otp.join('');
    if (otpValue.length === 6 && !isLoading && otpToken) {
      handleOtpSubmit();
    }
  }, [otp]);

  // Handle OTP Verification
  const handleOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter complete 6-digit OTP');
      return;
    }
    if (!otpToken) {
      toast.error('Please request OTP first');
      return;
    }

    setIsLoading(true);
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const response = await userAuthService.verifyLogin({
        phone: cleanPhone,
        otp: otpValue
      });

      if (response.success) {
        if (response.isNewUser) {
          toast.success('Phone verified! Please complete your registration.');
          navigate('/user/signup', {
            state: {
              phone: cleanPhone,
              verificationToken: response.verificationToken,
              referralCode: referralCode.trim() || undefined
            }
          });
        } else {
          toast.success('Welcome back to Qwiklly!');
          navigate('/user', { replace: true });
        }
      } else {
        setIsLoading(false);
        toast.error(response.message || 'Verification failed');
      }
    } catch (error) {
      setIsLoading(false);
      toast.error(error.response?.data?.message || 'Verification failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Top Right: Skip Login Button */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-20">
        <button
          onClick={() => navigate('/user/location')}
          className="bg-white/80 hover:bg-white text-gray-700 hover:text-[#720C3E] font-semibold text-xs px-3.5 py-1.5 rounded-full transition-all duration-200 border border-gray-200 shadow-xs backdrop-blur-md cursor-pointer active:scale-95"
        >
          Skip login
        </button>
      </div>

      {/* Main Content Wrapper */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo & Header */}
        <div className="text-center">
          <Logo className="w-20 h-20 sm:w-24 sm:h-24 mx-auto drop-shadow-sm" />
          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 font-sans">
            Log in or Sign up
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 max-w-sm mx-auto">
            Get professional service providers in minutes!
          </p>
        </div>

        {/* Clean Auth Card */}
        <div className="mt-6 sm:mt-8 bg-white py-8 px-6 sm:px-8 shadow-xl rounded-2xl sm:rounded-3xl border border-gray-100 relative overflow-hidden">
          {/* Top Gradient Accent Line */}
          <div
            className="h-1.5 w-full absolute top-0 left-0"
            style={{ background: 'linear-gradient(to right, #347989, #D68F35, #720C3E)' }}
          />

          {step === 'phone' ? (
            /* ================= 1. PHONE ENTRY STEP ================= */
            <form onSubmit={handlePhoneSubmit} className="space-y-5">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <div className="relative rounded-xl shadow-xs group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none group-focus-within:text-[#720C3E] transition-colors">
                    <FiPhone className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="absolute inset-y-0 left-10.5 flex items-center pointer-events-none">
                    <span className="text-gray-600 font-semibold border-r border-gray-200 pr-2.5">+91</span>
                  </div>
                  <input
                    ref={phoneInputRef}
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    required
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhoneNumber(val);
                    }}
                    className="block w-full pl-24 pr-4 py-3 border border-gray-300 rounded-xl text-gray-900 font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#720C3E]/20 focus:border-[#720C3E] transition-all duration-200"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              {/* Continue Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading || phoneNumber.length < 10}
                  className={`group relative w-full flex justify-center py-3.5 px-4 text-sm font-bold rounded-xl text-white transition-all duration-300 shadow-md transform ${
                    phoneNumber.length === 10 && !isLoading
                      ? 'bg-gradient-to-r from-[#720C3E] to-[#9A2459] hover:from-[#5C0A32] hover:to-[#720C3E] shadow-[#720C3E]/25 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isLoading ? (
                    <LogoLoader fullScreen={false} inline={true} size="w-5 h-5" />
                  ) : (
                    <span className="flex items-center">
                      Get Started
                      <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </button>
              </div>

              {/* Referral Code Checkbox */}
              <div className="pt-1">
                <label className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer hover:text-[#720C3E] transition-colors">
                  <input
                    type="checkbox"
                    checked={hasReferral}
                    onChange={(e) => setHasReferral(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#720C3E] focus:ring-[#720C3E] accent-[#720C3E] cursor-pointer"
                  />
                  <span>Have a referral code?</span>
                </label>

                {/* Optional Referral Code Input */}
                {hasReferral && (
                  <div className="mt-2.5 animate-fade-in">
                    <div className="flex items-center bg-gray-50 border border-gray-200 focus-within:border-[#720C3E] focus-within:bg-white rounded-xl px-3.5 py-2 transition-all duration-200">
                      <FiGift className="text-[#720C3E] mr-2 shrink-0" />
                      <input
                        type="text"
                        placeholder="Enter referral code"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className="w-full text-xs font-semibold uppercase tracking-wider text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Terms and Privacy Policy */}
              <p className="text-[11px] text-center text-gray-500 pt-1 leading-relaxed">
                By continuing, you agree to our{' '}
                <Link to="/terms" className="underline font-semibold text-gray-700 hover:text-[#720C3E]">
                  Terms of Service
                </Link>{' '}
                &{' '}
                <Link to="/privacy" className="underline font-semibold text-gray-700 hover:text-[#720C3E]">
                  Privacy Policy
                </Link>
              </p>
            </form>
          ) : (
            /* ================= 2. OTP VERIFICATION STEP ================= */
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => {
                  setOtp(['', '', '', '', '', '']);
                  setOtpToken('');
                  setStep('phone');
                  setResendTimer(0);
                }}
                className="flex items-center text-xs font-semibold text-gray-500 hover:text-[#720C3E] transition-colors cursor-pointer"
              >
                <FiChevronLeft className="mr-1 text-sm" /> Edit Phone Number
              </button>

              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div>
                  <div className="text-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900">
                      Verify OTP
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the 6-digit code sent to <strong className="text-gray-800">+91 {phoneNumber}</strong>
                    </p>
                  </div>

                  {/* 6-Digit OTP Inputs */}
                  <div className="flex justify-between gap-1.5 sm:gap-2.5">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black border border-gray-300 rounded-xl focus:border-[#720C3E] focus:ring-2 focus:ring-[#720C3E]/20 bg-white text-gray-900 transition-all duration-200 shadow-xs"
                      />
                    ))}
                  </div>
                </div>

                {/* Resend Link */}
                <div className="text-center text-xs font-semibold">
                  <button
                    type="button"
                    onClick={async () => {
                      if (isLoading || resendTimer > 0) return;
                      try {
                        setIsLoading(true);
                        const response = await userAuthService.sendOTP(phoneNumber.replace(/\D/g, ''));
                        if (response.success) {
                          setOtpToken(response.token || 'verification-pending');
                          setResendTimer(120);
                          toast.success('OTP resent successfully!');
                        }
                      } catch (err) {
                        toast.error('Error sending OTP');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading || resendTimer > 0}
                    className="text-[#720C3E] hover:text-[#4D082A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {resendTimer > 0
                      ? `Resend OTP in ${Math.floor(resendTimer / 60)}:${String(resendTimer % 60).padStart(2, '0')}`
                      : 'Resend OTP'}
                  </button>
                </div>

                {/* Verify Button */}
                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length !== 6}
                  className={`group relative w-full flex justify-center py-3.5 px-4 text-sm font-bold rounded-xl text-white transition-all duration-300 shadow-md ${
                    otp.join('').length === 6 && !isLoading
                      ? 'bg-gradient-to-r from-[#720C3E] to-[#9A2459] hover:from-[#5C0A32] hover:to-[#720C3E] shadow-[#720C3E]/25 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isLoading ? (
                    <LogoLoader fullScreen={false} inline={true} size="w-5 h-5" />
                  ) : (
                    <span className="flex items-center">
                      Verify & Continue
                      <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
