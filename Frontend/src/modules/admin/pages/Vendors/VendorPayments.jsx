import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiDollarSign, FiLoader, FiArrowUpRight, FiArrowDownLeft, FiCreditCard, 
  FiSmartphone, FiCopy, FiEye, FiCheckCircle, FiX 
} from 'react-icons/fi';
import { FaQrcode } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import CardShell from '../UserCategories/components/CardShell';
import Modal from '../UserCategories/components/Modal';
import adminVendorService from '../../../../services/adminVendorService';

const VendorPayments = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendorForPayout, setSelectedVendorForPayout] = useState(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await adminVendorService.getVendorPayments();
      if (response.success) {
        setVendors(response.data);
      }
    } catch (error) {
      console.error('Error loading vendor payments:', error);
      toast.error('Failed to load vendor payments');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl text-white shadow-lg shadow-blue-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <FiDollarSign className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">Total Platform Balance</span>
          </div>
          <h3 className="text-3xl font-bold mb-1">
            ₹{vendors.reduce((acc, v) => acc + (v.wallet?.balance || 0), 0).toLocaleString()}
          </h3>
          <p className="text-blue-100 text-sm">Across {vendors.length} vendors</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <FiArrowUpRight className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Vendor Earnings</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ₹{vendors.reduce((acc, v) => acc + (v.wallet?.totalEarnings || 0), 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <FiArrowDownLeft className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Pending Payouts</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ₹{vendors.reduce((acc, v) => acc + (v.wallet?.balance > 0 ? v.wallet.balance : 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      <CardShell
        icon={FiCreditCard}
        title="Vendor Payouts & Settlements"
        subtitle="View vendor balances, QR codes, UPI IDs, and bank details for manual salary / payout transfers"
      >
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FiLoader className="w-8 h-8 text-gray-400 animate-spin mr-3" />
              <span className="text-gray-600">Loading payment data...</span>
            </div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No vendor payment data available</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Payout Details (QR / UPI / Bank)</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Current Balance</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Earnings</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vendors.map((vendor) => (
                  <tr key={vendor._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{vendor.businessName || vendor.name}</span>
                        <span className="text-xs text-gray-500">{vendor.phone}</span>
                      </div>
                    </td>

                    {/* Payout Details (UPI / QR / Bank) */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {vendor.bankDetails?.upiQrCode && (
                          <button
                            type="button"
                            onClick={() => setSelectedVendorForPayout(vendor)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#FCEBF3] text-[#720C3E] border border-[#720C3E]/20 hover:bg-[#720C3E] hover:text-white transition-all shadow-2xs"
                            title="Click to view & scan QR"
                          >
                            <FaQrcode className="w-3 h-3" />
                            <span>Scan QR Code</span>
                          </button>
                        )}
                        {vendor.bankDetails?.upiId && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 font-mono w-fit">
                            <FiSmartphone className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{vendor.bankDetails.upiId}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(vendor.bankDetails.upiId, 'UPI ID')}
                              className="hover:text-emerald-950 p-0.5"
                              title="Copy UPI"
                            >
                              <FiCopy className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {vendor.bankDetails?.accountNumber && (
                          <div className="flex items-center gap-1.5 text-xs text-blue-800 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 font-mono w-fit">
                            <FiCreditCard className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>A/C: ...{vendor.bankDetails.accountNumber.slice(-4)}</span>
                            <span className="text-[10px] text-blue-600">({vendor.bankDetails.ifscCode || 'Bank'})</span>
                          </div>
                        )}
                        {!vendor.bankDetails?.upiQrCode && !vendor.bankDetails?.upiId && !vendor.bankDetails?.accountNumber && (
                          <span className="text-xs text-gray-400 italic">Not added yet</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-900">₹{vendor.wallet?.balance?.toLocaleString() || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">₹{vendor.wallet?.totalEarnings?.toLocaleString() || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${vendor.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                        {vendor.approvalStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedVendorForPayout(vendor)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${vendor.wallet?.balance > 0
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        <FiEye className="w-3.5 h-3.5" />
                        <span>View Payout Info</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardShell>

      {/* Manual Payout & Bank Details Modal */}
      <Modal
        isOpen={!!selectedVendorForPayout}
        onClose={() => setSelectedVendorForPayout(null)}
        title={`Payout Details: ${selectedVendorForPayout?.businessName || selectedVendorForPayout?.name || 'Vendor'}`}
      >
        {selectedVendorForPayout && (
          <div className="space-y-4">
            {/* Balance Card */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Wallet Balance / Due Payout</span>
                <span className="text-2xl font-extrabold text-emerald-950">
                  ₹{selectedVendorForPayout.wallet?.balance?.toLocaleString() || 0}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-emerald-700 block">Total Lifetime Earnings</span>
                <span className="text-sm font-bold text-emerald-900">
                  ₹{selectedVendorForPayout.wallet?.totalEarnings?.toLocaleString() || 0}
                </span>
              </div>
            </div>

            {/* QR Code Scanner */}
            {selectedVendorForPayout.bankDetails?.upiQrCode ? (
              <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-sm flex flex-col sm:flex-row items-center gap-4">
                <div className="w-40 h-40 rounded-xl overflow-hidden border-2 border-emerald-500/40 p-1 bg-white shrink-0 shadow-sm">
                  <img
                    src={selectedVendorForPayout.bankDetails.upiQrCode}
                    alt="Vendor QR Code"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <FaQrcode className="w-3.5 h-3.5" /> Scan & Pay QR Code
                  </span>
                  <h5 className="text-sm font-bold text-gray-900">Scan using PhonePe / GPay / Paytm</h5>
                  <p className="text-xs text-gray-500">
                    Scan this QR code directly from your mobile screen to transfer the payout instantly.
                  </p>
                  <a
                    href={selectedVendorForPayout.bankDetails.upiQrCode}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline pt-1"
                  >
                    <FiEye className="w-3.5 h-3.5" /> Open Full-Size Image
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-center text-xs text-gray-500">
                Vendor has not uploaded a UPI QR Code screenshot yet.
              </div>
            )}

            {/* UPI & Bank Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* UPI ID */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                <div className="min-w-0 flex-1 mr-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">UPI ID</span>
                  <span className="font-bold text-gray-900 break-all text-xs font-mono">
                    {selectedVendorForPayout.bankDetails?.upiId || <span className="text-gray-400 font-normal italic font-sans">Not provided</span>}
                  </span>
                </div>
                {selectedVendorForPayout.bankDetails?.upiId && (
                  <button
                    onClick={() => copyToClipboard(selectedVendorForPayout.bankDetails.upiId, 'UPI ID')}
                    className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors shrink-0"
                    title="Copy UPI ID"
                  >
                    <FiCopy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Account Holder Name */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Account Holder</span>
                <span className="font-bold text-gray-900 text-xs">
                  {selectedVendorForPayout.bankDetails?.accountHolderName || selectedVendorForPayout.name || 'N/A'}
                </span>
              </div>

              {/* Account Number */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                <div className="min-w-0 flex-1 mr-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                    {selectedVendorForPayout.bankDetails?.bankName ? `${selectedVendorForPayout.bankDetails.bankName} A/C` : 'Account Number'}
                  </span>
                  <span className="font-bold text-gray-900 font-mono text-xs">
                    {selectedVendorForPayout.bankDetails?.accountNumber || <span className="text-gray-400 font-normal italic font-sans">Not provided</span>}
                  </span>
                </div>
                {selectedVendorForPayout.bankDetails?.accountNumber && (
                  <button
                    onClick={() => copyToClipboard(selectedVendorForPayout.bankDetails.accountNumber, 'Account Number')}
                    className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition-colors shrink-0"
                    title="Copy Account Number"
                  >
                    <FiCopy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* IFSC Code */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                <div className="min-w-0 flex-1 mr-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">IFSC Code</span>
                  <span className="font-bold text-gray-900 font-mono text-xs">
                    {selectedVendorForPayout.bankDetails?.ifscCode || <span className="text-gray-400 font-normal italic font-sans">Not provided</span>}
                  </span>
                </div>
                {selectedVendorForPayout.bankDetails?.ifscCode && (
                  <button
                    onClick={() => copyToClipboard(selectedVendorForPayout.bankDetails.ifscCode, 'IFSC Code')}
                    className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition-colors shrink-0"
                    title="Copy IFSC Code"
                  >
                    <FiCopy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedVendorForPayout(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VendorPayments;
