import { Employee, Client, Material, Vendor, MaterialOrder, AttendanceRecord } from '@/types';

export interface ConflictResolution {
  strategy: 'local_wins' | 'remote_wins' | 'merge' | 'manual';
  reason?: string;
}

export interface DataConflict {
  id: string;
  collection: string;
  localData: any;
  remoteData: any;
  conflictType: 'update' | 'delete' | 'create';
  timestamp: number;
}

class ConflictResolutionService {
  
  // Detect conflicts between local and remote data
  detectConflicts<T extends { id: string; updatedAt?: string; lastModified?: string }>(
    collection: string,
    localData: T[],
    remoteData: T[],
    lastSyncTime: number
  ): DataConflict[] {
    const conflicts: DataConflict[] = [];
    const localMap = new Map(localData.map(item => [item.id, item]));
    const remoteMap = new Map(remoteData.map(item => [item.id, item]));

    // Check for conflicts in updated items
    for (const [id, localItem] of localMap) {
      const remoteItem = remoteMap.get(id);
      
      if (!remoteItem) {
        // Local item exists but remote doesn't - might be a create conflict
        if (this.isItemModifiedAfter(localItem, lastSyncTime)) {
          conflicts.push({
            id,
            collection,
            localData: localItem,
            remoteData: null,
            conflictType: 'create',
            timestamp: Date.now(),
          });
        }
      } else {
        // Both exist - check for update conflicts
        if (this.hasUpdateConflict(localItem, remoteItem, lastSyncTime)) {
          conflicts.push({
            id,
            collection,
            localData: localItem,
            remoteData: remoteItem,
            conflictType: 'update',
            timestamp: Date.now(),
          });
        }
      }
    }

    // Check for delete conflicts (remote has item that local doesn't)
    for (const [id, remoteItem] of remoteMap) {
      if (!localMap.has(id) && this.isItemModifiedAfter(remoteItem, lastSyncTime)) {
        conflicts.push({
          id,
          collection,
          localData: null,
          remoteData: remoteItem,
          conflictType: 'delete',
          timestamp: Date.now(),
        });
      }
    }

    return conflicts;
  }

  // Check if item was modified after last sync
  private isItemModifiedAfter(item: any, lastSyncTime: number): boolean {
    const itemTime = this.getItemTimestamp(item);
    return itemTime > lastSyncTime;
  }

  // Get timestamp from item
  private getItemTimestamp(item: any): number {
    if (item.updatedAt) {
      return new Date(item.updatedAt).getTime();
    }
    if (item.lastModified) {
      return new Date(item.lastModified).getTime();
    }
    if (item.timestamp) {
      return item.timestamp;
    }
    return 0;
  }

  // Check if there's an update conflict
  private hasUpdateConflict(localItem: any, remoteItem: any, lastSyncTime: number): boolean {
    const localModified = this.isItemModifiedAfter(localItem, lastSyncTime);
    const remoteModified = this.isItemModifiedAfter(remoteItem, lastSyncTime);
    
    // Conflict if both were modified after last sync
    return localModified && remoteModified;
  }

  // Resolve conflicts based on strategy
  async resolveConflict(
    conflict: DataConflict,
    strategy: ConflictResolution
  ): Promise<any> {
    switch (strategy.strategy) {
      case 'local_wins':
        return this.resolveLocalWins(conflict);
      
      case 'remote_wins':
        return this.resolveRemoteWins(conflict);
      
      case 'merge':
        return this.resolveMerge(conflict);
      
      case 'manual':
        throw new Error('Manual resolution requires user intervention');
      
      default:
        throw new Error(`Unknown conflict resolution strategy: ${strategy.strategy}`);
    }
  }

  // Local wins resolution
  private resolveLocalWins(conflict: DataConflict): any {
    console.log(`Resolving conflict for ${conflict.collection}:${conflict.id} - local wins`);
    return conflict.localData;
  }

  // Remote wins resolution
  private resolveRemoteWins(conflict: DataConflict): any {
    console.log(`Resolving conflict for ${conflict.collection}:${conflict.id} - remote wins`);
    return conflict.remoteData;
  }

  // Merge resolution - smart merging based on collection type
  private async resolveMerge(conflict: DataConflict): Promise<any> {
    console.log(`Resolving conflict for ${conflict.collection}:${conflict.id} - merging`);
    
    switch (conflict.collection) {
      case 'employees':
        return this.mergeEmployee(conflict.localData, conflict.remoteData);
      
      case 'clients':
        return this.mergeClient(conflict.localData, conflict.remoteData);
      
      case 'materials':
        return this.mergeMaterial(conflict.localData, conflict.remoteData);
      
      case 'vendors':
        return this.mergeVendor(conflict.localData, conflict.remoteData);
      
      case 'materialOrders':
        return this.mergeMaterialOrder(conflict.localData, conflict.remoteData);
      
      case 'attendance':
        return this.mergeAttendance(conflict.localData, conflict.remoteData);
      
      default:
        // Default merge strategy: remote wins with local non-null values
        return this.mergeGeneric(conflict.localData, conflict.remoteData);
    }
  }

