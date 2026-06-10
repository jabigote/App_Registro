import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, SafeAreaView, SectionList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { type Registro, useRegistro } from '@/contexts/registro-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';
import { formatFecha } from '@/utils/date';

const TIPOS_FILTRO = ['Oficina', 'Cliente', 'Teletrabajo', 'Mixto', 'Casa'];

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function getRegistroDateStr(r: Registro): string {
  return r.fecha ?? r.createdAt.slice(0, 10);
}

function getMonthKey(dateStr: string): string {
  // "2026-06" → "Junio 2026"
  const [y, m] = dateStr.split('-').map(Number);
  return `${MESES[(m ?? 1) - 1]} ${y}`;
}

function getTimeDisplay(r: Registro): string {
  return r.inicio ? `${r.inicio} — ${r.fin}` : r.duracion;
}

type Section = { title: string; data: Registro[] };

export default function RegistrosScreen() {
  const { registros, loading, deleteRegistro, mergeRegistros } = useRegistro();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string | null>(null);
  const { toast, showToast, dismissToast } = useToast();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());

  const filteredRegistros = useMemo(() => {
    let base = tipoFiltro
      ? registros.filter((r) => r.titulo === tipoFiltro)
      : registros;
    if (query.trim()) {
      const q = query.toLowerCase();
      base = base.filter((r) =>
        r.titulo.toLowerCase().includes(q) ||
        (r.cliente?.toLowerCase().includes(q) ?? false) ||
        r.descripcion.toLowerCase().includes(q)
      );
    }
    return [...base].sort((a, b) =>
      getRegistroDateStr(b).localeCompare(getRegistroDateStr(a))
    );
  }, [registros, query, tipoFiltro]);

  // Agrupar en secciones por mes-año
  const sections = useMemo<Section[]>(() => {
    const map = new Map<string, Registro[]>();
    for (const r of filteredRegistros) {
      const key = getMonthKey(getRegistroDateStr(r));
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }, [filteredRegistros]);

  const handleEdit = (id: string) => {
    swipeableRefs.current.get(id)?.close();
    router.push({ pathname: '/registro-detalle', params: { id, editMode: '1' } });
  };

  const handleDelete = (id: string) => {
    const deleted = registros.find((registro) => registro.id === id);
    swipeableRefs.current.get(id)?.close();
    Alert.alert('Eliminar jornada', '¿Seguro que quieres eliminar esta jornada?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRegistro(id);
            showToast('Jornada eliminada', 'success', deleted ? {
              label: 'Deshacer',
              onPress: () => {
                mergeRegistros([deleted]).catch(() => showToast('No se pudo recuperar la jornada.', 'error'));
              },
            } : undefined);
          } catch {
            showToast('No se pudo eliminar la jornada.', 'error');
          }
        },
      },
    ]);
  };

  const renderRightActions = (id: string) => (
    <View style={styles.swipeActions}>
      <Pressable style={styles.swipeEdit} onPress={() => handleEdit(id)}>
        <Text style={styles.swipeEditText}>Editar</Text>
      </Pressable>
      <Pressable style={styles.swipeDelete} onPress={() => handleDelete(id)}>
        <Text style={styles.swipeDeleteText}>Borrar</Text>
      </Pressable>
    </View>
  );

  const renderItem = ({ item: registro }: { item: Registro }) => {
    const dietaLabel =
      registro.dieta === 'media' ? '½ Dieta' :
      registro.dieta === 'completa' ? 'Dieta completa' : null;
    const extras = registro.horasExtras && registro.horasExtras > 0
      ? `${registro.horasExtras}h extra` : null;
    const tags = [dietaLabel, registro.pernocta ? 'Pernocta' : null, extras].filter(Boolean);

    return (
      <Swipeable
        ref={(ref) => { swipeableRefs.current.set(registro.id, ref); }}
        renderRightActions={() => renderRightActions(registro.id)}
        overshootRight={false}
        friction={2}
        rightThreshold={40}
      >
        <Pressable
          style={styles.recordCard}
          onPress={() => router.push({ pathname: '/registro-detalle', params: { id: registro.id } })}
        >
          <View style={styles.recordHeader}>
            <View style={styles.recordTitleCol}>
              <Text style={styles.recordTitle} numberOfLines={1}>{registro.titulo}</Text>
              {registro.cliente
                ? <Text style={styles.recordCliente} numberOfLines={1}>{registro.cliente}</Text>
                : null}
            </View>
            <Text style={styles.recordDuration}>{registro.duracion}</Text>
          </View>

          <Text style={styles.recordSubtitle}>
            {formatFecha(getRegistroDateStr(registro))} · {getTimeDisplay(registro)}
          </Text>

          {tags.length > 0 && (
            <View style={styles.tagRow}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {registro.descripcion
            ? <Text style={styles.recordDescription}>{registro.descripcion}</Text>
            : null}
        </Pressable>
      </Swipeable>
    );
  };

  const renderSectionHeader = ({ section: { title } }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por tipo, cliente o notas…"
          placeholderTextColor={C.textFaint}
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>
      {/* Chips de filtro por tipo */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, !tipoFiltro && styles.filterChipActive]}
            onPress={() => setTipoFiltro(null)}
            accessibilityRole="button"
            accessibilityState={{ selected: !tipoFiltro }}
          >
            <Text style={[styles.filterChipText, !tipoFiltro && styles.filterChipTextActive]}>Todos</Text>
          </Pressable>
          {TIPOS_FILTRO.map((tipo) => (
            <Pressable
              key={tipo}
              style={[styles.filterChip, tipoFiltro === tipo && styles.filterChipActive]}
              onPress={() => setTipoFiltro((prev) => (prev === tipo ? null : tipo))}
              accessibilityRole="button"
              accessibilityState={{ selected: tipoFiltro === tipo }}
            >
              <Text style={[styles.filterChipText, tipoFiltro === tipo && styles.filterChipTextActive]}>
                {tipo}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <Text style={styles.subtitle}>
        {(query.trim() || tipoFiltro)
          ? `${filteredRegistros.length} resultado${filteredRegistros.length !== 1 ? 's' : ''}`
          : 'Desliza a la izquierda para editar o borrar.'}
      </Text>
    </View>
  );

  const listEmpty = (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📋</Text>
      {query.trim() || tipoFiltro ? (
        <>
          <Text style={styles.emptyTitle}>Sin resultados</Text>
          <Text style={styles.emptyText}>
            {query.trim()
              ? `No hay jornadas que coincidan con "${query}".`
              : `No hay jornadas del tipo "${tipoFiltro}".`}
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>No hay jornadas guardadas</Text>
          <Text style={styles.emptyText}>Tus jornadas aparecerán aquí cuando guardes un registro.</Text>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandLogo screenTitle="Registros" />
      </View>
      {loading ? (
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Cargando registros…</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          SectionSeparatorComponent={() => <View style={styles.sectionSep} />}
        />
      )}
      <Toast toast={toast} onDismiss={dismissToast} />
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: C.background },
    header: {
      paddingHorizontal: 24, paddingTop: 10, paddingBottom: 14,
      zIndex: 10, elevation: 6, backgroundColor: C.background,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    page: {
      padding: 24, paddingTop: 0, paddingBottom: 40,
      width: '100%', maxWidth: 900, alignSelf: 'center',
    },
    listHeader: { gap: 10, marginBottom: 4, marginTop: 16 },
    title: { fontSize: 30, fontWeight: '800', color: C.text, marginBottom: 2 },
    searchContainer: {
      backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    },
    searchInput: { padding: 14, fontSize: 15, color: C.text },
    subtitle: { fontSize: 14, color: C.textMuted },
    loadingText: { color: C.textMuted, fontSize: 15, textAlign: 'center' },

    sectionHeader: {
      backgroundColor: C.background,
      paddingVertical: 8, paddingHorizontal: 0,
      borderBottomWidth: 1, borderBottomColor: C.border,
      marginTop: 12,
    },
    sectionHeaderText: {
      fontSize: 13, fontWeight: '700', color: Colors.brand,
      textTransform: 'uppercase', letterSpacing: 0.8,
    },
    sectionSep: { height: 10 },

    emptyState: {
      marginTop: 4, backgroundColor: C.card, borderRadius: 24, padding: 32, alignItems: 'center',
      shadowColor: '#000000', shadowOpacity: 0.06, shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 }, elevation: 3, gap: 8,
    },
    emptyIcon: { fontSize: 36 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
    emptyText: { color: C.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 21 },

    filterScroll: { marginVertical: 4 },
    filterRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
    filterChip: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
      backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    },
    filterChipActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
    filterChipText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
    filterChipTextActive: { color: '#ffffff' },

    // Swipe actions
    swipeActions: { flexDirection: 'row', marginTop: 12 },
    swipeEdit: {
      backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center',
      paddingHorizontal: 20, borderTopLeftRadius: 18, borderBottomLeftRadius: 18,
    },
    swipeEditText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
    swipeDelete: {
      backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center',
      paddingHorizontal: 20, borderTopRightRadius: 18, borderBottomRightRadius: 18,
    },
    swipeDeleteText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },

    recordCard: {
      backgroundColor: C.card, borderRadius: 22, padding: 20, marginTop: 12,
      shadowColor: '#000000', shadowOpacity: 0.06, shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 }, elevation: 3,
      gap: 8, borderWidth: 1, borderColor: 'transparent',
    },
    recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    recordTitleCol: { flex: 1, marginRight: 10 },
    recordTitle: { fontSize: 18, fontWeight: '700', color: C.text },
    recordCliente: { fontSize: 13, color: C.textMuted, marginTop: 2 },
    recordDuration: { fontSize: 14, fontWeight: '700', color: Colors.brand },
    recordSubtitle: { fontSize: 14, color: C.textSecondary },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { backgroundColor: `${Colors.brand}18`, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
    tagText: { fontSize: 12, fontWeight: '700', color: Colors.brand },
    recordDescription: { fontSize: 14, color: C.textMuted, lineHeight: 20 },
  });
}
