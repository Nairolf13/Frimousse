import { createApi } from '@reduxjs/toolkit/query/react';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export type Assignment = {
  id: string;
  date: string;
  child: { id: string; name: string };
  nanny: { id: string; name: string };
};

export type GetAssignmentsArgs = { start?: string; end?: string; nannyId?: string };

export const assignmentsApi = createApi({
  reducerPath: 'assignmentsApi',
  baseQuery: async (args: string | { url?: string; method?: string; body?: unknown }) => {
    // args can be a string or an object { url, method, body }
    const url = typeof args === 'string' ? args : (args.url ?? '');
    const method = typeof args === 'string' ? 'GET' : (args.method ?? 'GET');
    const body = typeof args === 'string' ? undefined : args.body;
    const fullUrl = url && url.startsWith('http') ? url : `${API_URL}${url}`;
    try {
      const res = await fetchWithRefresh(fullUrl, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : undefined;
      if (!res.ok) {
        return { error: { status: res.status, data } };
      }
      return { data };
    } catch (err) {
      return { error: { status: 'FETCH_ERROR', data: String(err) } };
    }
  },
  tagTypes: ['Assignments'],
  endpoints: (build) => ({
    getAssignments: build.query<Assignment[], GetAssignmentsArgs>({
      query: ({ start, end, nannyId } = {}) => {
        const params = new URLSearchParams();
        if (start) params.set('start', start);
        if (end) params.set('end', end);
        if (nannyId) params.set('nannyId', nannyId);
        const qs = params.toString();
        return `/assignments${qs ? `?${qs}` : ''}`;
      },
      providesTags: (result) =>
        Array.isArray(result)
          ? [...result.map((r) => ({ type: 'Assignments' as const, id: r.id })), { type: 'Assignments', id: 'LIST' }]
          : [{ type: 'Assignments', id: 'LIST' }],
    }),
    addAssignment: build.mutation<Assignment, Partial<Assignment>>({
      query: (body) => ({ url: '/assignments', method: 'POST', body }),
      invalidatesTags: [{ type: 'Assignments', id: 'LIST' }],
    }),
    updateAssignment: build.mutation<Assignment, { id: string; body: Partial<Assignment> }>({
      query: ({ id, body }) => ({ url: `/assignments/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, arg) => { void result; void error; return [{ type: 'Assignments', id: arg.id }, { type: 'Assignments', id: 'LIST' }]; },
    }),
    deleteAssignment: build.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/assignments/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error, id) => { void result; void error; return [{ type: 'Assignments', id }, { type: 'Assignments', id: 'LIST' }]; },
    }),
  }),
});

export const { useGetAssignmentsQuery, useAddAssignmentMutation, useUpdateAssignmentMutation, useDeleteAssignmentMutation } = assignmentsApi;
