import React, { useEffect, useState, useRef, useCallback } from "react";

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
      console.debug('[geodata] fetchGeodata query=', query);
      if (!query || query.length < 2) {
        setPlaceSuggestions([]);
        setCitySuggestions([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/geodata/positionstack?q=${encodeURIComponent(query)}&limit=12`
        );
        console.debug('[geodata] backend status', res.status);
        if (!res.ok) {
          setPlaceSuggestions([]);
          setCitySuggestions([]);
          return;
        }
        const data = (await res.json()) as GeodataPlace[];
        console.debug('[geodata] backend returned', Array.isArray(data) ? data.length : typeof data);
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
      console.debug('[geodata] region lookup q=', q);
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

  const selectCountry = (name: string) => {
    updateForm({ country: name });
    const found = countries.find((c) => c.name === name || (c.name && c.name.toLowerCase() === name.toLowerCase()));
    setSelectedCountryCode(found && found.cca2 ? String(found.cca2).toUpperCase() : null);
    setCountrySuggestions([]);
    setOpenCountry(false);
    applyAndFocus("region", "");
  };

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

  return (
    <div ref={containerRef} className="h-screen flex items-center justify-center bg-gradient-to-r from-[#f7f4d7] to-[#a9ddf2] overflow-hidden">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-xl md:max-w-2xl flex flex-col items-center max-h-[95vh] overflow-auto">
        <div className="w-20 h-20 mb-4">
          <img src="/imgs/LogoFrimousse.webp" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-[#0b5566] text-center">Inscription</h2>
        <p className="mb-6 text-[#08323a] text-center">Créez votre compte Frimousse</p>
        {error && <div className="mb-4 text-red-600 w-full text-center">{error}</div>}
        {success && <div className="mb-4 text-[#0b5566] w-full text-center">Inscription réussie. Redirection…</div>}

        <label className="block mb-3 w-full text-left font-medium text-[#08323a]">Nom
          <input name="name" value={form.name} onChange={handleChange} placeholder="Nom et prénom" required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
        </label>

        <label className="block mb-3 w-full text-left font-medium text-[#08323a]">Email
          <input name="email" type="email" value={form.email} onChange={handleChange}placeholder="Email" required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
        </label>

        <label className="block mb-3 w-full text-left font-medium text-[#08323a]">Société / Crèche
          <input name="centerName" value={form.centerName} onChange={handleChange} placeholder="Nom de la crèche ou société" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
        </label>
        

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full mb-3">
           <label className="block text-left font-medium text-[#08323a]">Adresse
            <div className="relative">
              <input name="address" value={form.address} onChange={handleChange} placeholder="Adresse " className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
              {openAddress && placeSuggestions.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 bg-white border mt-1 max-h-56 overflow-auto rounded shadow">
                      {placeSuggestions.map((p, idx) => {
                    const summary = [p.house_number && `${p.house_number} ${p.street}`, p.street || p.name, p.postcode, p.state, p.country].filter(Boolean).join(', ');
                    const label = p.name || (p.house_number ? `${p.house_number} ${p.street}` : p.street || '');
                    return (
                      <li key={idx} role="button" tabIndex={0} onClick={() => { selectPlace(p); }} className="px-3 py-2 hover:bg-gray-100 cursor-pointer">
                        <div className="text-sm font-medium">{label}</div>
                        <div className="text-xs text-gray-500">{summary}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </label>
          <label className="block text-left font-medium text-[#08323a]">Pays
            <div className="relative">
              <input name="country" value={form.country} onChange={handleChange} placeholder="Pays" autoComplete="off" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
              {openCountry && countrySuggestions.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 bg-white border mt-1 max-h-44 overflow-auto rounded shadow">
                  {countrySuggestions.map((c, idx) => (
                    <li key={idx} role="button" tabIndex={0} onClick={() => selectCountry(c.name)} className="px-3 py-2 hover:bg-gray-100 cursor-pointer">{c.name}</li>
                  ))}
                </ul>
              )}
            </div>
          </label>

          <label className="block text-left font-medium text-[#08323a]">Région
            <div className="relative">
              <input name="region" value={form.region} onChange={handleChange} placeholder="Région / Département" autoComplete="off" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
              {openRegion && regionSuggestions.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 bg-white border mt-1 max-h-44 overflow-auto rounded shadow">
                  {regionSuggestions.map((r, idx) => (
                    <li key={idx} role="button" tabIndex={0} onClick={() => selectRegion(r)} className="px-3 py-2 hover:bg-gray-100 cursor-pointer">{r}</li>
                  ))}
                </ul>
              )}
            </div>
          </label>

         
          <label className="block text-left font-medium text-[#08323a]">Ville 
            <div className="relative">
              <input name="city" value={form.city} onChange={handleChange} placeholder="Ville" autoComplete="off" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
              {openCity && citySuggestions.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 bg-white border mt-1 max-h-56 overflow-auto rounded shadow">
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
                      }} className="px-3 py-2 hover:bg-gray-100 cursor-pointer">
                        <div className="text-sm font-medium">{display}</div>
                        <div className="text-xs text-gray-500">{summary}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mb-3">
          <label className="block text-left font-medium text-[#08323a]">Code postal
            <input name="postalCode" value={form.postalCode} onChange={handleChange} placeholder="Code postal" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]" />
          </label>
         
        </div>

        <label className="block mb-3 w-full text-left font-medium text-gray-700">Mot de passe
          <div className="relative">
            <input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="Mot de passe" required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] pr-10" />
            <button type="button" tabIndex={-1} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0b5566] text-lg focus:outline-none" onClick={() => setShowPassword(v => !v)}>{showPassword ? '🙈' : '👁️'}</button>
          </div>
        </label>

        <label className="block mb-3 w-full text-left font-medium text-gray-700">Confirmer le mot de passe
          <div className="relative">
            <input name="confirmPassword" type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmer le mot de passe" required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] pr-10" />
            <button type="button" tabIndex={-1} aria-label={showConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0b5566] text-lg focus:outline-none" onClick={() => setShowConfirm(v => !v)}>{showConfirm ? '🙈' : '👁️'}</button>
          </div>
        </label>

        <div className="w-full mb-4 mt-6">
          <label className="block mb-2 font-medium text-[#08323a]">Offres</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button type="button" onClick={() => setInitialPlan('decouverte')} className={`p-3 rounded-lg border text-sm focus:outline-none flex flex-col items-center text-center min-h-[140px] ${initialPlan === 'decouverte' ? 'border-[#0b5566] bg-[#f7f4d7]' : 'border-gray-200 bg-white hover:shadow-sm'}`}>
              <div><div className="font-semibold text-[#0b5566]">Découverte</div><div className="text-xs text-gray-600">Essai 15 jours</div></div>
              <div className="mt-3 text-xs text-gray-600">Tester Frimousse sans engagement</div>
              <div className="mt-auto text-base font-bold text-[#0b5566]">0€</div>
            </button>

            <button type="button" onClick={() => setInitialPlan('essentiel')} className={`p-3 rounded-lg border text-sm focus:outline-none flex flex-col items-center text-center min-h-[140px] ${initialPlan === 'essentiel' ? 'border-[#0b5566] bg-white shadow' : 'border-gray-200 bg-white hover:shadow-sm'}`}>
              <div><div className="font-semibold text-[#0b5566]">Essentiel</div><div className="text-xs text-gray-600">Pour petites structures</div></div>
              <div className="mt-3 text-xs text-gray-600">Jusqu’à 10 enfants, exports et notifications</div>
              <div className="mt-auto text-base font-bold text-[#0b5566]">29,99€ <span className="text-xs text-gray-500">/ mois</span></div>
            </button>

            <button type="button" onClick={() => setInitialPlan('pro')} className={`p-3 rounded-lg border text-sm focus:outline-none flex flex-col items-center text-center min-h-[140px] ${initialPlan === 'pro' ? 'border-[#0b5566] bg-white shadow' : 'border-gray-200 bg-white hover:shadow-sm'}`}>
              <div><div className="font-semibold text-[#0b5566]">Pro</div><div className="text-xs text-gray-600">Pour structures avancées</div></div>
              <div className="mt-3 text-xs text-gray-600">Enfants illimités, RH & facturation</div>
              <div className="mt-auto text-base font-bold text-[#0b5566]">59,99€ <span className="text-xs text-gray-500">/ mois</span></div>
            </button>
          </div>
        </div>

        {(initialPlan === 'essentiel' || initialPlan === 'pro') && (
          <div className="w-full max-w-xl md:max-w-2xl mt-2 px-6">
            <div className="rounded-md bg-yellow-100 border-l-4 border-yellow-400 p-3 text-sm text-yellow-800">
              Les abonnements payant ne sont pas encore disponibles veuillez essayer la version gratuite sans engagement — Contactez-nous pour plus de renseignements.
            </div>
          </div>
        )}

        <button type="submit" disabled={initLoading || completeLoading || initialPlan !== 'decouverte'} title={initialPlan !== 'decouverte' ? 'Les abonnements payants ne sont pas encore disponibles. Contactez-nous pour plus d’informations.' : undefined} aria-disabled={initialPlan !== 'decouverte' ? 'true' : 'false'} className={`w-full py-2 rounded-full font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] ${initLoading || completeLoading || initialPlan !== 'decouverte' ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-[#0b5566] text-white hover:opacity-95'}`}>
          {initLoading || completeLoading ? 'Patientez…' : (initialPlan === 'decouverte' ? 'S’inscrire' : 'S’inscrire et payer')}
        </button>

        <div className="mt-4 text-sm text-[#08323a]">Déjà un compte ? <a href="/login" className="text-[#0b5566] hover:underline">Se connecter</a></div>

      </form>

      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div role="dialog" aria-modal="true" className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg">
            <h3 className="text-lg font-bold text-[#0b5566] mb-2">Abonnement requis</h3>
            <p className="text-sm text-gray-700 mb-4">{upgradeMessage || 'Cette action nécessite un abonnement. Passez à un plan supérieur pour continuer.'}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { window.location.href = '/pricing'; }} className="px-4 py-2 bg-[#0b5566] text-white rounded-md">Aller aux offres</button>
              <button onClick={() => setShowUpgradeModal(false)} className="px-4 py-2 border rounded-md">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
