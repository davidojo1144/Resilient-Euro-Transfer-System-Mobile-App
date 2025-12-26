import 'react-native-get-random-values';
import { StyleSheet, Text, View, TextInput, Button, FlatList, Switch } from 'react-native';
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

function Main() {
  const dispatch = useDispatch();
  const displayBalance = useSelector((s: RootState) => selectDisplayBalance(s));
  const queue = useSelector((s: RootState) => selectQueue(s));
  const networkAvailable = useSelector((s: RootState) => selectNetworkAvailable(s));

  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('alice');
  const [offlineToggle, setOfflineToggle] = useState(false);
  const canSend = useMemo(() => {
    const a = Number(amount);
    return !isNaN(a) && a > 0 && a <= displayBalance;
  }, [amount, displayBalance]);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resilient Euro Transfer System</Text>
      <Text style={styles.balance}>Balance: €{displayBalance.toFixed(2)}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        <Text>Disable Network</Text>
        <Switch value={offlineToggle} onValueChange={setOfflineToggle} />
        <Text style={{ marginLeft: 8 }}>({networkAvailable ? 'Online' : 'Offline'})</Text>
      </View>
      <View style={{ marginTop: 16, width: '100%', paddingHorizontal: 16 }}>
        <TextInput
          placeholder="Amount (€)"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          style={styles.input}
        />
        <TextInput
          placeholder="Recipient"
          value={recipient}
          onChangeText={setRecipient}
          style={styles.input}
        />
        <Button
          title="Send"
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
        />
      </View>
      <View style={styles.separator} />
      <Text style={styles.subtitle}>Transactions</Text>
      <FlatList
        style={{ width: '100%' }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        data={[...queue].sort((a, b) => a.createdAt - b.createdAt)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>€{item.amount} → {item.recipient}</Text>
            <Text>Status: {item.status}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ paddingHorizontal: 16 }}>No transactions yet.</Text>}
      />
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
    backgroundColor: '#fff',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingTop: 48,
  },
  separator: {
    marginVertical: 16,
    height: 1,
    width: '100%',
    backgroundColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: '600', paddingHorizontal: 16 },
  subtitle: { fontSize: 16, fontWeight: '500', marginBottom: 8, paddingHorizontal: 16 },
  balance: { fontSize: 22, fontWeight: '700', marginTop: 8, paddingHorizontal: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 6, marginBottom: 8 },
  item: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
});
