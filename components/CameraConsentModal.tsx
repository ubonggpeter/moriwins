'use client';
import { Camera } from 'lucide-react';

interface Props {
  onAccept: () => void;
  onCancel: () => void;
}

export default function CameraConsentModal({ onAccept, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Camera size={24} className="text-yellow-400 shrink-0" />
          <h2 className="text-white font-bold text-lg">Camera Required</h2>
        </div>
        <p className="text-white/60 text-sm mb-3">
          Earning mode games require camera monitoring to ensure fair play. A small camera feed will appear in the corner while you play.
        </p>
        <ul className="text-white/40 text-xs space-y-1 mb-6">
          <li>• Your face must remain visible during gameplay</li>
          <li>• Switching tabs for 10+ seconds triggers a warning</li>
          <li>• 3 warnings will end the game as a loss</li>
          <li>• Camera feed stays on your device</li>
        </ul>
        <div className="flex gap-3">
          <button
            className="flex-1 border border-white/10 text-white/50 py-3 rounded-xl text-sm hover:text-white/70 transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="flex-1 bg-yellow-400 text-black font-bold py-3 rounded-xl text-sm"
            onClick={onAccept}
          >
            Allow Camera
          </button>
        </div>
      </div>
    </div>
  );
}
