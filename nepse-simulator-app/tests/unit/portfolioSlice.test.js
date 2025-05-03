import portfolioReducer, { buy, sell } from '../../src/redux/slices/portfolioSlice';

describe('portfolioSlice', () => {
  const initialState = {
    cashBalance: 1000000,
    holdings: {},
    orders: [],
  };

  it('should handle initial state', () => {
    expect(portfolioReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle buy action', () => {
    const action = buy({ symbol: 'NEPSE', quantity: 10, price: 100, orderType: 'market' });
    const state = portfolioReducer(initialState, action);
    expect(state.cashBalance).toBe(1000000 - 1000);
    expect(state.holdings['NEPSE']).toBe(10);
    expect(state.orders.length).toBe(1);
  });

  it('should handle sell action', () => {
    const stateWithHoldings = {
      cashBalance: 900000,
      holdings: { NEPSE: 10 },
      orders: [],
    };
    const action = sell({ symbol: 'NEPSE', quantity: 5, price: 100, orderType: 'market' });
    const state = portfolioReducer(stateWithHoldings, action);
    expect(state.cashBalance).toBe(900000 + 500);
    expect(state.holdings['NEPSE']).toBe(5);
    expect(state.orders.length).toBe(1);
  });
});
