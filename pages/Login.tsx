import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Server, Lock } from 'lucide-react';
import { APP_NAME } from '../constants';

const Login: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const success = await login(username, password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('用户名或密码错误。(默认管理员: admin / admin123)');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <Server className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-4 text-3xl font-extrabold text-gray-900">SLSS 系统登录</h2>
          <p className="mt-2 text-sm text-gray-600">服务器全生命周期服务系统</p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">用户名</label>
            <input 
              type="text" 
              required 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">密码</label>
            <input 
              type="password" 
              required 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
            />
          </div>
          
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <div>
            <button 
              type="submit" 
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
            >
              <Lock className="w-4 h-4 mr-2" /> 登录系统
            </button>
          </div>
        </form>
        <div className="mt-4 text-center text-xs text-gray-400">
           <p>演示账号: admin / admin123</p>
           <p>其他角色密码: 123456</p>
        </div>
      </div>
    </div>
  );
};

export default Login;