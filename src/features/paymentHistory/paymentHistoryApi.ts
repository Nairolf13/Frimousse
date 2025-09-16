import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

// Types
export type Detail = {
  childName: string;
  daysPresent?: number;
  ratePerDay?: number;
  subtotal?: number;
};

export type Parent = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  // optional short history provided by assigned endpoint
  paymentHistories?: Array<{
    id: string;
    year?: number;
    month?: number;
    total?: number;
    paid?: boolean;
  }>;
};

export type PaymentHistory = {
  id: string;
  parent?: Parent | null;
  total: number;
  details?: Detail[];
  createdAt?: string | null;
  paid?: boolean;
  year?: number;
  month?: number;
};

export type AssignedParentsResponse = {
  parents: Parent[];
};

export const paymentHistoryApi = createApi({
  reducerPath: 'paymentHistoryApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL, fetchFn: fetchWithRefresh as typeof fetch }),
  tagTypes: ['PaymentHistory', 'Parents'],
  endpoints: (build) => ({
    getMonth: build.query<PaymentHistory[], { year: number; month: number }>({
      query: ({ year, month }) => `/payment-history/${year}/${month}`,
      providesTags: (result) =>
        Array.isArray(result)
          ? [
              ...result.map((r) => ({ type: 'PaymentHistory' as const, id: r.id })),
              { type: 'PaymentHistory', id: 'LIST' },
            ]
          : [{ type: 'PaymentHistory', id: 'LIST' }],
    }),
    getAssignedParents: build.query<AssignedParentsResponse, { year?: number; month?: number }>({
      query: ({ year, month } = {}) => {
        const params = new URLSearchParams();
        if (year) params.set('year', String(year));
        if (month) params.set('month', String(month));
        const qs = params.toString();
        return `/payment-history/assigned${qs ? `?${qs}` : ''}`;
      },
      providesTags: (result) =>
        result && Array.isArray(result.parents)
          ? [
              ...result.parents.map((p) => ({ type: 'Parents' as const, id: p.id })),
              { type: 'Parents', id: 'LIST' },
            ]
          : [{ type: 'Parents', id: 'LIST' }],
    }),
  }),
});

export const { useGetMonthQuery, useGetAssignedParentsQuery } = paymentHistoryApi;
