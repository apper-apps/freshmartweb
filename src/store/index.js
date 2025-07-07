import { configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";
import cartReducer from "@/store/cartSlice";
const persistConfig = {
  key: 'freshmart_cart',
  storage,
  whitelist: ['items', 'total', 'itemCount'] // Only persist cart data
};

const persistedCartReducer = persistReducer(persistConfig, cartReducer);

export const store = configureStore({
  reducer: {
    cart: persistedCartReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PAUSE', 'persist/PURGE', 'persist/REGISTER'],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['cart.items.updatedAt', '_persist']
      },
      immutableCheck: {
        warnAfter: 128
      },
      actionCreatorCheck: {
        warnAfter: 128
}
    }),
  devTools: typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
});

export const persistor = persistStore(store);