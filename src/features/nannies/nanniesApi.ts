import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export type NannySummary = {
  id: string;
  firstName?: string;
  lastName?: string;
};

export type NannyDetail = NannySummary & {
  bio?: string | null;
};

export const nanniesApi = createApi({
  reducerPath: 'nanniesApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL, fetchFn: fetchWithRefresh as typeof fetch }),
  tagTypes: ['Nannies'],
  endpoints: (build) => ({
    getNannies: build.query<NannySummary[], void>({
      query: () => '/nannies',
      providesTags: (result) =>
        Array.isArray(result)
          ? [...result.map((n) => ({ type: 'Nannies' as const, id: n.id })), { type: 'Nannies', id: 'LIST' }]
          : [{ type: 'Nannies', id: 'LIST' }],
    }),
    getNanny: build.query<NannyDetail, string>({
      query: (id) => `/nannies/${id}`,
      providesTags: (_res, _err, id) => [{ type: 'Nannies', id }],
    }),
    createNanny: build.mutation<NannyDetail, Partial<NannyDetail & { password?: string }>>({
      query: (body) => ({ url: '/nannies', method: 'POST', body }),
      invalidatesTags: [{ type: 'Nannies', id: 'LIST' }],
    }),
    updateNanny: build.mutation<NannyDetail, { id: string; body: Partial<NannyDetail & { newPassword?: string }> }>({
      query: ({ id, body }) => ({ url: `/nannies/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, arg) => { void result; void error; return [{ type: 'Nannies', id: arg.id }, { type: 'Nannies', id: 'LIST' }]; },
    }),
    deleteNanny: build.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/nannies/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error, id) => { void result; void error; return [{ type: 'Nannies', id }, { type: 'Nannies', id: 'LIST' }]; },
    }),
    payCotisation: build.mutation<{ cotisationPaidUntil?: string; lastCotisationAmount?: number }, { id: string; amount?: number }>({
      query: ({ id, amount }) => ({ url: `/nannies/${id}/cotisation`, method: 'PUT', body: amount ? { amount } : undefined }),
      invalidatesTags: (result, error, arg) => { void result; void error; return [{ type: 'Nannies', id: arg.id }, { type: 'Nannies', id: 'LIST' }]; },
    }),
  }),
});

export const { useGetNanniesQuery, useGetNannyQuery, useCreateNannyMutation, useUpdateNannyMutation, useDeleteNannyMutation, usePayCotisationMutation } = nanniesApi;
