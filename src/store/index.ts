import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { paymentHistoryApi } from '../features/paymentHistory/paymentHistoryApi';
import { parentsApi } from '../features/parents/parentsApi';
import { childrenApi } from '../features/children/childrenApi';
import { nanniesApi } from '../features/nannies/nanniesApi';
import { assignmentsApi } from '../features/assignments/assignmentsApi';

export const store = configureStore({
  reducer: {
    [paymentHistoryApi.reducerPath]: paymentHistoryApi.reducer,
    [parentsApi.reducerPath]: parentsApi.reducer,
    [childrenApi.reducerPath]: childrenApi.reducer,
    [nanniesApi.reducerPath]: nanniesApi.reducer,
    [assignmentsApi.reducerPath]: assignmentsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(paymentHistoryApi.middleware)
      .concat(parentsApi.middleware)
      .concat(childrenApi.middleware)
      .concat(nanniesApi.middleware)
      .concat(assignmentsApi.middleware),
});

// optional, enables refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
