export default function LandingPage() {
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden bg-white p-0 m-0">
      {/* Header */}
      <header className="w-full bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-2 px-4">
          <div className="flex items-center gap-2">
            <span className="bg-green-100 rounded-full p-1"><span className="text-xl">🧒</span></span>
            <div className="w-full text-center">
              <span className="font-bold text-base text-gray-800">Association les Frimousse</span>
            </div>
          </div>
        
          {/* Boutons cachés sur mobile, visibles sur md+ */}
          <div className="hidden md:flex gap-1">
            <a href="/login" className="border border-gray-300 rounded px-3 py-1 text-gray-700 hover:bg-gray-100 transition text-sm">Connexion</a>
            <a href="/register" className="bg-green-500 text-white rounded px-3 py-1 font-semibold hover:bg-green-600 transition text-sm">Inscription</a>
          </div>
        </div>
      </header>
      {/* Barre d'action mobile sticky en bas */}
      <div className="fixed bottom-0 left-0 w-full flex md:hidden bg-white border-t border-gray-200 z-20">
        <a href="/login" className="flex-1 text-center py-3 border-r border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition">Connexion</a>
        <a href="/register" className="flex-1 text-center py-3 text-white font-medium bg-green-500 hover:bg-green-600 transition">Inscription</a>
      </div>

      {/* Hero Section */}
      <section className="w-full min-h-[60vh] flex flex-col items-center justify-center text-center p-0 m-0">
        <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">Prendre soin des enfants,<br />Accompagner les familles</h1>
        <span className="text-gray-500 mb-4 block text-base sm:text-lg">Familles épanouies, organisation optimale</span>
        <p className="text-base sm:text-lg text-gray-600 mb-6 max-w-full sm:max-w-2xl mx-auto">La gestion de votre association de garde d’enfants simplifiée. Suivi des présences, gestion des plannings, communication avec les familles… tout est centralisé et facile d’accès.</p>
        <div className="flex flex-col sm:flex-row gap-4 mb-2 justify-center items-center w-full">
          <a href="/register" className="bg-green-500 text-white rounded-full px-6 py-3 font-semibold text-base sm:text-lg shadow hover:bg-green-600 transition w-full sm:w-auto">Essayer gratuitement</a>
        </div>
        <div className="flex items-center justify-center mt-8 w-full">
          <div className="bg-white rounded-xl border border-gray-200 shadow p-6 sm:p-12 flex flex-col items-center w-full max-w-xs sm:max-w-none min-h-[120px] sm:min-h-[180px]">
            <span className="text-4xl sm:text-5xl mb-4">👨‍👩‍👧‍👦</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="services" className="w-full py-8 px-3 sm:py-12 sm:px-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">Tout pour gérer votre association sereinement</h2>
        <p className="text-gray-600 mb-8 sm:mb-10 max-w-full sm:max-w-2xl mx-auto text-center text-base sm:text-lg">Gagnez du temps, améliorez la communication et concentrez-vous sur l’essentiel : le bien-être des enfants.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow p-4 sm:p-6 flex flex-col items-center text-center">
            <span className="text-2xl sm:text-3xl mb-2">📅</span>
            <h3 className="font-bold text-base sm:text-lg mb-1">Planning intelligent</h3>
            <p className="text-gray-600 text-xs sm:text-sm">Interface calendrier intuitive pour gérer les présences, suivre les plannings et organiser les activités facilement.</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 sm:p-6 flex flex-col items-center text-center">
            <span className="text-2xl sm:text-3xl mb-2">👶</span>
            <h3 className="font-bold text-base sm:text-lg mb-1">Fiches enfants</h3>
            <p className="text-gray-600 text-xs sm:text-sm">Profils complets avec infos médicales, contacts d’urgence et notes personnalisées pour chaque enfant.</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 sm:p-6 flex flex-col items-center text-center">
            <span className="text-2xl sm:text-3xl mb-2">💛</span>
            <h3 className="font-bold text-base sm:text-lg mb-1">Gestion des intervenants</h3>
            <p className="text-gray-600 text-xs sm:text-sm">Suivi des plannings, qualifications et affectations des professionnels pour une prise en charge optimale.</p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="w-full bg-gradient-to-r from-green-50 to-white py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Notre mission</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">Notre plateforme aide les associations à offrir un accueil professionnel, organisé et bienveillant, pour la sérénité des familles.</p>
          <div className="flex flex-wrap justify-center gap-12 text-center">
            <div>
              <div className="text-3xl font-bold text-green-600">500+</div>
              <div className="text-gray-700 text-sm">Familles accompagnées</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">50+</div>
              <div className="text-gray-700 text-sm">Associations</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">99%</div>
              <div className="text-gray-700 text-sm">Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-gray-900 text-gray-100 py-10 px-6 mt-auto">
        <div className="w-full flex flex-col items-center text-center gap-6">
          <div className="flex flex-col items-center gap-2 mb-2">
            <span className="bg-green-100 rounded-full p-2"><span className="text-2xl">🧒</span></span>
            <span className="font-bold text-lg">Frimousse</span>
            <div className="text-gray-400 text-sm max-w-xs mt-2">Gestion professionnelle et moderne pour les associations. Pensé avec bienveillance pour les enfants et les familles.</div>
          </div>
          <div className="w-full flex flex-col sm:flex-row sm:justify-center sm:items-center gap-8 text-center">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-8 gap-4 w-full justify-center">
              <div>
                <div className="font-semibold mb-2">Liens utiles</div>
                <ul className="text-gray-300 text-sm flex flex-col sm:flex-row sm:gap-4 gap-1 items-center justify-center">
                  <li><a href="#about" className="hover:text-white">À propos</a></li>
                  <li><a href="#services" className="hover:text-white">Fonctionnalités</a></li>
                  <li><a href="#" className="hover:text-white">Tarifs</a></li>
                  <li><a href="#" className="hover:text-white">Support</a></li>
                </ul>
              </div>
              <div className="sm:border-l sm:border-gray-700 sm:pl-8 sm:ml-8 flex flex-col items-center">
                <div className="font-semibold mb-2">Contact</div>
                <div className="text-gray-300 text-sm">contact@frimousse-asso.fr</div>
                <div className="text-gray-300 text-sm">+33 1 23 45 67 89</div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
