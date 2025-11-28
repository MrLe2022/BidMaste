import React, { useState, useEffect, useRef } from 'react';
import { Equipment } from '../types';
import * as Storage from '../services/storage';
import { Plus, Trash2, Upload, Search, FileDown, FileSpreadsheet, Pencil } from 'lucide-react';
import Modal from '../components/Modal';
import { readExcel, exportToExcel } from '../utils/excelHelper';

const EquipmentPage: React.FC = () => {
  const [items, setItems] = useState<Equipment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<Partial<Equipment>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(Storage.getEquipment());
  }, []);

  const handleSave = () => {
    if (!formData.code || !formData.name) return;
    
    let updated: Equipment[];

    if (editingId) {
        // Update existing
        updated = items.map(item => 
            item.id === editingId 
            ? { ...item, code: formData.code!, name: formData.name!, specs: formData.specs || '' }
            : item
        );
    } else {
        // Create new
        const newItem: Equipment = {
            id: crypto.randomUUID(),
            code: formData.code,
            name: formData.name,
            specs: formData.specs || '',
        };
        updated = [...items, newItem];
    }

    setItems(updated);
    Storage.saveEquipment(updated);
    closeModal();
  };

  const handleEdit = (item: Equipment) => {
      setFormData({
          code: item.code,
          name: item.name,
          specs: item.specs
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
      const updated = items.filter(i => i.id !== id);
      setItems(updated);
      Storage.saveEquipment(updated);
    }
  };

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
      
      const newItems: Equipment[] = parsed.map((row: any) => ({
        id: crypto.randomUUID(),
        code: row.Code || row.code || '',
        name: row.Name || row.name || '',
        specs: row.Specs || row.specs || '',
      })).filter(i => i.code && i.name);

      if (newItems.length === 0) {
        alert("Không tìm thấy dữ liệu hợp lệ trong file Excel. Vui lòng kiểm tra tên cột (Code, Name, Specs).");
        return;
      }

      const updated = [...items, ...newItems];
      setItems(updated);
      Storage.saveEquipment(updated);
      setIsImportModalOpen(false);
      setImportFile(null);
      alert(`Đã nhập thành công ${newItems.length} thiết bị.`);
    } catch (e) {
      console.error(e);
      alert('Lỗi khi đọc file Excel. Vui lòng đảm bảo file đúng định dạng .xlsx hoặc .xls.');
    }
  };

  const handleDownloadTemplate = () => {
      exportToExcel('equipment_template.xlsx', [{ Code: 'EQ001', Name: 'Khoan tay', Specs: 'Công suất 500W' }]);
  }

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Danh mục Vật tư - Thiết bị</h2>
          <p className="text-sm text-gray-500">Quản lý danh sách các mặt hàng cần mua sắm và thông số kỹ thuật.</p>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Upload className="w-4 h-4 mr-2" /> Nhập Excel
          </button>
          <button 
            onClick={() => {
                setEditingId(null);
                setFormData({});
                setIsModalOpen(true);
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4 mr-2" /> Thêm Mới
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text"
          placeholder="Tìm kiếm theo mã hoặc tên..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã VT/TB</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Vật tư / Thiết bị</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thông số kỹ thuật</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Chưa có dữ liệu. Vui lòng thêm mới hoặc nhập từ Excel.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{item.specs}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-full hover:bg-blue-100 transition">
                             <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full hover:bg-red-100 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? "Cập nhật Thiết bị" : "Thêm Thiết bị mới"}>
        <div className="space-y-4">
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
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            onClick={handleSave}
          >
            {editingId ? "Cập nhật" : "Lưu"}
          </button>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Nhập dữ liệu từ Excel">
        <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-800">
                <p className="font-semibold">Hướng dẫn:</p>
                <ol className="list-decimal ml-4 mt-1 space-y-1">
                    <li>Tải xuống file mẫu Excel.</li>
                    <li>Điền dữ liệu (Code, Name, Specs).</li>
                    <li>Tải lên file đã điền dữ liệu bên dưới.</li>
                </ol>
                <button onClick={handleDownloadTemplate} className="mt-3 flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors">
                    <FileDown className="w-4 h-4 mr-1"/> Tải file mẫu
                </button>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                 <FileSpreadsheet className="w-12 h-12 text-green-600 mb-2" />
                 <p className="text-sm text-gray-600 font-medium">
                     {importFile ? importFile.name : "Nhấn để chọn file Excel"}
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
            className={`w-full py-2 rounded-lg text-white transition ${importFile ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
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