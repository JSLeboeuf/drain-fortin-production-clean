import { useEffect, useCallback, useState } from 'react';
import { useLocation } from 'wouter';
import { Command, Search, Settings, Phone, BarChart3, Home, HelpCircle, Wrench, DollarSign, FileText, ClipboardList } from 'lucide-react';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  description: string;
  action: () => void;
  icon?: React.ElementType;
  combo?: string;
}

export default function GlobalShortcuts() {
  const [, navigate] = useLocation();
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showToast, setShowToast] = useState('');
  let pendingG = false;

  const shortcuts: Shortcut[] = [
    { key: 'k', ctrl: true, description: 'Open command palette', action: () => setCommandPaletteOpen(true), icon: Command },
    { key: '/', description: 'Quick search', action: () => setCommandPaletteOpen(true), icon: Search },
    { key: 'd', combo: 'g', description: 'Go to Dashboard', action: () => navigate('/dashboard'), icon: Home },
    { key: 'i', combo: 'g', description: 'Go to Intake', action: () => navigate('/intake'), icon: ClipboardList },
    { key: 'p', combo: 'g', description: 'Go to Pricing', action: () => navigate('/pricing'), icon: DollarSign },
    { key: 's', combo: 'g', description: 'Go to Services', action: () => navigate('/services'), icon: Wrench },
    { key: 't', combo: 'g', description: 'Go to Templates', action: () => navigate('/templates'), icon: FileText },
    { key: 'c', combo: 'g', description: 'Go to Calls', action: () => navigate('/calls'), icon: Phone },
    { key: 'a', combo: 'g', description: 'Go to Analytics', action: () => navigate('/analytics'), icon: BarChart3 },
    { key: '?', description: 'Show shortcuts help', action: () => setShowHelp(true), icon: HelpCircle },
  ];

  const showQuickToast = (message: string) => {
    setShowToast(message);
    setTimeout(() => setShowToast(''), 2000);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if typing in input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      if (e.key === 'Escape') (e.target as HTMLElement).blur();
      return;
    }

    // Handle 'g' combo
    if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey) {
      pendingG = true;
      showQuickToast('Press next key for navigation...');
      return;
    }

    // Check shortcuts
    for (const shortcut of shortcuts) {
      if (shortcut.combo === 'g' && pendingG && e.key.toLowerCase() === shortcut.key) {
        e.preventDefault();
        pendingG = false;
        shortcut.action();
        showQuickToast(`Navigating to ${shortcut.description.replace('Go to ', '')}`);
        break;
      } else if (!shortcut.combo) {
        const ctrlMatch = !shortcut.ctrl || (e.ctrlKey || e.metaKey);
        if (e.key === shortcut.key && ctrlMatch) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    }
    
    if (pendingG && e.key.toLowerCase() !== 'g') pendingG = false;
  }, [shortcuts, navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Command Palette
  if (isCommandPaletteOpen) {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const ctrlKeyLabel = isMac ? '⌘' : 'Ctrl';
    return (
      <div 
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in"
        onClick={() => setCommandPaletteOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') setCommandPaletteOpen(false); }}
        role="dialog"
        aria-modal="true"
      >
        <div className="fixed left-1/2 top-20 -translate-x-1/2 w-full max-w-2xl bg-white rounded-lg shadow-2xl border animate-in slide-in-from-top" onClick={(e)=>e.stopPropagation()}>
          <div className="flex items-center border-b px-4">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Type to search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-4 outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setCommandPaletteOpen(false);
                  setSearchQuery('');
                }
              }}
            />
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {shortcuts.filter(s => s.description.toLowerCase().includes(searchQuery.toLowerCase()) || s.key.toLowerCase().includes(searchQuery.toLowerCase())).map((s, i) => {
              const Icon = s.icon;
              return (
                <button key={i} onClick={() => { s.action(); setCommandPaletteOpen(false); setSearchQuery(''); }}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-accent transition-colors">
                  <div className="flex items-center space-x-3">
                    {Icon && <Icon className="w-4 h-4" />}
                    <span className="text-sm">{s.description}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs">
                    {s.combo && <kbd className="px-1 py-0.5 bg-muted rounded">{s.combo}</kbd>}
                    {s.ctrl && <kbd className="px-1 py-0.5 bg-muted rounded">{ctrlKeyLabel}</kbd>}
                    <kbd className="px-1 py-0.5 bg-muted rounded">{s.key.toUpperCase()}</kbd>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Help Modal
  if (showHelp) {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const ctrlKeyLabel = isMac ? '⌘' : 'Ctrl';
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowHelp(false)} role="dialog" aria-modal="true">
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-2xl p-6" onClick={(e)=>e.stopPropagation()}>
          <h2 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h2>
          <div className="space-y-2">
            {shortcuts.map((s, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{s.description}</span>
                <div className="flex space-x-1">
                  {s.combo && <kbd className="px-1 py-0.5 bg-muted rounded text-xs">{s.combo}</kbd>}
                  {s.ctrl && <kbd className="px-1 py-0.5 bg-muted rounded text-xs">{ctrlKeyLabel}</kbd>}
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">{s.key.toUpperCase()}</kbd>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Toast Notification
  if (showToast) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-black/80 text-white rounded-lg animate-in slide-in-from-bottom">
        {showToast}
      </div>
    );
  }

  return null;
}
