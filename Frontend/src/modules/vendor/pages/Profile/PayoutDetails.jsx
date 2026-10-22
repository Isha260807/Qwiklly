import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiCreditCard, FiSmartphone, FiUpload, FiTrash2, FiSave, 
  FiCheckCircle, FiInfo, FiChevronLeft, FiCamera, FiEye 
} from 'react-icons/fi';
import { FaQrcode } from 'react-icons/fa';
import { vendorTheme as themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import { vendorAuthService } from '../../../../services/authService';
import { toast } from 'react-hot-toast';
import flutterBridge from '../../../../utils/flutterBridge';

const PayoutDetails = () => {
  const navigate = useNavigate();

  const [bankData, setBankData] = useState({
    upiId: '',
    upiQrCode: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: ''
  });

  const [payoutMethod, setPayoutMethod] = useState('upi'); // 'upi' | 'bank'
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFlutter, setIsFlutter] = useState(flutterBridge.isFlutter);

  useEffect(() => {
    flutterBridge.waitForFlutter().then(ready => {
      setIsFlutter(ready);
    });
  }, []);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const bgStyle = themeColors.backgroundGradient;

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;
    if (root) root.style.background = bgStyle;

    return () => {
      if (html) html.style.background = '';
      if (body) body.style.background = '';
      if (root) root.style.background = '';
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const storedVendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
        const storedProfile = JSON.parse(localStorage.getItem('vendorProfile') || '{}');
        const merged = { ...storedProfile, ...storedVendorData };

        if (merged.bankDetails) {
          const bd = merged.bankDetails;
          setBankData({
            upiId: bd.upiId || '',
            upiQrCode: bd.upiQrCode || '',
            accountHolderName: bd.accountHolderName || '',
            accountNumber: bd.accountNumber || '',
            ifscCode: bd.ifscCode || '',
            bankName: bd.bankName || ''
          });
          if (!bd.upiQrCode && !bd.upiId && bd.accountNumber) {
            setPayoutMethod('bank');
          }
        }

        const res = await vendorAuthService.getProfile();
        if (res.success && res.vendor) {
          const v = res.vendor;
          const b = v.bankDetails || {};
          setBankData({
            upiId: b.upiId || '',
            upiQrCode: b.upiQrCode || '',
            accountHolderName: b.accountHolderName || '',
            accountNumber: b.accountNumber || '',
            ifscCode: b.ifscCode || '',
            bankName: b.bankName || ''
          });
          if (!b.upiQrCode && !b.upiId && b.accountNumber) {
            setPayoutMethod('bank');
          }
        }
      } catch (err) {
        console.error('Error fetching bank details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleNativeCamera = async () => {
    const file = await flutterBridge.openCamera();
    if (file) {
      setQrFile(file);
      setQrPreview(URL.createObjectURL(file));
      flutterBridge.hapticFeedback('success');
    }
  };

  const handleQrUploadClick = () => {
    if (isFlutter) {
      handleNativeCamera();
    } else {
      document.getElementById('qr-upload-input')?.click();
    }
  };

  const handleQrChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('QR code image size should be less than 5MB');
        return;
      }
      setQrFile(file);
      setQrPreview(URL.createObjectURL(file));
    }
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    let baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    if (!baseUrl) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        baseUrl = 'http://localhost:5000';
      } else {
        baseUrl = window.location.origin;
      }
    }
    baseUrl = baseUrl.replace(/\/api$/, '');
    const response = await fetch(`${baseUrl}/api/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Upload failed');
    return data.imageUrl;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      let qrUrl = bankData.upiQrCode;

      if (qrFile) {
        try {
          qrUrl = await uploadFile(qrFile);
        } catch (uploadErr) {
          console.error('QR Upload error:', uploadErr);
          toast.error('Failed to upload QR code image');
          setSaving(false);
          return;
        }
      }

      const updatedBankDetails = {
        ...bankData,
        upiQrCode: qrUrl
      };

      const payload = {
        bankDetails: updatedBankDetails
      };

      const res = await vendorAuthService.updateProfile(payload);
      if (res.success) {
        const storedVendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
        const storedProfile = JSON.parse(localStorage.getItem('vendorProfile') || '{}');

        const updatedProfile = { ...storedProfile, bankDetails: updatedBankDetails };
        const updatedVendor = { ...storedVendorData, bankDetails: updatedBankDetails };

        localStorage.setItem('vendorProfile', JSON.stringify(updatedProfile));
        localStorage.setItem('vendorData', JSON.stringify(updatedVendor));

        window.dispatchEvent(new Event('vendorProfileUpdated'));
        window.dispatchEvent(new Event('vendorDataUpdated'));

        toast.success('Payout & Bank details saved successfully!');
        navigate('/vendor/profile');
      } else {
        toast.error(res.message || 'Failed to update details');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: themeColors.backgroundGradient }}>
      <Header title="Payout & Bank Details" />

      <main className="max-w-md mx-auto px-4 pt-3 pb-6">
        {/* Info Banner */}
        <div className="mb-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <FiCreditCard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-emerald-900 leading-tight">Direct Manual Payouts</h3>
            <p className="text-[11px] text-emerald-700 mt-1 leading-snug font-medium">
              Admin will use your UPI ID, QR Code, or Bank Account details to send your job payments and salary directly.
            </p>
          </div>
        </div>

        {/* Payout Method Toggle Switch */}
        <div className="bg-white p-1.5 rounded-2xl shadow-xs border border-gray-200/80 flex gap-1.5 mb-4">
          <button
            type="button"
            onClick={() => setPayoutMethod('upi')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              payoutMethod === 'upi'
                ? 'bg-[#720C3E] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <FaQrcode className="w-3.5 h-3.5" />
            <span>UPI & QR Code</span>
            {(bankData.upiQrCode || bankData.upiId) && (
              <span className={`w-2 h-2 rounded-full ${payoutMethod === 'upi' ? 'bg-emerald-400' : 'bg-emerald-500'}`} />
            )}
          </button>

          <button
            type="button"
            onClick={() => setPayoutMethod('bank')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              payoutMethod === 'bank'
                ? 'bg-[#720C3E] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <FiCreditCard className="w-3.5 h-3.5" />
            <span>Bank Account</span>
            {bankData.accountNumber && (
              <span className={`w-2 h-2 rounded-full ${payoutMethod === 'bank' ? 'bg-emerald-400' : 'bg-emerald-500'}`} />
            )}
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* ===================== 1. UPI & QR SECTION ===================== */}
          {payoutMethod === 'upi' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* UPI QR Code Upload */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FCEBF3] text-[#720C3E] flex items-center justify-center">
                      <FaQrcode className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">UPI Scanner / QR Code</h4>
                      <p className="text-[10px] text-gray-400 font-medium">Admin can scan to pay you directly</p>
                    </div>
                  </div>
                  {(qrPreview || bankData.upiQrCode) && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      QR Uploaded
                    </span>
                  )}
                </div>

                <div
                  onClick={handleQrUploadClick}
                  className="border-2 border-dashed border-gray-200 hover:border-[#720C3E]/40 rounded-xl p-4 text-center cursor-pointer transition-all bg-gray-50/50 hover:bg-white"
                >
                  <input
                    id="qr-upload-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleQrChange}
                  />

                  {qrPreview || bankData.upiQrCode ? (
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-44 h-44 rounded-xl overflow-hidden border-2 border-white shadow-md bg-white p-1 relative">
                        <img
                          src={qrPreview || bankData.upiQrCode}
                          alt="UPI QR Code"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-[#720C3E] hover:underline">
                        <FiCamera className="w-3.5 h-3.5" />
                        <span>Tap to change / re-upload QR</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#FCEBF3] text-[#720C3E] flex items-center justify-center mb-2 shadow-2xs">
                        <FaQrcode className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-gray-800">Upload PhonePe / GPay / Paytm QR</p>
                      <p className="text-[10px] text-gray-400 mt-1 font-medium">Take a screenshot of your QR and upload here (PNG/JPG)</p>
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 shadow-2xs">
                        <FiUpload className="w-3.5 h-3.5 text-[#720C3E]" />
                        <span>Select QR Image</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* UPI ID Section */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-gray-100">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <FiSmartphone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">UPI ID (Optional if QR is uploaded)</h4>
                    <p className="text-[10px] text-gray-400 font-medium">Direct VPA ID for instant payout</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    UPI ID (Google Pay / PhonePe / BHIM)
                  </label>
                  <input
                    type="text"
                    value={bankData.upiId}
                    onChange={(e) => setBankData(prev => ({ ...prev, upiId: e.target.value }))}
                    placeholder="e.g. 9876543210@paytm, name@okhdfcbank"
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all font-mono"
                    style={{ focusRingColor: themeColors.button }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===================== 2. BANK ACCOUNT SECTION ===================== */}
          {payoutMethod === 'bank' && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 pb-2.5 border-b border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-[#FCEBF3] text-[#720C3E] flex items-center justify-center">
                  <FiCreditCard className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Bank Account Details</h4>
                  <p className="text-[10px] text-gray-400 font-medium">NEFT / IMPS transfer details</p>
                </div>
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={bankData.accountHolderName}
                  onChange={(e) => setBankData(prev => ({ ...prev, accountHolderName: e.target.value }))}
                  placeholder="Name as per Passbook / Bank"
                  className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all"
                  style={{ focusRingColor: themeColors.button }}
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankData.bankName}
                  onChange={(e) => setBankData(prev => ({ ...prev, bankName: e.target.value }))}
                  placeholder="e.g. State Bank of India, HDFC Bank"
                  className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:ring-2 focus:bg-white transition-all"
                  style={{ focusRingColor: themeColors.button }}
                />
              </div>

              {/* Account Number & IFSC Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={bankData.accountNumber}
                    onChange={(e) => setBankData(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="Enter Account Number"
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-medium font-mono focus:outline-none focus:ring-2 focus:bg-white transition-all"
                    style={{ focusRingColor: themeColors.button }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={bankData.ifscCode}
                    onChange={(e) => setBankData(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                    placeholder="e.g. SBIN0001234"
                    className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-medium uppercase font-mono focus:outline-none focus:ring-2 focus:bg-white transition-all"
                    style={{ focusRingColor: themeColors.button }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 pb-6 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/vendor/profile')}
              className="w-28 sm:w-32 h-11 rounded-xl font-bold text-xs text-gray-700 bg-white border border-gray-200 transition-all active:scale-95 shadow-xs hover:bg-gray-50 flex items-center justify-center shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-11 px-4 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md truncate"
              style={{
                background: themeColors.button,
              }}
            >
              <FiSave className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{saving ? 'Saving...' : 'Save Details'}</span>
            </button>
          </div>

        </form>
      </main>

      <BottomNav />
    </div>
  );
};

export default PayoutDetails;
