import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

const brandMark = require('../assets/images/salvagnini-mark.png');

export default function LoginScreen() {
  const { login } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [guardando, setGuardando] = useState(false);

  const canLogin = nombre.trim().length > 0;

  const handleLogin = async () => {
    if (!canLogin || guardando) return;
    setGuardando(true);
    await login(nombre, email);
    setGuardando(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.logoContainer}>
            <View style={styles.iconButton}>
              <Image source={brandMark} style={styles.icon} resizeMode="contain" />
            </View>
          </View>

          <Text style={styles.title}>Bienvenido</Text>
          <Text style={styles.subtitle}>
            Configura tu perfil para empezar a registrar tus jornadas en Salvagnini.
          </Text>

          <View style={styles.fieldset}>
            <Text style={styles.fieldLabel}>Nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre"
              placeholderTextColor="#9ca3af"
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="words"
              autoFocus
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldset}>
            <Text style={styles.fieldLabel}>Correo electrónico (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="correo@ejemplo.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          <Pressable
            style={[styles.buttonPrimary, !canLogin && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!canLogin || guardando}
          >
            <Text style={styles.buttonPrimaryText}>
              {guardando ? 'Iniciando...' : 'Comenzar'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  flex: {
    flex: 1,
  },
  page: {
    padding: 32,
    gap: 20,
    flexGrow: 1,
  },
  logoContainer: {
    alignItems: 'flex-start',
    marginTop: 24,
    marginBottom: 8,
  },
  iconButton: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: Colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  icon: {
    width: 34,
    height: 34,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.brandDark,
  },
  subtitle: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
  fieldset: {
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
  buttonPrimary: {
    marginTop: 12,
    backgroundColor: Colors.brand,
    borderRadius: 16,
    paddingVertical: 18,
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
