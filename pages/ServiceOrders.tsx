
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MOCK_ORDERS, MOCK_USERS, MOCK_ASSETS } from '../services/mockData';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';
import { sendNotification } from '../services/notificationService';
import { Plus, Search, X, User, Server, AlertCircle, Activity, LayoutGrid, List, Clock, MoreHorizontal, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { OrderStatus, RepairOrder, DiscoveryPhase, SystemSettings } from '../types';
import { useTheme } from '../components/ThemeContext';

const ServiceOrders: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { themeConfig } = useTheme();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  
  // Creation Form State
  const [formData, setFormData] = useState({
    machine_sn: '',
    customer_name: '',
    fault_description: '',
    discovery_phase: DiscoveryPhase.IN_USE
  });

  // Init search from URL
  useEffect(() => {
    const query = searchParams.get('search');
    if (query) {
      setSearchTerm(decodeURIComponent(query));
    }
  }, [searchParams]);

  const filteredOrders = orders.filter(o => {
    const term = searchTerm.toLowerCase();
    return o.order_number.toLowerCase().includes(term) ||
           o.machine_sn.toLowerCase().includes(term) ||
           o.fault_description.toLowerCase().includes(term) || // Also search fault description for component names
           (o.customer_name && o.customer_name.toLowerCase().includes(term));
  });

  const getAssigneeName = (id?: number) => {
    if (!id) return '未分配';
    return MOCK_USERS.find(u => u.id === id)?.username || '未知';
  };

  const handleCreateOrder = async () => {
    if (!formData.machine_sn || !formData.fault_description || !formData.customer_name) {
      alert("请填写所有必填项 (SN, 客户名称, 故障描述)");
      return;
    }

    // 1. Auto-Fetch Asset Data
    const asset = MOCK_ASSETS.find(a => a.machine_sn === formData.machine_sn);
    
    // 2. Determine Default Assignee
    let defaultAssigneeId: number | undefined = undefined;
    const sysSettingsStr = localStorage.getItem('slss_system_settings');
    if (sysSettingsStr) {
       const settings: SystemSettings = JSON.parse(sysSettingsStr);
       defaultAssigneeId = settings.defaultAssigneeId;
    }

    const orderId = Math.floor(Math.random() * 100000);
    const order: RepairOrder = {
      id: orderId,
      order_number: `RMA-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 1000)}`,
      
      machine_sn: formData.machine_sn,
      customer_name: formData.customer_name,
      fault_description: formData.fault_description,
      discovery_phase: formData.discovery_phase,
      
      // Auto-Filled
      shipment_model: asset ? asset.model : 'Unknown Model',
      shipment_date: asset ? asset.invoice_date : new Date().toISOString().split('T')[0],
      shipment_config_json: asset ? asset.factory_config_json : undefined,
      received_config_json: asset ? asset.factory_config_json : undefined, // Default sync to shipment

      status: OrderStatus.CHECKING, // Automatically start checking/diagnosis
      assigned_to: defaultAssigneeId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Update Mock Data
    MOCK_ORDERS.unshift(order);
    setOrders([order, ...orders]);
    
    // 3. Trigger Notification
    const targetUser = defaultAssigneeId ? MOCK_USERS.find(u => u.id === defaultAssigneeId) : undefined;
    await sendNotification('ORDER_CREATED', order, targetUser);

    // Close Modal & Redirect immediately
    setShowModal(false);
    setFormData({
      machine_sn: '',
      customer_name: '',
      fault_description: '',
      discovery_phase: DiscoveryPhase.IN_USE
    });
    
    navigate(`/orders/${orderId}`);
  };

  // --- Export Logic ---
  const handleExport = () => {
    if (!(window as any).XLSX) {
      alert("导出组件未加载，请刷新页面重试");
      return;
    }
    
    const exportData = filteredOrders.map((o, index) => {
      // Helper to safely get parts info
      const parts = o.parts_list || [];
      const badModels = parts.map(p => p.part_name).join(', ');
      const badSNs = parts.map(p => p.old_sn).join(', ');
      const newSNs = parts.map(p => p.new_sn).join(', ');

      return {
        '序号': index + 1,
        '日期': new Date(o.created_at).toLocaleDateString(),
        '客户': o.customer_name,
        '机型': o.shipment_model || '',
        'SN': o.machine_sn,
        '配置': o.shipment_config_json || '',
        '阵列卡': '', // Placeholder
        '面板': '',   // Placeholder
        '发现阶段': o.discovery_phase,
        '客诉故障': o.fault_description,
        '实际故障': o.actual_fault_description || '',
        '故障原因': '', // 可以从 report_data_json 提取，此处暂空
        '解决方案': '', // 同上
        '坏件型号': badModels,
        '坏件SN': badSNs,
        '备件SN': newSNs,
        '发出时间': o.status === OrderStatus.SHIPPED || o.status === OrderStatus.CLOSED ? new Date(o.updated_at).toLocaleDateString() : '',
        '单号': o.tracking_number || '', // 这里指物流单号
        '是否收到': '是',
        '备注': ''
      };
    });

    const ws = (window as any).XLSX.utils.json_to_sheet(exportData);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "ServiceOrders");
    (window as any).XLSX.writeFile(wb, `ServiceOrders_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- Import Logic ---
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Limit File Size to 1MB
    if (file.size > 1024 * 1024) {
      alert(`文件过大 (${(file.size / 1024 / 1024).toFixed(2)}MB)。请上传小于 1MB 的 Excel 文件。`);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            if (!(window as any).XLSX) {
                alert("Excel 解析库未加载，请刷新页面后重试。");
                return;
            }
            const data = evt.target?.result;
            const wb = (window as any).XLSX.read(data, { type: 'array' });
            
            if (!wb.SheetNames.length) {
                throw new Error("Excel 文件为空或无工作表");
            }

            const ws = wb.Sheets[wb.SheetNames[0]];
            const jsonData = (window as any).XLSX.utils.sheet_to_json(ws);

            if (!jsonData || jsonData.length === 0) {
                 throw new Error("未解析到数据，请检查 Excel 是否为空");
            }

            let importCount = 0;
            const newOrders: RepairOrder[] = jsonData.map((row: any) => {
                // Basic validation
                if (!row['SN'] && !row['客户']) return null;
                
                importCount++;
                return {
                    id: Math.floor(Math.random() * 10000000),
                    order_number: `RMA-IMP-${Math.floor(Math.random() * 10000)}`, // Generate new RMA
                    machine_sn: row['SN'] || 'Unknown-SN',
                    customer_name: row['客户'] || 'Unknown Customer',
                    fault_description: row['客诉故障'] || '批量导入工单',
                    discovery_phase: (Object.values(DiscoveryPhase).includes(row['发现阶段']) ? row['发现阶段'] : DiscoveryPhase.IN_USE) as DiscoveryPhase,
                    shipment_model: row['机型'],
                    shipment_config_json: row['配置'], // Assuming raw string or JSON
                    actual_fault_description: row['实际故障'],
                    status: OrderStatus.PENDING,
                    created_at: new Date().toISOString(), // Use current time or parse row['日期']
                    updated_at: new Date().toISOString(),
                    tracking_number: row['单号']
                };
            }).filter((o: any) => o !== null);
            
            if (newOrders.length > 0) {
              setOrders(prev => [...newOrders, ...prev]);
              MOCK_ORDERS.unshift(...newOrders); // Update mock data store
              alert(`成功导入 ${newOrders.length} 条工单`);
            } else {
              alert("未解析到有效数据，请检查 Excel 格式 (必须包含 'SN' 或 '客户' 列)");
            }
        } catch (err: any) {
            console.error(err);
            alert(`导入失败: ${err.message || "文件格式错误"}`);
        }
    };
    reader.onerror = () => {
        alert("文件读取失败");
    };
    reader.readAsArrayBuffer(file);
    // Reset input
    e.target.value = '';
  };

  // Kanban Definitions
  const KANBAN_COLS = [
    { id: 'pending', title: '待分配/未处理', statuses: [OrderStatus.PENDING], color: 'bg-gray-100 border-gray-200' },
    { id: 'assigned', title: '已分配/待修', statuses: [OrderStatus.ASSIGNED], color: 'bg-blue-50 border-blue-200' },
    { id: 'checking', title: '维修/诊断中', statuses: [OrderStatus.CHECKING], color: 'bg-yellow-50 border-yellow-200' },
    { id: 'qa', title: '老化/质检 (QA)', statuses: [OrderStatus.QA_AGING], color: 'bg-indigo-50 border-indigo-200' },
    { id: 'done', title: '已发货/完成', statuses: [OrderStatus.SHIPPED, OrderStatus.CLOSED], color: 'bg-green-50 border-green-200' },
  ];

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">售后服务工单</h1>
        
        <div className="flex items-center space-x-3">
          {/* Import/Export Actions */}
          <div className="flex items-center space-x-2 mr-2">
            <button 
              onClick={handleExport}
              className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center shadow-sm"
            >
              <Download className="w-4 h-4 mr-2" /> 导出 Excel
            </button>
            <label className="cursor-pointer px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center shadow-sm">
              <Upload className="w-4 h-4 mr-2" /> 导入 Excel
              <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleImport} />
            </label>
          </div>

          {/* View Toggle */}
          <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm">
             <button 
               onClick={() => setViewMode('list')}
               className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? `${themeConfig.classes.bgLight} ${themeConfig.classes.text} shadow-sm` : 'text-gray-400 hover:text-gray-600'}`}
               title="列表视图"
             >
               <List size={18} />
             </button>
             <button 
               onClick={() => setViewMode('kanban')}
               className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? `${themeConfig.classes.bgLight} ${themeConfig.classes.text} shadow-sm` : 'text-gray-400 hover:text-gray-600'}`}
               title="看板视图"
             >
               <LayoutGrid size={18} />
             </button>
          </div>

          <button 
            onClick={() => setShowModal(true)}
            className={`${themeConfig.classes.bg} ${themeConfig.classes.bgHover} text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium shadow-sm transition-colors`}
          >
            <Plus className="w-4 h-4 mr-2" />
            新建工单
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜索工单号、SN、客户名称、故障组件..."
              className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 ${themeConfig.classes.ring}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50/50 p-4">
          {viewMode === 'list' ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">工单号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">客户 / SN</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">当前处理人</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建日期</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${themeConfig.classes.text}`}>
                        <Link to={`/orders/${order.id}`}>{order.order_number}</Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-bold text-gray-800">{order.customer_name}</div>
                        <div className="text-xs text-gray-500 font-mono">{order.machine_sn}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                         <div className="flex items-center">
                            <User className="w-3 h-3 mr-1"/> {getAssigneeName(order.assigned_to)}
                         </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[order.status]}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link to={`/orders/${order.id}`} className={`${themeConfig.classes.text} hover:opacity-80 ${themeConfig.classes.bgLight} px-3 py-1 rounded`}>处理</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Kanban View
            <div className="flex h-full gap-4 overflow-x-auto pb-2">
              {KANBAN_COLS.map(col => {
                const colOrders = filteredOrders.filter(o => col.statuses.includes(o.status));
                return (
                  <div key={col.id} className="flex-shrink-0 w-80 flex flex-col h-full bg-gray-100/50 rounded-xl border border-gray-200/60">
                     <div className={`p-3 rounded-t-xl border-b flex justify-between items-center ${col.color}`}>
                        <h3 className="font-bold text-gray-700 text-sm">{col.title}</h3>
                        <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 shadow-sm">{colOrders.length}</span>
                     </div>
                     <div className="p-2 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        {colOrders.map(order => (
                          <div key={order.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group relative"
                               onClick={() => navigate(`/orders/${order.id}`)}>
                             <div className="flex justify-between items-start mb-2">
                                <span className={`text-xs font-mono font-bold ${themeConfig.classes.text} ${themeConfig.classes.bgLight} px-1.5 py-0.5 rounded border ${themeConfig.classes.border}`}>{order.order_number}</span>
                                <span className={`w-2 h-2 rounded-full ${col.id === 'done' ? 'bg-green-500' : col.id === 'qa' ? 'bg-indigo-500' : 'bg-yellow-500'}`}></span>
                             </div>
                             <h4 className="text-sm font-bold text-gray-800 mb-1 line-clamp-1">{order.customer_name}</h4>
                             <div className="text-xs text-gray-500 font-mono mb-2 flex items-center">
                                <Server className="w-3 h-3 mr-1"/> {order.machine_sn}
                             </div>
                             <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 line-clamp-2 mb-2">
                                {order.fault_description}
                             </p>
                             <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                <div className="flex items-center text-[10px] text-gray-400">
                                   <Clock className="w-3 h-3 mr-1" />
                                   {new Date(order.created_at).toLocaleDateString()}
                                </div>
                                <div className="flex items-center text-[10px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                                   <User className="w-3 h-3 mr-1"/>
                                   {getAssigneeName(order.assigned_to)}
                                </div>
                             </div>
                          </div>
                        ))}
                        {colOrders.length === 0 && (
                          <div className="text-center py-10 text-gray-400 text-xs italic border-2 border-dashed border-gray-200 rounded-lg">
                            暂无工单
                          </div>
                        )}
                     </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Order Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
            <div className={`px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r ${themeConfig.classes.bgLight} to-white`}>
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Plus className={`w-5 h-5 mr-2 ${themeConfig.classes.text}`}/> 新建客诉工单
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Server className="w-4 h-4 mr-1" /> 机器序列号 (SN) <span className="text-red-500">*</span>
                </label>
                <input 
                  className={`block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 ${themeConfig.classes.ring} sm:text-sm`}
                  value={formData.machine_sn}
                  onChange={e => setFormData({...formData, machine_sn: e.target.value})}
                  placeholder="扫描或输入 SN (例如: HM217S007647)"
                />
                <p className="mt-1 text-xs text-gray-500">系统将自动匹配发货配置与机型。</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                   <User className="w-4 h-4 mr-1" /> 客户名称 <span className="text-red-500">*</span>
                </label>
                <input 
                  className={`block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 ${themeConfig.classes.ring} sm:text-sm`}
                  value={formData.customer_name}
                  onChange={e => setFormData({...formData, customer_name: e.target.value})}
                  placeholder="请输入客户公司或个人名称"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">发现阶段</label>
                    <select 
                      className={`block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 ${themeConfig.classes.ring} sm:text-sm`}
                      value={formData.discovery_phase}
                      onChange={e => setFormData({...formData, discovery_phase: e.target.value as DiscoveryPhase})}
                    >
                      {Object.values(DiscoveryPhase).map(phase => (
                        <option key={phase} value={phase}>{phase}</option>
                      ))}
                    </select>
                 </div>
                 {/* Date is auto-generated */}
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-gray-400">创建日期 (自动)</label>
                    <input disabled className="block w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 text-gray-500 sm:text-sm" value={new Date().toLocaleDateString()} />
                 </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1"/> 故障描述 (Fault) <span className="text-red-500">*</span>
                </label>
                <textarea 
                  rows={4}
                  className={`block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 ${themeConfig.classes.ring} sm:text-sm`}
                  value={formData.fault_description}
                  onChange={e => setFormData({...formData, fault_description: e.target.value})}
                  placeholder="请详细描述故障现象，供 AI 分析..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50">
              <button 
                onClick={() => setShowModal(false)} 
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none"
              >
                取消
              </button>
              <button 
                onClick={handleCreateOrder} 
                className={`px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${themeConfig.classes.bg} ${themeConfig.classes.bgHover} focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center`}
              >
                <Activity className="w-4 h-4 mr-2" />
                创建并开始诊断
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
