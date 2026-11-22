export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/** Client SDK key from https://dev.quickpose.ai, registered for iOS com.healthyapp.app and Android com.beatset.app. */
export const QUICKPOSE_SDK_KEY = process.env.EXPO_PUBLIC_QUICKPOSE_SDK_KEY?.trim() ?? '';

/**
 * Meta / Facebook App ID for Instagram Stories handoff
 * (`instagram-stories://share?source_application=` / Android ADD_TO_STORY).
 * Create an app at https://developers.facebook.com — without this, Stories
 * share falls back to the system sheet.
 */
export const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID?.trim() ?? '';

/** The public site; it hosts the legal pages the sign-up screens link to. */
export const WEBSITE_URL = 'https://beatset.tech';
export const TERMS_URL = `${WEBSITE_URL}/terms`;
export const PRIVACY_URL = `${WEBSITE_URL}/privacy`;
