import SEO from '../components/SEO';
import { useNavigate } from 'react-router-dom';

export default function GuideStartPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-[#f7f4d7] p-0 m-0">
      <SEO
        title={"Guide de démarrage rapide | Frimousse"}
        description={"Premiers pas sur Frimousse : connexion, navigation, ajout d'enfants, gestion du planning, accès aux rapports."}
        url={"https://lesfrimousses.com/guide-demarrage"}
      />
      <header className="w-full bg-gradient-to-r from-[#f7f4d7] to-[#a9ddf2] border-b border-[#fcdcdf] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
              <img src="/imgs/LogoFrimousse.webp" alt="Logo Frimousse" className="w-full h-full object-contain" />
            </div>
            <div className="w-full text-center">
              <span className="font-bold text-base text-[#08323a]">Les Frimousses</span>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full">
        <section className="w-full py-12 px-6 bg-white border-b border-[#fcdcdf]">
          <div className="max-w-3xl mx-auto text-left">
            <button
              onClick={() => navigate(-1)}
              className="mb-8 px-4 py-2 rounded bg-[#0b5566] text-white hover:opacity-95 transition font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] focus:ring-offset-2"
              aria-label="Retour"
            >
              ← Retour
            </button>
            <h1 className="text-3xl font-bold text-[#0b5566] mb-6">Guide de démarrage rapide</h1>
            <ol className="list-decimal list-inside text-[#08323a] space-y-3 mb-6">
              <li><strong>Connexion :</strong> Rendez-vous sur la page d'accueil, cliquez sur "Se connecter" et saisissez vos identifiants fournis par l'association.</li>
              <li><strong>Navigation :</strong> Utilisez le menu pour accéder aux rubriques : Enfants, Planning, Rapports, etc.</li>
              <li><strong>Ajouter une nounou :</strong> Depuis la rubrique "Nounou", cliquez sur "Ajouter" et remplissez le formulaire (nom, âge, expérience, etc.).</li>
              <li><strong>Ajouter un parent :</strong> Depuis la rubrique "Parents", cliquez sur "Ajouter" et remplissez le formulaire (nom, âge, contacts,  etc.).</li>
              <li><strong>Ajouter un enfant :</strong> Depuis la rubrique "Enfants", cliquez sur "Ajouter" et remplissez le formulaire (nom, âge, contacts, allergies, etc.).</li>
              <li><strong>Gérer le planning :</strong> Accédez à "Accueil" pour visualiser et modifier les plannings de garde.</li>
              <li><strong>Consulter un rapport :</strong> Dans "Rapports", filtrez et consultez les rapports d'activité.</li>
              <li><strong>Besoin d’aide ?</strong> Consultez la page Support ou contactez l’équipe Frimousse.</li>
            </ol>
            <div className="mt-8 text-[#08323a] text-sm">Pour plus de détails, consultez les guides spécifiques ou contactez le support via les paramètres de votre compte.</div>
          </div>
        </section>
      </main>
    </div>
  );
}
