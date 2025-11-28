import React, { useState, useEffect } from 'react';
import { User } from '../types';
import * as Storage from '../services/storage';
import { Plus, Trash2, Shield, User as UserIcon } from 'lucide-react';
import Modal from '../components/Modal';

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({ role: 'user' });
  const [error, setError] = useState('');

  useEffect(() => {
    setUsers(Storage.getUsers());
  }, []);

  const handleDelete = (username: string) => {
    if (username === 'Adminmp') {
      alert('Không thể xóa tài khoản Admin mặc định.');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản ${username}?`)) {
      const updated = users.filter(u => u.username !== username);
      setUsers(updated);
      Storage.saveUsers(updated);
    }
  };

  const handleSave = () => {
    if (!newUser.username || !newUser.password || !newUser.fullName) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    if (users.some(u => u.username === newUser.username)) {
      setError('Tên đăng nhập đã tồn tại.');
      return;
    }

    const user: User = {
      id: crypto.randomUUID(),
      username: newUser.username,
      password: newUser.password,
      fullName: newUser.fullName,
      role: 'user' // Mặc định tạo user thường
    };

    const updated = [...users, user];
    setUsers(updated);
    Storage.saveUsers(updated);
    setIsModalOpen(false);
    setNewUser({ role: 'user' });
    setError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Quản lý Tài khoản</h2>
          <p className="text-sm text-gray-500">Cấp quyền truy cập hệ thống cho nhân viên.</p>
        </div>
        <button
          onClick={() => {
              setNewUser({ role: 'user' });
              setError('');
              setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4 mr-2" /> Thêm Tài khoản
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ và Tên</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên đăng nhập</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mật khẩu</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                    <div className={`p-2 rounded-full mr-3 ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                        {user.role === 'admin' ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                    </div>
                    {user.fullName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">******</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                    {user.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {user.username !== 'Adminmp' && (
                    <button onClick={() => handleDelete(user.username)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tạo tài khoản mới">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Họ và Tên</label>
            <input 
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              value={newUser.fullName || ''}
              onChange={e => setNewUser({...newUser, fullName: e.target.value})}
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tên đăng nhập</label>
            <input 
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              value={newUser.username || ''}
              onChange={e => setNewUser({...newUser, username: e.target.value})}
              placeholder="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
            <input 
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              value={newUser.password || ''}
              onChange={e => setNewUser({...newUser, password: e.target.value})}
              placeholder="Nhập mật khẩu"
            />
          </div>
          
          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <button 
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
            onClick={handleSave}
          >
            Tạo tài khoản
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagementPage;