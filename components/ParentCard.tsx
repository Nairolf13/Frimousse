import { useNavigate } from 'react-router-dom';

type ChildRef = { child: { id: string; name: string; group?: string } };

type Parent = {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  children?: ChildRef[];
};

export default function ParentCard({ parent, color }: { parent: Parent; color?: string }) {
  const navigate = useNavigate();
  const initials = ((parent.firstName && parent.lastName) ? `${parent.firstName[0] || ''}${parent.lastName[0] || ''}` : (parent.name || 'U')).toUpperCase().slice(0,2);
  return (
    <div className={`rounded-2xl shadow ${color || 'bg-white'} relative flex flex-col min-h-[320px] h-full transition-transform duration-500 p-5`} style={{height:'100%'}}>
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center gap-3 mb-2 min-w-0">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-2xl shadow border border-gray-100 font-bold text-purple-700">{initials}</div>
          <div className="truncate flex-1">
            <div className="font-semibold text-lg text-gray-900 truncate">{(parent.firstName || parent.lastName) ? `${parent.firstName || ''} ${parent.lastName || ''}`.trim() : (parent.name || '—')}</div>
          </div>
          <div className="ml-auto text-xs font-bold bg-white text-green-600 px-3 py-1 rounded-full shadow border border-green-100">{(parent.children && parent.children.length) ? `${parent.children.length} enfant(s)` : '0 enfant'}</div>
        </div>

        <div className="text-sm text-gray-700 mb-4">
          <div className="flex flex-col gap-1">
            <div className="text-sm text-gray-600">{parent.phone ? <span>📞 <a href={`tel:${parent.phone.replace(/\s+/g, '')}`} className="text-blue-600 hover:underline">{parent.phone}</a></span> : '—'}</div>
            <div className="text-sm text-gray-600">{parent.email ? <span>✉️ <a href={`mailto:${parent.email}`} className="text-blue-600 hover:underline">{parent.email}</a></span> : null}</div>
          </div>
        </div>

        <div className="mb-3">
          <div className="text-sm font-medium text-gray-700 mb-2">Enfants</div>
          <div className="flex flex-wrap gap-2">
            {(parent.children || []).map(c => (
              <button
                key={c.child.id}
                onClick={() => navigate(`/parent/child/${c.child.id}/reports`)}
                className="px-3 py-2 bg-gray-100 text-blue-700 rounded text-sm border text-left focus:outline-none hover:bg-gray-50 cursor-pointer hover:underline"
                aria-label={`Voir les rapports de ${c.child.name}`}>
                <div className="font-medium">{c.child.name}</div>
                <div className="text-xs text-gray-500">Groupe: {c.child.group || '—'}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="text-xs text-gray-500">Statut: <span className="text-green-600 font-semibold">Actif</span></div>
          <div className="flex gap-2">
            <button className="bg-white border border-gray-200 text-gray-500 hover:text-yellow-500 rounded-full p-2" title="Voir">👁️</button>
            <button className="bg-white border border-gray-200 text-gray-500 hover:text-blue-500 rounded-full p-2" title="Éditer">✏️</button>
            <button className="bg-white border border-gray-200 text-gray-500 hover:text-red-500 rounded-full p-2" title="Plus">⋯</button>
          </div>
        </div>
      </div>
    </div>
  );
}
