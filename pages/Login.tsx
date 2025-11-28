
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Server, Lock, UserPlus, RefreshCw, ShieldCheck, User, AlertCircle } from 'lucide-react';
import { UserRole } from '../types';

interface CaptchaRef {
  refresh: () => void;
}

const Captcha = forwardRef<CaptchaRef, { onValidate: (isValid: boolean) => void }>(({ onValidate }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refresh: () => {
      generateCode();
      setInput('');
      onValidate(false);
    }
  }));

  // 生成验证码：去除易混淆字符 (I, 1, 0, O, L)
  const generateCode = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let newCode = '';
    for (let i = 0; i < 4; i++) {
      newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(newCode);
  };

  const drawCaptcha = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Fix: Add willReadFrequently to improve performance and remove console warning
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. 背景色 (浅灰/白)
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, width, height);

    // 2. 绘制文字
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px Arial';
    
    for (let i = 0; i < code.length; i++) {
      ctx.save();
      // 随机颜色 (较深，保证对比度)
      ctx.fillStyle = `rgb(${Math.random() * 100},${Math.random() * 100},${Math.random() * 120})`;
      
      // 随机位置和旋转
      const x = 20 + i * 25;
      const y = height / 2 + (Math.random() - 0.5) * 8;
      const angle = (Math.random() - 0.5) * 0.5; // -0.25 to 0.25 rad
      
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(code[i], -8, 0); // 微调居中
      ctx.restore();
    }

    // 3. 干扰线 (5条)
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(${Math.random() * 200},${Math.random() * 200},${Math.random() * 200}, 0.6)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }

    // 4. 干扰点 (30个)
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 200},${Math.random() * 200},${Math.random() * 200}, 0.6)`;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, 1, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  useEffect(() => {
    generateCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    drawCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; 
    setInput(val);
    onValidate(val.toUpperCase() === code);
  };

  return (
    <div className="flex items-start space-x-3">
      <div className="flex-1">
        <input
            type="text"
            placeholder="请输入验证码"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={input}
            onChange={handleChange}
            maxLength={4}
        />
      </div>
      <div className="flex flex-col items-end shrink-0">
         <div 
            className="relative cursor-pointer border border-gray-200 rounded overflow-hidden shadow-sm hover:shadow transition-shadow group" 
            onClick={() => { generateCode(); setInput(''); onValidate(false); }}
            title="点击刷新验证码"
         >
            <canvas ref={canvasRef} width={100} height={42} />
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />
         </div>
         <button 
            type="button"
            onClick={() => { generateCode(); setInput(''); onValidate(false); }} 
            className="text-[11px] text-blue-600 mt-1 hover:text-blue-800 hover:underline bg-transparent border-none p-0 cursor-pointer flex items-center"
         >
            <RefreshCw className="w-3 h-3 mr-1" /> 看不清？换一张
         </button>
      </div>
    </div>
  );
});

const Login: React.FC = () => {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const captchaRef = useRef<CaptchaRef>(null);
  
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
      setError('验证码错误，请重新输入');
      // Auto refresh captcha on error
      captchaRef.current?.refresh();
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
          setFormData(prev => ({ ...prev, password: '' }));
          captchaRef.current?.refresh();
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
            captchaRef.current?.refresh();
          }, 2000);
        } else {
          setError(res.message || '注册失败');
          captchaRef.current?.refresh();
        }
      }
    } catch (e) {
      setError('系统错误，请重试');
      captchaRef.current?.refresh();
    } finally {
      // Ensure loading state is reset even if unmounted
      if (loading) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 transition-all duration-300 border-t-4 border-blue-600">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Server className="h-7 w-7 text-blue-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {isLoginMode ? 'SLSS 系统登录' : '申请账号注册'}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {isLoginMode ? '服务器全生命周期服务系统 V2.0' : '注册后需管理员审批通过方可使用'}
          </p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          
          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-800 text-sm p-3 rounded-lg flex items-center animate-in fade-in">
              <ShieldCheck className="w-5 h-5 mr-2" /> {successMsg}
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-center animate-pulse">
              <AlertCircle className="w-5 h-5 mr-2" /> {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                type="text" 
                required 
                className="block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="请输入用户名"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                type="password" 
                required 
                className="block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="请输入密码"
              />
            </div>
          </div>

          {!isLoginMode && (
            <div className="animate-in slide-in-from-top-2 space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">申请角色</label>
                 <select 
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                 >
                    <option value={UserRole.TECHNICIAN}>技术工程师 (Technician)</option>
                    <option value={UserRole.MANAGER}>服务经理 (Manager)</option>
                    <option value={UserRole.PRODUCTION}>生产专员 (Production)</option>
                 </select>
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系电话 (可选)</label>
                  <input 
                    type="tel" 
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="用于接收审批通知"
                  />
               </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">安全验证</label>
            <Captcha 
              ref={captchaRef} 
              onValidate={(isValid) => setCaptchaValid(isValid)} 
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                 isLoginMode ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-green-600 hover:bg-green-700 shadow-green-500/30'
              } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              {loading ? (
                 <RefreshCw className="w-5 h-5 animate-spin" /> 
              ) : (
                 isLoginMode ? <><Lock className="w-5 h-5 mr-2" /> 登录系统</> : <><UserPlus className="w-5 h-5 mr-2" /> 提交注册申请</>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
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
              className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {isLoginMode ? '注册新账号' : '返回登录'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
    