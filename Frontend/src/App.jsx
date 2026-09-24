import React, { useEffect } from 'react'; // Updated index to .jsx
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import AppRoutes from './routes';
import { SocketProvider } from './context/SocketContext';
import { CartProvider } from './context/CartContext';
import { CityProvider } from './context/CityContext';
import { initializePushNotifications, setupForegroundNotificationHandler } from './services/pushNotificationService';
import { LocationPermissionChecker } from './components/common';

function App() {
  // Initialize push notifications on app load
  useEffect(() => {
    initializePushNotifications();

    // Setup foreground notification handler
    setupForegroundNotificationHandler((payload) => {
      // console.log('📬 Notification received:', payload);

      // Dispatch update events for listening components to refresh UI
      window.dispatchEvent(new Event('vendorJobsUpdated'));
      window.dispatchEvent(new Event('vendorStatsUpdated'));
      window.dispatchEvent(new Event('workerJobsUpdated'));
      window.dispatchEvent(new Event('userBookingsUpdated'));
      window.dispatchEvent(new Event('userNotificationsUpdated'));

      // Also dispatch generic one if needed
      window.dispatchEvent(new Event('appNotificationReceived'));

      // If this is a test notification, show toast in foreground so user sees instant confirmation
      const isTest = payload.data?.type === 'test' || 
                     payload.notification?.title?.includes('Test') ||
                     payload.data?.title?.includes('Test');
      if (isTest) {
        toast.success(payload.notification?.body || payload.data?.body || 'Test push notification received successfully! 🚀', {
          icon: '🔔',
          duration: 4000,
        });
      }
    });
  }, []);

  return (
    <BrowserRouter>
      <SocketProvider>
        <CityProvider>
          <CartProvider>
            <div className="App">
              <AppRoutes />
              <LocationPermissionChecker />
              <Toaster
                position="top-center"
                reverseOrder={false}
                toastOptions={{
                  duration: 2000, // Global default (reduced from 3000)
                  style: {
                    background: '#333',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '12px 20px',
                  },
                  success: {
                    duration: 1000, // 1 second as requested
                    style: {
                      background: '#10B981',
                    },
                  },
                  error: {
                    duration: 2000, // Reduced from 4000
                    style: {
                      background: '#EF4444',
                    },
                  },
                }}
              />
            </div>
          </CartProvider>
        </CityProvider>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;
