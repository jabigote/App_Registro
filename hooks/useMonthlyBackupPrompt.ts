import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

const PROMPT_KEY = '@salvagnini_last_export_prompt';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Muestra una alerta en los primeros 3 días del mes invitando a exportar el mes anterior. */
export function useMonthlyBackupPrompt() {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const now = new Date();
      if (now.getDate() > 3) return;

      const promptKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const last = await AsyncStorage.getItem(PROMPT_KEY);
      if (last === promptKey) return;

      await AsyncStorage.setItem(PROMPT_KEY, promptKey);

      const prevIdx  = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

      setTimeout(() => {
        Alert.alert(
          'Exportar mes anterior',
          `¿Quieres revisar y exportar ${MESES[prevIdx]} ${prevYear}?`,
          [
            { text: 'Ahora no', style: 'cancel' },
            { text: 'Ver Mensual', onPress: () => { router.navigate('/registro-mensual'); } },
          ],
        );
      }, 2500);
    };

    check().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
