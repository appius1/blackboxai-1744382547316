import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  cashBalance: 1000000, // NPR 1,000,000 virtual cash
  holdings: {},
  orders: [],
};

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    buy(state, action) {
      const { symbol, quantity, price, orderType } = action.payload;
      const cost = price * quantity;
      if (state.cashBalance >= cost) {
        state.cashBalance -= cost;
        if (!state.holdings[symbol]) {
          state.holdings[symbol] = 0;
        }
        state.holdings[symbol] += quantity;
        state.orders.push({ symbol, quantity, price, orderType, type: 'BUY' });
      }
    },
    sell(state, action) {
      const { symbol, quantity, price, orderType } = action.payload;
      if (state.holdings[symbol] && state.holdings[symbol] >= quantity) {
        state.holdings[symbol] -= quantity;
        const revenue = price * quantity;
        state.cashBalance += revenue;
        state.orders.push({ symbol, quantity, price, orderType, type: 'SELL' });
      }
    },
  },
});

export const { buy, sell } = portfolioSlice.actions;
export default portfolioSlice.reducer;
