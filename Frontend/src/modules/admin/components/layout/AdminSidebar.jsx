import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiHome,
  FiUsers,
  FiBriefcase,
  FiUser,
  FiShoppingBag,
  FiGrid,
  FiDollarSign,
  FiFileText,
  FiBell,
  FiSettings,
  FiChevronDown,
  FiX,
  FiPackage,
  FiStar,
  FiSearch,
} from "react-icons/fi";
import adminMenu from "../../config/adminMenu.json";
import dashboardService from "../../services/dashboardService";

// Icon mapping for menu items
const iconMap = {
  Dashboard: FiHome,
  Users: FiUsers,
  Vendors: FiBriefcase,
  Bookings: FiShoppingBag,
  "User Catalog": FiGrid,
  "Vendor Services": FiGrid,
  "Vendor Parts": FiPackage,
  Payments: FiDollarSign,
  Reports: FiFileText,
  Notifications: FiBell,
  Reviews: FiStar,
  Settlements: FiDollarSign,
  Settings: FiSettings,
  Plans: FiPackage,
};

// Helper function to convert child name to route path
const getChildRoute = (parentRoute, childName) => {
  const routeMap = {
    "/admin/users": {
      "All Users": "/admin/users/all",
      "User Bookings": "/admin/users/bookings",
      "Transactions": "/admin/users/transactions",
      "User Analytics": "/admin/users/analytics",
    },
    "/admin/vendors": {
      "All Vendors": "/admin/vendors/all",
      "Vendor Bookings": "/admin/vendors/bookings",
      "Vendor Analytics": "/admin/vendors/analytics",
      "Vendor Payments": "/admin/vendors/payments",
    },
    "/admin/bookings": {
      "All Bookings": "/admin/bookings",
      "Booking Tracking": "/admin/bookings/tracking",
      "Booking Notifications": "/admin/bookings/notifications",
    },
    "/admin/user-categories": {
      "Home": "/admin/user-categories/home",
      "Manage Categories": "/admin/user-categories/categories",
      "Manage Brands": "/admin/user-categories/brands",
      "Manage Services": "/admin/user-categories/sections",
    },
    "/admin/payments": {
      "Payment Overview": "/admin/payments/overview",
      "User Payments": "/admin/payments/users",
      "Vendor Payments": "/admin/payments/vendors",
      "Admin Revenue": "/admin/payments/revenue",
      "Payment Reports": "/admin/payments/reports",
    },
    "/admin/reports": {
      "Revenue Report": "/admin/reports/revenue",
      "Booking Report": "/admin/reports/bookings",
      "Payment Report": "/admin/payments/reports",
    },
    "/admin/notifications": {
      "Push Notifications": "/admin/notifications/push",
      "Custom Messages": "/admin/notifications/messages",
      "Notification Settings": "/admin/notifications/settings",
    },
    "/admin/settings": {
      "General Settings": "/admin/settings/general",
      "Service Configuration": "/admin/settings/service-config",
      "System Settings": "/admin/settings/system",
    },
    "/admin/settlements": {
      "Pending": "/admin/settlements/pending",
      "Withdrawals": "/admin/settlements/withdrawals",
      "Vendors with Due": "/admin/settlements/vendors",
      "History": "/admin/settlements/history",
    },
  };

  return routeMap[parentRoute]?.[childName] || parentRoute;
};

const AdminSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [adminUser, setAdminUser] = useState({ name: 'Admin', email: '', role: 'admin' });
  const [counts, setCounts] = useState({
    bookings: 0,
    vendors: 0,
    withdrawals: 0,
    pendingSettlements: 0
  });

  // Load admin user from storage
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('adminData') || localStorage.getItem('adminData');
      const stored = JSON.parse(storedData || '{}');
      if (stored.name || stored.email) {
        setAdminUser({
          name: stored.name || 'Admin',
          email: stored.email || '',
          role: stored.role || 'admin'
        });
      }
    } catch (e) {
      console.error('Failed to parse admin data:', e);
    }
  }, []);

  // Filter menu items by role and search query
  const filteredMenu = useMemo(() => {
    return adminMenu.filter(item => {
      // Role filter
      if (item.allowedRoles && !item.allowedRoles.includes(adminUser.role)) {
        return false;
      }
      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const titleMatch = item.title.toLowerCase().includes(q);
      const childMatch = item.children && item.children.some(c => c.toLowerCase().includes(q));
      return titleMatch || childMatch;
    });
  }, [adminUser.role, searchQuery]);

  // Group filtered menu by section
  const groupedSections = useMemo(() => {
    const groups = {};
    filteredMenu.forEach(item => {
      const section = item.section || "MAIN";
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(item);
    });
    return groups;
  }, [filteredMenu]);

  // Fetch pending counts for badges
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await dashboardService.getStats();
        if (response.success && response.data?.stats) {
          const stats = response.data.stats;
          setCounts({
            bookings: stats.pendingBookings || 0,
            vendors: stats.pendingVendors || 0,
            withdrawals: stats.pendingWithdrawals || 0,
            pendingSettlements: stats.pendingSettlements || 0
          });
        }
      } catch (error) {
        console.error("Error fetching sidebar counts:", error);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  }, [location.pathname]);

  // Auto-expand menu items when their route is active or during search
  useEffect(() => {
    if (searchQuery.trim()) {
      // Auto expand all with children during search
      const newExpanded = {};
      filteredMenu.forEach(item => {
        if (item.children && item.children.length > 0) {
          newExpanded[item.title] = true;
        }
      });
      setExpandedItems(newExpanded);
      return;
    }

    const activeItem = filteredMenu.find((item) => {
      if (item.route === "/admin/dashboard") {
        return location.pathname === "/admin/dashboard";
      }
      const isChildRoute =
        location.pathname.startsWith(item.route) &&
        location.pathname !== item.route;
      return isChildRoute;
    });
    if (activeItem && activeItem.children && activeItem.children.length > 0) {
      setExpandedItems((prev) => {
        if (prev[activeItem.title]) {
          return prev;
        }
        return {
          [activeItem.title]: true,
        };
      });
    }
  }, [location.pathname, filteredMenu, searchQuery]);

  // Check if a menu item is active
  const isActive = (route) => {
    if (route === "/admin/dashboard") {
      return location.pathname === "/admin/dashboard";
    }

    if (route === "/admin/user-categories") {
      if (location.pathname.startsWith("/admin/user-categories/vendor-")) {
        return false;
      }
    }

    return location.pathname === route || location.pathname.startsWith(route + '/');
  };

  // Toggle expanded state for menu items with children
  const toggleExpand = (title, closeOthers = true) => {
    setExpandedItems((prev) => {
      if (closeOthers && !searchQuery.trim()) {
        return {
          [title]: !prev[title],
        };
      } else {
        return {
          ...prev,
          [title]: !prev[title],
        };
      }
    });
  };

  // Handle menu item click
  const handleMenuItemClick = (route, parentTitle = null) => {
    if (parentTitle) {
      setExpandedItems((prev) => ({
        ...prev,
        [parentTitle]: true,
      }));
    }
    navigate(route);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // Render menu item
  const renderMenuItem = (item) => {
    const Icon = iconMap[item.title] || FiHome;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.title];
    const active = isActive(item.route);

    return (
      <div key={item.route} className="mb-1">
        {/* Main Menu Item */}
        <div
          className={`
            flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer select-none
            ${active
              ? "bg-[#720C3E] text-white shadow-md font-semibold"
              : "text-slate-300 hover:bg-slate-700/80 hover:text-white font-medium"
            }
          `}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.title, true);
            } else {
              handleMenuItemClick(item.route);
            }
          }}>
          <Icon
            className={`text-lg flex-shrink-0 ${active ? "text-white" : "text-slate-400"}`}
          />
          <span className="flex-1 text-sm">{item.title}</span>

          {/* Badges */}
          {item.title === "Bookings" && counts.bookings > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse mr-1">
              {counts.bookings > 99 ? '99+' : counts.bookings}
            </span>
          )}
          {item.title === "Vendors" && counts.vendors > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse mr-1">
              {counts.vendors > 99 ? '99+' : counts.vendors}
            </span>
          )}
          {item.title === "Settlements" && (counts.withdrawals + counts.pendingSettlements) > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse mr-1">
              {(counts.withdrawals + counts.pendingSettlements) > 99 ? '99+' : (counts.withdrawals + counts.pendingSettlements)}
            </span>
          )}

          {hasChildren && (
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}>
              <FiChevronDown className="text-slate-400 text-xs" />
            </motion.div>
          )}
        </div>

        {/* Children Items */}
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden">
              <div className="ml-3 mt-1 pl-3 border-l-2 border-slate-700 space-y-1">
                {item.children.map((child, index) => {
                  const childRoute = getChildRoute(item.route, child);
                  const isChildActive =
                    location.pathname === childRoute ||
                    (childRoute !== item.route &&
                      location.pathname.startsWith(childRoute));

                  return (
                    <div
                      key={index}
                      onClick={() => handleMenuItemClick(childRoute, item.title)}
                      className={`
                        px-3 py-2 text-xs sm:text-sm rounded-lg transition-colors cursor-pointer flex justify-between items-center
                        ${isChildActive
                          ? "bg-[#720C3E] text-white font-semibold shadow-sm"
                          : "text-slate-300 hover:bg-slate-700/70 hover:text-white font-medium"
                        }
                      `}>
                      <span>{child}</span>
                      {item.title === "Settlements" && child === "Pending" && counts.pendingSettlements > 0 && (
                        <span className="bg-red-500 text-white text-[10px] h-4 min-w-[18px] px-1.5 flex items-center justify-center rounded-full">
                          {counts.pendingSettlements}
                        </span>
                      )}
                      {item.title === "Settlements" && child === "Withdrawals" && counts.withdrawals > 0 && (
                        <span className="bg-orange-500 text-white text-[10px] h-4 min-w-[18px] px-1.5 flex items-center justify-center rounded-full">
                          {counts.withdrawals}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Sidebar content
  const sidebarContent = (
    <div className="h-full w-full flex flex-col bg-slate-900 border-r border-slate-800 select-none">
      {/* 1. Header Section */}
      <div className="px-4 py-4 border-b border-slate-800/90 bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #2874F0 0%, #4787F7 100%)',
              }}
            >
              <FiUser className="text-white text-lg" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-white text-sm truncate">
                {adminUser.name}
              </h2>
              <p className="text-[11px] text-amber-400 font-semibold truncate flex items-center gap-1">
                ⭐ {adminUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </p>
            </div>
          </div>

          {/* Close Button - Mobile Only */}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 lg:hidden text-slate-300"
            aria-label="Close sidebar">
            <FiX className="text-lg" />
          </button>
        </div>
      </div>

      {/* 2. Search Menu Box */}
      <div className="px-3.5 pt-3 pb-1">
        <div className="relative flex items-center">
          <FiSearch className="absolute left-3.5 text-slate-400 text-sm pointer-events-none" />
          <input
            type="text"
            placeholder="Search Menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#720C3E] focus:ring-1 focus:ring-[#720C3E] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              <FiX />
            </button>
          )}
        </div>
      </div>

      {/* 3. Grouped Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-3.5 py-2 scrollbar-admin space-y-4">
        {Object.entries(groupedSections).map(([sectionName, items]) => (
          <div key={sectionName} className="space-y-1">
            {/* Section Heading Title */}
            {sectionName !== "MAIN" && (
              <div className="text-[10.5px] font-bold text-slate-400 tracking-wider uppercase px-2.5 pt-2 pb-1">
                {sectionName}
              </div>
            )}

            {/* Menu Items */}
            {items.map((item) => renderMenuItem(item))}
          </div>
        ))}

        {Object.keys(groupedSections).length === 0 && (
          <div className="text-center text-xs text-slate-400 py-6">
            No matching menu items found
          </div>
        )}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile: Overlay Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[99998] lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 w-[315px] z-[99999] lg:hidden shadow-2xl"
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop Fixed */}
      <div
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30 w-[315px]"
      >
        {sidebarContent}
      </div>
    </>
  );
};

export default AdminSidebar;
