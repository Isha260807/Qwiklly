import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiArrowRight, FiUser, FiLock, FiPhone, FiEye, FiEyeOff } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LoginModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const [loginData, setLoginData] = useState({ phone: '', password: '' });
  const [signupData, setSignupData] = useState({ name: '', phone: '', password: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/user/auth/login`, {
        phone: loginData.phone,
        password: loginData.password,
      });
      if (res.data?.success) {
        const { accessToken, refreshToken, user } = res.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('userData', JSON.stringify(user));
        onClose();
        navigate('/user');
      } else {
        setError(res.data?.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid credentials. Please check and retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/user/auth/register`, {
        name: signupData.name,
        phone: signupData.phone,
        password: signupData.password,
      });
      if (res.data?.success) {
        const { accessToken, refreshToken, user } = res.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('userData', JSON.stringify(user));
        onClose();
        navigate('/user');
      } else {
        setError(res.data?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-[#E8D9DF] overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#720C3E] via-[#9A2459] to-[#E8A0B8]" />

              <div className="px-6 pt-7 pb-5 border-b border-[#E8D9DF]/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#FFF7FA] border border-[#E8D9DF] flex items-center justify-center p-1">
                      <img src="/cleaning-expert-logo.png" alt="Qwiklly" className="w-full h-full object-cover rounded-md" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-[#24151D] leading-tight">
                        {tab === 'login' ? 'Welcome Back!' : 'Join Qwiklly'}
                      </h2>
                      <p className="text-[11px] text-[#6F5A64] font-medium">
                        {tab === 'login' ? 'Login to book your service' : 'Create your free account'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-[#FFF7FA] border border-[#E8D9DF] flex items-center justify-center text-[#6F5A64] hover:text-[#720C3E] hover:border-[#E8A0B8] transition-all"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex mt-5 bg-[#FFF7FA] rounded-xl p-1 border border-[#E8D9DF]">
                  {['login', 'signup'].map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setError(''); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                        tab === t
                          ? 'bg-[#720C3E] text-white shadow-md shadow-[#720C3E]/20'
                          : 'text-[#6F5A64] hover:text-[#720C3E]'
                      }`}
                    >
                      {t === 'login' ? 'Login' : 'Sign Up'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-6 py-5">
                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600 font-medium">
                    {error}
                  </div>
                )}

                {tab === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="relative">
                      <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A2459]" />
                      <input
                        type="tel"
                        placeholder="Mobile Number"
                        value={loginData.phone}
                        onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                        required
                        maxLength={10}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E8D9DF] bg-[#FFF7FA] text-sm text-[#24151D] placeholder:text-[#B89EAB] focus:outline-none focus:border-[#9A2459] focus:ring-2 focus:ring-[#720C3E]/10 transition-all font-medium"
                      />
                    </div>
                    <div className="relative">
                      <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A2459]" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        placeholder="Password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#E8D9DF] bg-[#FFF7FA] text-sm text-[#24151D] placeholder:text-[#B89EAB] focus:outline-none focus:border-[#9A2459] focus:ring-2 focus:ring-[#720C3E]/10 transition-all font-medium"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9A2459] hover:text-[#720C3E]">
                        {showPass ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#720C3E] to-[#9A2459] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#720C3E]/25 hover:from-[#4D082A] hover:to-[#720C3E] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Logging in...
                        </span>
                      ) : (
                        <>
                          <HiSparkles className="w-4 h-4 text-[#E8A0B8]" />
                          Login & Book Service
                          <FiArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="relative">
                      <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A2459]" />
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={signupData.name}
                        onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E8D9DF] bg-[#FFF7FA] text-sm text-[#24151D] placeholder:text-[#B89EAB] focus:outline-none focus:border-[#9A2459] focus:ring-2 focus:ring-[#720C3E]/10 transition-all font-medium"
                      />
                    </div>
                    <div className="relative">
                      <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A2459]" />
                      <input
                        type="tel"
                        placeholder="Mobile Number"
                        value={signupData.phone}
                        onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                        required
                        maxLength={10}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E8D9DF] bg-[#FFF7FA] text-sm text-[#24151D] placeholder:text-[#B89EAB] focus:outline-none focus:border-[#9A2459] focus:ring-2 focus:ring-[#720C3E]/10 transition-all font-medium"
                      />
                    </div>
                    <div className="relative">
                      <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A2459]" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        placeholder="Create Password"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        required
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#E8D9DF] bg-[#FFF7FA] text-sm text-[#24151D] placeholder:text-[#B89EAB] focus:outline-none focus:border-[#9A2459] focus:ring-2 focus:ring-[#720C3E]/10 transition-all font-medium"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9A2459] hover:text-[#720C3E]">
                        {showPass ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#720C3E] to-[#9A2459] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#720C3E]/25 hover:from-[#4D082A] hover:to-[#720C3E] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Creating Account...
                        </span>
                      ) : (
                        <>
                          <HiSparkles className="w-4 h-4 text-[#E8A0B8]" />
                          Create Account & Book
                          <FiArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                <p className="mt-4 text-center text-[11px] text-[#9A7A87] font-medium">
                  By continuing, you agree to Qwiklly's{' '}
                  <span className="text-[#720C3E] cursor-pointer hover:underline">Terms</span> &{' '}
                  <span className="text-[#720C3E] cursor-pointer hover:underline">Privacy Policy</span>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LoginModal;
