import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { HiOutlineOfficeBuilding, HiOutlineUsers, HiOutlineChevronDown, HiOutlineChevronRight } from 'react-icons/hi';

const API_URL = import.meta.env.VITE_API_URL;

interface Center {
  id: string;
  name: string;
  address?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  centerId?: string;
  center?: {
    id: string;
    name: string;
  };
}

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: User;
  replies?: Reply[];
}

interface Reply {
  id: string;
  message: string;
  isFromAdmin: boolean;
  createdAt: string;
}

interface CenterWithUsers extends Center {
  users: User[];
  tickets: Ticket[];
}

export default function AdminSupportPage() {
  const { user } = useAuth();
  const [centers, setCenters] = useState<CenterWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCenters, setExpandedCenters] = useState<Set<string>>(new Set());
  const [isShortLandscape, setIsShortLandscape] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userTickets, setUserTickets] = useState<Ticket[]>([]);
  const [showUserTicketsModal, setShowUserTicketsModal] = useState(false);
  const [replyMessages, setReplyMessages] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);
  const [modalTickets, setModalTickets] = useState<Ticket[]>([]); // État séparé pour le modal
  const [modalKey, setModalKey] = useState(0); // Pour forcer le re-render du modal
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [ticketToClose, setTicketToClose] = useState<Ticket | null>(null);
  const [closingTicketId, setClosingTicketId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [expandedTicketIds, setExpandedTicketIds] = useState<Set<string>>(new Set());
  const replyRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showUserTicketsModal) return;
    // Wait for DOM to render replies
    setTimeout(() => {
      const lastWithReplies = [...modalTickets].reverse().find(t => t.replies && t.replies.length > 0);
      if (lastWithReplies) {
        const el = replyRefs.current[lastWithReplies.id];
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'end' });
          return;
        }
      }
      if (modalContainerRef.current) {
        modalContainerRef.current.scrollTop = modalContainerRef.current.scrollHeight;
      }
    }, 50);
  }, [showUserTicketsModal, modalKey, modalTickets]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(min-width: 768px) and (max-height: 600px)');
    const onChange = () => setIsShortLandscape(Boolean(mql.matches));
    onChange();
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange); else mql.addListener(onChange);
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    return () => { try { if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange); else mql.removeListener(onChange); } catch { /* ignore */ } window.removeEventListener('resize', onChange); window.removeEventListener('orientationchange', onChange); };
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'super-admin') return;
    loadSupportData();
  }, [user]);

  useEffect(() => {
    return () => {
      // Cleanup: arrêter le polling si le composant se démonte
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  const loadSupportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger tous les tickets avec les informations utilisateur et centre
      const ticketsResponse = await fetch(`${API_URL}/support/admin/tickets`, {
        credentials: 'include',
      });

      if (!ticketsResponse.ok) {
        throw new Error('Erreur lors du chargement des tickets');
      }

      const ticketsData = await ticketsResponse.json();
      const allTickets: Ticket[] = ticketsData.tickets || [];

      // Grouper les tickets par centre
      const centersMap = new Map<string, CenterWithUsers>();

      allTickets.forEach(ticket => {
        const centerId = ticket.user.center?.id || 'no-center';
        const centerName = ticket.user.center?.name || 'Sans centre';

        if (!centersMap.has(centerId)) {
          centersMap.set(centerId, {
            id: centerId,
            name: centerName,
            users: [],
            tickets: []
          });
        }

        const center = centersMap.get(centerId)!;

        // Ajouter l'utilisateur s'il n'existe pas encore
        if (!center.users.some(u => u.id === ticket.user.id)) {
          center.users.push(ticket.user);
        }

        // Ajouter le ticket
        center.tickets.push(ticket);
      });

      // Convertir la Map en array et trier par nom de centre (Sans centre en dernier)
      const centersWithData = Array.from(centersMap.values()).sort((a, b) => {
        if (a.id === 'no-center') return 1;
        if (b.id === 'no-center') return -1;
        return a.name.localeCompare(b.name);
      });

      setCenters(centersWithData);
    } catch (err) {
      console.error('Erreur chargement données support:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const refreshUserTickets = async (user: User) => {
    // Refreshing user tickets
    try {
      const ticketsResponse = await fetch(`${API_URL}/support/admin/tickets`, {
        credentials: 'include',
      });

      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json();
        const allTickets: Ticket[] = ticketsData.tickets || [];
        // API response received

        // Trouver les tickets frais pour cet utilisateur
        const freshTickets = allTickets.filter(ticket => ticket.user.id === user.id);
        // fresh tickets computed

        // Grouper par centre pour mettre à jour les données principales aussi
        const centersMap = new Map<string, CenterWithUsers>();

        allTickets.forEach(ticket => {
          const centerId = ticket.user.center?.id || 'no-center';
          const centerName = ticket.user.center?.name || 'Sans centre';

          if (!centersMap.has(centerId)) {
            centersMap.set(centerId, {
              id: centerId,
              name: centerName,
                users: [],
                tickets: []
              });
            }

            const centerData = centersMap.get(centerId)!;

            // Ajouter l'utilisateur s'il n'existe pas encore
            if (!centerData.users.some(u => u.id === ticket.user.id)) {
              centerData.users.push(ticket.user);
            }

            // Ajouter le ticket
            centerData.tickets.push(ticket);
        });

        // Convertir la Map en array et trier par nom de centre (Sans centre en dernier)
        const centersWithData = Array.from(centersMap.values()).sort((a, b) => {
          if (a.id === 'no-center') return 1;
          if (b.id === 'no-center') return -1;
          return a.name.localeCompare(b.name);
        });

        setCenters(centersWithData);
        setUserTickets(freshTickets);
        setModalTickets(JSON.parse(JSON.stringify(freshTickets)));
        setModalKey(prev => prev + 1);
        // tickets refreshed successfully
      }
    } catch (error) {
      console.error('Erreur rechargement tickets:', error);
    }
  };

  const toggleCenter = (centerId: string) => {
    const newExpanded = new Set(expandedCenters);
    if (newExpanded.has(centerId)) {
      newExpanded.delete(centerId);
    } else {
      newExpanded.add(centerId);
    }
    setExpandedCenters(newExpanded);
  };

  const openUserTickets = async (user: User) => {
    setSelectedUser(user);
    setShowUserTicketsModal(true);

    // Marquer les tickets de cet utilisateur comme lus
    try {
      await fetch(`${API_URL}/support/admin/tickets/mark-user-read/${user.id}`, {
        method: 'POST',
        credentials: 'include'
      });
      // Rafraîchir le compteur de la sidebar en rechargeant les données
      window.dispatchEvent(new Event('support-tickets-updated'));
    } catch (error) {
      console.error('Erreur marquage tickets lus:', error);
    }

    // Recharger les données pour avoir les tickets les plus récents
    await refreshUserTickets(user);

    // Démarrer le polling pour rafraîchir automatiquement (une seule instance)
    try {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    } catch { /* ignore */ }
    const interval = setInterval(() => {
      if (user) {
        refreshUserTickets(user);
      }
    }, 10000); // Rafraîchir toutes les 10 secondes
    pollingIntervalRef.current = interval;
  };

  const closeUserTicketsModal = () => {
    setSelectedUser(null);
    setUserTickets([]);
    setModalTickets([]);
    setShowUserTicketsModal(false);
    setReplyMessages({});
    setSendingReply(null);
    setExpandedTicketIds(new Set());

    // Arrêter le polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleReplyChange = (ticketId: string, message: string) => {
    setReplyMessages(prev => ({
      ...prev,
      [ticketId]: message
    }));
  };

  const sendReply = async (ticketId: string) => {
    const message = replyMessages[ticketId]?.trim();
    if (!message) return;

    // Créer la réponse temporaire pour affichage instantané
    const tempReply = {
      id: `temp-${Date.now()}`,
      message,
      isFromAdmin: true,
      createdAt: new Date().toISOString()
    };

    // Ajouter immédiatement la réponse aux tickets locaux et aux données principales
    const newUserTickets = userTickets.map((ticket: Ticket) => {
      if (ticket.id === ticketId) {
        return {
          ...ticket,
          replies: [...(ticket.replies || []), { ...tempReply }]
        };
      }
      return { ...ticket };
    });

    const newModalTickets = modalTickets.map((ticket: Ticket) => {
      if (ticket.id === ticketId) {
        return {
          ...ticket,
          replies: [...(ticket.replies || []), { ...tempReply }]
        };
      }
      return { ...ticket };
    });

    // Updated local ticket states

    setUserTickets(newUserTickets);
    setModalTickets(newModalTickets);
    setModalKey(prev => prev + 1);

    // Mettre à jour aussi les données principales
    setCenters(prevCenters =>
      prevCenters.map((center: CenterWithUsers) => ({
        ...center,
        tickets: center.tickets.map((ticket: Ticket) => {
          if (ticket.id === ticketId) {
            return {
              ...ticket,
              replies: [...(ticket.replies || []), tempReply]
            };
          }
          return ticket;
        })
      }))
    );

    // Vider le champ de réponse immédiatement
    setReplyMessages(prev => ({
      ...prev,
      [ticketId]: ''
    }));

    setSendingReply(ticketId);

    try {
      const response = await fetch(`${API_URL}/support/admin/tickets/${ticketId}/reply`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi de la réponse');
      }

      // Récupérer la vraie réponse depuis l'API
      const data = await response.json();

      // Remplacer la réponse temporaire par la vraie dans les deux états
      const updateTickets = (prevTickets: Ticket[]) =>
        prevTickets.map((ticket: Ticket) => {
          if (ticket.id === ticketId) {
            const replies = ticket.replies || [];
            const tempIndex = replies.findIndex((r: Reply) => r.id === tempReply.id);
            if (tempIndex !== -1) {
              const newReplies = [...replies];
              newReplies[tempIndex] = data.reply;
              return {
                ...ticket,
                replies: newReplies
              };
            }
          }
          return ticket;
        });

      setUserTickets(updateTickets);
      setModalTickets(updateTickets);
      setCenters(prevCenters =>
        prevCenters.map((center: CenterWithUsers) => ({
          ...center,
          tickets: updateTickets(center.tickets)
        }))
      );

    } catch (error) {
      console.error('Erreur envoi réponse:', error);

      // Retirer la réponse temporaire en cas d'erreur des deux états
      const removeTempReply = (prevTickets: Ticket[]) =>
        prevTickets.map((ticket: Ticket) => {
          if (ticket.id === ticketId) {
            const replies = ticket.replies || [];
            return {
              ...ticket,
              replies: replies.filter((r: Reply) => r.id !== tempReply.id)
            };
          }
          return ticket;
        });

      setUserTickets(removeTempReply);
      setModalTickets(removeTempReply);
      setCenters(prevCenters =>
        prevCenters.map((center: CenterWithUsers) => ({
          ...center,
          tickets: removeTempReply(center.tickets)
        }))
      );

      // Remettre le message dans le champ
      setReplyMessages(prev => ({
        ...prev,
        [ticketId]: message
      }));

      alert('Erreur lors de l\'envoi de la réponse. Veuillez réessayer.');
    } finally {
      setSendingReply(null);
    }
  };

  // Open confirmation modal to close a ticket
  const closeTicket = (ticketId: string) => {
    const found = modalTickets.find(t => t.id === ticketId) || userTickets.find(t => t.id === ticketId) || null;
    setTicketToClose(found);
    setCloseModalOpen(true);
  };

  // Confirm and perform the close action
  const confirmCloseTicket = async () => {
    if (!ticketToClose) return;
    const ticketId = ticketToClose.id;
    setClosingTicketId(ticketId);

    // Fermer immédiatement le ticket dans les deux états (optimiste)
    const closeTicketInState = (prevTickets: Ticket[]) =>
      prevTickets.map((ticket: Ticket) => {
        if (ticket.id === ticketId) {
          return {
            ...ticket,
            status: 'closed' as const
          };
        }
        return ticket;
      });

    setUserTickets(closeTicketInState);
    setModalTickets(closeTicketInState);
    setCenters(prevCenters =>
      prevCenters.map((center: CenterWithUsers) => ({
        ...center,
        tickets: closeTicketInState(center.tickets)
      }))
    );

    try {
      const response = await fetch(`${API_URL}/support/admin/tickets/${ticketId}/close`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la fermeture du ticket');
      }

      // Success: close modal
      setCloseModalOpen(false);
      setTicketToClose(null);
    } catch (error) {
      console.error('Erreur fermeture ticket:', error);

      // En cas d'erreur, rouvrir le ticket dans les deux états
      const reopenTicketInState = (prevTickets: Ticket[]) =>
        prevTickets.map((ticket: Ticket) => {
          if (ticket.id === ticketId) {
            return {
              ...ticket,
              status: 'open' as const
            };
          }
          return ticket;
        });

      setUserTickets(reopenTicketInState);
      setModalTickets(reopenTicketInState);
      setCenters(prevCenters =>
        prevCenters.map((center: CenterWithUsers) => ({
          ...center,
          tickets: reopenTicketInState(center.tickets)
        }))
      );

      setCloseModalOpen(false);
      setTicketToClose(null);
      // keep user informed via a native alert fallback
      alert('Erreur lors de la fermeture du ticket. Veuillez réessayer.');
    } finally {
      setClosingTicketId(null);
    }
  };

  if (!user || user.role !== 'super-admin') {
    return (
      <div className={`min-h-screen bg-[#f4f7fa] p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
          <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès refusé</h1>
            <p className="text-gray-600">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
          </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#f4f7fa] p-2 sm:p-4 ${!isShortLandscape ? 'md:pl-64' : ''} w-full`}>
        <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 w-full">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow-lg flex-shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
              </div>
              <div className="pt-0.5">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0b5566]">Support</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Gestion des tickets de support par centre</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded">{error}</div>
          )}

          {loading && <div className="mb-4 flex items-center gap-2 text-gray-400"><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12a8 8 0 018-8"/></svg>Chargement…</div>}

          {!loading && !error && (
            <>
              {centers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">💬</div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucun ticket en cours</h2>
                  <p className="text-gray-600">Tous les centres sont à jour avec leur support.</p>
                </div>
              ) : (
                <>
                  {/* Mobile: stacked cards */}
                  <div className="md:hidden space-y-4">
                    {centers.map(center => (
                      <div key={center.id} className="bg-white rounded-xl shadow-sm p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#eef9ff] flex items-center justify-center text-[#0b5566] font-semibold">
                              <HiOutlineOfficeBuilding className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-lg font-bold text-gray-900">{center.name}</div>
                              <div className="text-sm text-gray-500">{center.tickets.length} ticket{center.tickets.length > 1 ? 's' : ''}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleCenter(center.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                          >
                            {expandedCenters.has(center.id) ? (
                              <HiOutlineChevronDown className="w-5 h-5 text-gray-500" />
                            ) : (
                              <HiOutlineChevronRight className="w-5 h-5 text-gray-500" />
                            )}
                          </button>
                        </div>

                        {expandedCenters.has(center.id) && (
                          <div className="mt-4 space-y-3">
                            {center.users.map(user => {
                              const userTickets = center.tickets.filter(ticket => ticket.user.id === user.id);
                              const openTickets = userTickets.filter(ticket => ticket.status === 'open');

                              return (
                                <div 
                                  key={user.id} 
                                  className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 active:bg-gray-200 transition-colors"
                                  onClick={() => openUserTickets(user)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium text-gray-900">{user.name}</div>
                                      <div className="text-sm text-gray-600">{user.email}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-lg font-semibold text-gray-900">{userTickets.length}</div>
                                      <div className="text-sm text-gray-500">tickets</div>
                                      {openTickets.length > 0 && (
                                        <div className="text-sm font-medium text-orange-600">{openTickets.length} ouvert{openTickets.length > 1 ? 's' : ''}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop/tablet: expanded layout */}
                  <div className="hidden md:block space-y-6">
                    {centers.map(center => (
                      <div key={center.id} className="bg-white rounded-2xl shadow-sm border border-gray-200">
                        <div
                          className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => toggleCenter(center.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-[#eef9ff] flex items-center justify-center text-[#0b5566] font-semibold">
                                <HiOutlineOfficeBuilding className="w-6 h-6" />
                              </div>
                              <div>
                                <h2 className="text-xl font-semibold text-gray-900">{center.name}</h2>
                                <p className="text-gray-600">{center.address}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <div className="text-2xl font-bold text-[#0b5566]">{center.tickets.length}</div>
                                <div className="text-sm text-gray-500">ticket{center.tickets.length > 1 ? 's' : ''}</div>
                              </div>
                              <div className="text-2xl">
                                {expandedCenters.has(center.id) ? '▼' : '▶'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {expandedCenters.has(center.id) && (
                          <div className="border-t border-gray-200">
                            <div className="px-6 py-4">
                              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                                <HiOutlineUsers className="w-5 h-5" />
                                Utilisateurs avec des tickets ({center.users.length})
                              </h3>

                              {center.users.length === 0 ? (
                                <p className="text-gray-500">Aucun utilisateur trouvé</p>
                              ) : (
                                <div className="space-y-3">
                                  {center.users.map((user) => {
                                    const userTickets = center.tickets.filter(ticket => ticket.user.id === user.id);
                                    const openTickets = userTickets.filter(ticket => ticket.status === 'open');

                                    return (
                                      <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-[#eef9ff] flex items-center justify-center text-[#0b5566] font-semibold text-sm">
                                            {user.name.charAt(0).toUpperCase()}
                                          </div>
                                          <div>
                                            <div className="font-medium text-gray-900">{user.name}</div>
                                            <div className="text-sm text-gray-600">{user.email}</div>
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                          <div className="text-right">
                                            <div className="text-lg font-semibold text-gray-900">{userTickets.length}</div>
                                            <div className="text-sm text-gray-500">total</div>
                                          </div>
                                          {openTickets.length > 0 && (
                                            <div className="text-right">
                                              <div className="text-lg font-semibold text-orange-600">{openTickets.length}</div>
                                              <div className="text-sm text-gray-500">ouvert{openTickets.length > 1 ? 's' : ''}</div>
                                            </div>
                                          )}
                                          <button 
                                            onClick={() => openUserTickets(user)}
                                            className="px-3 py-1 bg-[#0b5566] text-white text-sm rounded hover:bg-[#08323a] transition-colors"
                                          >
                                            Voir tickets
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

      {/* Modal pour afficher les tickets détaillés d'un utilisateur */}
      {showUserTicketsModal && selectedUser && (
        <div key={`modal-${modalKey}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm md:pl-64">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Tickets de {selectedUser.name}</h2>
                <p className="text-gray-600">{selectedUser.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                      if (!selectedUser) return;
                      await refreshUserTickets(selectedUser);
                    }}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                  title="Rafraîchir les tickets"
                >
                  🔄
                </button>
                <button
                  onClick={closeUserTicketsModal}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div ref={modalContainerRef} className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              {modalTickets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun ticket trouvé
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Rendering tickets */}
                  {modalTickets.map((ticket) => {
                    const isExpanded = expandedTicketIds.has(ticket.id);
                    return (
                      <div key={ticket.id} className="border border-gray-200 rounded-lg">
                        <div className="p-4 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-900">{ticket.subject}</h3>
                              <p className="text-sm text-gray-600">
                                Créé le {new Date(ticket.createdAt).toLocaleDateString('fr-FR')} à {new Date(ticket.createdAt).toLocaleTimeString('fr-FR')}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                ticket.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                                ticket.status === 'closed' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {ticket.status === 'open' ? 'Ouvert' : ticket.status === 'closed' ? 'Fermé' : ticket.status}
                              </div>
                              <button
                                onClick={() => {
                                  setExpandedTicketIds(prev => {
                                    const n = new Set(prev);
                                    if (n.has(ticket.id)) n.delete(ticket.id); else n.add(ticket.id);
                                    return n;
                                  });
                                }}
                                aria-label={isExpanded ? 'Cacher la conversation' : 'Afficher la conversation'}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                              >
                                {isExpanded ? '▾' : '▸'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4">
                            <div className="mb-4">
                              <h4 className="font-medium text-gray-900 mb-2">Message initial</h4>
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-gray-700 whitespace-pre-wrap">{ticket.message}</p>
                              </div>
                            </div>

                            {ticket.replies && ticket.replies.length > 0 && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-3">Conversation</h4>
                                <div className="space-y-3">
                                  {ticket.replies.map((reply, idx) => {
                                    const isLast = idx === (ticket.replies || []).length - 1;
                                    return (
                                      <div
                                        key={reply.id}
                                        ref={el => { if (isLast) replyRefs.current[ticket.id] = el; }}
                                        className={`p-3 rounded-lg ${reply.isFromAdmin ? 'bg-green-50 ml-8' : 'bg-gray-50 mr-8'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                          <span className={`text-sm font-medium ${reply.isFromAdmin ? 'text-green-700' : 'text-gray-700'}`}>
                                            {reply.isFromAdmin ? 'Support' : 'Utilisateur'}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {new Date(reply.createdAt).toLocaleDateString('fr-FR')} à {new Date(reply.createdAt).toLocaleTimeString('fr-FR')}
                                          </span>
                                        </div>
                                        <p className="text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {ticket.status === 'open' && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium text-gray-900">Répondre au ticket</h4>
                                  <button
                                    onClick={() => closeTicket(ticket.id)}
                                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                                  >
                                    Fermer le ticket
                                  </button>
                                </div>
                                <div className="space-y-3">
                                  <textarea
                                    value={replyMessages[ticket.id] || ''}
                                    onChange={(e) => handleReplyChange(ticket.id, e.target.value)}
                                    placeholder="Tapez votre réponse..."
                                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#0b5566] focus:border-transparent"
                                    rows={3}
                                  />
                                  <div className="flex justify-end">
                                    <button
                                      onClick={() => sendReply(ticket.id)}
                                      disabled={!replyMessages[ticket.id]?.trim() || sendingReply === ticket.id}
                                      className="px-4 py-2 bg-[#0b5566] text-white rounded-lg hover:bg-[#08323a] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                      {sendingReply === ticket.id ? (
                                        <>
                                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                          Envoi...
                                        </>
                                      ) : (
                                        'Envoyer la réponse'
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {closeModalOpen && ticketToClose && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 md:pl-64">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs flex flex-col items-center relative">
            <button type="button" onClick={() => setCloseModalOpen(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">×</button>
            <h2 className="text-lg font-bold mb-4 text-center text-red-700">Fermer le ticket</h2>
            <p className="text-gray-700 text-center mb-4">Êtes-vous sûr de vouloir fermer le ticket « {ticketToClose.subject} » ?</p>
            <div className="flex gap-2 w-full">
              <button type="button" className="bg-gray-300 px-3 py-1 rounded w-full" onClick={() => { setCloseModalOpen(false); setTicketToClose(null); }}>Annuler</button>
              <button type="button" className="bg-red-500 text-white px-3 py-1 rounded w-full font-bold" onClick={confirmCloseTicket} disabled={closingTicketId === ticketToClose.id}>
                {closingTicketId === ticketToClose.id ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Fermeture...
                  </div>
                ) : 'Fermer le ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}