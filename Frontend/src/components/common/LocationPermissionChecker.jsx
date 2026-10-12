// Location Permission Checker Component for Qwiklly
import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import flutterBridge from '../../utils/flutterBridge';

export const LocationPermissionChecker = () => {
    useEffect(() => {
        // Location is requested by Home only when it is actually needed.
        // Keep this global component passive so route changes cannot trigger GPS.
        const checkPermission = async () => {
            try {
                const location = await flutterBridge.getCurrentLocation();
                localStorage.setItem('location_granted', 'true');
                window.dispatchEvent(new CustomEvent('locationUpdate', { detail: location }));
            } catch (err) {
                toast.error("Please enable your location to use this feature.");
            }
        };

        const handleManualTrigger = () => {
            checkPermission();
        };
        window.addEventListener('requestLocationPrompt', handleManualTrigger);

        return () => {
            window.removeEventListener('requestLocationPrompt', handleManualTrigger);
        };
    }, []);

    return null;
};
