/// <reference types="vite/client" />

declare interface ImportMetaEnv {
	readonly VITE_API_URL: string;
	readonly VITE_STRIPE_PUBLISHABLE: string;
	readonly VITE_FRONTEND_URL?: string;
	// Ajoute ici d'autres variables VITE_ si besoin
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
