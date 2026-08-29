import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastBanner } from './ToastBanner';
import type { ToastTone } from './types';

const AUTO_HIDE_MS = 4_000;

interface ShowToastInput {
  message: string;
  tone?: ToastTone;
  persist?: boolean;
}

interface ToastHost {
  show: (input: ShowToastInput) => void;
  hide: () => void;
}

interface VisibleToast {
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<ToastHost | null>(null);

export function useToast(): ToastHost {
  const host = useContext(ToastContext);
  if (!host) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return host;
}

export function useOptionalToastHost(): ToastHost | null {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<VisibleToast | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearHideTimer();
    setToast(null);
  }, [clearHideTimer]);

  const show = useCallback(
    (input: ShowToastInput) => {
      const tone = input.tone ?? 'info';
      const persist = input.persist ?? tone === 'error';

      clearHideTimer();
      setToast({ message: input.message, tone });

      if (!persist) {
        hideTimer.current = setTimeout(() => {
          setToast(null);
          hideTimer.current = null;
        }, AUTO_HIDE_MS);
      }
    },
    [clearHideTimer],
  );

  useEffect(() => clearHideTimer, [clearHideTimer]);

  const host = useMemo<ToastHost>(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={host}>
      {children}
      {toast ? (
        <View
          pointerEvents="box-none"
          style={[styles.overlay, { paddingTop: insets.top }]}
        >
          <ToastBanner message={toast.message} onPress={hide} tone={toast.tone} />
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 20,
  },
});
