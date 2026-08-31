import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import type { CountryCode } from '@product/contract/country-code';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  countryName,
  countryOptions,
  filterCountryOptions,
  type CountryOption,
} from '@/lib/country';
import { SelectSheet } from './SelectField';

export function CountryPickerField({
  onChange,
  testID = 'country-picker',
  value,
}: {
  value: CountryCode | null;
  onChange: (code: CountryCode) => void;
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const options = useMemo(() => countryOptions(), []);
  const filtered = useMemo(
    () => filterCountryOptions(options, query),
    [options, query],
  );

  function close() {
    setOpen(false);
    setQuery('');
  }

  function select(option: CountryOption) {
    onChange(option.code);
    close();
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={styles.trigger}
        testID={testID}
      >
        <Feather color={colors.muted} name="globe" size={18} />
        <Text style={value ? styles.triggerValue : styles.triggerPlaceholder}>
          {value ? countryName(value) : 'Select country / region'}
        </Text>
        <Feather color={colors.muted} name="chevron-down" size={18} />
      </Pressable>

      {open ? (
        <SelectSheet
          closeTestID={`${testID}-close`}
          onClose={close}
          testID={`${testID}-sheet`}
          title="Country / region"
          visible={open}
        >
          <TextInput
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={colors.muted}
            style={styles.search}
            testID={`${testID}-search`}
            value={query}
          />

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const selected = item.code === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => select(item)}
                  style={styles.row}
                  testID={`${testID}-option-${item.code}`}
                >
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    <Text style={styles.rowCode}>{item.code}</Text>
                  </View>
                  {selected ? (
                    <Feather color={colors.accent} name="check" size={18} />
                  ) : (
                    <View style={styles.checkSpacer} />
                  )}
                </Pressable>
              );
            }}
          />
        </SelectSheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  triggerValue: {
    flex: 1,
    flexShrink: 1,
    color: colors.text,
    fontSize: fontSize.md,
  },
  triggerPlaceholder: {
    flex: 1,
    flexShrink: 1,
    color: colors.muted,
    fontSize: fontSize.md,
  },
  search: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowCopy: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
  },
  rowName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  rowCode: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  checkSpacer: {
    width: 18,
  },
});
