import { Equipment, Quotation, SupplyRequestItem, SupplyRequestMetadata } from '../types';
import * as Storage from './storage';

export const syncToCloud = async (scriptUrl: string) => {
  const cleanUrl = scriptUrl.trim();
  if (!cleanUrl.endsWith('exec')) {
    throw new Error("URL không hợp lệ. URL phải kết thúc bằng '/exec'");
  }

  const payload = {
    equipment: Storage.getEquipment(),
    quotes: Storage.getQuotes(),
    supplyItems: Storage.getSupplyRequestItems(),
    meta: Storage.getSupplyRequestMeta()
  };

  console.log("Starting sync to cloud...", payload);

  try {
    // Chuyển sang mode 'cors' mặc định để nhận phản hồi lỗi nếu có.
    // Google Apps Script Web App (với quyền Anyone) hỗ trợ CORS.
    const response = await fetch(cleanUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        // Sử dụng text/plain để tránh kích hoạt preflight OPTIONS request phức tạp
        'Content-Type': 'text/plain;charset=utf-8', 
      },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server Error: ${response.status} - ${text}`);
    }

    const result = await response.json();
    console.log("Sync result:", result);
    return result;
  } catch (error) {
    console.error("Cloud Sync Error details:", error);
    throw error;
  }
};

export const syncFromCloud = async (scriptUrl: string) => {
  const cleanUrl = scriptUrl.trim();
  try {
    const response = await fetch(cleanUrl);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Received data from cloud:", data);

    if (data.Equipment) Storage.saveEquipment(data.Equipment);
    if (data.Quotes) Storage.saveQuotes(data.Quotes);
    if (data.SupplyItems) Storage.saveSupplyRequestItems(data.SupplyItems);
    if (data.Meta && data.Meta.length > 0) Storage.saveSupplyRequestMeta(data.Meta[0]);

    return true;
  } catch (error) {
    console.error("Cloud Load Error:", error);
    throw error;
  }
};