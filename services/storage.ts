import { Equipment, Quotation, SupplyRequestItem, SupplyRequestMetadata } from '../types';

const KEYS = {
  EQUIPMENT: 'bidmaster_equipment',
  QUOTES: 'bidmaster_quotes',
  SUPPLY_REQUEST_ITEMS: 'bidmaster_supply_items',
  SUPPLY_REQUEST_META: 'bidmaster_supply_meta',
};

export const getEquipment = (): Equipment[] => {
  try {
    const data = localStorage.getItem(KEYS.EQUIPMENT);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load equipment", e);
    return [];
  }
};

export const saveEquipment = (items: Equipment[]) => {
  localStorage.setItem(KEYS.EQUIPMENT, JSON.stringify(items));
};

export const getQuotes = (): Quotation[] => {
  try {
    const data = localStorage.getItem(KEYS.QUOTES);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load quotes", e);
    return [];
  }
};

export const saveQuotes = (quotes: Quotation[]) => {
  localStorage.setItem(KEYS.QUOTES, JSON.stringify(quotes));
};

export const getSupplyRequestItems = (): SupplyRequestItem[] => {
  try {
    const data = localStorage.getItem(KEYS.SUPPLY_REQUEST_ITEMS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveSupplyRequestItems = (items: SupplyRequestItem[]) => {
  localStorage.setItem(KEYS.SUPPLY_REQUEST_ITEMS, JSON.stringify(items));
};

export const getSupplyRequestMeta = (): SupplyRequestMetadata => {
  try {
    const data = localStorage.getItem(KEYS.SUPPLY_REQUEST_META);
    return data ? JSON.parse(data) : {
      createdDate: new Date().toISOString().split('T')[0],
      creatorName: '',
      departmentHead: '',
      boardApproval: 'Ban Tổng Giám Đốc'
    };
  } catch (e) {
    return {
       createdDate: new Date().toISOString().split('T')[0],
       creatorName: '',
       departmentHead: '',
       boardApproval: 'Ban Tổng Giám Đốc'
    };
  }
};

export const saveSupplyRequestMeta = (meta: SupplyRequestMetadata) => {
  localStorage.setItem(KEYS.SUPPLY_REQUEST_META, JSON.stringify(meta));
};

export const clearAllData = () => {
  localStorage.removeItem(KEYS.EQUIPMENT);
  localStorage.removeItem(KEYS.QUOTES);
  localStorage.removeItem(KEYS.SUPPLY_REQUEST_ITEMS);
  localStorage.removeItem(KEYS.SUPPLY_REQUEST_META);
};