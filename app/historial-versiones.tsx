import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Colors } from '@/constants/theme';
import { RELEASE_HISTORY } from '@/constants/release-history';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';

export default function HistorialVersionesScreen() {
  const C = useTheme();
  const styles = makeStyles(C);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandLogo screenTitle="Historial de versiones" />
      </View>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Mejoras y correcciones incluidas en cada versión publicada.
        </Text>

        {RELEASE_HISTORY.map((release, index) => (
          <View key={release.version} style={styles.releaseCard}>
            <View style={styles.releaseHeader}>
              <View>
                <Text style={styles.version}>Versión {release.version}</Text>
                <Text style={styles.date}>{release.date}</Text>
              </View>
              {index === 0 ? <Text style={styles.currentBadge}>Actual</Text> : null}
            </View>
            <Text style={styles.title}>{release.title}</Text>
            <View style={styles.list}>
              {release.highlights.map((highlight) => (
                <View key={highlight} style={styles.listItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.highlight}>{highlight}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: C.background },
    header: {
      paddingHorizontal: 24, paddingTop: 10, paddingBottom: 14,
      backgroundColor: C.background, borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.border,
    },
    page: {
      padding: 20, paddingBottom: 48, gap: 16,
      width: '100%', maxWidth: 800, alignSelf: 'center',
    },
    intro: { color: C.textSecondary, fontSize: 15, lineHeight: 22 },
    releaseCard: {
      backgroundColor: C.card, borderRadius: 20, padding: 20, gap: 14,
      borderWidth: 1, borderColor: C.border,
    },
    releaseHeader: {
      flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
    },
    version: { color: C.text, fontSize: 20, fontWeight: '800' },
    date: { color: C.textMuted, fontSize: 13, marginTop: 3 },
    currentBadge: {
      color: '#ffffff', backgroundColor: Colors.brand, borderRadius: 12,
      paddingHorizontal: 10, paddingVertical: 5, fontSize: 11, fontWeight: '800',
      textTransform: 'uppercase',
    },
    title: { color: Colors.brand, fontSize: 15, fontWeight: '700' },
    list: { gap: 10 },
    listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    bullet: { color: Colors.brand, fontSize: 18, lineHeight: 21 },
    highlight: { color: C.textSecondary, fontSize: 14, lineHeight: 21, flex: 1 },
  });
}

