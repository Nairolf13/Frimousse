import { useState, useEffect } from 'react';

type Props = {
  src: string;
  alt?: string;
  thumb?: string | null;
  className?: string;
  onOpen?: () => void; // optional callback to open a parent lightbox instead of the built-in modal
};

export default function FeedImage({ src, alt, thumb, className, onOpen }: Props) {
  const [open, setOpen] = useState(false);
  const [orientation, setOrientation] = useState<'landscape'|'portrait'|'square' | null>(null);
  const [rotation, setRotation] = useState(0);

  function handleClick() {
    if (onOpen) return onOpen();
    setOpen(true);
  }

  useEffect(() => {
    // detect natural orientation of the thumbnail (or full src if thumb missing)
    const img = new Image();
    img.src = thumb || src;
    img.onload = () => {
      if (img.naturalWidth > img.naturalHeight) setOrientation('landscape');
      else if (img.naturalWidth < img.naturalHeight) setOrientation('portrait');
      else setOrientation('square');
    };
    img.onerror = () => setOrientation(null);
    return () => { img.onload = null; img.onerror = null; };
  }, [thumb, src]);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`block w-full overflow-hidden rounded-lg focus:outline-none ${className || ''}`}
        aria-label="Voir l'image en plein écran"
      >
        {/* Adjust aspect based on detected orientation: landscape -> wider (video-like), portrait/square -> square */}
        <div className={`w-full bg-gray-100 overflow-hidden ${orientation === 'landscape' ? 'aspect-video' : 'aspect-square'}`}>
          <img src={thumb || src} alt={alt || 'photo'} className="w-full h-full object-cover object-center" />
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div onClick={e => e.stopPropagation()} className="max-w-full max-h-full flex items-center justify-center">
            <img
              src={src}
              alt={alt || 'photo plein écran'}
              className="max-w-full max-h-full object-contain"
              style={{ touchAction: 'manipulation', transform: `rotate(${rotation}deg)`, transition: 'transform 200ms' }}
            />
          </div>
          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={() => setRotation(r => (r - 90) % 360)} className="text-white p-2 rounded bg-black bg-opacity-50">⟲</button>
            <button onClick={() => setRotation(r => (r + 90) % 360)} className="text-white p-2 rounded bg-black bg-opacity-50">⟳</button>
            <button
              onClick={() => setOpen(false)}
              className="text-white p-2 rounded bg-black bg-opacity-50"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
