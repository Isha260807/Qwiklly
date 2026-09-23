import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSettings, FiGrid, FiDollarSign, FiSave, FiUser, FiMail, FiTrash2, FiPlus, FiUsers, FiShield, FiFileText, FiMapPin, FiPhone, FiHeadphones, FiMessageCircle, FiEdit, FiLock, FiUnlock, FiX, FiClock, FiCheck, FiSlash, FiCalendar } from 'react-icons/fi';
import { getSettings, updateSettings, updateAdminProfile, getAdminProfile, getAllAdmins, createAdmin, deleteAdmin, updateAdminDetails, toggleAdminStatus } from '../../services/settingsService';
import { cityService } from '../../services/cityService';
import CityManagement from '../Cities';
import { toast } from 'react-hot-toast';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    workerAutoAssignment: true,
  });

  const [financialSettings, setFinancialSettings] = useState({
    visitedCharges: 0,
    instantBookingCharges: 0,
    serviceGstPercentage: 0,
    partsGstPercentage: 0,
    servicePayoutPercentage: 0,
    partsPayoutPercentage: 0,
    vendorCashLimit: 0,
    cancellationPenalty: 0,
    tdsPercentage: 1,
    platformFeePercentage: 0,
    maxSearchTime: 5,
    waveDuration: 60,
    searchRadius: 5,
    isOnlinePaymentEnabled: true
  });

  // Dynamic Booking Slots State
  const [slotSettings, setSlotSettings] = useState({
    slotStartHour: 9,
    slotEndHour: 21,
    slotIntervalMins: 60,
    maxDaysInAdvance: 7,
    leadTimeHours: 1,
    slotServiceDurationMins: 45,
    disabledSlots: []
  });
  const [slotLoading, setSlotLoading] = useState(false);

  // Billing Configuration State
  const [billingSettings, setBillingSettings] = useState({
    companyName: 'TodayMyDream',
    companyGSTIN: '',
    companyPAN: '',
    companyAddress: '',
    companyCity: '',
    companyState: '',
    companyPincode: '',
    companyPhone: '',
    companyEmail: '',
    invoicePrefix: 'INV',
    sacCode: '998599'
  });
  const [billingLoading, setBillingLoading] = useState(false);

  // Support Settings State
  const [supportSettings, setSupportSettings] = useState({
    supportEmail: '',
    supportPhone: '',
    supportWhatsapp: ''
  });
  const [supportLoading, setSupportLoading] = useState(false);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: 'admin',
    assignedCity: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Admin Management State
  const [admins, setAdmins] = useState([]);
  const [cities, setCities] = useState([]); // State for cities
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', role: 'admin', cityId: '' }); // Added cityId
  const [adminLoading, setAdminLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeView, setActiveView] = useState('main'); // 'main', 'profile', 'financial', 'system', 'admins'

  const isSuperAdmin = profile.role === 'super_admin';

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await getAdminProfile();
        if (res.success && res.data) {
          setProfile(prev => ({
            ...prev,
            email: res.data.email,
            name: res.data.name || 'Admin',
            role: res.data.role || 'admin',
            assignedCity: res.data.cityName || res.data.cityId?.name || ''
          }));
          const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
          const newData = { ...adminData, ...res.data };
          localStorage.setItem('adminData', JSON.stringify(newData));
        }
      } catch (error) {
        console.error('Error loading admin profile:', error);
      }
    };

    const loadSettings = () => {
      try {
        const adminSettings = JSON.parse(localStorage.getItem('adminSettings') || '{}');
        if (Object.keys(adminSettings).length > 0) {
          setSettings(prev => ({ ...prev, ...adminSettings }));
        }
      } catch (error) {
        console.error('Error loading admin settings:', error);
      }
    };

    const loadFinancialSettings = async () => {
      try {
        const res = await getSettings();
        if (res.success && res.settings) {
          setFinancialSettings({
            visitedCharges: res.settings.visitedCharges || 0,
            instantBookingCharges: res.settings.instantBookingCharges !== undefined ? res.settings.instantBookingCharges : 0,
            serviceGstPercentage: res.settings.serviceGstPercentage ?? 0,
            partsGstPercentage: res.settings.partsGstPercentage ?? 0,
            servicePayoutPercentage: res.settings.servicePayoutPercentage ?? 0,
            partsPayoutPercentage: res.settings.partsPayoutPercentage ?? 0,
            tdsPercentage: res.settings.tdsPercentage || 1,
            platformFeePercentage: res.settings.platformFeePercentage ?? 0,
            vendorCashLimit: res.settings.vendorCashLimit ?? 0,
            cancellationPenalty: res.settings.cancellationPenalty !== undefined ? res.settings.cancellationPenalty : 0,
            searchRadius: res.settings.searchRadius || 5,
            isOnlinePaymentEnabled: res.settings.isOnlinePaymentEnabled !== undefined ? res.settings.isOnlinePaymentEnabled : true
          });
          // Load billing settings
          setBillingSettings({
            companyName: res.settings.companyName || 'TodayMyDream',
            companyGSTIN: res.settings.companyGSTIN || '',
            companyPAN: res.settings.companyPAN || '',
            companyAddress: res.settings.companyAddress || '',
            companyCity: res.settings.companyCity || '',
            companyState: res.settings.companyState || '',
            companyPincode: res.settings.companyPincode || '',
            companyPhone: res.settings.companyPhone || '',
            companyEmail: res.settings.companyEmail || '',
            invoicePrefix: res.settings.invoicePrefix || 'INV',
            sacCode: res.settings.sacCode || '998599'
          });
          // Load support settings
          setSupportSettings({
            supportEmail: res.settings.supportEmail || '',
            supportPhone: res.settings.supportPhone || '',
            supportWhatsapp: res.settings.supportWhatsapp || ''
          });
          // Load slot settings
          setSlotSettings({
            slotStartHour: res.settings.slotStartHour ?? 9,
            slotEndHour: res.settings.slotEndHour ?? 21,
            slotIntervalMins: res.settings.slotIntervalMins ?? 60,
            maxDaysInAdvance: res.settings.maxDaysInAdvance ?? 7,
            leadTimeHours: res.settings.leadTimeHours ?? 1,
            slotServiceDurationMins: res.settings.slotServiceDurationMins ?? 45,
            disabledSlots: res.settings.disabledSlots || []
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadProfile();
    loadSettings();
    loadFinancialSettings();
  }, []);

  const loadAdmins = async () => {
    try {
      console.log('Fetching admins list...');
      const res = await getAllAdmins();
      console.log('Admins fetched:', res);
      if (res.success) {
        setAdmins(res.data || []);
      }
    } catch (error) {
      console.error('Error loading admins:', error);
    }
  };

  // Fetch cities for dropdown
  const loadCities = async () => {
    try {
      const res = await cityService.getAll();
      if (res.success) {
        setCities(res.cities || []);
      }
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  // Load admins and cities when entering admin view
  useEffect(() => {
    if (isSuperAdmin && (activeView === 'admins' || admins.length === 0)) {
      loadAdmins();
      loadCities(); // Fetch cities as well
    }
  }, [isSuperAdmin, activeView]);

  const handleToggle = (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    localStorage.setItem('adminSettings', JSON.stringify(updated));
    window.dispatchEvent(new Event('adminSettingsUpdated'));
  };

  const handleFinancialChange = (e) => {
    const { name, value } = e.target;
    setFinancialSettings(prev => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleFinancialSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateSettings(financialSettings);
      toast.success('Financial settings updated');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  // Handle billing settings change
  const handleBillingChange = (e) => {
    const { name, value } = e.target;
    // Auto-uppercase for specific fields
    const upperFields = ['companyGSTIN', 'companyPAN', 'invoicePrefix'];
    const newValue = upperFields.includes(name) ? value.toUpperCase() : value;
    setBillingSettings(prev => ({ ...prev, [name]: newValue }));
  };

  const validateBilling = () => {
    const {
      companyName, companyGSTIN, companyPAN, companyAddress,
      companyCity, companyState, companyPincode,
      companyPhone, companyEmail, invoicePrefix, sacCode
    } = billingSettings;

    if (!companyName?.trim()) return "Company Name is required";

    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!companyGSTIN || !gstRegex.test(companyGSTIN)) return "Invalid GSTIN format (e.g., 27ABCDE1234F1Z5)";

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!companyPAN || !panRegex.test(companyPAN)) return "Invalid PAN format (e.g., ABCDE1234F)";

    if (!companyAddress?.trim()) return "Address is required";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!companyEmail || !emailRegex.test(companyEmail)) return "Invalid Email Address";

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!companyPhone || !phoneRegex.test(companyPhone)) return "Invalid Phone Number (must be 10 digits)";

    if (!companyCity?.trim()) return "City is required";
    if (!companyState?.trim()) return "State is required";

    const pincodeRegex = /^[1-9][0-9]{5}$/;
    if (!companyPincode || !pincodeRegex.test(companyPincode)) return "Invalid Pincode (must be 6 digits)";

    if (!invoicePrefix?.trim()) return "Invoice Prefix is required";

    const sacRegex = /^\d{6}$/;
    if (!sacCode || !sacRegex.test(sacCode)) return "Invalid SAC Code (must be 6 digits)";

    return null;
  };

  // Save billing settings
  const handleBillingSave = async (e) => {
    e.preventDefault();

    const error = validateBilling();
    if (error) return toast.error(error);

    setBillingLoading(true);
    try {
      await updateSettings(billingSettings);
      toast.success('Billing settings updated');
    } catch (error) {
      toast.error('Failed to update billing settings');
    } finally {
      setBillingLoading(false);
    }
  };

  // Handle support settings change
  const handleSupportChange = (e) => {
    const { name, value } = e.target;
    setSupportSettings(prev => ({ ...prev, [name]: value }));
  };

  // Save support settings
  const handleSupportSave = async (e) => {
    e.preventDefault();
    setSupportLoading(true);
    try {
      await updateSettings(supportSettings);
      toast.success('Support settings updated');
    } catch (error) {
      toast.error('Failed to update support settings');
    } finally {
      setSupportLoading(false);
    }
  };

  // Dynamic Slots Handlers
  const handleSlotChange = (e) => {
    const { name, value } = e.target;
    setSlotSettings(prev => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  const toggleSlotDisabled = (slotValue) => {
    setSlotSettings(prev => {
      const currentDisabled = prev.disabledSlots || [];
      const exists = currentDisabled.includes(slotValue);
      const updatedDisabled = exists
        ? currentDisabled.filter(s => s !== slotValue)
        : [...currentDisabled, slotValue];
      return { ...prev, disabledSlots: updatedDisabled };
    });
  };

  const handleEnableAllSlots = () => {
    setSlotSettings(prev => ({ ...prev, disabledSlots: [] }));
    toast.success('All generated slots enabled');
  };

  const handleDisableAllSlots = () => {
    const all = generateSlotsList(slotSettings.slotStartHour, slotSettings.slotEndHour, slotSettings.slotIntervalMins);
    setSlotSettings(prev => ({ ...prev, disabledSlots: all.map(s => s.value) }));
    toast.success('All generated slots blocked');
  };

  const generateSlotsList = (startHour = 9, endHour = 21, interval = 60) => {
    const slots = [];
    let currentTotalMinutes = Number(startHour) * 60;
    const endTotalMinutes = Number(endHour) * 60;

    while (currentTotalMinutes < endTotalMinutes) {
      const h = Math.floor(currentTotalMinutes / 60);
      const m = currentTotalMinutes % 60;
      const endTotal = currentTotalMinutes + Number(interval);
      const endH = Math.floor(endTotal / 60);
      const endM = endTotal % 60;

      const valStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const displayM = m === 0 ? '00' : String(m).padStart(2, '0');

      const endAmpm = endH >= 12 ? (endH === 24 ? 'AM' : 'PM') : 'AM';
      const endDisplayH = endH % 12 === 0 ? (endH === 24 ? 12 : 12) : endH % 12;
      const endDisplayM = endM === 0 ? '00' : String(endM).padStart(2, '0');

      slots.push({
        value: valStr,
        end: endStr,
        display: `${displayH}:${displayM} ${ampm}`,
        fullRange: `${displayH}:${displayM} ${ampm} - ${endDisplayH}:${endDisplayM} ${endAmpm}`
      });

      currentTotalMinutes += Number(interval);
    }
    return slots;
  };

  const handleSlotSave = async (e) => {
    if (e) e.preventDefault();
    if (slotSettings.slotStartHour >= slotSettings.slotEndHour) {
      return toast.error('Start hour must be earlier than End hour');
    }
    setSlotLoading(true);
    try {
      await updateSettings(slotSettings);
      toast.success('Booking slot settings updated successfully');
    } catch (error) {
      toast.error('Failed to update slot settings');
    } finally {
      setSlotLoading(false);
    }
  };


  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (profile.newPassword && profile.newPassword !== profile.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (profile.newPassword && !profile.currentPassword) {
      return toast.error('Current password required');
    }

    setProfileLoading(true);
    try {
      const updateData = { email: profile.email };
      if (profile.newPassword) {
        updateData.currentPassword = profile.currentPassword;
        updateData.newPassword = profile.newPassword;
      } else if (profile.currentPassword) {
        updateData.currentPassword = profile.currentPassword;
      }

      await updateAdminProfile(updateData);
      const adminData = JSON.parse(localStorage.getItem('adminUser') || '{}');
      adminData.email = profile.email;
      localStorage.setItem('adminUser', JSON.stringify(adminData));

      toast.success('Profile updated');
      setProfile(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    const isEdit = !!newAdmin.id;

    if (!newAdmin.name || !newAdmin.email) {
      return toast.error('Name and Email are required');
    }
    if (!isEdit && !newAdmin.password) {
      return toast.error('Password is required for new admin');
    }

    setAdminLoading(true);
    try {
      // Prepare payload
      const payload = { ...newAdmin };
      if (payload.cityId) {
        const cityObj = cities.find(c => (c._id || c.id) === payload.cityId);
        if (cityObj) payload.cityName = cityObj.name;
      } else {
        delete payload.cityId;
        payload.cityName = '';
      }

      if (isEdit) {
        await updateAdminDetails(newAdmin.id, payload);
        toast.success('Admin updated successfully');
      } else {
        await createAdmin(payload);
        toast.success('Admin created successfully');
      }
      setNewAdmin({ name: '', email: '', password: '', role: 'admin', cityId: '' });
      setShowAddAdmin(false);
      loadAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleEditClick = (admin) => {
    setNewAdmin({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      password: '',
      cityId: admin.cityId?._id || admin.cityId || '' // Handle populated or raw ID
    });
    setShowAddAdmin(true);
  };

  const handleBlockAdmin = async (id, currentStatus) => {
    const action = currentStatus ? 'block' : 'unblock';
    if (!window.confirm(`Are you sure you want to ${action} this admin?`)) return;

    try {
      await toggleAdminStatus(id);
      toast.success(`Admin ${action}ed`);
      loadAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDeleteAdmin = async (id, name) => {
    if (!window.confirm(`Delete admin "${name}"? This cannot be undone.`)) return;
    try {
      await deleteAdmin(id);
      toast.success('Admin deleted');
      loadAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  const [serviceMode, setServiceMode] = useState('multi');
  useEffect(() => {
    const config = JSON.parse(localStorage.getItem('adminServiceConfig') || '{}');
    setServiceMode(config.mode || 'multi');
  }, []);

  // Render Function for Main Settings Menu
  const renderMainMenu = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Profile Settings Card */}
      <div onClick={() => setActiveView('profile')}
        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group">
        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
          <FiUser className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Profile Settings</h3>
        <p className="text-sm text-gray-500">Manage your personal account details and password</p>
      </div>

      {/* Financial Settings Card - Super Admin Only */}
      {isSuperAdmin && (
        <div onClick={() => setActiveView('financial')}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors">
            <FiDollarSign className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Financial Info</h3>
          <p className="text-sm text-gray-500">Configure charges, commissions, and billing details</p>
        </div>
      )}

      {/* System Settings Card - Super Admin Only */}
      {isSuperAdmin && (
        <div onClick={() => setActiveView('system')}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
            <FiSettings className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">System & Support</h3>
          <p className="text-sm text-gray-500">Manage auto-assignment and help contact info</p>
        </div>
      )}

      {/* Booking Slots & Timing Card - Super Admin Only */}
      {isSuperAdmin && (
        <div onClick={() => setActiveView('slots')}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
            <FiClock className="w-6 h-6 text-indigo-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Booking Slots & Timing</h3>
          <p className="text-sm text-gray-500">Configure working hours, slot interval, and toggle active slots</p>
        </div>
      )}

      {/* City Management Card - Super Admin Only */}
      {isSuperAdmin && (
        <div onClick={() => setActiveView('cities')}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors">
            <FiMapPin className="w-6 h-6 text-teal-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">City Management</h3>
          <p className="text-sm text-gray-500">Manage operational cities and default location</p>
        </div>
      )}

      {/* Admin Management Card - Super Admin Only */}
      {isSuperAdmin && (
        <div onClick={() => setActiveView('admins')}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
            <FiUsers className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Manage Admins</h3>
          <p className="text-sm text-gray-500">Add, remove, and view all system administrators</p>
        </div>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header / Breadcrumb */}
      {activeView !== 'main' && (
        <button onClick={() => setActiveView('main')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-4 transition-colors">
          <span className="text-lg">←</span> Back to Settings
        </button>
      )}

      {activeView === 'main' && renderMainMenu()}

      <AnimatePresence mode="wait">

        {/* Profile View */}
        {activeView === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            <div className="max-w-2xl mx-auto bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : <FiUser />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{profile.name || 'Admin'}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      {isSuperAdmin && <FiShield className="text-amber-500" />}
                      {isSuperAdmin ? 'Super Admin' : 'Admin'} • {profile.email}
                    </p>
                    {profile.role !== 'super_admin' ? (
                      <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-bold rounded-lg border border-teal-100 flex items-center gap-1">
                        <FiMapPin className="w-2.5 h-2.5" />
                        {profile.assignedCity || 'Restricted Access'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg border border-amber-100">
                        Global Access
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input type="email" name="email" value={profile.email} onChange={handleProfileChange} required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>

                <div className="pt-6 border-t border-gray-100 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Change Password</h3>
                  <div className="space-y-4">
                    <input type="password" name="currentPassword" value={profile.currentPassword} onChange={handleProfileChange}
                      placeholder="Current Password"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="password" name="newPassword" value={profile.newPassword} onChange={handleProfileChange}
                        placeholder="New Password"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all" />
                      <input type="password" name="confirmPassword" value={profile.confirmPassword} onChange={handleProfileChange}
                        placeholder="Confirm New Password"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <button type="submit" disabled={profileLoading}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-70 shadow-lg shadow-blue-200 transition-all">
                    {profileLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSave className="w-5 h-5" />}
                    Update Profile
                  </button>
                </div>
              </form>
            </div>
          </motion.div >
        )}

        {/* Financial View */}
        {
          activeView === 'financial' && (
            <motion.div key="financial" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* General Financial Settings */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-fit">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiDollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">Financial Configuration</h2>
                </div>

                <form onSubmit={handleFinancialSave} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Visit Charges (₹)</label>
                      <input type="number" name="visitedCharges" value={financialSettings.visitedCharges} onChange={handleFinancialChange}
                        min="0"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                      <p className="text-[10px] text-gray-400 mt-1">Base convenience/visiting fee</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Instant Booking Charges (₹)</label>
                      <input type="number" name="instantBookingCharges" value={financialSettings.instantBookingCharges} onChange={handleFinancialChange}
                        min="0"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                      <p className="text-[10px] text-gray-400 mt-1">Extra fee charged when customer selects Instant / ASAP booking</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Vendor Cash Limit (₹)</label>
                      <input type="number" name="vendorCashLimit" value={financialSettings.vendorCashLimit} onChange={handleFinancialChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Service GST (%)</label>
                      <input type="number" name="serviceGstPercentage" value={financialSettings.serviceGstPercentage} onChange={handleFinancialChange}
                        min="0" max="100"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                      <p className="text-[10px] text-gray-400 mt-1">GST rate applied to services</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Parts GST (%)</label>
                      <input type="number" name="partsGstPercentage" value={financialSettings.partsGstPercentage} onChange={handleFinancialChange}
                        min="0" max="100"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                      <p className="text-[10px] text-gray-400 mt-1">GST rate applied to parts &amp; materials</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Service Payout (%)</label>
                      <input type="number" name="servicePayoutPercentage" value={financialSettings.servicePayoutPercentage} onChange={handleFinancialChange}
                        min="0" max="100"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                      <p className="text-[10px] text-gray-400 mt-1">Vendor keeps this % of service charges</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Parts Payout (%)</label>
                      <input type="number" name="partsPayoutPercentage" value={financialSettings.partsPayoutPercentage} onChange={handleFinancialChange}
                        min="0" max="100"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                      <p className="text-[10px] text-gray-400 mt-1">Vendor keeps this % of parts charges</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">TDS Percentage (%)</label>
                      <input type="number" name="tdsPercentage" value={financialSettings.tdsPercentage} onChange={handleFinancialChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Platform Fee (%)</label>
                      <input type="number" name="platformFeePercentage" value={financialSettings.platformFeePercentage} onChange={handleFinancialChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                      <p className="text-[10px] text-gray-400 mt-1">Fee charged on vendor withdrawals</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Cancellation Penalty (₹)</label>
                      <input type="number" name="cancellationPenalty" value={financialSettings.cancellationPenalty} onChange={handleFinancialChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                    </div>
                    <div className="pt-4 border-t border-gray-100 md:col-span-2">
                      <h4 className="text-xs font-bold text-gray-700 uppercase mb-3">Booking Timing & Waves</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Max Global Search Time (Mins)</label>
                          <input type="number" name="maxSearchTime" value={financialSettings.maxSearchTime} onChange={handleFinancialChange}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                          <p className="text-[10px] text-gray-400 mt-1">Total time to find a vendor before search is auto-cancelled</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Wave Alert Threshold (Secs)</label>
                          <input type="number" name="waveDuration" value={financialSettings.waveDuration} onChange={handleFinancialChange}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                          <p className="text-[10px] text-gray-400 mt-1">Time waited before alerting the next batch of vendors</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Global Search Radius (Km)</label>
                          <input type="number" name="searchRadius" value={financialSettings.searchRadius} onChange={handleFinancialChange}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 transition-all" />
                          <p className="text-[10px] text-gray-400 mt-1">Default distance to hunt for vendors around booking location</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={loading}
                      className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2 disabled:opacity-60 shadow-lg shadow-green-200">
                      {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSave className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>

              {/* Billing Information - Super Admin Only */}
              {isSuperAdmin && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-fit">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <FiFileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">Billing & Company Details</h2>
                      <p className="text-xs text-gray-500">For invoices and tax documents</p>
                    </div>
                  </div>

                  <form onSubmit={handleBillingSave} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Company Name</label>
                      <input type="text" name="companyName" value={billingSettings.companyName} onChange={handleBillingChange}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">GSTIN</label>
                        <input type="text" name="companyGSTIN" value={billingSettings.companyGSTIN} onChange={handleBillingChange}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 uppercase" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">PAN</label>
                        <input type="text" name="companyPAN" value={billingSettings.companyPAN} onChange={handleBillingChange}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 uppercase" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Full Address</label>
                      <textarea name="companyAddress" value={billingSettings.companyAddress} onChange={handleBillingChange} rows="2"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 resize-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Company Email</label>
                        <input type="email" name="companyEmail" value={billingSettings.companyEmail} onChange={handleBillingChange}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Company Phone</label>
                        <input type="text" name="companyPhone" value={billingSettings.companyPhone} onChange={handleBillingChange}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
                        <input type="text" name="companyCity" value={billingSettings.companyCity} onChange={handleBillingChange}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
                        <input type="text" name="companyState" value={billingSettings.companyState} onChange={handleBillingChange}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Pincode</label>
                        <input type="text" name="companyPincode" value={billingSettings.companyPincode} onChange={handleBillingChange}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500" />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                      <h4 className="text-xs font-bold text-gray-700 mb-3">Invoice Settings</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Prefix</label>
                          <input type="text" name="invoicePrefix" value={billingSettings.invoicePrefix} onChange={handleBillingChange}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 uppercase" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">SAC Code</label>
                          <input type="text" name="sacCode" value={billingSettings.sacCode} onChange={handleBillingChange}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500" />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button type="submit" disabled={billingLoading}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-60">
                        {billingLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSave className="w-4 h-4" />}
                        Update Billing
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          )
        }

        {/* System & Support View */}
        {
          activeView === 'system' && (
            <motion.div key="system" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* System Settings */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-fit">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FiSettings className="w-5 h-5 text-gray-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">System Preferences</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">Auto-Assign Workers</p>
                      <p className="text-xs text-gray-500 mt-1">Automatically find new worker if booking is rejected</p>
                    </div>
                    <button onClick={() => handleToggle('workerAutoAssignment')}
                      className={`relative w-12 h-7 rounded-full transition-all duration-300 ${settings.workerAutoAssignment ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${settings.workerAutoAssignment ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">Online Payments</p>
                      <p className="text-xs text-gray-500 mt-1">Enable digital payment methods for users</p>
                    </div>
                    <button onClick={() => {
                        const newValue = !financialSettings.isOnlinePaymentEnabled;
                        setFinancialSettings(prev => ({ ...prev, isOnlinePaymentEnabled: newValue }));
                        updateSettings({ isOnlinePaymentEnabled: newValue });
                      }}
                      className={`relative w-12 h-7 rounded-full transition-all duration-300 ${financialSettings.isOnlinePaymentEnabled ? 'bg-green-600' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${financialSettings.isOnlinePaymentEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                </div>
              </div>

              {/* Support Settings */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-fit">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiHeadphones className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">Contact & Support</h2>
                </div>

                <form onSubmit={handleSupportSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Support Email</label>
                    <div className="relative">
                      <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input type="email" name="supportEmail" value={supportSettings.supportEmail} onChange={handleSupportChange}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Support Phone</label>
                    <div className="relative">
                      <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input type="tel" name="supportPhone" value={supportSettings.supportPhone} onChange={handleSupportChange}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">WhatsApp Support</label>
                    <div className="relative">
                      <FiMessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input type="tel" name="supportWhatsapp" value={supportSettings.supportWhatsapp} onChange={handleSupportChange}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={supportLoading}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60 shadow-lg shadow-blue-200">
                      {supportLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSave className="w-4 h-4" />}
                      Save Details
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )
        }

        {/* City Management View */}
        {
          activeView === 'cities' && (
            <motion.div key="cities" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <CityManagement />
            </motion.div>
          )
        }

        {/* Admin Management View - Super Admin Only */}
        {
          activeView === 'admins' && isSuperAdmin && (
            <motion.div key="admins" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <FiUsers className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Admin Management</h2>
                      <p className="text-sm text-gray-500">Total {admins.length} administrators found</p>
                    </div>
                  </div>
                  <button onClick={() => { setNewAdmin({ name: '', email: '', password: '', role: 'admin', cityId: '' }); setShowAddAdmin(!showAddAdmin); }}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg transition-all ${showAddAdmin ? 'bg-gray-100 text-gray-600' : 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-100'}`}>
                    {showAddAdmin ? <FiX className="w-4 h-4" /> : <FiPlus className="w-4 h-4" />}
                    {showAddAdmin ? 'Cancel' : 'Add New Admin'}
                  </button>
                </div>

                {/* Add/Edit Admin Form */}
                <AnimatePresence>
                  {showAddAdmin && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-gray-100 bg-amber-50/50">
                      <form onSubmit={handleCreateAdmin} className="p-6">
                        <h3 className="text-sm font-bold text-gray-800 mb-4">{newAdmin.id ? 'Edit Administrator' : 'Create New Administrator'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4"> {/* Increased columns */}
                          <input type="text" placeholder="Full Name" value={newAdmin.name} onChange={e => setNewAdmin(p => ({ ...p, name: e.target.value }))}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
                          <input type="email" placeholder="Email Address" value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
                          <input type="password" placeholder={newAdmin.id ? "Password (leave blank to keep)" : "Password"} value={newAdmin.password} onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />

                          {/* Role Selection */}
                          <select value={newAdmin.role} onChange={e => setNewAdmin(p => ({ ...p, role: e.target.value }))}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200">
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>

                          {/* City Selection */}
                          <select value={newAdmin.cityId} onChange={e => setNewAdmin(p => ({ ...p, cityId: e.target.value }))}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200">
                            <option value="">All Cities (Global)</option>
                            {cities.map(city => (
                              <option key={city._id} value={city._id}>
                                {city.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex justify-end mt-4">
                          <button type="submit" disabled={adminLoading}
                            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60 font-medium text-sm">
                            {adminLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (newAdmin.id ? 'Update Admin' : 'Create Admin')}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Admins Table List */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-100">
                        <th className="px-6 py-4 font-semibold">Administrator</th>
                        <th className="px-6 py-4 font-semibold">Role</th>
                        <th className="px-6 py-4 font-semibold">Assigned City</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {admins.map((admin) => (
                        <tr key={admin._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center font-bold text-gray-600 shadow-sm border border-white">
                                {admin.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">{admin.name}</p>
                                <p className="text-xs text-gray-500">{admin.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full border ${admin.role === 'super_admin'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-blue-50 text-blue-700 border-blue-100'
                              }`}>
                              {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {admin.cityId ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                                {admin.cityId.name || 'Unknown City'}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">All Cities</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`flex items-center gap-1.5 text-xs font-medium ${admin.isActive !== false ? 'text-green-600' : 'text-red-500'}`}>
                              <span className={`w-2 h-2 rounded-full ${admin.isActive !== false ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              {admin.isActive !== false ? 'Active' : 'Blocked'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {admin._id !== profile.id && admin.email !== 'admin@admin.com' && (
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleEditClick(admin)}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Edit Admin">
                                  <FiEdit className="w-4 h-4" />
                                </button>

                                <button onClick={() => handleBlockAdmin(admin._id, admin.isActive !== false)}
                                  className={`p-2 text-gray-400 rounded-lg transition-all ${admin.isActive !== false ? 'hover:text-amber-600 hover:bg-amber-50' : 'hover:text-green-600 hover:bg-green-50'
                                    }`}
                                  title={admin.isActive !== false ? "Block Admin" : "Unblock Admin"}>
                                  {admin.isActive !== false ? <FiLock className="w-4 h-4" /> : <FiUnlock className="w-4 h-4" />}
                                </button>

                                <button onClick={() => handleDeleteAdmin(admin._id, admin.name)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete Admin">
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {admins.length === 0 && (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                            <FiUsers className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No administrators found</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )
        }
        {/* Booking Slots & Timing View - Super Admin Only */}
        {
          activeView === 'slots' && isSuperAdmin && (
            <motion.div key="slots" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              className="space-y-6">
              
              {/* Slot Generation & Operating Rules */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                      <FiClock className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">Booking Time Slots Configuration</h2>
                      <p className="text-xs text-gray-500">Manage daily operating hours, interval duration, and advance scheduling window</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSlotSave}
                    disabled={slotLoading}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-70 transition-all"
                  >
                    {slotLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSave className="w-4 h-4" />}
                    Save Slot Settings
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Service Start Time (Daily)</label>
                    <select
                      name="slotStartHour"
                      value={slotSettings.slotStartHour}
                      onChange={handleSlotChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    >
                      <option value={6}>6:00 AM</option>
                      <option value={7}>7:00 AM</option>
                      <option value={8}>8:00 AM</option>
                      <option value={9}>9:00 AM (Default)</option>
                      <option value={10}>10:00 AM</option>
                      <option value={11}>11:00 AM</option>
                      <option value={12}>12:00 PM</option>
                    </select>
                    <p className="text-[11px] text-gray-400 mt-1">First available slot of the day</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Service End Time (Daily)</label>
                    <select
                      name="slotEndHour"
                      value={slotSettings.slotEndHour}
                      onChange={handleSlotChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    >
                      <option value={18}>6:00 PM</option>
                      <option value={19}>7:00 PM</option>
                      <option value={20}>8:00 PM</option>
                      <option value={21}>9:00 PM (Default)</option>
                      <option value={22}>10:00 PM</option>
                      <option value={23}>11:00 PM</option>
                      <option value={24}>12:00 AM (Midnight)</option>
                    </select>
                    <p className="text-[11px] text-gray-400 mt-1">Closing time of booking operations</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Slot Interval / Gap</label>
                    <select
                      name="slotIntervalMins"
                      value={slotSettings.slotIntervalMins}
                      onChange={handleSlotChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    >
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes</option>
                      <option value={60}>60 Minutes (1 Hour)</option>
                      <option value={90}>90 Minutes (1.5 Hours)</option>
                      <option value={120}>120 Minutes (2 Hours)</option>
                    </select>
                    <p className="text-[11px] text-gray-400 mt-1">Time difference between consecutive slots</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Advance Booking Window (Days)</label>
                    <select
                      name="maxDaysInAdvance"
                      value={slotSettings.maxDaysInAdvance}
                      onChange={handleSlotChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    >
                      <option value={3}>3 Days Ahead</option>
                      <option value={5}>5 Days Ahead</option>
                      <option value={7}>7 Days (1 Week - Default)</option>
                      <option value={10}>10 Days Ahead</option>
                      <option value={14}>14 Days (2 Weeks)</option>
                      <option value={30}>30 Days (1 Month)</option>
                    </select>
                    <p className="text-[11px] text-gray-400 mt-1">Number of dates visible in user calendar</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Same-Day Minimum Notice (Hours)</label>
                    <select
                      name="leadTimeHours"
                      value={slotSettings.leadTimeHours}
                      onChange={handleSlotChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    >
                      <option value={0}>0 Hours (Immediate)</option>
                      <option value={1}>1 Hour Notice (Default)</option>
                      <option value={2}>2 Hours Notice</option>
                      <option value={3}>3 Hours Notice</option>
                      <option value={4}>4 Hours Notice</option>
                    </select>
                    <p className="text-[11px] text-gray-400 mt-1">Buffer before user can book a slot today</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Approx. Service Duration (Mins)</label>
                    <input
                      type="number"
                      name="slotServiceDurationMins"
                      value={slotSettings.slotServiceDurationMins}
                      onChange={handleSlotChange}
                      min="15"
                      max="360"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Displayed as subtitle: "Service will take approx. X mins"</p>
                  </div>
                </div>
              </div>

              {/* Interactive Live Slot Activation Grid */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                      <span>Live Slot Availability Matrix</span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                        {generateSlotsList(slotSettings.slotStartHour, slotSettings.slotEndHour, slotSettings.slotIntervalMins).length} Total Slots
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Click any slot chip to toggle between Active (Available) and Blocked (Disabled) for customers.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleEnableAllSlots}
                      className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
                    >
                      Enable All
                    </button>
                    <button
                      type="button"
                      onClick={handleDisableAllSlots}
                      className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                    >
                      Block All
                    </button>
                  </div>
                </div>

                {/* Slots Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                  {generateSlotsList(slotSettings.slotStartHour, slotSettings.slotEndHour, slotSettings.slotIntervalMins).map((slot) => {
                    const isBlocked = (slotSettings.disabledSlots || []).includes(slot.value);
                    return (
                      <button
                        key={slot.value}
                        type="button"
                        onClick={() => toggleSlotDisabled(slot.value)}
                        className={`p-3 rounded-xl border text-left flex flex-col transition-all cursor-pointer relative group ${
                          isBlocked
                            ? 'bg-red-50/50 border-red-200 text-red-700 hover:bg-red-100/60'
                            : 'bg-white border-green-200 text-gray-800 hover:border-green-400 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black">{slot.display}</span>
                          {isBlocked ? (
                            <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold">
                              <FiSlash className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-bold">
                              <FiCheck className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-medium ${isBlocked ? 'text-red-500 line-through' : 'text-gray-400'}`}>
                          {slot.fullRange}
                        </span>
                        <span className={`mt-2 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded w-fit ${
                          isBlocked ? 'bg-red-200/60 text-red-800' : 'bg-green-100 text-green-700'
                        }`}>
                          {isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )
        }
      </AnimatePresence >
    </motion.div >
  );
};
export default AdminSettings;
