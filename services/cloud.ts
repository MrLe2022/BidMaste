import { Equipment, Quotation, SupplyRequestItem, SupplyRequestMetadata } from '../types';
import * as Storage from './storage';

export const syncToCloud = async (scriptUrl: string) => {
  const payload = {
    equipment: Storage.getEquipment(),
    quotes: Storage.getQuotes(),
    supplyItems: Storage.getSupplyRequestItems(),
    meta: Storage.getSupplyRequestMeta()
  };

  try {
    // Sử dụng mode: 'no-cors' để tránh lỗi chặn từ trình duyệt.
    // Lưu ý: Với no-cors, ta không thể đọc phản hồi (response) từ Google, 
    // nhưng dữ liệu vẫn sẽ được gửi đi thành công.
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', 
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'text/plain',
      },
    });
    
    // Giả lập thành công vì no-cors không trả về status
    return { status: 'success' };
  } catch (error) {
    console.error("Cloud Sync Error:", error);
    throw error;
  }
};

export const syncFromCloud = async (scriptUrl: string) => {
  try {
    // GET request thường ít bị chặn CORS hơn nếu đã set quyền "Anyone"
    const response = await fetch(scriptUrl);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

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