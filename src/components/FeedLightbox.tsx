import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

export type Media = { id?: string; url: string };

type Props = {
  open: boolean;
  medias: Media[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function FeedLightbox({ open, medias, index, onClose, onPrev, onNext }: Props) {
  // local mount/visibility state so we can animate open/close
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [imgVisible, setImgVisible] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);
  const [rotation, setRotation] = useState(0);
  const pointerIdRef = React.useRef<number | null>(null);
  const startXRef = React.useRef<number>(0);

  // mount/unmount with fade
  useEffect(() => {
    let t: number | undefined;
    if (open) {
      setMounted(true);
      // small tick so transition can run
      t = window.setTimeout(() => setVisible(true), 20);
    } else {
      setVisible(false);
      t = window.setTimeout(() => setMounted(false), 220);
    }
    return () => { if (t) window.clearTimeout(t); };
  }, [open]);

  // lock body scroll while mounted
  useEffect(() => {
    if (!mounted) return;
    try {
      document.body.style.overflow = 'hidden';
    } catch {
      // ignore in non-browser environments
    }
    return () => { try { document.body.style.overflow = ''; } catch { /* ignore */ } };
  }, [mounted]);

  // keyboard handling
  const handleClose = useCallback(() => {
    // animate out then call onClose
    setVisible(false);
    window.setTimeout(() => onClose(), 220);
  }, [onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!mounted) return;
      if (e.key === 'Escape') return handleClose();
      if (e.key === 'ArrowLeft') return onPrev();
      if (e.key === 'ArrowRight') return onNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted, onPrev, onNext, handleClose]);

  // animate image cross-fade when index changes
  useEffect(() => {
    if (!mounted) return;
    setImgVisible(false);
    const t = window.setTimeout(() => setImgVisible(true), 20);
    // reset rotation when switching images
    setRotation(0);
    return () => window.clearTimeout(t);
  }, [index, mounted]);

  

  if (!mounted) return null;

  const el = (
    <div
      className={`fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      {/* top/bottom letterbox bands to increase contrast for controls */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-16 sm:h-24 z-40 bg-gradient-to-b from-black/90 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 sm:h-24 z-40 bg-gradient-to-t from-black/90 to-transparent" />

      <div
        className="relative w-screen h-screen flex items-center justify-center"
        onClick={e => e.stopPropagation()}
        onPointerDown={(e) => {
          // only track primary pointers
          if (pointerIdRef.current !== null) return;
          pointerIdRef.current = e.pointerId;
          (e.target as Element).setPointerCapture(e.pointerId);
          startXRef.current = e.clientX;
          setDragging(true);
          setDragDelta(0);
        }}
        onPointerMove={(e) => {
          if (!dragging || pointerIdRef.current !== e.pointerId) return;
          const delta = e.clientX - startXRef.current;
          setDragDelta(delta);
        }}
        onPointerUp={(e) => {
          if (pointerIdRef.current !== e.pointerId) return;
          try { (e.target as Element).releasePointerCapture(e.pointerId); } catch { /* ignore release errors */ }
          pointerIdRef.current = null;
          setDragging(false);
          // decide navigation based on threshold
          const w = Math.max(window.innerWidth, 1);
          const abs = Math.abs(dragDelta);
          const pct = abs / w;
          const THRESH_PX = 60;
          const THRESH_PCT = 0.2;
          if (dragDelta > THRESH_PX || pct > THRESH_PCT) {
            // dragged right => previous
            onPrev();
          } else if (dragDelta < -THRESH_PX || pct > THRESH_PCT) {
            // dragged left => next
            onNext();
          }
          // reset transform after a small delay so transition looks natural
          setDragDelta(0);
        }}
        onPointerCancel={(e) => {
          if (pointerIdRef.current !== e.pointerId) return;
          try { (e.target as Element).releasePointerCapture(e.pointerId); } catch { /* ignore release errors */ }
          pointerIdRef.current = null;
          setDragging(false);
          setDragDelta(0);
        }}
      >
        <button onClick={onPrev} aria-label="Précédent" className="absolute left-4 sm:left-8 text-white bg-black/30 hover:bg-black/40 rounded-full p-3 z-50">‹</button>

        <div
          className={`bg-black z-50 flex items-center justify-center ${dragging ? '' : 'transition-transform duration-200'} rounded-none p-0 sm:rounded-lg sm:p-6 shadow-lg`}
          style={{
            width: '100%',
            height: '100%',
            maxWidth: 'calc(100vw - 96px)',
            maxHeight: 'calc(100vh - 160px)',
            transform: `translateX(${dragDelta}px)`,
          }}
        >
          <img
            src={medias[index].url}
            className={`w-full h-full sm:max-w-full sm:max-h-full object-contain transition-opacity duration-300 ${imgVisible ? 'opacity-100' : 'opacity-0'}`}
            alt={`image ${index + 1}`}
            draggable={false}
            style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 200ms' }}
          />
        </div>

        <button onClick={onNext} aria-label="Suivant" className="absolute right-4 sm:right-8 text-white bg-black/40 hover:bg-black/50 rounded-full p-4 z-50">›</button>
        <div className="absolute top-4 right-4 flex gap-2 z-50">
          <button onClick={() => setRotation((r) => (r - 90) % 360)} aria-label="Pivoter à gauche" className="text-white bg-black/40 hover:bg-black/50 rounded-full p-3">⟲</button>
          <button onClick={() => setRotation((r) => (r + 90) % 360)} aria-label="Pivoter à droite" className="text-white bg-black/40 hover:bg-black/50 rounded-full p-3">⟳</button>
          <button onClick={handleClose} aria-label="Fermer" className="text-white bg-black/40 rounded-full p-3">✕</button>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/30 px-3 py-1 rounded z-50">{index + 1} / {medias.length}</div>
      </div>
    </div>
  );

  return createPortal(el, document.body);
}
