import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Quotation, Equipment } from '../types';
import * as Storage from '../services/storage';
import { Plus, Trash2, Upload, Search, FileDown, AlertCircle, FileSpreadsheet, HelpCircle, Filter, X, ArrowUp, ArrowDown, ArrowUpDown, Pencil, CheckCircle2, AlertTriangle } from 'lucide-react';
import Modal from '../components/Modal';
import { readExcel, exportToExcel } from '../utils/excelHelper';

type SortKey = 'itemCode' | 'supplierName' | 'brand' | 'price' | 'technicalScore' | '';
type SortDirection = 'asc' | 'desc';

interface ImportPreview extends Quotation {
    isValid: boolean;
    error: string | null;
    originalRow: number;
}

const QuotationsPage: React.FC = () => {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [filterItem, setFilterItem] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterBrand, setFilterBrand] = useState('');

  // Sort State
  const [sortKey, setSortKey] = useState<SortKey>('itemCode'); // Default sort by Item Code
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Form State
  const [formData, setFormData] = useState<Partial<Quotation>>({ technicalScore: 5, vatIncluded: false });
  const [priceError, setPriceError] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Import State
  const [importPreview, setImportPreview] = useState<ImportPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuotes(Storage.getQuotes());
    setEquipment(Storage.getEquipment());
  }, []);

  // Derive unique lists for dropdowns
  const uniqueSuppliers = useMemo(() => {
    return Array.from(new Set(quotes.map(q => q.supplierName))).sort();
  }, [quotes]);

  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(quotes.map(q => q.brand).filter(b => b))).sort();
  }, [quotes]);

  const handleSave = () => {
    if (!formData.itemCode || !formData.supplierName || formData.price === undefined) return;
    
    if (formData.price <= 0) {
        setPriceError('Giá phải lớn hơn 0');
        return;
    }

    let updated: Quotation[];
    
    if (editingId) {
        // Update existing
        updated = quotes.map(q => {
            if (q.id === editingId) {
                return {
                    ...q,
                    itemCode: formData.itemCode!,
                    supplierName: formData.supplierName!,
                    brand: formData.brand || '',
                    price: Number(formData.price),
                    vatIncluded: formData.vatIncluded || false,
                    technicalScore: Number(formData.technicalScore) || 5,
                    techScoreReason: formData.techScoreReason || '',
                    notes: formData.notes || '',
                }
            }
            return q;
        });
    } else {
         // Create new
         const newQuote: Quotation = {
            id: crypto.randomUUID(),
            itemCode: formData.itemCode,
            supplierName: formData.supplierName,
            brand: formData.brand || '',
            price: Number(formData.price),
            vatIncluded: formData.vatIncluded || false,
            technicalScore: Number(formData.technicalScore) || 5,
            techScoreReason: formData.techScoreReason || '',
            notes: formData.notes || '',
        };
        updated = [...quotes, newQuote];
    }

    setQuotes(updated);
    Storage.saveQuotes(updated);
    closeModal();
  };

  const handleEdit = (quote: Quotation) => {
      setFormData({
          itemCode: quote.itemCode,
          supplierName: quote.supplierName,
          brand: quote.brand,
          price: quote.price,
          vatIncluded: quote.vatIncluded,
          technicalScore: quote.technicalScore,
          techScoreReason: quote.techScoreReason,
          notes: quote.notes
      });
      setEditingId(quote.id);
      setPriceError('');
      setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setFormData({ technicalScore: 5, vatIncluded: false });
      setEditingId(null);
      setPriceError('');
  };

  const closeImportModal = () => {
      setIsImportModalOpen(false);
      setImportPreview([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleQuickUpdate = (id: string, field: keyof Quotation, value: any) => {
    const updated = quotes.map(q => {
        if (q.id === id) {
            return { ...q, [field]: value };
        }
        return q;
    });
    setQuotes(updated);
    Storage.saveQuotes(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa báo giá này không?')) {
      const updated = quotes.filter(q => q.id !== id);
      setQuotes(updated);
      Storage.saveQuotes(updated);
    }
  };

  const processImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      try {
        const parsed = await readExcel(file);
        if (parsed.length === 0) {
            alert("File không có dữ liệu.");
            return;
        }

        // Helper to find value by multiple possible headers (case-insensitive)
        const getValue = (row: any, ...candidates: string[]) => {
            const keys = Object.keys(row);
            for (const candidate of candidates) {
            const match = keys.find(k => k.toLowerCase().trim() === candidate.toLowerCase());
            if (match) return row[match];
            }
            return undefined;
        };

        const previewData: ImportPreview[] = parsed.map((row, index) => {
            const rowNum = index + 2; // Excel header is 1, data starts at 2
            
            // Flexible Column Mapping
            const supplier = getValue(row, 'supplier', 'supplier name', 'vendor', 'provider', 'suppliername', 'nhà cung cấp', 'tên nhà cung cấp');
            const code = getValue(row, 'code', 'item code', 'itemcode', 'part number', 'material code', 'equipment code', 'item', 'mã', 'mã vt', 'mã tb');
            const brand = getValue(row, 'brand', 'make', 'manufacturer', 'origin', 'model', 'brand name', 'hãng', 'xuất xứ', 'nhãn hiệu');
            const priceVal = getValue(row, 'price', 'unit price', 'cost', 'amount', 'bid', 'total price', 'quoted price', 'giá', 'đơn giá', 'thành tiền');
            const notes = getValue(row, 'notes', 'comments', 'remarks', 'deviation', 'description', 'note', 'ghi chú');
            const vatVal = getValue(row, 'vat', 'tax', 'thuế', 'vat included', 'include vat', 'has vat');

            let vatIncluded = false;
            if (vatVal !== undefined && vatVal !== null) {
                const v = String(vatVal).toLowerCase().trim();
                if (['yes', 'y', 'có', 'c', 'true', '1', 'x', 'included'].includes(v)) {
                    vatIncluded = true;
                }
            }

            let isValid = true;
            let error = null;
            let price = 0;

            // Validation Logic
            if (!supplier) {
                isValid = false;
                error = "Thiếu Tên Nhà cung cấp";
            } else if (!code) {
                isValid = false;
                error = "Thiếu Mã VT/TB";
            } else if (priceVal === undefined || priceVal === null || priceVal === '') {
                isValid = false;
                error = "Thiếu Giá";
            } else {
                // Parse Price
                if (typeof priceVal === 'number') {
                    price = priceVal;
                } else {
                    const cleanStr = String(priceVal).replace(/[^0-9.-]/g, '');
                    price = parseFloat(cleanStr);
                }

                if (isNaN(price)) {
                    isValid = false;
                    error = `Giá trị '${priceVal}' không phải là số`;
                } else if (price <= 0) {
                    isValid = false;
                    error = `Giá phải lớn hơn 0 (Giá trị: ${priceVal})`;
                }
            }

            return {
                id: crypto.randomUUID(),
                supplierName: supplier || '',
                itemCode: code || '',
                brand: brand || '',
                price: price,
                vatIncluded: vatIncluded,
                technicalScore: 5,
                techScoreReason: '',
                notes: notes || '',
                isValid,
                error,
                originalRow: rowNum
            };
        });

        setImportPreview(previewData);

      } catch (e: any) {
        console.error(e);
        alert('Lỗi đọc file: ' + (e.message || 'Unknown error'));
      }
    }
  };

  const handleImportConfirm = () => {
    const validRows = importPreview.filter(r => r.isValid);
    if (validRows.length === 0) {
        alert("Không có dữ liệu hợp lệ để nhập.");
        return;
    }

    // Clean up temporary props
    const newQuotes: Quotation[] = validRows.map(({ isValid, error, originalRow, ...quote }) => quote);
    
    const updated = [...quotes, ...newQuotes];
    setQuotes(updated);
    Storage.saveQuotes(updated);
    
    alert(`Đã nhập thành công ${newQuotes.length} dòng.`);
    closeImportModal();
  };

   const handleDownloadTemplate = () => {
      exportToExcel('quotation_template.xlsx', [{ 
          'Supplier Name': 'Công ty A', 
          'Item Code': 'EQ001', 
          'Brand': 'Hãng X', 
          'Price': 1000, 
          'VAT (Yes/No)': 'Yes',
          'Notes': 'Bảo hành tiêu chuẩn' 
      }]);
  }

  const clearFilters = () => {
      setSearch('');
      setFilterItem('');
      setFilterSupplier('');
      setFilterBrand('');
  };

  // Logic: Filter -> Sort
  const processedQuotes = useMemo(() => {
    // 1. Filter
    let result = quotes.filter(q => {
        const matchSearch = search ? (
            q.supplierName.toLowerCase().includes(search.toLowerCase()) || 
            q.itemCode.toLowerCase().includes(search.toLowerCase()) ||
            (q.brand && q.brand.toLowerCase().includes(search.toLowerCase())) ||
            (q.notes && q.notes.toLowerCase().includes(search.toLowerCase()))
        ) : true;

        const matchItem = filterItem ? q.itemCode === filterItem : true;
        const matchSupplier = filterSupplier ? q.supplierName === filterSupplier : true;
        const matchBrand = filterBrand ? q.brand === filterBrand : true;

        return matchSearch && matchItem && matchSupplier && matchBrand;
    });

    // 2. Sort
    if (sortKey) {
        result.sort((a, b) => {
            let valA = a[sortKey];
            let valB = b[sortKey];
            
            // Handle undefined/null strings
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return result;
  }, [quotes, search, filterItem, filterSupplier, filterBrand, sortKey, sortDirection]);

  // Helper for Sort Headers
  const SortableHeader = ({ label, sortKeyVal, className = '' }: { label: string, sortKeyVal: SortKey, className?: string }) => {
      const isActive = sortKey === sortKeyVal;
      return (
          <button 
            onClick={() => {
                if (isActive) {
                    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                } else {
                    setSortKey(sortKeyVal);
                    setSortDirection('asc');
                }
            }}
            className={`flex items-center space-x-1 hover:text-blue-600 transition-colors group ${className} ${isActive ? 'text-blue-700 font-bold' : ''}`}
          >
              <span>{label}</span>
              {isActive ? (
                  sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
              ) : (
                  <ArrowUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
          </button>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Quản lý Báo giá</h2>
          <p className="text-sm text-gray-500">Quản lý hồ sơ thầu, giá cả và điều chỉnh điểm kỹ thuật.</p>
        </div>
        <div className="flex gap-2">
            <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm"
          >
            <Upload className="w-4 h-4 mr-2" /> Nhập Excel
          </button>
          <button 
            onClick={() => {
                setEditingId(null);
                setPriceError('');
                setFormData({ technicalScore: 5, vatIncluded: false });
                setIsModalOpen(true);
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Thêm Báo giá
          </button>
        </div>
      </div>

       {/* Advanced Filters */}
       <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
           <div className="flex items-center mb-2 text-gray-700 font-medium text-sm">
               <Filter className="w-4 h-4 mr-2" />
               Bộ lọc & Tìm kiếm
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Search Text */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                    type="text"
                    placeholder="Tìm từ khóa..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Filter Item */}
                <select 
                    className="w-full py-2 px-3 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    value={filterItem}
                    onChange={(e) => setFilterItem(e.target.value)}
                >
                    <option value="">-- Tất cả Thiết bị --</option>
                    {equipment.map(e => (
                        <option key={e.id} value={e.code}>{e.code} - {e.name}</option>
                    ))}
                </select>

                {/* Filter Supplier */}
                 <select 
                    className="w-full py-2 px-3 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    value={filterSupplier}
                    onChange={(e) => setFilterSupplier(e.target.value)}
                >
                    <option value="">-- Tất cả Nhà cung cấp --</option>
                    {uniqueSuppliers.map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>

                {/* Filter Brand */}
                <div className="flex gap-2">
                     <select 
                        className="w-full py-2 px-3 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                        value={filterBrand}
                        onChange={(e) => setFilterBrand(e.target.value)}
                    >
                        <option value="">-- Tất cả Hãng --</option>
                        {uniqueBrands.map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                    {(search || filterItem || filterSupplier || filterBrand) && (
                        <button 
                            onClick={clearFilters}
                            title="Xóa bộ lọc"
                            className="px-2 py-2 text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 rounded-md transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
           </div>
       </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex gap-4">
                        <SortableHeader label="VT/TB" sortKeyVal="itemCode" />
                        <span className="text-gray-300">|</span>
                        <SortableHeader label="Nhà Cung Cấp" sortKeyVal="supplierName" />
                    </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex gap-4">
                        <SortableHeader label="Hãng" sortKeyVal="brand" />
                        <span className="text-gray-300">|</span>
                        <SortableHeader label="Giá" sortKeyVal="price" />
                    </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Ghi chú</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                     <div className="flex justify-center">
                        <SortableHeader label="Điểm KT" sortKeyVal="technicalScore" />
                     </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">Lý do điều chỉnh</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {processedQuotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Chưa có báo giá nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                processedQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                     <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-blue-600 flex items-center">
                            {quote.itemCode}
                            {!equipment.find(e => e.code === quote.itemCode) && (
                                <AlertCircle className="w-3 h-3 ml-1 text-red-500" title="Mã VT/TB không tồn tại"/>
                            )}
                        </div>
                        <div className="text-gray-900">{quote.supplierName}</div>
                     </td>
                    <td className="px-6 py-4 text-sm">
                        <div className="text-gray-500">{quote.brand}</div>
                        <div className="font-mono font-medium text-gray-900 mt-1">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(quote.price)}
                            {quote.vatIncluded ? <span className="text-xs text-blue-600 ml-1 font-sans">(VAT)</span> : <span className="text-xs text-gray-400 ml-1 font-sans">(Chưa VAT)</span>}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="line-clamp-2 max-w-xs" title={quote.notes}>
                            {quote.notes || '-'}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <input 
                            type="number"
                            min="1"
                            max="10"
                            step="0.5"
                            className={`w-16 text-center border rounded py-1 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none ${
                                quote.technicalScore >= 8 ? 'bg-green-50 border-green-200 text-green-800' :
                                quote.technicalScore >= 5 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                                'bg-red-50 border-red-200 text-red-800'
                            }`}
                            value={quote.technicalScore}
                            onChange={(e) => {
                                let val = parseFloat(e.target.value);
                                if (val > 10) val = 10;
                                if (val < 0) val = 0;
                                handleQuickUpdate(quote.id, 'technicalScore', val);
                            }}
                        />
                    </td>
                    <td className="px-6 py-4">
                        <input 
                            type="text"
                            placeholder="Giải trình..."
                            className="w-full border-b border-transparent bg-transparent focus:border-blue-500 focus:bg-white text-sm text-gray-600 outline-none transition-colors px-1 py-1 placeholder-gray-300"
                            value={quote.techScoreReason || ''}
                            onChange={(e) => handleQuickUpdate(quote.id, 'techScoreReason', e.target.value)}
                        />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(quote)} className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-full hover:bg-blue-100 transition">
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(quote.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full hover:bg-red-100 transition">
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

       <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? "Cập nhật Báo giá" : "Thêm Báo giá Mới"}>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Mã VT/TB *</label>
                <select 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white focus:ring-blue-500 focus:border-blue-500"
                    value={formData.itemCode || ''}
                    onChange={e => setFormData({...formData,itemCode: e.target.value})}
                >
                    <option value="">Chọn VT/TB</option>
                    {equipment.map(e => (
                        <option key={e.id} value={e.code}>{e.code} - {e.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Nhà cung cấp *</label>
                <input 
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={formData.supplierName || ''}
                    onChange={e => setFormData({...formData, supplierName: e.target.value})}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Hãng / Xuất xứ</label>
                    <input 
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={formData.brand || ''}
                        onChange={e => setFormData({...formData, brand: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Đơn giá (VND) *</label>
                    <input 
                        type="number"
                        min="0"
                        step="1000"
                        className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${priceError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                        value={formData.price ?? ''}
                        onChange={e => {
                            const valStr = e.target.value;
                            const val = parseFloat(valStr);
                            if (val < 0) {
                                setPriceError('Giá không được âm');
                            } else {
                                setPriceError('');
                            }
                            setFormData({...formData, price: isNaN(val) ? undefined : val});
                        }}
                    />
                    {priceError && <p className="mt-1 text-sm text-red-600">{priceError}</p>}
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <input 
                    type="checkbox"
                    id="vatIncluded"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={formData.vatIncluded || false}
                    onChange={e => setFormData({...formData, vatIncluded: e.target.checked})}
                />
                <label htmlFor="vatIncluded" className="text-sm font-medium text-gray-700">
                    Giá đã bao gồm thuế VAT?
                </label>
            </div>

            <div className="border-t pt-4 border-gray-100">
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                    Đánh giá Kỹ thuật <HelpCircle className="w-3 h-3 ml-1 text-gray-400"/>
                </h4>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Điểm Kỹ thuật (1-10)</label>
                        <div className="flex items-center gap-4 mt-1">
                            <input 
                                type="range"
                                min="1" max="10" step="0.5"
                                className="w-full"
                                value={formData.technicalScore || 5}
                                onChange={e => setFormData({...formData, technicalScore: Number(e.target.value)})}
                            />
                            <span className="font-bold text-lg w-10 text-center bg-gray-100 rounded">{formData.technicalScore}</span>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Lý do chấm điểm / Giải trình</label>
                        <input 
                            type="text"
                            placeholder="Tại sao điểm số này? (VD: Đáp ứng tốt, sai lệch nhỏ...)"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={formData.techScoreReason || ''}
                            onChange={e => setFormData({...formData, techScoreReason: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            <div>
                 <label className="block text-sm font-medium text-gray-700">Ghi chú chung / Sai lệch</label>
                 <textarea
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={formData.notes || ''}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    rows={2}
                    placeholder="Nhận xét chung về hồ sơ thầu này..."
                 />
            </div>
          <button 
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            onClick={handleSave}
          >
            {editingId ? "Cập nhật" : "Lưu Báo giá"}
          </button>
        </div>
      </Modal>

      <Modal isOpen={isImportModalOpen} onClose={closeImportModal} title="Nhập Báo giá từ Excel">
        <div className="space-y-4">
            {!importPreview.length ? (
                <>
                <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-800">
                        <p className="font-semibold mb-1">Hướng dẫn:</p>
                        <ol className="list-decimal ml-4 mt-1 space-y-1">
                            <li>Tải xuống file mẫu Excel.</li>
                            <li>Điền dữ liệu (Nhà cung cấp, Mã VT/TB, Giá, VAT (Yes/No), Ghi chú).</li>
                            <li>Tải lên file Excel.</li>
                        </ol>
                        <button onClick={handleDownloadTemplate} className="mt-3 flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors">
                            <FileDown className="w-4 h-4 mr-1"/> Tải file mẫu
                        </button>
                    </div>
                    
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <FileSpreadsheet className="w-12 h-12 text-green-600 mb-2" />
                        <p className="text-sm text-gray-600 font-medium">
                            Nhấn để chọn file Excel
                        </p>
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept=".xlsx, .xls" 
                            onChange={processImportFile}
                        />
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                     <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                         <span className="text-sm font-medium">
                             Tổng số dòng: <b>{importPreview.length}</b> 
                             (Hợp lệ: <span className="text-green-600">{importPreview.filter(r => r.isValid).length}</span>, 
                             Lỗi: <span className="text-red-600">{importPreview.filter(r => !r.isValid).length}</span>)
                         </span>
                         <button 
                            onClick={closeImportModal}
                            className="text-gray-500 hover:text-gray-700 text-sm underline"
                         >
                             Chọn lại file
                         </button>
                     </div>

                     <div className="border rounded-md max-h-80 overflow-y-auto">
                         <table className="min-w-full divide-y divide-gray-200 text-sm">
                             <thead className="bg-gray-50 sticky top-0">
                                 <tr>
                                     <th className="px-3 py-2 text-left font-medium text-gray-500">Dòng</th>
                                     <th className="px-3 py-2 text-left font-medium text-gray-500">Mã VT/TB</th>
                                     <th className="px-3 py-2 text-left font-medium text-gray-500">Nhà cung cấp</th>
                                     <th className="px-3 py-2 text-right font-medium text-gray-500">Giá</th>
                                     <th className="px-3 py-2 text-center font-medium text-gray-500">Trạng thái</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-200">
                                 {importPreview.map((row, idx) => (
                                     <tr key={idx} className={row.isValid ? '' : 'bg-red-50'}>
                                         <td className="px-3 py-2 text-gray-500">{row.originalRow}</td>
                                         <td className="px-3 py-2">{row.itemCode}</td>
                                         <td className="px-3 py-2">{row.supplierName}</td>
                                         <td className="px-3 py-2 text-right">{row.price ? new Intl.NumberFormat('vi-VN').format(row.price) : '-'}</td>
                                         <td className="px-3 py-2">
                                             {row.isValid ? (
                                                 <span className="flex items-center justify-center text-green-600">
                                                     <CheckCircle2 className="w-4 h-4" />
                                                 </span>
                                             ) : (
                                                 <span className="flex items-center text-red-600 text-xs" title={row.error || 'Lỗi không xác định'}>
                                                     <AlertTriangle className="w-4 h-4 mr-1 flex-shrink-0" />
                                                     {row.error}
                                                 </span>
                                             )}
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>

                     <div className="flex gap-2">
                        <button 
                            className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                            onClick={closeImportModal}
                        >
                            Hủy bỏ
                        </button>
                        <button 
                            className={`w-full py-2 rounded-lg text-white transition ${importPreview.some(r => r.isValid) ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                            onClick={handleImportConfirm}
                            disabled={!importPreview.some(r => r.isValid)}
                        >
                            Nhập {importPreview.filter(r => r.isValid).length} dòng hợp lệ
                        </button>
                     </div>
                </div>
            )}
        </div>
      </Modal>
    </div>
  );
};

export default QuotationsPage;