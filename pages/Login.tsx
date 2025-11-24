
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Server, Lock, UserPlus, RefreshCw, ShieldCheck, User, AlertCircle, Play } from 'lucide-react';
import { UserRole } from '../types';

const Captcha: React.FC<{ onValidate: (isValid: boolean) => void }> = ({ onValidate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let newCode = '';
    for (let i = 0; i < 4; i++) {
      newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(newCode);
    setInput('');
    onValidate(false);
  };

  const drawCaptcha = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Text
    ctx.font = 'bold 24px Arial';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < code.length; i++) {
      ctx.fillStyle = `rgb(${Math.random()*100},${Math.random()*100},${Math.random()*100})`;
      ctx.save();
      // Random position and rotation
      const x = 20 + i * 25;
      const y = 20 + Math.random() * 10;
      const angle = (Math.random() - 0.5) * 0.4;
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(code[i], 0, 0);
      ctx.restore();
    }

    // Noise lines
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(${Math.random()*255},${Math.random()*255},${Math.random()*255},0.5)`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }
  };

  useEffect(() => {
    generateCode();
  }, []);

  useEffect(() => {
    drawCaptcha();
  }, [code]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setInput(val);
    onValidate(val === code);
  };

  return (
    <div className="flex items-center space-x-2">
      <input
        type="text"
        placeholder="验证码"
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 uppercase"
        value={input}
        onChange={handleChange}
        maxLength={4}
      />
      <div className="relative group cursor-pointer" onClick={generateCode}>
         <canvas ref={canvasRef} width={120} height={40} className="rounded border border-gray-200" />
         <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
            <RefreshCw className="w-4 h-4 text-white" />
         </div>
      </div>
    </div>
  );
};

const Login: React.FC = () => {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    phone: '',
    role: UserRole.TECHNICIAN
  });
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [captchaValid, setCaptchaValid] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!captchaValid) {
      setError('请输入正确的验证码');
      return;
    }

    setLoading(true);

    try {
      if (isLoginMode) {
        const res = await login(formData.username, formData.password);
        if (res.success) {
          navigate('/dashboard');
        } else {
          setError(res.message || '登录失败');
        }
      } else {
        // Registration
        const res = await register({
          username: formData.username,
          password: formData.password,
          role: formData.role,
          phone: formData.phone
        });
        
        if (res.success) {
          setSuccessMsg(res.message || '注册成功');
          // Reset and switch to login
          setTimeout(() => {
            setIsLoginMode(true);
            setSuccessMsg('');
            setFormData({ username: '', password: '', phone: '', role: UserRole.TECHNICIAN });
          }, 2000);
        } else {
          setError(res.message || '注册失败');
        }
      }
    } catch (e) {
      setError('系统错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const autoFillDemo = () => {
    setFormData(prev => ({ ...prev, username: 'stars', password: 'Gyh@20210625' }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 transition-all duration-300">
        <div className="text-center mb-8">
          <Server className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-4 text-3xl font-extrabold text-gray-900">
            {isLoginMode ? 'SLSS 系统登录' : '申请账号注册'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLoginMode ? '服务器全生命周期服务系统' : '注册后需管理员审批通过方可使用'}
          </p>
        </div>
        
        <form className="space-y-5" onSubmit={handleSubmit}>
          
          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-800 text-sm p-3 rounded flex items-center">
              <ShieldCheck className="w-4 h-4 mr-2" /> {successMsg}
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded animate-pulse">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">用户名</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="text" 
                required 
                className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="请输入用户名"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">密码</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="password" 
                required 
                className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="请输入密码"
              />
            </div>
          </div>

          {!isLoginMode && (
            <div className="animate-in slide-in-from-top-2 space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700">申请角色</label>
                 <select 
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                 >
                    <option value={UserRole.TECHNICIAN}>技术工程师 (Technician)</option>
                    <option value={UserRole.MANAGER}>服务经理 (Manager)</option>
                    <option value={UserRole.PRODUCTION}>生产专员 (Production)</option>
                 </select>
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700">联系电话 (可选)</label>
                  <input 
                    type="tel" 
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="用于接收审批通知"
                  />
               </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">安全验证</label>
            <Captcha onValidate={setCaptchaValid} />
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                 isLoginMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
              } disabled:opacity-50 disabled:cursor-wait`}
            >
              {loading ? (
                 <RefreshCw className="w-4 h-4 animate-spin" /> 
              ) : (
                 isLoginMode ? <><Lock className="w-4 h-4 mr-2" /> 登录系统</> : <><UserPlus className="w-4 h-4 mr-2" /> 提交注册申请</>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                {isLoginMode ? '还没有账号?' : '已有账号?'}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={() => { setIsLoginMode(!isLoginMode); setError(''); setSuccessMsg(''); }}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              {isLoginMode ? '注册新账号' : '返回登录'}
            </button>
          </div>
        </div>

        {/* Demo Credentials Helper */}
        {isLoginMode && (
          <div className="mt-6 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-2">
             <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-900 border border-blue-100">
               <div className="flex items-center font-bold mb-2">
                 <AlertCircle className="w-3 h-3 mr-1 text-blue-600"/> 开发环境默认管理员 (Admin)
               </div>
               <div className="flex items-center justify-between bg-white rounded p-2 border border-blue-100">
                  <div className="flex flex-col">
                     <span className="text-gray-500 text-[10px] uppercase">User / Pass</span>
                     <span className="font-mono font-medium">stars <span className="text-gray-300 mx-1">|</span> Gyh@20210625</span>
                  </div>
                  <button 
                    type="button"
                    onClick={autoFillDemo}
                    className="flex items-center bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors shadow-sm"
                    title="自动填入"
                  >
                     <Play className="w-3 h-3 mr-1 fill-current" /> 填入
                  </button>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
