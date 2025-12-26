import 'react-native-get-random-values';
import { StyleSheet, Text, View, TextInput, FlatList, Switch, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { selectPendingSum, selectThemeMode } from './src/store/selectors';
import React, { useEffect, useMemo, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import NetInfo from '@react-native-community/netinfo';
import { store, persistor, RootState } from './src/store/store';
import { selectDisplayBalance, selectQueue, selectNetworkAvailable } from './src/store/selectors';
import { enqueueAndProcess, processQueue } from './src/domain/processor';
import { setConnectivity, setSimulationOffline } from './src/store/networkSlice';
import { setServerBalance } from './src/store/walletSlice';
import { getBalance, setNetworkBlocked } from './src/data/mockApi';
import { toggleTheme } from './src/store/themeSlice';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { MaterialCommunityIcons } from '@expo/vector-icons';

function Main() {
  const dispatch = useDispatch();
  const displayBalance = useSelector((s: RootState) => selectDisplayBalance(s));
  const queue = useSelector((s: RootState) => selectQueue(s));
  const networkAvailable = useSelector((s: RootState) => selectNetworkAvailable(s));
  const pendingSum = useSelector((s: RootState) => selectPendingSum(s));
  const themeMode = useSelector((s: RootState) => selectThemeMode(s));

  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });

  const palette = themeMode === 'dark'
    ? {
        bg: '#0b1220',
        card: '#0f172a',
        cardBorder: '#1f2937',
        textPrimary: '#e5e7eb',
        textSecondary: '#9ca3af',
        textMuted: '#94a3b8',
        headerStart: '#0f172a',
        headerEnd: '#1f2937',
        chipText: '#0b1220',
      }
    : {
        bg: '#f8fafc',
        card: '#ffffff',
        cardBorder: '#e2e8f0',
        textPrimary: '#0f172a',
        textSecondary: '#334155',
        textMuted: '#64748b',
        headerStart: '#e2e8f0',
        headerEnd: '#f1f5f9',
        chipText: '#ffffff',
      };

  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('alice');
  const [offlineToggle, setOfflineToggle] = useState(false);
  const canSend = useMemo(() => {
    const a = Number(amount);
    return !isNaN(a) && a > 0 && a <= displayBalance;
  }, [amount, displayBalance]);

  // Micro-animations for the Send button
  const sendScale = useSharedValue(1);
  const sendAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  useEffect(() => {
    // Load server balance on launch
    getBalance().then((b) => dispatch(setServerBalance(b)));

    // Subscribe to connectivity
    const unsub = NetInfo.addEventListener((state) => {
      dispatch(setConnectivity({
        isConnected: !!state.isConnected,
        isInternetReachable: !!state.isInternetReachable,
      }));
    });
    return () => unsub();
  }, [dispatch]);

  useEffect(() => {
    // Reflect simulation toggle into mock API layer and redux state
    dispatch(setSimulationOffline(offlineToggle));
    setNetworkBlocked(offlineToggle);
  }, [offlineToggle, dispatch]);

  useEffect(() => {
    // Attempt processing when connectivity is restored
    if (networkAvailable) {
      // @ts-ignore
      processQueue(() => store.getState(), dispatch as any);
    }
  }, [networkAvailable, dispatch]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: palette.bg }} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }] }>
      <LinearGradient colors={[palette.headerStart, palette.headerEnd]} style={styles.headerGradient}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[styles.appTitle, { color: palette.textMuted, fontFamily: 'Inter_600SemiBold' }]}>Resilient Euro Transfer</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons name={themeMode === 'dark' ? 'weather-night' : 'white-balance-sunny'} size={18} color={palette.textMuted} />
            <Switch
              value={themeMode === 'dark'}
              onValueChange={() => dispatch(toggleTheme())}
              trackColor={{ false: '#94a3b8', true: '#334155' }}
              thumbColor={themeMode === 'dark' ? '#111827' : '#e5e7eb'}
            />
          </View>
        </View>

        <View style={[styles.balanceCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }] }>
          <Text style={[styles.balanceLabel, { color: palette.textMuted, fontFamily: 'Inter_400Regular' }]}>Effective Balance</Text>
          <Text style={[styles.balanceValue, { color: palette.textPrimary, fontFamily: 'Inter_700Bold' }]}>€{displayBalance.toFixed(2)}</Text>
          <View style={styles.balanceMetaRow}>
            <Text style={[styles.balanceMeta, { color: palette.textSecondary, fontFamily: 'Inter_400Regular' }]}>Server: €{(displayBalance + pendingSum).toFixed(2)}</Text>
            <Text style={[styles.balanceMeta, { color: palette.textSecondary, fontFamily: 'Inter_400Regular' }]}>Pending: €{pendingSum.toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.netRow}>
          <MaterialCommunityIcons name={networkAvailable ? 'wifi' : 'wifi-off'} size={16} color={palette.textMuted} />
          <Text style={[styles.netText, { color: palette.textMuted, fontFamily: 'Inter_400Regular' }]}>{networkAvailable ? 'Online' : 'Offline'}</Text>
          <Switch
            value={offlineToggle}
            onValueChange={setOfflineToggle}
            trackColor={{ false: '#94a3b8', true: '#dc2626' }}
            thumbColor={offlineToggle ? '#fca5a5' : '#22c55e'}
          />
          <Text style={[styles.netHint, { color: palette.textSecondary, fontFamily: 'Inter_400Regular' }]}>Toggle to simulate a tunnel (no signal)</Text>
        </View>
      </LinearGradient>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: palette.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>Send Money</Text>
        <TextInput
          placeholder="Amount (€)"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          style={[styles.input, { backgroundColor: themeMode === 'dark' ? '#0b1220' : '#f8fafc', borderColor: palette.cardBorder, color: palette.textPrimary, fontFamily: 'Inter_400Regular' }]}
        />
        <TextInput
          placeholder="Recipient"
          value={recipient}
          onChangeText={setRecipient}
          style={[styles.input, { backgroundColor: themeMode === 'dark' ? '#0b1220' : '#f8fafc', borderColor: palette.cardBorder, color: palette.textPrimary, fontFamily: 'Inter_400Regular' }]}
        />
        <Animated.View style={[sendAnimatedStyle]}>
          <Pressable
            onPressIn={() => { sendScale.value = withSpring(0.98); }}
            onPressOut={() => { sendScale.value = withSpring(1); }}
            onPress={() => {
            const a = Number(amount);
            if (isNaN(a) || a <= 0) return;
            if (a > displayBalance) {
              alert('Insufficient effective balance. Transaction blocked.');
              return;
            }
            dispatch<any>(enqueueAndProcess(a, recipient));
            setAmount('');
          }}
            disabled={!canSend}
            style={({ pressed }) => [{
              backgroundColor: canSend ? '#22c55e' : '#94a3b8',
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
              opacity: pressed ? 0.9 : 1,
            }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="send" color={themeMode === 'dark' ? '#0b1220' : '#ffffff'} size={18} />
              <Text style={{ color: themeMode === 'dark' ? '#0b1220' : '#ffffff', fontFamily: 'Inter_600SemiBold' }}>Send</Text>
            </View>
          </Pressable>
        </Animated.View>
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }] }>
        <Text style={[styles.cardTitle, { color: palette.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>History</Text>
        <FlatList
          style={{ width: '100%' }}
          data={[...queue].sort((a, b) => a.createdAt - b.createdAt)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} layout={Layout.duration(200)} style={styles.txRow}>
              <Text style={[styles.txMain, { color: palette.textPrimary, fontFamily: 'Inter_400Regular' }]}>€{item.amount} → {item.recipient}</Text>
              <View style={[styles.statusChip,
                item.status === 'completed' ? styles.chipCompleted :
                item.status === 'pending' ? styles.chipPending : styles.chipFailed]}>
                <Text style={[styles.chipText, { color: palette.chipText, fontFamily: 'Inter_700Bold' }]}>{item.status.toUpperCase()}</Text>
              </View>
            </Animated.View>
          )}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: palette.textMuted, fontFamily: 'Inter_400Regular' }]}>No transactions yet.</Text>}
        />
      </View>
    </View>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <Main />
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  headerGradient: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 24 },
  appTitle: { fontSize: 18, marginBottom: 12 },
  balanceCard: { borderRadius: 12, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  balanceLabel: { fontSize: 12, marginBottom: 4 },
  balanceValue: { fontSize: 28 },
  balanceMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  balanceMeta: { fontSize: 12 },
  netRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  netText: { fontSize: 12, marginRight: 8 },
  netHint: { fontSize: 12, marginLeft: 8 },
  card: { marginTop: 16, marginHorizontal: 16, borderRadius: 12, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  cardTitle: { fontSize: 14, marginBottom: 12 },
  input: { borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 10 },
  txRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#0b1220' },
  txMain: {},
  emptyText: {},
  statusChip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 9999 },
  chipText: { fontWeight: '700', fontSize: 10 },
  chipCompleted: { backgroundColor: '#22c55e' },
  chipPending: { backgroundColor: '#f59e0b' },
  chipFailed: { backgroundColor: '#ef4444' },
});
