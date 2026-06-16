import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type DatePickerFieldProps = {
  value: string;
  onChange: (value: string) => void;
  maximumDate?: Date;
  minimumDate?: Date;
  accessibilityLabel: string;
};

function toDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function toDateStr(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function DatePickerField(props: DatePickerFieldProps) {
  const C = useTheme();
  if (Platform.OS === 'web') {
    return (
      <TextInput
        style={[styles.input, { backgroundColor: C.card, borderColor: C.border, color: C.text }]}
        value={props.value}
        onChangeText={props.onChange}
        placeholder="AAAA-MM-DD"
        accessibilityLabel={props.accessibilityLabel}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.card, borderColor: C.border }]}>
      <DateTimePicker
        value={toDate(props.value)}
        mode="date"
        display="compact"
        maximumDate={props.maximumDate}
        minimumDate={props.minimumDate}
        onChange={(_, selectedDate) => {
          if (selectedDate) props.onChange(toDateStr(selectedDate));
        }}
        accessibilityLabel={props.accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});
