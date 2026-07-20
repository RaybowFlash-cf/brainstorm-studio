export interface Voice {
  _id: string;
  title: string;
  name?: string;
  accent?: string;
  description?: string;
  preview_url?: string;
}

export async function fetchVoices(fishApiKey?: string): Promise<Voice[]> {
  const url = fishApiKey
    ? `/api/voices?key=${encodeURIComponent(fishApiKey)}`
    : '/api/voices';

  const resp = await fetch(url);
  const data = await resp.json();
  return data.items || data.data || [];
}

export async function cloneVoice(params: {
  audio: File;
  title: string;
  description?: string;
  text?: string;
  fishKey?: string;
}): Promise<{ _id: string; title: string }> {
  const formData = new FormData();
  formData.append('audio', params.audio);
  formData.append('title', params.title);
  if (params.description) formData.append('description', params.description);
  if (params.text) formData.append('text', params.text);
  if (params.fishKey) formData.append('key', params.fishKey);

  const resp = await fetch('/api/voice-clone', {
    method: 'POST',
    body: formData,
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Clone failed');
  return data;
}
