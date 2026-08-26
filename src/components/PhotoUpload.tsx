import { useRef } from 'react';
import { Camera } from 'lucide-react';

interface PhotoUploadProps {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  name?: string;
  color?: string;
  size?: number;
  label?: string;
}

export default function PhotoUpload({
  value,
  onChange,
  name = '',
  color = '#888',
  size = 64,
  label = 'Photo',
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
    // reset so same file can be re-selected
    e.target.value = '';
  }

  const initials = name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      type="button"
      aria-label={`Upload ${label}`}
      title={`Upload ${label}`}
      onClick={() => inputRef.current?.click()}
      className="group relative shrink-0 overflow-hidden rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ width: size, height: size }}
    >
      {/* Avatar base */}
      {value ? (
        <img
          src={value}
          alt={name}
          className="h-full w-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-bold text-white"
          style={{
            background: color,
            fontSize: Math.round(size * 0.36),
          }}
        >
          {initials || '?'}
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <Camera size={Math.round(size * 0.3)} className="text-white" />
        <span
          className="font-semibold text-white"
          style={{ fontSize: Math.max(9, Math.round(size * 0.14)) }}
        >
          {label}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFile}
        tabIndex={-1}
      />
    </button>
  );
}
