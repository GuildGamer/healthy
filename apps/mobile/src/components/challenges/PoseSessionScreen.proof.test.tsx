import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { PoseSessionScreen } from './PoseSessionScreen';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const mockSession = jest.fn();

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
      <PoseSessionScreen challengeId="ch-1" mode="challenge" />
    </SafeAreaProvider>,
  );
}

jest.mock('./usePoseSession', () => ({
  usePoseSession: () => mockSession(),
}));

jest.mock('@/lib/config', () => ({
  QUICKPOSE_SDK_KEY: 'test-key',
}));

jest.mock('./ProofClipActions', () => {
  const React = require('react');
  const { View: MockView } = require('react-native');
  return {
    ProofClipActions: ({
      clipId,
      failed,
    }: {
      clipId: string | null;
      failed?: boolean;
    }) =>
      React.createElement(
        MockView,
        { testID: failed ? 'proof-clip-failed' : 'proof-clip-actions' },
        failed ? 'failed' : clipId,
      ),
  };
});

function MockCamera() {
  return <View testID="qp-camera" />;
}

function baseSession(overrides: Record<string, unknown> = {}) {
  return {
    occurrence: undefined,
    metric: 'pushups',
    isLoading: false,
    camera: {
      QuickPoseCamera: MockCamera,
      isReady: true,
      detail: 'Camera ready',
    },
    cameraSessionKey: 0,
    handleQuickPoseUpdate: jest.fn(),
    snapshot: {
      count: 5,
      phase: 'up',
      bodyInFrame: true,
    },
    phase: 'review',
    target: 20,
    meetsTarget: false,
    sessionError: null,
    isStarting: false,
    isSaving: false,
    saveFailed: false,
    recordProof: true,
    showProofExplainer: false,
    proofRecording: { code: 'ABCD-EFG', label: 'Push-ups' },
    proofClipId: null,
    proofStatus: 'finalizing',
    proofFailed: false,
    proofAudience: 'anyone',
    showAudienceSheet: false,
    openAudienceSheet: jest.fn(),
    closeAudienceSheet: jest.fn(),
    setProofAudience: jest.fn(),
    confirmAudienceSheet: jest.fn(),
    proofCount: 5,
    finishProofToken: 1,
    finishProofEndAtMs: 0,
    finishCountdown: null,
    toggleRecordProof: jest.fn(),
    handleProofRecorded: jest.fn(),
    handleProofRecordingError: jest.fn(),
    startNow: jest.fn(),
    retry: jest.fn(),
    stopCounting: jest.fn(),
    keepGoing: jest.fn(),
    save: jest.fn(),
    leave: jest.fn(),
    ...overrides,
  };
}

describe('PoseSessionScreen proof surfaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the camera mounted while the proof clip is finalizing', () => {
    mockSession.mockReturnValue(baseSession({ phase: 'review', proofStatus: 'finalizing' }));

    renderScreen();

    expect(screen.getByTestId('pose-camera')).toBeOnTheScreen();
    expect(screen.getByTestId('qp-camera')).toBeOnTheScreen();
    expect(screen.getByText('Saving your proof clip…')).toBeOnTheScreen();
  });

  it('shows proof clip actions on a short-set review when a clip saved', () => {
    mockSession.mockReturnValue(
      baseSession({
        phase: 'review',
        proofStatus: 'saved',
        proofClipId: 'clip-1',
        proofRecording: null,
        meetsTarget: false,
      }),
    );

    renderScreen();

    expect(screen.getByTestId('proof-clip-actions')).toBeOnTheScreen();
  });

  it('shows failure copy on short-set review when the clip failed', () => {
    mockSession.mockReturnValue(
      baseSession({
        phase: 'review',
        proofStatus: 'failed',
        proofFailed: true,
        proofClipId: null,
        proofRecording: null,
        meetsTarget: false,
      }),
    );

    renderScreen();

    expect(screen.getByTestId('proof-clip-failed')).toBeOnTheScreen();
  });
});
