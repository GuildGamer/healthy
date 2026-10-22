export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/** Client SDK key from https://dev.quickpose.ai, tied to com.healthyapp.app. */
export const QUICKPOSE_SDK_KEY = process.env.EXPO_PUBLIC_QUICKPOSE_SDK_KEY?.trim() ?? '';

/** The public site; it hosts the legal pages the sign-up screens link to. */
export const WEBSITE_URL = 'https://gethealthyapp.com';
export const TERMS_URL = `${WEBSITE_URL}/terms`;
export const PRIVACY_URL = `${WEBSITE_URL}/privacy`;
