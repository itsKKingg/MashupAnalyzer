import { useState, useRef } from 'react';
import { Download, Upload, Save, Trash2, Clock, Database } from 'lucide-react';
import { Track } from '../types/track';
import { exportLibraryAsJSON, importLibraryFromJSON, getLastSavedTime, SavedLibrary } from '../utils/localStorage';

interface SessionManagerProps {
  tracks: Track[];
  autoSave: boolean;
  onAutoSaveToggle: () => void;
  lastSaved: number | null;
  hasUnsavedChanges: boolean;
  onManualSave: () => void;
  onImport: (library: SavedLibrary) => void;
  onClearAll: () => void;
}

export function SessionManager({
  tracks,
  autoSave,
  onAutoSaveToggle,
  lastSaved,
  hasUnsavedChanges,
  onManualSave,
  onImport,
  onClearAll
}: SessionManagerProps) {
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportLibraryAsJSON(tracks);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportError(null);
      const library = await importLibraryFromJSON(file);
      onImport(library);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import library');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearAll = () => {
    onClearAll();
    setShowConfirmClear(false);
  };

  const analyzedCount = tracks.filter(t => !t.isAnalyzing && !t.error && t.bpm > 0).length;
  const lastSavedText = getLastSavedTime();

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Database className="text-gray-700" size={20} />
        <h3 className="font-semibold text-gray-900">Session Management</h3>
      </div>

      {/* Auto-save Toggle */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Auto-save</span>
          {lastSaved && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={12} />
              {lastSavedText}
            </span>
          )}
        </div>
        
        <button
          onClick={onAutoSaveToggle}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${autoSave ? 'bg-blue-600' : 'bg-gray-300'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${autoSave ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {/* Manual Save */}
        {!autoSave && (
          <button
            onClick={onManualSave}
            disabled={!hasUnsavedChanges || analyzedCount === 0}
            className={`
              flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
              ${hasUnsavedChanges && analyzedCount > 0
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <Save size={16} />
            Save Now
          </button>
        )}

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={analyzedCount === 0}
          className={`
            flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
            ${analyzedCount > 0
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <Download size={16} />
          Export JSON
        </button>

        {/* Import */}
        <button
          onClick={handleImportClick}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium text-sm transition-all"
        >
          <Upload size={16} />
          Import JSON
        </button>

        {/* Clear All */}
        {!showConfirmClear ? (
          <button
            onClick={() => setShowConfirmClear(true)}
            disabled={tracks.length === 0}
            className={`
              flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
              ${tracks.length > 0
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <Trash2 size={16} />
            Clear All
          </button>
        ) : (
          <div className="col-span-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700 mb-2 font-medium">
              Clear all {tracks.length} tracks?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleClearAll}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium"
              >
                Yes, Clear
              </button>
              <button
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Error */}
      {importError && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{importError}</p>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Status */}
      {analyzedCount > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            {analyzedCount} track{analyzedCount !== 1 ? 's' : ''} in library
            {hasUnsavedChanges && !autoSave && (
              <span className="text-orange-600 ml-2">• Unsaved changes</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}