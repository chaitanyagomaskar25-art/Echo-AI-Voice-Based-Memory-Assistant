import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const QUEUE_STORAGE_KEY = '@echo_offline_queue_v1';
const DRAFTS_STORAGE_KEY = '@echo_memory_drafts_v1';
const OFFLINE_AUDIO_DIR = `${FileSystem.documentDirectory}offline_recordings/`;

class OfflineStorageService {
  constructor() {
    this.initDirectory();
  }

  /**
   * Ensure persistent directory for offline audio recordings exists
   */
  async initDirectory() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(OFFLINE_AUDIO_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(OFFLINE_AUDIO_DIR, { intermediates: true });
      }
    } catch (err) {
      console.warn('[OfflineStorage] Error initializing directory:', err.message);
    }
  }

  /**
   * Safely copies temporary audio recording into persistent app storage
   */
  async persistAudioFile(tempUri, localId) {
    try {
      await this.initDirectory();
      const ext = tempUri.split('.').pop() || 'm4a';
      const targetPath = `${OFFLINE_AUDIO_DIR}${localId}.${ext}`;

      // Check source file
      const sourceInfo = await FileSystem.getInfoAsync(tempUri);
      if (!sourceInfo.exists) {
        throw new Error('Temporary recording file not found at ' + tempUri);
      }

      await FileSystem.copyAsync({
        from: tempUri,
        to: targetPath,
      });

      return targetPath;
    } catch (err) {
      console.warn('[OfflineStorage] Error persisting audio file:', err.message);
      return tempUri; // Fallback to current URI if copy fails
    }
  }

  /**
   * Load entire offline sync queue from AsyncStorage
   */
  async getQueue() {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.warn('[OfflineStorage] Error reading queue:', err.message);
      return [];
    }
  }

  /**
   * Save queue to AsyncStorage
   */
  async saveQueue(queue) {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.warn('[OfflineStorage] Error saving queue:', err.message);
    }
  }

  /**
   * Enqueue a new voice recording created while offline
   */
  async enqueueRecording({ uri, duration, transcript, title, category, language = 'en' }) {
    const localId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const persistentUri = await this.persistAudioFile(uri, localId);

    const item = {
      localId,
      idempotencyKey: localId,
      type: 'voice_recording',
      uri: persistentUri,
      duration: duration || 0,
      transcript: transcript || '',
      title: title || 'Offline Voice Note',
      category: category || 'Personal',
      language,
      status: 'pending', // 'pending' | 'uploading' | 'failed' | 'synced'
      retryCount: 0,
      lastError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const queue = await this.getQueue();
    queue.unshift(item);
    await this.saveQueue(queue);

    return item;
  }

  /**
   * Update state of a queue item
   */
  async updateQueueItem(localId, updates) {
    const queue = await this.getQueue();
    const index = queue.findIndex((i) => i.localId === localId);
    if (index !== -1) {
      queue[index] = {
        ...queue[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await this.saveQueue(queue);
      return queue[index];
    }
    return null;
  }

  /**
   * Remove item from queue and delete local audio file
   * STRICT REQUIREMENT: Only called AFTER server confirms 200/201 successful persistence!
   */
  async confirmAndRemoveItem(localId) {
    const queue = await this.getQueue();
    const item = queue.find((i) => i.localId === localId);

    if (item && item.uri) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(item.uri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(item.uri, { idempotent: true });
        }
      } catch (err) {
        console.warn('[OfflineStorage] Cleanup audio error:', err.message);
      }
    }

    const filtered = queue.filter((i) => i.localId !== localId);
    await this.saveQueue(filtered);
    return filtered;
  }

  /**
   * Save a text draft memory offline
   */
  async saveDraft(draft) {
    const draftId = draft.id || `draft_${Date.now()}`;
    const newDraft = {
      ...draft,
      id: draftId,
      updatedAt: new Date().toISOString(),
    };

    const drafts = await this.getDrafts();
    const existingIdx = drafts.findIndex((d) => d.id === draftId);
    if (existingIdx !== -1) {
      drafts[existingIdx] = newDraft;
    } else {
      drafts.unshift(newDraft);
    }

    await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    return newDraft;
  }

  /**
   * Retrieve all saved drafts
   */
  async getDrafts() {
    try {
      const raw = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  /**
   * Delete draft
   */
  async deleteDraft(draftId) {
    const drafts = await this.getDrafts();
    const filtered = drafts.filter((d) => d.id !== draftId);
    await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  }
}

export const offlineStorageService = new OfflineStorageService();
export default offlineStorageService;
