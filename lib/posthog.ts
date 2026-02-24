
import posthog from 'posthog-js';

export const initPostHog = () => {
  if (typeof window !== 'undefined') {
    try {
        posthog.init('phc_5aL4224d9a43a059a4369eI0Gq24dJ4eD0I0g3g1b4j', {
            api_host: 'https://app.posthog.com',
            // Disable capturing if there are issues or in dev
            capture_pageview: false, 
            capture_pageleave: false,
            autocapture: false,
            // Prevent errors from bubbling up to the console
            loaded: (ph) => {
                // Optional: Configs after load
            },
            request_batching: true,
            disable_compression: true // Sometimes helps with CORS/Network issues
        });
    } catch (e) {
        console.warn('PostHog init failed (analytics disabled):', e);
    }
  }
};

export default posthog;
