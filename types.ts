export interface Equipment {
  id: string;
  code: string;
  name: string;
  specs: string;
  group: string; // Nhóm thiết bị (VD: Văn phòng phẩm, Máy móc, Hóa chất...)
}

export interface Quotation {
  id: string;
  supplierName: string;
  itemCode: string; // Foreign key to Equipment.code
  brand: string;
  price: number;
  vatIncluded: boolean; // New field for VAT status
  technicalScore: number; // 1-10
  techScoreReason?: string; // Explanation for score adjustment
  notes: string;
}

export interface ScoredQuote extends Quotation {
  priceScore: number; // Pg
  weightedPriceScore: number; // Pg * 0.7
  weightedTechScore: number; // Pt * 0.3
  totalScore: number; // Final Score
  rank: number;
  isLowestPrice: boolean;
}

export interface AnalysisGroup {
  item: Equipment;
  quotes: ScoredQuote[];
  lowestPrice: number;
}

export interface SupplyRequestItem {
  id: string;
  itemCode: string;
  itemName: string;
  itemSpecs: string;
  quantity: number;
  phase1Qty: number;
  phase2Qty: number;
  notes: string;
  unitPrice?: number;
  supplierName?: string;
  brand?: string;
}

export interface SupplyRequestMetadata {
  createdDate: string;
  creatorName: string;
  departmentHead: string;
  boardApproval: string; // Tên người duyệt hoặc để trống
}

export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: 'admin' | 'user';
  allowedGroups?: string[]; // Danh sách NHÓM thiết bị được phép truy cập (thay vì mã cụ thể)
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  username: string;
  action: string; // "Thêm", "Sửa", "Xóa", "Đăng nhập"...
  details: string;
}