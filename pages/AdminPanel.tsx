
import React, { useState, useEffect } from 'react';
import { MOCK_USERS } from '../services/mockData';
import { UserRole, User, Permission, DatabaseConfig, RedisConfig, SystemStatus, AIConfig } from '../types';
import { testAIConnection } from '../services/geminiService';
import { useTheme, THEMES, ThemeColor } from '../components/ThemeContext';
import { 
  Shield, UserCheck, Settings, Save, Key, Globe, Cpu, AlertCircle, CheckCircle, 
  Database, Activity, Server, HardDrive, Zap, RefreshCw, Lock, Radio, Network,
  Palette
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
  const [activeTab, setActiveTab] = useState<'status' | 'database' | 'ai' | 'users' | 'general'>('status');
  const { theme, setTheme, themeConfig } = useTheme();

  // -- Config States --
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  
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
      localStorage.setItem(key, JSON.stringify(data));
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
      // Save config temporarily first so test uses current values if we reload logic
      // But here we pass config directly
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

  const togglePermission = (userId: number, perm: Permission) => {
    setUsers(users.map(u => {
      if (u.id !== userId) return u;
      const hasPerm = u.permissions.includes(perm);
      return {
        ...u,
        permissions: hasPerm 
          ? u.permissions.filter(p => p !== perm) 
          : [...u.permissions, perm]
      };
    }));
  };

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
            <SidebarItem id="database" icon={Database} label="数据库与缓存" />
            <SidebarItem id="ai" icon={Network} label="AI 智能网关" />
            <SidebarItem id="users" icon={UserCheck} label="用户权限管理" />
            <SidebarItem id="general" icon={Settings} label="基础参数设置" />
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
                     
                     {/* Provider Selection */}
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
                       <p className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                         <span className="font-bold">说明:</span> {PROVIDER_PRESETS[aiConfig.provider]?.desc}
                       </p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Base URL */}
                        <div className="md:col-span-2">
                           <label className="block text-sm font-medium text-gray-700 flex items-center mb-1">
                             <Globe className="w-4 h-4 mr-1 text-gray-400" /> 接口地址 (Base URL)
                           </label>
                           <input
                             type="text"
                             className="block w-full rounded-md border-gray-300 border p-2.5 shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                             placeholder={aiConfig.provider === 'google' ? '默认空 (官方)。如使用代理请输入...' : 'https://api.openai.com/v1'}
                             value={aiConfig.baseUrl}
                             onChange={(e) => setAiConfig({...aiConfig, baseUrl: e.target.value})}
                           />
                           <p className="mt-1 text-xs text-gray-500">
                             {aiConfig.provider === 'google' 
                               ? '留空则使用 Google 官方 SDK (需魔法)。若使用 NEW API 中转，请填入中转地址 (如 https://api.xyhelper.cn/v1)。' 
                               : '通常以 /v1 结尾。系统会自动处理 /chat/completions 后缀。'}
                           </p>
                         </div>

                         {/* API Key */}
                         <div className="md:col-span-2">
                           <label className="block text-sm font-medium text-gray-700 flex items-center mb-1">
                             <Key className="w-4 h-4 mr-1 text-gray-400" /> API 密钥 (Key)
                           </label>
                           <div className="relative">
                             <input
                               type="password"
                               className="block w-full rounded-md border-gray-300 border p-2.5 shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                               placeholder={aiConfig.provider === 'google' ? 'AIzaSy...' : 'sk-...'}
                               value={aiConfig.apiKey}
                               onChange={(e) => setAiConfig({...aiConfig, apiKey: e.target.value})}
                             />
                             <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                               <Lock className="h-4 w-4 text-gray-400" />
                             </div>
                           </div>
                         </div>

                         {/* Model Name */}
                         <div className="md:col-span-2">
                           <label className="block text-sm font-medium text-gray-700 flex items-center mb-1">
                             <Cpu className="w-4 h-4 mr-1 text-gray-400" /> 模型名称 (Model Name)
                           </label>
                           <input 
                             type="text" 
                             className="block w-full rounded-md border-gray-300 border p-2.5 shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm"
                             value={aiConfig.model}
                             onChange={(e) => setAiConfig({...aiConfig, model: e.target.value})}
                             placeholder="例如: gpt-4o, gemini-pro, deepseek-chat"
                           />
                         </div>
                      </div>
                      
                      <div className="pt-4 flex items-center justify-end border-t border-gray-100 space-x-3">
                        <button 
                          onClick={handleTestAI}
                          disabled={isTestLoading}
                          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-50 flex items-center disabled:opacity-50"
                        >
                          {isTestLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin"/> : <Network className="w-4 h-4 mr-2" />} 
                          测试连接
                        </button>
                        <button 
                          onClick={() => handleSave('slss_ai_config', aiConfig, 'AI 渠道配置已保存')}
                          className="bg-purple-600 text-white px-6 py-2 rounded shadow hover:bg-purple-700 flex items-center"
                        >
                          <Save className="w-4 h-4 mr-2" /> 保存配置
                        </button>
                      </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB: USERS --- */}
            {activeTab === 'users' && (
              <div className="animate-in fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">用户权限矩阵</h3>
                  <button className={`text-sm ${themeConfig.classes.text} hover:underline ${themeConfig.classes.bgLight} px-3 py-1 rounded`}>
                    + 新增用户 (模拟)
                  </button>
                </div>
                
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50">
                       <tr>
                         <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32 sticky left-0 bg-gray-50 z-10">用户</th>
                         {/* Render all permission headers */}
                         {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                           <th key={key} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap min-w-[100px]">{label}</th>
                         ))}
                         <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">状态</th>
                       </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                       {users.map(u => (
                         <tr key={u.id} className="hover:bg-gray-50">
                           <td className="px-4 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-white hover:bg-gray-50 z-10 border-r border-gray-100 shadow-sm">
                             {u.username}
                             <div className="text-xs text-gray-400 font-normal">{ROLE_LABELS[u.role]}</div>
                           </td>
                           
                           {/* Permission Checkboxes */}
                           {Object.keys(PERMISSION_LABELS).map((permKey) => (
                             <td key={permKey} className="px-2 py-4 text-center">
                               <input 
                                 type="checkbox"
                                 className={`h-4 w-4 ${themeConfig.classes.text} focus:ring-blue-500 border-gray-300 rounded cursor-pointer`}
                                 checked={u.permissions.includes(permKey as Permission)}
                                 onChange={() => togglePermission(u.id, permKey as Permission)}
                               />
                             </td>
                           ))}

                           <td className="px-4 py-4 text-center text-sm">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {u.status === 'active' ? '正常' : '禁用'}
                              </span>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                  </table>
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

                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                    <h4 className="text-sm font-bold text-yellow-800 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2"/> 维护模式
                    </h4>
                    <p className="text-xs text-yellow-700 mt-1">启用维护模式后，除管理员外，其他用户将无法登录系统。</p>
                    <div className="mt-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="h-4 w-4 text-yellow-600 border-gray-300 rounded"/>
                        <span className="text-sm font-medium text-gray-700">启用系统维护模式</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">系统名称</label>
                      <input type="text" defaultValue="SLSS - 服务器全生命周期服务系统" className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">日志保留天数</label>
                      <input type="number" defaultValue="90" className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm"/>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <button className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900">
                       保存基础设置
                    </button>
                  </div>
               </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
