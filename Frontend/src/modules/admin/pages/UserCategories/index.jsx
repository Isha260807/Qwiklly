import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ensureIds, loadCatalog } from "./utils";
import CategoriesPage from "./pages/CategoriesPage";
import ServicesPage from "./pages/ServicesPage";
import BrandsPage from "./pages/BrandsPage";
import VendorServicesPage from "./pages/VendorServicesPage";
import VendorPartsPage from "./pages/VendorPartsPage";
import ServicePageBuilder from "./pages/ServicePageBuilder";
import HomeContentPage from "./pages/HomeContentPage";

const UserCategories = () => {
  const [catalog, setCatalog] = useState(() => ensureIds(loadCatalog()));

  useEffect(() => {
    const handler = () => setCatalog(ensureIds(loadCatalog()));
    window.addEventListener("adminUserAppCatalogUpdated", handler);
    return () => window.removeEventListener("adminUserAppCatalogUpdated", handler);
  }, []);

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Routes>
          <Route index element={<Navigate to="sections" replace />} />
          <Route path="home" element={<Navigate to="sections" replace />} />
          <Route path="sections" element={<ServicesPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="page-builder" element={<ServicePageBuilder />} />
          <Route path="home-content" element={<HomeContentPage />} />
          <Route path="page-builder/:serviceId" element={<ServicePageBuilder />} />
          <Route path="categories" element={<Navigate to="services" replace />} />
          <Route path="brands" element={<Navigate to="services" replace />} />
          <Route path="vendor-services" element={<Navigate to="services" replace />} />
          <Route path="vendor-parts" element={<Navigate to="services" replace />} />
          <Route path="*" element={<Navigate to="sections" replace />} />
        </Routes>
      </motion.div>
    </div>
  );
};

export default UserCategories;


