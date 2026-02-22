import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getRuntimeEnv } from '../config/env';
import { getFirebaseStorage } from './firebase';

interface InvokeLLMInput {
  prompt: string;
  add_context_from_internet?: boolean;
}

function normalizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export class FirebaseIntegrationService {
  async invokeLLM(input: InvokeLLMInput): Promise<string> {
    const env = getRuntimeEnv();
    const endpoint = env.VITE_AI_ENDPOINT_URL?.trim();

    if (!endpoint) {
      throw new Error('AI endpoint is not configured. Set VITE_AI_ENDPOINT_URL.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (env.VITE_AI_ENDPOINT_TOKEN) {
      headers.Authorization = `Bearer ${env.VITE_AI_ENDPOINT_TOKEN}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(input)
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        typeof payload === 'object' && payload && 'message' in payload
          ? String((payload as { message: string }).message)
          : `AI endpoint error (${response.status})`;
      throw new Error(message);
    }

    if (typeof payload === 'string') {
      return payload;
    }

    if (typeof payload === 'object' && payload && 'response' in payload && typeof payload.response === 'string') {
      return payload.response;
    }

    return JSON.stringify(payload);
  }

  async uploadFile(file: File): Promise<string> {
    const storage = getFirebaseStorage();
    const safeName = normalizeFileName(file.name);
    const key = `uploads/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, key);
    await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' });
    return getDownloadURL(storageRef);
  }
}
