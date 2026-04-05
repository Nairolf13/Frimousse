import { useEffect, useRef, useState } from 'react';

type AvatarCropperProps = {
  imageSrc: string;
  size?: number;
  onCancel: () => void;
  onApply: (croppedFile: File) => void;
};

export default function AvatarCropper({ imageSrc, size = 320, onCancel, onApply }: AvatarCropperProps) {
  const [scale, setScale] = useState(1.1);
  const [fitScale, setFitScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);
  const cropAreaRef = useRef<HTMLDivElement | null>(null);
  const touchDragRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  // Register touch events with { passive: false } so preventDefault() works (suppresses warning)
  useEffect(() => {
    const el = cropAreaRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      touchDragRef.current = { startX: touch.clientX, startY: touch.clientY, offsetX: offsetRef.current.x, offsetY: offsetRef.current.y };
      setIsDragging(true);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const drag = touchDragRef.current;
      if (!drag) return;
      const touch = e.touches[0];
      setOffset({ x: drag.offsetX + (touch.clientX - drag.startX), y: drag.offsetY + (touch.clientY - drag.startY) });
    };
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const startDrag = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY, offsetX: offset.x, offsetY: offset.y });
  };

  const moveDrag = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    setOffset({ x: dragStart.offsetX + deltaX, y: dragStart.offsetY + deltaY });
  };

  const endDrag = () => {
    setIsDragging(false);
    setDragStart(null);
    touchDragRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -e.deltaY / 500;
    setScale((prev) => Math.min(4, Math.max(1, prev + delta)));
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    setNaturalSize({ width: nw, height: nh });
    const coverScale = Math.max(size / nw, size / nh);
    setFitScale(coverScale);
    setScale(1.2);
    setOffset({ x: 0, y: 0 });
  };

  const processCroppedImage = async () => {
    if (!imageRef.current) return;
    const img = imageRef.current;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const currentScale = fitScale * scale;

    const cropNaturalSize = size / currentScale;
    const centerNaturalX = naturalW / 2 - offset.x / currentScale;
    const centerNaturalY = naturalH / 2 - offset.y / currentScale;

    const srcSize = Math.min(cropNaturalSize, naturalW, naturalH);
    const srcX = Math.max(0, Math.min(naturalW - srcSize, centerNaturalX - srcSize / 2));
    const srcY = Math.max(0, Math.min(naturalH - srcSize, centerNaturalY - srcSize / 2));

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, size, size);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/webp', 0.92);
    });

    if (!blob) return;
    const file = new File([blob], 'avatar.webp', { type: 'image/webp' });
    onApply(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseUp={endDrag} onMouseLeave={endDrag} onTouchEnd={endDrag} onTouchCancel={endDrag}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-900">Recadrer votre photo</h3>
          <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">Annuler</button>
        </div>
        <div ref={cropAreaRef} className="relative overflow-hidden rounded-xl bg-gray-100" style={{ height: 360 }} onMouseDown={startDrag} onMouseMove={moveDrag} onWheel={handleWheel}>
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Crop preview"
            draggable={false}
            onLoad={onImageLoad}
            className="absolute top-1/2 left-1/2"
            style={{
              width: naturalSize.width ? `${naturalSize.width * fitScale}px` : 'auto',
              height: naturalSize.height ? `${naturalSize.height * fitScale}px` : 'auto',
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              maxWidth: 'none',
              maxHeight: 'none',
            }}
          />
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at center, rgba(0,0,0,0) ${size / 2}px, rgba(0,0,0,0.45) ${size / 2}px)`,
              }}
            />
            <div
              className="absolute"
              style={{
                top: '50%',
                left: '50%',
                width: `${size}px`,
                height: `${size}px`,
                transform: 'translate(-50%, -50%)',
                borderRadius: '9999px',
                border: '2px solid rgba(255,255,255,0.95)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.5)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500">Glissez l'image avec la souris / le doigt pour positionner la zone. Faites rouler la molette ou utilsez le curseur pour zoomer.</div>

        <div className="mt-3 flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">Zoom</label>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs font-semibold text-gray-600">{scale.toFixed(2)}x</span>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Annuler</button>
          <button type="button" onClick={processCroppedImage} className="px-3 py-2 rounded-lg bg-[#0b5566] text-white hover:bg-[#08323a]">Appliquer</button>
        </div>
      </div>
    </div>
  );
}
