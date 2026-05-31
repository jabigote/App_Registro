import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CLIENTES } from '@/constants/clients';
import { Colors } from '@/constants/theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
}

const MAX_SUGGESTIONS = 6;

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function ClienteSearchInput({ value, onChangeText }: Props) {
  const [open, setOpen] = useState(false);

  const query = normalize(value.trim());
  const suggestions =
    query.length > 0
      ? CLIENTES.filter((c) => normalize(c).includes(query)).slice(0, MAX_SUGGESTIONS)
      : [];

  const showDropdown = open && suggestions.length > 0;

  return (
    <View style={styles.wrapper}>
      {/* Input row */}
      <View style={[styles.inputRow, showDropdown && styles.inputRowOpen]}>
        <TextInput
          style={styles.textInput}
          placeholder="Escribe para buscar cliente..."
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={(text) => {
            onChangeText(text);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <Pressable
            style={styles.clearBtn}
            onPress={() => { onChangeText(''); setOpen(false); }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearBtnText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Dropdown de sugerencias */}
      {showDropdown && (
        <View style={styles.dropdown}>
          {suggestions.map((client, index) => (
            <Pressable
              key={client}
              style={({ pressed }) => [
                styles.item,
                pressed && styles.itemPressed,
                index < suggestions.length - 1 && styles.itemBorder,
              ]}
              onPress={() => {
                onChangeText(client);
                setOpen(false);
              }}
            >
              <Text style={styles.itemText} numberOfLines={1}>
                {client}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 20,
    elevation: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingRight: 12,
  },
  inputRowOpen: {
    borderColor: Colors.brand,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  textInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: Colors.brandDark,
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  clearBtnText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '700',
  },
  dropdown: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Colors.brand,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemPressed: {
    backgroundColor: `${Colors.brand}12`,
  },
  itemText: {
    fontSize: 14,
    color: Colors.brandDark,
    fontWeight: '500',
  },
});
