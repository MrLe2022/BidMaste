import React, { useMemo, useState } from 'react';
import * as Storage from '../services/storage';
import { AnalysisGroup, ScoredQuote } from '../types';
import { Printer, Download, Award, AlertTriangle, FileText, List, Users, Tag, LayoutList, Loader2, Settings2, AlertCircle, ChevronDown, ChevronRight, CheckCircle2, Filter, X, MousePointerClick } from 'lucide-react';
import { exportToExcel } from '../utils/excelHelper';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

type ReportType = 'full' | 'condensed' | 'supplier' | 'brand';

const AnalysisPage: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('full');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  
  // Weight Configuration State (0-100 scale)
  const [priceWeightPercent, setPriceWeightPercent] = useState<number>(70);

  // Expanded state for Brand Report
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);

  // Supplier Report Filters & Interaction
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [supplierFilterItem, setSupplierFilterItem] = useState('');
  const [supplierFilterBrand, setSupplierFilterBrand] = useState('');
  const [supplierFilterRank, setSupplierFilterRank] = useState('');
  
  const equipment = Storage.getEquipment();
  const allQuotes = Storage.getQuotes();

  // Core Analysis Logic
  const analyzedData = useMemo(() => {
    const results: AnalysisGroup[] = [];
    const processedQuoteIds = new Set<string>();
    
    // Convert percent to decimal (0.7, 0.3)
    const weightPrice = priceWeightPercent / 100;
    const weightTech = (100 - priceWeightPercent) / 100;

    // 1. Process valid equipment groups
    equipment.forEach(item => {
      const itemQuotes = allQuotes.filter(q => q.itemCode === item.code);
      if (itemQuotes.length === 0) return;

      // Mark quotes as processed
      itemQuotes.forEach(q => processedQuoteIds.add(q.id));

      // Calculate lowest price (excluding 0 or negative prices to prevent skewing)
      const validPrices = itemQuotes.map(q => q.price).filter(p => p > 0);
      const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

      const scoredQuotes: ScoredQuote[] = itemQuotes.map(q => {
        // Handle Price Score (if price is 0, score is 0)
        const priceScoreRaw = q.price > 0 && lowestPrice > 0 ? (lowestPrice / q.price) * 10 : 0;
        const priceScore = parseFloat(priceScoreRaw.toFixed(2));
        
        const weightedPriceScore = parseFloat((priceScore * weightPrice).toFixed(2));
        const weightedTechScore = parseFloat((q.technicalScore * weightTech).toFixed(2));
        const totalScore = parseFloat((weightedPriceScore + weightedTechScore).toFixed(2));

        return {
          ...q,
          priceScore,
          weightedPriceScore,
          weightedTechScore,
          totalScore,
          rank: 0, // Will set after sort
          isLowestPrice: q.price === lowestPrice && q.price > 0
        };
      });

      scoredQuotes.sort((a, b) => b.totalScore - a.totalScore);
      scoredQuotes.forEach((q, idx) => q.rank = idx + 1);

      results.push({
        item,
        quotes: scoredQuotes,
        lowestPrice
      });
    });

    // 2. Identify Orphans (Quotes with Item Code not in Equipment list)
    const orphanedQuotes = allQuotes.filter(q => !processedQuoteIds.has(q.id));
    
    if (orphanedQuotes.length > 0) {
        results.push({
            item: {
                id: 'INVALID_CODE_GROUP',
                code: 'ERROR',
                name: 'CẢNH BÁO: Báo giá sai Mã VT/TB',
                specs: 'Các báo giá dưới đây có Mã VT/TB không tồn tại trong Danh mục Thiết bị.'
            },
            quotes: orphanedQuotes.map(q => ({
                ...q,
                priceScore: 0,
                weightedPriceScore: 0,
                weightedTechScore: 0,
                totalScore: 0,
                rank: 0,
                isLowestPrice: false
            })),
            lowestPrice: 0
        });
    }

    return results;
  }, [equipment, allQuotes, priceWeightPercent]);

  // Data transformations for specific reports
  const supplierReport = useMemo(() => {
    const map = new Map<string, { totalItems: number, wins: number, totalValue: number, quotes: (ScoredQuote & { itemName: string, itemSpecs: string })[] }>();

    analyzedData.forEach(group => {
        if (group.item.code === 'ERROR') return; // Skip error group for supplier stats to avoid skewing

        group.quotes.forEach(q => {
            if (!map.has(q.supplierName)) {
                map.set(q.supplierName, { totalItems: 0, wins: 0, totalValue: 0, quotes: [] });
            }
            const supplier = map.get(q.supplierName)!;
            supplier.totalItems += 1;
            supplier.totalValue += q.price;
            if (q.rank === 1) supplier.wins += 1;
            supplier.quotes.push({ ...q, itemName: group.item.name, itemSpecs: group.item.specs });
        });
    });

    // Calculate win rates and sort
    const result = Array.from(map.entries()).map(([name, data]) => ({
        name,
        ...data,
        losses: data.totalItems - data.wins,
        winRate: data.totalItems > 0 ? (data.wins / data.totalItems) * 100 : 0
    }));

    // Sort by Win Rate (Desc), then Total Wins (Desc)
    return result.sort((a, b) => {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.wins - a.wins;
    });
  }, [analyzedData]);

  // Filtered Supplier Data for display and export
  const processedSupplierData = useMemo(() => {
    let data = supplierReport;

    // 1. Filter by Selected Supplier (from chart/card interactions)
    if (selectedSupplier) {
        data = data.filter(s => s.name === selectedSupplier);
    }

    // 2. Filter internal quotes based on dropdown filters
    return data.map(s => {
        const filteredQuotes = s.quotes.filter(q => {
            const matchItem = supplierFilterItem ? q.itemCode === supplierFilterItem : true;
            const matchBrand = supplierFilterBrand ? q.brand === supplierFilterBrand : true;
            const matchRank = supplierFilterRank ? q.rank === parseInt(supplierFilterRank) : true;
            return matchItem && matchBrand && matchRank;
        });
        return { ...s, filteredQuotes };
    }).filter(s => s.filteredQuotes.length > 0); // Hide suppliers with no matching quotes
  }, [supplierReport, selectedSupplier, supplierFilterItem, supplierFilterBrand, supplierFilterRank]);

  // Get unique lists for supplier filters
  const uniqueSupplierBrands = useMemo(() => {
      const brands = new Set<string>();
      supplierReport.forEach(s => s.quotes.forEach(q => { if(q.brand) brands.add(q.brand) }));
      return Array.from(brands).sort();
  }, [supplierReport]);


  const brandReport = useMemo(() => {
     const map = new Map<string, { 
         count: number, 
         winningCount: number,
         winningQuotes: (ScoredQuote & { itemName: string, itemSpecs: string })[],
         avgPrice: number, 
         quotes: (ScoredQuote & { itemName: string })[] 
     }>();
     
     analyzedData.forEach(group => {
        if (group.item.code === 'ERROR') return; // Skip error group

        group.quotes.forEach(q => {
            const brandKey = q.brand || 'Unknown';
            if (!map.has(brandKey)) {
                map.set(brandKey, { count: 0, winningCount: 0, winningQuotes: [], avgPrice: 0, quotes: [] });
            }
            const brand = map.get(brandKey)!;
            brand.count += 1;
            brand.quotes.push({ ...q, itemName: group.item.name });
            
            if (q.rank === 1) {
                brand.winningCount += 1;
                brand.winningQuotes.push({ ...q, itemName: group.item.name, itemSpecs: group.item.specs });
            }
        });
     });
     
     return Array.from(map.entries()).map(([name, data]) => ({
         name,
         count: data.count,
         winningCount: data.winningCount,
         winningQuotes: data.winningQuotes,
         avgPrice: data.quotes.reduce((sum, q) => sum + q.price, 0) / data.count,
         quotes: data.quotes
     }));
  }, [analyzedData]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    // @ts-ignore
    if (!window.jspdf || !window.html2canvas) {
        alert("Thư viện PDF đang tải. Vui lòng thử lại sau giây lát.");
        return;
    }

    setIsGeneratingPdf(true);
    
    try {
        const elements = document.querySelectorAll('.pdf-item');
        if (elements.length === 0) {
            alert("Không có nội dung để xuất.");
            setIsGeneratingPdf(false);
            return;
        }

        setPdfProgress({ current: 0, total: elements.length });

        // @ts-ignore
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const contentWidth = pageWidth - 20;

        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '1200px'; 
        container.style.zIndex = '-9999';
        container.style.background = '#ffffff';
        document.body.appendChild(container);

        for (let i = 0; i < elements.length; i++) {
            setPdfProgress({ current: i + 1, total: elements.length });
            
            const element = elements[i] as HTMLElement;
            const clone = element.cloneNode(true) as HTMLElement;
            clone.style.backgroundColor = '#ffffff';
            container.innerHTML = '';
            container.appendChild(clone);

            await new Promise(r => setTimeout(r, 50));

            // @ts-ignore
            const canvas = await window.html2canvas(clone, {
                scale: 1, 
                useCORS: true,
                logging: false,
                windowWidth: 1200
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const imgProps = pdf.getImageProperties(imgData);
            const pdfImgHeight = (imgProps.height * contentWidth) / imgProps.width;

            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 10, 10, contentWidth, pdfImgHeight);
        }

        document.body.removeChild(container);
        pdf.save(`BaoCao_DauThau_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (e) {
        console.error(e);
        alert("Đã xảy ra lỗi trong quá trình tạo PDF.");
    } finally {
        setIsGeneratingPdf(false);
        setPdfProgress({ current: 0, total: 0 });
    }
  };

  const handleExportSummary = () => {
      const exportRows: any[] = [];

      if (reportType === 'supplier') {
          // Export based on Filtered Supplier Data
          processedSupplierData.forEach(supplier => {
              supplier.filteredQuotes.forEach(q => {
                  exportRows.push({
                      'Nhà cung cấp': supplier.name,
                      'Mã VT/TB': q.itemCode,
                      'Tên VT/TB': q.itemName,
                      'Thông số kỹ thuật': q.itemSpecs,
                      'Hãng': q.brand,
                      'Giá': q.price,
                      'VAT': q.vatIncluded ? 'Có' : 'Không',
                      'Điểm KT': q.technicalScore,
                      'Điểm Giá': q.priceScore,
                      'Tổng điểm': q.totalScore,
                      'Xếp hạng': q.rank,
                      'Trạng thái': q.rank === 1 ? 'Trúng thầu' : 'Trượt'
                  });
              });
          });
      } else {
          // Default Full/Condensed Export
          analyzedData.forEach(group => {
              group.quotes.forEach(q => {
                  exportRows.push({
                      'Mã VT/TB': group.item.code === 'ERROR' ? q.itemCode : group.item.code,
                      'Tên VT/TB': group.item.name,
                      'Thông số kỹ thuật': group.item.specs,
                      'Nhà cung cấp': q.supplierName,
                      'Hãng': q.brand,
                      'Giá': q.price,
                      'VAT': q.vatIncluded ? 'Có' : 'Không',
                      'Điểm KT': q.technicalScore,
                      'Điểm Giá': q.priceScore,
                      'Tổng điểm': q.totalScore,
                      'Xếp hạng': q.rank > 0 ? q.rank : 'N/A'
                  });
              });
          });
      }
      exportToExcel(`BaoCao_${reportType}.xlsx`, exportRows);
  };

  if (analyzedData.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-96 text-gray-500">
              <AlertTriangle className="w-12 h-12 mb-4 text-yellow-500" />
              <p className="text-xl font-medium">Chưa có dữ liệu phân tích</p>
              <p>Vui lòng thêm Thiết bị và Báo giá để tạo báo cáo.</p>
          </div>
      )
  }

  const TabButton = ({ id, label, icon: Icon }: { id: ReportType, label: string, icon: any }) => (
      <button
        onClick={() => {
            setReportType(id);
            // Reset Supplier filters when switching tabs
            if (id !== 'supplier') {
                setSelectedSupplier(null);
                setSupplierFilterItem('');
                setSupplierFilterBrand('');
                setSupplierFilterRank('');
            }
        }}
        className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            reportType === id 
            ? 'bg-blue-100 text-blue-700' 
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
          <Icon className="w-4 h-4 mr-2" />
          {label}
      </button>
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Báo cáo Phân tích & Xếp hạng</h2>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                     <span>Công thức: Điểm = (Điểm Giá × {(priceWeightPercent/100).toFixed(1)}) + (Điểm Kỹ thuật × {((100-priceWeightPercent)/100).toFixed(1)})</span>
                </div>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={handleExportSummary}
                    className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm text-sm"
                >
                    <Download className="w-4 h-4 mr-2" /> Xuất Excel {reportType === 'supplier' && selectedSupplier ? '(Đã lọc)' : ''}
                </button>
                <button 
                    onClick={handleExportPDF}
                    disabled={isGeneratingPdf}
                    className={`flex items-center px-3 py-2 text-white rounded-lg shadow-sm text-sm transition-colors ${
                        isGeneratingPdf ? 'bg-red-400 cursor-wait' : 'bg-red-600 hover:bg-red-700'
                    }`}
                >
                    {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                    {isGeneratingPdf 
                        ? `Đang tạo (${pdfProgress.current}/${pdfProgress.total})...` 
                        : 'Xuất PDF'
                    }
                </button>
                <button 
                    onClick={handlePrint}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm text-sm"
                >
                    <Printer className="w-4 h-4 mr-2" /> In
                </button>
            </div>
        </div>

        {/* Weight Configurator */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 flex flex-col sm:flex-row items-center gap-4">
             <div className="flex items-center text-gray-700 font-medium whitespace-nowrap">
                 <Settings2 className="w-4 h-4 mr-2" />
                 Cấu hình Tỷ trọng
             </div>
             <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div className="flex items-center gap-3">
                     <label className="text-sm font-medium text-gray-600 min-w-[100px]">Giá ({priceWeightPercent}%)</label>
                     <input 
                        type="range" 
                        min="0" max="100" 
                        value={priceWeightPercent} 
                        onChange={(e) => setPriceWeightPercent(Number(e.target.value))}
                        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                     />
                     <input
                        type="number"
                        min="0" max="100"
                        value={priceWeightPercent}
                        onChange={(e) => {
                            let val = parseInt(e.target.value) || 0;
                            if (val > 100) val = 100;
                            if (val < 0) val = 0;
                            setPriceWeightPercent(val);
                        }}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center font-bold text-blue-700"
                     />
                 </div>
                 <div className="flex items-center gap-3">
                     <label className="text-sm font-medium text-gray-600 min-w-[100px]">Kỹ thuật ({100 - priceWeightPercent}%)</label>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${100-priceWeightPercent}%` }}></div>
                      </div>
                      <span className="w-16 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-center font-bold text-green-700">
                          {100 - priceWeightPercent}
                      </span>
                 </div>
             </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            <TabButton id="full" label="Chi tiết" icon={LayoutList} />
            <TabButton id="condensed" label="Rút gọn" icon={List} />
            <TabButton id="supplier" label="Theo NCC" icon={Users} />
            <TabButton id="brand" label="Theo Hãng" icon={Tag} />
        </div>
      </div>

      {/* Report Content Area */}
      <div id="report-container" className="space-y-8 bg-transparent">
        
        {/* VIEW: FULL ANALYSIS */}
        {reportType === 'full' && analyzedData.map((group) => (
            <div key={group.item.id} className={`pdf-item bg-white shadow-md rounded-xl overflow-hidden border break-inside-avoid page-break mb-6 ${group.item.code === 'ERROR' ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'}`}>
                <div className={`px-6 py-4 border-b flex flex-col md:flex-row justify-between md:items-center gap-2 ${group.item.code === 'ERROR' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div>
                        <h3 className={`text-lg font-bold flex items-center ${group.item.code === 'ERROR' ? 'text-red-800' : 'text-gray-900'}`}>
                            {group.item.code === 'ERROR' ? (
                                <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                            ) : (
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 font-mono">{group.item.code}</span>
                            )}
                            {group.item.name}
                        </h3>
                        <p className={`text-sm mt-1 ${group.item.code === 'ERROR' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{group.item.specs}</p>
                    </div>
                    {group.item.code !== 'ERROR' && (
                        <div className="text-right text-xs text-gray-500">
                            Giá thấp nhất: <span className="font-mono font-bold text-green-700">{new Intl.NumberFormat('vi-VN').format(group.lowestPrice / 1000)}k</span>
                        </div>
                    )}
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className={`${group.item.code === 'ERROR' ? 'lg:col-span-3' : 'lg:col-span-2'} overflow-x-auto`}>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hạng</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nhà cung cấp</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">ĐƠN GIÁ (x1000)</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">KT</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Tổng</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {group.quotes.map((q) => {
                                const isPriceError = q.price <= 0;
                                const isCodeError = group.item.code === 'ERROR';
                                const hasError = isPriceError || isCodeError;

                                return (
                                    <tr key={q.id} className={`${q.rank === 1 && !hasError ? "bg-green-50" : ""} ${hasError ? "bg-red-50" : ""}`}>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {q.rank === 1 && !hasError && <Award className="w-4 h-4 text-yellow-500 mr-1" />}
                                            {hasError ? (
                                                <AlertCircle className="w-4 h-4 text-red-500" title="Báo giá không hợp lệ" />
                                            ) : (
                                                <span className={`font-bold ${q.rank === 1 ? 'text-green-800' : 'text-gray-600'}`}>#{q.rank}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="text-sm font-medium text-gray-900 flex items-center">
                                            {q.supplierName}
                                            {isCodeError && (
                                                <span className="ml-2 text-xs text-red-600 bg-red-100 px-1 rounded border border-red-200">
                                                    Mã: {q.itemCode} (Không tồn tại)
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500">{q.brand}</div>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-right text-sm">
                                        <div className={`font-mono flex items-center justify-end ${isPriceError ? 'text-red-600 font-bold' : ''}`}>
                                            {isPriceError && <AlertCircle className="w-3 h-3 mr-1" />}
                                            {new Intl.NumberFormat('vi-VN').format(q.price / 1000)}
                                        </div>
                                        <div className="text-xs text-gray-500">{q.vatIncluded ? '(+VAT)' : '(Chưa VAT)'}</div>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-center text-sm">
                                        <div className="font-semibold">{q.technicalScore}</div>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-center">
                                        {hasError ? (
                                            <span className="text-xs text-red-500 italic">Lỗi</span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-gray-100 text-gray-800">
                                                {q.totalScore.toFixed(2)}
                                            </span>
                                        )}
                                    </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>

                    {group.item.code !== 'ERROR' && (
                        <div className="h-64 lg:h-auto min-h-[300px] border rounded-lg p-2 bg-gray-50 relative">
                            <h4 className="text-xs font-semibold text-gray-500 mb-2 absolute top-2 left-2 z-10">So sánh Điểm</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={group.quotes} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" domain={[0, 10]} hide />
                                    <YAxis dataKey="supplierName" type="category" width={80} tick={{fontSize: 10}} />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="weightedPriceScore" name={`Điểm Giá (${priceWeightPercent}%)`} stackId="a" isAnimationActive={false}>
                                        {group.quotes.map((entry, index) => (
                                            <Cell key={`cell-price-${index}`} fill={entry.rank === 1 ? '#2563EB' : '#93C5FD'} />
                                        ))}
                                    </Bar>
                                    <Bar dataKey="weightedTechScore" name={`Điểm KT (${100-priceWeightPercent}%)`} stackId="a" isAnimationActive={false}>
                                        {group.quotes.map((entry, index) => (
                                            <Cell key={`cell-tech-${index}`} fill={entry.rank === 1 ? '#16A34A' : '#86EFAC'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>
        ))}

        {/* VIEW: CONDENSED REPORT */}
        {reportType === 'condensed' && (
             <div className="pdf-item bg-white shadow-md rounded-xl overflow-hidden border border-gray-200 break-inside-avoid page-break">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                     <h3 className="text-xl font-bold text-gray-900">Báo cáo Rút gọn (Đơn vị trúng thầu)</h3>
                     <p className="text-sm text-gray-500">Tổng quan nhà cung cấp được chọn cho từng thiết bị.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã VT/TB</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên VT/TB</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thông số kỹ thuật</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NCC được chọn (Hạng 1)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ĐƠN GIÁ (x1000)</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tổng điểm</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {analyzedData.map(group => {
                                if (group.item.code === 'ERROR') return null; // Skip errors in condensed
                                const winner = group.quotes.find(q => q.rank === 1);
                                return (
                                    <tr key={group.item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{group.item.code}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{group.item.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="max-w-xs truncate" title={group.item.specs}>
                                                {group.item.specs}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-700">
                                            {winner ? winner.supplierName : <span className="text-gray-400">Không có báo giá</span>}
                                            {winner && <span className="text-xs text-gray-500 block">{winner.brand}</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">
                                            {winner ? new Intl.NumberFormat('vi-VN').format(winner.price / 1000) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                            {winner ? <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full font-bold">{winner.totalScore.toFixed(2)}</span> : '-'}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
             </div>
        )}

        {/* VIEW: BY SUPPLIER */}
        {reportType === 'supplier' && (
            <div className="space-y-6">
                 {/* Summary Chart for Suppliers */}
                 <div className="pdf-item bg-white p-6 rounded-xl border border-gray-200 break-inside-avoid">
                     <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        Biểu đồ Hiệu suất Nhà cung cấp 
                        <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full flex items-center">
                            <MousePointerClick className="w-3 h-3 mr-1" /> Nhấn vào biểu đồ để lọc
                        </span>
                     </h3>
                     <div className="h-[400px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                             <BarChart 
                                data={supplierReport} 
                                layout="vertical" 
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                barSize={20}
                                onClick={(data) => {
                                    if (data && data.activeLabel) {
                                        setSelectedSupplier(data.activeLabel);
                                    }
                                }}
                             >
                                 <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                 <XAxis type="number" />
                                 <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                                 <Tooltip 
                                    cursor={{fill: '#f3f4f6'}}
                                    formatter={(value: number, name: string) => [value, name === 'wins' ? 'Trúng thầu' : 'Trượt thầu']}
                                 />
                                 <Legend />
                                 <Bar dataKey="wins" name="Trúng thầu" stackId="a" fill="#16A34A" cursor="pointer" />
                                 <Bar dataKey="losses" name="Trượt thầu" stackId="a" fill="#E5E7EB" cursor="pointer" />
                             </BarChart>
                         </ResponsiveContainer>
                     </div>
                 </div>

                <div className="pdf-item bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4 break-inside-avoid">
                     <h3 className="text-lg font-bold text-blue-800 flex justify-between items-center">
                         Tổng hợp Số liệu
                         {selectedSupplier && (
                             <button 
                                onClick={() => setSelectedSupplier(null)}
                                className="text-xs bg-white text-blue-600 px-3 py-1 rounded shadow-sm hover:bg-blue-50 flex items-center"
                             >
                                 <X className="w-3 h-3 mr-1" /> Bỏ chọn: {selectedSupplier}
                             </button>
                         )}
                     </h3>
                     <p className="text-sm text-blue-600/70 mb-2">Nhấn vào thẻ để xem chi tiết nhà cung cấp.</p>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                         {supplierReport.map(s => {
                             let bgClass = 'bg-gray-50 border-gray-200';
                             let textClass = 'text-gray-600';
                             let subTextClass = 'text-gray-400';
                             const rate = s.winRate;

                             if (rate >= 40) {
                                 bgClass = 'bg-green-50 border-green-200';
                                 textClass = 'text-green-700';
                                 subTextClass = 'text-green-500/70';
                             } else if (rate >= 20) {
                                 bgClass = 'bg-teal-50 border-teal-200';
                                 textClass = 'text-teal-700';
                                 subTextClass = 'text-teal-500/70';
                             } else if (rate >= 10) {
                                 bgClass = 'bg-blue-50 border-blue-200';
                                 textClass = 'text-blue-700';
                                 subTextClass = 'text-blue-500/70';
                             } else if (rate > 0) {
                                 bgClass = 'bg-orange-50 border-orange-200';
                                 textClass = 'text-orange-700';
                                 subTextClass = 'text-orange-500/70';
                             }

                             const isSelected = selectedSupplier === s.name;
                             if (isSelected) {
                                 bgClass = 'bg-white border-blue-500 ring-2 ring-blue-200';
                             }

                             return (
                                <div 
                                    key={s.name} 
                                    onClick={() => setSelectedSupplier(s.name === selectedSupplier ? null : s.name)}
                                    className={`${bgClass} border p-3 rounded shadow-sm transition-all hover:shadow-md cursor-pointer`}
                                >
                                     <div className={`text-sm font-medium truncate ${textClass}`} title={s.name}>{s.name}</div>
                                     <div className={`text-2xl font-bold ${textClass} mt-1`}>
                                        {s.wins} <span className={`text-xs font-normal ${subTextClass}`}>gói trúng</span>
                                     </div>
                                     <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-black/5">
                                        <span className={subTextClass}>Tổng: {s.totalItems}</span>
                                        <span className={`font-bold ${textClass}`}>{Math.round(s.winRate)}%</span>
                                     </div>
                                </div>
                             )
                         })}
                     </div>
                </div>

                {/* FILTERS FOR SUPPLIER DETAIL TABLE */}
                 <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center no-print">
                    <div className="flex items-center text-sm font-bold text-gray-700">
                        <Filter className="w-4 h-4 mr-2" />
                        Lọc chi tiết:
                    </div>
                    <select 
                        value={supplierFilterItem} 
                        onChange={(e) => setSupplierFilterItem(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">-- Tất cả Thiết bị --</option>
                        {equipment.map(e => <option key={e.code} value={e.code}>{e.code}</option>)}
                    </select>
                    <select
                        value={supplierFilterBrand}
                        onChange={(e) => setSupplierFilterBrand(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">-- Tất cả Hãng --</option>
                        {uniqueSupplierBrands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <select
                        value={supplierFilterRank}
                        onChange={(e) => setSupplierFilterRank(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">-- Tất cả Hạng --</option>
                        <option value="1">Hạng 1 (Trúng thầu)</option>
                        <option value="2">Hạng 2</option>
                        <option value="3">Hạng 3</option>
                    </select>
                    {(supplierFilterItem || supplierFilterBrand || supplierFilterRank) && (
                        <button 
                            onClick={() => {
                                setSupplierFilterItem('');
                                setSupplierFilterBrand('');
                                setSupplierFilterRank('');
                            }}
                            className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                        >
                            Xóa lọc
                        </button>
                    )}
                 </div>

                {processedSupplierData.length === 0 ? (
                     <div className="text-center py-10 text-gray-500">
                         Không tìm thấy dữ liệu phù hợp với bộ lọc.
                     </div>
                ) : (
                    processedSupplierData.map(supplier => (
                        <div key={supplier.name} className="pdf-item bg-white shadow-md rounded-xl overflow-hidden border border-gray-200 break-inside-avoid page-break">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-900">{supplier.name}</h3>
                                <span className={`text-sm px-3 py-1 rounded-full font-bold ${supplier.winRate > 50 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                    Tỷ lệ trúng: {Math.round(supplier.winRate)}%
                                </span>
                            </div>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thiết bị</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thông số kỹ thuật</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hãng</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ĐƠN GIÁ (x1000)</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Hạng</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {supplier.filteredQuotes.map((q, idx) => (
                                        <tr key={idx} className={q.rank === 1 ? 'bg-green-50' : ''}>
                                            <td className="px-6 py-3 text-sm text-gray-900">
                                                <span className="font-mono text-xs text-gray-500 mr-2">{q.itemCode}</span>
                                                {q.itemName}
                                            </td>
                                            <td className="px-6 py-3 text-sm text-gray-500">
                                                <div className="max-w-xs truncate" title={q.itemSpecs}>
                                                    {q.itemSpecs}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-sm text-gray-500">{q.brand}</td>
                                            <td className="px-6 py-3 text-sm text-right font-mono">{new Intl.NumberFormat('vi-VN').format(q.price / 1000)}</td>
                                            <td className="px-6 py-3 text-center">
                                                {q.rank === 1 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                        <Award className="w-3 h-3 mr-1"/> Thắng
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-500">#{q.rank}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))
                )}
            </div>
        )}

        {/* VIEW: BY BRAND */}
        {reportType === 'brand' && (
            <div className="pdf-item bg-white shadow-md rounded-xl overflow-hidden border border-gray-200 break-inside-avoid page-break">
                 <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                     <h3 className="text-xl font-bold text-gray-900">Phân tích theo Hãng/Xuất xứ</h3>
                     <p className="text-sm text-gray-500">Tần suất và phân bố các hãng sản xuất trong hồ sơ thầu. Nhấn vào hàng để xem chi tiết.</p>
                </div>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10"></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hãng / Xuất xứ</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tổng tham gia</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Số lượng Trúng thầu</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thiết bị mẫu</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {brandReport.sort((a,b) => b.count - a.count).map(brand => (
                                <React.Fragment key={brand.name}>
                                    <tr 
                                        className={`cursor-pointer transition-colors ${expandedBrand === brand.name ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                        onClick={() => setExpandedBrand(expandedBrand === brand.name ? null : brand.name)}
                                    >
                                        <td className="px-6 py-4 text-center">
                                            {expandedBrand === brand.name ? (
                                                <ChevronDown className="w-4 h-4 text-blue-600" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{brand.name}</td>
                                        <td className="px-6 py-4 text-center text-sm text-gray-900">{brand.count}</td>
                                        <td className="px-6 py-4 text-center text-sm font-bold text-blue-600">
                                            {brand.winningCount > 0 ? (
                                                <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                                    {brand.winningCount}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {brand.quotes.slice(0, 3).map(q => q.itemName).join(', ')}
                                            {brand.quotes.length > 3 && '...'}
                                        </td>
                                    </tr>
                                    {/* Expanded Detail Row */}
                                    {expandedBrand === brand.name && (
                                        <tr className="bg-gray-50">
                                            <td colSpan={5} className="px-6 py-4 border-t border-gray-100">
                                                <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                    <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                                                        <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
                                                        Danh sách {brand.winningCount} thiết bị trúng thầu của {brand.name}:
                                                    </h4>
                                                    {brand.winningCount > 0 ? (
                                                        <div className="overflow-x-auto">
                                                            <table className="min-w-full divide-y divide-gray-100 text-sm">
                                                                <thead>
                                                                    <tr className="bg-gray-50 text-gray-500">
                                                                        <th className="px-3 py-2 text-left font-medium">Mã VT/TB</th>
                                                                        <th className="px-3 py-2 text-left font-medium">Tên VT/TB</th>
                                                                        <th className="px-3 py-2 text-left font-medium">Thông số</th>
                                                                        <th className="px-3 py-2 text-left font-medium">Nhà cung cấp</th>
                                                                        <th className="px-3 py-2 text-right font-medium">Giá (x1000)</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100">
                                                                    {brand.winningQuotes.map((q, idx) => (
                                                                        <tr key={idx} className="hover:bg-gray-50">
                                                                            <td className="px-3 py-2 font-mono text-blue-600">{q.itemCode}</td>
                                                                            <td className="px-3 py-2">{q.itemName}</td>
                                                                            <td className="px-3 py-2 text-gray-500 max-w-xs truncate" title={q.itemSpecs}>{q.itemSpecs}</td>
                                                                            <td className="px-3 py-2">{q.supplierName}</td>
                                                                            <td className="px-3 py-2 text-right font-mono font-medium">
                                                                                {new Intl.NumberFormat('vi-VN').format(q.price / 1000)}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-500 italic text-center py-2">Chưa có thiết bị nào trúng thầu.</p>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPage;