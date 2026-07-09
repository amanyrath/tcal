import { useState } from "react";
import type { AppState } from "../types/state";
import { buildExportUrl, buildGoogleCalendarUrl } from "../lib/export";

interface ExportMenuProps {
  state: AppState;
}

export function ExportMenu({ state }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const baseUrl = window.location.origin;
  const icsUrl = buildExportUrl(state, baseUrl);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(icsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadIcs = () => {
    window.open(icsUrl, "_blank");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800"
      >
        Export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[200px]">
            <button
              type="button"
              onClick={copyUrl}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              {copied ? "Copied!" : "Copy iCal URL"}
            </button>
            <a
              href={buildGoogleCalendarUrl(icsUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 text-sm hover:bg-gray-50"
            >
              Subscribe in Google Calendar
            </a>
            <button
              type="button"
              onClick={downloadIcs}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              Download .ics
            </button>
          </div>
        </>
      )}
    </div>
  );
}
