import type { VerifyProofCodeOutput } from '@product/contract';
import {
  formatProofCode,
  isValidProofCode,
  normaliseProofCode,
  PROOF_CODE_BODY_LENGTH,
} from '@product/contract/proof-code';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useMutation } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeckButton, DeckPageNav } from '@/components/deck';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import { VERIFY_COPY } from './constants/proof-verify-copy';
import { ProofVideoPlayer } from './ProofVideoPlayer';

function initialCode(raw: string | undefined): string {
  if (!raw || raw === 'new') {
    return '';
  }
  return normaliseProofCode(raw);
}

export function VerifyProofScreen({ codeParam }: { codeParam?: string }) {
  const styles = useThemedStyles(createStyles);
  const [code, setCode] = useState(() => initialCode(codeParam));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    void Clipboard.getStringAsync().then((clip) => {
      if (!code && clip && isValidProofCode(clip)) {
        setCode(normaliseProofCode(clip));
      }
    });
  }, [code]);

  const verify = useMutation({
    mutationFn: () => apiClient.verifyProofCode({ code }),
  });

  function submit() {
    if (!isValidProofCode(code)) {
      setLocalError(VERIFY_COPY.invalidCode);
      return;
    }
    verify.mutate();
  }

  const errorMessage = localError ?? (verify.isError ? VERIFY_COPY.requestFailed : null);

  return (
    <SafeAreaView style={styles.screen} testID="verify-proof">
      <View style={styles.nav}>
        <DeckPageNav isClose onBack={() => goBackOrHome()} title={VERIFY_COPY.title} />
      </View>

      {verify.data ? (
        <ScrollView contentContainerStyle={styles.result}>
          <VerifyResult result={verify.data} />
          <DeckButton
            label={VERIFY_COPY.checkAnother}
            onPress={() => verify.reset()}
            testID="verify-again"
            variant="quiet"
          />
        </ScrollView>
      ) : (
        <View style={styles.form}>
          <Text style={styles.lede}>{VERIFY_COPY.lede}</Text>
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={PROOF_CODE_BODY_LENGTH + 1}
            onChangeText={(value) => {
              setLocalError(null);
              setCode(normaliseProofCode(value));
            }}
            placeholder="7KQ4-M2XD"
            placeholderTextColor={styles.placeholder.color}
            style={styles.input}
            testID="verify-code-input"
            value={formatProofCode(code)}
          />
          {errorMessage ? (
            <Text style={styles.error} testID="verify-error">
              {errorMessage}
            </Text>
          ) : null}
          <DeckButton
            label="Verify"
            loading={verify.isPending}
            onPress={submit}
            testID="verify-submit"
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function VerifyResult({ result }: { result: VerifyProofCodeOutput }) {
  const styles = useThemedStyles(createStyles);

  switch (result.outcome) {
    case 'verified':
      return (
        <View style={styles.outcomeBlock} testID="verify-verified">
          <Text style={styles.outcome}>{VERIFY_COPY.verified}</Text>
          <Text style={styles.meta}>
            Recorded in Healthy · {result.recordedAt.slice(0, 10)} · {result.count} counted
            by camera
          </Text>
          {result.videoUrl ? (
            <ProofVideoPlayer testID="verify-video" uri={result.videoUrl} />
          ) : result.posterUrl ? (
            <Image source={{ uri: result.posterUrl }} style={styles.poster} />
          ) : null}
        </View>
      );
    case 'original_expired':
      return (
        <View style={styles.outcomeBlock} testID="verify-expired">
          <Text style={styles.outcome}>{VERIFY_COPY.expired}</Text>
          <Text style={styles.meta}>
            Still verified · {result.recordedAt.slice(0, 10)} · {result.count} counted by
            camera. The video file has been deleted.
          </Text>
        </View>
      );
    case 'removed':
      return (
        <View style={styles.outcomeBlock} testID="verify-removed">
          <Text style={styles.outcome}>{VERIFY_COPY.removed}</Text>
        </View>
      );
    case 'not_shared':
      return (
        <View style={styles.outcomeBlock} testID="verify-not-shared">
          <Text style={styles.outcome}>{VERIFY_COPY.notShared}</Text>
          <Text style={styles.meta}>{VERIFY_COPY.notSharedBody}</Text>
        </View>
      );
    case 'not_found':
      return (
        <View style={styles.outcomeBlock} testID="verify-not-found">
          <Text style={styles.outcome}>{VERIFY_COPY.notFound}</Text>
          <Text style={styles.meta}>{VERIFY_COPY.notFoundBody}</Text>
        </View>
      );
  }
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: spacing.md,
    },
    nav: {
      marginBottom: spacing.lg,
    },
    form: { gap: spacing.md },
    lede: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
    },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      padding: spacing.md,
      fontSize: fontSize.lg,
      letterSpacing: 2,
      color: theme.colors.text,
      textAlign: 'center',
    },
    placeholder: {
      color: theme.colors.muted,
    },
    error: {
      color: theme.colors.danger,
      fontSize: fontSize.sm,
      textAlign: 'center',
    },
    result: {
      gap: spacing.lg,
      paddingBottom: spacing.xl,
    },
    outcomeBlock: {
      gap: spacing.md,
      alignItems: 'center',
    },
    outcome: {
      color: theme.colors.text,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
    },
    meta: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      textAlign: 'center',
    },
    poster: {
      width: '100%',
      aspectRatio: 9 / 16,
      maxHeight: 420,
      borderRadius: radii.md,
      backgroundColor: '#000',
    },
  });
