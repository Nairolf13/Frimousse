import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

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

export default function ParentCard({ parent, color, parentDue, onChildClick, onEdit, onDelete }: { parent: Parent; color?: string; parentDue?: number; onChildClick?: (child: { id: string; name: string; group?: string }) => void; onEdit?: (p: Parent) => void; onDelete?: (id: string) => void }) {
  const navigate = useNavigate();
  const initials = ((parent.firstName && parent.lastName) ? `${parent.firstName[0] || ''}${parent.lastName[0] || ''}` : (parent.name || 'U')).toUpperCase().slice(0,2);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <div className={`rounded-2xl shadow ${color || 'bg-white'} relative flex flex-col min-h-[320px] h-full transition-transform duration-500 perspective-1000`} style={{height:'100%', perspective: '1000px'}}>
      <div className={`w-full h-full transition-transform duration-500 ${isDeleting ? 'rotate-y-180' : ''}`} style={{transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%'}}>
        <div className={`absolute inset-0 w-full h-full p-5 flex flex-col ${isDeleting ? 'opacity-0 pointer-events-none' : 'opacity-100'} bg-transparent`} style={{backfaceVisibility: 'hidden'}}>
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
                  onClick={() => { if (onChildClick) { onChildClick(c.child); } else navigate(`/parent/child/${c.child.id}/reports`); }}
                  className="px-3 py-2 bg-gray-100 text-blue-700 rounded text-sm border text-left focus:outline-none hover:bg-gray-50 cursor-pointer hover:underline"
                  aria-label={`Voir les rapports de ${c.child.name}`}>
                  <div className="font-medium">{c.child.name}</div>
                  <div className="text-xs text-gray-500">Groupe: {c.child.group || '—'}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between">
            <div className="text-sm text-gray-700">À payer ce mois: <span className="font-bold text-blue-700">{(parentDue || 0)}€</span></div>
            <div className="flex gap-2">
              <button onClick={() => { if (onEdit) onEdit(parent); }} className="bg-white border border-gray-200 text-gray-500 hover:text-yellow-500 rounded-full p-2 shadow-sm" title="Éditer">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 13l6-6 3 3-6 6H9v-3z"/></svg>
              </button>
              <button onClick={() => setIsDeleting(true)} className="bg-white border border-gray-200 text-gray-500 hover:text-red-500 rounded-full p-2 shadow-sm" title="Supprimer">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
              <button className="bg-white border border-gray-200 text-gray-500 hover:text-gray-700 rounded-full p-2" title="Plus">⋯</button>
            </div>
          </div>
        </div>

        <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-white rounded-2xl shadow-xl p-8 ${isDeleting ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{backfaceVisibility: 'hidden', transform: 'rotateY(180deg)'}}>
          <div className="text-red-500 text-4xl mb-2">🗑️</div>
          <div className="text-lg font-semibold mb-2 text-gray-900 text-center">Confirmer la suppression</div>
          <div className="text-gray-500 mb-6 text-center">Voulez-vous vraiment supprimer ce parent ? <br/>Cette action est irréversible.</div>
          <div className="flex gap-3 w-full">
            <button onClick={() => setIsDeleting(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2 font-medium hover:bg-gray-200 transition">Annuler</button>
            <button onClick={() => { if (onDelete) onDelete(String(parent.id)); }} className="flex-1 bg-red-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-red-600 transition">Supprimer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
