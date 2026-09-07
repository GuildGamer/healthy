export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/** Client SDK key from https://dev.quickpose.ai, tied to com.healthyapp.app. */
export const QUICKPOSE_SDK_KEY =
  process.env.EXPO_PUBLIC_QUICKPOSE_SDK_KEY?.trim() ?? '';
