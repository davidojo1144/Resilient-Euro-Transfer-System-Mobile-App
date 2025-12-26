import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type WalletState = {
  serverBalance: number;
};

const initialState: WalletState = {
  serverBalance: 500,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setServerBalance(state, action: PayloadAction<number>) {
      state.serverBalance = action.payload;
    },
    applyServerDeduction(state, action: PayloadAction<number>) {
      state.serverBalance = Math.max(0, state.serverBalance - action.payload);
    },
  },
});

export const { setServerBalance, applyServerDeduction } = walletSlice.actions;
export default walletSlice.reducer;