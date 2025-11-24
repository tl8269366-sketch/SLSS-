import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { UserRole, User, Permission, DatabaseConfig, RedisConfig, SystemStatus, AIConfig, NotificationConfig, SystemSettings } from '../types';
import { testAIConnection } from '../services/geminiService';
import { getNotificationConfig, saveNotificationConfig } from '../services/notificationService';
import { useTheme, THEMES, ThemeColor } from '../components/ThemeContext';
import { 
  Shield, UserCheck, Settings, Save, Key, Globe, Cpu, AlertCircle, CheckCircle, 
  Database, Activity, Server, HardDrive, Zap, RefreshCw, Lock, Radio, Network,
  Palette, UserPlus, Trash2, Check, X, Bell, Mail, MessageSquare, List
} from 'lucide-react';
import { ROLE_LABELS, PERMISSION_LABELS } from '../constants';

// --- Sub-components for better organization ---

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

// SMTP Presets
const SMTP_PRESETS = [
  { name: '腾讯企业邮', host: 'smtp.exmail.qq.com', port: 465, secure: true },
  { name: 'QQ 邮箱', host: 'smtp.qq.com', port: 465, secure: true },
  { name: '网易 163', host: 'smtp.163.com', port: 465, secure: true },
  { name: 'Gmail', host: 'smtp.gmail.com', port: 465, secure: true },
];

// Provider Presets with Correct Endpoints
const PROVIDER_PRESETS: Record<string, { label: string, baseUrl: string, models: string[], icon: any, desc: string }> = {
  'google': { 
    label: 'Google Gemini', 
    baseUrl: '', 
    models: ['gemini-2.5-flash', 'gemini-pro', 'gemini-1.5-pro'],
    icon: Zap,
    desc: '官方直连。如需代理，请在 Base URL 填入 OpenAI 格式的代理地址。'
  },
  'openai': { 
    label: 'OpenAI', 
    baseUrl: 'https://api.openai.com/v1', 
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    icon: Globe,
    desc: 'OpenAI 官方接口。支持 OneAPI/NewAPI 等中转服务。'
  },
  'deepseek': { 
    label: 'DeepSeek (深度求索)', 
    baseUrl: 'https://api.deepseek.com', 
    models: ['deepseek-chat', 'deepseek-coder'],
    icon: Cpu,
    desc: '国内直连。BaseURL: https://api.deepseek.com'
  },
  'zhipu': { 
    label: 'Zhipu AI (智谱GLM)', 
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4', 
    models: ['glm-4', 'glm-4-air', 'glm-3-turbo'],
    icon: Activity,
    desc: '国内直连。BaseURL: https://open.bigmodel.cn/api/paas/v4'
  },
  'modelscope': { 
    label: 'ModelScope (阿里百炼)', 
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', 
    models: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
    icon: Server,
    desc: '阿里云通义千问兼容接口。'
  },
  'custom': { 
    label: 'Custom / Other', 
    baseUrl: '', 
    models: [],
    icon: Settings,
    desc: '连接任意支持 OpenAI 协议的私有模型 (如 LocalAI, Ollama)。'
  }
};

