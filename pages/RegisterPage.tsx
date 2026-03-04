import React, { useEffect, useState, useRef, useCallback } from "react";
import OAuthButtons from '../components/OAuthButtons';

const API_URL = import.meta.env.VITE_API_URL || "";

type FormType = {
  email: string;
  password: string;
  name: string;
  role: string;
  centerName: string;
  address: string;
  city: string;
  postalCode: string;
  region: string;
  country: string;
};

type Country = { name: string; cca2?: string; cca3?: string; region?: string };

// Geodata place shape returned by our backend proxy (/api/geodata/positionstack)
type GeodataPlace = {
  id?: string | number;
  name?: string; // human readable label
  lat?: number | null;
  lon?: number | null;
  // mapped fields from PositionStack proxy
  street?: string | null;
  house_number?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postcode?: string | null;
  raw?: unknown;
};

export default function RegisterPage() {
  // helper: safely extract country_code from unknown raw payload
  const getRawCountryCode = (raw: unknown): string | null => {
    if (!raw || typeof raw !== 'object') return null;
    try {
      const r = raw as Record<string, unknown>;
      const cc = r['country_code'] || r['country_code'.toString()];
      if (!cc) return null;
      return String(cc).toUpperCase();
    } catch (e) {
      console.error('getRawCountryCode error', e);
      return null;
    }
  };

  const [form, setForm] = useState<FormType>({
    email: "",
    password: "",
    name: "",
    role: "admin",
    centerName: "",
    address: "",
    city: "",
    postalCode: "",
    region: "",
    country: "",
  });

  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // data sources & suggestions
  const [countries, setCountries] = useState<Country[]>([]);
  const [countrySuggestions, setCountrySuggestions] = useState<
    Array<{ name: string }>
  >([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(
    null
  );

  const [regionSuggestions, setRegionSuggestions] = useState<string[]>([]);
  const [placeSuggestions, setPlaceSuggestions] = useState<GeodataPlace[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<GeodataPlace[]>([]);

  const [openCountry, setOpenCountry] = useState(false);
  const [openRegion, setOpenRegion] = useState(false);
  const [openCity, setOpenCity] = useState(false);
  const [openAddress, setOpenAddress] = useState(false);

  
  const searchTimer = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const updateForm = (patch: Partial<FormType>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const applyAndFocus = (name: keyof FormType, value: string) => {
    updateForm({ [name]: value } as Partial<FormType>);
    setTimeout(() => {
      try {
        const el = document.querySelector(
          `input[name="${name}"]`
        ) as HTMLInputElement | null;
        if (el) {
          el.focus();
          const len = el.value ? el.value.length : 0;
          el.setSelectionRange(len, len);
        }
      } catch (err) {
        console.error('applyAndFocus error:', err);
      }
    }, 0);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (e.target.name === "role") return;
    const name = e.target.name as keyof FormType;
    const value = e.target.value;
    updateForm({ [name]: value });
    console.debug('[geodata] handleChange', name, value);

    if (name === "country") { setOpenCountry(true); console.debug('[geodata] openCountry'); }
    if (name === "region") { setOpenRegion(true); console.debug('[geodata] openRegion'); }
    if (name === "city") { setOpenCity(true); console.debug('[geodata] openCity'); }
    if (name === "address") { setOpenAddress(true); console.debug('[geodata] openAddress'); }
    // If the user changes another input while no country is known, clear the postalCode field
    try {
      const countryEmpty = !selectedCountryCode && !(form.country && String(form.country).trim());
      if (name !== 'postalCode' && name !== 'country' && countryEmpty && form.postalCode) {
        // clear postal code because we can't validate it without a country
        updateForm({ postalCode: '' });
      }
    } catch (err) {
      console.error('handleChange postalCode clear error', err);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/geodata/countries");
        if (!res.ok) return;
        const data = (await res.json()) as Country[];
        setCountries(data || []);
      } catch (err) {
        console.error("Failed to load countries", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!form.country) {
      setCountrySuggestions([]);
      setSelectedCountryCode(null);
      return;
    }
    const q = form.country.toLowerCase();
    const matches = countries
      .filter((c) => c.name && c.name.toLowerCase().includes(q))
      .slice(0, 8)
      .map((c) => ({ name: c.name }));
    setCountrySuggestions(matches);

    const exact =
      countries.find((c) => c.name === form.country) ||
      countries.find((c) => c.name && c.name.toLowerCase() === q);
    if (exact && exact.cca2) {
      setSelectedCountryCode(String(exact.cca2).toUpperCase());
    } else {
      const matching = countries.filter(
        (c) => c.name && c.name.toLowerCase().includes(q)
      );
      if (matching.length === 1 && matching[0].cca2) {
        setSelectedCountryCode(String(matching[0].cca2).toUpperCase());
      } else {
        const starts = countries.find(
          (c) => c.name && c.name.toLowerCase().startsWith(q)
        );
        setSelectedCountryCode(
          starts && starts.cca2 ? String(starts.cca2).toUpperCase() : null
        );
      }
    }
  }, [form.country, countries]);

  const fetchGeodata = useCallback(
    async (query: string) => {
      console.error('[geodata] fetchGeodata query=', query);
      if (!query || query.length < 2) {
        setPlaceSuggestions([]);
        setCitySuggestions([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/geodata/positionstack?q=${encodeURIComponent(query)}&limit=12`
        );
        console.error('[geodata] backend status', res.status);
        if (!res.ok) {
          setPlaceSuggestions([]);
          setCitySuggestions([]);
          return;
        }
        const data = (await res.json()) as GeodataPlace[];
        console.error('[geodata] backend returned', Array.isArray(data) ? data.length : typeof data);
        const arr = data || [];
        // split results: city-like entries (city present, no street) vs address entries
        const cities = arr.filter((p) => {
          const hasCity = !!(p.city || p.name && !p.street && !p.house_number);
          const isAddress = !!(p.house_number || p.street);
          return hasCity && !isAddress;
        });
        const addresses = arr.filter((p) => !!(p.house_number || p.street));
        setCitySuggestions(cities);
        setPlaceSuggestions(addresses);
      } catch (err) {
        console.error("geodata fetch error", err);
        setPlaceSuggestions([]);
        setCitySuggestions([]);
      }
    },
    []
  );

  useEffect(() => {
    const q = (form.address || form.city || "").trim();
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      const bias = form.city ? ` ${form.city}` : "";
      fetchGeodata(`${q}${bias}`.trim());
    }, 1000);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [form.address, form.city, fetchGeodata]);

  useEffect(() => {
    const q = (form.region || "").trim();
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(async () => {
      console.error('[geodata] region lookup q=', q);
      if (!q || q.length < 2) return setRegionSuggestions([]);
      try {
        const res = await fetch(
          `/api/geodata/positionstack?q=${encodeURIComponent(q)}&limit=40`
        );
        if (!res.ok) return setRegionSuggestions([]);
        const data = (await res.json()) as GeodataPlace[];
        const seen = new Set<string>();
        const arr: string[] = [];
        const wantCountry = selectedCountryCode
          ? selectedCountryCode.toUpperCase()
          : null;
        for (const p of data || []) {
          const state = p.state || null;
          const countryCode = getRawCountryCode(p.raw);
          if (!state) continue;
          if (wantCountry && countryCode && countryCode !== wantCountry) continue;
          const s = String(state);
          if (!seen.has(s)) {
            seen.add(s);
            arr.push(s);
            if (arr.length >= 8) break;
          }
        }
        setRegionSuggestions(arr);
      } catch (err) {
        console.error("region geodata error", err);
        setRegionSuggestions([]);
      }
    }, 1000);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [form.region, selectedCountryCode]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpenCountry(false);
        setOpenRegion(false);
        setOpenCity(false);
        setOpenAddress(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const [initialPlan, setInitialPlan] = useState<
    "decouverte" | "essentiel" | "pro"
  >("decouverte");
  const [initLoading, setInitLoading] = useState(false);
  const [completeLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (form.password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    try {
      if (initialPlan === "decouverte") {
        setInitLoading(true);
        const regRes = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...form, plan: initialPlan }),
        });
        const regData = await regRes.json().catch(() => ({}));
        if (!regRes.ok)
          throw new Error(
            regData?.message || regData?.error || "Erreur lors de l'inscription"
          );

        // Redirect to email verification page
        if (regData.requiresVerification) {
          // verification code has already been sent by the backend
          window.location.href = `/verify-email?email=${encodeURIComponent(regData.email)}`;
          return;
        }

        const loginRes = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: form.email, password: form.password }),
        });

        if (loginRes.status === 402) {
          const loginData = await loginRes.json().catch(() => ({}));
          setUpgradeMessage(
            loginData?.error || "Votre compte nécessite un abonnement pour continuer."
          );
          setShowUpgradeModal(true);
          setInitLoading(false);
          return;
        }
        
        // Handle email not verified on login
        if (loginRes.status === 403) {
          const loginData = await loginRes.json().catch(() => ({}));
          if (loginData.error === 'email_not_verified') {
            window.location.href = `/verify-email?email=${encodeURIComponent(form.email)}`;
            return;
          }
        }

        const loginData = await loginRes.json().catch(() => ({}));
        if (!loginRes.ok)
          throw new Error(
            loginData?.message || loginData?.error || "Erreur lors de la connexion"
          );

        window.location.href = "/";
        return;
      }

      setInitLoading(true);
      const res = await fetch(`${API_URL}/auth/register-subscribe/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, plan: initialPlan }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Erreur lors de l’inscription");
      }
      const endpoint = "/api/subscriptions/create-checkout-with-token";
      const body: { plan: string; mode: "direct" | "discovery"; selectedPlan?: string; subscribeToken?: string } = { plan: initialPlan, mode: "direct", subscribeToken: data.subscribeToken };
      const res2 = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data2 = await res2.json().catch(() => ({}));
      if (!res2.ok || !data2.url) throw new Error(data2.error || "Impossible de créer la session de paiement");
      window.location.href = data2.url;
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message || "Erreur lors de l’inscription"); else setError("Erreur lors de l’inscription");
      setInitLoading(false);
    } finally {
      setInitLoading(false);
    }
  };

  // Password validation rules (live)
  const uppercaseRe = /[A-ZÀ-ÖØ-Ý]/; // include accented uppercase letters
  const digitRe = /\d/;
  const specialRe = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;
  const minLength = 8;
  const hasUpper = uppercaseRe.test(form.password || '');
  const hasDigit = digitRe.test(form.password || '');
  const hasSpecial = specialRe.test(form.password || '');
  const hasLength = (form.password || '').length >= minLength;
  const passwordValid = hasUpper && hasDigit && hasSpecial && hasLength;

  const selectCountry = (name: string) => {
    updateForm({ country: name });
    const found = countries.find((c) => c.name === name || (c.name && c.name.toLowerCase() === name.toLowerCase()));
    setSelectedCountryCode(found && found.cca2 ? String(found.cca2).toUpperCase() : null);
    setCountrySuggestions([]);
    setOpenCountry(false);
    applyAndFocus("region", "");
  };

  // Postal code validation per country (common cases)
  // Resolve country code once: either selectedCountryCode or exact match from loaded countries
  const resolvedFromList = countries.find(
    (c) => c.name === form.country || (c.name && c.name.toLowerCase() === (form.country || '').toLowerCase())
  );
  const resolvedCountryCode = selectedCountryCode || (resolvedFromList && resolvedFromList.cca2 ? String(resolvedFromList.cca2).toUpperCase() : null);

  const postalCodeIsValid = (() => {
    const pc = (form.postalCode || '').trim();
    if (!pc) return false;

    if (!resolvedCountryCode) {
      // if we can't determine a country code yet, do not validate (require user to pick a country first)
      return false;
    }

    const c = String(resolvedCountryCode).toUpperCase();
    // common country regexes
    const rules: Record<string, RegExp> = {
      'FR': /^\d{5}$/, // France
      'US': /^\d{5}(-\d{4})?$/, // USA
      'GB': /^[A-Z]{1,2}\d[A-Z\d]? \d[ABD-HJLNP-UW-Z]{2}$/i, // UK (loose)
      'DE': /^\d{5}$/, // Germany
      'ES': /^\d{5}$/, // Spain
      'IT': /^\d{5}$/, // Italy
      'BE': /^\d{4}$/, // Belgium
      'NL': /^\d{4}\s?[A-Z]{2}$/i, // Netherlands
    };
  if (c && rules[c]) return rules[c].test(pc);
    // fallback: allow 3-10 alphanumeric and spaces/hyphens
    return /^[A-Z0-9 -]{3,10}$/i.test(pc);
  })();

  const selectRegion = (r: string) => {
    updateForm({ region: r });
    setRegionSuggestions([]);
    setOpenRegion(false);
    applyAndFocus("city", "");
  };

  const selectPlace = (p: GeodataPlace) => {
    const house = p.house_number ? String(p.house_number).trim() : "";
    const road = p.street ? String(p.street).trim() : "";
    const streetPart = (house ? `${house} ${road}`.trim() : (road || ""));
    const displayStreet = streetPart || p.name || "";
    const userTyped = String(form.address || '').trim();
    let composed = displayStreet;
    if (!house) {
      const m = userTyped.match(/^(\d+)\s+(.+)$/);
      if (m && m[1]) {
        const typedNum = m[1];
        if (!displayStreet.startsWith(typedNum + ' ')) {
          composed = `${typedNum} ${displayStreet}`.trim();
        }
      }
    }

    updateForm({
      address: composed,
      city: p.city || "",
      postalCode: p.postcode || "",
      region: p.state || "",
      country: p.country || "",
    });
    (async () => {
      try {
        if (!p.postcode || !p.city || !p.house_number) {
          const q = encodeURIComponent(p.name || displayStreet || "");
          if (!q) return;
          const res = await fetch(`/api/geodata/positionstack?q=${q}&limit=1`);
          if (!res.ok) return;
          const more = (await res.json()) as GeodataPlace[];
          if (!more || more.length === 0) return;
          const m = more[0];
          const city2 = m.city || "";
          const postcode2 = m.postcode || "";
          const region2 = m.state || "";
          const country2 = m.country || "";
          const house2 = m.house_number || "";
          const road2 = m.street || "";
          const patch: Partial<FormType> = {};
          if (!p.city && city2) patch.city = city2;
          if (!p.postcode && postcode2) patch.postalCode = postcode2;
          if (!p.state && region2) patch.region = region2;
          if (!p.country && country2) patch.country = country2;
          if (!house && house2) {
            const primaryRoad = road || road2 || m.name || '';
            patch.address = `${house2} ${primaryRoad}`.trim();
          }
          if (Object.keys(patch).length > 0) updateForm(patch);
        }
      } catch (err) {
        console.error('selectPlace followup lookup error', err);
      }
    })();
    setPlaceSuggestions([]);
    setOpenAddress(false);
    setTimeout(() => {
      try {
        const el = document.querySelector(`input[name="postalCode"]`) as HTMLInputElement | null;
        if (el) {
          el.focus();
          const len = el.value ? el.value.length : 0;
          el.setSelectionRange(len, len);
        }
      } catch (err) {
        console.error('focus postalCode error', err);
      }
    }, 0);
  };

  // ensure all required fields are filled before allowing submit
  const requiredFields: Array<keyof FormType> = [
    'name', 'email', 'centerName', 'address', 'city', 'postalCode', 'region', 'country', 'password'
  ];
  const allFieldsFilled = requiredFields.every((k) => {
    const v = (form as unknown as Record<string, unknown>)[k as string];
    return v !== undefined && v !== null && String(v).trim().length > 0;
  }) && confirmPassword.trim().length > 0;

  return (
    <div ref={containerRef} className="min-h-dvh w-full bg-white md:flex md:flex-row">
      {/* Desktop left branding panel — sticky */}
      <div className="hidden md:flex md:w-[38%] lg:w-[35%] xl:w-[30%] bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 flex-col items-center justify-center p-10 relative overflow-hidden md:sticky md:top-0 md:h-screen md:flex-shrink-0">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/5 rounded-full" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute top-1/3 right-10 w-28 h-28 bg-white/10 rounded-full" />
        
        <img src="/imgs/LogoFrimousse.webp" alt="Logo Frimousse" className="w-24 h-24 object-contain drop-shadow-lg mb-8 relative z-10" />
        <h1 className="text-3xl lg:text-4xl font-extrabold text-white text-center tracking-tight leading-tight relative z-10">
          Bienvenue sur<br />Frimousse
        </h1>
        <p className="mt-4 text-brand-100 text-center text-base lg:text-lg max-w-xs leading-relaxed relative z-10">
          La plateforme de gestion pour les assistantes maternelles et crèches.
        </p>
        <div className="mt-10 flex flex-col gap-4 relative z-10">
          <div className="flex items-center gap-3 text-white/90">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>
            <span className="text-sm font-medium">Planning & suivi en temps réel</span>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>
            <span className="text-sm font-medium">Rapports & exports automatiques</span>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>
            <span className="text-sm font-medium">Communication parents simplifiée</span>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 px-4 sm:px-6 md:px-10 lg:px-16 py-6 md:py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">

        {/* Mobile header */}
        <div className="flex flex-col items-center md:items-start mb-6">
          <div className="w-16 h-16 mb-3 md:hidden">
            <img src="/imgs/LogoFrimousse.webp" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Créer un compte</h2>
          <p className="mt-1 text-gray-500 text-sm">Rejoignez Frimousse en quelques minutes</p>
        </div>

        <OAuthButtons mode="register" />

        <div className="flex items-center w-full my-6">
          <div className="flex-1 border-t border-gray-400" />
          <span className="px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">ou par email</span>
          <div className="flex-1 border-t border-gray-400" />
        </div>

        {error && <div className="mb-5 text-red-600 text-sm text-center bg-red-50 rounded-xl px-4 py-3">{error}</div>}
        {success && <div className="mb-5 text-brand-600 text-sm text-center bg-brand-50 rounded-xl px-4 py-3">Inscription réussie. Redirection…</div>}

        {/* ── Section 1 : Identité ── */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0"/></svg>
          </div>
          <h3 className="text-sm font-bold text-gray-800">Identité</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Nom complet <span className="text-red-500">*</span></label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Jean Dupont" required className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Email <span className="text-red-500">*</span></label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="jean@exemple.fr" required className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all" />
          </div>
        </div>

        {/* ── Section 2 : Structure ── */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21"/></svg>
          </div>
          <h3 className="text-sm font-bold text-gray-800">Votre structure</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Société / Crèche <span className="text-red-500">*</span></label>
            <input name="centerName" value={form.centerName} onChange={handleChange} placeholder="Nom de la crèche ou société" className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Adresse <span className="text-red-500">*</span></label>
            <div className="relative">
              <input name="address" value={form.address} onChange={handleChange} placeholder="123 rue de la Paix" className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all" />
              {openAddress && placeSuggestions.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 bg-white border border-gray-400 mt-1 max-h-56 overflow-auto rounded-xl shadow-lg">
                  {placeSuggestions.map((p, idx) => {
                    const summary = [p.house_number && `${p.house_number} ${p.street}`, p.street || p.name, p.postcode, p.state, p.country].filter(Boolean).join(', ');
                    const label = p.name || (p.house_number ? `${p.house_number} ${p.street}` : p.street || '');
                    return (
                      <li key={idx} role="button" tabIndex={0} onClick={() => { selectPlace(p); }} className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors">
                        <div className="text-sm font-medium text-gray-800">{label}</div>
                        <div className="text-xs text-gray-400">{summary}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Pays <span className="text-red-500">*</span></label>
            <div className="relative">
              <input name="country" value={form.country} onChange={handleChange} placeholder="France" autoComplete="off" className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all" />
              {openCountry && countrySuggestions.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 bg-white border border-gray-400 mt-1 max-h-44 overflow-auto rounded-xl shadow-lg">
                  {countrySuggestions.map((c, idx) => (
                    <li key={idx} role="button" tabIndex={0} onClick={() => selectCountry(c.name)} className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors text-sm">{c.name}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Région <span className="text-red-500">*</span></label>
            <div className="relative">
              <input name="region" value={form.region} onChange={handleChange} placeholder="Île-de-France" autoComplete="off" className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all" />
              {openRegion && regionSuggestions.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 bg-white border border-gray-400 mt-1 max-h-44 overflow-auto rounded-xl shadow-lg">
                  {regionSuggestions.map((r, idx) => (
                    <li key={idx} role="button" tabIndex={0} onClick={() => selectRegion(r)} className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors text-sm">{r}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Ville <span className="text-red-500">*</span></label>
            <div className="relative">
              <input name="city" value={form.city} onChange={handleChange} placeholder="Paris" autoComplete="off" className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all" />
              {openCity && citySuggestions.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 bg-white border border-gray-400 mt-1 max-h-56 overflow-auto rounded-xl shadow-lg">
                  {citySuggestions.map((p, idx) => {
                    const display = p.city || p.name || '';
                    const summary = [p.postcode, p.state, p.country].filter(Boolean).join(', ');
                    return (
                      <li key={idx} role="button" tabIndex={0} onClick={() => {
                        const patch: Partial<FormType> = { city: display };
                        if (p.postcode) patch.postalCode = String(p.postcode);
                        if (p.state) patch.region = String(p.state);
                        if (p.country) patch.country = String(p.country);
                        updateForm(patch);
                        setCitySuggestions([]);
                        setOpenCity(false);
                        applyAndFocus('address', '');
                      }} className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors">
                        <div className="text-sm font-medium text-gray-800">{display}</div>
                        <div className="text-xs text-gray-400">{summary}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Code postal <span className="text-red-500">*</span></label>
            <input name="postalCode" value={form.postalCode} onChange={handleChange} placeholder="75001" onBlur={() => {
              try {
                if (!resolvedCountryCode) { updateForm({ postalCode: '' }); }
              } catch (err) { console.error('postalCode onBlur error', err); }
            }} className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all" />
            <div className="text-xs mt-1.5">
              {form.postalCode ? (
                resolvedCountryCode ? (
                  postalCodeIsValid ? (
                    <span className="text-green-600">✓ Code postal valide</span>
                  ) : (
                    <span className="text-red-500">✕ Code postal invalide pour le pays sélectionné</span>
                  )
                ) : (
                  <span className="text-gray-400">Sélectionnez d'abord le pays</span>
                )
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Section 3 : Sécurité ── */}
        <div className="flex items-center gap-2.5 mb-4 mt-6">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/></svg>
          </div>
          <h3 className="text-sm font-bold text-gray-800">Sécurité</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Mot de passe <span className="text-red-500">*</span></label>
            <div className="relative">
              <input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="••••••••" required className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all pr-10" />
              <button type="button" tabIndex={-1} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 text-base focus:outline-none transition-colors" onClick={() => setShowPassword(v => !v)}>{showPassword ? '🙈' : '👁️'}</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Confirmer <span className="text-red-500">*</span></label>
            <div className="relative">
              <input name="confirmPassword" type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required className="w-full bg-gray-50 border border-gray-400 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-500 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all pr-10" />
              <button type="button" tabIndex={-1} aria-label={showConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 text-base focus:outline-none transition-colors" onClick={() => setShowConfirm(v => !v)}>{showConfirm ? '🙈' : '👁️'}</button>
            </div>
          </div>
        </div>
        {/* Password strength chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${hasUpper ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
            {hasUpper ? '✓' : '○'} Majuscule
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${hasDigit ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
            {hasDigit ? '✓' : '○'} Chiffre
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${hasSpecial ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
            {hasSpecial ? '✓' : '○'} Spécial
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${hasLength ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
            {hasLength ? '✓' : '○'} {minLength}+ caractères
          </span>
        </div>

        {/* ── Section 4 : Offre ── */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"/></svg>
          </div>
          <h3 className="text-sm font-bold text-gray-800">Choisir une offre</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <button type="button" onClick={() => setInitialPlan('decouverte')} className={`group p-5 rounded-2xl border-2 focus:outline-none flex flex-col items-center text-center transition-all ${initialPlan === 'decouverte' ? 'border-brand-500 bg-brand-50/60 shadow-md ring-1 ring-brand-200 scale-[1.02]' : 'border-gray-400 bg-gray-50/40 hover:bg-white hover:shadow-sm hover:border-gray-500'}`}>
            <div className="text-base font-extrabold text-brand-600 tracking-tight">Découverte</div>
            <div className="text-[11px] font-medium text-gray-400 mt-0.5">Essai 15 jours</div>
            <div className="mt-2 text-xs text-gray-500 leading-relaxed">Tester Frimousse sans engagement</div>
            <div className="mt-auto pt-3 text-2xl font-black text-brand-500">0€</div>
          </button>
          <button type="button" onClick={() => setInitialPlan('essentiel')} className={`group p-5 rounded-2xl border-2 focus:outline-none flex flex-col items-center text-center transition-all ${initialPlan === 'essentiel' ? 'border-brand-500 bg-brand-50/60 shadow-md ring-1 ring-brand-200 scale-[1.02]' : 'border-gray-400 bg-gray-50/40 hover:bg-white hover:shadow-sm hover:border-gray-500'}`}>
            <div className="text-base font-extrabold text-brand-600 tracking-tight">Essentiel</div>
            <div className="text-[11px] font-medium text-gray-400 mt-0.5">Petites structures</div>
            <div className="mt-2 text-xs text-gray-500 leading-relaxed">10 enfants, exports, notifications</div>
            <div className="mt-auto pt-3 text-2xl font-black text-brand-500">29,99€ <span className="text-xs font-normal text-gray-400">/ mois</span></div>
          </button>
          <button type="button" onClick={() => setInitialPlan('pro')} className={`group p-5 rounded-2xl border-2 focus:outline-none flex flex-col items-center text-center transition-all ${initialPlan === 'pro' ? 'border-brand-500 bg-brand-50/60 shadow-md ring-1 ring-brand-200 scale-[1.02]' : 'border-gray-400 bg-gray-50/40 hover:bg-white hover:shadow-sm hover:border-gray-500'}`}>
            <div className="text-base font-extrabold text-brand-600 tracking-tight">Pro</div>
            <div className="text-[11px] font-medium text-gray-400 mt-0.5">Structures avancées</div>
            <div className="mt-2 text-xs text-gray-500 leading-relaxed">Illimité, Assistant IA</div>
            <div className="mt-auto pt-3 text-2xl font-black text-brand-500">59,99€ <span className="text-xs font-normal text-gray-400">/ mois</span></div>
          </button>
        </div>

        {(initialPlan === 'essentiel' || initialPlan === 'pro') && (
          <div className="w-full mb-4">
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              Les abonnements payants ne sont pas encore disponibles — essayez la version gratuite sans engagement.
            </div>
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={initLoading || completeLoading || initialPlan !== 'decouverte' || !passwordValid || !postalCodeIsValid || !allFieldsFilled} title={initialPlan !== 'decouverte' ? 'Les abonnements payants ne sont pas encore disponibles. Contactez-nous pour plus d\'informations.' : (!allFieldsFilled ? 'Remplissez tous les champs obligatoires.' : (!passwordValid ? 'Le mot de passe ne respecte pas les règles requises.' : (!postalCodeIsValid ? 'Le code postal est invalide.' : undefined)))} aria-disabled={initialPlan !== 'decouverte' ? 'true' : (!passwordValid || !postalCodeIsValid || !allFieldsFilled ? 'true' : 'false')} className={`w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-brand-200 mt-2 ${initLoading || completeLoading || initialPlan !== 'decouverte' || !passwordValid || !postalCodeIsValid || !allFieldsFilled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-brand-500 text-white hover:bg-brand-600 active:scale-[0.98] shadow-sm hover:shadow-md'}`}>
          {initLoading || completeLoading ? 'Patientez…' : (initialPlan === 'decouverte' ? 'Créer mon compte' : 'Créer mon compte et payer')}
        </button>
        {!passwordValid && form.password.length > 0 && <div className="text-xs text-red-500 mt-2 text-center">Le mot de passe ne respecte pas toutes les règles ci-dessus.</div>}

        <p className="mt-5 text-center text-sm text-gray-400">Déjà un compte ? <a href="/login" className="text-brand-500 font-semibold hover:underline">Se connecter</a></p>

      </form>
      </div>

      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-brand-500 mb-2">Abonnement requis</h3>
            <p className="text-sm text-gray-700 mb-4">{upgradeMessage || 'Cette action nécessite un abonnement. Passez à un plan supérieur pour continuer.'}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { window.location.href = '/pricing'; }} className="px-4 py-2 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition">Aller aux offres</button>
              <button onClick={() => setShowUpgradeModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
