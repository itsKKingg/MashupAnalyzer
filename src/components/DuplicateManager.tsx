// src/components/DuplicateManager.tsx
// ✅ NEW: Help users identify and remove duplicate tracks

import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { Track } from '../types/track';
import { findDuplicates } from '../utils/mashupOptimizer';

interface DuplicateManagerProps {
  tracks: Track[];
  onRemoveTracks: (trackIds: string[]) => void;
  onClose: () => void;
}

export function DuplicateManager({ tracks, onRemoveTracks, onClose }: DuplicateManagerProps) {
  const duplicateGroups = findDuplicates(tracks);

  const handleRemoveDuplicates = (group: Track[], keepIndex: number) => {
    const toRemove = group
      .filter((_, index) => index !== keepIndex)
      .map(t => t.id);
    
    if (toRemove.length > 0) {
      const confirmed = window.confirm(
        `Remove ${toRemove.length} duplicate track${toRemove.length !== 1 ? 's' : ''}?\n\n` +
        `Keeping: ${group[keepIndex].name}`
      );
      
      if (confirmed) {
        onRemoveTracks(toRemove);
      }
    }
  };

  const handleRemoveAllDuplicates = () => {
    const allToRemove: string[] = [];
    
    duplicateGroups.forEach(group => {
      // Keep the first one, remove the rest
      group.slice(1).forEach(t => allToRemove.push(t.id));
    });

    if (allToRemove.length > 0) {
      const confirmed = window.confirm(
        `Remove ${allToRemove.length} duplicate tracks?\n\n` +
        `This will keep the first occurrence of each duplicate and remove the rest.`
      );
      
      if (confirmed) {
        onRemoveTracks(allToRemove);
        onClose();
      }
    }
  };

  if (duplicateGroups.size === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-green-600 dark:text-green-400" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No Duplicates Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your library looks clean! No duplicate or similar tracks detected.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Duplicate Tracks Manager
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {duplicateGroups.size} group{duplicateGroups.size !== 1 ? 's' : ''} of duplicates found
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {Array.from(duplicateGroups.entries()).map(([key, group]) => (
            <div
              key={key}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {group.length} similar tracks
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {group[0].bpm.toFixed(1)} BPM • {group[0].key}
                </span>
              </div>

              <div className="space-y-2">
                {group.map((track, index) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {track.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {track.folderName || 'No folder'} • {(track.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveDuplicates(group, index)}
                      className="ml-3 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                      title="Keep this one, remove others"
                    >
                      <Trash2 size={14} />
                      Keep This
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <p className="text-sm text-gray-600 