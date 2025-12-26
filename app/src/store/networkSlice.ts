import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type NetworkState = {
  isConnected: boolean;
  isInternetReachable: boolean;
  simulationOffline: boolean;
};

const initialState: NetworkState = {
  isConnected: true,
  isInternetReachable: true,
  simulationOffline: false,
};

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setConnectivity(state, action: PayloadAction<{ isConnected: boolean; isInternetReachable: boolean }>) {
      state.isConnected = action.payload.isConnected;
      state.isInternetReachable = action.payload.isInternetReachable;
    },
    setSimulationOffline(state, action: PayloadAction<boolean>) {
      state.simulationOffline = action.payload;
    },
  },
});

export const { setConnectivity, setSimulationOffline } = networkSlice.actions;
export default networkSlice.reducer;