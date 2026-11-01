import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createElement, type ReactNode } from 'react';
import * as pickProfilePhotoModule from '@/lib/pick-profile-photo';
import { useUpdateProfilePhoto } from './useUpdateProfilePhoto';

jest.mock('@/lib/auth-client', () => ({
  updateUser: jest.fn(async () => ({ error: null })),
}));

jest.mock('@/lib/pick-profile-photo', () => {
  const actual = jest.requireActual<typeof import('@/lib/pick-profile-photo')>(
    '@/lib/pick-profile-photo',
  );
  return {
    ...actual,
    pickProfilePhoto: jest.fn(),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

describe('useUpdateProfilePhoto', () => {
  const pickProfilePhoto = pickProfilePhotoModule.pickProfilePhoto as jest.MockedFunction<
    typeof pickProfilePhotoModule.pickProfilePhoto
  >;

  beforeEach(() => {
    pickProfilePhoto.mockReset();
    pickProfilePhoto.mockResolvedValue({ status: 'canceled' });
  });

  it('closes the sheet on Choose from library and waits for onSheetHidden before picking', async () => {
    const { result } = renderHook(() => useUpdateProfilePhoto(), { wrapper });

    act(() => {
      result.current.openSheet();
    });
    expect(result.current.sheetOpen).toBe(true);

    act(() => {
      result.current.pickFrom('library');
    });

    expect(result.current.sheetOpen).toBe(false);
    expect(pickProfilePhoto).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.onSheetHidden();
    });

    await waitFor(() => {
      expect(pickProfilePhoto).toHaveBeenCalledWith('library');
    });
  });
});
