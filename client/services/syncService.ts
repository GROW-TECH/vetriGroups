import { offlineStorageService, SyncOperation } from './offlineStorageService';
import { EmployeesService } from '@/firebaseServices/employeesService';
import { ClientsService } from '@/firebaseServices/clientsService';
import { MaterialsService } from '@/firebaseServices/materialsService';
import { VendorsService } from '@/firebaseServices/vendorsService';
import { MaterialOrdersService } from '@/firebaseServices/materialOrdersService';

interface SyncResult {
  success: boolean;
  syncedOperations: number;
  failedOperations: number;
  errors: string[];
}

class SyncService {
  private isSyncing = false;
  private syncCallbacks: ((result: SyncResult) => void)[] = [];

  // Register callback for sync completion
  onSyncComplete(callback: (result: SyncResult) => void): void {
    this.syncCallbacks.push(callback);
  }

  // Remove sync callback
  removeSyncCallback(callback: (result: SyncResult) => void): void {
    const index = this.syncCallbacks.indexOf(callback);
    if (index > -1) {
      this.syncCallbacks.splice(index, 1);
    }
  }

  // Notify all callbacks
  private notifyCallbacks(result: SyncResult): void {
    this.syncCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Sync callback error:', error);
      }
    });
  }

  // Main sync function
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        syncedOperations: 0,
        failedOperations: 0,
        errors: ['Sync already in progress']
      };
    }

    this.isSyncing = true;
    console.log('🔄 Starting offline sync...');

    const result: SyncResult = {
      success: true,
      syncedOperations: 0,
      failedOperations: 0,
      errors: []
    };

    try {
      const isOnline = await offlineStorageService.isOnline();
      if (!isOnline) {
        result.success = false;
        result.errors.push('No internet connection');
        return result;
      }

      const operations = await offlineStorageService.getRetryableOperations();
      console.log(`Found ${operations.length} operations to sync`);

      for (const operation of operations) {
        try {
          await this.syncOperation(operation);
          await offlineStorageService.removeFromSyncQueue(operation.id);
          result.syncedOperations++;
          console.log(`✅ Synced ${operation.type} operation for ${operation.collection}`);
        } catch (error) {
          console.error(`❌ Failed to sync operation ${operation.id}:`, error);
          result.failedOperations++;
          result.errors.push(`Failed to sync ${operation.type} for ${operation.collection}: ${error}`);
          
          // Increment retry count
          await offlineStorageService.incrementRetryCount(operation.id);
        }
      }

      // Update last sync timestamp
      await offlineStorageService.updateLastSync();

      console.log(`🏁 Sync complete: ${result.syncedOperations} synced, ${result.failedOperations} failed`);

    } catch (error) {
      console.error('Sync failed:', error);
      result.success = false;
      result.errors.push(`Sync failed: ${error}`);
    } finally {
      this.isSyncing = false;
      this.notifyCallbacks(result);
    }

    return result;
  }

  // Sync individual operation
  private async syncOperation(operation: SyncOperation): Promise<void> {
    const { type, collection, data } = operation;

    switch (collection) {
      case 'employees':
        await this.syncEmployee(type, data);
        break;
      case 'clients':
        await this.syncClient(type, data);
        break;
      case 'materials':
        await this.syncMaterial(type, data);
        break;
      case 'vendors':
        await this.syncVendor(type, data);
        break;
      case 'materialOrders':
        await this.syncMaterialOrder(type, data);
        break;
      case 'attendance':
        await this.syncAttendance(type, data);
        break;
      default:
        throw new Error(`Unknown collection: ${collection}`);
    }
  }

  // Sync employee operations
  private async syncEmployee(type: string, data: any): Promise<void> {
    switch (type) {
      case 'create':
        await EmployeesService.add(data);
        break;
      case 'update':
        await EmployeesService.update(data.id, data);
        break;
      case 'delete':
        await EmployeesService.delete(data.id);
        break;
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  // Sync client operations
  private async syncClient(type: string, data: any): Promise<void> {
    switch (type) {
      case 'create':
        await ClientsService.add(data);
        break;
      case 'update':
        await ClientsService.update(data.id, data);
        break;
      case 'delete':
        await ClientsService.delete(data.id);
        break;
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  // Sync material operations
  private async syncMaterial(type: string, data: any): Promise<void> {
    switch (type) {
      case 'create':
        await MaterialsService.add(data);
        break;
      case 'update':
        await MaterialsService.update(data.id, data);
        break;
      case 'delete':
        await MaterialsService.delete(data.id);
        break;
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  // Sync vendor operations
  private async syncVendor(type: string, data: any): Promise<void> {
    switch (type) {
      case 'create':
        await VendorsService.add(data);
        break;
      case 'update':
        await VendorsService.update(data.id, data);
        break;
      case 'delete':
        await VendorsService.delete(data.id);
        break;
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  // Sync material order operations
  private async syncMaterialOrder(type: string, data: any): Promise<void> {
    switch (type) {
      case 'create':
        await MaterialOrdersService.add(data);
        break;
      case 'update':
        await MaterialOrdersService.update(data.id, data);
        break;
      case 'delete':
        await MaterialOrdersService.delete(data.id);
        break;
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  // Sync attendance operations (stored locally, might need different handling)
  private async syncAttendance(type: string, data: any): Promise<void> {
    // Attendance is typically stored locally and synced differently
    // For now, we'll just log it - you might want to implement a separate attendance sync
    console.log('Attendance sync operation:', type, data);
    // TODO: Implement attendance sync logic
  }

  // Auto-sync when network is available
  async autoSync(): Promise<void> {
    const isOnline = await offlineStorageService.isOnline();
    if (isOnline) {
      console.log('🌐 Network available, starting auto-sync');
      await this.syncAll();
    } else {
      console.log('📴 No network, skipping auto-sync');
    }
  }

  // Force sync regardless of network status
  async forceSync(): Promise<SyncResult> {
    return await this.syncAll();
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    queueLength: number;
    lastSync: number;
    isSyncing: boolean;
  }> {
    const [isOnline, queueLength, lastSync] = await Promise.all([
      offlineStorageService.isOnline(),
      offlineStorageService.getSyncQueue().then(queue => queue.length),
      offlineStorageService.getLastSync()
    ]);

    return {
      isOnline,
      queueLength,
      lastSync,
      isSyncing: this.isSyncing
    };
  }

  // Clear failed operations (retry count >= 3)
  async clearFailedOperations(): Promise<number> {
    try {
      const queue = await offlineStorageService.getSyncQueue();
      const failedOps = queue.filter(op => op.retryCount >= 3);
      
      for (const op of failedOps) {
        await offlineStorageService.removeFromSyncQueue(op.id);
      }
      
      console.log(`Cleared ${failedOps.length} failed operations`);
      return failedOps.length;
    } catch (error) {
      console.error('Failed to clear failed operations:', error);
      return 0;
    }
  }
}

export const syncService = new SyncService();
