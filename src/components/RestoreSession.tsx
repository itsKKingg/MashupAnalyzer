import { Clock, XCircle } from 'lucide-react';
import { SavedLibrary } from '../utils/localStorage';

interface RestoreSessionProps {
  savedLibrary: SavedLibrary;
  onRestore: () => void;
  onDismiss: () => void;
}

export function RestoreSession({
  savedLibrary,
  onRestore,
  onDismiss,
}: RestoreSessionProps) {
  const savedDate = new Date(savedLibrary.savedAt);
  const trackCount = savedLibrary.tracks.length;

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-8">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={24} />
            <h3 className="text-xl font-bold">Previous Session Found</h3>
          </div>

          <p className="text-blue-100 mb-4">
            You have {trackCount} track{trackCount !== 1 ? 's' : ''} saved from{' '}
            {savedDate.toLocaleDateString()} at {savedDate.toLocaleTimeString()}
          </p>

          <p className="text-sm text-blue-100 mb-4">
            Note: Audio files are not saved. You'll see track info but won't be
            able to preview audio until you re-upload the files.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onRestore}
              className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-2 rounded-lg font-semibold transition-all"
            >
              Restore Session
            </button>
            <button
              onClick={onDismiss}
              className="bg-white/20 hover:bg-white/30 px-6 py-2 rounded-lg font-semibold transition-all"
            >
              Start Fresh
            </button>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-white/80 hover:text-white transition-colors ml-4"
        >
          <XCircle size={24} />
        </button>
      </div>
    </div>
  );
}
