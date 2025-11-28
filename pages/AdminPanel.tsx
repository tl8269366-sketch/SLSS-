import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../components/AuthContext';
import { UserRole, Permission, DatabaseConfig, RedisConfig, SystemStatus, AIConfig, NotificationConfig, SystemSettings, User } from '../types';
import { testAIConnection } from '../services/geminiService';
import { getNotificationConfig, saveNotificationConfig } from '../services/notificationService';
import { useTheme } from '../components/ThemeContext';
import { DEFAULT_OPERATORS } from '../services/mockData';
import { 
  Shield, UserCheck, Settings, Save, Key, Globe, Cpu, AlertCircle, CheckCircle, 
  Database, Activity, Server, HardDrive, Zap, RefreshCw, Lock, Radio, Network,
  Palette, UserPlus, Trash2, Check, X, Bell, Mail, MessageSquare, List, Users, Play, ToggleLeft, ToggleRight, Layers
} from 'lucide-react';
import { ROLE_LABELS, PERMISSION_LABELS } from '../constants';

// --- Sub-components ---

const StatusIndicator = ({ status, text }: { status: 'good' | 'warning' | 'error' | 'neutral', text: string }) => {
  const colors = {
    good: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    neutral: 'bg-gray-400'
  };
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2.5 h-2.5 rounded-full ${colors[status]} animate-pulse`} />
      <span className="text-sm font-medium text-gray-700">{text}</span>
    </div>
  );
};

const PROVIDER_PRESETS: Record<string, { label: string, baseUrl: string, models: string[], icon: any, desc: string }> = {
  'google': { label: 'Google Gemini', baseUrl: '', models: ['gemini-2.5-flash', 'gemini-pro', 'gemini-1.5-pro'], icon: Zap, desc: '官方直连，需科学上网。' },
  'openai': { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-3.5-turbo'], icon: Globe, desc: 'OpenAI 官方接口。' },
  'deepseek': { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', models: ['deepseek-chat'], icon: Cpu, desc: '国内直连，高性价比。' },
  'zhipu': { label: 'Zhipu AI', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4'], icon: Activity, desc: '智谱 GLM，国内直连。' },
  'custom': { label: 'Custom Proxy', baseUrl: '', models: [], icon: Settings, desc: '任意 OpenAI 协议代理。' }
};

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'status' | 'database' | 'ai' | 'notification' | 'users' | 'operators' | 'general'>('status');
  const { themeConfig } = useTheme();
  const { usersList, updateUserStatus, deleteUser, addUser } = useAuth(); 

  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({ type: 'mysql', host: 'localhost', port: 3306, username: 'root', databaseName: 'slss_prod', ssl: false });
  const [redisConfig, setRedisConfig] = useState<RedisConfig>({ enabled: true, host: 'localhost', port: 6379, dbIndex: 0 });
  const [aiConfig, setAiConfig] = useState<AIConfig>({ provider: 'google', model: 'gemini-2.5-flash', baseUrl: '', apiKey: '' });
  const [notifyConfig, setNotifyConfig] = useState<NotificationConfig>(getNotificationConfig());
  const [sysSettings, setSysSettings] = useState<SystemSettings>({ 
    appName: 'SLSS', 
    systemMode: 'demo', // Default to Demo mode for stability in preview
    maintenanceMode: false, 
    logRetentionDays: 30, 
    defaultAssigneeId: undefined, 
    productionOperators: DEFAULT_OPERATORS 
  });
  
  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({ maxAttempts: 5, lockTimeMinutes: 15 });

  const [sysStatus, setSysStatus] = useState<SystemStatus>({ cpuUsage: 12, memoryUsage: 34, uptime: 124500, dbStatus: 'connected', dbLatency: 5, redisStatus: 'connected', activeConnections: 18 });

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', role: UserRole.TECHNICIAN, permissions: [] as Permission[] });
  
  // Operator Management State
  const [newOperatorName, setNewOperatorName] = useState('');

  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [testingAI, setTestingAI] = useState(false);
  
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const loadConfig = (key: string, setter: any) => {
      const saved = localStorage.getItem(key);
      if (saved) {
        try { setter(JSON.parse(saved)); } catch(e) { console.error(e); }
      }
    };
    loadConfig('slss_ai_config', setAiConfig);
    loadConfig('slss_db_config', setDbConfig);
    loadConfig('slss_redis_config', setRedisConfig);
    loadConfig('slss_system_settings', setSysSettings);

    // Load Security Settings from API
    // Note: In Mock Mode this will likely fail silently or we can mock it, but for Admin Panel UI it's fine.
    fetch('/api/admin/security-settings')
      .then(res => res.json())
      .then(data => { if(mountedRef.current) setSecuritySettings(data); })
      .catch(e => console.warn("Failed to load security settings (Backend Offline)", e));
  }, []);

  useEffect(() => {
    if (activeTab === 'status') {
      const interval = setInterval(() => {
        if (mountedRef.current) {
            setSysStatus(prev => ({
            ...prev,
            cpuUsage: Math.min(100, Math.max(5, prev.cpuUsage + (Math.random() - 0.5) * 10)),
            memoryUsage: Math.min(100, Math.max(20, prev.memoryUsage + (Math.random() - 0.5) * 5)),
            uptime: prev.uptime + 3
            }));
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleSave = (key: string, data: any, msg: string) => {
    try {
      if (key === 'slss_notification_config') saveNotificationConfig(data);
      else localStorage.setItem(key, JSON.stringify(data));
      setSaveStatus({ type: 'success', message: msg });
      
      // Force reload if system mode changed
      if (key === 'slss_system_settings') {
         setTimeout(() => window.location.reload(), 1500); // Reload to apply new mode
         msg += " (页面即将刷新以应用更改)";
      } else {
         setTimeout(() => { if (mountedRef.current) setSaveStatus(null); }, 3000);
      }
    } catch (e: any) {
      setSaveStatus({ type: 'error', message: '保存失败: ' + e.message });
    }
  };

  const handleSaveSecurity = async () => {
    try {
      const res = await fetch('/api/admin/security-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(securitySettings)
      });
      if (res.ok) {
        setSaveStatus({ type: 'success', message: '安全策略已更新' });
        setTimeout(() => { if(mountedRef.current) setSaveStatus(null); }, 3000);
      } else {
        throw new Error('API Error');
      }
    } catch (e) {
      setSaveStatus({ type: 'error', message: '更新失败 (Backend Offline)' });
    }
  };

  const handleTestAI = async () => {
    setTestingAI(true);
    try {
      const result = await testAIConnection(aiConfig);
      if (mountedRef.current) setSaveStatus({ type: 'success', message: `测试通过: ${result}` });
    } catch (e: any) {
      if (mountedRef.current) setSaveStatus({ type: 'error', message: `连接失败: ${e.message}` });
    } finally {
      if (mountedRef.current) setTestingAI(false);
      setTimeout(() => { if(mountedRef.current) setSaveStatus(null); }, 5000);
    }
  };

  const handleAddUser = () => {
    if (!newUserForm.username || !newUserForm.password) { alert("请填写完整信息"); return; }
    addUser({ username: newUserForm.username, password: newUserForm.password, role: newUserForm.role, status: 'active', permissions: newUserForm.permissions });
    setShowAddUserModal(false);
    setSaveStatus({ type: 'success', message: '用户创建成功' });
    setTimeout(() => { if(mountedRef.current) setSaveStatus(null); }, 3000);
  };

  const toggleNewUserPermission = (perm: Permission) => {
    setNewUserForm(prev => {
        if (prev.permissions.includes(perm)) return { ...prev, permissions: prev.permissions.filter(p => p !== perm) };
        else return { ...prev, permissions: [...prev.permissions, perm] };
    });
  };

  // --- Operator Logic ---
  const addOperator = () => {
    if (!newOperatorName.trim()) return;
    const currentList = sysSettings.productionOperators || DEFAULT_OPERATORS;
    if (currentList.includes(newOperatorName)) {
      alert("该人员已存在");
      return;
    }
    const newList = [...currentList, newOperatorName].sort((a,b) => a.localeCompare(b, 'zh-CN'));
    const newSettings = { ...sysSettings, productionOperators: newList };
    setSysSettings(newSettings);
    handleSave('slss_system_settings', newSettings, '人员添加成功');
    setNewOperatorName('');
  };

  const removeOperator = (name: string) => {
    const currentList = sysSettings.productionOperators || DEFAULT_OPERATORS;
    const newList = currentList.filter(o => o !== name);
    const newSettings = { ...sysSettings, productionOperators: newList };
    setSysSettings(newSettings);
    handleSave('slss_system_settings', newSettings, '人员已移除');
  };

  const pendingUsers = usersList.filter(u => u.status === 'pending');
  const activeUsers = usersList.filter(u => u.status !== 'pending');

  const SidebarItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors rounded-lg mb-1 ${
        activeTab === id ? `${themeConfig.classes.bgLight} ${themeConfig.classes.text}` : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-5 h-5 mr-3" />
      {label}
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[calc(100vh-100px)] animate-in fade-in duration-500">
      <div className="w-full md:w-64 flex-shrink-0">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sticky top-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase mb-4 px-4 tracking-wider">系统设置</h2>
          <nav>
            <SidebarItem id="status" icon={Activity} label="系统监控概览" />
            <SidebarItem id="general" icon={Settings} label="基础参数设置" />
            <SidebarItem id="operators" icon={Users} label="生产人员管理" />
            <SidebarItem id="users" icon={UserCheck} label="用户权限管理" />
            <SidebarItem id="database" icon={Database} label="数据库与缓存" />
            <SidebarItem id="ai" icon={Network} label="AI 智能网关" />
            <SidebarItem id="notification" icon={Bell} label="通知与集成" />
          </nav>
        </div>
      </div>

      <div className="flex-1">
        <div className="bg-white rounded-lg shadow border border-gray-200 min-h-full flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
             <h1 className="text-xl font-bold text-gray-800 flex items-center">
               {activeTab === 'operators' && <><Users className={`mr-2 ${themeConfig.classes.text}`} /> 生产操作员管理</>}
               {activeTab === 'users' && <><UserCheck className={`mr-2 ${themeConfig.classes.text}`} /> 用户权限管理</>}
               {activeTab === 'status' && <><Activity className={`mr-2 ${themeConfig.classes.text}`} /> 系统运行状态</>}
               {activeTab === 'general' && <><Settings className={`mr-2 ${themeConfig.classes.text}`} /> 基础参数设置</>}
               {activeTab === 'database' && <><Database className={`mr-2 ${themeConfig.classes.text}`} /> 数据库与缓存</>}
               {activeTab === 'ai' && <><Network className={`mr-2 ${themeConfig.classes.text}`} /> AI 智能网关</>}
               {activeTab === 'notification' && <><Bell className={`mr-2 ${themeConfig.classes.text}`} /> 通知与集成</>}
             </h1>
             {saveStatus && (
                <div className={`px-4 py-2 rounded text-sm font-medium animate-in fade-in slide-in-from-top-2 flex items-center ${
                  saveStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {saveStatus.type === 'success' ? <CheckCircle className="w-4 h-4 mr-2"/> : <AlertCircle className="w-4 h-4 mr-2"/>}
                  {saveStatus.message}
                </div>
             )}
          </div>

          <div className="p-6 flex-1">
            
            {/* --- TAB: STATUS --- */}
            {activeTab === 'status' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                   <div className="flex items-center justify-between mb-4">
                      <div className="text-gray-500 text-sm font-medium">CPU 使用率</div>
                      <Cpu className="text-blue-500 w-5 h-5" />
                   </div>
                   <div className="text-3xl font-bold text-gray-800">{sysStatus.cpuUsage.toFixed(1)}%</div>
                   <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
                      <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${sysStatus.cpuUsage}%` }}></div>
                   </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                   <div className="flex items-center justify-between mb-4">
                      <div className="text-gray-500 text-sm font-medium">内存使用率</div>
                      <HardDrive className="text-purple-500 w-5 h-5" />
                   </div>
                   <div className="text-3xl font-bold text-gray-800">{sysStatus.memoryUsage.toFixed(1)}%</div>
                   <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
                      <div className="bg-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${sysStatus.memoryUsage}%` }}></div>
                   </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                   <div className="flex items-center justify-between mb-4">
                      <div className="text-gray-500 text-sm font-medium">数据库状态</div>
                      <Database className="text-green-500 w-5 h-5" />
                   </div>
                   <div className="text-lg font-bold text-gray-800 flex items-center">
                      <StatusIndicator status="good" text="Connected" />
                   </div>
                   <div className="text-xs text-gray-400 mt-3">Latency: {sysStatus.dbLatency}ms</div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                   <div className="flex items-center justify-between mb-4">
                      <div className="text-gray-500 text-sm font-medium">系统运行时间</div>
                      <Activity className="text-orange-500 w-5 h-5" />
                   </div>
                   <div className="text-2xl font-bold text-gray-800">{(sysStatus.uptime / 3600).toFixed(1)} Hours</div>
                   <div className="text-xs text-gray-400 mt-3">Since last restart</div>
                </div>
              </div>
            )}

            {/* --- TAB: GENERAL --- */}
            {activeTab === 'general' && (
              <div className="max-w-2xl space-y-6">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">系统名称 (App Name)</label>
                    <input 
                       className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                       value={sysSettings.appName}
                       onChange={e => setSysSettings({...sysSettings, appName: e.target.value})}
                    />
                 </div>

                 {/* Security Policy Section */}
                 <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <h3 className="text-sm font-bold text-red-800 mb-3 flex items-center">
                        <Lock className="w-4 h-4 mr-2" /> 安全策略设置 (Security Policy)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">最大登录失败次数</label>
                            <input 
                                type="number"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                value={securitySettings.maxAttempts}
                                onChange={e => setSecuritySettings({...securitySettings, maxAttempts: Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">锁定时间 (分钟)</label>
                            <input 
                                type="number"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                value={securitySettings.lockTimeMinutes}
                                onChange={e => setSecuritySettings({...securitySettings, lockTimeMinutes: Number(e.target.value)})}
                            />
                        </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                        <button onClick={handleSaveSecurity} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700">更新策略</button>
                    </div>
                 </div>
                 
                 {/* System Mode Switch */}
                 <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <h3 className="text-sm font-bold text-purple-800 mb-3 flex items-center">
                       <Layers className="w-4 h-4 mr-2" /> 系统运行模式 (System Environment)
                    </h3>
                    <div className="flex space-x-4">
                        <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all flex-1 ${sysSettings.systemMode === 'production' ? 'bg-white border-purple-500 shadow-sm ring-1 ring-purple-500' : 'bg-transparent border-transparent hover:bg-purple-100'}`}>
                           <input 
                              type="radio" 
                              name="sysMode" 
                              checked={sysSettings.systemMode === 'production'} 
                              onChange={() => setSysSettings({...sysSettings, systemMode: 'production'})}
                              className="mr-3"
                           />
                           <div>
                              <div className="font-bold text-gray-800">生产模式 (Production)</div>
                              <div className="text-xs text-gray-500">连接真实 MySQL 数据库，启用完整功能与日志记录。</div>
                           </div>
                        </label>
                        <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all flex-1 ${sysSettings.systemMode === 'demo' ? 'bg-white border-orange-500 shadow-sm ring-1 ring-orange-500' : 'bg-transparent border-transparent hover:bg-orange-100'}`}>
                           <input 
                              type="radio" 
                              name="sysMode" 
                              checked={sysSettings.systemMode === 'demo' || !sysSettings.systemMode} 
                              onChange={() => setSysSettings({...sysSettings, systemMode: 'demo'})}
                              className="mr-3"
                           />
                           <div>
                              <div className="font-bold text-gray-800">演示模式 (Demo / Mock)</div>
                              <div className="text-xs text-gray-500">使用浏览器内存与本地模拟数据，无需后端 DB。</div>
                           </div>
                        </label>
                    </div>
                 </div>

                 <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div>
                       <div className="font-medium text-gray-800">维护模式 (Maintenance Mode)</div>
                       <div className="text-xs text-gray-500">开启后，普通用户将无法登录系统，仅管理员可用。</div>
                    </div>
                    <button 
                       onClick={() => setSysSettings({...sysSettings, maintenanceMode: !sysSettings.maintenanceMode})}
                       className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${sysSettings.maintenanceMode ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                       <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${sysSettings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">日志保留天数</label>
                    <input 
                       type="number"
                       className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                       value={sysSettings.logRetentionDays}
                       onChange={e => setSysSettings({...sysSettings, logRetentionDays: Number(e.target.value)})}
                    />
                 </div>
                 <div className="pt-4">
                    <button onClick={() => handleSave('slss_system_settings', sysSettings, '系统设置已保存')} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
                       <Save className="w-4 h-4 mr-2" /> 保存设置
                    </button>
                 </div>
              </div>
            )}

            {/* --- TAB: OPERATORS --- */}
            {activeTab === 'operators' && (
               <div className="max-w-4xl">
                  <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                     在此管理生产录入系统中可选的操作员名单。系统将自动按拼音首字母进行排序。
                  </div>
                  
                  <div className="flex gap-4 mb-6">
                     <input 
                       className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                       placeholder="输入姓名 (例如: 张三)"
                       value={newOperatorName}
                       onChange={e => setNewOperatorName(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && addOperator()}
                     />
                     <button onClick={addOperator} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center">
                        <UserPlus className="w-4 h-4 mr-2"/> 添加人员
                     </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {(sysSettings.productionOperators || DEFAULT_OPERATORS).map((name, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded border border-gray-200 hover:shadow-md transition-shadow group">
                           <span className="font-medium text-gray-700">{name}</span>
                           <button onClick={() => removeOperator(name)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* --- TAB: USERS --- */}
            {activeTab === 'users' && (
              <div className="space-y-8">
                {pendingUsers.length > 0 && (
                   <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                      <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center">
                         <AlertCircle className="w-5 h-5 mr-2" /> 待审批用户 ({pendingUsers.length})
                      </h3>
                      <div className="overflow-x-auto">
                         <table className="min-w-full bg-white rounded-lg overflow-hidden border border-orange-100">
                            <thead className="bg-orange-100/50">
                               <tr>
                                  <th className="px-4 py-2 text-left text-xs font-bold text-orange-800">用户名</th>
                                  <th className="px-4 py-2 text-left text-xs font-bold text-orange-800">申请角色</th>
                                  <th className="px-4 py-2 text-left text-xs font-bold text-orange-800">联系电话</th>
                                  <th className="px-4 py-2 text-right text-xs font-bold text-orange-800">操作</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-100">
                               {pendingUsers.map(u => (
                                  <tr key={u.id}>
                                     <td className="px-4 py-3 font-medium">{u.username}</td>
                                     <td className="px-4 py-3"><span className="bg-white border border-orange-200 px-2 py-0.5 rounded text-xs text-orange-700">{ROLE_LABELS[u.role]}</span></td>
                                     <td className="px-4 py-3 text-sm text-gray-500">{u.phone || '-'}</td>
                                     <td className="px-4 py-3 text-right space-x-2">
                                        <button onClick={() => updateUserStatus(u.id, 'active')} className="text-green-600 hover:text-green-800 text-xs font-bold border border-green-200 bg-green-50 px-2 py-1 rounded">通过</button>
                                        <button onClick={() => deleteUser(u.id)} className="text-red-600 hover:text-red-800 text-xs font-bold border border-red-200 bg-red-50 px-2 py-1 rounded">拒绝</button>
                                     </td>
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   </div>
                )}
                
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">系统用户列表</h3>
                    <button onClick={() => setShowAddUserModal(true)} className={`flex items-center text-sm text-white ${themeConfig.classes.bg} ${themeConfig.classes.bgHover} px-4 py-2 rounded shadow-sm`}>
                      <UserPlus className="w-4 h-4 mr-2"/> 新增用户
                    </button>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                     <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                           <tr>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">用户名</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">角色</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">权限摘要</th>
                              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">操作</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                           {activeUsers.map(u => (
                              <tr key={u.id} className="hover:bg-gray-50">
                                 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.username}</td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className="px-2 py-1 rounded bg-gray-100 text-xs font-bold">{ROLE_LABELS[u.role]}</span>
                                 </td>
                                 <td className="px-6 py-4 text-sm text-gray-500">
                                    <div className="flex flex-wrap gap-1 max-w-md">
                                       {u.permissions.slice(0, 3).map(p => (
                                          <span key={p} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">{PERMISSION_LABELS[p] || p}</span>
                                       ))}
                                       {u.permissions.length > 3 && <span className="text-[10px] text-gray-400">+{u.permissions.length - 3}</span>}
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {u.role !== UserRole.ADMIN && (
                                       <button onClick={() => deleteUser(u.id)} className="text-red-600 hover:text-red-900 flex items-center justify-end w-full">
                                          <Trash2 className="w-4 h-4" />
                                       </button>
                                    )}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB: DATABASE --- */}
            {activeTab === 'database' && (
               <div className="space-y-6 max-w-3xl">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start">
                     <Database className="w-5 h-5 text-blue-600 mt-0.5 mr-3 shrink-0"/>
                     <div className="text-sm text-blue-800">
                        配置应用程序连接的后端数据库。当前仅支持 MySQL。Redis 缓存用于加速 Session 和频繁查询。
                     </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                     <h3 className="font-bold text-gray-800 mb-4 flex items-center">MySQL 主数据库</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                           <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                           <input className="w-full border rounded px-3 py-2 text-sm" value={dbConfig.host} onChange={e => setDbConfig({...dbConfig, host: e.target.value})} />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                           <input type="number" className="w-full border rounded px-3 py-2 text-sm" value={dbConfig.port} onChange={e => setDbConfig({...dbConfig, port: Number(e.target.value)})} />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
                           <input className="w-full border rounded px-3 py-2 text-sm" value={dbConfig.databaseName} onChange={e => setDbConfig({...dbConfig, databaseName: e.target.value})} />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                           <input className="w-full border rounded px-3 py-2 text-sm" value={dbConfig.username} onChange={e => setDbConfig({...dbConfig, username: e.target.value})} />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                           <input type="password" className="w-full border rounded px-3 py-2 text-sm" value={dbConfig.password} onChange={e => setDbConfig({...dbConfig, password: e.target.value})} />
                        </div>
                     </div>
                     <div className="mt-4 flex justify-end">
                        <button onClick={() => handleSave('slss_db_config', dbConfig, '数据库配置已保存')} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">保存配置</button>
                     </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center">Redis 缓存 (可选)</h3>
                        <label className="flex items-center cursor-pointer">
                           <input type="checkbox" className="sr-only peer" checked={redisConfig.enabled} onChange={e => setRedisConfig({...redisConfig, enabled: e.target.checked})} />
                           <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                     </div>
                     {redisConfig.enabled && (
                        <div className="grid grid-cols-2 gap-4">
                           <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                              <input className="w-full border rounded px-3 py-2 text-sm" value={redisConfig.host} onChange={e => setRedisConfig({...redisConfig, host: e.target.value})} />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                              <input type="number" className="w-full border rounded px-3 py-2 text-sm" value={redisConfig.port} onChange={e => setRedisConfig({...redisConfig, port: Number(e.target.value)})} />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                              <input type="password" className="w-full border rounded px-3 py-2 text-sm" value={redisConfig.password || ''} onChange={e => setRedisConfig({...redisConfig, password: e.target.value})} />
                           </div>
                        </div>
                     )}
                     <div className="mt-4 flex justify-end">
                        <button onClick={() => handleSave('slss_redis_config', redisConfig, 'Redis 配置已保存')} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">保存配置</button>
                     </div>
                  </div>
               </div>
            )}

            {/* --- TAB: AI --- */}
            {activeTab === 'ai' && (
               <div className="space-y-6 max-w-4xl">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     {/* Sidebar: Provider Selection */}
                     <div className="space-y-3">
                        {Object.entries(PROVIDER_PRESETS).map(([key, provider]) => (
                           <div 
                              key={key} 
                              onClick={() => setAiConfig({ ...aiConfig, provider: key as any, baseUrl: provider.baseUrl, model: provider.models[0] || '' })}
                              className={`p-3 rounded-lg border cursor-pointer flex items-center transition-all ${aiConfig.provider === key ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-gray-200 hover:bg-gray-50'}`}
                           >
                              <provider.icon className={`w-5 h-5 mr-3 ${aiConfig.provider === key ? 'text-purple-600' : 'text-gray-400'}`} />
                              <div>
                                 <div className={`text-sm font-bold ${aiConfig.provider === key ? 'text-purple-800' : 'text-gray-700'}`}>{provider.label}</div>
                                 <div className="text-xs text-gray-500">{provider.desc}</div>
                              </div>
                           </div>
                        ))}
                     </div>

                     {/* Main: Config Form */}
                     <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                        <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">
                           配置 {PROVIDER_PRESETS[aiConfig.provider]?.label}
                        </h3>
                        
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">API Key <span className="text-red-500">*</span></label>
                           <div className="relative">
                              <Key className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"/>
                              <input 
                                 type="password" 
                                 className="w-full pl-10 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                                 placeholder="sk-..."
                                 value={aiConfig.apiKey}
                                 onChange={e => setAiConfig({...aiConfig, apiKey: e.target.value})}
                              />
                           </div>
                        </div>

                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Base URL (API Endpoint)</label>
                           <div className="relative">
                              <Globe className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"/>
                              <input 
                                 type="text" 
                                 className="w-full pl-10 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm"
                                 placeholder="https://api.openai.com/v1"
                                 value={aiConfig.baseUrl}
                                 onChange={e => setAiConfig({...aiConfig, baseUrl: e.target.value})}
                              />
                           </div>
                           <p className="text-xs text-gray-500 mt-1">如使用默认官方接口，可留空。若使用中转/代理，请输入完整 URL。</p>
                        </div>

                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
                           <input 
                              type="text" 
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm"
                              value={aiConfig.model}
                              onChange={e => setAiConfig({...aiConfig, model: e.target.value})}
                              list="model-suggestions"
                           />
                           <datalist id="model-suggestions">
                              {PROVIDER_PRESETS[aiConfig.provider]?.models.map(m => <option key={m} value={m} />)}
                           </datalist>
                        </div>

                        <div className="flex gap-3 pt-4">
                           <button 
                              onClick={handleTestAI} 
                              disabled={testingAI}
                              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium flex justify-center items-center"
                           >
                              {testingAI ? <RefreshCw className="w-4 h-4 mr-2 animate-spin"/> : <Zap className="w-4 h-4 mr-2"/>} 
                              测试连接
                           </button>
                           <button 
                              onClick={() => handleSave('slss_ai_config', aiConfig, 'AI 配置已保存')} 
                              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
                           >
                              保存配置
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* --- TAB: NOTIFICATION --- */}
            {activeTab === 'notification' && (
               <div className="space-y-6 max-w-3xl">
                  {/* SMTP */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center"><Mail className="w-5 h-5 mr-2 text-blue-500"/> 邮件通知 (SMTP)</h3>
                        <label className="flex items-center cursor-pointer">
                           <input type="checkbox" className="sr-only peer" checked={notifyConfig.smtp.enabled} onChange={e => setNotifyConfig({...notifyConfig, smtp: {...notifyConfig.smtp, enabled: e.target.checked}})} />
                           <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                     </div>
                     {notifyConfig.smtp.enabled && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                              <input className="w-full border rounded px-3 py-2 text-sm" value={notifyConfig.smtp.host} onChange={e => setNotifyConfig({...notifyConfig, smtp: {...notifyConfig.smtp, host: e.target.value}})} />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                              <input type="number" className="w-full border rounded px-3 py-2 text-sm" value={notifyConfig.smtp.port} onChange={e => setNotifyConfig({...notifyConfig, smtp: {...notifyConfig.smtp, port: Number(e.target.value)}})} />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">User / Email</label>
                              <input className="w-full border rounded px-3 py-2 text-sm" value={notifyConfig.smtp.user} onChange={e => setNotifyConfig({...notifyConfig, smtp: {...notifyConfig.smtp, user: e.target.value}})} />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Password / App Token</label>
                              <input type="password" className="w-full border rounded px-3 py-2 text-sm" value={notifyConfig.smtp.pass} onChange={e => setNotifyConfig({...notifyConfig, smtp: {...notifyConfig.smtp, pass: e.target.value}})} />
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Webhooks */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                     <h3 className="font-bold text-gray-800 flex items-center mb-4"><MessageSquare className="w-5 h-5 mr-2 text-green-500"/> IM 机器人集成</h3>
                     
                     <div className="space-y-4">
                        {/* WeCom */}
                        <div className="p-4 bg-gray-50 rounded border border-gray-100">
                           <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-700">企业微信 (WeCom)</span>
                              <input type="checkbox" checked={notifyConfig.robots.wecom.enabled} onChange={e => setNotifyConfig({...notifyConfig, robots: {...notifyConfig.robots, wecom: {...notifyConfig.robots.wecom, enabled: e.target.checked}}})} className="accent-green-600"/>
                           </div>
                           <input placeholder="Webhook URL" className="w-full border rounded px-3 py-2 text-sm" value={notifyConfig.robots.wecom.webhook} onChange={e => setNotifyConfig({...notifyConfig, robots: {...notifyConfig.robots, wecom: {...notifyConfig.robots.wecom, webhook: e.target.value}}})} disabled={!notifyConfig.robots.wecom.enabled} />
                        </div>

                        {/* DingTalk */}
                        <div className="p-4 bg-gray-50 rounded border border-gray-100">
                           <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-700">钉钉 (DingTalk)</span>
                              <input type="checkbox" checked={notifyConfig.robots.dingtalk.enabled} onChange={e => setNotifyConfig({...notifyConfig, robots: {...notifyConfig.robots, dingtalk: {...notifyConfig.robots.dingtalk, enabled: e.target.checked}}})} className="accent-blue-600"/>
                           </div>
                           <input placeholder="Webhook URL" className="w-full border rounded px-3 py-2 text-sm" value={notifyConfig.robots.dingtalk.webhook} onChange={e => setNotifyConfig({...notifyConfig, robots: {...notifyConfig.robots, dingtalk: {...notifyConfig.robots.dingtalk, webhook: e.target.value}}})} disabled={!notifyConfig.robots.dingtalk.enabled} />
                        </div>
                     </div>
                     
                     <div className="mt-6 flex justify-end">
                        <button onClick={() => handleSave('slss_notification_config', notifyConfig, '通知配置已保存')} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">保存全部配置</button>
                     </div>
                  </div>
               </div>
            )}
          </div>
        </div>
      </div>

      {showAddUserModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
               <h3 className="text-lg font-bold mb-4">新增用户 & 权限配置</h3>
               <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                     <input className="w-full border rounded px-3 py-2" value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                     <input className="w-full border rounded px-3 py-2" type="password" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                     <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                     <select className="w-full border rounded px-3 py-2" value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value as UserRole})}>
                        {Object.values(UserRole).map(r => <option key={r} value={r}>{ROLE_LABELS[r]} ({r})</option>)}
                     </select>
                  </div>
               </div>
               
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">细分权限 (Permissions)</label>
                  <div className="grid grid-cols-2 gap-2 text-sm border p-3 rounded max-h-40 overflow-y-auto">
                     {Object.keys(PERMISSION_LABELS).map((perm) => (
                        <label key={perm} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded">
                           <input 
                              type="checkbox" 
                              checked={newUserForm.permissions.includes(perm as Permission)}
                              onChange={() => toggleNewUserPermission(perm as Permission)}
                              className="rounded text-blue-600 focus:ring-blue-500"
                           />
                           <span>{PERMISSION_LABELS[perm as Permission]}</span>
                        </label>
                     ))}
                  </div>
               </div>

               <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
                  <button onClick={() => setShowAddUserModal(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">取消</button>
                  <button onClick={handleAddUser} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">创建并授权</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default AdminPanel;