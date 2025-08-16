// Prefer explicit VITE_API_URL; fallback to backend running on localhost:4000 during dev
function getApiBase(): string {
  try {
    const meta = import.meta as unknown as { env?: { VITE_API_URL?: string } };
    return (meta.env && meta.env.VITE_API_URL) ? meta.env.VITE_API_URL : 'http://localhost:4000';
  } catch {
    return 'http://localhost:4000';
  }
}
const apiBase = getApiBase();

async function handleRes<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'API error');
  }
  // cast the parsed JSON to the requested generic type
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
  // Add other relevant fields as needed
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

// Admin / parent listing types returned by the admin endpoint
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
    const res = await fetch(`${apiBase}/api/parent/children`, { credentials: 'include' });
    return handleRes<Child[]>(res);
  },
  async getAdminList(): Promise<AdminData> {
    const res = await fetch(`${apiBase}/api/parent/admin`, { credentials: 'include' });
    return handleRes<AdminData>(res);
  },
  async getChildSchedule(childId: string): Promise<Schedule[]> {
    const res = await fetch(`${apiBase}/api/parent/child/${childId}/schedule`, { credentials: 'include' });
    return handleRes<Schedule[]>(res);
  },
  async getChildReports(childId: string): Promise<Report[]> {
    const res = await fetch(`${apiBase}/api/parent/child/${childId}/reports`, { credentials: 'include' });
    return handleRes<Report[]>(res);
  }
};