const AdminPanel: React.FC = () => {
  // -- Navigation State --
  const [activeTab, setActiveTab] = useState<'status' | 'database' | 'ai' | 'notification' | 'users' | 'general'>('status');
  const { theme, setTheme, themeConfig } = useTheme();
  const { usersList, updateUserStatus, deleteUser, addUser } = useAuth(); 

  // -- Config States --
  
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    databaseName: 'slss_prod',
    ssl: false
  });

  const [redisConfig, setRedisConfig] = useState<RedisConfig>({
    enabled: true,
    host: 'localhost',
    port: 6379,
    dbIndex: 0
  });

  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'google',
    model: 'gemini-2.5-flash',
    baseUrl: '',
    apiKey: ''
  });

  const [notifyConfig, setNotifyConfig] = useState<NotificationConfig>(getNotificationConfig());

  const [sysSettings, setSysSettings] = useState<SystemSettings>({
    appName: 'SLSS',
    maintenanceMode: false,
    logRetentionDays: 30,
    defaultAssigneeId: undefined
  });

  // -- System Status Mock State --
  const [sysStatus, setSysStatus] = useState<SystemStatus>({
    cpuUsage: 12,
    memoryUsage: 34,
    uptime: 124500,
    dbStatus: 'connected',
    dbLatency: 5,
    redisStatus: 'connected',
    activeConnections: 18
  });

  // -- Add User Modal State --
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', role: UserRole.TECHNICIAN });

  // -- Feedback State --
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);

  // -- Effects --

  // Load configs
  useEffect(() => {
    const loadConfig = (key: string, setter: any) => {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setter(JSON.parse(saved));
        } catch(e) { console.error(`Error loading ${key}`, e); }
      }
    };
    loadConfig('slss_ai_config', setAiConfig);
    loadConfig('slss_db_config', setDbConfig);
    loadConfig('slss_redis_config', setRedisConfig);
    loadConfig('slss_system_settings', setSysSettings);
    // Notification config loaded via getNotificationConfig initial state
  }, []);

  // Simulate Live System Status Updates
  useEffect(() => {
    if (activeTab === 'status') {
      const interval = setInterval(() => {
        setSysStatus(prev => ({
          ...prev,
          cpuUsage: Math.min(100, Math.max(5, prev.cpuUsage + (Math.random() - 0.5) * 10)),
          memoryUsage: Math.min(100, Math.max(20, prev.memoryUsage + (Math.random() - 0.5) * 5)),
          dbLatency: Math.max(1, Math.floor(prev.dbLatency + (Math.random() - 0.5) * 4)),
          uptime: prev.uptime + 3
        }));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // -- Handlers --

  const handleSave = (key: string, data: any, msg: string) => {
    try {
      if (key === 'slss_notification_config') {
         saveNotificationConfig(data);
      } else {
         localStorage.setItem(key, JSON.stringify(data));
      }
      setSaveStatus({ type: 'success', message: msg });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e: any) {
      setSaveStatus({ type: 'error', message: '保存失败: ' + e.message });
    }
  };

  const testConnection = (target: 'database' | 'redis') => {
    setIsTestLoading(true);
    // Simulate network delay for DB
    setTimeout(() => {
      setIsTestLoading(false);
      const success = Math.random() > 0.1; // 90% success rate
      if (success) {
        setSaveStatus({ type: 'success', message: `[${target}] 连接测试成功！延迟 12ms` });
      } else {
        setSaveStatus({ type: 'error', message: `[${target}] 连接失败：Connection timed out` });
      }
      setTimeout(() => setSaveStatus(null), 4000);
    }, 1500);
  };

  const handleTestAI = async () => {
    setIsTestLoading(true);
    try {
      const result = await testAIConnection(aiConfig);
      setSaveStatus({ type: 'success', message: `AI 连接成功: ${result}` });
    } catch (e: any) {
      setSaveStatus({ type: 'error', message: `AI 连接失败: ${e.message}` });
    } finally {
      setIsTestLoading(false);
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const handleProviderChange = (providerKey: string) => {
    const preset = PROVIDER_PRESETS[providerKey];
    setAiConfig(prev => ({
      ...prev,
      provider: providerKey as any,
      baseUrl: preset.baseUrl || '', // Auto-fill base URL
      model: preset.models[0] || ''
    }));
  };

  const applySmtpPreset = (preset: typeof SMTP_PRESETS[0]) => {
    setNotifyConfig(prev => ({
      ...prev,
      smtp: {
        ...prev.smtp,
        host: preset.host,
        port: preset.port,
        secure: preset.secure
      }
    }));
    setSaveStatus({ type: 'success', message: `已应用 ${preset.name} 预设` });
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleAddUser = () => {
    if (!newUserForm.username || !newUserForm.password) {
      alert("请填写完整信息");
      return;
    }
    addUser({
      username: newUserForm.username,
      password: newUserForm.password,
      role: newUserForm.role,
      status: 'active', // Admin added users are active by default
      permissions: [] // Default perms handled in AuthContext
    });
    setShowAddUserModal(false);
    setNewUserForm({ username: '', password: '', role: UserRole.TECHNICIAN });
    setSaveStatus({ type: 'success', message: '用户创建成功' });
    setTimeout(() => setSaveStatus(null), 3000);
  };

  // Split users for display
  const pendingUsers = usersList.filter(u => u.status === 'pending');
  const activeUsers = usersList.filter(u => u.status !== 'pending');

  // -- Renders --

  const SidebarItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors rounded-lg mb-1 ${
        activeTab === id 
          ? `${themeConfig.classes.bgLight} ${themeConfig.classes.text}` 
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-5 h-5 mr-3" />
      {label}
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[calc(100vh-100px)]">
      
      {/* Sidebar Settings Menu */}
      <div className="w-full md:w-64 flex-shrink-0">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase mb-4 px-4 tracking-wider">系统设置</h2>
          <nav>
            <SidebarItem id="status" icon={Activity} label="系统监控概览" />
            <SidebarItem id="general" icon={Settings} label="基础参数设置" />
            <SidebarItem id="database" icon={Database} label="数据库与缓存" />
            <SidebarItem id="ai" icon={Network} label="AI 智能网关" />
            <SidebarItem id="notification" icon={Bell} label="通知与集成" />
            <SidebarItem id="users" icon={UserCheck} label="用户权限管理" />
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        <div className="bg-white rounded-lg shadow border border-gray-200 min-h-full">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
             <h1 className="text-xl font-bold text-gray-800 flex items-center">
               {activeTab === 'status' && <><Activity className={`mr-2 ${themeConfig.classes.text}`} /> 系统运行状态</>}
               {activeTab === 'database' && <><Database className={`mr-2 ${themeConfig.classes.text}`} /> 数据源连接配置</>}
               {activeTab === 'ai' && <><Network className="mr-2 text-purple-600" /> AI 模型服务渠道</>}
               {activeTab === 'notification' && <><Bell className="mr-2 text-orange-600" /> 消息通知集成</>}
               {activeTab === 'users' && <><UserCheck className={`mr-2 ${themeConfig.classes.text}`} /> 人员授权与安全</>}
               {activeTab === 'general' && <><Settings className="mr-2 text-gray-600" /> 基础系统参数</>}
             </h1>
             
             {/* Global Status Message */}
             {saveStatus && (
                <div className={`px-4 py-2 rounded text-sm font-medium animate-in fade-in slide-in-from-top-2 flex items-center ${
                  saveStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {saveStatus.type === 'success' ? <CheckCircle className="w-4 h-4 mr-2"/> : <AlertCircle className="w-4 h-4 mr-2"/>}
                  {saveStatus.message}
                </div>
             )}
          </div>

          <div className="p-6">
            
            {/* --- TAB: SYSTEM STATUS --- */}
            {activeTab === 'status' && (
              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-500 uppercase font-bold">运行时间 (Uptime)</p>
                      <p className="text-2xl font-mono text-blue-900 mt-1">{(sysStatus.uptime / 3600).toFixed(1)} hrs</p>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                      <p className="text-xs text-indigo-500 uppercase font-bold">活跃连接数</p>
                      <p className="text-2xl font-mono text-indigo-900 mt-1">{sysStatus.activeConnections}</p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                      <p className="text-xs text-emerald-600 uppercase font-bold">数据库状态</p>
                      <div className="flex items-center mt-1">
                        <StatusIndicator status={sysStatus.dbStatus === 'connected' ? 'good' : 'error'} text={sysStatus.dbStatus === 'connected' ? 'Connected' : 'Error'} />
                        <span className="ml-2 text-xs text-gray-500">({sysStatus.dbLatency}ms)</span>
                      </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                      <p className="text-xs text-orange-600 uppercase font-bold">Redis 缓存</p>
                      <div className="mt-1">
                        <StatusIndicator 
                          status={redisConfig.enabled ? (sysStatus.redisStatus === 'connected' ? 'good' : 'error') : 'neutral'} 
                          text={redisConfig.enabled ? (sysStatus.redisStatus === 'connected' ? 'Connected' : 'Offline') : 'Disabled'} 
                        />
                      </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="border border-gray-200 rounded-lg p-4">
                     <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center"><Server className="w-4 h-4 mr-2"/> CPU 负载</h3>
                     <div className="relative pt-1">
                       <div className="flex mb-2 items-center justify-between">
                         <div><span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">Load</span></div>
                         <div className="text-right"><span className="text-xs font-semibold inline-block text-blue-600">{sysStatus.cpuUsage.toFixed(1)}%</span></div>
                       </div>
                       <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-100">
                         <div style={{ width: `${sysStatus.cpuUsage}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"></div>
                       </div>
                     </div>
                   </div>

                   <div className="border border-gray-200 rounded-lg p-4">
                     <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center"><HardDrive className="w-4 h-4 mr-2"/> 内存使用率</h3>
                     <div className="relative pt-1">
                       <div className="flex mb-2 items-center justify-between">
                         <div><span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-purple-600 bg-purple-200">RAM</span></div>
                         <div className="text-right"><span className="text-xs font-semibold inline-block text-purple-600">{sysStatus.memoryUsage.toFixed(1)}%</span></div>
                       </div>
                       <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-purple-100">
                         <div style={{ width: `${sysStatus.memoryUsage}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500 transition-all duration-500"></div>
                       </div>
                     </div>
                   </div>
                 </div>
              </div>
            )}

            {/* --- TAB: NOTIFICATION --- */}
            {activeTab === 'notification' && (
              <div className="space-y-6 animate-in fade-in">
                {/* SMTP Config */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                   <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <Mail className="w-5 h-5 mr-2 text-blue-600" /> 邮件通知服务 (SMTP/POP3)
                      </h3>
                      {/* Presets */}
                      <div className="flex space-x-2">
                        {SMTP_PRESETS.map(p => (
                          <button 
                            key={p.name}
                            onClick={() => applySmtpPreset(p)}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded border border-gray-300 transition-colors"
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                   </div>
                   
                   <div className="space-y-4">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={notifyConfig.smtp.enabled} onChange={e => setNotifyConfig({...notifyConfig, smtp: {...notifyConfig.smtp, enabled: e.target.checked}})} className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-gray-700">启用邮件发送</span>
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP 服务器 (Host)</label>
                            <input type="text" placeholder="smtp.exmail.qq.com" className="w-full border rounded p-2 text-sm" value={notifyConfig.smtp.host} onChange={e => setNotifyConfig({...notifyConfig, smtp: {...notifyConfig.smtp, host: e.target.value}})} />
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">端口 (Port)</label>
                            <input type="number" placeholder="465" className="w-full border rounded p-2 text-sm" value={notifyConfig.smtp.port} onChange={e => setNotifyConfig({...notifyConfig, smtp: {...notifyConfig.smtp, port: Number(e.target.value)}})} />
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">发送账号 (User/Email)</label>
                            <input type="text" placeholder="notify@company.com" className="w-full border rounded p-2 text-sm" value={notifyConfig.smtp.user} onChange={e => setNotifyConfig({...notifyConfig, smtp: {...notifyConfig.smtp, user: e.target.value}})} />
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">授权码/密码 (Password)</label>
                            <input type="password" className="w-full border rounded p-2 text-sm" value={notifyConfig.smtp.pass} onChange={e => setNotifyConfig({...notifyConfig, smtp: {...notifyConfig.smtp, pass: e.target.value}})} />
                         </div>
                      </div>
                   </div>
                </div>

                {/* Robot Config */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                   <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center border-b pb-2">
                     <MessageSquare className="w-5 h-5 mr-2 text-green-600" /> IM 机器人集成 (Webhooks)
                   </h3>
                   <div className="space-y-6">
                      {/* WeCom */}
                      <div className="flex flex-col space-y-2">
                         <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-700">企业微信 (WeCom)</span>
                            <label className="flex items-center space-x-2">
                               <input type="checkbox" checked={notifyConfig.robots.wecom.enabled} onChange={e => setNotifyConfig({...notifyConfig, robots: {...notifyConfig.robots, wecom: {...notifyConfig.robots.wecom, enabled: e.target.checked}}})} className="rounded text-green-600" />
                               <span className="text-xs text-gray-500">启用</span>
                            </label>
                         </div>
                         <input type="text" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." className="w-full border rounded p-2 text-sm" value={notifyConfig.robots.wecom.webhook} onChange={e => setNotifyConfig({...notifyConfig, robots: {...notifyConfig.robots, wecom: {...notifyConfig.robots.wecom, webhook: e.target.value}}})} />
                      </div>
                      
                      {/* DingTalk */}
                      <div className="flex flex-col space-y-2">
                         <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-700">钉钉 (DingTalk)</span>
                            <label className="flex items-center space-x-2">
                               <input type="checkbox" checked={notifyConfig.robots.dingtalk.enabled} onChange={e => setNotifyConfig({...notifyConfig, robots: {...notifyConfig.robots, dingtalk: {...notifyConfig.robots.dingtalk, enabled: e.target.checked}}})} className="rounded text-blue-500" />
                               <span className="text-xs text-gray-500">启用</span>
                            </label>
                         </div>
                         <input type="text" placeholder="https://oapi.dingtalk.com/robot/send?access_token=..." className="w-full border rounded p-2 text-sm" value={notifyConfig.robots.dingtalk.webhook} onChange={e => setNotifyConfig({...notifyConfig, robots: {...notifyConfig.robots, dingtalk: {...notifyConfig.robots.dingtalk, webhook: e.target.value}}})} />
                      </div>

                      {/* Feishu */}
                      <div className="flex flex-col space-y-2">
                         <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-700">飞书 (Feishu/Lark)</span>
                            <label className="flex items-center space-x-2">
                               <input type="checkbox" checked={notifyConfig.robots.feishu.enabled} onChange={e => setNotifyConfig({...notifyConfig, robots: {...notifyConfig.robots, feishu: {...notifyConfig.robots.feishu, enabled: e.target.checked}}})} className="rounded text-blue-400" />
                               <span className="text-xs text-gray-500">启用</span>
                            </label>
                         </div>
                         <input type="text" placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." className="w-full border rounded p-2 text-sm" value={notifyConfig.robots.feishu.webhook} onChange={e => setNotifyConfig({...notifyConfig, robots: {...notifyConfig.robots, feishu: {...notifyConfig.robots.feishu, webhook: e.target.value}}})} />
                      </div>
                   </div>
                </div>

                <div className="flex justify-end pt-4">
                   <button 
                     onClick={() => handleSave('slss_notification_config', notifyConfig, '通知配置已保存')}
                     className={`${themeConfig.classes.bg} text-white px-6 py-2 rounded shadow ${themeConfig.classes.bgHover} flex items-center`}
                   >
                     <Save className="w-4 h-4 mr-2" /> 保存通知配置
                   </button>
                </div>
              </div>
            )}

            {/* --- TAB: DATABASE --- */}
            {activeTab === 'database' && (
              <div className="space-y-8 animate-in fade-in">
                {/* Main DB Config */}
                <div>
                   <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                     <Database className="w-5 h-5 mr-2" /> 主数据库配置 (Primary Database)
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">数据库类型</label>
                        <select 
                          className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 ${themeConfig.classes.ring} sm:text-sm rounded-md border`}
                          value={dbConfig.type}
                          onChange={(e) => setDbConfig({...dbConfig, type: e.target.value as any})}
                        >
                          <option value="mysql">MySQL (Recommended)</option>
                          <option value="postgres">PostgreSQL</option>
                          <option value="oracle">Oracle Database</option>
                          <option value="sqlite">SQLite (Local File)</option>
                        </select>
                      </div>

                      {dbConfig.type === 'sqlite' ? (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">数据库文件路径</label>
                          <input 
                            type="text" 
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                            value={dbConfig.filePath}
                            placeholder="./data/slss.db"
                            onChange={(e) => setDbConfig({...dbConfig, filePath: e.target.value})}
                          />
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Host Address</label>
                            <input 
                              type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                              value={dbConfig.host}
                              onChange={(e) => setDbConfig({...dbConfig, host: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Port</label>
                            <input 
                              type="number" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                              value={dbConfig.port}
                              onChange={(e) => setDbConfig({...dbConfig, port: parseInt(e.target.value)})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Username</label>
                            <input 
                              type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                              value={dbConfig.username}
                              onChange={(e) => setDbConfig({...dbConfig, username: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input 
                              type="password" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                              value={dbConfig.password}
                              onChange={(e) => setDbConfig({...dbConfig, password: e.target.value})}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Database Name / SID</label>
                            <input 
                              type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                              value={dbConfig.databaseName}
                              onChange={(e) => setDbConfig({...dbConfig, databaseName: e.target.value})}
                            />
                          </div>
                        </>
                      )}
                   </div>
                   
                   <div className="mt-4 flex space-x-4">
                     <button 
                       onClick={() => handleSave('slss_db_config', dbConfig, '数据库配置已保存')}
                       className={`${themeConfig.classes.bg} text-white px-4 py-2 rounded shadow ${themeConfig.classes.bgHover} flex items-center`}
                     >
                       <Save className="w-4 h-4 mr-2" /> 保存配置
                     </button>
                     <button 
                        onClick={() => testConnection('database')}
                        disabled={isTestLoading}
                        className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-50 flex items-center disabled:opacity-50"
                     >
                       {isTestLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin"/> : <Activity className="w-4 h-4 mr-2" />} 
                       测试连接
                     </button>
                   </div>
                </div>
              </div>
            )}

            {/* --- TAB: AI CONFIG --- */}
            {activeTab === 'ai' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="max-w-3xl">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Network className="w-5 h-5 text-purple-600 mr-2" />
                    AI 渠道管理 (Channel Management)
                  </h3>
                  
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
                     {/* Provider Selection (Same as before) */}
                     <div>
                       <label className="block text-sm font-bold text-gray-700 mb-2">选择接入渠道 (Provider)</label>
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                         {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => {
                           const ProviderIcon = preset.icon;
                           const isSelected = aiConfig.provider === key;
                           return (
                             <div 
                               key={key}
                               onClick={() => handleProviderChange(key)}
                               className={`
                                 cursor-pointer flex flex-col items-center justify-center p-4 rounded-lg border text-center transition-all group relative
                                 ${isSelected ? 'bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'}
                               `}
                             >
                               <ProviderIcon className={`w-8 h-8 mb-2 ${isSelected ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                               <span className="text-sm font-bold">{preset.label}</span>
                             </div>
                           );
                         })}
                       </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                           <label className="block text-sm font-medium text-gray-700 mb-1">接口地址 (Base URL)</label>
                           <input
                             type="text"
                             className="block w-full rounded-md border-gray-300 border p-2 text-sm font-mono"
                             placeholder={aiConfig.provider === 'google' ? '默认空 (官方)' : 'https://api.openai.com/v1'}
                             value={aiConfig.baseUrl}
                             onChange={(e) => setAiConfig({...aiConfig, baseUrl: e.target.value})}
                           />
                         </div>
                         <div className="md:col-span-2">
                           <label className="block text-sm font-medium text-gray-700 mb-1">API 密钥 (Key)</label>
                           <input
                             type="password"
                             className="block w-full rounded-md border-gray-300 border p-2 text-sm font-mono"
                             value={aiConfig.apiKey}
                             onChange={(e) => setAiConfig({...aiConfig, apiKey: e.target.value})}
                           />
                         </div>
                         <div className="md:col-span-2">
                           <label className="block text-sm font-medium text-gray-700 mb-1">模型名称 (Model)</label>
                           <input 
                             type="text" 
                             className="block w-full rounded-md border-gray-300 border p-2 text-sm"
                             value={aiConfig.model}
                             onChange={(e) => setAiConfig({...aiConfig, model: e.target.value})}
                           />
                         </div>
                      </div>
                      <div className="pt-4 flex items-center justify-end border-t border-gray-100 space-x-3">
                        <button onClick={handleTestAI} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50">测试连接</button>
                        <button onClick={() => handleSave('slss_ai_config', aiConfig, '配置已保存')} className="bg-purple-600 text-white px-6 py-2 rounded text-sm hover:bg-purple-700">保存配置</button>
                      </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB: USERS --- */}
            {activeTab === 'users' && (
              <div className="animate-in fade-in space-y-8">
                
                {/* Pending Approval Section */}
                {pendingUsers.length > 0 && (
                   <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                      <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center">
                         <AlertCircle className="w-5 h-5 mr-2" /> 待审批用户 (Pending Registration)
                      </h3>
                      <div className="overflow-x-auto bg-white rounded-lg border border-orange-100">
                        <table className="min-w-full divide-y divide-gray-200">
                           <thead className="bg-orange-100/50">
                              <tr>
                                 <th className="px-6 py-3 text-left text-xs font-medium text-orange-900 uppercase">申请用户</th>
                                 <th className="px-6 py-3 text-left text-xs font-medium text-orange-900 uppercase">申请角色</th>
                                 <th className="px-6 py-3 text-left text-xs font-medium text-orange-900 uppercase">联系方式</th>
                                 <th className="px-6 py-3 text-right text-xs font-medium text-orange-900 uppercase">操作</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-200">
                              {pendingUsers.map(u => (
                                 <tr key={u.id}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{u.username}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{ROLE_LABELS[u.role]}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{u.phone || '-'}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                       <button 
                                          onClick={() => updateUserStatus(u.id, 'active')}
                                          className="text-green-600 hover:text-green-900 text-sm font-bold bg-green-50 px-3 py-1 rounded"
                                       >
                                          通过
                                       </button>
                                       <button 
                                          onClick={() => deleteUser(u.id)}
                                          className="text-red-600 hover:text-red-900 text-sm bg-red-50 px-3 py-1 rounded"
                                       >
                                          拒绝
                                       </button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                      </div>
                   </div>
                )}

                {/* Active Users Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">现有用户管理 (Active Users)</h3>
                    <button 
                       onClick={() => setShowAddUserModal(true)}
                       className={`flex items-center text-sm text-white ${themeConfig.classes.bg} ${themeConfig.classes.bgHover} px-4 py-2 rounded shadow-sm`}
                    >
                      <UserPlus className="w-4 h-4 mr-2"/> 新增用户
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                       <thead className="bg-gray-50">
                         <tr>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">用户</th>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
                           <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">状态</th>
                           <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                         </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-gray-200">
                         {activeUsers.map(u => (
                           <tr key={u.id} className="hover:bg-gray-50">
                             <td className="px-4 py-4 text-sm font-medium text-gray-900">
                               {u.username}
                             </td>
                             <td className="px-4 py-4 text-sm text-gray-500">
                               <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800`}>
                                 {ROLE_LABELS[u.role]}
                               </span>
                             </td>
                             <td className="px-4 py-4 text-center text-sm">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  正常
                                </span>
                             </td>
                             <td className="px-4 py-4 text-right text-sm">
                                {u.username !== 'stars' && (
                                   <button 
                                      onClick={() => deleteUser(u.id)}
                                      className="text-red-500 hover:text-red-700"
                                      title="删除用户"
                                   >
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

            {/* --- TAB: GENERAL --- */}
            {activeTab === 'general' && (
               <div className="space-y-6 animate-in fade-in">
                  
                  {/* Theme Selector */}
                  <div className="bg-white border border-gray-200 p-6 rounded-md shadow-sm">
                    <h4 className="text-sm font-bold text-gray-800 flex items-center mb-4">
                      <Palette className="w-4 h-4 mr-2"/> 系统主题外观 (Theme)
                    </h4>
                    <div className="flex gap-4">
                       {(Object.keys(THEMES) as ThemeColor[]).map((t) => (
                         <button
                           key={t}
                           onClick={() => setTheme(t)}
                           className={`flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-all ${theme === t ? `border-${THEMES[t].color}-500 bg-gray-50` : 'border-transparent hover:bg-gray-50'}`}
                         >
                            <div className={`w-8 h-8 rounded-full ${THEMES[t].classes.bg} shadow-sm ring-2 ring-white`}></div>
                            <span className={`text-xs font-medium ${theme === t ? 'text-gray-900' : 'text-gray-500'}`}>{THEMES[t].name}</span>
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 p-6 rounded-md shadow-sm">
                    <h4 className="text-sm font-bold text-gray-800 flex items-center mb-4">
                      <Settings className="w-4 h-4 mr-2"/> 业务流转设置
                    </h4>
                    
                    <div className="mb-4">
                       <label className="block text-sm font-medium text-gray-700 mb-1">工单默认处理人 (Default Assignee)</label>
                       <p className="text-xs text-gray-500 mb-2">新建工单将自动指派给该用户。若未设置，则需手动领取。</p>
                       <select 
                         className="w-full md:w-1/2 border border-gray-300 rounded-md p-2 text-sm"
                         value={sysSettings.defaultAssigneeId || ''}
                         onChange={e => setSysSettings({...sysSettings, defaultAssigneeId: e.target.value ? Number(e.target.value) : undefined})}
                       >
                         <option value="">-- 不指定 / 暂存池 --</option>
                         {activeUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.username} ({ROLE_LABELS[u.role]})</option>
                         ))}
                       </select>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                    <h4 className="text-sm font-bold text-yellow-800 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2"/> 维护模式
                    </h4>
                    <p className="text-xs text-yellow-700 mt-1">启用维护模式后，除管理员外，其他用户将无法登录系统。</p>
                    <div className="mt-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" checked={sysSettings.maintenanceMode} onChange={e => setSysSettings({...sysSettings, maintenanceMode: e.target.checked})} className="h-4 w-4 text-yellow-600 border-gray-300 rounded"/>
                        <span className="text-sm font-medium text-gray-700">启用系统维护模式</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <button 
                       onClick={() => handleSave('slss_system_settings', sysSettings, '基础设置已保存')}
                       className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900"
                    >
                       保存基础设置
                    </button>
                  </div>
               </div>
            )}

          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
               <h3 className="text-lg font-bold mb-4">新增用户</h3>
               <div className="space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-gray-700">用户名</label>
                     <input 
                        type="text" 
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        value={newUserForm.username}
                        onChange={e => setNewUserForm({...newUserForm, username: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700">密码</label>
                     <input 
                        type="text" 
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        value={newUserForm.password}
                        onChange={e => setNewUserForm({...newUserForm, password: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700">角色</label>
                     <select 
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        value={newUserForm.role}
                        onChange={e => setNewUserForm({...newUserForm, role: e.target.value as UserRole})}
                     >
                        <option value={UserRole.TECHNICIAN}>技术工程师</option>
                        <option value={UserRole.MANAGER}>服务经理</option>
                        <option value={UserRole.PRODUCTION}>生产专员</option>
                        <option value={UserRole.ADMIN}>管理员</option>
                     </select>
                  </div>
               </div>
               <div className="mt-6 flex justify-end space-x-3">
                  <button onClick={() => setShowAddUserModal(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">取消</button>
                  <button onClick={handleAddUser} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">创建</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default AdminPanel;