import { useAuth } from '../src/context/AuthContext';

const PLAN_LIMITS: Record<string, number> = {
  decouverte: 2,
  essentiel: 10,
};

interface Props {
  resource: 'nanny' | 'child' | 'parent';
  count: number;
}

/**
 * Shows a small "X / limit" badge next to add buttons when the user is on a
 * limited plan (découverte or essentiel). Hidden for pro / super-admin.
 */
export default function PlanLimitBadge({ resource, count }: Props) {
  const { user } = useAuth();
  if (!user) return null;

  const plan = (user.plan || '').toLowerCase();
  const limit = PLAN_LIMITS[plan];
  if (!limit) return null; // pro or unknown plan → no badge

  const pct = count / limit;
  const isWarning = pct >= 0.5 && pct < 1;
  const isFull = count >= limit;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
        isFull
          ? 'bg-red-50 text-red-600 border-red-200'
          : isWarning
          ? 'bg-amber-50 text-amber-600 border-amber-200'
          : 'bg-gray-50 text-gray-500 border-gray-200'
      }`}
    >
      {isFull && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      )}
      {count}/{limit}
    </span>
  );
}
