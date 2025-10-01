import { useState } from 'react';

type Props = {
  src: string;
  alt?: string;
  thumb?: string | null;
  className?: string;
  onOpen?: () => void; // optional callback to open a parent lightbox instead of the built-in modal
};

export default function FeedImage({ src, alt, thumb, className, onOpen }: Props) {
  const [open, setOpen] = useState(false);

  function handleClick() {
    if (onOpen) return onOpen();
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`block w-full h-full overflow-hidden rounded-lg focus:outline-none ${className || ''}`}
        aria-label="Voir l'image en plein écran"
      >
        <img src={thumb || src} alt={alt || 'photo'} className="w-full h-full object-cover object-center" />
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
              style={{ touchAction: 'manipulation' }}
            />
          </div>
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-white p-2 rounded bg-black bg-opacity-50"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
