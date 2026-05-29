import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { Toast, useToast } from '@/components/toast';
import { Colors } from '@/constants/theme';
import { type Registro, useRegistro } from '@/contexts/registro-context';
import { formatFecha } from '@/utils/date';

function getCardDate(r: Registro): string {
  const dateStr = r.fecha ?? r.createdAt.slice(0, 10);
  return formatFecha(dateStr);
}

function getTimeDisplay(r: Registro): string {
  return r.inicio ? `${r.inicio} — ${r.fin}` : r.duracion;
}

export default function RegistrosScreen() {
  const { registros, loading, deleteRegistro } = useRegistro();
  const router = useRouter();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const { toast, showToast, dismissToast } = useToast();

  const filteredRegistros = query.trim()
    ? registros.filter((r) => {
        const q = query.toLowerCase();
        return (
          r.titulo.toLowerCase().includes(q) ||
          (r.cliente?.toLowerCase().includes(q) ?? false) ||
          r.descripcion.toLowerCase().includes(q)
        );
      })
    : registros;

  const handleEdit = (id: string) => {
    setOpenMenuId(null);
    router.push({ pathname: '/registro-detalle', params: { id, editMode: '1' } });
  };

  const handleDelete = (id: string) => {
    setOpenMenuId(null);
    Alert.alert('Eliminar jornada', '¿Seguro que quieres eliminar esta jornada?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteRegistro(id);
          showToast('Jornada eliminada');
        },
      },
    ]);
  };

  const renderItem = ({ item: registro }: { item: Registro }) => {
    const menuOpen = openMenuId === registro.id;
    const dietaLabel =
      registro.dieta === 'media' ? '½ Dieta' :
      registro.dieta === 'completa' ? 'Dieta completa' : null;
    const extras = registro.horasExtras && registro.horasExtras > 0
      ? `${registro.horasExtras}h extra` : null;
    const tags = [dietaLabel, registro.pernocta ? 'Pernocta' : null, extras].filter(Boolean);

    return (
      <Pressable
        style={[styles.recordCard, menuOpen && styles.recordCardOpen]}
        onPress={() => {
          if (menuOpen) { setOpenMenuId(null); return; }
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
          <View style={styles.recordHeaderRight}>
            <Text style={styles.recordDuration}>{registro.duracion}</Text>
            <Pressable
              onPress={() => setOpenMenuId((prev) => (prev === registro.id ? null : registro.id))}
              style={[styles.menuBubble, menuOpen && styles.menuBubbleActive]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.menuBubbleText, menuOpen && styles.menuBubbleTextActive]}>···</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.recordSubtitle}>
          {getCardDate(registro)} · {getTimeDisplay(registro)}
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

        {menuOpen && (
          <View style={styles.cardMenu}>
            <Pressable style={styles.cardMenuItem} onPress={() => handleEdit(registro.id)}>
              <Text style={styles.cardMenuItemText}>Editar</Text>
            </Pressable>
            <View style={styles.cardMenuDivider} />
            <Pressable style={styles.cardMenuItem} onPress={() => handleDelete(registro.id)}>
              <Text style={[styles.cardMenuItemText, styles.cardMenuDestructive]}>Eliminar</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    );
  };

  const listHeader = (
    <View style={styles.listHeader}>
      <Text style={styles.title}>Registros</Text>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por tipo, cliente o notas…"
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>
      <Text style={styles.subtitle}>
        {query.trim()
          ? `${filteredRegistros.length} resultado${filteredRegistros.length !== 1 ? 's' : ''}`
          : 'Toca una jornada para ver el detalle.'}
      </Text>
    </View>
  );

  const listEmpty = (
    <View style={styles.emptyState}>
      {query.trim() ? (
        <>
          <Text style={styles.emptyTitle}>Sin resultados</Text>
          <Text style={styles.emptyText}>No hay jornadas que coincidan con "{query}".</Text>
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
        <BrandLogo />
      </View>
      {loading ? (
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Cargando registros…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRegistros}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => setOpenMenuId(null)}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          renderItem={renderItem}
        />
      )}
      <Toast toast={toast} onDismiss={dismissToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 4,
    zIndex: 10,
    elevation: 6,
    backgroundColor: Colors.light.background,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  page: { padding: 24, paddingTop: 16, gap: 14, paddingBottom: 40 },
  listHeader: { gap: 10, marginBottom: 4 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.brandDark, marginBottom: 2 },
  searchContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    padding: 14,
    fontSize: 15,
    color: Colors.brandDark,
  },
  subtitle: { fontSize: 14, color: '#6b7280' },
  loadingText: { color: '#6b7280', fontSize: 15, textAlign: 'center' },
  emptyState: {
    marginTop: 4,
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.brandDark, marginBottom: 8 },
  emptyText: { color: '#6b7280', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  recordCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  recordCardOpen: { borderColor: `${Colors.brand}40` },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recordTitleCol: { flex: 1, marginRight: 10 },
  recordTitle: { fontSize: 18, fontWeight: '700', color: Colors.brandDark },
  recordCliente: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  recordHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recordDuration: { fontSize: 14, fontWeight: '700', color: Colors.brand },
  menuBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBubbleActive: { backgroundColor: Colors.brandDark },
  menuBubbleText: { fontSize: 12, color: '#ffffff', letterSpacing: 2, lineHeight: 14 },
  menuBubbleTextActive: { color: '#ffffff' },
  recordSubtitle: { fontSize: 14, color: '#4b5563' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: `${Colors.brand}18`,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagText: { fontSize: 12, fontWeight: '700', color: Colors.brand },
  recordDescription: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  cardMenu: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cardMenuItem: { paddingVertical: 11, paddingHorizontal: 4 },
  cardMenuItemText: { fontSize: 15, fontWeight: '600', color: Colors.brandDark },
  cardMenuDestructive: { color: '#dc2626' },
  cardMenuDivider: { height: 1, backgroundColor: '#f3f4f6' },
});
