import React, { useState, useEffect, useMemo } from 'react';
import { User, Equipment } from '../types';
import * as Storage from '../services/storage';
import { Plus, Trash2, Shield, User as UserIcon, CheckSquare, Square, Edit, Layers } from 'lucide-react';
import Modal from '../components/Modal';

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({ role: 'user', allowedGroups: [] });
  const [error, setError] = useState('');
  
  useEffect(() => {
    setUsers(Storage.getUsers());
    setEquipment(Storage.getEquipment());
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

  const handleEdit = (user: User) => {
      setNewUser({
          username: user.username,
          password: user.password,
          fullName: user.fullName,
          role: user.role,
          allowedGroups: user.allowedGroups || []
      });
      setEditingId(user.id);
      setError('');
      setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!newUser.username || !newUser.password || !newUser.fullName) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    let updatedUsers: User[];

    if (editingId) {
        // Edit existing
        updatedUsers = users.map(u => 
            u.id === editingId ? { ...u, ...newUser } as User : u
        );
    } else {
        // Create new
        if (users.some(u => u.username === newUser.username)) {
            setError('Tên đăng nhập đã tồn tại.');
            return;
        }
        const user: User = {
            id: crypto.randomUUID(),
            username: newUser.username!,
            password: newUser.password!,
            fullName: newUser.fullName!,
            role: newUser.role || 'user',
            allowedGroups: newUser.role === 'admin' ? [] : (newUser.allowedGroups || [])
        };
        updatedUsers = [...users, user];
    }

    setUsers(updatedUsers);
    Storage.saveUsers(updatedUsers);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
      setNewUser({ role: 'user', allowedGroups: [] });
      setEditingId(null);
      setError('');
  };

  // Logic for Multi-select Groups
  const uniqueGroups = useMemo(() => {
      const groups = new Set(equipment.map(e => e.group || 'Chung'));
      return Array.from(groups).sort();
  }, [equipment]);

  const toggleGroupPermission = (group: string) => {
      const current = newUser.allowedGroups || [];
      if (current.includes(group)) {
          setNewUser({ ...newUser, allowedGroups: current.filter(g => g !== group) });
      } else {
          setNewUser({ ...newUser, allowedGroups: [...current, group] });
      }
  };

  const toggleSelectAll = () => {
      if (!newUser.allowedGroups) return;
      
      const allSelected = uniqueGroups.every(g => newUser.allowedGroups?.includes(g));
      
      if (allSelected) {
          setNewUser({ ...newUser, allowedGroups: [] });
      } else {
          setNewUser({ ...newUser, allowedGroups: uniqueGroups });
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Quản lý Tài khoản</h2>
          <p className="text-sm text-gray-500">Cấp quyền truy cập hệ thống và phân quyền dữ liệu theo nhóm cho người sử dụng.</p>
        </div>
        <button
          onClick={() => {
              resetForm();
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quyền hạn (Nhóm)</th>
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
                    {user.role === 'admin' ? 'Quản trị viên' : 'Người sử dụng'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                    {user.role === 'admin' ? (
                        <span className="text-gray-400 italic">Toàn quyền</span>
                    ) : (
                        user.allowedGroups && user.allowedGroups.length > 0 
                        ? <span className="text-blue-600 font-medium">Được xem {user.allowedGroups.length} nhóm</span>
                        : <span className="text-red-500">Chưa cấp quyền</span>
                    )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {user.username !== 'Adminmp' && (
                    <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-full transition">
                            <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(user.username)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Cập nhật tài khoản" : "Tạo tài khoản mới"}>
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
              disabled={!!editingId} // Không cho sửa username
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
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vai trò</label>
              <div className="flex gap-4">
                  <label className="flex items-center">
                      <input 
                        type="radio" name="role" value="user" 
                        checked={newUser.role === 'user'} 
                        onChange={() => setNewUser({...newUser, role: 'user'})}
                        className="mr-2"
                      />
                      Người sử dụng
                  </label>
                  <label className="flex items-center">
                      <input 
                        type="radio" name="role" value="admin" 
                        checked={newUser.role === 'admin'}
                        onChange={() => setNewUser({...newUser, role: 'admin'})}
                        className="mr-2"
                      />
                      Quản trị viên
                  </label>
              </div>
          </div>

          {/* PERMISSION SELECTOR FOR 'USER' ROLE - GROUP BASED */}
          {newUser.role === 'user' && (
              <div className="border border-gray-300 rounded-md overflow-hidden flex flex-col bg-white h-64 shadow-sm mt-4">
                  <div className="p-2 border-b border-gray-200 bg-gray-50 space-y-2">
                      <label className="block text-xs font-bold text-gray-700 flex items-center">
                          <Layers className="w-4 h-4 mr-1 text-blue-600"/>
                          Phân quyền theo Nhóm Thiết bị
                      </label>
                      
                      <div className="flex items-center justify-between px-1">
                          <button 
                              onClick={toggleSelectAll}
                              className="flex items-center text-xs font-bold text-blue-600 hover:text-blue-800"
                          >
                              <CheckSquare className="w-4 h-4 mr-1" />
                              Chọn tất cả
                          </button>
                          <span className="text-xs text-gray-500">Đã chọn: <b className="text-blue-600">{newUser.allowedGroups?.length || 0}</b></span>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-1 space-y-1">
                      {uniqueGroups.length === 0 ? (
                          <p className="text-center text-xs text-gray-400 mt-4">Chưa có nhóm thiết bị nào.</p>
                      ) : (
                          uniqueGroups.map(group => {
                              const isSelected = newUser.allowedGroups?.includes(group);
                              return (
                                  <div 
                                      key={group}
                                      onClick={() => toggleGroupPermission(group)}
                                      className={`flex items-start p-2 rounded cursor-pointer transition-colors text-sm ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-100 border border-transparent'}`}
                                  >
                                      <div className={`mt-0.5 mr-2 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-300'}`}>
                                          {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                      </div>
                                      <div>
                                          <div className={`font-medium ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>{group}</div>
                                      </div>
                                  </div>
                              )
                          })
                      )}
                  </div>
              </div>
          )}
          
          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <button 
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
            onClick={handleSave}
          >
            {editingId ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagementPage;