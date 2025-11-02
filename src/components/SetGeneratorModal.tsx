// src/components/SetGeneratorModal.tsx
// Modal for auto-generating DJ sets

import { useState } from 'react';
import { X, Zap, TrendingUp, Music, Loader, Download, Play } from 'lucide-react';
import { Track } from '../types/track';
import { generateSet, SetPreferences, GeneratedSet } from '../utils/setGenerator';
import { formatDuration, formatBPM, formatKey } from '../utils/formatters';
import { useDisplayPreferences } from '../hooks/useDisplayPreferences';

interface SetGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  onPlayTrack?: (track: Track) => void;
}

export function SetGeneratorModal({ isOpen, onClose, tracks, onPlayTrack }: SetGeneratorModalProps) {
  const { preferences: displayPrefs } = useDisplayPreferences();
  
  const [preferences, setPreferences] = useState<SetPreferences>({
    durationMinutes: 60,
    energyCurve: 'build',
    preferHarmonicMixing: true,
    allowGenreJumps: false,
    avoidBackToBackFolder: true,
    preferCrossFolderMashups: false,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSet, setGeneratedSet] = useState<GeneratedSet | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedSet(null);

    try {
      const result = await generateSet(tracks, preferences);
      setGeneratedSet(result);
    } catch (error) {
      console.error('Set generation failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate set');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    if (!generatedSet) return;

    const lines = [
      `# Auto-Generated DJ Set`,
      `# Duration: ${(generatedSet.totalDuration / 60).toFixed(1)} minutes`,
      `# Tracks: ${generatedSet.tracks.length}`,
      `# Average Transition Score: ${(generatedSet.averageScore * 100).toFixed(0)}%`,
      `# Generated: ${new Date().toLocaleString()}`,
      ``,
    ];

    generatedSet.tracks.forEach((track, i) => {
      lines.push(`${i + 1}. ${track.name}`);
      lines.push(`   BPM: ${track.bpm} | Key: ${track.key} | Energy: ${track.energy.toFixed(2)}`);
      
      if (i < generatedSet.transitions.length) {
        const trans = generatedSet.transitions[i];
        lines.push(`   → Transition: ${trans.mixPoint} (Score: ${(trans.score * 100).toFixed(0)}%)`);
      }
      
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dj-set-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Zap className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Auto-Generate Set</h2>
              <p className="text-sm text-purple-100">AI-powered set builder</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="text-white" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!generatedSet ? (
            <>
              {/* Preferences */}
              <div className="space-y-4">
                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Set Duration
                  </label>
                  <div className="flex gap-2">
                    {[30, 60, 90, 120].map(mins => (
                      <button
                        key={mins}
                        onClick={() => setPreferences(p => ({ ...p, durationMinutes: mins }))}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          preferences.durationMinutes === mins
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* Energy Curve */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Energy Curve
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'steady', label: 'Steady', desc: 'Consistent energy' },
                      { value: 'build', label: 'Build', desc: 'Warm-up → Peak' },
                      { value: 'rollercoaster', label: 'Rollercoaster', desc: 'Multiple peaks' },
                    ].map(curve => (
                      <button
                        key={curve.value}
                        onClick={() => setPreferences(p => ({ ...p, energyCurve: curve.value as any }))}
                        className={`p-3 rounded-lg text-left transition-colors ${
                          preferences.energyCurve === curve.value
                            ? 'bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-600 dark:border-purple-400'
                            : 'bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">{curve.label}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{curve.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-2">
                  {[
                    { key: 'preferHarmonicMixing', label: 'Prefer Harmonic Mixing', desc: 'Prioritize key compatibility' },
                    { key: 'avoidBackToBackFolder', label: 'Avoid Back-to-Back Folders', desc: 'Mix variety from different folders' },
                    { key: 'preferCrossFolderMashups', label: 'Prefer Cross-Folder', desc: 'Favor tracks from different folders' },
                  ].map(option => (
                    <label
                      key={option.key}
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={preferences[option.key as keyof SetPreferences] as boolean}
                        onChange={(e) => setPreferences(p => ({ ...p, [option.key]: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900 dark:text-white">{option.label}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || tracks.length < 2}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-3"
              >
                {isGenerating ? (
                  <>
                    <Loader className="animate-spin" size={24} />
                    <span>Generating Set...</span>
                  </>
                ) : (
                  <>
                    <Zap size={24} />
                    <span>Generate {preferences.durationMinutes}-Minute Set</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Generated Set Results */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-green-900 dark:text-green-100">
                      ✨ Set Generated Successfully!
                    </h3>
                    <div className="flex gap-4 text-sm text-green-700 dark:text-green-300 mt-1">
                      <span><strong>{generatedSet.tracks.length}</strong> tracks</span>
                      <span>•</span>
                      <span><strong>{(generatedSet.totalDuration / 60).toFixed(1)}</strong> minutes</span>
                      <span>•</span>
                      <span><strong>{(generatedSet.averageScore * 100).toFixed(0)}%</strong> avg transition score</span>
                    </div>
                  </div>
                  <button
                    onClick={handleExport}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Download size={16} />
                    Export
                  </button>
                </div>
              </div>

              {/* Energy Arc Visualization */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Energy Arc</h4>
                <div className="flex items-end gap-1 h-24">
                  {generatedSet.energyArc.map((energy, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-purple-600 to-pink-600 rounded-t"
                      style={{ height: `${energy * 100}%` }}
                      title={`Track ${i + 1}: ${(energy * 100).toFixed(0)}% energy`}
                    />
                  ))}
                </div>
              </div>

              {/* Track List */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Track List</h4>
                {generatedSet.tracks.map((track, i) => (
                  <div key={track.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-gray-900 dark:text-white truncate">{track.name}</h5>
                        <div className="flex gap-3 text-xs text-gray-600 dark:text-gray-400">
                          <span>{formatBPM(track.bpm, displayPrefs.bpmMode)}</span>
                          <span>•</span>
                          <span>{formatKey(track.key, displayPrefs.keyMode, displayPrefs.accidentalStyle)}</span>
                          <span>•</span>
                          <span>Energy: {(track.energy * 100).toFixed(0)}%</span>
                          <span>•</span>
                          <span>{formatDuration(track.duration)}</span>
                        </div>
                        {i < generatedSet.transitions.length && (
                          <div className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                            → Mix at {generatedSet.transitions[i].mixPoint} (Score: {(generatedSet.transitions[i].score * 100).toFixed(0)}%)
                          </div>
                        )}
                      </div>
                      {onPlayTrack && track.audioUrl && (
                        <button
                          onClick={() => onPlayTrack(track)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          <Play size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setGeneratedSet(null)}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
                >
                  Generate Another
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}