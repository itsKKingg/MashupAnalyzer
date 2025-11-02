import { useState } from 'react';
import { FolderGroup } from '../types/track';
import { CheckSquare, Square, Trash2, Edit2, Check, X } from 'lucide-react';

interface FolderColumnProps {
  folder: FolderGroup;
  index: number;
  onToggle: (folderId: string) => void;
  onRemove: (folderId: string) => void;
  onRename: (folderId: string, newName: string) => void;
}

export function FolderColumn({ folder, index, onToggle, onRemove, onRename }: FolderColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);

  const analyzedTracks = folder.tracks.filter(t => !t.isAnalyzing && !t.error && t.bpm > 0);
  const analyzingCount = folder.tracks.filter(t => t.isAnalyzing).length;

  const handleSaveRename = () => {
    if (editName.trim()) {
      onRename(folder.id, editName.trim());
      setIsEditing(false);
    }
  };

  const handleCancelRename = () => {
    setEditName(folder.name);
    setIsEditing(false);
  };

  return (
    <div
      className="flex-shrink-0 w-80 bg-white dark:bg-gray-800 rounded-xl border-2 transition-all"
      style={{
        borderColor: folder.isSelected ? folder.color : '#e5e7eb',
      }}
    >
      {/* Header */}
      <div
        className="p-4 rounded-t-xl border-b border-gray-200 dark:border-gray-700"
        style={{
          backgroundColor: folder.isSelected ? `${folder.color}15` : 'transparent',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          {/* Checkbox & Name */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => onToggle(folder.id)}
              className="flex-shrink-0 hover:scale-110 transition-transform"
            >
              {folder.isSelected ? (
                <CheckSquare size={20} style={{ color: folder.color }} />
              ) : (
                <Square size={20} className="text-gray-400" />
              )}
            </button>

            {isEditing ? (
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename();
                    if (e.key === 'Escape') handleCancelRename();
                  }}
                  className="flex-1 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm"
                  autoFocus
                />
                <button
                  onClick={handleSaveRename}
                  className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                >
                  <Check size={16} className="text-green-600" />
                </button>
                <button
                  onClick={handleCancelRename}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                >
                  <X size={16} className="text-red-600" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h3
                  className="font-semibold truncate"
                  style={{
                    color: folder.isSelected ? folder.color : undefined,
                  }}
                >
                  {folder.name}
                </h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-shrink-0 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-opacity"
                >
                  <Edit2 size={14} className="text-gray-500" />
                </button>
              </div>
            )}
          </div>

          {/* Remove Button */}
          <button
            onClick={() => onRemove(folder.id)}
            className="flex-shrink-0 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
          >
            <Trash2 size={16} className="text-red-500" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
          <span>{folder.tracks.length} tracks</span>
          {analyzingCount > 0 && <span>• {analyzingCount} analyzing...</span>}
          {analyzedTracks.length > 0 && <span>• {analyzedTracks.length} ready</span>}
        </div>
      </div>

      {/* Track List */}
      <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
        {folder.tracks.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            No tracks
          </div>
        ) : (
          folder.tracks.map((track) => (
            <div
              key={track.id}
              className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div className="font-medium text-sm text-gray-900 dark:text-white truncate mb-1">
                {track.name}
              </div>

              {track.isAnalyzing ? (
                <div className="text-xs text-blue-600 dark:text-blue-400">Analyzing...</div>
              ) : track.error ? (
                <div className="text-xs text-red-600 dark:text-red-400">{track.error}</div>
              ) : (
                <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-semibold">{track.bpm} BPM</span>
                  <span>•</span>
                  <span className="font-semibold">{track.key}</span>
                  <span>•</span>
                  <span>{Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}