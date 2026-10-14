// Location Permission Checker Component for Qwiklly
import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import flutterBridge from '../../utils/flutterBridge';

export const LocationPermissionChecker = () => {
    useEffect(() => {
        // Location is requested by Home only when it is actually needed.
        // Keep this global component passive so route changes cannot trigger GPS.
        const checkPermission = async (suppressToast = false) => {
            try {
                const location = await flutterBridge.getCurrentLocation({ allowBrowserFallback: false });
                const latitude = Number(location?.coords?.latitude ?? location?.latitude);
                const longitude = Number(location?.coords?.longitude ?? location?.longitude);

                if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                    throw new Error('Native location coordinates are missing');
                }

                localStorage.setItem('userLat', String(latitude));
                localStorage.setItem('userLng', String(longitude));
                localStorage.setItem('location_granted', 'true');
                window.dispatchEvent(new CustomEvent('locationUpdate', {
                    detail: {
                        ...location,
                        lat: latitude,
                        lng: longitude,
                        fromNativePermissionPrompt: true
                    }
                }));
            } catch (err) {
                if (!suppressToast) {
                    toast.error("Please enable your location to use this feature.");
                }
            }
        };

        const handleManualTrigger = (event) => {
            checkPermission(Boolean(event.detail?.suppressToast));
        };
        window.addEventListener('requestLocationPrompt', handleManualTrigger);

        return () => {
            window.removeEventListener('requestLocationPrompt', handleManualTrigger);
        };
    }, []);

    return null;
};
