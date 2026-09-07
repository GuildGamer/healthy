import { requireNativeViewManager } from 'expo-modules-core';
import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type QuickPoseCameraUpdateEvent = {
  nativeEvent: {
    results: Record<string, number>;
    feedbacks: Record<string, string>;
  };
};

export type QuickPoseCameraViewProps = {
  sdkKey: string;
  features: string[];
  featureStyles?: Record<string, Record<string, unknown>>;
  useFrontCamera?: boolean;
  style?: StyleProp<ViewStyle>;
  onUpdate?: (event: QuickPoseCameraUpdateEvent) => void;
};

export const QuickPoseCameraView: ComponentType<QuickPoseCameraViewProps> =
  requireNativeViewManager('QuickPoseCamera');
