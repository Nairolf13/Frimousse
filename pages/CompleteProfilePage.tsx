import React, { useEffect, useState, useRef, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

type Country = { name: string; cca2?: string; cca3?: string; region?: string };

type GeodataPlace = {
  id?: string | number;
  name?: string;
  lat?: number | null;
  lon?: number | null;
  street?: string | null;
  house_number?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postcode?: string | null;
  raw?: unknown;
};

type FormType = {
  phone: string;
  centerName: string;
  address: string;
  city: string;
  postalCode: string;
  region: string;
  country: string;
};

export default function CompleteProfilePage() {
  const getRawCountryCode = (raw: unknown): string | null => {
    if (!raw || typeof raw !== "object") return null;
    try {
      const r = raw as Record<string, unknown>;
      const cc = r["country_code"] || r["country_code".toString()];
      if (!cc) return null;
      return String(cc).toUpperCase();
    } catch {
      return null;
    }
  };

  const [form, setForm] = useState<FormType>({
    phone: "",
    centerName: "",
    address: "",
    city: "",
    postalCode: "",
    region: "",
    country: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [countries, setCountries] = useState<Country[]>([]);
  const [countrySuggestions, setCountrySuggestions] = useState<Array<{ name: string }>>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);

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
        const el = document.querySelector(`input[name="${name}"]`) as HTMLInputElement | null;
        if (el) {
          el.focus();
          const len = el.value ? el.value.length : 0;
          el.setSelectionRange(len, len);
        }
      } catch {}
    }, 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name as keyof FormType;
    const value = e.target.value;
    updateForm({ [name]: value });

    if (name === "country") setOpenCountry(true);
    if (name === "region") setOpenRegion(true);
    if (name === "city") setOpenCity(true);
    if (name === "address") setOpenAddress(true);
  };

  // Load countries
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/geodata/countries");
        if (!res.ok) return;
        const data = (await res.json()) as Country[];
        setCountries(data || []);
      } catch {}
    })();
  }, []);

  // Country suggestions
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
      const matching = countries.filter((c) => c.name && c.name.toLowerCase().includes(q));
      if (matching.length === 1 && matching[0].cca2) {
        setSelectedCountryCode(String(matching[0].cca2).toUpperCase());
      } else {
        const starts = countries.find((c) => c.name && c.name.toLowerCase().startsWith(q));
        setSelectedCountryCode(starts && starts.cca2 ? String(starts.cca2).toUpperCase() : null);
      }
    }
  }, [form.country, countries]);

  // Geodata fetch
  const fetchGeodata = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setPlaceSuggestions([]);
      setCitySuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/geodata/positionstack?q=${encodeURIComponent(query)}&limit=12`);
      if (!res.ok) { setPlaceSuggestions([]); setCitySuggestions([]); return; }
      const data = (await res.json()) as GeodataPlace[];
      const arr = data || [];
      const cities = arr.filter((p) => !!(p.city || (p.name && !p.street && !p.house_number)) && !(p.house_number || p.street));
      const addresses = arr.filter((p) => !!(p.house_number || p.street));
      setCitySuggestions(cities);
      setPlaceSuggestions(addresses);
    } catch {
      setPlaceSuggestions([]);
      setCitySuggestions([]);
    }
  }, []);

  useEffect(() => {
    const q = (form.address || form.city || "").trim();
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      const bias = form.city ? ` ${form.city}` : "";
      fetchGeodata(`${q}${bias}`.trim());
    }, 1000);
    return () => { if (searchTimer.current) window.clearTimeout(searchTimer.current); };
  }, [form.address, form.city, fetchGeodata]);

  // Region suggestions
  useEffect(() => {
    const q = (form.region || "").trim();
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(async () => {
      if (!q || q.length < 2) return setRegionSuggestions([]);
      try {
        const res = await fetch(`/api/geodata/positionstack?q=${encodeURIComponent(q)}&limit=40`);
        if (!res.ok) return setRegionSuggestions([]);
        const data = (await res.json()) as GeodataPlace[];
        const seen = new Set<string>();
        const arr: string[] = [];
        const wantCountry = selectedCountryCode ? selectedCountryCode.toUpperCase() : null;
        for (const p of data || []) {
          const state = p.state || null;
          const countryCode = getRawCountryCode(p.raw);
          if (!state) continue;
          if (wantCountry && countryCode && countryCode !== wantCountry) continue;
          if (!seen.has(state)) { seen.add(state); arr.push(state); if (arr.length >= 8) break; }
        }
        setRegionSuggestions(arr);
      } catch { setRegionSuggestions([]); }
    }, 1000);
    return () => { if (searchTimer.current) window.clearTimeout(searchTimer.current); };
  }, [form.region, selectedCountryCode]);

  // Close dropdowns on outside click
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
    const streetPart = house ? `${house} ${road}`.trim() : road || "";
    const displayStreet = streetPart || p.name || "";
    const userTyped = String(form.address || "").trim();
    let composed = displayStreet;
    if (!house) {
      const m = userTyped.match(/^(\d+)\s+(.+)$/);
      if (m && m[1] && !displayStreet.startsWith(m[1] + " ")) {
        composed = `${m[1]} ${displayStreet}`.trim();
      }
    }

    updateForm({
      address: composed,
      city: p.city || "",
      postalCode: p.postcode || "",
      region: p.state || "",
      country: p.country || "",
    });
    setPlaceSuggestions([]);
    setOpenAddress(false);
  };

  const selectCity = (p: GeodataPlace) => {
    updateForm({
      city: p.city || p.name || "",
      region: p.state || form.region,
      country: p.country || form.country,
      postalCode: p.postcode || form.postalCode,
    });
    setCitySuggestions([]);
    setOpenCity(false);
    applyAndFocus("address", "");
  };

  // Form validation
  const requiredFields: Array<keyof FormType> = ["phone", "centerName", "address", "city", "postalCode", "country"];
  const allFieldsFilled = requiredFields.every((k) => String(form[k] || "").trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/user/complete-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Erreur");
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]";
  const labelClass = "block mb-3 w-full text-left font-medium text-[#08323a]";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f4d7] px-4">
      <div
        ref={containerRef}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg flex flex-col items-center"
      >
        <img src="/imgs/LogoFrimousse.webp" alt="Les Frimousses" className="w-16 h-16 mb-4" />
        <h1 className="text-2xl font-bold text-[#08323a] mb-1">Complétez votre profil</h1>
        <p className="mb-6 text-[#08323a] text-center text-sm">
          Quelques informations supplémentaires sont nécessaires pour le bon fonctionnement de votre compte.
        </p>

        {error && <div className="mb-4 text-red-600 w-full text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="w-full">
          <div className="text-sm text-gray-500 mb-4">
            Champs obligatoires <span className="text-red-600">*</span>
          </div>

          {/* Phone */}
          <label className={labelClass}>
            Téléphone <span className="text-red-600">*</span>
            <input
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="06 12 34 56 78"
              required
              className={inputClass}
            />
          </label>

          {/* Center name */}
          <label className={labelClass}>
            Société / Crèche <span className="text-red-600">*</span>
            <input
              name="centerName"
              value={form.centerName}
              onChange={handleChange}
              placeholder="Nom de la crèche ou société"
              className={inputClass}
            />
          </label>

          {/* Address grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full mb-3">
            {/* Address */}
            <label className="block text-left font-medium text-[#08323a]">
              Adresse <span className="text-red-600">*</span>
              <div className="relative">
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Adresse"
                  className={inputClass}
                />
                {openAddress && placeSuggestions.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 bg-white border mt-1 max-h-56 overflow-auto rounded shadow">
                    {placeSuggestions.map((p, idx) => {
                      const label = p.name || (p.house_number ? `${p.house_number} ${p.street}` : p.street || "");
                      const summary = [p.house_number && `${p.house_number} ${p.street}`, p.street || p.name, p.postcode, p.state, p.country].filter(Boolean).join(", ");
                      return (
                        <li key={idx} role="button" tabIndex={0} onClick={() => selectPlace(p)} className="px-3 py-2 hover:bg-gray-100 cursor-pointer">
                          <div className="text-sm font-medium">{label}</div>
                          <div className="text-xs text-gray-500">{summary}</div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </label>

            {/* City */}
            <label className="block text-left font-medium text-[#08323a]">
              Ville <span className="text-red-600">*</span>
              <div className="relative">
                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Ville"
                  className={inputClass}
                />
                {openCity && citySuggestions.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 bg-white border mt-1 max-h-56 overflow-auto rounded shadow">
                    {citySuggestions.map((p, idx) => (
                      <li key={idx} role="button" tabIndex={0} onClick={() => selectCity(p)} className="px-3 py-2 hover:bg-gray-100 cursor-pointer">
                        <div className="text-sm font-medium">{p.city || p.name}</div>
                        <div className="text-xs text-gray-500">{[p.state, p.country].filter(Boolean).join(", ")}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </label>

            {/* Postal Code */}
            <label className="block text-left font-medium text-[#08323a]">
              Code postal <span className="text-red-600">*</span>
              <input
                name="postalCode"
                value={form.postalCode}
                onChange={handleChange}
                placeholder="Code postal"
                required
                className={inputClass}
              />
            </label>
          </div>

          {/* Region + Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mb-3">
            {/* Region */}
            <label className="block text-left font-medium text-[#08323a]">
              Région
              <div className="relative">
                <input
                  name="region"
                  value={form.region}
                  onChange={handleChange}
                  placeholder="Région"
                  className={inputClass}
                />
                {openRegion && regionSuggestions.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 bg-white border mt-1 max-h-56 overflow-auto rounded shadow">
                    {regionSuggestions.map((r, idx) => (
                      <li key={idx} role="button" tabIndex={0} onClick={() => selectRegion(r)} className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm">
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </label>

            {/* Country */}
            <label className="block text-left font-medium text-[#08323a]">
              Pays <span className="text-red-600">*</span>
              <div className="relative">
                <input
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  placeholder="Pays"
                  required
                  className={inputClass}
                />
                {openCountry && countrySuggestions.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 bg-white border mt-1 max-h-56 overflow-auto rounded shadow">
                    {countrySuggestions.map((c, idx) => (
                      <li key={idx} role="button" tabIndex={0} onClick={() => selectCountry(c.name)} className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm">
                        {c.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={!allFieldsFilled || loading}
            className="w-full mt-4 py-3 rounded-lg font-bold text-white bg-[#0b5566] hover:bg-[#08323a] transition disabled:opacity-50"
          >
            {loading ? "Enregistrement…" : "Continuer"}
          </button>
        </form>
      </div>
    </div>
  );
}
