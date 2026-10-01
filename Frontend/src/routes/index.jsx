import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Import module routes (Existing applications - 100% untouched)
import UserRoutes from '../modules/user/routes';
import VendorRoutes from '../modules/vendor/routes';
import AdminRoutes from '../modules/admin/routes';

// Import Public Website Pages
import PublicHome from '../modules/public/pages/Home';
import PublicAbout from '../modules/public/pages/About';
import PublicContact from '../modules/public/pages/Contact';
import PublicPrivacyPolicy from '../modules/public/pages/PrivacyPolicy';
import PublicTermsConditions from '../modules/public/pages/TermsConditions';
import PublicRefundPolicy from '../modules/public/pages/RefundPolicy';

const AppRoutes = () => {
  return (
    <Routes>
      {/* 1. Public Marketing & Information Website */}
      <Route path="/" element={<PublicHome />} />
      <Route path="/Home" element={<PublicHome />} />
      <Route path="/about" element={<PublicAbout />} />
      <Route path="/contact" element={<PublicContact />} />
      <Route path="/privacy-policy" element={<PublicPrivacyPolicy />} />
      <Route path="/terms-and-conditions" element={<PublicTermsConditions />} />
      <Route path="/refund-policy" element={<PublicRefundPolicy />} />


      {/* 2. Existing Qwiklly User Application (login/signup intact) */}
      <Route path="/user/*" element={<UserRoutes />} />

      {/* 3. Existing Qwiklly Vendor Portal (100% UNCHANGED) */}
      <Route path="/vendor/*" element={<VendorRoutes />} />

      {/* 4. Existing Qwiklly Admin Portal (100% UNCHANGED) */}
      <Route path="/admin/*" element={<AdminRoutes />} />
    </Routes>
  );
};

export default AppRoutes;


