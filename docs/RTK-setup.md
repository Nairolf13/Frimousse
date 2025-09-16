Redux Toolkit (RTK) quick setup for this project

What I added:
- src/store/index.ts -> configureStore with RTK Query middleware
- src/features/paymentHistory/paymentHistoryApi.ts -> an RTK Query API slice for payment-history endpoints
- wired Provider in src/main.tsx

Install dependencies

Run in project root:

```bash
# install runtime
npm install @reduxjs/toolkit react-redux

# install dev types (TypeScript)
npm install -D @types/react-redux
```

Usage notes

- Use the generated hooks in components:
  - useGetMonthQuery({ year, month }) to fetch cached payment history for a month
  - useGetAssignedParentsQuery({ year, month }) to fetch assigned parents

- These hooks cache results and reduce duplicate network calls. They also provide `isLoading`, `isFetching`, `data`, `error`.

Next steps

- Replace fetchWithRefresh calls in pages like `PaymentHistory.tsx` with the RTK Query hooks.
- Add other API slices as needed (user, notifications, children) and register them in the store.
- If you want, I can convert `PaymentHistory.tsx` to use `useGetMonthQuery` now.
