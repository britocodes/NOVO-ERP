// Create a single AudioContext to be reused
let audioCtx: AudioContext | null = null;
try {
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
} catch (e) {
  console.warn("Web Audio API is not supported in this browser.");
}

type SoundType = 'success' | 'duplicate' | 'error';

/**
 * Plays a specified sound type using the Web Audio API.
 * @param type The type of sound to play ('success', 'duplicate', 'error').
 */
export const playSound = (type: SoundType) => {
  if (!audioCtx) return;

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.01); // Quick fade in to avoid clicks

  switch (type) {
    case 'success':
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      break;
    case 'duplicate':
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);
      break;
    case 'error':
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
      break;
  }

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.1); // Duration of the tone
};
