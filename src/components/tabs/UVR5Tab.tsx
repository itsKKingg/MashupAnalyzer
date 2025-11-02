import { Mic, ExternalLink, Info } from 'lucide-react';

export function UVR5Tab() {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
            <Mic className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              UVR5 Vocal Remover
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Extract vocals, instruments, and stems from your audio files
            </p>
          </div>
        </div>
        <a
          href="https://huggingface.co/spaces/TheStinger/UVR5_UI"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          <ExternalLink size={16} />
          Open in New Tab
        </a>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex gap-3">
          <Info
            className="text-blue-600 dark:text-blue-400 flex-shrink-0"
            size={20}
          />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">How to use UVR5:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-300">
              <li>Upload your audio file in the interface below</li>
              <li>Select the separation model (MDX-Net for best quality)</li>
              <li>Click "Separate" and wait for processing</li>
              <li>Download the separated vocals and instrumentals</li>
              <li>Import stems into FL Studio for your mashup!</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Embedded UVR5 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
        <iframe
          src="https://thestinger-uvr5-ui.hf.space"
          width="100%"
          height="900px"
          frameBorder="0"
          className="w-full"
          title="UVR5 Vocal Remover"
        />
      </div>

      {/* Tips */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            💡 Pro Tip
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Use MDX-Net models for the best vocal separation quality
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            ⚡ Performance
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Processing may take 1-3 minutes depending on track length
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            🎵 FL Studio
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Import separated stems into FL Studio for advanced mashup creation
          </p>
        </div>
      </div>
    </div>
  );
}
