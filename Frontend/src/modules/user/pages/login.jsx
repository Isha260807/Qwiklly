import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiCheckCircle, FiChevronLeft, FiGift, FiShield, FiZap, FiStar, FiClock } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { userAuthService } from '../../../services/authService';
import LogoLoader from '../../../components/common/LogoLoader';
import { z } from 'zod';

// Zod schema for phone validation
const phoneSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),
});

// Local image assets for marquee rows
import row1_1 from '../../../assets/images/login/row1_1.jpg';
import row1_2 from '../../../assets/images/login/row1_2.jpg';
import row1_3 from '../../../assets/images/login/row1_3.jpg';
import row1_4 from '../../../assets/images/login/row1_4.jpg';
import row1_5 from '../../../assets/images/login/row1_5.jpg';

import row2_1 from '../../../assets/images/login/row2_1.jpg';
import row2_2 from '../../../assets/images/login/row2_2.jpg';
import row2_3 from '../../../assets/images/login/row2_3.jpg';
import row2_4 from '../../../assets/images/login/row2_4.jpg';
import row2_5 from '../../../assets/images/login/row2_5.jpg';

import row3_1 from '../../../assets/images/login/row3_1.jpg';
import row3_2 from '../../../assets/images/login/row3_2.jpg';
import row3_3 from '../../../assets/images/login/row3_3.jpg';
import row3_4 from '../../../assets/images/login/row3_4.jpg';
import row3_5 from '../../../assets/images/login/row3_5.jpg';

const ROW_1_IMAGES = [
  { url: row1_1, alt: 'Kitchen Countertop Wiping' },
  { url: row1_2, alt: 'Toilet & Bathroom Sanitation' },
  { url: row1_3, alt: 'Floor Sweeping with Dustpan' },
  { url: row1_4, alt: 'Stovetop & Kitchen Backsplash Cleaning' },
  { url: row1_5, alt: 'Bathroom Sink & Faucet Polish' }
];

const ROW_2_IMAGES = [
  { url: row2_1, alt: 'Utensil & Pan Washing in Sink' },
  { url: row2_2, alt: 'Microfiber Floor Mopping' },
  { url: row2_3, alt: 'Living Room Table Dusting' },
  { url: row2_4, alt: 'Sofa & Fabric Vacuum Cleaning' },
  { url: row2_5, alt: 'Kitchen Shelves & Pantry Organization' }
];

