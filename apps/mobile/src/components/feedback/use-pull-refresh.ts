import { useState } from 'react';

const MIN_REFRESH_MS = 600;

export function usePullRefresh(refresh: () => Promise<unknown>) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function onRefresh() {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    const startedAt = Date.now();

    try {
      await refresh();
    } finally {
      const remaining = MIN_REFRESH_MS - (Date.now() - startedAt);
      if (remaining > 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, remaining);
        });
      }
      setIsRefreshing(false);
    }
  }

  return { isRefreshing, onRefresh };
}
