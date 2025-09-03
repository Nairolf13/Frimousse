import { fetchWithRefresh } from '../utils/fetchWithRefresh';

// Use relative endpoints so the browser origin (and dev proxy) are respected

async function handleRes<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'API error');
  }
  return (await res.json()) as T;
}

type Nanny = {
  id: string;
  name: string;
  email?: string | null;
};

type Child = {
  id: string;
  name: string;
  birthDate?: string;
  group?: string;
};

type Schedule = {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  name?: string;
  comment?: string | null;
  nannies?: Nanny[];
};

type Report = {
  id: string;
  priority: string;
  type: string;
  status: string;
  childId: string;
  nannyId: string;
  summary: string;
  details: string;
  date: string;
  time: string;
  duration?: string | null;
  childrenInvolved?: number | null;
  nanny?: Nanny | null;
};

type ParentItem = {
  id: string;
  name: string;
  email?: string | null;
  children?: { child: Child }[];
};

type AdminStats = {
  parentsCount: number;
  childrenCount: number;
  presentToday: number;
};

type AdminData = {
  stats: AdminStats;
  parents: ParentItem[];
};

export default {
  async getChildren(): Promise<Child[]> {
  const res = await fetchWithRefresh(`/api/parent/children`, { credentials: 'include' });
    return handleRes<Child[]>(res);
  },
  async getAdminList(): Promise<AdminData> {
  const res = await fetchWithRefresh(`/api/parent/admin`, { credentials: 'include' });
    return handleRes<AdminData>(res);
  },
  async getChildSchedule(childId: string): Promise<Schedule[]> {
  const res = await fetchWithRefresh(`/api/parent/child/${childId}/schedule`, { credentials: 'include' });
    return handleRes<Schedule[]>(res);
  },
  async getChildReports(childId: string): Promise<Report[]> {
  const res = await fetchWithRefresh(`/api/parent/child/${childId}/reports`, { credentials: 'include' });
    return handleRes<Report[]>(res);
  },
  async getChild(childId: string): Promise<Child> {
  const res = await fetchWithRefresh(`/api/children/${childId}`, { credentials: 'include' });
    return handleRes<Child>(res);
  }
};
