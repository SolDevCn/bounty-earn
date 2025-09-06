import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

import { useUser } from '@/store/user';
import logger from '@/lib/logger';

interface PermissionSyncConfig {
  interval?: number; // 检查间隔，默认30秒
  enabled?: boolean; // 是否启用自动同步，默认true
  showNotification?: boolean; // 是否显示权限变更通知，默认true
}

interface PermissionChangeResponse {
  hasChanges: boolean;
  lastModified?: string;
  changes?: {
    role?: string;
    sponsors?: Array<{
      id: string;
      role: string;
      action: 'added' | 'removed' | 'role_changed';
    }>;
  };
}

export const usePermissionSync = (config: PermissionSyncConfig = {}) => {
  const {
    interval = 30000, // 30秒
    enabled = true,
    showNotification = true,
  } = config;

  const { user, refetchUser } = useUser();
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const [isChecking, setIsChecking] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // 手动检查权限变更
  const checkPermissionChanges = useCallback(async () => {
    if (!user || !mountedRef.current || isChecking) {
      return { hasChanges: false };
    }

    setIsChecking(true);

    try {
      const response = await axios.get<PermissionChangeResponse>('/api/user/permission-changes', {
        params: { 
          since: lastSyncTime,
          details: 'true' // 获取详细变更信息
        },
        timeout: 5000, // 5秒超时
      });

      if (response.data.hasChanges) {
        logger.info('Permission changes detected, refreshing user data');
        
        // 重新获取用户信息
        await refetchUser();
        
        // 更新同步时间
        setLastSyncTime(Date.now());
        
        // 显示通知
        if (showNotification) {
          const changes = response.data.changes;
          let notificationMessage = '您的权限已更新';
          
          if (changes?.role) {
            notificationMessage += ` (角色: ${changes.role})`;
          }
          
          if (changes?.sponsors && changes.sponsors.length > 0) {
            const sponsorActions = changes.sponsors.map(s => s.action).join(', ');
            notificationMessage += ` (组织权限: ${sponsorActions})`;
          }
          
          toast.info(notificationMessage, {
            duration: 5000,
            position: 'top-right',
          });
        }

        return { 
          hasChanges: true, 
          changes: response.data.changes 
        };
      }

      return { hasChanges: false };
    } catch (error: any) {
      // 静默处理错误，避免影响用户体验
      if (error?.response?.status !== 401) {
        logger.error('Failed to check permission changes:', error);
      }
      
      return { hasChanges: false, error: error.message };
    } finally {
      if (mountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [user, lastSyncTime, isChecking, refetchUser, showNotification]);

  // 设置定期检查
  useEffect(() => {
    if (!enabled || !user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 立即检查一次
    checkPermissionChanges();

    // 设置定期检查
    intervalRef.current = setInterval(checkPermissionChanges, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, user, interval, checkPermissionChanges]);

  // 组件卸载时清理
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 重置同步时间 (用于手动触发完整同步)
  const resetSyncTime = useCallback(() => {
    setLastSyncTime(Date.now());
  }, []);

  // 强制检查权限变更
  const forceCheck = useCallback(async () => {
    if (!user) return { hasChanges: false };
    
    // 临时设置一个很早的时间来强制检查
    const originalSyncTime = lastSyncTime;
    setLastSyncTime(0);
    
    try {
      const result = await checkPermissionChanges();
      return result;
    } finally {
      // 恢复原始同步时间
      setLastSyncTime(originalSyncTime);
    }
  }, [user, lastSyncTime, checkPermissionChanges]);

  return {
    isChecking,
    lastSyncTime,
    checkPermissionChanges,
    resetSyncTime,
    forceCheck,
  };
};