const ROW_3_IMAGES = [
  { url: row3_1, alt: 'Ceiling Fan Dusting & Wiping' },
  { url: row3_2, alt: 'Window Glass Spray Cleaning' },
  { url: row3_3, alt: 'Laundry Wash & Towel Care' },
  { url: row3_4, alt: 'Kitchen Cooktop Surface Care' },
  { url: row3_5, alt: 'Chrome Faucet & Basin Detailing' }
];

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

  // Helper render for Marquee Row
  const renderMarqueeRow = (images, animationClass) => {
    const loopedImages = [...images, ...images];
    return (
      <div className="overflow-hidden w-full flex items-center py-0.5 sm:py-1">
        <div className={animationClass}>
          {loopedImages.map((img, idx) => (
            <div
              key={`${idx}-${img.alt}`}
              className="flex-shrink-0 mx-1 sm:mx-1.5 rounded-xl sm:rounded-2xl overflow-hidden shadow-xs border-[1.5px] border-white/90 bg-[#F5E6ED] transition-transform duration-300 hover:scale-105"
            >
              <img
                src={img.url}
                alt={img.alt}
                loading="eager"
                decoding="async"
                className="w-24 h-16 xs:w-28 xs:h-18 sm:w-32 sm:h-22 object-cover rounded-xl sm:rounded-2xl contrast-[1.08] saturate-[1.10] brightness-[1.03]"
                style={{ imageRendering: '-webkit-optimize-contrast' }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFF7FA] flex justify-center items-center p-0 sm:p-6 lg:p-10">
      {/* Main Container */}
      <div className="w-full max-w-md lg:max-w-4xl min-h-[100dvh] sm:min-h-0 bg-white sm:rounded-3xl sm:shadow-2xl sm:border sm:border-[#E8D9DF] flex flex-col lg:grid lg:grid-cols-12 overflow-hidden relative select-none">

        {/* ================= MOBILE / TABLET TOP HEADER (< lg) ================= */}
        <div className="lg:hidden bg-gradient-to-br from-[#720C3E] via-[#8C1B4E] to-[#9A2459] text-white rounded-b-[36px] sm:rounded-b-[44px] px-5 pt-3 pb-6 shadow-md relative">
          {/* Top Row / Skip Login */}
          <div className="flex justify-end items-center mb-1">
            <button
              onClick={() => navigate('/user/location')}
              className="bg-white/20 hover:bg-white/35 active:scale-95 text-white font-semibold text-[11px] sm:text-xs px-3.5 py-1.5 rounded-full transition-all duration-200 backdrop-blur-md cursor-pointer border border-white/30 shadow-xs"
            >
              Skip login
            </button>
          </div>

          {/* Brand Name & Tagline */}
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm font-sans">
              Qwiklly
            </h1>
            <p className="text-xs sm:text-sm font-bold mt-1 leading-snug max-w-[270px] mx-auto text-white/95">
              Get professional house help in minutes!
            </p>
          </div>
        </div>

        {/* ================= MOBILE / TABLET 3-ROW IMAGE MARQUEE (< lg) ================= */}
        <div className="lg:hidden relative pt-2.5 pb-1 overflow-hidden flex flex-col gap-1 sm:gap-1.5 my-1 bg-white">
          {renderMarqueeRow(ROW_1_IMAGES, 'animate-marquee-left')}
          {renderMarqueeRow(ROW_2_IMAGES, 'animate-marquee-right')}
          {renderMarqueeRow(ROW_3_IMAGES, 'animate-marquee-left')}
          
          {/* Subtle smooth fade out at bottom of row 3 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white via-white/40 to-transparent z-10" />
        </div>

        {/* ================= DESKTOP LEFT SIDEBAR (>= lg) ================= */}
        <div className="hidden lg:flex lg:col-span-6 bg-gradient-to-br from-[#720C3E] via-[#8C1B4E] to-[#AB2D65] text-white flex-col justify-between p-8 lg:p-9 relative overflow-hidden rounded-l-3xl">
          <div className="flex justify-between items-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold tracking-wide backdrop-blur-md border border-white/20">
              <FiZap className="w-3.5 h-3.5 text-amber-300" /> Fast & Verified
            </span>
            <button
              onClick={() => navigate('/user/location')}
              className="bg-white/20 hover:bg-white/35 active:scale-95 text-white font-semibold text-xs px-3.5 py-1.5 rounded-full transition-all duration-200 backdrop-blur-md cursor-pointer border border-white/30 shadow-xs"
            >
              Skip login
            </button>
          </div>

          <div className="my-6">
            <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-sm font-sans">
              Qwiklly
            </h1>
            <p className="text-base font-semibold mt-2 leading-snug max-w-sm text-white/95">
              Get professional house help in minutes!
            </p>
          </div>

          {/* Desktop Marquee */}
          <div className="relative pt-2 pb-1 overflow-hidden flex flex-col gap-1.5 my-2">
            {renderMarqueeRow(ROW_1_IMAGES, 'animate-marquee-left')}
            {renderMarqueeRow(ROW_2_IMAGES, 'animate-marquee-right')}
            {renderMarqueeRow(ROW_3_IMAGES, 'animate-marquee-left')}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/20 text-center text-[11px] font-bold text-white/90">
            <div className="flex flex-col items-center gap-1">
              <FiShield className="w-4 h-4 text-amber-300" />
              <span>100% Verified</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <FiClock className="w-4 h-4 text-amber-300" />
              <span>Instant Arrival</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <FiStar className="w-4 h-4 text-amber-300" />
              <span>Top Rated</span>
            </div>
          </div>
        </div>

        {/* ================= FORM SECTION (LOGIN / OTP) ================= */}
        <div className="lg:col-span-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10 flex flex-col justify-center relative z-20 bg-white">
          {step === 'phone' ? (
            /* PHONE ENTRY STEP */
            <form onSubmit={handlePhoneSubmit} className="space-y-3.5 max-w-sm mx-auto w-full">
              <div className="text-center mb-3">
                <h2 className="text-2xl sm:text-3xl font-black text-[#24151D] tracking-tight">
                  Log in or Sign up
                </h2>
              </div>

              {/* Mobile Input Field */}
              <div className="relative">
                <div className="flex items-center bg-white border-2 border-[#E8D9DF] focus-within:border-[#720C3E] rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
                  <div className="px-3.5 sm:px-4 py-3 sm:py-3.5 bg-gray-50/50 border-r border-[#E8D9DF] text-[#24151D] font-bold text-sm sm:text-base flex items-center shrink-0">
                    <span>+91</span>
                  </div>
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    id="phone"
                    maxLength={10}
                    className="w-full px-3.5 sm:px-4 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-[#24151D] placeholder:text-[#6F5A64]/45 focus:outline-none bg-transparent"
                    placeholder="Enter mobile number"
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) setPhoneNumber(val);
                    }}
                  />
                </div>
              </div>

              {/* Continue Button */}
              <button
                type="submit"
                disabled={isLoading || phoneNumber.length < 10}
                className={`w-full py-3 sm:py-3.5 px-4 rounded-2xl text-sm sm:text-base font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-md ${
                  phoneNumber.length === 10 && !isLoading
                    ? 'bg-gradient-to-r from-[#720C3E] to-[#9A2459] hover:opacity-95 text-white shadow-[#720C3E]/20 active:scale-[0.99] cursor-pointer'
                    : 'bg-[#6F5A64]/15 text-[#6F5A64]/50 cursor-not-allowed shadow-none'
                }`}
              >
                {isLoading ? (
                  <LogoLoader fullScreen={false} inline={true} size="w-5 h-5" />
                ) : (
                  <span>Continue</span>
                )}
              </button>

              {/* Referral Code Checkbox */}
              <div className="pt-0.5">
                <label className="flex items-center justify-center gap-2 text-xs font-semibold text-[#24151D] cursor-pointer hover:text-[#720C3E] transition-colors">
                  <input
                    type="checkbox"
                    checked={hasReferral}
                    onChange={(e) => setHasReferral(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E8D9DF] text-[#720C3E] focus:ring-[#720C3E] accent-[#720C3E] cursor-pointer"
                  />
                  <span>Have a referral code?</span>
                </label>

                {/* Optional Referral Code Slide-In */}
                {hasReferral && (
                  <div className="mt-2 animate-fade-in">
                    <div className="flex items-center bg-white border border-[#E8D9DF] focus-within:border-[#720C3E] rounded-xl px-3 py-2 shadow-2xs">
                      <FiGift className="text-[#720C3E] mr-2 shrink-0" />
                      <input
                        type="text"
                        placeholder="Enter referral code"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className="w-full text-xs font-semibold uppercase tracking-wider text-[#24151D] placeholder:text-[#6F5A64]/40 focus:outline-none bg-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Terms and Privacy Policy */}
              <p className="text-[10px] sm:text-[11px] text-center text-[#6F5A64] pt-1 leading-relaxed">
                By continuing, you agree to our{' '}
                <Link to="/terms" className="underline font-semibold text-[#24151D] hover:text-[#720C3E]">
                  Terms of Service
                </Link>{' '}
                &{' '}
                <Link to="/privacy" className="underline font-semibold text-[#24151D] hover:text-[#720C3E]">
                  Privacy Policy
                </Link>
              </p>
            </form>
          ) : (
            /* OTP VERIFICATION STEP */
            <form onSubmit={handleOtpSubmit} className="space-y-4 max-w-sm mx-auto w-full animate-fade-in">
              <div className="text-left mb-1">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#24151D] tracking-tight">
                  Verify OTP
                </h2>
                <p className="text-xs sm:text-sm text-[#6F5A64] mt-1">
                  Enter 6-digit code sent to <strong className="text-[#24151D] font-bold">+91 {phoneNumber}</strong>
                </p>
              </div>

              {/* 6 Digit Adaptive Inputs (Grid on all screens) */}
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5 py-1.5 w-full">
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
                    className="w-full h-11 sm:h-13 aspect-square text-center text-lg sm:text-xl font-black border-2 border-[#E8D9DF] rounded-xl sm:rounded-2xl focus:border-[#720C3E] focus:ring-2 focus:ring-[#720C3E]/20 bg-white text-[#24151D] transition-all duration-200 shadow-2xs"
                  />
                ))}
              </div>

              {/* Resend & Change Phone Number Links */}
              <div className="flex items-center justify-between text-xs sm:text-sm font-semibold pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setOtp(['', '', '', '', '', '']);
                    setOtpToken('');
                    setStep('phone');
                    setResendTimer(0);
                  }}
                  className="flex items-center text-[#6F5A64] hover:text-[#720C3E] transition-colors cursor-pointer"
                >
                  <FiChevronLeft className="mr-0.5 text-base" /> Change Number
                </button>

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
                  className="text-[#720C3E] hover:text-[#4D082A] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {resendTimer > 0
                    ? `Resend in ${Math.floor(resendTimer / 60)}:${String(resendTimer % 60).padStart(2, '0')}`
                    : 'Resend OTP'}
                </button>
              </div>

              {/* Verify & Continue Button */}
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
                  <span>Verify & Continue</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
