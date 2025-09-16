import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export type ChildSummary = {
  id: string;
  name?: string;
  birthDate?: string | null;
};

export type ChildDetail = ChildSummary & {
  allergies?: string | null;
};

export const childrenApi = createApi({
  reducerPath: 'childrenApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL, fetchFn: fetchWithRefresh as typeof fetch }),
  tagTypes: ['Children'],
  endpoints: (build) => ({
    getChildren: build.query<ChildSummary[], void>({
      query: () => '/children',
      providesTags: (result) =>
        Array.isArray(result)
          ? [...result.map((c) => ({ type: 'Children' as const, id: c.id })), { type: 'Children', id: 'LIST' }]
          : [{ type: 'Children', id: 'LIST' }],
    }),
    getChild: build.query<ChildDetail, string>({
      query: (id) => `/children/${id}`,
      providesTags: (_res, _err, id) => [{ type: 'Children', id }],
    }),
    getPrescriptions: build.query<{ id: string; url: string; name?: string }[], string>({
      query: (childId) => `/children/${childId}/prescription`,
      providesTags: (_res, _err, id) => [{ type: 'Children', id }],
    }),
    uploadPrescription: build.mutation<{ id: string; url: string }, { childId: string; formData: FormData }>({
      query: ({ childId, formData }) => ({ url: `/children/${childId}/prescription`, method: 'POST', body: formData }),
      invalidatesTags: (_res, _err, arg) => [{ type: 'Children', id: arg.childId }],
    }),
    deletePrescription: build.mutation<{ success: boolean }, { childId: string; prescriptionId: string }>({
      query: ({ childId, prescriptionId }) => ({ url: `/children/${childId}/prescription`, method: 'DELETE', body: { prescriptionId } }),
      invalidatesTags: (_res, _err, arg) => [{ type: 'Children', id: arg.childId }],
    }),
  }),
});

export const { useGetChildrenQuery, useGetChildQuery, useGetPrescriptionsQuery, useUploadPrescriptionMutation, useDeletePrescriptionMutation } = childrenApi;
