import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiPhone, FiCheckCircle, FiChevronLeft, FiGift } from 'react-icons/fi';
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

// Curated high quality on-demand home service photos for 3 marquee rows
const ROW_1_IMAGES = [
  { url: row1_1, alt: 'Kitchen Counter Cleaning' },
  { url: row1_2, alt: 'Bathroom Deep Clean' },
  { url: row1_3, alt: 'Floor Sweeping & Care' },
  { url: row1_4, alt: 'Housekeeping Service' },
  { url: row1_5, alt: 'AC Maintenance & Servicing' }
];

const ROW_2_IMAGES = [
  { url: row2_1, alt: 'Utensil & Sink Cleaning' },
  { url: row2_2, alt: 'Floor Mopping & Sanitation' },
  { url: row2_3, alt: 'Table & Furniture Dusting' },
  { url: row2_4, alt: 'Electrician & Switchboard Repair' },
  { url: row2_5, alt: 'Plumbing & Pipe Repair' }
];

const ROW_3_IMAGES = [
  { url: row3_1, alt: 'Ceiling Fan & Appliance Dusting' },
  { url: row3_2, alt: 'Window Glass Spray Cleaning' },
  { url: row3_3, alt: 'Laundry & Washing Machine Help' },
  { url: row3_4, alt: 'Living Room Sofa & Upholstery Care' },
  { url: row3_5, alt: 'Home Painting & Touchups' }
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

  // Helper render for Marquee Row
  const renderMarqueeRow = (images, animationClass) => {
    // Duplicate array twice for seamless 50% loop
    const loopedImages = [...images, ...images];
    return (
      <div className="overflow-hidden w-full flex items-center py-1">
        <div className={animationClass}>
          {loopedImages.map((img, idx) => (
            <div
              key={`${idx}-${img.alt}`}
              className="flex-shrink-0 mx-1 sm:mx-1.5 rounded-2xl overflow-hidden shadow-xs border-[1.5px] border-white/90 bg-[#F5E6ED] transition-transform duration-300 hover:scale-105"
            >
              <img
                src={img.url}
                alt={img.alt}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="w-28 h-20 sm:w-32 sm:h-22 object-cover rounded-2xl contrast-[1.08] saturate-[1.10] brightness-[1.03]"
                style={{ imageRendering: '-webkit-optimize-contrast' }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FFF7FA] flex justify-center items-center sm:py-8 sm:px-4">
      {/* Main Container Phone Frame / Card */}
      <div className="w-full max-w-md min-h-screen sm:min-h-[780px] bg-white sm:rounded-3xl sm:shadow-2xl sm:border sm:border-[#E8D9DF] flex flex-col justify-between overflow-hidden relative select-none">
        
        {/* ================= 1. HEADER SECTION ================= */}
        <div className="bg-gradient-to-br from-[#C2457C] via-[#AB2D65] to-[#8C1B4E] text-white pt-7 pb-8 px-6 rounded-b-[40px] shadow-lg shadow-[#AB2D65]/25 relative z-20">
          {/* Top Row: Skip login button */}
          <div className="flex justify-end items-center mb-1">
            <button
              onClick={() => navigate('/user/location')}
              className="bg-white/20 hover:bg-white/35 active:scale-95 text-white font-semibold text-xs px-3.5 py-1.5 rounded-full transition-all duration-200 backdrop-blur-md cursor-pointer border border-white/40 shadow-xs"
            >
              Skip login
            </button>
          </div>

          {/* Brand Name & Tagline */}
          <div className="text-center">
            <h1
              className="text-3xl sm:text-4xl font-black tracking-tight !text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)] font-sans"
              style={{ color: '#ffffff' }}
            >
              Qwiklly
            </h1>
            <p
              className="text-sm sm:text-base font-semibold mt-2 leading-snug max-w-[280px] mx-auto drop-shadow-xs !text-white"
              style={{ color: '#ffffff' }}
            >
              Get professional service providers in minutes!
            </p>
          </div>
        </div>

        {/* ================= 2. ANIMATED 3-ROW IMAGE MARQUEE ================= */}
        <div className="relative pt-3 pb-2 overflow-hidden flex flex-col gap-2">
          {/* Top Soft Blend Gradient */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#FFF7FA] to-transparent z-10" />

          {/* Row 1: Right to Left */}
          {renderMarqueeRow(ROW_1_IMAGES, 'animate-marquee-left')}

          {/* Row 2: Left to Right */}
          {renderMarqueeRow(ROW_2_IMAGES, 'animate-marquee-right')}

          {/* Row 3: Right to Left */}
          {renderMarqueeRow(ROW_3_IMAGES, 'animate-marquee-left')}
        </div>

        {/* ================= 3. BOTTOM LOGIN / SIGNUP CARD ================= */}
        <div className="px-6 pb-8 pt-2 relative z-20 bg-white -mt-6">
          {/* Soft White Gradient Shadow Veil Rising from Top of Card */}
          <div className="pointer-events-none absolute -top-20 inset-x-0 h-20 bg-gradient-to-t from-white via-white/80 to-transparent" />

          {step === 'phone' ? (
            /* PHONE ENTRY STEP */
            <form onSubmit={handlePhoneSubmit} className="space-y-4 relative z-10">
              <div className="text-left mb-3">
                <h2 className="text-2xl sm:text-3xl font-black text-[#24151D] tracking-tight">
                  Log in or Sign up
                </h2>
              </div>

              {/* Mobile Input Field */}
              <div className="relative">
                <div className="flex items-center bg-white border-2 border-[#E8D9DF] focus-within:border-[#720C3E] rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
                  <div className="px-4 py-3.5 bg-transparent border-r border-[#E8D9DF] text-[#24151D] font-bold text-base flex items-center gap-1.5">
                    <span className="text-[#24151D]">+91</span>
                  </div>
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    id="phone"
                    maxLength={10}
                    className="w-full px-4 py-3.5 text-base font-semibold text-[#24151D] placeholder:text-[#6F5A64]/45 focus:outline-none bg-transparent"
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
                className={`w-full py-3.5 px-4 rounded-2xl text-base font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-md ${
                  phoneNumber.length === 10 && !isLoading
                    ? 'bg-[#720C3E] hover:bg-[#4D082A] text-white shadow-[#720C3E]/25 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer'
                    : 'bg-[#6F5A64]/20 text-[#6F5A64]/60 cursor-not-allowed shadow-none'
                }`}
              >
                {isLoading ? (
                  <LogoLoader fullScreen={false} inline={true} size="w-6 h-6" />
                ) : (
                  <span>Continue</span>
                )}
              </button>

              {/* Referral Code Checkbox */}
              <div className="pt-1">
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
                  <div className="mt-2.5 animate-fade-in">
                    <div className="flex items-center bg-white border border-[#E8D9DF] focus-within:border-[#720C3E] rounded-xl px-3 py-2 shadow-xs">
                      <FiGift className="text-[#720C3E] mr-2" />
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
              <p className="text-[11px] text-center text-[#6F5A64] pt-2 leading-relaxed">
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
            <form onSubmit={handleOtpSubmit} className="space-y-4 animate-fade-in">
              <div className="text-left mb-2">
                <h2 className="text-2xl font-black text-[#24151D] tracking-tight">
                  Verify OTP
                </h2>
                <p className="text-xs text-[#6F5A64] mt-0.5">
                  Enter 6-digit code sent to <strong className="text-[#24151D]">+91 {phoneNumber}</strong>
                </p>
              </div>

              {/* 6 Digit Inputs */}
              <div className="flex justify-between gap-1.5 sm:gap-2 py-2">
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
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black border-2 border-[#E8D9DF] rounded-2xl focus:border-[#720C3E] focus:ring-2 focus:ring-[#720C3E]/20 bg-white text-[#24151D] transition-all duration-200 shadow-sm"
                  />
                ))}
              </div>

              {/* Resend & Change Phone Number Links */}
              <div className="flex items-center justify-between text-xs font-semibold pt-1">
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
                  <FiChevronLeft className="mr-0.5 text-sm" /> Change Number
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
                  className="text-[#720C3E] hover:text-[#4D082A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                className={`w-full py-3.5 px-4 rounded-2xl text-base font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-md ${
                  otp.join('').length === 6 && !isLoading
                    ? 'bg-[#720C3E] hover:bg-[#4D082A] text-white shadow-[#720C3E]/25 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer'
                    : 'bg-[#6F5A64]/20 text-[#6F5A64]/60 cursor-not-allowed shadow-none'
                }`}
              >
                {isLoading ? (
                  <LogoLoader fullScreen={false} inline={true} size="w-6 h-6" />
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
