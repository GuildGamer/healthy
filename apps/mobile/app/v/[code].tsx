import {
  formatProofCode,
  isValidProofCode,
  normaliseProofCode,
  PROOF_CODE_BODY_LENGTH,
} from '@product/contract';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useMutation } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeckButton, DeckNavButton } from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { type Theme, useThemedStyles } from '@/theme';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function VerifyProofCodeRoute() {
  const { data: session, isPending } = useSession();
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const [code, setCode] = useState(() => {
    const raw = firstParam(params.code);
    if (!raw || raw === 'new') {
      return '';
    }
    return normaliseProofCode(raw);
  });
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

  if (isPending) {
    return <ScreenLoader />;
  }
  if (!session) {
    return <Redirect href="/login" />;
  }

  const result = verify.data;

  return (
    <SafeAreaView style={styles.screen} testID="verify-proof">
      <View style={styles.top}>
        <DeckNavButton accessibilityLabel="Close" glyph="close" onPress={() => router.back()} />
        <Text style={styles.title}>Verify a clip</Text>
        <View style={styles.spacer} />
      </View>

      {!result ? (
        <View style={styles.form}>
          <Text style={styles.lede}>
            Enter the code burned into the video. Healthy will show whether the
            original is still on file.
          </Text>
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
          {localError ? <Text style={styles.error}>{localError}</Text> : null}
          <DeckButton
            label="Verify"
            loading={verify.isPending}
            onPress={() => {
              if (!isValidProofCode(code)) {
                setLocalError('Check the code');
                return;
              }
              verify.mutate();
            }}
            testID="verify-submit"
          />
        </View>
      ) : (
        <VerifyResult result={result} onAgain={() => verify.reset()} />
      )}
    </SafeAreaView>
  );
}

function VerifyResult({
  result,
  onAgain,
}: {
  result: Awaited<ReturnType<typeof apiClient.verifyProofCode>>;
  onAgain: () => void;
}) {
  const styles = useThemedStyles(createStyles);

  if (result.outcome === 'verified') {
    return (
      <View style={styles.result} testID="verify-verified">
        <Text style={styles.outcome}>Verified</Text>
        <Text style={styles.meta}>
          Recorded in Healthy · {result.recordedAt.slice(0, 10)} · {result.count}{' '}
          counted by camera
        </Text>
        {result.posterUrl ? (
          <Image source={{ uri: result.posterUrl }} style={styles.poster} />
        ) : null}
        {result.videoUrl ? (
          <DeckButton
            label="Watch original"
            onPress={() => void Linking.openURL(result.videoUrl!)}
          />
        ) : null}
        <DeckButton label="Check another" onPress={onAgain} variant="quiet" />
      </View>
    );
  }

  if (result.outcome === 'original_expired') {
    return (
      <View style={styles.result} testID="verify-expired">
        <Text style={styles.outcome}>Original expired</Text>
        <Text style={styles.meta}>
          Still verified · {result.recordedAt.slice(0, 10)} · {result.count} counted
          by camera. The video file has been deleted.
        </Text>
        <DeckButton label="Check another" onPress={onAgain} variant="quiet" />
      </View>
    );
  }

  if (result.outcome === 'removed') {
    return (
      <View style={styles.result} testID="verify-removed">
        <Text style={styles.outcome}>Removed by owner</Text>
        <DeckButton label="Check another" onPress={onAgain} variant="quiet" />
      </View>
    );
  }

  if (result.outcome === 'not_shared') {
    return (
      <View style={styles.result} testID="verify-not-shared">
        <Text style={styles.outcome}>Not shared</Text>
        <Text style={styles.meta}>This code has not been published for verification.</Text>
        <DeckButton label="Check another" onPress={onAgain} variant="quiet" />
      </View>
    );
  }

  return (
    <View style={styles.result} testID="verify-not-found">
      <Text style={styles.outcome}>Check the code</Text>
      <DeckButton label="Try again" onPress={onAgain} variant="quiet" />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: spacing.md,
    },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    title: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
    spacer: { width: 40 },
    form: { gap: spacing.md },
    lede: {
      color: theme.colors.mutedText,
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
      color: theme.colors.mutedText,
    },
    error: {
      color: theme.colors.danger,
      fontSize: fontSize.sm,
      textAlign: 'center',
    },
    result: {
      gap: spacing.md,
      alignItems: 'center',
    },
    outcome: {
      color: theme.colors.text,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
    },
    meta: {
      color: theme.colors.mutedText,
      fontSize: fontSize.sm,
      textAlign: 'center',
    },
    poster: {
      width: '80%',
      aspectRatio: 9 / 16,
      borderRadius: radii.md,
      backgroundColor: '#000',
    },
  });
