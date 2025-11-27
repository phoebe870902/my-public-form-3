import { Registration } from '../types';
import { DEFAULT_SCRIPT_URL } from '../constants';

const STORAGE_KEY = 'yoga_registrations';
const API_URL_KEY = 'sophie_yoga_api_url';

export interface StorageResult {
  data: Registration[];
  source: 'cloud' | 'local';
  error?: string;
}

export const storageService = {
  getApiUrl: (): string => {
    return localStorage.getItem(API_URL_KEY) || DEFAULT_SCRIPT_URL;
  },

  setApiUrl: (url: string) => {
    localStorage.setItem(API_URL_KEY, url);
  },

  initialize: () => {
    const params = new URLSearchParams(window.location.search);
    const config = params.get('cfg');
    if (config) {
      try {
        const url = atob(config);
        localStorage.setItem(API_URL_KEY, url);
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);
        console.log("Configuration applied successfully");
      } catch (e) {
        console.error("Invalid configuration parameter");
      }
    }
  },

  validateUrl: (url: string): boolean => {
    return url.includes('/exec');
  },

  testConnection: async (): Promise<{success: boolean; message: string}> => {
    const url = storageService.getApiUrl();
    if (!url.endsWith('/exec')) return { success: false, message: "URL 格式錯誤：結尾必須是 /exec" };

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return { success: false, message: `伺服器回應錯誤: ${response.status}` };
      }
      const text = await response.text();
      try {
        JSON.parse(text);
        return { success: true, message: "連線成功！" };
      } catch (e) {
        return { success: false, message: "回傳格式錯誤 (可能是權限未設為 '任何人'，導致回傳了登入頁面 HTML)" };
      }
    } catch (e) {
      return { success: false, message: "無法連線 (CORS 或 網路錯誤)" };
    }
  },

  saveRegistrations: async (newRegistrations: Registration[]): Promise<{success: boolean; cloudError?: string}> => {
    // 1. Always save to local storage as backup
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const updated = [...newRegistrations, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // 2. Try to save to Cloud
    const apiUrl = storageService.getApiUrl();
    if (apiUrl) {
      try {
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(newRegistrations)
        });
        return { success: true };
      } catch (e) {
        console.error("Cloud save failed", e);
        return { success: true, cloudError: "無法上傳至雲端，僅儲存於本機" };
      }
    }
    return { success: true };
  },

  getRegistrations: async (): Promise<StorageResult> => {
    const apiUrl = storageService.getApiUrl();
    
    if (apiUrl) {
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const text = await response.text();
        let data: Registration[];
        
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error("Invalid JSON response (Check Permissions)");
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return { data, source: 'cloud' };
      } catch (e) {
        console.error("Cloud fetch failed", e);
        // Fallback to local
        const local = localStorage.getItem(STORAGE_KEY);
        return { 
          data: local ? JSON.parse(local) : [], 
          source: 'local',
          error: e instanceof Error ? e.message : 'Unknown Connection Error'
        };
      }
    }

    const local = localStorage.getItem(STORAGE_KEY);
    return { data: local ? JSON.parse(local) : [], source: 'local' };
  },

  clearAllData: async (): Promise<{success: boolean; error?: string}> => {
    // 1. Clear Local Storage
    localStorage.removeItem(STORAGE_KEY);

    // 2. Send Clear Command to Cloud
    const apiUrl = storageService.getApiUrl();
    if (apiUrl) {
        try {
            // We send a special payload action for deletion
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'delete_all' })
            });
            
            // Check if script is updated
            const json = await response.json();
            
            // If the script is OLD, it will treat {action: 'delete_all'} as a registration 
            // and return {status: 'success', count: 1}.
            // If the script is NEW, it returns {status: 'success', message: 'All data cleared'}.
            if (json.count && !json.message) {
                return { 
                    success: false, 
                    error: "Apps Script 版本過舊！雲端無法辨識刪除指令。請回到 Google 試算表 > 擴充功能 > Apps Script，重新進行「部署」>「管理部署作業」>「建立新版本」。" 
                };
            }

            return { success: true };
        } catch (e) {
            console.error("Cloud delete failed", e);
            return { success: false, error: "雲端資料刪除失敗，請檢查網路連線或 Apps Script 設定" };
        }
    }
    return { success: true };
  }
};
