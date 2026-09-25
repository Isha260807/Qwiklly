import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiX, FiEye, FiSearch, FiFilter, FiDownload, FiLoader, FiPower, FiTrash2, FiCopy, FiCreditCard, FiSmartphone } from 'react-icons/fi';
import { FaQrcode } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import CardShell from '../UserCategories/components/CardShell';
import Modal from '../UserCategories/components/Modal';
import adminVendorService from '../../../../services/adminVendorService';

const AllVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Load vendors from backend
  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const response = await adminVendorService.getAllVendors();
      if (response.success) {
        // Transform backend data to frontend format
        const transformedVendors = response.data.map(vendor => ({
          id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          phone: vendor.phone,
          businessName: vendor.businessName,
          service: vendor.service,
          approvalStatus: vendor.approvalStatus,
          aadhar: vendor.aadhar?.number,
          pan: vendor.pan?.number,
          documents: {
            aadhar: vendor.aadhar?.document,
            aadharBack: vendor.aadhar?.backDocument,
            pan: vendor.pan?.document,
            other: vendor.otherDocuments?.[0]
          },
          bankDetails: vendor.bankDetails || {},
          createdAt: vendor.createdAt,
          isActive: vendor.isActive
        }));
        setVendors(transformedVendors);
      } else {
        toast.error(response.message || 'Failed to load vendors');
      }
    } catch (error) {
      console.error('Error loading vendors:', error);
      toast.error('Failed to load vendors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      const serviceString = Array.isArray(vendor.service)
        ? vendor.service.join(' ')
        : (vendor.service || '');

      const matchesStatus = filterStatus === 'all' || vendor.approvalStatus === filterStatus;

      const matchesSearch =
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.phone.includes(searchQuery) ||
        serviceString.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vendor.businessName && vendor.businessName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [vendors, filterStatus, searchQuery]);

  const handleApprove = async (vendorId) => {
    try {
      const response = await adminVendorService.approveVendor(vendorId);
      if (response.success) {
        setVendors(prev => prev.map(v =>
          v.id === vendorId ? { ...v, approvalStatus: 'approved' } : v
        ));
        toast.success('Vendor approved successfully!');
      } else {
        toast.error(response.message || 'Failed to approve vendor');
      }
    } catch (error) {
      console.error('Error approving vendor:', error);
      toast.error('Failed to approve vendor. Please try again.');
    }
  };

  const handleReject = async (vendorId) => {
    try {
      const response = await adminVendorService.rejectVendor(vendorId);
      if (response.success) {
        setVendors(prev => prev.map(v =>
          v.id === vendorId ? { ...v, approvalStatus: 'rejected' } : v
        ));
        toast.success('Vendor rejected successfully.');
      } else {
        toast.error(response.message || 'Failed to reject vendor');
      }
    } catch (error) {
      console.error('Error rejecting vendor:', error);
      toast.error('Failed to reject vendor. Please try again.');
    }
  };

  const handleToggleStatus = async (vendorId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const response = await adminVendorService.toggleStatus(vendorId, newStatus);
      if (response.success) {
        setVendors(prev => prev.map(v =>
          v.id === vendorId ? { ...v, isActive: newStatus } : v
        ));
        toast.success(`Vendor ${newStatus ? 'activated' : 'deactivated'} successfully`);
      } else {
        toast.error(response.message || 'Failed to update vendor status');
      }
    } catch (error) {
      console.error('Error toggling vendor status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (vendorId) => {
    if (!window.confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await adminVendorService.deleteVendor(vendorId);
      if (response.success) {
        setVendors(prev => prev.filter(v => v.id !== vendorId));
        toast.success('Vendor deleted successfully');
      } else {
        toast.error(response.message || 'Failed to delete vendor');
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast.error('Failed to delete vendor');
    }
  };

  const handleViewDetails = (vendor) => {
    setSelectedVendor(vendor);
    setIsViewModalOpen(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const pendingCount = vendors.filter(v => v.approvalStatus === 'pending').length;
  const approvedCount = vendors.filter(v => v.approvalStatus === 'approved').length;
  const rejectedCount = vendors.filter(v => v.approvalStatus === 'rejected').length;

  return (
    <div className="space-y-4">
      <CardShell
        icon={FiFilter}
        title="Vendor Management"
        subtitle="Manage and verify platform vendors"
      >
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <div className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider mb-1">Pending</div>
            <div className="text-xl font-bold text-yellow-900">{pendingCount}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <div className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">Approved</div>
            <div className="text-xl font-bold text-green-900">{approvedCount}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Rejected</div>
            <div className="text-xl font-bold text-red-900">{rejectedCount}</div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-xs"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-2 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap ${filterStatus === status
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Vendor Details</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Business Info</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payout Details (UPI / Bank)</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-xs text-gray-500">Loading vendors...</td>
                  </tr>
                ) : filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-xs text-gray-500">No vendors found</td>
                  </tr>
                ) : (
                  filteredVendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-gray-900 text-xs">{vendor.name}</p>
                          <p className="text-[10px] text-gray-500">{vendor.phone}</p>
                          <p className="text-[10px] text-gray-400">{vendor.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-gray-800 text-xs">{vendor.businessName || 'N/A'}</p>
                          <p className="text-[10px] text-blue-600 font-medium">
                            {Array.isArray(vendor.service) ? vendor.service.join(', ') : (vendor.service || 'No service')}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {vendor.bankDetails?.upiQrCode && (
                            <button
                              type="button"
                              onClick={() => handleViewDetails(vendor)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FCEBF3] text-[#720C3E] border border-[#720C3E]/20 hover:bg-[#720C3E] hover:text-white transition-all shadow-2xs"
                              title="Click to view & scan QR Code"
                            >
                              <FaQrcode className="w-2.5 h-2.5" />
                              <span>QR Code Available</span>
                            </button>
                          )}
                          {vendor.bankDetails?.upiId && (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-mono w-fit">
                              <FiSmartphone className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              <span className="truncate max-w-[130px]">{vendor.bankDetails.upiId}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(vendor.bankDetails.upiId, 'UPI ID')}
                                className="hover:text-emerald-950 p-0.5"
                                title="Copy UPI"
                              >
                                <FiCopy className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                          {vendor.bankDetails?.accountNumber && (
                            <div className="flex items-center gap-1 text-[10px] text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 font-mono w-fit">
                              <FiCreditCard className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                              <span>A/C: ...{vendor.bankDetails.accountNumber.slice(-4)}</span>
                              <span className="text-[9px] text-blue-600">({vendor.bankDetails.ifscCode || 'Bank'})</span>
                            </div>
                          )}
                          {!vendor.bankDetails?.upiQrCode && !vendor.bankDetails?.upiId && !vendor.bankDetails?.accountNumber && (
                            <span className="text-[10px] text-gray-400 italic">Not set</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${vendor.approvalStatus === 'approved' ? 'bg-green-50 text-green-700 border-green-100' :
                          vendor.approvalStatus === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                            'bg-yellow-50 text-yellow-700 border-yellow-100'
                          }`}>
                          {vendor.approvalStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {/* View Details */}
                          <button
                            onClick={() => handleViewDetails(vendor)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <FiEye className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active Status */}
                          <button
                            onClick={() => handleToggleStatus(vendor.id, vendor.isActive)}
                            className={`p-1.5 rounded-lg transition-colors ${vendor.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                            title={vendor.isActive ? "Disable Login" : "Enable Login"}
                          >
                            <FiPower className={`w-3.5 h-3.5 ${vendor.isActive ? 'fill-current' : ''}`} />
                          </button>

                          {/* Approve/Reject (Only for pending) */}
                          {vendor.approvalStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(vendor.id)}
                                className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <FiCheck className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleReject(vendor.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <FiX className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Delete Vendor */}
                          <button
                            onClick={() => handleDelete(vendor.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Vendor"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardShell >

      {/* View Vendor Details Modal */}
      < Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedVendor(null);
        }}
        title="Vendor Details"
        size="lg"
      >
        {selectedVendor && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Business Name</label>
                <div className="text-gray-900">{selectedVendor.businessName || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Owner Name</label>
                <div className="text-gray-900">{selectedVendor.name}</div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <div className="text-gray-900">{selectedVendor.email}</div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                <div className="text-gray-900">{selectedVendor.phone}</div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Service Category</label>
                <div className="text-gray-900">
                  {Array.isArray(selectedVendor.service) ? selectedVendor.service.join(', ') : (selectedVendor.service || 'N/A')}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <div>{getStatusBadge(selectedVendor.approvalStatus)}</div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Registered On</label>
                <div className="text-gray-900">
                  {new Date(selectedVendor.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Active</label>
                <div className={`text-sm font-semibold ${selectedVendor.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedVendor.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>

            {/* Bank & UPI Details for Manual Payouts */}
            <div className="bg-gradient-to-br from-emerald-50/60 to-blue-50/40 rounded-xl p-4 border border-emerald-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <FiCreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Payout Details (UPI / Bank / QR)</h4>
                    <p className="text-[10px] text-gray-500">For manual salary / earnings transfer</p>
                  </div>
                </div>
              </div>

              {/* QR Code Scanner (If uploaded by vendor) */}
              {selectedVendor.bankDetails?.upiQrCode && (
                <div className="bg-white rounded-xl p-3.5 border border-emerald-100 shadow-xs flex flex-col sm:flex-row items-center gap-3.5">
                  <div className="w-36 h-36 rounded-xl overflow-hidden border-2 border-emerald-500/30 p-1 bg-white shrink-0 shadow-sm">
                    <img
                      src={selectedVendor.bankDetails.upiQrCode}
                      alt="Vendor UPI QR Code"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5 text-center sm:text-left">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <FaQrcode className="w-3 h-3" /> Scan & Pay QR Code
                    </span>
                    <h5 className="text-xs font-bold text-gray-900">Pay vendor via QR Scanner</h5>
                    <p className="text-[11px] text-gray-500">Scan this code using PhonePe, Google Pay, or Paytm scanner directly from your phone screen.</p>
                    <a
                      href={selectedVendor.bankDetails.upiQrCode}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline pt-1"
                    >
                      <FiEye className="w-3.5 h-3.5" /> View Full QR
                    </a>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* UPI ID */}
                <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-xs flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">UPI ID</span>
                    <span className="font-bold text-gray-900 break-all text-xs font-mono">
                      {selectedVendor.bankDetails?.upiId || <span className="text-gray-400 font-normal italic font-sans">Not provided</span>}
                    </span>
                  </div>
                  {selectedVendor.bankDetails?.upiId && (
                    <button
                      onClick={() => copyToClipboard(selectedVendor.bankDetails.upiId, 'UPI ID')}
                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors shrink-0"
                      title="Copy UPI ID"
                    >
                      <FiCopy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Account Holder Name */}
                <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Account Holder</span>
                  <span className="font-bold text-gray-900 text-xs">
                    {selectedVendor.bankDetails?.accountHolderName || selectedVendor.name || 'N/A'}
                  </span>
                </div>

                {/* Bank Name & Account Number */}
                <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-xs flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                      {selectedVendor.bankDetails?.bankName ? `${selectedVendor.bankDetails.bankName} Account` : 'Account Number'}
                    </span>
                    <span className="font-bold text-gray-900 font-mono text-xs">
                      {selectedVendor.bankDetails?.accountNumber || <span className="text-gray-400 font-normal italic font-sans">Not provided</span>}
                    </span>
                  </div>
                  {selectedVendor.bankDetails?.accountNumber && (
                    <button
                      onClick={() => copyToClipboard(selectedVendor.bankDetails.accountNumber, 'Account Number')}
                      className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors shrink-0"
                      title="Copy Account Number"
                    >
                      <FiCopy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* IFSC Code */}
                <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-xs flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">IFSC Code</span>
                    <span className="font-bold text-gray-900 font-mono text-xs">
                      {selectedVendor.bankDetails?.ifscCode || <span className="text-gray-400 font-normal italic font-sans">Not provided</span>}
                    </span>
                  </div>
                  {selectedVendor.bankDetails?.ifscCode && (
                    <button
                      onClick={() => copyToClipboard(selectedVendor.bankDetails.ifscCode, 'IFSC Code')}
                      className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors shrink-0"
                      title="Copy IFSC Code"
                    >
                      <FiCopy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Verification Documents</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedVendor.documents.aadhar && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Aadhar Front</label>
                    <img
                      src={selectedVendor.documents.aadhar}
                      alt="Aadhar Front"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <a
                      href={selectedVendor.documents.aadhar}
                      download
                      className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <FiDownload className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                )}
                {selectedVendor.documents.aadharBack && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Aadhar Back</label>
                    <img
                      src={selectedVendor.documents.aadharBack}
                      alt="Aadhar Back"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <a
                      href={selectedVendor.documents.aadharBack}
                      download
                      className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <FiDownload className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                )}
                {selectedVendor.documents.pan && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">PAN Card</label>
                    <img
                      src={selectedVendor.documents.pan}
                      alt="PAN"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <a
                      href={selectedVendor.documents.pan}
                      download
                      className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <FiDownload className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                )}
              </div>
            </div>

            {selectedVendor.approvalStatus === 'pending' && (
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={async () => {
                    await handleApprove(selectedVendor.id);
                    setIsViewModalOpen(false);
                    setSelectedVendor(null);
                  }}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FiCheck className="w-5 h-5" />
                  Approve Vendor
                </button>
                <button
                  onClick={async () => {
                    await handleReject(selectedVendor.id);
                    setIsViewModalOpen(false);
                    setSelectedVendor(null);
                  }}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FiX className="w-5 h-5" />
                  Reject Vendor
                </button>
              </div>
            )}
          </div>
        )}
      </Modal >
    </div >
  );
};

export default AllVendors;
