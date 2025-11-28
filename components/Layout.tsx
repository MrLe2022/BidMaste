import React, { useState, useEffect } from 'react';
import { Package, Calculator, FileText, Menu, X, ClipboardList, Share2, Check, Cloud, UploadCloud, DownloadCloud, Save, LogOut, UserCog, User, HelpCircle } from 'lucide-react';
import Modal from './Modal';
import { syncToCloud, syncFromCloud } from '../services/cloud';
import { User as UserType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'equipment' | 'quotes' | 'analysis' | 'supply-request' | 'users' | 'help';
  onTabChange: (tab: 'equipment' | 'quotes' | 'analysis' | 'supply-request' | 'users' | 'help') => void;
  currentUser: UserType | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, currentUser, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  
  // Cloud Sync State
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const handleShare = async () => {
    try {
        await navigator.clipboard.writeText(window.location.href);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
    } catch (err) {
        console.error('Failed to copy URL', err);
    }
  };

  const handleSyncToCloud = async () => {
      setIsSyncing(true);
      setSyncMessage('Đang kết nối...');
      try {
          await syncToCloud();
          setSyncMessage('Thành công! Dữ liệu đã được lưu trữ an toàn.');
      } catch (e: any) {
          console.error(e);
          setSyncMessage(`Lỗi: ${e.message || 'Không thể kết nối'}. Vui lòng thử lại sau.`);
      } finally {
          setIsSyncing(false);
      }
  };

  const handleSyncFromCloud = async () => {
      if (!confirm('Hành động này sẽ ghi đè dữ liệu hiện tại bằng dữ liệu từ Cloud. Bạn có chắc chắn không?')) return;
      
      setIsSyncing(true);
      setSyncMessage('Đang tải dữ liệu...');
      try {
          await syncFromCloud();
          setSyncMessage('Tải dữ liệu thành công! Vui lòng tải lại trang.');
          setTimeout(() => window.location.reload(), 1500);
      } catch (e) {
          setSyncMessage('Lỗi: Không thể tải dữ liệu.');
      } finally {
          setIsSyncing(false);
      }
  };

  const navItems = [
    { id: 'equipment', label: 'Danh mục Thiết bị', icon: Package, requiredRole: 'all' },
    { id: 'quotes', label: 'Quản lý Báo giá', icon: FileText, requiredRole: 'all' },
    { id: 'analysis', label: 'Phân tích & Xếp hạng', icon: Calculator, requiredRole: 'all' },
    { id: 'supply-request', label: 'Dự trù Vật tư', icon: ClipboardList, requiredRole: 'all' },
    { id: 'users', label: 'Quản lý Tài khoản', icon: UserCog, requiredRole: 'admin' },
    { id: 'help', label: 'Hướng dẫn', icon: HelpCircle, requiredRole: 'all' },
  ] as const;

  // Filter items based on role
  const visibleNavItems = navItems.filter(item => 
    item.requiredRole === 'all' || (currentUser && item.requiredRole === currentUser.role)
  );

  return (
    // THAY ĐỔI: print:block print:h-auto để reset chiều cao khi in
    <div className="min-h-screen bg-gray-50 flex flex-col relative print:block print:h-auto print:overflow-visible">
      {/* Toast Notification */}
      {showShareToast && (
          <div className="fixed top-28 right-4 z-50 animate-bounce bg-gray-800 text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 transition-all no-print">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium">Đã sao chép liên kết!</span>
          </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm no-print h-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between h-full">
            <div className="flex items-center">
              <span className="text-3xl font-bold text-gray-900">ĐẤU THẦU VẬT TƯ</span>
            </div>
            
            <div className="flex items-center gap-4">
                {/* Desktop Nav */}
                <nav className="hidden md:flex space-x-6 h-full">
                {visibleNavItems.map((item) => (
                    <button
                    key={item.id}
                    onClick={() => onTabChange(item.id as any)}
                    className={`inline-flex items-center px-1 pt-1 border-b-4 text-sm font-medium h-full transition-colors ${
                        activeTab === item.id
                        ? 'border-blue-500 text-gray-900 font-bold'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                    </button>
                ))}
                </nav>

                <div className="hidden md:flex items-center border-l border-gray-200 pl-4 ml-2 space-x-2">
                    {/* Cloud Sync Button */}
                    <button
                        onClick={() => setIsCloudModalOpen(true)}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-colors focus:outline-none"
                        title="Đồng bộ Google Sheets"
                    >
                        <Cloud className="w-5 h-5" />
                    </button>

                    {/* Share Button */}
                    <button
                        onClick={handleShare}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-colors focus:outline-none"
                        title="Chia sẻ liên kết"
                    >
                        <Share2 className="w-5 h-5" />
                    </button>
                    
                    {/* User Profile & Logout */}
                    <div className="flex items-center gap-2 pl-2">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-gray-800">{currentUser?.fullName}</span>
                            <span className="text-xs text-gray-500 capitalize">{currentUser?.role === 'admin' ? 'Quản trị viên' : 'Người sử dụng'}</span>
                        </div>
                        <button
                            onClick={onLogout}
                            className="p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                            title="Đăng xuất"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>

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
              <div className="px-4 py-3 border-b border-gray-100 mb-2 flex justify-between items-center">
                  <div className="flex items-center">
                      <User className="w-8 h-8 bg-gray-200 rounded-full p-1 text-gray-600 mr-3" />
                      <div>
                          <p className="font-bold text-gray-800">{currentUser?.fullName}</p>
                          <p className="text-xs text-gray-500">{currentUser?.role}</p>
                      </div>
                  </div>
                  <button onClick={onLogout} className="text-red-600 text-sm font-medium">Đăng xuất</button>
              </div>
              {visibleNavItems.map((item) => (
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
      {/* THAY ĐỔI: print:max-w-none print:p-0 để tràn trang */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-0 print:max-w-none print:w-full print:block">
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
      <Modal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} title="Đồng bộ Dữ liệu">
          <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded text-sm text-blue-800 border border-blue-200 text-center">
                  <p className="font-medium">
                      Tính năng này giúp bạn lưu trữ dữ liệu lên hệ thống Cloud để chia sẻ với các thành viên khác hoặc sao lưu an toàn.
                  </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                   <button 
                        onClick={handleSyncToCloud}
                        disabled={isSyncing}
                        className="flex flex-col items-center justify-center p-6 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-xl transition text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm hover:shadow-md"
                   >
                       <UploadCloud className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
                       <span className="font-bold text-lg">Lưu lên Cloud</span>
                       <span className="text-xs text-blue-600 mt-2 text-center leading-tight">Ghi đè dữ liệu trên Cloud bằng dữ liệu máy này</span>
                   </button>

                   <button 
                        onClick={handleSyncFromCloud}
                        disabled={isSyncing}
                        className="flex flex-col items-center justify-center p-6 border border-green-200 bg-green-50 hover:bg-green-100 rounded-xl transition text-green-800 disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm hover:shadow-md"
                   >
                       <DownloadCloud className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
                       <span className="font-bold text-lg">Tải từ Cloud</span>
                       <span className="text-xs text-green-600 mt-2 text-center leading-tight">Lấy dữ liệu từ Cloud về (Ghi đè máy này)</span>
                   </button>
              </div>
              
              {syncMessage && (
                  <div className={`p-4 rounded-lg text-sm font-medium text-center animate-pulse ${syncMessage.includes('Lỗi') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {syncMessage}
                  </div>
              )}
          </div>
      </Modal>
    </div>
  );
};

export default Layout;