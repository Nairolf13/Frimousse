import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export type ParentSummary = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
};

export type ParentDetail = ParentSummary & {
  // additional fields if available
  address?: string | null;
};

export const parentsApi = createApi({
  reducerPath: 'parentsApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL, fetchFn: fetchWithRefresh as typeof fetch }),
  tagTypes: ['Parents'],
  endpoints: (build) => ({
    getParents: build.query<ParentSummary[], void>({
      query: () => '/parents',
      providesTags: (result) =>
        Array.isArray(result)
          ? [...result.map((p) => ({ type: 'Parents' as const, id: p.id })), { type: 'Parents', id: 'LIST' }]
          : [{ type: 'Parents', id: 'LIST' }],
    }),
    getParent: build.query<ParentDetail, string>({
      query: (id) => `/parents/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Parents', id }],
    }),
  }),
});

export const { useGetParentsQuery, useGetParentQuery } = parentsApi;
