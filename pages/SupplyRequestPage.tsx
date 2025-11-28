import React, { useState, useEffect } from 'react';
import { Equipment, SupplyRequestItem, SupplyRequestMetadata } from '../types';
import * as Storage from '../services/storage';
import { Plus, Trash2, Printer, Download, Save, FileText, Pencil, X, RotateCcw } from 'lucide-react';
import { exportToExcel } from '../utils/excelHelper';

const SupplyRequestPage: React.FC = () => {
  const [items, setItems] = useState<SupplyRequestItem[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [meta, setMeta] = useState<SupplyRequestMetadata>({
    createdDate: '',
    creatorName: '',
    departmentHead: '',
    boardApproval: ''
  });

  // Form State for new/edit item
  const [selectedEqCode, setSelectedEqCode] = useState('');
  const [newItem, setNewItem] = useState<Partial<SupplyRequestItem>>({
    quantity: 1,
    phase1Qty: 0,
    phase2Qty: 0,
    notes: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(Storage.getSupplyRequestItems());
    setMeta(Storage.getSupplyRequestMeta());
    setEquipment(Storage.getEquipment());
  }, []);

  const handleMetaChange = (field: keyof SupplyRequestMetadata, value: string) => {
    const newMeta = { ...meta, [field]: value };
    setMeta(newMeta);
    Storage.saveSupplyRequestMeta(newMeta);
  };

  const handleEqSelect = (code: string) => {
    setSelectedEqCode(code);
    const eq = equipment.find(e => e.code === code);
    if (eq) {
      setNewItem(prev => ({
        ...prev,
        itemCode: eq.code,
        itemName: eq.name,
        itemSpecs: eq.specs,
      }));
    }
  };

  const handleSaveItem = () => {
    if (!selectedEqCode || !newItem.quantity) return;

    // Validation: Check if Phases exceed Total
    const total = Number(newItem.quantity);
    const p1 = Number(newItem.phase1Qty || 0);
    const p2 = Number(newItem.phase2Qty || 0);

    if (p1 + p2 > total) {
        alert(`Lỗi: Tổng số lượng phân chia giai đoạn (${p1 + p2}) đang lớn hơn Tổng số lượng dự trù (${total}).\n\nVui lòng điều chỉnh lại số lượng GĐ1 hoặc GĐ2.`);
        return;
    }

    if (editingId) {
        // Update Existing Item
        const updatedItems = items.map(item => {
            if (item.id === editingId) {
                return {
                    ...item,
                    itemCode: newItem.itemCode!,
                    itemName: newItem.itemName!,
                    itemSpecs: newItem.itemSpecs!,
                    quantity: total,
                    phase1Qty: p1,
                    phase2Qty: p2,
                    notes: newItem.notes || ''
                };
            }
            return item;
        });
        setItems(updatedItems);
        Storage.saveSupplyRequestItems(updatedItems);
        alert('Đã cập nhật thiết bị thành công.');
    } else {
        // Add New Item
        const addedItem: SupplyRequestItem = {
            id: crypto.randomUUID(),
            itemCode: newItem.itemCode!,
            itemName: newItem.itemName!,
            itemSpecs: newItem.itemSpecs!,
            quantity: total,
            phase1Qty: p1,
            phase2Qty: p2,
            notes: newItem.notes || ''
        };
        const updated = [...items, addedItem];
        setItems(updated);
        Storage.saveSupplyRequestItems(updated);
    }
    
    resetForm();
  };

  const handleEdit = (item: SupplyRequestItem) => {
      setEditingId(item.id);
      setSelectedEqCode(item.itemCode);
      setNewItem({
          itemCode: item.itemCode,
          itemName: item.itemName,
          itemSpecs: item.itemSpecs,
          quantity: item.quantity,
          phase1Qty: item.phase1Qty,
          phase2Qty: item.phase2Qty,
          notes: item.notes
      });
      // Scroll to form area
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
      setEditingId(null);
      setSelectedEqCode('');
      setNewItem({ quantity: 1, phase1Qty: 0, phase2Qty: 0, notes: '' });
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
    // Construct data for Excel with Metadata header
    const data: any[] = [];
    
    // Header Info rows
    data.push({ 'Mã VT/TB': 'BẢNG ĐỀ NGHỊ DỰ TRÙ VẬT TƯ - THIẾT BỊ' });
    data.push({ 'Mã VT/TB': `Ngày tạo: ${meta.createdDate}` });
    data.push({ 'Mã VT/TB': `Người tạo: ${meta.creatorName}` });
    data.push({}); // Empty row

    // Table Header Mock (Library handles keys as headers, so we just push objects)
    items.forEach((item, index) => {
        data.push({
            'STT': index + 1,
            'Mã VT/TB': item.itemCode,
            'Tên Vật tư / Thiết bị': item.itemName,
            'Thông số kỹ thuật': item.itemSpecs,
            'Tổng Số lượng': item.quantity,
            'SL Giai đoạn 1': item.phase1Qty,
            'SL Giai đoạn 2': item.phase2Qty,
            'Ghi chú': item.notes
        });
    });

    data.push({});
    data.push({});
    
    // Signature Mock
    data.push({ 
        'Mã VT/TB': 'NGƯỜI LẬP BẢNG', 
        'Thông số kỹ thuật': 'TRƯỞNG BỘ PHẬN',
        'SL Giai đoạn 2': 'BAN TGĐ PHÊ DUYỆT'
    });
    data.push({ 
        'Mã VT/TB': meta.creatorName, 
        'Thông số kỹ thuật': meta.departmentHead,
        'SL Giai đoạn 2': meta.boardApproval
    });

    exportToExcel(`DuTruVatTu_${meta.createdDate}.xlsx`, data);
  };

  const totalPhases = Number(newItem.phase1Qty || 0) + Number(newItem.phase2Qty || 0);
  const totalQuantity = Number(newItem.quantity || 0);
  const isOverLimit = totalPhases > totalQuantity;

  return (
    <div className="space-y-6 w-full print:w-full">
      {/* Header (No Print) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dự trù Vật tư - Thiết bị</h2>
          <p className="text-sm text-gray-500">Lập bảng đề nghị mua sắm, phân chia giai đoạn và trình ký.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleExportExcel}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
                <Download className="w-4 h-4 mr-2" /> Xuất Excel
            </button>
            <button 
                onClick={handlePrint}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
                <Printer className="w-4 h-4 mr-2" /> In Báo cáo
            </button>
        </div>
      </div>

      {/* Metadata Form (No Print - Values shown in Print View) */}
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
                    placeholder="Nhập tên..."
                    value={meta.creatorName}
                    onChange={(e) => handleMetaChange('creatorName', e.target.value)}
                  />
              </div>
              <div>
                  <label className="block text-xs font-medium text-gray-500">Trưởng bộ phận</label>
                  <input 
                    type="text" 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                    placeholder="Nhập tên..."
                    value={meta.departmentHead}
                    onChange={(e) => handleMetaChange('departmentHead', e.target.value)}
                  />
              </div>
              <div>
                  <label className="block text-xs font-medium text-gray-500">Ban TGĐ Phê duyệt</label>
                  <input 
                    type="text" 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                    placeholder="Chức danh/Tên"
                    value={meta.boardApproval}
                    onChange={(e) => handleMetaChange('boardApproval', e.target.value)}
                  />
              </div>
          </div>
      </div>

      {/* Add/Edit Item Form (No Print) */}
      <div className={`p-4 rounded-lg border no-print transition-colors ${editingId ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-100'}`}>
        <h3 className={`text-sm font-bold mb-3 flex items-center justify-between ${editingId ? 'text-yellow-800' : 'text-blue-800'}`}>
             <span className="flex items-center">
                {editingId ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {editingId ? "Cập nhật thông tin Thiết bị" : "Thêm Thiết bị vào Dự trù"}
             </span>
             {editingId && (
                 <button onClick={resetForm} className="text-xs bg-white border border-yellow-300 px-2 py-1 rounded hover:bg-yellow-100 flex items-center">
                     <RotateCcw className="w-3 h-3 mr-1" /> Hủy bỏ
                 </button>
             )}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">Chọn Thiết bị *</label>
                <select 
                    className="block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm bg-white"
                    value={selectedEqCode}
                    onChange={(e) => handleEqSelect(e.target.value)}
                >
                    <option value="">-- Chọn từ danh mục --</option>
                    {equipment.map(e => (
                        <option key={e.id} value={e.code}>{e.code} - {e.name}</option>
                    ))}
                </select>
            </div>
            
            <div className="md:col-span-2">
                 <label className="block text-xs font-medium text-gray-500 mb-1">Tổng SL *</label>
                 <input 
                    type="number" min="1"
                    className="block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm font-bold"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                 />
            </div>
            <div className="md:col-span-2">
                 <label className="block text-xs font-medium text-gray-500 mb-1">SL GĐ1</label>
                 <input 
                    type="number" min="0"
                    className={`block w-full border rounded-md shadow-sm p-2 text-sm ${isOverLimit ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    value={newItem.phase1Qty}
                    onChange={(e) => setNewItem({...newItem, phase1Qty: Number(e.target.value)})}
                 />
            </div>
            <div className="md:col-span-2">
                 <label className="block text-xs font-medium text-gray-500 mb-1">SL GĐ2</label>
                 <input 
                    type="number" min="0"
                    className={`block w-full border rounded-md shadow-sm p-2 text-sm ${isOverLimit ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    value={newItem.phase2Qty}
                    onChange={(e) => setNewItem({...newItem, phase2Qty: Number(e.target.value)})}
                 />
            </div>

             <div className="md:col-span-2">
                <button 
                    onClick={handleSaveItem}
                    disabled={!selectedEqCode || isOverLimit}
                    className={`w-full flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white disabled:bg-gray-400 disabled:cursor-not-allowed ${editingId ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {editingId ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {editingId ? "Cập nhật" : "Thêm"}
                </button>
            </div>
             <div className="md:col-span-12">
                 {isOverLimit && (
                     <div className="text-red-600 text-xs font-bold mb-2 flex items-center">
                        <X className="w-3 h-3 mr-1" />
                        Lỗi: Tổng số lượng Giai đoạn ({totalPhases}) đang vượt quá Tổng số lượng dự trù ({totalQuantity}).
                     </div>
                 )}
                 <label className="block text-xs font-medium text-gray-500 mb-1">Ghi chú</label>
                 <input 
                    type="text"
                    className="block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                    placeholder="Ghi chú thêm..."
                    value={newItem.notes}
                    onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                 />
            </div>
        </div>
      </div>

      {/* PRINT VIEW HEADER */}
      <div className="hidden print:block text-center mb-8 pt-4">
          <h1 className="text-2xl font-bold uppercase">BẢNG ĐỀ NGHỊ DỰ TRÙ VẬT TƯ - THIẾT BỊ</h1>
          <p className="italic mt-2">Ngày lập: {meta.createdDate ? new Date(meta.createdDate).toLocaleDateString('vi-VN') : '...'}</p>
      </div>

      {/* TABLE */}
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200 print:shadow-none print:border-gray-800">
          <table className="min-w-full divide-y divide-gray-200 print:divide-gray-500">
              <thead className="bg-gray-50 print:bg-gray-200">
                  <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-10 border print:border-gray-500 print:text-black">STT</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32 border print:border-gray-500 print:text-black">Mã VT/TB</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border print:border-gray-500 print:text-black">Tên Vật tư / Thiết bị</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-64 border print:border-gray-500 print:text-black">Thông số kỹ thuật</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20 bg-blue-50 border print:border-gray-500 print:bg-gray-200 print:text-black">Tổng SL</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20 border print:border-gray-500 print:text-black">GĐ 1</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20 border print:border-gray-500 print:text-black">GĐ 2</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48 border print:border-gray-500 print:text-black">Ghi chú</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20 no-print border">Thao tác</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 print:divide-gray-500">
                  {items.length === 0 ? (
                      <tr>
                          <td colSpan={9} className="px-6 py-8 text-center text-gray-500 italic border print:border-gray-500">
                              Chưa có thiết bị nào trong bảng dự trù.
                          </td>
                      </tr>
                  ) : (
                      items.map((item, index) => (
                          <tr key={item.id} className={`hover:bg-gray-50 ${editingId === item.id ? 'bg-yellow-50' : ''} print:bg-transparent`}>
                              <td className="px-4 py-3 text-center text-sm text-gray-500 border print:border-gray-500 print:text-black">{index + 1}</td>
                              <td className="px-4 py-3 text-sm font-mono text-blue-600 font-medium border print:border-gray-500 print:text-black">{item.itemCode}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 font-medium border print:border-gray-500 print:text-black">{item.itemName}</td>
                              <td className="px-4 py-3 text-sm text-gray-500 text-xs border print:border-gray-500 print:text-black">{item.itemSpecs}</td>
                              <td className="px-4 py-3 text-center text-sm font-bold bg-blue-50 border print:bg-transparent print:border-gray-500 print:text-black">{item.quantity}</td>
                              <td className="px-4 py-3 text-center text-sm text-gray-700 border print:border-gray-500 print:text-black">{item.phase1Qty || '-'}</td>
                              <td className="px-4 py-3 text-center text-sm text-gray-700 border print:border-gray-500 print:text-black">{item.phase2Qty || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-500 italic border print:border-gray-500 print:text-black">{item.notes}</td>
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