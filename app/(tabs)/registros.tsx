import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, SectionList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QuickEditModal } from '@/components/QuickEditModal';

import { BrandLogo } from '@/components/brand-logo';
import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { useAppSettings } from '@/contexts/app-settings-context';
import { type Registro, useRegistro } from '@/contexts/registro-context';
import { type ThemeColors, useTheme } from '@/hooks/use-theme';
import { formatFecha } from '@/utils/date';
import { isDateLocked } from '@/src/services/registro/conflicts';

const TIPOS_FILTRO = [
  'Oficina', 'Cliente', 'Teletrabajo', 'Mixto', 'Casa',
  'Vacaciones', 'Permiso', 'Enfermedad', 'Festivo',
];

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
  const { registros, loading, deleteRegistro, mergeRegistros, updateRegistro } = useRegistro();
  const { lockedMonths } = useAppSettings();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string | null>(null);
  const { toast, showToast, dismissToast } = useToast();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());
  const isSwipingRef = useRef(false);
  const [editingRegistro, setEditingRegistro] = useState<(typeof registros)[0] | null>(null);

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
    const registro = registros.find((item) => item.id === id);
    if (!registro) return;
    if (isDateLocked(getRegistroDateStr(registro), lockedMonths)) {
      showToast('Este mes está cerrado. Ábrelo desde Registro mensual.', 'error');
      return;
    }
    swipeableRefs.current.get(id)?.close();
    setEditingRegistro(registro);
  };

  const handleDelete = async (id: string) => {
    const deleted = registros.find((registro) => registro.id === id);
    if (deleted && isDateLocked(getRegistroDateStr(deleted), lockedMonths)) {
      showToast('Este mes está cerrado. Ábrelo desde Registro mensual.', 'error');
      return;
    }
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
  };

  const renderLeftActions = () => (
    <View style={styles.swipeEdit}>
      <Text style={styles.swipeEditText}>Editar</Text>
    </View>
  );

  const renderRightActions = () => (
    <View style={styles.swipeDelete}>
      <Text style={styles.swipeDeleteText}>Borrar</Text>
    </View>
  );

  const renderItem = ({ item: registro }: { item: Registro }) => {
    const locked = isDateLocked(getRegistroDateStr(registro), lockedMonths);
    const dietaLabel =
      registro.dieta === 'media' ? '½ Dieta' :
      registro.dieta === 'completa' ? 'Dieta completa' : null;
    const extras = registro.horasExtras && registro.horasExtras > 0
      ? `${registro.horasExtras}h extra` : null;
    const tags = [locked ? 'Mes cerrado' : null, dietaLabel, registro.pernocta ? 'Pernocta' : null, extras].filter(Boolean);

    return (
      <Swipeable
        enabled={!locked}
        ref={(ref) => { swipeableRefs.current.set(registro.id, ref); }}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        overshootLeft={false}
        overshootRight={false}
        friction={1.5}
        leftThreshold={30}
        rightThreshold={30}
        onSwipeableWillOpen={() => { isSwipingRef.current = true; }}
        onSwipeableOpen={(direction) => {
          if (direction === 'left') handleEdit(registro.id);
          else void handleDelete(registro.id);
          setTimeout(() => { isSwipingRef.current = false; }, 600);
        }}
        onSwipeableClose={() => { isSwipingRef.current = false; }}
      >
        <Pressable
          style={styles.recordCard}
          onPress={() => {
            if (isSwipingRef.current) return;
            router.push({ pathname: '/registro-detalle', params: { id: registro.id } });
          }}
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
          : 'Desliza derecha para editar · izquierda para borrar.'}
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
          contentInsetAdjustmentBehavior="automatic"
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          SectionSeparatorComponent={() => <View style={styles.sectionSep} />}
        />
      )}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => router.push('/nuevo')}
        accessibilityRole="button"
        accessibilityLabel="Nueva jornada"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
      <QuickEditModal
        registro={editingRegistro}
        onClose={() => setEditingRegistro(null)}
        onSave={async (data) => {
          if (!editingRegistro) return;
          await updateRegistro(editingRegistro.id, data);
          setEditingRegistro(null);
          showToast('Jornada actualizada');
        }}
        onFullEdit={() => {
          if (!editingRegistro) return;
          const id = editingRegistro.id;
          setEditingRegistro(null);
          router.push({ pathname: '/registro-detalle', params: { id, editMode: '1' } });
        }}
      />
      <Toast toast={toast} onDismiss={dismissToast} />
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: C.background },
    header: {
      paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
      backgroundColor: C.background,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    page: {
      padding: 20, paddingTop: 0, paddingBottom: 88,
      width: '100%', maxWidth: 900, alignSelf: 'center',
    },
    listHeader: { gap: 10, marginBottom: 4, marginTop: 16 },
    searchContainer: {
      backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    },
    searchInput: { padding: 13, fontSize: 15, color: C.text },
    subtitle: { fontSize: 13, color: C.textMuted },
    loadingText: { color: C.textMuted, fontSize: 15, textAlign: 'center' },

    sectionHeader: {
      backgroundColor: C.background,
      paddingVertical: 10, paddingHorizontal: 0,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
      marginTop: 16,
    },
    sectionHeaderText: {
      fontSize: 11, fontWeight: '800', color: Colors.brand,
      textTransform: 'uppercase', letterSpacing: 1.2,
    },
    sectionSep: { height: 8 },

    emptyState: {
      marginTop: 4, backgroundColor: C.card, borderRadius: 20, padding: 32,
      alignItems: 'center', borderWidth: 1, borderColor: C.border, gap: 8,
    },
    emptyIcon: { fontSize: 32 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text },
    emptyText: { color: C.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },

    filterScroll: { marginVertical: 2 },
    filterRow: { flexDirection: 'row', gap: 7, paddingVertical: 2 },
    filterChip: {
      minHeight: 44, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 18,
      justifyContent: 'center',
      backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    },
    filterChipActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
    filterChipText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
    filterChipTextActive: { color: '#fff' },

    // Swipe actions
    swipeEdit: {
      backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center',
      minWidth: 88, paddingHorizontal: 20, marginTop: 10,
      borderRadius: 18,
    },
    swipeEditText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    swipeDelete: {
      backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center',
      minWidth: 88, paddingHorizontal: 20, marginTop: 10,
      borderRadius: 18,
    },
    swipeDeleteText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    recordCard: {
      backgroundColor: C.card, borderRadius: 18, padding: 16, marginTop: 10,
      gap: 6, borderWidth: 1, borderColor: C.border,
    },
    recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    recordTitleCol: { flex: 1, marginRight: 10 },
    recordTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    recordCliente: { fontSize: 12, color: C.textMuted, marginTop: 2 },
    recordDuration: { fontSize: 14, fontWeight: '700', color: Colors.brand },
    recordSubtitle: { fontSize: 13, color: C.textSecondary },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tag: {
      backgroundColor: `${Colors.brand}14`, borderRadius: 7,
      paddingVertical: 3, paddingHorizontal: 9,
    },
    tagText: { fontSize: 11, fontWeight: '700', color: Colors.brand },
    recordDescription: { fontSize: 13, color: C.textMuted, lineHeight: 19 },

    fab: {
      position: 'absolute', bottom: 24, right: 20,
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: Colors.brand,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: Colors.brand, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
    },
    fabText: { color: '#fff', fontSize: 30, fontWeight: '300', lineHeight: 36, marginTop: -2 },
  });
}
