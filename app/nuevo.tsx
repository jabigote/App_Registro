import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Colors } from '@/constants/theme';
import { type Dieta, useRegistro } from '@/contexts/registro-context';

type TipoJornada = { value: string; label: string };

const TIPOS_JORNADA: TipoJornada[] = [
  { value: 'Casa', label: 'Casa (recuperación de horas)' },
  { value: 'Cliente', label: 'Cliente' },
  { value: 'Mixto', label: 'Mixto' },
  { value: 'Teletrabajo', label: 'Teletrabajo' },
];

const DIETA_OPTS: { value: Dieta; label: string }[] = [
  { value: 'ninguna', label: 'Sin dieta' },
  { value: 'media', label: '½ Dieta' },
  { value: 'completa', label: 'Dieta completa' },
];

function parseTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export default function NuevoRegistroScreen() {
  const router = useRouter();
  const { addRegistro } = useRegistro();

  const [tipoJornada, setTipoJornada] = useState('');
  const [tipoOpen, setTipoOpen] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [inicio, setInicio] = useState('08:00');
  const [fin, setFin] = useState('17:30');
  const [dieta, setDieta] = useState<Dieta>('ninguna');
  const [pernocta, setPernocta] = useState(false);
  const [horasExtras, setHorasExtras] = useState('0');

  const duracion = useMemo(() => {
    const startMinutes = parseTime(inicio);
    const endMinutes = parseTime(fin);
    if (startMinutes === null || endMinutes === null) return 'Formato HH:mm';
    const diff = endMinutes - startMinutes;
    if (diff <= 0) return 'Introduce horario válido';
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
  }, [inicio, fin]);

  const startMinutes = parseTime(inicio);
  const endMinutes = parseTime(fin);
  const canSave = tipoJornada.length > 0 && startMinutes !== null && endMinutes !== null && endMinutes > startMinutes;

  const handleGuardar = async () => {
    if (!canSave) return;
    await addRegistro({
      titulo: tipoJornada,
      descripcion: descripcion.trim(),
      inicio,
      fin,
      duracion,
      dieta,
      pernocta,
      horasExtras: Number(horasExtras) || 0,
    });
    router.push('/registros');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandLogo />
      </View>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Registro de jornada</Text>
        <Text style={styles.subtitle}>Captura los detalles de tu jornada de trabajo.</Text>

        {/* Tipo de jornada */}
        <View style={styles.fieldset}>
          <Text style={styles.fieldLabel}>Tipo de jornada</Text>
          <Pressable
            style={[styles.select, tipoOpen && styles.selectOpen]}
            onPress={() => setTipoOpen((prev) => !prev)}
          >
            <Text style={tipoJornada ? styles.selectText : styles.selectPlaceholder}>
              {tipoJornada
                ? TIPOS_JORNADA.find((t) => t.value === tipoJornada)?.label
                : 'Selecciona el tipo de jornada'}
            </Text>
            <Text style={styles.selectArrow}>{tipoOpen ? '▲' : '▼'}</Text>
          </Pressable>
          {tipoOpen && (
            <View style={styles.dropdownList}>
              {TIPOS_JORNADA.map((tipo) => (
                <Pressable
                  key={tipo.value}
                  style={[styles.dropdownItem, tipoJornada === tipo.value && styles.dropdownItemActive]}
                  onPress={() => { setTipoJornada(tipo.value); setTipoOpen(false); }}
                >
                  <Text style={[styles.dropdownItemText, tipoJornada === tipo.value && styles.dropdownItemTextActive]}>
                    {tipo.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Horario */}
        <View style={styles.fieldset}>
          <Text style={styles.fieldLabel}>Horario</Text>
          <View style={styles.timeRow}>
            <TextInput
              style={[styles.input, styles.timeInput]}
              placeholder="Inicio"
              placeholderTextColor="#9ca3af"
              value={inicio}
              onChangeText={setInicio}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              style={[styles.input, styles.timeInput]}
              placeholder="Fin"
              placeholderTextColor="#9ca3af"
              value={fin}
              onChangeText={setFin}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <Text style={[styles.helperText, !canSave && tipoJornada && styles.helperError]}>
            Formato HH:mm — Total estimado: {duracion}
          </Text>
        </View>

        {/* Dieta */}
        <View style={styles.fieldset}>
          <Text style={styles.fieldLabel}>Dieta</Text>
          <View style={styles.chipRow}>
            {DIETA_OPTS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.chip, dieta === opt.value && styles.chipSelected]}
                onPress={() => setDieta(opt.value)}
              >
                <Text style={[styles.chipText, dieta === opt.value && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Pernocta */}
        <View style={styles.fieldset}>
          <Text style={styles.fieldLabel}>Pernocta</Text>
          <View style={styles.chipRow}>
            <Pressable
              style={[styles.chip, !pernocta && styles.chipSelected]}
              onPress={() => setPernocta(false)}
            >
              <Text style={[styles.chipText, !pernocta && styles.chipTextSelected]}>No</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, pernocta && styles.chipSelected]}
              onPress={() => setPernocta(true)}
            >
              <Text style={[styles.chipText, pernocta && styles.chipTextSelected]}>Sí</Text>
            </Pressable>
          </View>
        </View>

        {/* Horas extras */}
        <View style={styles.fieldset}>
          <Text style={styles.fieldLabel}>Horas extras</Text>
          <TextInput
            style={[styles.input, styles.inputCompact]}
            placeholder="0"
            placeholderTextColor="#9ca3af"
            value={horasExtras}
            onChangeText={(v) => setHorasExtras(v.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Descripción */}
        <View style={styles.fieldset}>
          <Text style={styles.fieldLabel}>Descripción (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe tareas, incidencias o tiempos importantes"
            placeholderTextColor="#9ca3af"
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
          />
        </View>

        <Pressable
          style={[styles.buttonPrimary, !canSave && styles.buttonDisabled]}
          onPress={handleGuardar}
          disabled={!canSave}
          accessibilityState={{ disabled: !canSave }}
        >
          <Text style={styles.buttonPrimaryText}>Guardar</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 4,
    zIndex: 10,
    elevation: 6,
  },
  page: {
    padding: 24,
    paddingTop: 16,
    gap: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.brandDark,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 8,
    color: '#4b5563',
    fontSize: 15,
    lineHeight: 22,
  },
  fieldset: {
    marginTop: 16,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.brand,
  },
  input: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: Colors.brandDark,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputCompact: {
    paddingVertical: 14,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 14,
  },
  timeInput: {
    flex: 1,
  },
  helperText: {
    color: '#6b7280',
    fontSize: 13,
  },
  helperError: {
    color: Colors.brand,
    fontWeight: '700',
  },
  // Dropdown tipo jornada
  select: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectOpen: {
    borderColor: Colors.brand,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  selectText: {
    fontSize: 16,
    color: Colors.brandDark,
    flex: 1,
  },
  selectPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
    flex: 1,
  },
  selectArrow: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 8,
  },
  dropdownList: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Colors.brand,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  dropdownItemActive: {
    backgroundColor: `${Colors.brand}15`,
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.brandDark,
  },
  dropdownItemTextActive: {
    color: Colors.brand,
    fontWeight: '700',
  },
  // Chips (dieta, pernocta)
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipSelected: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.brandDark,
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  // Botón guardar
  buttonPrimary: {
    marginTop: 28,
    backgroundColor: Colors.brand,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
  },
  buttonPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
