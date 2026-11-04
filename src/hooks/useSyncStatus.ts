import { useState, useEffect } from 'react';
import { SyncService, SyncStatus } from '../services/syncService';

export function useSyncStatus(): SyncStatus & { syncNow: () => Promise<void> } {
  const [status, setStatus] = useState<SyncStatus>(SyncService.getStatus());

  useEffect(() => {
    const unsubscribe = SyncService.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  const syncNow = async () => {
    await SyncService.syncPendingQueue();
  };

  return {
    ...status,
    syncNow,
  };
}
