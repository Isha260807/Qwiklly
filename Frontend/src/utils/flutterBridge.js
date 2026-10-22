/**
 * Production-Ready Flutter JS Bridge
 * Handles secure and optimized communication with native mobile features.
 */
class FlutterBridge {
  constructor() {
    this.isFlutter =
      typeof window !== "undefined" &&
      window.flutter_inappwebview;
  }

  /**
   * Waits for the native WebView bride to be fully available.
   */
  waitForFlutter() {
    return new Promise((resolve) => {
      if (this.isFlutter) return resolve(true);

      window.addEventListener(
        "flutterInAppWebViewPlatformReady",
        () => {
          this.isFlutter = true;
          resolve(true);
        },
        { once: true }
      );

      // 1-second timeout as safety
      setTimeout(() => resolve(false), 1000);
    });
  }

  /**
   * Universal call to any Flutter JS Handler with availability check.
   */
  async callHandler(handlerName, data = {}) {
    await this.waitForFlutter();

    if (!this.isFlutter) {
      // Quietly return failure for web browsers - this is expected
      return { success: false, error: "Not inside Flutter WebView" };
    }

    try {
      return await window.flutter_inappwebview.callHandler(handlerName, data);
    } catch (error) {
      console.error(`[FlutterBridge] Error calling native handler ${handlerName}:`, error);
      return { success: false, error: error.message };
    }
  }

  /* ================================
        CAMERA (NATIVE)
  ================================== */
  async openCamera() {
    try {
      const result = await this.callHandler("openCamera");

      if (result && result.success) {
        // Convert base64 to blob without using fetch to avoid any CSP connect-src issues
        const byteString = atob(result.base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: result.mimeType || 'image/jpeg' });

        return new File([blob], result.fileName || `cam_${Date.now()}.jpg`, {
          type: result.mimeType || 'image/jpeg',
        });
      }
      return null;
    } catch (error) {
      console.error("[FlutterBridge] Camera Error:", error);
      return null;
    }
  }

  /* ================================
        LOCATION (NATIVE + FALLBACK)
  ================================== */
  async getCurrentLocation(options = {}) {
    // If inside Flutter app WebView, attempt native bridge first
    if (this.isFlutter) {
      try {
        const result = await this.callHandler("getLocation");
        if (result && result.success && result.latitude && result.longitude) {
          return {
            latitude: result.latitude,
            longitude: result.longitude,
            source: 'flutter_native'
          };
        }
      } catch (nativeErr) {
        console.warn("[FlutterBridge] Native Flutter location error:", nativeErr);
      }
    }

    if (options.allowBrowserFallback === false) {
      throw new Error('Native Flutter location is unavailable');
    }

    // Web Browser Geolocation fallback
    return new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new Error("Geolocation not supported by browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: 'browser_gps'
          });
        },
        (err) => {
          // If error is permission denied, reject immediately (no need to retry low accuracy)
          if (err && err.code === 1) {
            reject(err);
            return;
          }

          // If high accuracy failed/timed out, try low accuracy once
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                source: 'browser_gps'
              });
            },
            (finalErr) => {
              reject(finalErr || err);
            },
            {
              enableHighAccuracy: false,
              timeout: 4000,
              maximumAge: 60000
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 30000
        }
      );
    });
  }

  /**
   * Triggers native haptic feedback.
   */
  async hapticFeedback(type = "medium") {
    return this.callHandler("haptic", { type });
  }

  /**
   * Opens App/System Settings (Native)
   */
  async openAppSettings() {
    return this.callHandler("openSettings");
  }
}

const bridgeInstance = new FlutterBridge();
export default bridgeInstance;
export const flutterBridge = bridgeInstance;
