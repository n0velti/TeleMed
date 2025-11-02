/**
 * Web-only Chime SDK import wrapper
 * This file helps Metro bundler handle the Chime SDK import
 * 
 * IMPORTANT: This file should NOT be imported at the top level in video-call.tsx
 * Instead, it should be dynamically imported when needed
 */

// Export a function that loads the SDK dynamically to avoid Metro bundler issues
export async function loadChimeSDK() {
  try {
    // Try dynamic import first (works better with Metro)
    const module = await import('amazon-chime-sdk-js');
    return module.default || module;
  } catch (error) {
    console.error('[chime-sdk-web] Dynamic import failed:', error);
    throw error;
  }
}

// For backwards compatibility, export a default that throws
// This forces the component to use loadChimeSDK() instead
export default null;

