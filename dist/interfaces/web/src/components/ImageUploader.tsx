import { useState, useRef, useCallback } from 'react';
import { platform } from '@mindstudio-ai/interface';
import { IconUpload, IconLoader2, IconPhoto } from '@tabler/icons-react';

// Single-file image uploader. Two modes:
//   - button: renders a small button, opens file picker on click.
//   - dropzone: renders a larger drag-and-drop area.
// Either way, on success it calls onUploaded with the CDN URL.
//
// Uses platform.uploadFile from the MindStudio interface SDK, which handles
// the upload and returns an i.mscdn.ai URL. Progress is tracked and shown
// in the UI so uploads don't feel like they've frozen.
export function ImageUploader({
  onUploaded,
  onError,
  variant = 'button',
  label,
  accept = 'image/*',
  disabled = false,
}: {
  onUploaded: (url: string) => void;
  onError?: (error: string) => void;
  variant?: 'button' | 'dropzone';
  label?: string;
  accept?: string;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        onError?.('Only image files are supported.');
        return;
      }
      // 10 MB cap — MindStudio CDN handles bigger, but 10 MB is enough for
      // screenshots, photos, diagrams. Anything bigger is probably the wrong
      // file.
      if (file.size > 10 * 1024 * 1024) {
        onError?.('Image is too large. Max 10 MB.');
        return;
      }

      setUploading(true);
      setProgress(0);
      try {
        const url = await platform.uploadFile(file, {
          onProgress: (fraction) => setProgress(fraction),
        });
        onUploaded(url);
      } catch (err: any) {
        console.error('Image upload failed:', err);
        onError?.(err?.message || 'Upload failed.');
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [onUploaded, onError],
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so selecting the same file again still fires onChange.
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const openPicker = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  if (variant === 'dropzone') {
    return (
      <div
        onClick={openPicker}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 12,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          cursor: disabled || uploading ? 'default' : 'pointer',
          background: dragOver ? 'rgba(202, 174, 151, 0.08)' : 'transparent',
          transition: 'all 0.15s ease',
          minHeight: 140,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
        {uploading ? (
          <>
            <IconLoader2 size={28} stroke={1.5} className="spinner" color="var(--text-secondary)" />
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Uploading... {Math.round(progress * 100)}%
            </div>
            {/* Progress bar — 2px tall, brand accent color, no layout shift */}
            <div
              style={{
                width: 180,
                height: 2,
                background: 'var(--border)',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </>
        ) : (
          <>
            <IconPhoto size={28} stroke={1.5} color="var(--text-secondary)" />
            <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
              {label || 'Upload an image'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Click or drag a file here
            </div>
          </>
        )}
      </div>
    );
  }

  // Button variant
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
      <button
        className="btn btn-ghost btn-sm"
        onClick={openPicker}
        disabled={disabled || uploading}
        title={label || 'Upload image'}
      >
        {uploading ? (
          <>
            <IconLoader2 size={14} className="spinner" /> {Math.round(progress * 100)}%
          </>
        ) : (
          <>
            <IconUpload size={14} stroke={1.5} /> {label || 'Upload image'}
          </>
        )}
      </button>
    </>
  );
}
