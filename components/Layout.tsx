import React, { useState, useEffect } from 'react';
import { Package, Calculator, FileText, Menu, X, ClipboardList, Share2, Check, Cloud, UploadCloud, DownloadCloud, Save } from 'lucide-react';
import Modal from './Modal';
import { syncToCloud, syncFromCloud } from '../services/cloud';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'equipment' | 'quotes' | 'analysis' | 'supply-request';
  onTabChange: (tab: 'equipment' | 'quotes' | 'analysis' | 'supply-request') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  
  // Cloud Sync State
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [scriptUrl, setScriptUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    const savedUrl = localStorage.getItem('bidmaster_script_url');
    if (savedUrl) setScriptUrl(savedUrl);
  }, []);

  const handleShare = async () => {
    try {
        await navigator.clipboard.writeText(window.location.href);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
    } catch (err) {
        console.error('Failed to copy URL', err);
    }
  };

  const handleSaveUrl = () => {
      localStorage.setItem('bidmaster_script_url', scriptUrl);
      setSyncMessage('Đã lưu URL cấu hình.');
      setTimeout(() => setSyncMessage(''), 2000);
  };

  const handleSyncToCloud = async () => {
      if (!scriptUrl) {
          setSyncMessage('Vui lòng nhập Google Web App URL.');
          return;
      }
      setIsSyncing(true);
      setSyncMessage('Đang tải dữ liệu lên Cloud...');
      try {
          const cleanUrl = scriptUrl.trim();
          await syncToCloud(cleanUrl);
          setSyncMessage('Đồng bộ lên Cloud thành công! Dữ liệu đã được lưu vào Google Sheet.');
      } catch (e) {
          console.error(e);
          setSyncMessage('Lỗi: Không thể kết nối đến Google Sheet. Vui lòng kiểm tra lại URL và chắc chắn bạn đã Deploy lại script.');
      } finally {
          setIsSyncing(false);
      }
  };

  const handleSyncFromCloud = async () => {
      if (!scriptUrl) {
          setSyncMessage('Vui lòng nhập Google Web App URL.');
          return;
      }
      if (!confirm('Hành động này sẽ ghi đè dữ liệu hiện tại bằng dữ liệu từ Google Sheet. Bạn có chắc chắn không?')) return;
      
      setIsSyncing(true);
      setSyncMessage('Đang tải dữ liệu từ Cloud...');
      try {
          const cleanUrl = scriptUrl.trim();
          await syncFromCloud(cleanUrl);
          setSyncMessage('Tải dữ liệu thành công! Vui lòng tải lại trang để cập nhật.');
          setTimeout(() => window.location.reload(), 1500);
      } catch (e) {
          setSyncMessage('Lỗi: Không thể tải dữ liệu. Kiểm tra lại URL.');
      } finally {
          setIsSyncing(false);
      }
  };

  const navItems = [
    { id: 'equipment', label: 'Danh mục Thiết bị', icon: Package },
    { id: 'quotes', label: 'Quản lý Báo giá', icon: FileText },
    { id: 'analysis', label: 'Phân tích & Xếp hạng', icon: Calculator },
    { id: 'supply-request', label: 'Dự trù Vật tư', icon: ClipboardList },
  ] as const;

  return (
    // THAY ĐỔI QUAN TRỌNG: print:block print:h-auto để reset chiều cao khi in
    <div className="min-h-screen bg-gray-50 flex flex-col relative print:block print:h-auto print:overflow-visible">
      {/* Toast Notification */}
      {showShareToast && (
          <div className="fixed top-28 right-4 z-50 animate-bounce bg-gray-800 text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 transition-all no-print">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium">Đã sao chép liên kết!</span>
          </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-24">
            <div className="flex items-center">
              <img 
                src="https://lh3.googleusercontent.com/d/1X64s9zZ_Yq7PDBTox46r6h_z93M-F57Y" 
                alt="Logo Minh Phát Khánh An" 
                className="h-20 w-auto mr-4 object-contain"
              />
              <span className="text-2xl font-bold text-gray-900">ĐẤU THẦU VẬT TƯ - THIẾT BỊ</span>
            </div>
            
            <div className="flex items-center gap-4">
                {/* Desktop Nav */}
                <nav className="hidden md:flex space-x-8">
                {navItems.map((item) => (
                    <button
                    key={item.id}
                    onClick={() => onTabChange(item.id as any)}
                    className={`inline-flex items-center px-1 pt-1 border-b-4 text-sm font-medium h-full transition-colors ${
                        activeTab === item.id
                        ? 'border-blue-500 text-gray-900 font-bold'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    >
                    <item.icon className="w-5 h-5 mr-2" />
                    {item.label}
                    </button>
                ))}
                </nav>

                {/* Cloud Sync Button */}
                <button
                    onClick={() => setIsCloudModalOpen(true)}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-colors focus:outline-none"
                    title="Đồng bộ Google Sheets"
                >
                    <Cloud className="w-6 h-6" />
                </button>

                {/* Share Button */}
                <button
                    onClick={handleShare}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-colors focus:outline-none"
                    title="Chia sẻ liên kết"
                >
                    <Share2 className="w-6 h-6" />
                </button>

                {/* Mobile Menu Button */}
                <div className="flex items-center md:hidden">
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                >
                    {isMobileMenuOpen ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}
                </button>
                </div>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`block pl-3 pr-4 py-3 border-l-4 text-base font-medium w-full text-left ${
                    activeTab === item.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-0 print:max-w-none">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto print:mt-0 print:border-none print:py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
            <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Bản quyền ứng dụng thuộc bộ phận QLCL - Minh Phát Khánh An
            </p>
            <p className="text-xs text-gray-400 mt-1">
                &copy; {new Date().getFullYear()} Developed for internal use.
            </p>
        </div>
      </footer>

      {/* Cloud Sync Modal */}
      <Modal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} title="Đồng bộ Google Sheets">
          <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded text-sm text-blue-800">
                  <p>Tính năng này giúp bạn lưu trữ dữ liệu lên Google Sheet để chia sẻ hoặc sao lưu.</p>
                  <p className="mt-2 font-bold text-red-600">QUAN TRỌNG: Nếu bạn sửa code Google Script, bạn PHẢI nhấn "Deploy" -> "New Deployment" để lấy URL mới. URL cũ sẽ KHÔNG hoạt động.</p>
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Google Web App URL</label>
                  <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={scriptUrl}
                        onChange={(e) => setScriptUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
                      />
                      <button 
                        onClick={handleSaveUrl}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-md transition"
                        title="Lưu cấu hình"
                      >
                          <Save className="w-5 h-5" />
                      </button>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                   <button 
                        onClick={handleSyncToCloud}
                        disabled={isSyncing}
                        className="flex flex-col items-center justify-center p-4 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg transition text-blue-800 disabled:opacity-50"
                   >
                       <UploadCloud className="w-8 h-8 mb-2" />
                       <span className="font-bold">Lưu lên Cloud</span>
                       <span className="text-xs text-blue-600 mt-1 text-center">Ghi đè dữ liệu trên Sheet bằng dữ liệu hiện tại</span>
                   </button>

                   <button 
                        onClick={handleSyncFromCloud}
                        disabled={isSyncing}
                        className="flex flex-col items-center justify-center p-4 border border-green-200 bg-green-50 hover:bg-green-100 rounded-lg transition text-green-800 disabled:opacity-50"
                   >
                       <DownloadCloud className="w-8 h-8 mb-2" />
                       <span className="font-bold">Tải từ Cloud</span>
                       <span className="text-xs text-green-600 mt-1 text-center">Lấy dữ liệu từ Sheet về (Đè dữ liệu máy này)</span>
                   </button>
              </div>
              
              {syncMessage && (
                  <div className={`p-3 rounded text-sm text-center ${syncMessage.includes('Lỗi') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {syncMessage}
                  </div>
              )}
          </div>
      </Modal>
    </div>
  );
};

export default Layout;