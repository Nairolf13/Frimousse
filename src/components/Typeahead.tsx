import React, { useEffect, useMemo, useRef, useState } from 'react';

type TypeaheadProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options?: string[]; // local options to filter
  fetchOptions?: (q: string) => Promise<string[]>; // optional async fetcher
  minChars?: number;
  id?: string;
};

export default function Typeahead({ value, onChange, placeholder, options = [], fetchOptions, minChars = 1, id }: TypeaheadProps) {
  const [query, setQuery] = useState(value || '');
  const [items, setItems] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const optionsRef = useRef<string[]>(options);
  const fetchOptionsRef = useRef<typeof fetchOptions | undefined>(fetchOptions);

  // keep refs up to date without causing effect re-runs
  useEffect(() => { optionsRef.current = options; }, [options]);
  useEffect(() => { fetchOptionsRef.current = fetchOptions; }, [fetchOptions]);

  useEffect(() => setQuery(value || ''), [value]);

  useEffect(() => {
  let mounted = true;
    async function load() {
      const q = String(query || '').trim();
      const curFetch = fetchOptionsRef.current;
      const curOptions = optionsRef.current;
      if (curFetch) {
        if (q.length < minChars) {
          if (mounted) setItems([]);
          return;
        }
        try {
          const res = await curFetch(q);
          if (mounted) {
            // avoid unnecessary state updates if identical
            const next = res || [];
            setItems(prev => {
              if (prev.length === next.length && prev.every((v, i) => v === next[i])) return prev;
              return next;
            });
          }
        } catch {
          if (mounted) setItems([]);
        }
      } else {
        // filter local options
        if (!q || q.length < minChars) {
          if (mounted) setItems([]);
          return;
        }
        const lower = q.toLowerCase();
        const filtered = curOptions.filter(o => String(o).toLowerCase().includes(lower)).slice(0, 10);
        if (mounted) setItems(prev => {
          if (prev.length === filtered.length && prev.every((v, i) => v === filtered[i])) return prev;
          return filtered;
        });
      }
    }
  // debounce to avoid rapid setState calls during typing
  const timer = window.setTimeout(load, 150);
  return () => { mounted = false; clearTimeout(timer); };
  }, [query, minChars]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (e.target && containerRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  useEffect(() => { setHighlight(0); }, [items]);

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight(h => Math.min(items.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      if (open && items[highlight]) {
        e.preventDefault();
        select(items[highlight]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const select = React.useCallback((v: string) => {
    onChange(v);
    setQuery(v);
    setOpen(false);
    inputRef.current?.blur();
  }, [onChange]);

  const renderedList = useMemo(() => items.map((it, idx) => (
    <li
      key={it + '-' + idx}
      role="option"
      aria-selected={highlight === idx}
      onMouseDown={(ev) => { ev.preventDefault(); select(it); }}
      onMouseEnter={() => setHighlight(idx)}
      className={`cursor-pointer px-3 py-2 ${highlight === idx ? 'bg-[#e6f6fa]' : 'bg-white'}`}
    >
      {it}
    </li>
  )), [items, highlight, select]);

  return (
    <div ref={containerRef} className="relative w-full" id={id}>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onInputKey}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-controls={id ? `${id}-listbox` : undefined}
        aria-expanded={open}
        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#a9ddf2]"
      />
      {open && items.length > 0 && (
        <ul id={id ? `${id}-listbox` : undefined} role="listbox" className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-white shadow-lg">
          {renderedList}
        </ul>
      )}
    </div>
  );
}
