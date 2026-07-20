export interface STTResult {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export type STTCallback = (result: STTResult) => void;
export type STTEndCallback = () => void;
export type STTErrorCallback = (error: string) => void;

export interface STTManager {
  start: () => Promise<void>;
  stop: () => void;
  abort: () => void;
  isSupported: () => boolean;
}

export function checkMicSupport(): { ok: boolean; msg?: string } {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { ok: false, msg: 'getUserMedia not supported' };
  }

  const w = window as any;
  const SpeechRecognitionClass = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SpeechRecognitionClass) {
    return { ok: false, msg: 'Web Speech API not supported' };
  }

  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    return { ok: false, msg: 'Microphone requires HTTPS' };
  }

  return { ok: true };
}

export function createSTTManager(
  lang: string,
  onResult: STTCallback,
  onEnd: STTEndCallback,
  onError: STTErrorCallback,
  maxRestarts: number = 200
): STTManager {
  let recognition: any = null;
  let mediaStream: MediaStream | null = null;
  let micAlwaysOn = false;
  let restartCount = 0;
  let finalText = '';

  const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  async function start() {
    if (recognition) {
      try { recognition.abort(); } catch {}
      recognition = null;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });
    } catch (e: any) {
      let msg = 'Microphone permission denied';
      if (e.name === 'NotAllowedError') msg = 'Microphone permission denied. Click the lock icon in the address bar.';
      else if (e.name === 'NotFoundError') msg = 'No microphone found';
      else if (e.name === 'NotReadableError') msg = 'Microphone in use by another app';
      else msg = `Error: ${e.message}`;
      onError(msg);
      throw e;
    }

    const rec = new SpeechRecognitionClass();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    restartCount = 0;
    finalText = '';
    micAlwaysOn = true;

    rec.onresult = (ev: any) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const transcript = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) {
          finalText += transcript;
          onResult({
            text: finalText,
            isFinal: true,
            confidence: ev.results[i][0].confidence,
          });
        } else {
          interim += transcript;
          onResult({
            text: interim,
            isFinal: false,
            confidence: ev.results[i][0].confidence,
          });
        }
      }
    };

    rec.onerror = (ev: any) => {
      if (ev.error === 'no-speech') return;
      if (ev.error === 'aborted') return;
      onError(`STT error: ${ev.error}`);
    };

    rec.onend = () => {
      if (micAlwaysOn && restartCount < maxRestarts) {
        restartCount++;
        setTimeout(() => {
          if (micAlwaysOn) {
            try { rec.start(); } catch {
              micAlwaysOn = false;
              onEnd();
            }
          }
        }, 100);
        return;
      }
      onEnd();
    };

    recognition = rec;
    rec.start();
  }

  function stop() {
    micAlwaysOn = false;
    if (recognition) {
      try { recognition.abort(); } catch {}
      recognition = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
    onEnd();
  }

  function abort() {
    micAlwaysOn = false;
    if (recognition) {
      try { recognition.abort(); } catch {}
      recognition = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
  }

  return {
    start: async () => await start(),
    stop,
    abort,
    isSupported: () => checkMicSupport().ok,
  };
}
