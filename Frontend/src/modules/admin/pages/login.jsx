import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../theme';
import { adminAuthService } from '../../../services/authService';
import { getFirstAccessibleAdminPath } from '../../../components/auth/adminAccess';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: 'admin@admin.com',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear validation error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const validate = () => {
    const newErrors = {};
    const emailTrimmed = (formData.email || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailTrimmed) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(emailTrimmed)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await adminAuthService.login(formData.email.trim(), formData.password, rememberMe);
      if (response.success) {
        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('adminRememberMe', 'true');
        } else {
          localStorage.removeItem('adminRememberMe');
        }
        toast.success('Login successful!');
        navigate(getFirstAccessibleAdminPath(response.admin) || '/admin/dashboard');
      } else {
        const msg = response.message || 'Login failed';
        setGeneralError(msg);
        setErrors(prev => ({ ...prev, password: msg }));
        toast.error(msg);
      }
    } catch (error) {
      const errorCode = error.response?.data?.code;
      const errorMsg = error.response?.data?.message || 'Invalid email or password. Please try again.';

      if (errorCode === 'ADMIN_DELETED') {
        setGeneralError('Your profile was deleted by admin.');
        toast.error('Your profile was deleted by admin.', { id: 'admin-deleted' });
      } else if (errorCode === 'ADMIN_BLOCKED') {
        setGeneralError('Blocked by admin.');
        toast.error('Blocked by admin', { id: 'admin-blocked' });
      } else {
        setGeneralError(errorMsg);
        setErrors(prev => ({
          ...prev,
          password: errorMsg
        }));
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: themeColors.backgroundGradient
      }}
    >
      <div className="w-full max-w-md">
        {/* White Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Brand Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/cleaning-expert-logo.png"
              alt="Qwiklly"
              className="w-16 h-16 rounded-full object-cover shadow-lg border border-gray-100"
            />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
            Admin Login
          </h1>
          <p className="text-gray-600 text-center mb-6 text-sm">
            Enter your credentials to access the admin panel
          </p>

          {/* General Error Message Banner */}
          {generalError && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
              <FiAlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-800 text-xs tracking-wide uppercase">Login Failed</p>
                <p className="text-red-700 text-xs mt-0.5">{generalError}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <FiMail className={`w-5 h-5 ${errors.email ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="admin@admin.com"
                  className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none text-gray-900 transition-colors ${
                    errors.email
                      ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                      : 'border-gray-300 focus:border-[#720c3e] focus:ring-2 focus:ring-[rgba(114,12,62,0.1)]'
                  }`}
                  required
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1.5">
                  <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <FiLock className={`w-5 h-5 ${errors.password ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:outline-none text-gray-900 transition-colors ${
                    errors.password
                      ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                      : 'border-gray-300 focus:border-[#720c3e] focus:ring-2 focus:ring-[rgba(114,12,62,0.1)]'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1.5">
                  <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{errors.password}</span>
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label htmlFor="rememberMe" className="flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 border-gray-300 rounded cursor-pointer"
                  style={{
                    accentColor: themeColors.button
                  }}
                />
                <span className="ml-2 text-sm text-gray-700">Remember me</span>
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-white font-semibold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${themeColors.button} 0%, ${themeColors.primaryLight} 100%)`,
                boxShadow: '0 4px 12px rgba(114, 12, 62, 0.18)'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(114, 12, 62, 0.28)';
                  e.currentTarget.style.background = `linear-gradient(135deg, ${themeColors.primaryDark} 0%, ${themeColors.button} 100%)`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(114, 12, 62, 0.18)';
                e.currentTarget.style.background = `linear-gradient(135deg, ${themeColors.button} 0%, ${themeColors.primaryLight} 100%)`;
              }}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Logging in...</span>
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div
            className="mt-6 p-4 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(114, 12, 62, 0.08) 0%, rgba(232, 160, 184, 0.12) 100%)',
              border: '1px solid rgba(114, 12, 62, 0.2)'
            }}
          >
            <h3 className="text-sm font-semibold mb-2" style={{ color: themeColors.button }}>Demo Credentials:</h3>
            <div className="text-sm text-gray-700 space-y-1 font-mono text-xs">
              <p><span className="font-sans font-medium text-gray-600">Email:</span> admin@admin.com</p>
              <p><span className="font-sans font-medium text-gray-600">Password:</span> admin123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
