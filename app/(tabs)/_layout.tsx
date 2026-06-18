import Ionicons from '@expo/vector-icons/Ionicons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <NativeTabs tintColor={Colors.brand}>
      <NativeTabs.Trigger name="index">
        <Icon src={{
          default: <VectorIcon family={Ionicons} name="home-outline" />,
          selected: <VectorIcon family={Ionicons} name="home" />,
        }} />
        <Label>Inicio</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="registros">
        <Icon src={{
          default: <VectorIcon family={Ionicons} name="document-text-outline" />,
          selected: <VectorIcon family={Ionicons} name="document-text" />,
        }} />
        <Label>Registros</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="registro-mensual">
        <Icon src={{
          default: <VectorIcon family={Ionicons} name="stats-chart-outline" />,
          selected: <VectorIcon family={Ionicons} name="stats-chart" />,
        }} />
        <Label>Mensual</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ausencias">
        <Icon src={{
          default: <VectorIcon family={Ionicons} name="calendar-outline" />,
          selected: <VectorIcon family={Ionicons} name="calendar" />,
        }} />
        <Label>Ausencias</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ajustes">
        <Icon src={{
          default: <VectorIcon family={Ionicons} name="settings-outline" />,
          selected: <VectorIcon family={Ionicons} name="settings" />,
        }} />
        <Label>Ajustes</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
