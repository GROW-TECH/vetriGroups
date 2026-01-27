import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncService } from '@/services/syncService';

export interface NetworkStatus {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string | null;
  details: any;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: null,
    isInternetReachable: null,
    type: null,
    details: null,
  });

  const [previousStatus, setPreviousStatus] = useState<NetworkStatus | null>(null);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const newStatus: NetworkStatus = {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        details: state.details,
      };

      setPreviousStatus(networkStatus);
      setNetworkStatus(newStatus);

      // Trigger auto-sync when coming back online
      if (
        previousStatus?.isConnected === false && 
        state.isConnected === true && 
        state.isInternetReachable === true
      ) {
        console.log('🌐 Network restored, triggering auto-sync');
        syncService.autoSync().catch(error => {
          console.error('Auto-sync failed:', error);
        });
      }
    });

    // Get initial network state
    NetInfo.fetch().then(state => {
      const initialStatus: NetworkStatus = {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        details: state.details,
      };
      setNetworkStatus(initialStatus);
    });

    // Cleanup subscription
    return () => {
      unsubscribe();
    };
  }, [previousStatus, networkStatus]);

  // Helper methods
  const isOnline = (): boolean => {
    return networkStatus.isConnected === true && networkStatus.isInternetReachable === true;
  };

  const isOffline = (): boolean => {
    return networkStatus.isConnected === false || networkStatus.isInternetReachable === false;
  };

  const getConnectionType = (): string => {
    return networkStatus.type || 'unknown';
  };

  const justCameOnline = (): boolean => {
    return (
      previousStatus?.isConnected === false && 
      networkStatus.isConnected === true && 
      networkStatus.isInternetReachable === true
    );
  };

  const justWentOffline = (): boolean => {
    return (
      previousStatus?.isConnected === true && 
      (networkStatus.isConnected === false || networkStatus.isInternetReachable === false)
    );
  };

  return {
    networkStatus,
    isOnline,
    isOffline,
    getConnectionType,
    justCameOnline,
    justWentOffline,
    previousStatus,
  };
}
