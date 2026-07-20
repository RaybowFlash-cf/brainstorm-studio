'use client';

import { useCallback, useRef } from 'react';

interface TTSQueueItem {
  text: string;
  model: string;
  voiceId: string;
  latency: string;
  speed: number;
  fishKey?: string;
}

export function useTTSPlayer() {
  const queueRef = useRef<TTSQueueItem[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const interruptedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const splitIntoSentences = useCallback((text: string): string[] => {
    const sentences: string[] = [];
    const regex = /[^.!?]+[.!?]+/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      sentences.push(match[0].trim());
    }
    if (!sentences.length && text.trim()) {
      sentences.push(text.trim());
    } else {
      const lastSentence = sentences[sentences.length - 1];
      const lastEnd = text.indexOf(lastSentence) + lastSentence.length;
      const tail = text.slice(lastEnd).trim();
      if (tail) sentences.push(tail);
    }
    return sentences;
  }, []);

  const playAudio = useCallback(async (item: TTSQueueItem): Promise<void> => {
    if (interruptedRef.current) return;

    const resp = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: item.text.trim(),
        model: item.model,
        reference_id: item.voiceId || undefined,
        latency: item.latency,
        speed: item.speed,
        fishKey: item.fishKey || undefined,
      }),
    });

    if (!resp.ok || interruptedRef.current) return;

    const arrayBuf = await resp.arrayBuffer();
    const ac = getAudioCtx();
    const audioBuf = await ac.decodeAudioData(arrayBuf);
    const source = ac.createBufferSource();
    source.buffer = audioBuf;
    source.connect(ac.destination);
    currentSourceRef.current = source;

    return new Promise((resolve) => {
      source.onended = () => {
        currentSourceRef.current = null;
        resolve();
      };
      source.start();
    });
  }, [getAudioCtx]);

  const processQueue = useCallback(async () => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    while (queueRef.current.length > 0 && !interruptedRef.current) {
      const item = queueRef.current.shift()!;
      try {
        await playAudio(item);
      } catch {
        // skip failed items
      }
    }

    isPlayingRef.current = false;
  }, [playAudio]);

  const speak = useCallback((
    text: string,
    model: string,
    voiceId: string,
    latency: string,
    speed: number,
    fishKey?: string
  ) => {
    interruptedRef.current = false;
    const sentences = splitIntoSentences(text);
    for (const s of sentences) {
      queueRef.current.push({ text: s, model, voiceId, latency, speed, fishKey });
    }
    processQueue();
  }, [splitIntoSentences, processQueue]);

  const interrupt = useCallback(() => {
    interruptedRef.current = true;
    queueRef.current = [];
    if (currentSourceRef.current) {
      try { currentSourceRef.current.stop(); } catch {}
      currentSourceRef.current = null;
    }
    isPlayingRef.current = false;
  }, []);

  const repeat = useCallback((lastAIResponse: string, model: string, voiceId: string, latency: string, speed: number, fishKey?: string) => {
    interrupt();
    speak(lastAIResponse, model, voiceId, latency, speed, fishKey);
  }, [interrupt, speak]);

  return { speak, interrupt, repeat, isPlaying: isPlayingRef, interrupted: interruptedRef };
}
