import React, { useState } from 'react';
import * as Storage from '../services/storage';
import { 
  BookOpen, Package, FileText, Calculator, 
  ClipboardList, Cloud, UserCog, CheckCircle2, 
  AlertTriangle, MousePointerClick, Download, Printer 
} from 'lucide-react';

const HelpPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('overview');
  
  const currentUser = Storage.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  const sections = [
    {
      id: 'overview',
      title: 'Tổng quan & Quy trình',
      icon: BookOpen,
      content: (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800">Giới thiệu</h3>
          <p className="text-gray-600">
            Ứng dụng <b>Đấu thầu Vật tư - Thiết bị</b> là giải pháp toàn diện giúp bộ phận Mua hàng/Quản lý Chất lượng quản lý quy trình mua sắm từ khâu lập danh mục, thu thập báo giá, chấm điểm xếp hạng nhà cung cấp đến lập dự trù trình ký.
          </p>
          
          <h3 className="text-xl font-bold text-gray-800 mt-6">Quy trình vận hành chuẩn</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center font-bold text-blue-800 mb-2">
                <span className="bg-blue-200 w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs">1</span>
                Danh mục Thiết bị
              </div>
              <p className="text-sm text-blue-700">Tạo danh sách các thiết bị, vật tư cần mua sắm hoặc Import từ Excel.</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center font-bold text-blue-800 mb-2">
                <span className="bg-blue-200 w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs">2</span>
                Nhập Báo giá
              </div>
              <p className="text-sm text-blue-700">Nhập báo giá từ các nhà cung cấp, chấm điểm kỹ thuật sơ bộ.</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center font-bold text-blue-800 mb-2">
                <span className="bg-blue-200 w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs">3</span>
                Phân tích & Xếp hạng
              </div>
              <p className="text-sm text-blue-700">Hệ thống tự động tính điểm (Giá + Kỹ thuật) và xếp hạng nhà cung cấp.</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center font-bold text-blue-800 mb-2">
                <span className="bg-blue-200 w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs">4</span>
                Dự trù & Trình ký
              </div>
              <p className="text-sm text-blue-700">Lập bảng dự trù dựa trên kết quả trúng thầu, xuất báo cáo và in ấn.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'equipment',
      title: 'Quản lý Danh mục',
      icon: Package,
      content: (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800">Quản lý Danh mục Vật tư / Thiết bị</h3>
          <p className="text-gray-600">Đây là bước đầu tiên để định nghĩa các mặt hàng cần mua sắm.</p>

          <div className="space-y-3 mt-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 shrink-0" />
              <div>
                <span className="font-bold text-gray-800">Thêm thủ công:</span> Nhấn nút "Thêm Mới", nhập Mã, Tên và Thông số kỹ thuật.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 shrink-0" />
              <div>
                <span className="font-bold text-gray-800">Import Excel (Khuyên dùng):</span>
                <ul className="list-disc ml-5 mt-1 text-sm text-gray-600 space-y-1">
                  <li>Nhấn nút <b>"Nhập Excel"</b>.</li>
                  <li>Tải file mẫu về để xem định dạng.</li>
                  <li>Các cột bắt buộc: <code>Code</code> (Mã), <code>Name</code> (Tên).</li>
                  <li>Cột tùy chọn: <code>Specs</code> (Thông số).</li>
                  <li>Upload file đã điền dữ liệu.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'quotes',
      title: 'Quản lý Báo giá',
      icon: FileText,
      content: (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800">Nhập liệu & Quản lý Báo giá</h3>
          
          <div className="bg-yellow-50 p-4 rounded border border-yellow-200 mb-4">
            <h4 className="font-bold text-yellow-800 flex items-center"><AlertTriangle className="w-4 h-4 mr-2"/> Lưu ý quan trọng về Đơn giá</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Hệ thống sẽ tự động chuyển đổi hiển thị sang đơn vị <b>nghìn đồng (x1000)</b> trên giao diện. Tuy nhiên khi nhập liệu, bạn hãy nhập đúng số tiền thực tế (VD: nhập 1500000, hệ thống sẽ hiện 1.500).
            </p>
          </div>

          <h4 className="font-bold text-gray-800">Các tính năng chính:</h4>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <MousePointerClick className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <b>Nhập Excel hàng loạt:</b> File Excel cần có các cột tương ứng: <i>Mã VT/TB, Nhà cung cấp, Hãng, Giá, VAT, Ghi chú</i>. Hệ thống có tính năng "Xem trước" (Preview) để báo lỗi các dòng sai định dạng trước khi lưu.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <MousePointerClick className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <b>Chấm điểm Kỹ thuật:</b> Mặc định là 5 điểm. Bạn có thể điều chỉnh thang điểm từ 1-10 dựa trên chất lượng, uy tín hãng, hoặc mức độ đáp ứng yêu cầu.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <MousePointerClick className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <b>Bộ lọc nâng cao:</b> Sử dụng thanh lọc để so sánh giá của cùng 1 thiết bị giữa các nhà cung cấp khác nhau.
              </div>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'analysis',
      title: 'Phân tích & Xếp hạng',
      icon: Calculator,
      content: (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800">Cơ chế Tự động Phân tích</h3>
          <p className="text-gray-600">Hệ thống sử dụng thuật toán chấm điểm tổng hợp để đưa ra gợi ý nhà cung cấp tốt nhất (Hạng 1).</p>

          <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 font-mono text-sm">
            <p className="font-bold mb-2">Công thức tính điểm:</p>
            <p>Score = (Điểm Giá × Wg) + (Điểm Kỹ thuật × Wt)</p>
            <div className="mt-2 text-gray-500">
              <p>• <b>Wg / Wt:</b> Trọng số (Mặc định: Giá 70%, Kỹ thuật 30%). Có thể tùy chỉnh.</p>
              <p>• <b>Điểm Giá:</b> (Giá thấp nhất / Giá NCC) × 10</p>
              <p>• <b>Điểm Kỹ thuật:</b> Do người dùng chấm (1-10)</p>
            </div>
          </div>

          <h4 className="font-bold text-gray-800 mt-4">Các loại Báo cáo:</h4>
          <div className="grid grid-cols-1 gap-3">
             <div className="border p-3 rounded hover:bg-gray-50">
               <b>1. Báo cáo Chi tiết:</b> Hiển thị đầy đủ thông tin so sánh, bao gồm biểu đồ trực quan cho từng thiết bị.
             </div>
             <div className="border p-3 rounded hover:bg-gray-50">
               <b>2. Báo cáo Rút gọn:</b> Chỉ hiển thị thiết bị và Đơn vị trúng thầu (Hạng 1) để trình ký nhanh.
             </div>
             <div className="border p-3 rounded hover:bg-gray-50">
               <b>3. Theo Nhà cung cấp:</b> Thống kê hiệu suất (Tỷ lệ trúng thầu) của từng nhà cung cấp.
             </div>
             <div className="border p-3 rounded hover:bg-gray-50">
               <b>4. Theo Hãng:</b> Phân tích xu hướng lựa chọn thương hiệu/xuất xứ.
             </div>
          </div>
        </div>
      )
    },
    {
      id: 'supply',
      title: 'Dự trù & In ấn',
      icon: ClipboardList,
      content: (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800">Lập bảng Dự trù Mua sắm</h3>
          
          <h4 className="font-bold text-gray-800">Các bước thực hiện:</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Vào tab <b>"Dự trù Vật tư"</b>.</li>
            <li>Nhập thông tin chung (Ngày, Người lập, Người duyệt...).</li>
            <li>Tại mục <b>"Thêm Thiết bị"</b>: Có thể tìm kiếm và chọn nhiều thiết bị cùng lúc (Multi-select).</li>
            <li>Nhập số lượng tổng và phân chia Giai đoạn 1 / Giai đoạn 2 (nếu có).</li>
            <li>Nhấn <b>"Thêm"</b> để đưa vào bảng.</li>
          </ol>

          <div className="bg-green-50 p-4 rounded border border-green-200 mt-4">
            <h4 className="font-bold text-green-800 flex items-center mb-1"><Download className="w-4 h-4 mr-2"/> Tiện ích "Cập nhật Giá tự động"</h4>
            <p className="text-sm text-green-700">
              Chuyển sang chế độ xem <b>"Chi phí"</b>, bạn sẽ thấy nút <b>"Cập nhật Giá"</b>. Hệ thống sẽ tự động lấy giá và tên nhà cung cấp của đơn vị xếp Hạng 1 (từ bên Phân tích) điền vào bảng dự trù để tính toán tổng tiền.
            </p>
          </div>

          <h4 className="font-bold text-gray-800 mt-4">In ấn & Xuất file:</h4>
          <p className="text-gray-600 mb-2">Hệ thống hỗ trợ xuất ra file Excel chuẩn định dạng hoặc In trực tiếp từ trình duyệt.</p>
          <div className="flex items-center gap-2 text-sm text-gray-500 italic">
            <Printer className="w-4 h-4"/> Lưu ý: Khi nhấn In, giao diện sẽ tự động ẩn các nút bấm và menu thừa, chỉ giữ lại nội dung báo cáo và bảng ký tên.
          </div>
        </div>
      )
    },
    {
      id: 'system',
      title: 'Hệ thống & Tiện ích',
      icon: UserCog,
      content: (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800">Tính năng Hệ thống</h3>

          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-bold text-blue-600 flex items-center mb-2">
                <Cloud className="w-5 h-5 mr-2" /> Đồng bộ Google Sheets
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                Giúp sao lưu dữ liệu hoặc chia sẻ dữ liệu giữa các máy tính khác nhau.
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600">
                <li><b>Lưu lên Cloud:</b> Gửi toàn bộ dữ liệu hiện tại lên Google Sheet.</li>
                <li><b>Tải từ Cloud:</b> Lấy dữ liệu từ Google Sheet về máy (sẽ ghi đè dữ liệu cũ trên máy).</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-bold text-purple-600 flex items-center mb-2">
                <UserCog className="w-5 h-5 mr-2" /> Quản lý Tài khoản (Admin)
              </h4>
              <p className="text-sm text-gray-600">
                Tài khoản <b>Admin</b> có quyền tạo thêm user hoặc reset mật khẩu. 
                <br/>User thường chỉ có quyền thao tác dữ liệu, không thể quản lý tài khoản khác.
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const visibleSections = sections.filter(s => s.id !== 'system' || isAdmin);
  const activeContent = sections.find(s => s.id === activeSection)?.content;

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[600px]">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-fit">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-700 uppercase text-xs tracking-wider">Mục lục Hướng dẫn</h2>
        </div>
        <nav className="p-2 space-y-1">
          {visibleSections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <section.icon className={`w-4 h-4 mr-3 ${activeSection === section.id ? 'text-blue-600' : 'text-gray-400'}`} />
              {section.title}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
        {activeContent}
      </div>
    </div>
  );
};

export default HelpPage;