

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MOCK_USERS } from '../services/mockData';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';
import { sendNotification } from '../services/notificationService';
import { Plus, Search, X, User, Server, AlertCircle, Activity, LayoutGrid, List, Clock, Download, Upload, GitMerge, Loader2 } from 'lucide-react';
import { OrderStatus, RepairOrder, DiscoveryPhase, SystemSettings, ProcessTemplate } from '../types';
import { useTheme } from '../components/ThemeContext';
import { SmartFormRenderer } from '../components/SmartFormRenderer';
import { useAuth } from '../components/AuthContext';

const ServiceOrders: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { themeConfig } = useTheme();
  const { usersList } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [loading, setLoading] = useState(true);
  const [searchingSn, setSearchingSn] = useState(false); // For SN Lookup
  
  const [formData, setFormData] = useState({
    machine_sn: '',
    customer_name: '',
    fault_description: '',
    discovery_phase: DiscoveryPhase.IN_USE
  });

  const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [dynamicFormData, setDynamicFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 1. Load Orders & Templates on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ordersRes, templatesRes] = await Promise.all([
          fetch('/api/orders'),
          fetch('/api/templates')
        ]);
        
        if (ordersRes.ok) setOrders(await ordersRes.json());
        if (templatesRes.ok) setTemplates(await templatesRes.json());
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const query = searchParams.get('search');
    if (query) setSearchTerm(decodeURIComponent(query));
  }, [searchParams]);

  const filteredOrders = orders.filter(o => {
    const term = searchTerm.toLowerCase();
    return o.order_number.toLowerCase().includes(term) ||
           o.machine_sn.toLowerCase().includes(term) ||
           o.fault_description.toLowerCase().includes(term) ||
           (o.customer_name && o.customer_name.toLowerCase().includes(term));
  });

  // Use usersList from AuthContext (Server-based)
  const getAssigneeName = (id?: number) => usersList.find(u => u.id === id)?.username || '未分配';
  const getStatusColor = (status: string) => STATUS_COLORS[status as OrderStatus] || 'bg-purple-100 text-purple-800';

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.machine_sn) errors['machine_sn'] = '请输入机器序列号';
    if (!formData.customer_name) errors['customer_name'] = '请输入客户名称';

    if (selectedTemplateId) {
       const tpl = templates.find(t => t.id === selectedTemplateId);
       if (tpl) {
          tpl.formSchema.forEach(field => {
             if (field.required && !dynamicFormData[field.label]) {
                errors[field.label] = '此项必填';
             }
          });
       }
    } else {
       if (!formData.fault_description) errors['fault_description'] = '请填写故障描述';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const lookupAsset = async () => {
    if (!formData.machine_sn) return;
    setSearchingSn(true);
    try {
       const res = await fetch(`/api/asset/${formData.machine_sn}`);
       if (res.ok) {
           const data = await res.json();
           if (data.customer_name) {
               setFormData(prev => ({...prev, customer_name: data.customer_name}));
           }
       }
    } catch (e) {
       console.error(e);
    } finally {
       setSearchingSn(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!validateForm()) return;

    // Optional: Fetch asset info from server if needed, here we simplify
    let defaultAssigneeId: number | undefined = undefined;
    const sysSettingsStr = localStorage.getItem('slss_system_settings');
    if (sysSettingsStr) {
       const settings: SystemSettings = JSON.parse(sysSettingsStr);
       defaultAssigneeId = settings.defaultAssigneeId;
    }

    const orderId = Date.now();
    const template = templates.find(t => t.id === selectedTemplateId);
    const initialNode = template?.workflow.find(n => n.type === 'start');
    const initialStatus = initialNode ? initialNode.name : OrderStatus.CHECKING;
    const initialNodeId = initialNode?.id;

    const newOrder: RepairOrder = {
      id: orderId,
      order_number: `RMA-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 1000)}`,
      machine_sn: formData.machine_sn,
      customer_name: formData.customer_name,
      fault_description: selectedTemplateId ? (template?.name + ' - 自定义流程工单') : formData.fault_description,
      discovery_phase: formData.discovery_phase,
      shipment_model: 'Unknown Model', // Ideally fetched from Asset DB
      status: initialStatus,
      assigned_to: defaultAssigneeId,
      template_id: selectedTemplateId || undefined,
      current_node_id: initialNodeId,
      dynamic_data: dynamicFormData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      
      if (res.ok) {
        setOrders([newOrder, ...orders]);
        const targetUser = defaultAssigneeId ? usersList.find(u => u.id === defaultAssigneeId) : undefined;
        await sendNotification('ORDER_CREATED', newOrder, targetUser);

        setShowModal(false);
        setFormData({ machine_sn: '', customer_name: '', fault_description: '', discovery_phase: DiscoveryPhase.IN_USE });
        setDynamicFormData({});
        setSelectedTemplateId('');
        navigate(`/orders/${orderId}`);
      }
    } catch (e) {
      alert("创建工单失败");
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">售后服务工单</h1>
        <div className="flex items-center space-x-3">
          <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm">
             <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? `${themeConfig.classes.bgLight} ${themeConfig.classes.text} shadow-sm` : 'text-gray-400 hover:text-gray-600'}`} title="列表视图"><List size={18} /></button>
             <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? `${themeConfig.classes.bgLight} ${themeConfig.classes.text} shadow-sm` : 'text-gray-400 hover:text-gray-600'}`} title="看板视图"><LayoutGrid size={18} /></button>
          </div>
          <button onClick={() => setShowModal(true)} className={`${themeConfig.classes.bg} ${themeConfig.classes.bgHover} text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium shadow-sm transition-colors`}><Plus className="w-4 h-4 mr-2" /> 新建工单</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="搜索工单号、SN、客户名称..." className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 ${themeConfig.classes.ring}`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50/50 p-4">
          {loading ? <div className="text-center py-10">加载中...</div> : viewMode === 'list' ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">工单号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户 / SN</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">当前处理人</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建日期</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${themeConfig.classes.text}`}>
                        <Link to={`/orders/${order.id}`}>{order.order_number}</Link>
                        {order.template_id && <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 flex items-center w-fit mt-1"><GitMerge size={10} className="mr-1"/> 自建流程</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-bold text-gray-800">{order.customer_name}</div>
                        <div className="text-xs text-gray-500 font-mono">{order.machine_sn}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                         <div className="flex items-center"><User className="w-3 h-3 mr-1"/> {getAssigneeName(order.assigned_to)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {STATUS_LABELS[order.status as OrderStatus] || order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link to={`/orders/${order.id}`} className={`${themeConfig.classes.text} hover:opacity-80 ${themeConfig.classes.bgLight} px-3 py-1 rounded`}>处理</Link>
                      </td>
                    </tr>
                  )) : <tr><td colSpan={6} className="text-center py-8 text-gray-400">暂无工单</td></tr>}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">看板视图暂不支持自定义流程展示，请切换至列表视图。</div>
          )}
        </div>
      </div>

      {/* Create Order Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all max-h-[90vh] overflow-y-auto">
            <div className={`px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r ${themeConfig.classes.bgLight} to-white`}>
              <h3 className="text-lg font-bold text-gray-800 flex items-center"><Plus className={`w-5 h-5 mr-2 ${themeConfig.classes.text}`}/> 新建客诉工单</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><Server className="w-4 h-4 mr-1" /> 机器序列号 (SN) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input 
                        className={`block w-full border rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 ${themeConfig.classes.ring} sm:text-sm ${formErrors['machine_sn'] ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                        value={formData.machine_sn} 
                        onChange={e => setFormData({...formData, machine_sn: e.target.value})} 
                        onBlur={lookupAsset}
                        onKeyDown={e => e.key === 'Enter' && lookupAsset()}
                        placeholder="扫描或输入 SN" 
                    />
                    {searchingSn && <Loader2 className="w-4 h-4 text-gray-400 absolute right-3 top-3 animate-spin"/>}
                  </div>
                  {formErrors['machine_sn'] && <p className="text-xs text-red-500 mt-1">{formErrors['machine_sn']}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><User className="w-4 h-4 mr-1" /> 客户名称 <span className="text-red-500">*</span></label>
                  <input 
                    className={`block w-full border rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 ${themeConfig.classes.ring} sm:text-sm ${formErrors['customer_name'] ? 'border-red-300 bg-red-50' : 'border-gray-300'}`} 
                    value={formData.customer_name} 
                    onChange={e => setFormData({...formData, customer_name: e.target.value})} 
                    placeholder="客户公司或个人名称" 
                  />
                  {formErrors['customer_name'] && <p className="text-xs text-red-500 mt-1">{formErrors['customer_name']}</p>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">工单类型 / 流程模板</label>
                <select className="block w-full border border-gray-300 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 text-sm" value={selectedTemplateId} onChange={e => { setSelectedTemplateId(e.target.value); setDynamicFormData({}); setFormErrors({}); }}>
                   <option value="">标准客诉工单 (默认流程)</option>
                   {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {selectedTemplateId ? (
                 <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center"><GitMerge className="w-3 h-3 mr-1"/> 业务表单信息</div>
                    <SmartFormRenderer 
                       schema={templates.find(t => t.id === selectedTemplateId)?.formSchema || []}
                       data={dynamicFormData}
                       errors={formErrors}
                       onChange={(k, v) => setDynamicFormData(prev => ({...prev, [k]: v}))}
                    />
                 </div>
              ) : (
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><AlertCircle className="w-4 h-4 mr-1"/> 故障描述 (Fault) <span className="text-red-500">*</span></label>
                   <textarea 
                     rows={4} 
                     className={`block w-full border rounded-lg shadow-sm py-2 px-3 sm:text-sm ${formErrors['fault_description'] ? 'border-red-300 bg-red-50' : 'border-gray-300'}`} 
                     value={formData.fault_description} 
                     onChange={e => setFormData({...formData, fault_description: e.target.value})} 
                     placeholder="请详细描述故障现象..." 
                   />
                   {formErrors['fault_description'] && <p className="text-xs text-red-500 mt-1">{formErrors['fault_description']}</p>}
                 </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none">取消</button>
              <button onClick={handleCreateOrder} className={`px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${themeConfig.classes.bg} ${themeConfig.classes.bgHover} focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center`}><Activity className="w-4 h-4 mr-2" /> 创建工单</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
