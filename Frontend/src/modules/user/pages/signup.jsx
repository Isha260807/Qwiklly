import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FiUser, FiMail, FiPhone, FiArrowRight, FiChevronLeft, FiCheckCircle, FiShield, FiStar } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../theme';
import { userAuthService } from '../../../services/authService';
import Logo from '../../../components/common/Logo';
import LogoLoader from '../../../components/common/LogoLoader';
import { z } from 'zod';

// Zod schema
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters'),
  email: z.string().optional().refine(val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Invalid email address'),
  phoneNumber: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number'),
});

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState('details'); // 'details' or 'otp'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: ''
  });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpToken, setOtpToken] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Timer countdown effect
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Refs for auto-focus
  const nameInputRef = useRef(null);
  const otpInputRefs = useRef([]);

  // Pre-fill from navigation state (Unified Flow)
  useEffect(() => {
    if (location.state?.phone && location.state?.verificationToken) {
      setFormData(prev => ({ ...prev, phoneNumber: location.state.phone }));
      setVerificationToken(location.state.verificationToken);
    }
  }, [location.state]);

  useEffect(() => {
    const code = location.state?.referralCode || new URLSearchParams(location.search).get('ref');
    if (code) setReferralCode(String(code).trim().toUpperCase());
  }, [location.state, location.search]);

  // Auto-focus logic
  useEffect(() => {
    if (step === 'details' && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 150);
    } else if (step === 'otp' && otpInputRefs.current[0]) {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
    }
  }, [step]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();

    // Zod Validation
    const validationResult = signupSchema.safeParse(formData);

    if (!validationResult.success) {
      validationResult.error.errors.forEach(err => toast.error(err.message));
      return;
    }

    setIsLoading(true);

    if (verificationToken) {
      try {
        const response = await userAuthService.register({
          name: formData.name,
          email: formData.email || null,
          verificationToken,
          referralCode: referralCode || undefined
        });
        if (response.success) {
          try {
            const { registerFCMToken } = await import('../../../services/pushNotificationService');
            await registerFCMToken('user', true);
          } catch (e) {
            console.error('FCM Registration error:', e);
          }

          toast.success(
            <div className="flex flex-col">
              <span className="font-bold">Welcome to Qwiklly!</span>
              <span className="text-xs">Your account has been created successfully.</span>
            </div>,
            { icon: <FiCheckCircle className="text-emerald-500" /> }
          );
          navigate('/user');
        } else {
          toast.error(response.message || 'Registration failed');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Registration failed');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const response = await userAuthService.sendOTP(formData.phoneNumber, formData.email || null);
      if (response.success) {
        setOtpToken(response.token);
        setIsLoading(false);
        setStep('otp');
        setResendTimer(120); // Start timer
        toast.success('OTP sent successfully');
      } else {
        setIsLoading(false);
        toast.error(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      setIsLoading(false);
      toast.error(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleOtpChange = (index, value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue && value !== '') return;

    if (cleanValue.length > 1) {
      if (index === 0 && cleanValue.length === 6) {
        const chars = cleanValue.split('');
        setOtp(chars);
        otpInputRefs.current[5]?.focus();
        return;
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanValue;
    setOtp(newOtp);

    if (cleanValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Auto-verify as last digit enters
  useEffect(() => {
    const otpValue = otp.join('');
    if (otpValue.length === 6 && !isLoading && otpToken) {
      handleOtpSubmit();
    }
  }, [otp]);

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
      const response = await userAuthService.register({
        name: formData.name,
        email: formData.email || null,
        phone: formData.phoneNumber,
        otp: otpValue,
        token: otpToken,
        referralCode: referralCode || undefined
      });
      if (response.success) {
        setIsLoading(false);
        try {
          const { registerFCMToken } = await import('../../../services/pushNotificationService');
          await registerFCMToken('user', true);
        } catch (fcmError) {
          console.error('FCM Registration failed on signup:', fcmError);
        }

        toast.success(
          <div className="flex flex-col">
            <span className="font-bold">Welcome to Qwiklly!</span>
            <span className="text-xs">Account created successfully.</span>
          </div>,
          { icon: <FiCheckCircle className="text-emerald-500" /> }
        );
        navigate('/user');
      } else {
        setIsLoading(false);
        toast.error(response.message || 'Registration failed');
      }
    } catch (error) {
      setIsLoading(false);
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFF7FA] flex flex-col justify-center py-6 sm:py-12 px-3.5 sm:px-6 lg:px-8 relative overflow-x-hidden">
      {/* Soft Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#720C3E]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#9A2459]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md md:max-w-lg text-center mb-5 sm:mb-7 relative z-10 animate-fade-in">
        <div className="flex justify-center mb-2 sm:mb-3">
          <Logo className="h-12 sm:h-16 w-auto transform hover:scale-105 transition-transform duration-300" />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#24151D] tracking-tight">
          {step === 'details' ? 'Create Account' : 'Verify Phone'}
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm md:text-base text-[#6F5A64] max-w-xs sm:max-w-sm mx-auto">
          {step === 'details' 
            ? 'Join Qwiklly to start booking verified home services' 
            : `Enter the 6-digit code sent to +91 ${formData.phoneNumber}`}
        </p>
      </div>

      {/* Main Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md md:max-w-lg relative z-10 w-full">
        <div className="bg-white py-6 sm:py-9 px-4 sm:px-8 md:px-10 shadow-xl shadow-[#720C3E]/5 rounded-2xl sm:rounded-3xl border border-[#E8D9DF] relative overflow-hidden">
          {/* Top Brand Accent Gradient Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#720C3E] via-[#9A2459] to-[#E8A0B8]" />

          {step === 'details' ? (
            /* DETAILS STEP */
            <form onSubmit={handleDetailsSubmit} className="space-y-4 sm:space-y-5">
              {verificationToken && (
                <button
                  type="button"
                  onClick={() => navigate('/user/login')}
                  className="flex items-center text-xs sm:text-sm font-semibold text-[#6F5A64] hover:text-[#720C3E] transition-colors mb-2 cursor-pointer"
                >
                  <FiChevronLeft className="mr-0.5 text-base" /> Back to Login
                </button>
              )}

              {/* Full Name */}
              <div>
                <label htmlFor="name" className="block text-xs sm:text-sm font-bold text-[#24151D] mb-1">
                  Full Name
                </label>
                <div className="relative rounded-xl shadow-2xs group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#720C3E] transition-colors">
                    <FiUser className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <input
                    ref={nameInputRef}
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="block w-full pl-10 sm:pl-11 pr-3.5 py-2.5 sm:py-3.5 border-2 border-[#E8D9DF] rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold text-[#24151D] placeholder:text-[#6F5A64]/40 focus:outline-none focus:border-[#720C3E] focus:ring-2 focus:ring-[#720C3E]/10 transition-all bg-white"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Email (Optional) */}
              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-bold text-[#24151D] mb-1">
                  Email <span className="text-gray-400 text-[11px] font-normal ml-1">(Optional)</span>
                </label>
                <div className="relative rounded-xl shadow-2xs group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#720C3E] transition-colors">
                    <FiMail className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full pl-10 sm:pl-11 pr-3.5 py-2.5 sm:py-3.5 border-2 border-[#E8D9DF] rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold text-[#24151D] placeholder:text-[#6F5A64]/40 focus:outline-none focus:border-[#720C3E] focus:ring-2 focus:ring-[#720C3E]/10 transition-all bg-white"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Phone Number (if not verified already) */}
              {!verificationToken && (
                <div>
                  <label htmlFor="phoneNumber" className="block text-xs sm:text-sm font-bold text-[#24151D] mb-1">
                    Phone Number
                  </label>
                  <div className="relative rounded-xl shadow-2xs group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#720C3E] transition-colors">
                      <FiPhone className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="absolute inset-y-0 left-10 sm:left-11 flex items-center pointer-events-none">
                      <span className="text-[#24151D] font-bold text-xs sm:text-sm border-r border-[#E8D9DF] pr-2">+91</span>
                    </div>
                    <input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      inputMode="numeric"
                      required
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      className="block w-full pl-22 sm:pl-24 pr-3.5 py-2.5 sm:py-3.5 border-2 border-[#E8D9DF] rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold text-[#24151D] placeholder:text-[#6F5A64]/40 focus:outline-none focus:border-[#720C3E] focus:ring-2 focus:ring-[#720C3E]/10 transition-all bg-white"
                      placeholder="9876543210"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 sm:pt-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold bg-gradient-to-r from-[#720C3E] to-[#9A2459] text-white shadow-md shadow-[#720C3E]/20 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <LogoLoader fullScreen={false} inline={true} size="w-5 h-5" />
                  ) : (
                    <span className="flex items-center gap-1.5">
                      {verificationToken ? 'Complete Registration' : 'Send OTP'}
                      <FiArrowRight className="text-base" />
                    </span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* OTP STEP */
            <div className="space-y-5 sm:space-y-6 animate-fade-in">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="flex items-center text-xs sm:text-sm font-semibold text-[#6F5A64] hover:text-[#720C3E] transition-colors cursor-pointer"
              >
                <FiChevronLeft className="mr-0.5 text-base" /> Edit details
              </button>

              <form onSubmit={handleOtpSubmit} className="space-y-5 sm:space-y-6">
                {/* 6-Grid OTP Inputs */}
                <div className="grid grid-cols-6 gap-2 sm:gap-3 py-1 w-full max-w-sm mx-auto">
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
                      className="w-full h-11 sm:h-14 aspect-square text-center text-lg sm:text-2xl font-black border-2 border-[#E8D9DF] rounded-xl sm:rounded-2xl focus:border-[#720C3E] focus:ring-2 focus:ring-[#720C3E]/20 bg-white text-[#24151D] transition-all shadow-2xs"
                    />
                  ))}
                </div>

                {/* Resend Code Link */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={async () => {
                      if (resendTimer > 0) return;
                      try {
                        const response = await userAuthService.sendOTP(formData.phoneNumber, formData.email || null);
                        if (response.success) {
                          setOtpToken(response.token);
                          setResendTimer(120);
                          toast.success('New code sent!');
                        }
                      } catch (error) {
                        toast.error('Failed to resend code');
                      }
                    }}
                    disabled={resendTimer > 0}
                    className="text-xs sm:text-sm font-bold text-[#720C3E] hover:text-[#4D082A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {resendTimer > 0
                      ? `Resend code in ${Math.floor(resendTimer / 60)}:${String(resendTimer % 60).padStart(2, '0')}`
                      : 'Resend code'}
                  </button>
                </div>

                {/* Create Account Button */}
                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length !== 6}
                  className={`w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-md ${
                    otp.join('').length === 6 && !isLoading
                      ? 'bg-gradient-to-r from-[#720C3E] to-[#9A2459] hover:opacity-95 text-white shadow-[#720C3E]/20 active:scale-[0.99] cursor-pointer'
                      : 'bg-[#6F5A64]/15 text-[#6F5A64]/50 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isLoading ? (
                    <LogoLoader fullScreen={false} inline={true} size="w-5 h-5" />
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Create Account
                      <FiArrowRight className="text-base" />
                    </span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        <p className="mt-5 sm:mt-6 text-center text-xs sm:text-sm text-[#6F5A64]">
          Already have an account?{' '}
          <Link to="/user/login" className="font-bold text-[#720C3E] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
