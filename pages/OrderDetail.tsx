import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { analyzeFault, AnalysisResult } from '../services/geminiService';
import { OrderStatus, RepairOrder, ProcessTemplate, UserRole } from '../types';
import { sendNotification } from '../services/notificationService';
import { SmartFormRenderer } from '../components/SmartFormRenderer'; 
import { 
  Cpu, Activity, Truck, Save, CheckCircle, 
  AlertTriangle, Microscope, Wrench, ClipboardCheck, 
  ChevronRight, RefreshCw, CircuitBoard, HardDrive, Zap, Server, 
  Eye, Code, ArrowLeft, BrainCircuit, PenLine, Plus, Trash2, Printer, FileText, X, FileCheck, Play, Download,
  CreditCard, Package, User as UserIcon, UserPlus, GitMerge, ListChecks, ShieldAlert, Split
} from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';
import { useAuth } from '../components/AuthContext';

// ... Components (ConfigViewer, ConfigEditor, RepairReportModal) are kept simple for brevity ...
const ConfigViewer: React.FC<{ jsonString?: string }> = ({ jsonString }) => {
  let data: any = {};
  if (!jsonString) return <div className="text-gray-400 text-xs italic p-4 text-center border border-dashed border-gray-200 rounded-lg">暂无配置数据</div>;
  try { data = JSON.parse(jsonString); } catch (e) { return <div className="text-red-500 text-xs">JSON Error</div>; }
  return <div className="p-4 text-sm bg-gray-50 rounded h-full overflow-y-auto"><pre className="whitespace-pre-wrap font-mono text-xs text-gray-600">{JSON.stringify(data, null, 2)}</pre></div>;
};

const ConfigEditor: React.FC<{ jsonString: string, onChange: (newJson: string) => void }> = ({ jsonString, onChange }) => {
  const [val, setVal] = useState(jsonString);
  return <textarea className="w-full h-full p-2 text-xs font-mono border rounded" value={val} onChange={e => { setVal(e.target.value); onChange(e.target.value); }} />;
};

const RepairReportModal: React.FC<{ order: RepairOrder; onClose: () => void; onSave: (reportData: any) => void; }> = ({ order, onClose, onSave }) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
       <div className="bg-white w-full max-w-lg rounded-lg shadow-xl p-6">
          <h3 className="text-lg font-bold mb-4">维修报告 (Mock)</h3>
          <p className="text-sm text-gray-500 mb-4">此处应为完整维修报告编辑器，当前仅演示保存功能。</p>
          <div className="flex justify-end gap-2">
             <button onClick={onClose} className="px-4 py-2 border rounded text-gray-600">关闭</button>
             <button onClick={() => onSave({ status: 'generated' })} className="px-4 py-2 bg-green-600 text-white rounded">保存并生成</button>
          </div>
       </div>
    </div>
  );
};

const OrderDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usersList, user } = useAuth();
  
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [template, setTemplate] = useState<ProcessTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isEditingReceived, setIsEditingReceived] = useState(false);
  const [receivedConfigText, setReceivedConfigText] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
          setReceivedConfigText(data.received_config_json || data.shipment_config_json || '{}');
          
          if (data.template_id) {
             const tRes = await fetch('/api/templates');
             if (tRes.ok) {
                const tData = await tRes.json();
                const t = tData.find((tpl: any) => tpl.id === data.template_id);
                if (t) setTemplate(t);
             }
          }
        }
      } catch (e) {
        console.error("Fetch error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const handleSaveOrder = async (updates?: Partial<RepairOrder>, notifyType?: 'ORDER_ASSIGNED' | 'ORDER_CLOSED') => {
    if (!order) return;
    const updatedOrder = { ...order, ...updates, received_config_json: receivedConfigText };
    
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrder)
      });

      if (res.ok) {
        const result = await res.json();
        setOrder(result);
        if (notifyType) {
           const targetUser = result.assigned_to ? usersList.find(u => u.id === result.assigned_to) : undefined;
           await sendNotification(notifyType, result, targetUser);
        }
        setSaveStatus('工单已保存');
        setTimeout(() => setSaveStatus(''), 3000);
        setIsEditingReceived(false);
        setIsReassigning(false);
      }
    } catch (e) {
      alert("保存失败");
    }
  };

  const handleWorkflowTransition = (nextNodeId: string, nextNodeName: string) => {
     handleSaveOrder({
        current_node_id: nextNodeId,
        status: nextNodeName
     });
  };

  const handleReassign = (userIdStr: string) => {
    const newAssigneeId = userIdStr ? Number(userIdStr) : undefined;
    handleSaveOrder({ assigned_to: newAssigneeId }, 'ORDER_ASSIGNED');
  };

  const renderActions = () => {
     if (!template) return <div className="text-sm text-gray-500">标准流程 (Standard Workflow)</div>;

     const currentNode = template.workflow.find(n => n.id === order?.current_node_id);
     if (!currentNode) return <div className="text-red-500 text-sm font-bold">流程节点错误 (Node Not Found)</div>;

     const hasPermission = currentNode.role === 'ALL' || user?.role === currentNode.role || user?.role === UserRole.ADMIN;
     if (!hasPermission) {
        return (
           <div className="flex items-center text-gray-500 text-sm bg-gray-100 px-3 py-2 rounded border border-gray-200">
              <ShieldAlert className="w-4 h-4 mr-2 text-orange-500"/>
              <span>需 <b>{currentNode.role}</b> 权限处理</span>
           </div>
        );
     }

     return (
        <div className="flex items-center gap-3">
           {currentNode.nextNodes.map(nextId => {
              const targetNode = template.workflow.find(n => n.id === nextId);
              if (!targetNode) return null;
              
              if (targetNode.type === 'exclusive') {
                 return (
                    <div key={nextId} className="flex items-center gap-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                        <div className="text-xs font-bold text-yellow-700 uppercase mr-2 flex items-center whitespace-nowrap">
                           <Split className="w-3 h-3 mr-1"/> {targetNode.name}
                        </div>
                        {targetNode.nextNodes.map(branchId => {
                            const branchNode = template.workflow.find(n => n.id === branchId);
                            if (!branchNode) return null;
                            return (
                                <button
                                    key={branchId}
                                    onClick={() => handleWorkflowTransition(branchNode.id, branchNode.name)}
                                    className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded shadow-sm hover:bg-blue-50 text-xs font-bold transition-all whitespace-nowrap"
                                >
                                    {branchNode.name}
                                </button>
                            );
                        })}
                    </div>
                 );
              }

              const isEnd = targetNode.type === 'end';
              const isReject = targetNode.id.includes('reject') || targetNode.name.includes('驳回');
              
              return (
                 <button
                    key={nextId}
                    onClick={() => handleWorkflowTransition(targetNode.id, targetNode.name)}
                    className={`flex items-center px-4 py-2 rounded shadow text-sm font-bold transition-all transform hover:-translate-y-0.5 whitespace-nowrap ${
                       isReject ? 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200' :
                       isEnd ? 'bg-green-600 text-white hover:bg-green-700' :
                       'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                 >
                    {isEnd ? <CheckCircle className="w-4 h-4 mr-2"/> : isReject ? <X className="w-4 h-4 mr-2"/> : <GitMerge className="w-4 h-4 mr-2"/>}
                    {targetNode.name}
                 </button>
              );
           })}
        </div>
     );
  };

  if (loading) return <div className="p-10 text-center text-gray-500">加载中...</div>;
  if (!order) return <div className="p-10 text-center text-red-500">工单不存在</div>;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center">
          <button onClick={() => navigate('/orders')} className="mr-4 text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
             <div className="flex items-center gap-2">
               <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
               <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[order.status as OrderStatus] || 'bg-purple-100 text-purple-800'}`}>
                 {STATUS_LABELS[order.status as OrderStatus] || order.status}
               </span>
               {template && <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 text-[10px] px-2 py-0.5 rounded flex items-center"><GitMerge className="w-3 h-3 mr-1"/> {template.name}</span>}
             </div>
             <p className="text-sm text-gray-500 mt-1">
               SN: <span className="font-mono text-gray-700 font-bold">{order.machine_sn}</span> | 客户: {order.customer_name}
             </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
           {saveStatus && <span className="text-green-600 text-sm font-bold animate-pulse">{saveStatus}</span>}
           <button onClick={() => handleSaveOrder()} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700">
             <Save className="w-4 h-4 mr-2" /> 保存
           </button>
        </div>
      </div>

      {/* Action Panel */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
         <div className="flex items-center gap-6">
            <div className="flex items-center">
              <Activity className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                 <h3 className="font-bold text-gray-800 text-sm">流程控制台</h3>
                 <p className="text-xs text-gray-500">当前节点: <span className="font-bold text-blue-700">{order.status}</span></p>
              </div>
            </div>
            
            {/* Reassign Logic */}
            <div className="border-l border-gray-300 pl-6 flex items-center">
               <UserIcon className="w-4 h-4 text-gray-500 mr-2" />
               <div className="text-sm flex items-center">
                 <span className="text-gray-500 mr-2">处理人:</span>
                 {isReassigning ? (
                   <select 
                     className="border border-blue-300 rounded px-2 py-1 text-sm bg-white"
                     value={order.assigned_to || ''}
                     onChange={(e) => handleReassign(e.target.value)}
                     autoFocus
                     onBlur={() => setIsReassigning(false)}
                   >
                     <option value="">-- 未分配 --</option>
                     {usersList.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                   </select>
                 ) : (
                   <button onClick={() => setIsReassigning(true)} className="font-bold text-gray-800 hover:text-blue-600 underline decoration-dashed underline-offset-4">
                     {order.assigned_to ? usersList.find(u => u.id === order.assigned_to)?.username || 'Unknown' : '未分配'}
                   </button>
                 )}
               </div>
            </div>
         </div>
         {renderActions()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Data (Dynamic Form) */}
        {order.dynamic_data && Object.keys(order.dynamic_data).length > 0 && (
           <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center"><ListChecks className="w-5 h-5 mr-2 text-indigo-600" /> 业务表单详情</h3>
              <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-100">
                 <SmartFormRenderer 
                    schema={template?.formSchema || []} 
                    data={order.dynamic_data} 
                    readOnly={true} 
                 />
              </div>
           </div>
        )}

        {/* Left Col: Configs */}
        <div className="space-y-4">
           <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[400px] overflow-hidden flex flex-col">
             <div className="p-3 border-b bg-gray-50 font-bold text-gray-700 text-sm">发货原始配置</div>
             <ConfigViewer jsonString={order.shipment_config_json} />
           </div>
        </div>

        {/* Right Col: Received Config */}
        <div className="space-y-4">
           <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[400px] overflow-hidden flex flex-col relative">
             <div className="p-3 border-b bg-gray-50 font-bold text-gray-700 text-sm flex justify-between">
                <span>接收实际配置</span>
                <button onClick={() => setIsEditingReceived(!isEditingReceived)} className="text-blue-600 text-xs">
                   {isEditingReceived ? '完成' : '编辑'}
                </button>
             </div>
             {isEditingReceived ? <ConfigEditor jsonString={receivedConfigText} onChange={(newJson) => setReceivedConfigText(newJson)} /> : <ConfigViewer jsonString={order.received_config_json || order.shipment_config_json} />}
           </div>
        </div>
      </div>
      
      {showReport && <RepairReportModal order={order} onClose={() => setShowReport(false)} onSave={(d) => { handleSaveOrder({ report_data_json: JSON.stringify(d) }); setShowReport(false); }} />}
    </div>
  );
};

export default OrderDetail;