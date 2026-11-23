import NetInfo from '@react-native-community/netinfo';
import offlineStorageService from './offlineStorageService';
import audioApi from '../api/audioApi';
import memoryApi from '../api/memoryApi';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.isOnline = true;
    this.listeners = new Set();
    this.unsubscribeNetInfo = null;
  }

  /**
   * Subscribe to network changes and automatically sync when online
   */
  init(onStateChange) {
    if (onStateChange) {
      this.listeners.add(onStateChange);
    }

    if (!this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
        const online = !!(state.isConnected && state.isInternetReachable !== false);
        const wasOffline = !this.isOnline;
        this.isOnline = online;

        this.notifyListeners({
          isOnline: this.isOnline,
          isSyncing: this.isSyncing,
        });

        // Auto-sync when connectivity returns
        if (online && wasOffline) {
          console.log('[SyncService] Connectivity restored. Automatically retrying pending uploads...');
          this.syncPendingQueue();
        }
      });

      // Check initial state
      NetInfo.fetch().then((state) => {
        this.isOnline = !!(state.isConnected && state.isInternetReachable !== false);
        this.notifyListeners({
          isOnline: this.isOnline,
          isSyncing: this.isSyncing,
        });
      });
    }
  }

  notifyListeners(data) {
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (e) {
        console.warn('[SyncService] Listener error:', e.message);
      }
    });
  }

  /**
   * Process all pending or failed recordings in the offline queue
   */
  async syncPendingQueue(dispatch) {
    if (this.isSyncing) return { inProgress: true };

    const netState = await NetInfo.fetch();
    const canConnect = !!(netState.isConnected && netState.isInternetReachable !== false);

    if (!canConnect) {
      this.isOnline = false;
      this.notifyListeners({ isOnline: false, isSyncing: false });
      return { offline: true };
    }

    this.isSyncing = true;
    this.notifyListeners({ isOnline: true, isSyncing: true });

    const queue = await offlineStorageService.getQueue();
    const itemsToSync = queue.filter((i) => i.status === 'pending' || i.status === 'failed');

    let syncedCount = 0;
    let failedCount = 0;

    for (const item of itemsToSync) {
      try {
        await offlineStorageService.updateQueueItem(item.localId, {
          status: 'uploading',
          lastError: null,
        });

        // 1. Voice recording sync
        if (item.type === 'voice_recording') {
          const res = await audioApi.uploadAudio({
            uri: item.uri,
            duration: item.duration,
            transcript: item.transcript,
            title: item.title,
            category: item.category,
            language: item.language || 'en',
            clientLocalId: item.localId,
            idempotencyKey: item.idempotencyKey || item.localId,
            saveImmediately: true,
          });

          if (res.data?.success || res.status === 200 || res.status === 201) {
            // NEVER delete unsynced recordings before confirming successful server-side storage!
            await offlineStorageService.confirmAndRemoveItem(item.localId);
            syncedCount += 1;
          } else {
            throw new Error(res.data?.message || 'Server did not confirm storage.');
          }
        } else if (item.type === 'draft_memory') {
          // 2. Draft text memory sync
          const res = await memoryApi.create({
            title: item.title,
            transcript: item.transcript,
            category: item.category,
            clientLocalId: item.localId,
            idempotencyKey: item.idempotencyKey || item.localId,
          });

          if (res.data?.success || res.status === 200 || res.status === 201) {
            await offlineStorageService.confirmAndRemoveItem(item.localId);
            syncedCount += 1;
          } else {
            throw new Error('Draft sync failed');
          }
        }
      } catch (err) {
        failedCount += 1;
        console.warn(`[SyncService] Failed syncing item ${item.localId}:`, err.message);
        await offlineStorageService.updateQueueItem(item.localId, {
          status: 'failed',
          retryCount: (item.retryCount || 0) + 1,
          lastError: err.response?.data?.message || err.message || 'Network upload error',
        });
      }
    }

    this.isSyncing = false;
    this.notifyListeners({
      isOnline: this.isOnline,
      isSyncing: false,
      syncedCount,
      failedCount,
      lastSyncedAt: new Date().toISOString(),
    });

    const updatedQueue = await offlineStorageService.getQueue();
    return {
      syncedCount,
      failedCount,
      remainingCount: updatedQueue.length,
      queue: updatedQueue,
    };
  }

  /**
   * Manually retry a specific failed upload item
   */
  async retryItem(localId) {
    const queue = await offlineStorageService.getQueue();
    const item = queue.find((i) => i.localId === localId);
    if (!item) return { success: false, message: 'Item not found in offline queue' };

    await offlineStorageService.updateQueueItem(localId, {
      status: 'pending',
      lastError: null,
    });

    return this.syncPendingQueue();
  }

  cleanup() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    this.listeners.clear();
  }
}

export const syncService = new SyncService();
export default syncService;
