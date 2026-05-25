import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Colors } from '@/constants/theme';
import { useRegistro } from '@/contexts/registro-context';

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
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [inicio, setInicio] = useState('08:00');
  const [fin, setFin] = useState('17:30');

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
  const canSave = startMinutes !== null && endMinutes !== null && endMinutes > startMinutes;

  const handleGuardar = async () => {
    if (!canSave) return;

    await addRegistro({
      titulo: titulo.trim() || 'Jornada Salvagnini',
      descripcion: descripcion.trim(),
      inicio,
      fin,
      duracion,
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
        <Text style={styles.subtitle}>Captura inicio, fin y una breve descripción de tu jornada.</Text>

        <View style={styles.fieldset}>
          <Text style={styles.fieldLabel}>Título</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Turno de taller"
            placeholderTextColor="#9ca3af"
            value={titulo}
            onChangeText={setTitulo}
          />
        </View>

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
          <Text style={[styles.helperText, !canSave && styles.helperError]}>Formato HH:mm. Total estimado: {duracion}</Text>
        </View>

        <View style={styles.fieldset}>
          <Text style={styles.fieldLabel}>Descripción</Text>
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
          accessibilityState={{ disabled: !canSave }}>
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
    gap: 18,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.brandDark,
  },
  subtitle: {
    marginTop: 6,
    color: '#4b5563',
    fontSize: 15,
    lineHeight: 22,
  },
  fieldset: {
    marginTop: 18,
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
  textArea: {
    minHeight: 140,
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
  buttonPrimary: {
    marginTop: 24,
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
