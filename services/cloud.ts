import { Equipment, Quotation, SupplyRequestItem, SupplyRequestMetadata } from '../types';
import * as Storage from './storage';

// URL cố định theo yêu cầu
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxSXhqMEyLwmznMH88t7FeqCVjmf15s2DUCoHL4IonvQr0yfgqZ6DmHeKBbsE66a0AO/exec';

export const syncToCloud = async () => {
  const payload = {
    equipment: Storage.getEquipment(),
    quotes: Storage.getQuotes(),
    supplyItems: Storage.getSupplyRequestItems(),
    meta: Storage.getSupplyRequestMeta()
  };

  console.log("Starting sync to cloud...", payload);

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
      },
      redirect: 'follow', // Follow GAS redirects
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

export const syncFromCloud = async () => {
  try {
    // Add timestamp to prevent caching
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?t=${new Date().getTime()}`);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Received data from cloud:", data);

    // Flexible key checking (case insensitive)
    const getKey = (obj: any, key: string) => obj[key] || obj[key.toLowerCase()];

    const equipment = getKey(data, 'Equipment');
    const quotes = getKey(data, 'Quotes');
    const supplyItems = getKey(data, 'SupplyItems');
    const meta = getKey(data, 'Meta');

    if (equipment) Storage.saveEquipment(equipment);
    if (quotes) Storage.saveQuotes(quotes);
    if (supplyItems) Storage.saveSupplyRequestItems(supplyItems);
    if (meta && meta.length > 0) Storage.saveSupplyRequestMeta(meta[0]);

    return true;
  } catch (error) {
    console.error("Cloud Load Error:", error);
    throw error;
  }
};