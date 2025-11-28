import React, { useState, useEffect, useMemo } from 'react';
import { Equipment, SupplyRequestItem, SupplyRequestMetadata } from '../types';
import * as Storage from '../services/storage';
import { Plus, Trash2, Printer, Download, Save, FileText, Pencil, X, RotateCcw, Calculator, RefreshCw, Search, CheckSquare, Square } from 'lucide-react';
import { exportToExcel } from '../utils/excelHelper';

const SupplyRequestPage: React.FC = () => {
  const [items, setItems] = useState<SupplyRequestItem[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [quotes, setQuotes] = useState(Storage.getQuotes());
  const [meta, setMeta] = useState<SupplyRequestMetadata>({
    createdDate: '',
    creatorName: '',
    departmentHead: '',
    boardApproval: ''
  });

  // View Mode: 'quantity' | 'cost'
  const [viewMode, setViewMode] = useState<'quantity' | 'cost'>('quantity');

  // Form State for new/edit item
  // CHANGE: selectedEqCodes is now an array for multi-select
  const [selectedEqCodes, setSelectedEqCodes] = useState<string[]>([]);
  const [equipmentSearch, setEquipmentSearch] = useState(''); // Search for the multi-select list

  const [newItem, setNewItem] = useState<Partial<SupplyRequestItem>>({
    quantity: 1,
    phase1Qty: 0,
    phase2Qty: 0,
    notes: '',
    unitPrice: 0,
    supplierName: '',
    brand: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(Storage.getSupplyRequestItems());
    setMeta(Storage.getSupplyRequestMeta());
    setEquipment(Storage.getEquipment());
    setQuotes(Storage.getQuotes());
  }, []);

  // Filter equipment for the multi-select list
  const filteredEquipment = useMemo(() => {
      return equipment.filter(e => 
        e.code.toLowerCase().includes(equipmentSearch.toLowerCase()) || 
        e.name.toLowerCase().includes(equipmentSearch.toLowerCase())
      );
  }, [equipment, equipmentSearch]);

  const handleMetaChange = (field: keyof SupplyRequestMetadata, value: string) => {
    const newMeta = { ...meta, [field]: value };
    setMeta(newMeta);
    Storage.saveSupplyRequestMeta(newMeta);
  };

  // Toggle selection logic
  const toggleSelectEquipment = (code: string) => {
      setSelectedEqCodes(prev => {
          if (prev.includes(code)) return prev.filter(c => c !== code);
          return [...prev, code];
      });
  };

  const toggleSelectAll = () => {
      if (selectedEqCodes.length === filteredEquipment.length && filteredEquipment.length > 0) {
          setSelectedEqCodes([]); // Deselect all
      } else {
          setSelectedEqCodes(filteredEquipment.map(e => e.code)); // Select all currently filtered
      }
  };

  const handleAutoFillPrices = () => {
      if(!confirm('Tính năng này sẽ tự động điền GIÁ và NHÀ CUNG CẤP dựa trên kết quả trúng thầu (Hạng 1) từ phần Phân tích. Dữ liệu hiện tại của bạn trong bảng sẽ bị ghi đè. Tiếp tục?')) return;

      const updatedItems = items.map(item => {
          // Find winning quote for this item code
          const itemQuotes = quotes.filter(q => q.itemCode === item.itemCode && q.price > 0);
          if (itemQuotes.length === 0) return item;

          const validPrices = itemQuotes.map(q => q.price);
          const lowestPrice = Math.min(...validPrices);
          
          const scoredQuotes = itemQuotes.map(q => {
             const priceScore = (lowestPrice / q.price) * 10;
             const totalScore = (priceScore * 0.7) + (q.technicalScore * 0.3);
             return { ...q, totalScore };
          });
          
          scoredQuotes.sort((a,b) => b.totalScore - a.totalScore);
          const winner = scoredQuotes[0];

          if (winner) {
              return {
                  ...item,
                  unitPrice: winner.price,
                  supplierName: winner.supplierName,
                  brand: winner.brand
              }
          }
          return item;
      });

      setItems(updatedItems);
      Storage.saveSupplyRequestItems(updatedItems);
      setViewMode('cost'); 
  };

  const handleSaveItem = () => {
    // Validation
    const total = Number(newItem.quantity);
    const p1 = Number(newItem.phase1Qty || 0);
    const p2 = Number(newItem.phase2Qty || 0);

    if (p1 + p2 > total) {
        alert(`Lỗi: Tổng số lượng phân chia giai đoạn (${p1 + p2}) đang lớn hơn Tổng số lượng dự trù (${total}).\n\nVui lòng điều chỉnh lại số lượng GĐ1 hoặc GĐ2.`);
        return;
    }

    let updatedItems: SupplyRequestItem[] = [...items];

    if (editingId) {
        // --- EDIT MODE (Single Item) ---
        // In edit mode, selectedEqCodes should have exactly 1 item (set by handleEdit)
        const code = selectedEqCodes[0]; 
        const eq = equipment.find(e => e.code === code);
        if (!eq) return;

        const itemData: SupplyRequestItem = {
            id: editingId,
            itemCode: eq.code,
            itemName: eq.name,
            itemSpecs: eq.specs,
            quantity: total,
            phase1Qty: p1,
            phase2Qty: p2,
            notes: newItem.notes || '',
            unitPrice: Number(newItem.unitPrice || 0),
            supplierName: newItem.supplierName || '',
            brand: newItem.brand || ''
        };
        updatedItems = items.map(item => item.id === editingId ? itemData : item);

    } else {
        // --- ADD MODE (Bulk Add) ---
        if (selectedEqCodes.length === 0) {
            alert("Vui lòng chọn ít nhất một thiết bị.");
            return;
        }

        const newItemsToAdd: SupplyRequestItem[] = [];
        
        selectedEqCodes.forEach(code => {
            const eq = equipment.find(e => e.code === code);
            if (eq) {
                newItemsToAdd.push({
                    id: crypto.randomUUID(),
                    itemCode: eq.code,
                    itemName: eq.name,
                    itemSpecs: eq.specs,
                    quantity: total, // Apply same quantity to all
                    phase1Qty: p1,
                    phase2Qty: p2,
                    notes: newItem.notes || '',
                    unitPrice: Number(newItem.unitPrice || 0),
                    supplierName: newItem.supplierName || '',
                    brand: newItem.brand || ''
                });
            }
        });
        
        updatedItems = [...items, ...newItemsToAdd];
    }
    
    setItems(updatedItems);
    Storage.saveSupplyRequestItems(updatedItems);
    resetForm();
  };

  const handleEdit = (item: SupplyRequestItem) => {
      setEditingId(item.id);
      setSelectedEqCodes([item.itemCode]); // Set single selection for edit
      setNewItem({
          quantity: item.quantity,
          phase1Qty: item.phase1Qty,
          phase2Qty: item.phase2Qty,
          notes: item.notes,
          unitPrice: item.unitPrice,
          supplierName: item.supplierName,
          brand: item.brand
      });
      // Clear search so the selected item is likely visible if we were to show the list (though we hide list in edit)
      setEquipmentSearch(''); 
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
      setEditingId(null);
      setSelectedEqCodes([]);
      setNewItem({ quantity: 1, phase1Qty: 0, phase2Qty: 0, notes: '', unitPrice: 0, supplierName: '', brand: '' });
  };

  const handleDelete = (id: string) => {
    if(confirm("Bạn có chắc chắn muốn xóa dòng này không?")) {
        const updated = items.filter(i => i.id !== id);
        setItems(updated);
        Storage.saveSupplyRequestItems(updated);
        if (editingId === id) resetForm();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const data: any[] = [];
    
    // Title
    data.push({ 'Mã VT/TB': viewMode === 'cost' ? 'DỰ TOÁN CHI PHÍ MUA SẮM VẬT TƯ - THIẾT BỊ' : 'BẢNG ĐỀ NGHỊ DỰ TRÙ VẬT TƯ - THIẾT BỊ' });
    data.push({ 'Mã VT/TB': `Ngày lập: ${meta.createdDate}` });
    data.push({}); 

    // Data
    items.forEach((item, index) => {
        const row: any = {
            'STT': index + 1,
            'Mã VT/TB': item.itemCode,
            'Tên Vật tư / Thiết bị': item.itemName,
            'Thông số kỹ thuật': item.itemSpecs,
            'Tổng Số lượng': item.quantity,
            'SL GĐ1': item.phase1Qty,
            'SL GĐ2': item.phase2Qty,
        };

        if (viewMode === 'cost') {
            row['Đơn giá (x1000)'] = (item.unitPrice || 0) / 1000;
            row['Nhà cung cấp'] = item.supplierName;
            row['Hãng'] = item.brand;
            row['Thành tiền GĐ1 (x1000)'] = ((item.phase1Qty || 0) * (item.unitPrice || 0)) / 1000;
            row['Thành tiền GĐ2 (x1000)'] = ((item.phase2Qty || 0) * (item.unitPrice || 0)) / 1000;
            row['Tổng Thành tiền (x1000)'] = ((item.quantity || 0) * (item.unitPrice || 0)) / 1000;
        } else {
             row['Ghi chú'] = item.notes;
        }

        data.push(row);
    });

    if (viewMode === 'cost') {
        const totalP1 = items.reduce((sum, i) => sum + ((i.phase1Qty || 0) * (i.unitPrice || 0)), 0);
        const totalP2 = items.reduce((sum, i) => sum + ((i.phase2Qty || 0) * (i.unitPrice || 0)), 0);
        const totalAll = items.reduce((sum, i) => sum + ((i.quantity || 0) * (i.unitPrice || 0)), 0);
        
        data.push({});
        data.push({
            'Thông số kỹ thuật': 'TỔNG CỘNG',
            'Thành tiền GĐ1 (x1000)': totalP1 / 1000,
            'Thành tiền GĐ2 (x1000)': totalP2 / 1000,
            'Tổng Thành tiền (x1000)': totalAll / 1000
        });
    }

    data.push({});
    data.push({});
    data.push({ 'Mã VT/TB': 'NGƯỜI LẬP BẢNG', 'Thông số kỹ thuật': 'TRƯỞNG BỘ PHẬN', 'SL Giai đoạn 2': 'BAN TGĐ PHÊ DUYỆT' });
    data.push({ 'Mã VT/TB': meta.creatorName, 'Thông số kỹ thuật': meta.departmentHead, 'SL Giai đoạn 2': meta.boardApproval });

    exportToExcel(`DuTru_${viewMode}_${meta.createdDate}.xlsx`, data);
  };

  const totalPhases = Number(newItem.phase1Qty || 0) + Number(newItem.phase2Qty || 0);
  const totalQuantity = Number(newItem.quantity || 0);
  const isOverLimit = totalPhases > totalQuantity;

  const totalCostPhase1 = items.reduce((sum, item) => sum + ((item.phase1Qty || 0) * (item.unitPrice || 0)), 0);
  const totalCostPhase2 = items.reduce((sum, item) => sum + ((item.phase2Qty || 0) * (item.unitPrice || 0)), 0);
  const totalCostAll = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);

  return (
    // THAY ĐỔI: print:block print:w-full để đảm bảo hiển thị khi in
    <div className="space-y-6 w-full print:w-full print:block">
      {/* Header (No Print) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
              {viewMode === 'quantity' ? 'Dự trù Vật tư - Thiết bị' : 'Dự toán Chi phí Mua sắm'}
          </h2>
          <p className="text-sm text-gray-500">
              {viewMode === 'quantity' 
                ? 'Lập bảng đề nghị mua sắm, phân chia giai đoạn và trình ký.' 
                : 'Tính toán chi phí dựa trên đơn giá trúng thầu và số lượng dự trù.'}
          </p>
        </div>
        <div className="flex gap-2">
             <div className="bg-gray-100 p-1 rounded-lg flex mr-2">
                <button
                    onClick={() => setViewMode('quantity')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewMode === 'quantity' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Số lượng
                </button>
                <button
                    onClick={() => setViewMode('cost')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewMode === 'cost' ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Chi phí
                </button>
            </div>

            <button 
                onClick={handleExportExcel}
                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
                <Download className="w-4 h-4 mr-2" /> Excel
            </button>
            <button 
                onClick={handlePrint}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
                <Printer className="w-4 h-4 mr-2" /> In
            </button>
        </div>
      </div>

      {/* Metadata Form (No Print) */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 no-print">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
              <FileText className="w-4 h-4 mr-2" /> Thông tin chung
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                  <label className="block text-xs font-medium text-gray-500">Ngày tạo bảng</label>
                  <input 
                    type="date" 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                    value={meta.createdDate}
                    onChange={(e) => handleMetaChange('createdDate', e.target.value)}
                  />
              </div>
              <div>
                  <label className="block text-xs font-medium text-gray-500">Người lập bảng</label>
                  <input 
                    type="text" 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                    value={meta.creatorName}
                    onChange={(e) => handleMetaChange('creatorName', e.target.value)}
                  />
              </div>
              <div>
                  <label className="block text-xs font-medium text-gray-500">Trưởng bộ phận</label>
                  <input 
                    type="text" 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                    value={meta.departmentHead}
                    onChange={(e) => handleMetaChange('departmentHead', e.target.value)}
                  />
              </div>
              <div>
                  <label className="block text-xs font-medium text-gray-500">Ban TGĐ Phê duyệt</label>
                  <input 
                    type="text" 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                    value={meta.boardApproval}
                    onChange={(e) => handleMetaChange('boardApproval', e.target.value)}
                  />
              </div>
          </div>
      </div>

      {/* Tools & Stats Bar (No Print) */}
      {viewMode === 'cost' && (
          <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-center justify-between">
                   <div>
                       <h4 className="font-bold text-blue-800">Cập nhật Giá tự động</h4>
                       <p className="text-xs text-blue-600 mt-1">Lấy giá trúng thầu (Hạng 1) từ phần Phân tích áp dụng vào đây.</p>
                   </div>
                   <button 
                        onClick={handleAutoFillPrices}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded shadow text-sm flex items-center"
                   >
                       <RefreshCw className="w-4 h-4 mr-2" /> Cập nhật Giá
                   </button>
               </div>
               <div className="bg-green-50 border border-green-100 p-4 rounded-lg text-right">
                   <p className="text-xs text-green-600 font-medium uppercase mb-1">Tổng chi phí dự kiến</p>
                   <p className="text-2xl font-bold text-green-700">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalCostAll)}</p>
               </div>
          </div>
      )}

      {/* Add/Edit Item Form (No Print) */}
      <div className={`p-4 rounded-lg border no-print transition-colors ${editingId ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200 shadow-sm'}`}>
        <h3 className={`text-sm font-bold mb-3 flex items-center justify-between ${editingId ? 'text-yellow-800' : 'text-gray-700'}`}>
             <span className="flex items-center">
                {editingId ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {editingId ? "Cập nhật thông tin" : "Thêm Thiết bị (Chọn nhiều)"}
             </span>
             {editingId && (
                 <button onClick={resetForm} className="text-xs bg-white border border-yellow-300 px-2 py-1 rounded hover:bg-yellow-100 flex items-center">
                     <RotateCcw className="w-3 h-3 mr-1" /> Hủy bỏ
                 </button>
             )}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            
            {/* --- MULTI-SELECT EQUIPMENT AREA --- */}
            <div className="md:col-span-4 flex flex-col h-full">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                    {editingId ? 'Thiết bị đang sửa *' : 'Chọn Thiết bị (Có thể chọn nhiều) *'}
                </label>
                
                {editingId ? (
                    // Edit Mode: Read-only input
                    <input 
                        type="text" 
                        disabled 
                        value={items.find(i => i.id === editingId)?.itemName || selectedEqCodes[0]}
                        className="block w-full border border-yellow-300 bg-yellow-50 rounded-md shadow-sm p-2 text-sm font-bold text-yellow-800"
                    />
                ) : (
                    // Add Mode: Multi-select Box
                    <div className="border border-gray-300 rounded-md overflow-hidden flex flex-col bg-white h-64 shadow-sm">
                        {/* Search & Select All Header */}
                        <div className="p-2 border-b border-gray-200 bg-gray-50 space-y-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Tìm tên hoặc mã..." 
                                    className="w-full pl-8 pr-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={equipmentSearch}
                                    onChange={(e) => setEquipmentSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center justify-between px-1">
                                <button 
                                    onClick={toggleSelectAll}
                                    className="flex items-center text-xs font-bold text-blue-600 hover:text-blue-800"
                                >
                                    {selectedEqCodes.length > 0 && selectedEqCodes.length === filteredEquipment.length ? (
                                        <CheckSquare className="w-4 h-4 mr-1" /> 
                                    ) : (
                                        <Square className="w-4 h-4 mr-1" />
                                    )}
                                    Chọn tất cả ({filteredEquipment.length})
                                </button>
                                <span className="text-xs text-gray-500">Đã chọn: <b className="text-blue-600">{selectedEqCodes.length}</b></span>
                            </div>
                        </div>
                        
                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-1 space-y-1">
                            {filteredEquipment.length === 0 ? (
                                <p className="text-center text-xs text-gray-400 py-4">Không tìm thấy thiết bị</p>
                            ) : (
                                filteredEquipment.map(eq => {
                                    const isSelected = selectedEqCodes.includes(eq.code);
                                    return (
                                        <div 
                                            key={eq.id}
                                            onClick={() => toggleSelectEquipment(eq.code)}
                                            className={`flex items-start p-2 rounded cursor-pointer transition-colors text-sm ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-100 border border-transparent'}`}
                                        >
                                            <div className={`mt-0.5 mr-2 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-300'}`}>
                                                {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <div className={`font-medium ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>{eq.name}</div>
                                                <div className="text-xs text-gray-500 font-mono">{eq.code}</div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            {/* --- RIGHT COLUMN: INPUTS --- */}
            <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Tổng SL *</label>
                        <input 
                            type="number" min="1"
                            className="block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm font-bold"
                            value={newItem.quantity}
                            onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">SL GĐ1</label>
                        <input 
                            type="number" min="0"
                            className={`block w-full border rounded-md shadow-sm p-2 text-sm ${isOverLimit ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            value={newItem.phase1Qty}
                            onChange={(e) => setNewItem({...newItem, phase1Qty: Number(e.target.value)})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">SL GĐ2</label>
                        <input 
                            type="number" min="0"
                            className={`block w-full border rounded-md shadow-sm p-2 text-sm ${isOverLimit ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            value={newItem.phase2Qty}
                            onChange={(e) => setNewItem({...newItem, phase2Qty: Number(e.target.value)})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Đơn giá dự toán (VND)</label>
                    <input 
                        type="number" min="0"
                        className="block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                        value={newItem.unitPrice}
                        onChange={(e) => setNewItem({...newItem, unitPrice: Number(e.target.value)})}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nhà cung cấp</label>
                    <input 
                        type="text"
                        className="block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                        value={newItem.supplierName}
                        onChange={(e) => setNewItem({...newItem, supplierName: e.target.value})}
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Hãng / Ghi chú</label>
                    <input 
                        type="text"
                        className="block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                        placeholder="Hãng sx hoặc ghi chú..."
                        value={newItem.brand || newItem.notes}
                        onChange={(e) => setNewItem({...newItem, brand: e.target.value, notes: e.target.value})} 
                    />
                </div>

                <div className="md:col-span-2">
                    {isOverLimit && (
                        <div className="text-red-600 text-xs font-bold mb-2 flex items-center">
                            <X className="w-3 h-3 mr-1" />
                            Lỗi: Tổng số lượng Giai đoạn ({totalPhases}) đang vượt quá Tổng số lượng dự trù ({totalQuantity}).
                        </div>
                    )}
                    <button 
                        onClick={handleSaveItem}
                        disabled={selectedEqCodes.length === 0 || isOverLimit}
                        className={`w-full flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white disabled:bg-gray-400 disabled:cursor-not-allowed ${editingId ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {editingId ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        {editingId ? "Cập nhật" : `Thêm ${selectedEqCodes.length} Thiết bị đã chọn`}
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* PRINT VIEW HEADER */}
      <div className="hidden print:block text-center mb-8 pt-4">
          <h1 className="text-2xl font-bold uppercase">
              {viewMode === 'cost' ? 'DỰ TOÁN CHI PHÍ MUA SẮM VẬT TƯ - THIẾT BỊ' : 'BẢNG ĐỀ NGHỊ DỰ TRÙ VẬT TƯ - THIẾT BỊ'}
          </h1>
          <p className="italic mt-2">Ngày lập: {meta.createdDate ? new Date(meta.createdDate).toLocaleDateString('vi-VN') : '...'}</p>
      </div>

      {/* TABLE */}
      {/* THAY ĐỔI: print:overflow-visible để in hết bảng */}
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200 print:shadow-none print:border-none print:overflow-visible">
          <table className="min-w-full divide-y divide-gray-200 print:divide-gray-500 w-full">
              <thead className="bg-gray-50 print:bg-gray-200">
                  <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border print:border-black print:text-black">STT</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border print:border-black print:text-black">Tên Vật tư / Thiết bị</th>
                      {viewMode === 'quantity' && (
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border print:border-black print:text-black">Thông số kỹ thuật</th>
                      )}
                      {viewMode === 'cost' && (
                           <>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border print:border-black print:text-black">NCC / Hãng</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase border print:border-black print:text-black">Đơn giá (x1000)</th>
                           </>
                      )}
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-blue-50 border print:border-black print:bg-transparent print:text-black">Tổng SL</th>
                      
                      {viewMode === 'quantity' && (
                          <>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border print:border-black print:text-black">GĐ 1</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border print:border-black print:text-black">GĐ 2</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border print:border-black print:text-black">Ghi chú</th>
                          </>
                      )}

                      {viewMode === 'cost' && (
                          <>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase border print:border-black print:text-black">Thành tiền GĐ1</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase border print:border-black print:text-black">Thành tiền GĐ2</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-green-50 border print:border-black print:bg-transparent print:text-black">Tổng tiền</th>
                          </>
                      )}
                      
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase no-print border">Thao tác</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 print:divide-gray-500">
                  {items.length === 0 ? (
                      <tr>
                          <td colSpan={10} className="px-6 py-8 text-center text-gray-500 italic border print:border-black">
                              Chưa có thiết bị nào trong bảng dự trù.
                          </td>
                      </tr>
                  ) : (
                      items.map((item, index) => (
                          <tr key={item.id} className={`hover:bg-gray-50 ${editingId === item.id ? 'bg-yellow-50' : ''} print:bg-transparent`}>
                              <td className="px-4 py-3 text-center text-sm text-gray-500 border print:border-black print:text-black">{index + 1}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 border print:border-black print:text-black">
                                  <div className="font-medium">{item.itemName}</div>
                                  <div className="text-xs text-gray-500 font-mono">{item.itemCode}</div>
                              </td>
                              
                              {viewMode === 'quantity' && (
                                <td className="px-4 py-3 text-sm text-gray-500 text-xs border print:border-black print:text-black max-w-xs">{item.itemSpecs}</td>
                              )}

                              {viewMode === 'cost' && (
                                  <>
                                    <td className="px-4 py-3 text-sm text-gray-700 border print:border-black print:text-black">
                                        <div className="font-medium text-xs">{item.supplierName}</div>
                                        <div className="text-xs text-gray-500">{item.brand}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-gray-700 border print:border-black print:text-black">
                                        {new Intl.NumberFormat('vi-VN').format((item.unitPrice || 0) / 1000)}
                                    </td>
                                  </>
                              )}

                              <td className="px-4 py-3 text-center text-sm font-bold bg-blue-50 border print:bg-transparent print:border-black print:text-black">{item.quantity}</td>
                              
                              {viewMode === 'quantity' && (
                                  <>
                                    <td className="px-4 py-3 text-center text-sm text-gray-700 border print:border-black print:text-black">{item.phase1Qty || '-'}</td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-700 border print:border-black print:text-black">{item.phase2Qty || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500 italic border print:border-black print:text-black">{item.notes}</td>
                                  </>
                              )}

                              {viewMode === 'cost' && (
                                  <>
                                    <td className="px-4 py-3 text-right text-sm text-gray-700 border print:border-black print:text-black">
                                        {new Intl.NumberFormat('vi-VN').format(((item.phase1Qty || 0) * (item.unitPrice || 0)) / 1000)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-gray-700 border print:border-black print:text-black">
                                        {new Intl.NumberFormat('vi-VN').format(((item.phase2Qty || 0) * (item.unitPrice || 0)) / 1000)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-bold bg-green-50 text-green-700 border print:bg-transparent print:border-black print:text-black">
                                        {new Intl.NumberFormat('vi-VN').format(((item.quantity || 0) * (item.unitPrice || 0)) / 1000)}
                                    </td>
                                  </>
                              )}

                              <td className="px-4 py-3 text-center no-print border whitespace-nowrap">
                                  <button 
                                    onClick={() => handleEdit(item)}
                                    className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded mr-1"
                                    title="Chỉnh sửa"
                                  >
                                      <Pencil className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                    title="Xóa"
                                  >
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </td>
                          </tr>
                      ))
                  )}
                  {/* Totals Row for Cost View */}
                  {viewMode === 'cost' && items.length > 0 && (
                      <tr className="bg-gray-100 font-bold print:bg-transparent print:font-bold">
                          <td colSpan={5} className="px-4 py-3 text-right text-sm text-gray-900 border print:border-black uppercase">Tổng cộng (x1000)</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900 border print:border-black">
                              {new Intl.NumberFormat('vi-VN').format(totalCostPhase1 / 1000)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900 border print:border-black">
                              {new Intl.NumberFormat('vi-VN').format(totalCostPhase2 / 1000)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900 border print:border-black">
                              {new Intl.NumberFormat('vi-VN').format(totalCostAll / 1000)}
                          </td>
                          <td className="no-print border"></td>
                      </tr>
                  )}
              </tbody>
          </table>
      </div>

      {/* SIGNATURE SECTION (VISIBLE IN PRINT ONLY) */}
      <div className="hidden print:flex justify-between mt-12 px-8">
          <div className="text-center">
              <p className="font-bold uppercase text-sm mb-16">Người lập bảng</p>
              <p className="font-medium">{meta.creatorName}</p>
          </div>
          <div className="text-center">
              <p className="font-bold uppercase text-sm mb-16">Trưởng Bộ Phận</p>
              <p className="font-medium">{meta.departmentHead}</p>
          </div>
          <div className="text-center">
              <p className="font-bold uppercase text-sm mb-16">Ban TGĐ Phê Duyệt</p>
              <p className="font-medium">{meta.boardApproval}</p>
          </div>
      </div>
    </div>
  );
};

export default SupplyRequestPage;