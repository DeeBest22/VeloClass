import { useRef, useState } from "react";
import { FolderPlus, Plus, Upload } from "lucide-react";

interface FileActionOption {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface FileFloatingActionButtonProps {
  /** Called once per selected file, e.g. `(file) => uploadFile(file)`. */
  onUpload: (file: File) => void;
  /** Called with a folder name once the user confirms creating one. */
  onNewFolder: (name: string) => void;
  accept?: string;
}

const FileFloatingActionButton = ({
  onUpload,
  onNewFolder,
  accept,
}: FileFloatingActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  // `rendered` keeps the options in the DOM during the closing animation,
  // then removes them fully once the animation finishes (~300ms).
  const [rendered, setRendered] = useState(false);
  const [animating, setAnimating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggle = () => {
    if (isOpen) {
      setAnimating(false);
      setIsOpen(false);
      setTimeout(() => setRendered(false), 300);
    } else {
      setRendered(true);
      setIsOpen(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
    }
  };

  const close = () => {
    setAnimating(false);
    setIsOpen(false);
    setTimeout(() => setRendered(false), 300);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach((file) => onUpload(file));
    }
    // Reset so selecting the same file again still fires onChange
    event.target.value = "";
  };

  const options: FileActionOption[] = [
    {
      label: "New Folder",
      icon: <FolderPlus className="h-4 w-4" />,
      onClick: () => {
        close();
        const name = window.prompt("Name this folder");
        if (name && name.trim()) {
          onNewFolder(name.trim());
        }
      },
    },
    {
      label: "Upload File",
      icon: <Upload className="h-4 w-4" />,
      onClick: () => {
        close();
        fileInputRef.current?.click();
      },
    },
  ];

  return (
    <>
      <style>{`
        .file-fab-backdrop {
          position: fixed;
          inset: 0;
          z-index: 48;
          background: transparent;
        }

        .file-fab-container {
          position: fixed;
          bottom: calc(
            max(env(safe-area-inset-bottom, 0px), 0px)
            + 40px
          );
          right: 24px;
          z-index: 99;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
          width: fit-content;
        }

        .file-fab-options {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
        }

        .file-fab-option-row {
          display: flex;
          align-items: center;
          gap: 10px;
          opacity: 0;
          transform: translateY(10px);
          pointer-events: none;
          transition:
            opacity 200ms ease,
            transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .file-fab-option-row.visible {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .file-fab-option-row:nth-child(1) { transition-delay: 30ms; }
        .file-fab-option-row:nth-child(2) { transition-delay: 0ms; }

        .file-fab-option-row.visible:nth-child(1) { transition-delay: 0ms; }
        .file-fab-option-row.visible:nth-child(2) { transition-delay: 40ms; }

        .file-fab-label-pill {
          background: #0f0f0f;
          color: #ffffff;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.01em;
          padding: 7px 14px;
          border-radius: 10px;
          border: 1.5px solid rgba(255,255,255,0.07);
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.3),
            0 3px 10px rgba(0,0,0,0.25);
          white-space: nowrap;
          cursor: pointer;
          transition: background 120ms ease;
        }

        .file-fab-label-pill:hover { background: #1a1a1a; }
        .file-fab-label-pill:active { background: #222; }

        .file-fab-mini-btn {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          background: #2563eb;
          border: none;
          box-shadow:
            0 0 0 1px rgba(37, 99, 235, 0.3),
            0 4px 12px rgba(37, 99, 235, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #ffffff;
          flex-shrink: 0;
          transition: background 120ms ease, transform 100ms ease, box-shadow 120ms ease;
        }

        .file-fab-mini-btn:hover {
          background: #3b82f6;
          box-shadow:
            0 0 0 1px rgba(37, 99, 235, 0.4),
            0 6px 16px rgba(37, 99, 235, 0.4);
        }

        .file-fab-mini-btn:active {
          transform: scale(0.93);
          background: #1d4ed8;
        }

        .file-fab-main {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: #2563eb;
          border: none;
          box-shadow:
            0 0 0 1px rgba(37, 99, 235, 0.25),
            0 4px 16px rgba(37, 99, 235, 0.45),
            0 1px 4px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #ffffff;
          transition: transform 100ms ease, background 150ms ease, box-shadow 150ms ease;
          flex-shrink: 0;
        }

        .file-fab-main:hover {
          background: #3b82f6;
          box-shadow:
            0 0 0 1px rgba(37, 99, 235, 0.35),
            0 6px 22px rgba(37, 99, 235, 0.5);
        }

        .file-fab-main:active {
          transform: scale(0.95);
          background: #1d4ed8;
        }

        .file-fab-plus-icon {
          transition: transform 280ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .file-fab-plus-icon.rotated {
          transform: rotate(45deg);
        }
      `}</style>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleFileChange}
        className="sr-only"
        tabIndex={-1}
      />

      {isOpen && <div className="file-fab-backdrop" onClick={close} />}

      <div className="file-fab-container">
        {rendered && (
          <div className="file-fab-options">
            {options.map((opt) => (
              <div key={opt.label} className={`file-fab-option-row${animating ? " visible" : ""}`}>
                <span className="file-fab-label-pill" onClick={opt.onClick}>
                  {opt.label}
                </span>
                <button className="file-fab-mini-btn" onClick={opt.onClick} aria-label={opt.label}>
                  {opt.icon}
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="file-fab-main" onClick={toggle} aria-label="Add file or folder">
          <Plus className={`h-5 w-5 file-fab-plus-icon${isOpen ? " rotated" : ""}`} />
        </button>
      </div>
    </>
  );
};

export default FileFloatingActionButton;