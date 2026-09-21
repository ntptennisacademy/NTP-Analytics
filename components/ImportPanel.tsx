import React from 'react';
import type { Match, Player } from '../types';
import { parseBackup } from '../store';

type Backup = { players: Player[]; matches: Match[] };

interface ImportPanelProps {
  localBackup: Backup | null;
  importing: boolean;
  onImport: (backup: Backup) => Promise<void>;
}

export function ImportPanel({ localBackup, importing, onImport }: ImportPanelProps) {
  const input = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState('');

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setError('Backup is too large (25 MB maximum).');
      return;
    }
    try {
      const backup = parseBackup(JSON.parse(await file.text()));
      if (!backup) throw new Error('This is not a valid NTP Analytics backup.');
      setError('');
      await onImport(backup);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read backup.');
    }
  };

  const downloadLocal = () => {
    if (!localBackup) return;
    const blob = new Blob([JSON.stringify(localBackup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ntp-analytics-browser-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="p-4 bg-blue-50 border-b border-blue-100 text-sm text-[#1C1C1E]">
    <p className="font-bold mb-1">Move your old browser data</p>
    <p className="text-xs leading-relaxed mb-3">Import a backup into your account. Existing database records with the same IDs are kept.</p>
    {localBackup && <p className="text-xs mb-3">This browser has {localBackup.players.length} player(s) and {localBackup.matches.length} match(es) from the old app.</p>}
    <div className="flex flex-wrap gap-2">
      {localBackup && <button disabled={importing} onClick={() => void onImport(localBackup)} className="px-3 py-2 rounded-lg bg-primary text-white font-semibold disabled:opacity-50">{importing ? 'Importing…' : 'Import browser data'}</button>}
      {localBackup && <button disabled={importing} onClick={downloadLocal} className="px-3 py-2 rounded-lg bg-white border border-blue-200 font-semibold">Download backup</button>}
      <button disabled={importing} onClick={() => input.current?.click()} className="px-3 py-2 rounded-lg bg-white border border-blue-200 font-semibold">Import JSON backup</button>
    </div>
    <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={importFile} />
    {error && <p role="alert" className="text-red-700 mt-2">{error}</p>}
  </div>;
}
