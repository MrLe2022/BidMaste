import React, { useState, useEffect, useRef } from 'react';
import { Equipment } from '../types';
import * as Storage from '../services/storage';
import { Plus, Trash2, Upload, Search, FileDown, FileSpreadsheet, Pencil, Lock, Layers, ChevronRight, Home, CheckSquare, Square, MoreVertical, AlertOctagon, XCircle } from 'lucide-react';
import Modal from '../components/Modal';
import { readExcel, exportToExcel } from '../utils/excelHelper';

const EquipmentPage: React.FC = () => {
  const [items, setItems] = useState<Equipment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form State
  const [formData, setFormData] = useState<Partial<Equipment>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Permission
  const currentUser = Storage.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = () => {
    const allItems = Storage.getEquipment();
    
    // Filter based on permissions (Groups)
    if (isAdmin) {
        setItems(allItems);
    } else {
        const allowedGroups = currentUser?.allowedGroups || [];
        const allowedItems = allItems.filter(item => allowedGroups.includes(item.group || 'Chung'));
        setItems(allowedItems);
    }
    // Reset selection on reload
    setSelectedIds(new Set());
  };

  // Get unique groups for filter and suggestions
  const uniqueGroups = Array.from(new Set(items.map(i => i.group || 'Chung'))).sort();

  const handleSave = () => {
    if (!formData.code || !formData.name) return;
    
    const allItems = Storage.getEquipment();
    let updated: Equipment[];
    const itemGroup = formData.group || 'Chung';

    if (editingId) {
        // Update existing
        updated = allItems.map(item => 
            item.id === editingId 
            ? { ...item, code: formData.code!, name: formData.name!, specs: formData.specs || '', group: itemGroup }
            : item
        );
        Storage.logActivity("Sửa", `Cập nhật thiết bị ${formData.code}`);
    } else {
        // Create new
        const newItem: Equipment = {
            id: crypto.randomUUID(),
            code: formData.code,
            name: formData.name,
            specs: formData.specs || '',
            group: itemGroup
        };
        updated = [...allItems, newItem];
        Storage.logActivity("Thêm", `Thêm thiết bị mới ${formData.code}`);
    }

    Storage.saveEquipment(updated);
    loadData(); // Reload to update UI and permissions
    closeModal();
  };

  const handleEdit = (item: Equipment) => {
      setFormData({
          code: item.code,
          name: item.name,
          specs: item.specs,
          group: item.group
      });
      setEditingId(item.id);
      setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setFormData({});
      setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa thiết bị này không?')) {
      const allItems = Storage.getEquipment();
      const itemToDelete = allItems.find(i => i.id === id);
      const updated = allItems.filter(i => i.id !== id);
      
      Storage.saveEquipment(updated);
      Storage.logActivity("Xóa", `Xóa thiết bị ${itemToDelete?.code}`);

      loadData();
    }
  };

  // --- BULK ACTIONS ---

  const handleSelectAll = () => {
      if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
          setSelectedIds(new Set());
      } else {
          const newSet = new Set<string>();
          filteredItems.forEach(i => newSet.add(i.id));
          setSelectedIds(newSet);
      }
  };

  const toggleSelect = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedIds(newSet);
  };

  const handleDeleteSelected = () => {
      if (selectedIds.size === 0) return;
      if (confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} thiết bị đang chọn không?`)) {
          const allItems = Storage.getEquipment();
          const updated = allItems.filter(i => !selectedIds.has(i.id));
          
          Storage.saveEquipment(updated);
          Storage.logActivity("Xóa nhiều", `Đã xóa ${selectedIds.size} thiết bị`);
          loadData();
      }
  };

  const handleDeleteGroup = () => {
      if (!isAdmin) return;
      if (!groupFilter) {
          alert("Vui lòng chọn một Nhóm trên thanh lọc trước để thực hiện xóa theo nhóm.");
          return;
      }
      
      // Calculate count first
      const allItems = Storage.getEquipment();
      const itemsInGroup = allItems.filter(i => (i.group || 'Chung') === groupFilter);
      
      if (itemsInGroup.length === 0) {
          alert("Nhóm này không có thiết bị nào.");
          return;
      }

      if (confirm(`CẢNH BÁO: Bạn sắp xóa TOÀN BỘ ${itemsInGroup.length} thiết bị thuộc nhóm "${groupFilter}".\n\nHành động này không thể hoàn tác. Bạn có chắc chắn không?`)) {
          const updated = allItems.filter(i => (i.group || 'Chung') !== groupFilter);
          Storage.saveEquipment(updated);
          Storage.logActivity("Xóa Nhóm", `Đã xóa nhóm ${groupFilter}`);
          loadData();
          alert("Đã xóa nhóm thành công.");
      }
  };

  const handleDeleteAll = () => {
      if (!isAdmin) return;
      const confirm1 = confirm("CẢNH BÁO NGUY HIỂM: Bạn đang yêu cầu XÓA TẤT CẢ dữ liệu trong Danh mục Thiết bị.\n\nBạn có thực sự muốn tiếp tục?");
      if (confirm1) {
          const confirm2 = confirm("XÁC NHẬN LẦN CUỐI: Toàn bộ dữ liệu thiết bị sẽ bị mất vĩnh viễn.\n\nNhấn OK để xóa sạch.");
          if (confirm2) {
              Storage.saveEquipment([]);
              Storage.logActivity("Xóa Tất cả", "Đã xóa toàn bộ danh mục thiết bị");
              loadData();
              alert("Đã xóa sạch dữ liệu.");
          }
      }
  };

  // --- IMPORT ACTIONS ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
        alert("Vui lòng chọn file Excel.");
        return;
    }

    try {
      const parsed = await readExcel(importFile);
      const allItems = Storage.getEquipment();
      
      const newItems: Equipment[] = parsed.map((row: any) => ({
        id: crypto.randomUUID(),
        code: row.Code || row.code || '',
        name: row.Name || row.name || '',
        specs: row.Specs || row.specs || '',
        group: row.Group || row.group || row.nhom || row['Nhóm'] || 'Chung',
      })).filter(i => i.code && i.name);

      if (newItems.length === 0) {
        alert("Không tìm thấy dữ liệu hợp lệ. Vui lòng kiểm tra tên cột (Code, Name, Specs, Group).");
        return;
      }

      const updated = [...allItems, ...newItems];
      Storage.saveEquipment(updated);
      Storage.logActivity("Nhập Excel", `Nhập danh mục: ${newItems.length} thiết bị`);

      loadData();
      setIsImportModalOpen(false);
      setImportFile(null);
      alert(`Đã nhập thành công ${newItems.length} thiết bị.`);
    } catch (e) {
      console.error(e);
      alert('Lỗi khi đọc file Excel. Vui lòng đảm bảo file đúng định dạng .xlsx hoặc .xls.');
    }
  };

  const handleDownloadTemplate = () => {
      exportToExcel('equipment_template.xlsx', [{ Code: 'EQ001', Name: 'Khoan tay', Specs: 'Công suất 500W', Group: 'Dụng cụ cầm tay' }]);
  }

  const filteredItems = items.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = groupFilter ? (i.group || 'Chung') === groupFilter : true;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-gray-500 mb-2">
        <span className="flex items-center hover:text-blue-600 cursor-pointer"><Home className="w-4 h-4 mr-1"/> Trang chủ</span>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="font-medium text-gray-800">Danh mục Vật tư - Thiết bị</span>
      </nav>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Toolbar */}
          <div className="p-5 border-b border-gray-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Danh mục Thiết bị</h2>
              <p className="text-sm text-gray-500 mt-1">
                  {isAdmin ? "Quản lý toàn bộ danh mục và phân nhóm hệ thống." : "Danh sách các thiết bị thuộc nhóm bạn được phân quyền."}
              </p>
            </div>
            
            {isAdmin && (
                <div className="flex flex-wrap gap-3">
                    <button 
                        onClick={handleDeleteAll}
                        className="flex items-center px-3 py-2 border border-red-200 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition shadow-sm font-medium text-sm"
                        title="Xóa toàn bộ danh mục"
                    >
                        <AlertOctagon className="w-4 h-4 mr-2" /> Xóa Tất cả
                    </button>
                    <button 
                        onClick={handleDeleteGroup}
                        className={`flex items-center px-3 py-2 border rounded-lg transition shadow-sm font-medium text-sm ${groupFilter ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 cursor-pointer' : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'}`}
                        title={groupFilter ? `Xóa toàn bộ nhóm "${groupFilter}"` : "Chọn 1 nhóm để xóa"}
                        disabled={!groupFilter}
                    >
                        <Layers className="w-4 h-4 mr-2" /> Xóa theo Nhóm
                    </button>
                    <div className="w-px h-8 bg-gray-300 mx-1 hidden sm:block"></div>
                    <button 
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium text-sm"
                    >
                        <Upload className="w-4 h-4 mr-2" /> Nhập Excel
                    </button>
                    <button 
                        onClick={() => {
                            setEditingId(null);
                            setFormData({});
                            setIsModalOpen(true);
                        }}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium text-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Thêm Mới
                    </button>
                </div>
            )}
          </div>

          {/* Filters Bar & Bulk Actions */}
          <div className="p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {selectedIds.size > 0 ? (
                  <div className="md:col-span-12 flex items-center justify-between bg-blue-100 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg animate-in fade-in duration-200">
                      <div className="font-medium flex items-center">
                          <CheckSquare className="w-5 h-5 mr-2" />
                          Đã chọn {selectedIds.size} thiết bị
                      </div>
                      <div className="flex gap-3">
                          <button 
                            onClick={() => setSelectedIds(new Set())}
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                              Bỏ chọn
                          </button>
                          <button 
                            onClick={handleDeleteSelected}
                            className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition shadow-sm text-sm font-bold"
                          >
                              <Trash2 className="w-4 h-4 mr-2" /> Xóa {selectedIds.size} mục
                          </button>
                      </div>
                  </div>
              ) : (
                  <>
                    <div className="md:col-span-8 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input 
                        type="text"
                        placeholder="Tìm kiếm theo mã hoặc tên thiết bị..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-4 relative">
                        <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <select
                            className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white cursor-pointer hover:border-blue-400 transition-colors"
                            value={groupFilter}
                            onChange={(e) => setGroupFilter(e.target.value)}
                        >
                            <option value="">-- Tất cả Nhóm --</option>
                            {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 text-gray-400 w-4 h-4 pointer-events-none" />
                    </div>
                  </>
              )}
          </div>

          {/* List Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-4 w-12 text-center">
                      <button 
                        onClick={handleSelectAll}
                        className="text-gray-500 hover:text-blue-600 focus:outline-none"
                        title="Chọn tất cả"
                      >
                          {selectedIds.size > 0 && selectedIds.size === filteredItems.length ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                              <Square className="w-5 h-5" />
                          )}
                      </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-32">Mã VT/TB</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tên Vật tư / Thiết bị</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-40">Nhóm</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Thông số kỹ thuật</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      {isAdmin ? "Chưa có dữ liệu. Hãy thêm mới hoặc nhập từ Excel." : "Bạn chưa được cấp quyền xem nhóm thiết bị nào hoặc không tìm thấy kết quả."}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    return (
                        <tr key={item.id} className={`transition-colors duration-150 group ${isSelected ? 'bg-blue-50' : 'hover:bg-blue-50/50'}`}>
                        <td className="px-4 py-4 text-center">
                            <button 
                                onClick={() => toggleSelect(item.id)}
                                className="focus:outline-none"
                            >
                                {isSelected ? (
                                    <CheckSquare className="w-5 h-5 text-blue-600" />
                                ) : (
                                    <Square className="w-5 h-5 text-gray-300 group-hover:text-gray-400" />
                                )}
                            </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 font-mono">{item.code}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium border border-gray-200">
                                {item.group || 'Chung'}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {item.specs ? item.specs : <span className="text-gray-300 italic">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {isAdmin ? (
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleEdit(item)} 
                                    className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-all"
                                    title="Chỉnh sửa"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(item.id)} 
                                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition-all"
                                    title="Xóa"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            ) : (
                                <span className="text-gray-400 text-xs flex items-center justify-end">
                                    <Lock className="w-3 h-3 mr-1"/> Chỉ xem
                                </span>
                            )}
                        </td>
                        </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? "Cập nhật Thiết bị" : "Thêm Thiết bị mới"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Mã VT/TB *</label>
                <input 
                  type="text" 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.code || ''}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  placeholder="VD: EQ-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nhóm thiết bị</label>
                <input 
                  type="text"
                  list="groups-list"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.group || ''}
                  onChange={e => setFormData({...formData, group: e.target.value})}
                  placeholder="VD: Văn phòng phẩm"
                />
                <datalist id="groups-list">
                    {uniqueGroups.map(g => <option key={g} value={g} />)}
                </datalist>
              </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tên VT/TB *</label>
            <input 
              type="text" 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="VD: Máy khoan công nghiệp"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Thông số kỹ thuật</label>
            <textarea 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.specs || ''}
              onChange={e => setFormData({...formData, specs: e.target.value})}
              rows={3}
            />
          </div>
          <button 
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
            onClick={handleSave}
          >
            {editingId ? "Cập nhật" : "Lưu dữ liệu"}
          </button>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Nhập dữ liệu từ Excel">
        <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-800 border border-blue-100">
                <p className="font-semibold text-blue-900">Hướng dẫn:</p>
                <ol className="list-decimal ml-4 mt-1 space-y-1">
                    <li>Tải xuống file mẫu Excel.</li>
                    <li>Điền dữ liệu (Code, Name, Group, Specs).</li>
                    <li>Tải lên file đã điền dữ liệu bên dưới.</li>
                </ol>
                <button onClick={handleDownloadTemplate} className="mt-3 flex items-center text-blue-700 hover:text-blue-900 font-medium transition-colors bg-white px-3 py-1.5 rounded border border-blue-200 shadow-sm">
                    <FileDown className="w-4 h-4 mr-1"/> Tải file mẫu
                </button>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                 <FileSpreadsheet className="w-12 h-12 text-green-600 mb-3" />
                 <p className="text-sm text-gray-600 font-medium">
                     {importFile ? <span className="text-green-600 font-bold">{importFile.name}</span> : "Nhấn để chọn file Excel (.xlsx)"}
                 </p>
                 <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileChange}
                 />
            </div>

          <button 
            className={`w-full py-2.5 rounded-lg text-white font-medium transition ${importFile ? 'bg-green-600 hover:bg-green-700 shadow-md' : 'bg-gray-300 cursor-not-allowed'}`}
            onClick={handleImport}
            disabled={!importFile}
          >
            Tiến hành Nhập
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default EquipmentPage;