  // Merge employee data
  private mergeEmployee(local: Employee, remote: Employee): Employee {
    if (!local) return remote;
    if (!remote) return local;

    return {
      ...remote,
      // Prefer local values for these fields as they might be more recent
      name: local.name || remote.name,
      phone: local.phone || remote.phone,
      address: local.address || remote.address,
      salary: local.salary || remote.salary,
      // Keep remote's ID and system fields
      id: remote.id,
      faceEnrolled: remote.faceEnrolled,
      fingerprintEnrolled: remote.fingerprintEnrolled,
    };
  }

  // Merge client data
  private mergeClient(local: Client, remote: Client): Client {
    if (!local) return remote;
    if (!remote) return local;

    return {
      ...remote,
      name: local.name || remote.name,
      projectName: local.projectName || remote.projectName,
      location: local.location || remote.location,
      ownerPhone: local.ownerPhone || remote.ownerPhone,
      totalAmount: local.totalAmount || remote.totalAmount,
      status: local.status || remote.status,
      id: remote.id,
    };
  }

  // Merge material data
  private mergeMaterial(local: Material, remote: Material): Material {
    if (!local) return remote;
    if (!remote) return local;

    return {
      ...remote,
      name: local.name || remote.name,
      unitPrice: local.unitPrice || remote.unitPrice,
      unit: local.unit || remote.unit,
      id: remote.id,
    };
  }

  // Merge vendor data
  private mergeVendor(local: Vendor, remote: Vendor): Vendor {
    if (!local) return remote;
    if (!remote) return local;

    return {
      ...remote,
      name: local.name || remote.name,
      contactPerson: local.contactPerson || remote.contactPerson,
      phone: local.phone || remote.phone,
      email: local.email || remote.email,
      address: local.address || remote.address,
      materials: this.mergeVendorMaterials(local.materials || [], remote.materials || []),
      notes: local.notes || remote.notes,
      id: remote.id,
      createdAt: remote.createdAt,
    };
  }

  // Merge vendor materials
  private mergeVendorMaterials(local: any[], remote: any[]): any[] {
    const materialMap = new Map();
    
    // Add remote materials first
    remote.forEach(material => {
      materialMap.set(`${material.category}_${material.name}`, material);
    });
    
    // Override/add local materials
    local.forEach(material => {
      materialMap.set(`${material.category}_${material.name}`, material);
    });
    
    return Array.from(materialMap.values());
  }

  // Merge material order data
  private mergeMaterialOrder(local: MaterialOrder, remote: MaterialOrder): MaterialOrder {
    if (!local) return remote;
    if (!remote) return local;

    return {
      ...remote,
      date: local.date || remote.date,
      clientId: local.clientId || remote.clientId,
      materialId: local.materialId || remote.materialId,
      supplierId: local.supplierId || remote.supplierId,
      quantity: local.quantity || remote.quantity,
      totalCost: local.totalCost || remote.totalCost,
      paymentStatus: local.paymentStatus || remote.paymentStatus,
      stock: local.stock || remote.stock,
      id: remote.id,
    };
  }

  // Merge attendance data
  private mergeAttendance(local: AttendanceRecord, remote: AttendanceRecord): AttendanceRecord {
    if (!local) return remote;
    if (!remote) return local;

    // For attendance, prefer the most recent status
    const localTime = this.getItemTimestamp(local);
    const remoteTime = this.getItemTimestamp(remote);
    
    return localTime > remoteTime ? local : remote;
  }

  // Generic merge for unknown types
  private mergeGeneric(local: any, remote: any): any {
    if (!local) return remote;
    if (!remote) return local;

    const merged = { ...remote };
    
    // Add non-null local values
    Object.keys(local).forEach(key => {
      if (local[key] !== null && local[key] !== undefined) {
        merged[key] = local[key];
      }
    });
    
    return merged;
  }

  // Get suggested resolution strategy based on conflict type
  getSuggestedStrategy(conflict: DataConflict): ConflictResolution {
    switch (conflict.conflictType) {
      case 'create':
        return {
          strategy: 'local_wins',
          reason: 'Local creation should be preserved'
        };
      
      case 'delete':
        return {
          strategy: 'remote_wins',
          reason: 'Remote deletion should take precedence'
        };
      
      case 'update':
        // For updates, suggest merge for complex objects
        if (['employees', 'clients', 'vendors'].includes(conflict.collection)) {
          return {
            strategy: 'merge',
            reason: 'Smart merge can preserve most recent changes'
          };
        } else {
          return {
            strategy: 'remote_wins',
            reason: 'Remote data is likely more authoritative'
          };
        }
      
      default:
        return {
          strategy: 'remote_wins',
          reason: 'Default to remote data'
        };
    }
  }

  // Format conflict for user display
  formatConflictForDisplay(conflict: DataConflict): string {
    const { collection, conflictType, id } = conflict;
    
    switch (conflictType) {
      case 'create':
        return `${collection} "${id}" was created locally but doesn't exist remotely`;
      
      case 'delete':
        return `${collection} "${id}" was deleted remotely but exists locally`;
      
      case 'update':
        return `${collection} "${id}" was modified both locally and remotely`;
      
      default:
        return `Unknown conflict for ${collection} "${id}"`;
    }
  }
}

export const conflictResolutionService = new ConflictResolutionService();
