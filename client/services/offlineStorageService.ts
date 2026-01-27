import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface OfflineData {
  [key: string]: any;
}

class OfflineStorageService {
  private readonly SYNC_QUEUE_KEY = '@erp_sync_queue';
  private readonly LAST_SYNC_KEY = '@erp_last_sync';
  private readonly OFFLINE_PREFIX = '@erp_offline_';

  // Network connectivity monitoring
  async isOnline(): Promise<boolean> {
    try {
      const netInfo = await NetInfo.fetch();
      return netInfo.isConnected === true && netInfo.isInternetReachable === true;
    } catch (error) {
      console.warn('Network check failed:', error);
      return false;
    }
  }

  // Add operation to sync queue
  async addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      const syncOp: SyncOperation = {
        ...operation,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };
      
      queue.push(syncOp);
      await AsyncStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
      console.log('Added to sync queue:', syncOp.type, operation.collection);
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
    }
  }

  // Get sync queue
  async getSyncQueue(): Promise<SyncOperation[]> {
    try {
      const queue = await AsyncStorage.getItem(this.SYNC_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return [];
    }
  }

  // Remove operation from sync queue
  async removeFromSyncQueue(operationId: string): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      const filtered = queue.filter(op => op.id !== operationId);
      await AsyncStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove from sync queue:', error);
    }
  }

  // Clear sync queue
  async clearSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.SYNC_QUEUE_KEY);
    } catch (error) {
      console.error('Failed to clear sync queue:', error);
    }
  }

  // Get last sync timestamp
  async getLastSync(): Promise<number> {
    try {
      const lastSync = await AsyncStorage.getItem(this.LAST_SYNC_KEY);
      return lastSync ? parseInt(lastSync, 10) : 0;
    } catch (error) {
      console.error('Failed to get last sync:', error);
      return 0;
    }
  }

  // Update last sync timestamp
  async updateLastSync(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.LAST_SYNC_KEY, Date.now().toString());
    } catch (error) {
      console.error('Failed to update last sync:', error);
    }
  }

  // Store data offline
  async storeOffline(collection: string, data: any[]): Promise<void> {
    try {
      const key = `${this.OFFLINE_PREFIX}${collection}`;
      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`Stored ${data.length} items offline for ${collection}`);
    } catch (error) {
      console.error(`Failed to store ${collection} offline:`, error);
    }
  }

  // Get offline data
  async getOffline(collection: string): Promise<any[]> {
    try {
      const key = `${this.OFFLINE_PREFIX}${collection}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Failed to get offline ${collection}:`, error);
      return [];
    }
  }

  // Store single item offline
  async storeOfflineItem(collection: string, item: any): Promise<void> {
    try {
      const data = await this.getOffline(collection);
      const existingIndex = data.findIndex((existing: any) => existing.id === item.id);
      
      if (existingIndex >= 0) {
        data[existingIndex] = item;
      } else {
        data.push(item);
      }
      
      await this.storeOffline(collection, data);
    } catch (error) {
      console.error(`Failed to store offline item for ${collection}:`, error);
    }
  }

  // Remove item from offline storage
  async removeOfflineItem(collection: string, itemId: string): Promise<void> {
    try {
      const data = await this.getOffline(collection);
      const filtered = data.filter((item: any) => item.id !== itemId);
      await this.storeOffline(collection, filtered);
    } catch (error) {
      console.error(`Failed to remove offline item from ${collection}:`, error);
    }
  }

  // Get operations that need to be retried (retry count < 3 and older than 5 minutes)
  async getRetryableOperations(): Promise<SyncOperation[]> {
    try {
      const queue = await this.getSyncQueue();
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      
      return queue.filter(op => 
        op.retryCount < 3 && op.timestamp < fiveMinutesAgo
      );
    } catch (error) {
      console.error('Failed to get retryable operations:', error);
      return [];
    }
  }

  // Increment retry count for operation
  async incrementRetryCount(operationId: string): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      const operation = queue.find(op => op.id === operationId);
      
      if (operation) {
        operation.retryCount++;
        operation.timestamp = Date.now(); // Update timestamp for retry delay
        await AsyncStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (error) {
      console.error('Failed to increment retry count:', error);
    }
  }

  // Clear all offline data (for testing or reset)
  async clearAllOfflineData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(key => 
        key.startsWith(this.OFFLINE_PREFIX) || 
        key === this.SYNC_QUEUE_KEY || 
        key === this.LAST_SYNC_KEY
      );
      
      await AsyncStorage.multiRemove(offlineKeys);
      console.log('Cleared all offline data');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }

  // Get storage usage statistics
  async getStorageStats(): Promise<{ [key: string]: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(key => key.startsWith(this.OFFLINE_PREFIX));
      const stats: { [key: string]: number } = {};
      
      for (const key of offlineKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const collection = key.replace(this.OFFLINE_PREFIX, '');
          stats[collection] = JSON.parse(data).length;
        }
      }
      
      const queue = await this.getSyncQueue();
      stats['syncQueue'] = queue.length;
      
      return stats;
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {};
    }
  }
}

export const offlineStorageService = new OfflineStorageService();
