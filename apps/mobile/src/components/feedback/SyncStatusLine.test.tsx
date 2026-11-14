import { render, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { ThemeProvider } from '@/theme';
import {
  SyncStatusLine,
  attentionSetsLabel,
  syncingSetsLabel,
} from './SyncStatusLine';

function renderLine(
  props: ComponentProps<typeof SyncStatusLine>,
) {
  return render(
    <ThemeProvider>
      <SyncStatusLine {...props} />
    </ThemeProvider>,
  );
}

describe('SyncStatusLine', () => {
  it('renders syncing, attention, and saved labels', () => {
    const { rerender } = renderLine({
      label: syncingSetsLabel(1),
      testID: 'sync-line',
      tone: 'syncing',
    });
    expect(screen.getByTestId('sync-line')).toBeTruthy();
    expect(screen.getByText('1 set syncing')).toBeTruthy();

    rerender(
      <ThemeProvider>
        <SyncStatusLine label={attentionSetsLabel(2)} testID="sync-line" tone="attention" />
      </ThemeProvider>,
    );
    expect(screen.getByText('2 sets need attention')).toBeTruthy();

    rerender(
      <ThemeProvider>
        <SyncStatusLine label="Saved" testID="sync-line" tone="saved" />
      </ThemeProvider>,
    );
    expect(screen.getByText('Saved')).toBeTruthy();
  });

  it('labels empty counts as blank', () => {
    expect(syncingSetsLabel(0)).toBe('');
    expect(attentionSetsLabel(0)).toBe('');
  });
});
