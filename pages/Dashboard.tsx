
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useTheme } from '../components/ThemeContext';
import { MOCK_ORDERS, MOCK_LIFECYCLE } from '../services/mockData';
import { OrderStatus } from '../types';
import { analyzeFault } from '../services/geminiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Label 
} from 'recharts';
import { 
  AlertTriangle, Clock, Activity, TrendingUp, Users, Wrench, BrainCircuit, RefreshCw, ChevronRight, AlertOctagon, BarChart2
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { themeConfig } = useTheme();
  const navigate = useNavigate();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // --- 1. Basic Stats Calculation ---
  const stats = useMemo(() => {
    return {
      total: MOCK_ORDERS.length,
      pending: MOCK_ORDERS.filter(o => o.status === OrderStatus.PENDING).length,
      checking: MOCK_ORDERS.filter(o => o.status === OrderStatus.CHECKING).length,
      closed: MOCK_ORDERS.filter(o => o.status === OrderStatus.CLOSED).length,
    };
  }, []);

  // --- 2. Advanced Analytics Data ---

  // Chart 1: Customer Repair Distribution (Pie/Donut)
  const customerData = useMemo(() => {
    const counts: Record<string, number> = {};
    MOCK_ORDERS.forEach(order => {
      const name = order.customer_name || 'Unknown';
      // Simplify name for chart
      const shortName = name.split('有限公司')[0].split('科技')[0].substring(0, 8); 
      counts[shortName] = (counts[shortName] || 0) + 1;
    });
    
    // Sort by value
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, []);

  // Chart 2: Faulty Component Distribution (Based on Lifecycle 'REPAIR_SWAP' events)
  const componentData = useMemo(() => {
    const counts: Record<string, number> = {};
    MOCK_LIFECYCLE
      .filter(e => e.event_type === 'REPAIR_SWAP' && e.part_name)
      .forEach(e => {
        let part = e.part_name!;
        // Simple normalization if needed (e.g. remove English bracket)
        part = part.split('(')[0].trim(); 
        counts[part] = (counts[part] || 0) + 1;
      });

    // If strictly no data in mock, use order fault description to guess for demo purposes if list is empty
    if (Object.keys(counts).length === 0) {
       MOCK_ORDERS.forEach(o => {
          if (o.fault_description.includes('内存')) counts['内存'] = (counts['内存'] || 0) + 1;
          else if (o.fault_description.includes('硬盘') || o.fault_description.includes('HDD')) counts['硬盘'] = (counts['硬盘'] || 0) + 1;
          else if (o.fault_description.includes('电源') || o.fault_description.includes('PSU')) counts['电源'] = (counts['电源'] || 0) + 1;
          else if (o.fault_description.includes('主板')) counts['主板'] = (counts['主板'] || 0) + 1;
          else counts['其他'] = (counts['其他'] || 0) + 1;
       });
    }

    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, []);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];
  
  // Custom Click Handlers
  const handleComponentClick = (data: any) => {
    // Navigate to Orders filtered by component name
    navigate(`/orders?search=${encodeURIComponent(data.name)}`);
  };

  const handleCustomerClick = (data: any) => {
    // Navigate to Orders filtered by customer name
    navigate(`/orders?search=${encodeURIComponent(data.name)}`);
  };

  // --- 3. Intelligent Warning Logic ---

  // Warning A: Overdue Orders (> 30 Days)
  const overdueOrders = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return MOCK_ORDERS.filter(o => {
      const created = new Date(o.created_at);
      return o.status !== OrderStatus.CLOSED && o.status !== OrderStatus.SHIPPED && created < thirtyDaysAgo;
    });
  }, []);

  // Warning B: Recurring Failures (Same Machine, Same Component Replaced >= 2 times)
  const recurringFailures = useMemo(() => {
    const swaps: Record<string, Record<string, number>> = {}; // { MachineSN: { PartName: Count } }
    
    MOCK_LIFECYCLE
      .filter(e => e.event_type === 'REPAIR_SWAP')
      .forEach(e => {
        if (!swaps[e.machine_sn]) swaps[e.machine_sn] = {};
        const partKey = e.part_name || 'Unknown';
        swaps[e.machine_sn][partKey] = (swaps[e.machine_sn][partKey] || 0) + 1;
      });

    const alerts: { machine_sn: string, part: string, count: number }[] = [];
    Object.entries(swaps).forEach(([sn, parts]) => {
       Object.entries(parts).forEach(([part, count]) => {
          if (count >= 2) {
             alerts.push({ machine_sn: sn, part, count });
          }
       });
    });
    return alerts;
  }, []);

  // --- 4. AI Analysis Handler ---
  const runAIAnalysis = async () => {
    setAnalyzing(true);
    setAiAnalysis(null);
    
    const summary = {
      totalOrders: stats.total,
      topCustomers: customerData.map(c => `${c.name}(${c.value})`).join(', '),
      topFaults: componentData.map(c => `${c.name}(${c.value})`).join(', '),
      overdueCount: overdueOrders.length,
      recurringCount: recurringFailures.length,
      recurringDetails: recurringFailures.map(r => `${r.machine_sn}更换${r.part}${r.count}次`).join('; ')
    };

    const prompt = `
      请根据以下售后数据进行风险分析并给出管理建议(简短3点):
      - 年度总工单: ${summary.totalOrders}
      - 维修客户TOP: ${summary.topCustomers}
      - 故障组件分布: ${summary.topFaults}
      - 超30天滞留工单: ${summary.overdueCount} 单
      - 重复返修(同部件更换2次以上): ${summary.recurringCount} 例 (${summary.recurringDetails})
    `;

    try {
      const result = await analyzeFault(prompt, "System Dashboard Data");
      setAiAnalysis(result.recommendation || result.summary); 
    } catch (e: any) {
      setAiAnalysis(e.message || "AI 服务不可用，请在【系统管理】中配置 API Key。");
    } finally {
      setAnalyzing(false);
    }
  };

  // Helper for Empty Charts
  const EmptyChartState = ({ text }: { text: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
      <BarChart2 className="w-10 h-10 mb-2 opacity-20" />
      <span className="text-sm">{text}</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold text-gray-900">数据仪表盘 & 智能预警中心</h1>
         <div className="text-sm text-gray-500">
           数据统计截止: {new Date().toLocaleDateString()}
         </div>
      </div>
      
      {/* 1. KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
           <div className="flex justify-between items-start">
             <div>
               <p className="text-sm font-medium text-gray-500">全年维修总量</p>
               <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
             </div>
             <div className={`p-2 ${themeConfig.classes.bgLight} rounded-lg ${themeConfig.classes.text}`}><Activity size={20}/></div>
           </div>
           <div className="mt-4 flex items-center text-xs text-green-600">
             <TrendingUp size={12} className="mr-1" /> +12% 较去年同期
           </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
           <div className="flex justify-between items-start">
             <div>
               <p className="text-sm font-medium text-gray-500">进行中工单</p>
               <p className={`text-3xl font-bold ${themeConfig.classes.text} mt-1`}>{stats.checking}</p>
             </div>
             <div className={`p-2 ${themeConfig.classes.bgLight} rounded-lg ${themeConfig.classes.text}`}><Wrench size={20}/></div>
           </div>
           <p className="mt-4 text-xs text-gray-400">含检测/维修/老化中</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between relative overflow-hidden">
           <div className="flex justify-between items-start z-10">
             <div>
               <p className="text-sm font-medium text-gray-500">滞留超30天</p>
               <p className={`text-3xl font-bold mt-1 ${overdueOrders.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>{overdueOrders.length}</p>
             </div>
             <div className="p-2 bg-red-50 rounded-lg text-red-600"><Clock size={20}/></div>
           </div>
           {overdueOrders.length > 0 && <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500"></div>}
           <p className="mt-4 text-xs text-red-500 font-medium">需要立即关注</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between relative overflow-hidden">
           <div className="flex justify-between items-start z-10">
             <div>
               <p className="text-sm font-medium text-gray-500">重复返修预警</p>
               <p className={`text-3xl font-bold mt-1 ${recurringFailures.length > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{recurringFailures.length}</p>
             </div>
             <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><AlertOctagon size={20}/></div>
           </div>
           {recurringFailures.length > 0 && <div className="absolute bottom-0 left-0 w-full h-1 bg-orange-500"></div>}
           <p className="mt-4 text-xs text-orange-500 font-medium">同部件更换 ≥2 次</p>
        </div>
      </div>

      {/* 2. Charts Section (Updated: Donut Charts with Interaction) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart A: Fault Component Distribution (Donut) */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-96 flex flex-col">
           <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
             <Activity className="w-5 h-5 mr-2 text-gray-500"/> 全年故障件分布占比 (点击跳转)
           </h3>
           <div className="w-full h-full relative">
             {componentData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie 
                     data={componentData} 
                     cx="50%" 
                     cy="50%" 
                     innerRadius={80} 
                     outerRadius={100} 
                     paddingAngle={2} 
                     dataKey="value"
                     onClick={handleComponentClick}
                     cursor="pointer"
                   >
                     {componentData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                     ))}
                     <Label 
                       value={stats.total} 
                       position="center" 
                       className="text-4xl font-bold fill-gray-800"
                       dy={-10}
                     />
                     <Label 
                       value="总工单" 
                       position="center" 
                       className="text-sm fill-gray-500"
                       dy={15}
                     />
                   </Pie>
                   <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                   <Legend verticalAlign="bottom" height={36} iconType="circle" />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
               <EmptyChartState text="暂无故障分布数据" />
             )}
           </div>
        </div>

        {/* Chart B: Customer Distribution (Donut) - Replaces Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-96 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
             <Users className="w-5 h-5 mr-2 text-gray-500"/> 客户维修量占比 (点击跳转)
          </h3>
          <div className="w-full h-full">
            {customerData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                     data={customerData} 
                     cx="50%" 
                     cy="50%" 
                     innerRadius={60} 
                     outerRadius={80} 
                     paddingAngle={5} 
                     dataKey="value"
                     onClick={handleCustomerClick}
                     cursor="pointer"
                  >
                     {customerData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} strokeWidth={0} />
                     ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" layout="horizontal" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState text="暂无客户数据" />
            )}
          </div>
        </div>
      </div>

      {/* 3. Intelligent Warning Center */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
         <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
               <AlertTriangle className="w-5 h-5 mr-2 text-red-500" /> 智能预警中心
            </h3>
            <button 
              onClick={runAIAnalysis}
              disabled={analyzing}
              className={`flex items-center px-4 py-2 text-white text-sm rounded-lg transition shadow-sm disabled:opacity-70 ${themeConfig.classes.bg} ${themeConfig.classes.bgHover}`}
            >
               {analyzing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin"/> : <BrainCircuit className="w-4 h-4 mr-2"/>}
               AI 风险分析
            </button>
         </div>
         
         {/* AI Analysis Result */}
         {aiAnalysis && (
            <div className={`px-6 py-4 ${themeConfig.classes.bgLight} border-b ${themeConfig.classes.border} animate-in slide-in-from-top-2`}>
               <h4 className={`text-xs font-bold ${themeConfig.classes.text} uppercase mb-2 flex items-center`}>
                  <BrainCircuit className="w-3 h-3 mr-1"/> AI 分析报告
               </h4>
               <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{aiAnalysis}</p>
            </div>
         )}

         <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
            {/* Overdue List */}
            <div className="p-6">
               <h4 className="text-sm font-bold text-gray-700 uppercase mb-4 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-red-500"/> 严重滞留工单 (&gt;30天)
               </h4>
               {overdueOrders.length > 0 ? (
                  <ul className="space-y-3">
                     {overdueOrders.map(o => (
                        <li key={o.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100 hover:shadow-md transition">
                           <div>
                              <div className="text-sm font-bold text-gray-900">{o.order_number}</div>
                              <div className="text-xs text-red-600 mt-1">SN: {o.machine_sn} | {Math.floor((new Date().getTime() - new Date(o.created_at).getTime()) / (1000 * 3600 * 24))} 天未关闭</div>
                           </div>
                           <Link to={`/orders/${o.id}`} className="p-2 text-gray-400 hover:text-blue-600">
                              <ChevronRight size={18} />
                           </Link>
                        </li>
                     ))}
                  </ul>
               ) : (
                  <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                     暂无滞留工单
                  </div>
               )}
            </div>

            {/* Recurring Failure List */}
            <div className="p-6">
               <h4 className="text-sm font-bold text-gray-700 uppercase mb-4 flex items-center">
                  <AlertOctagon className="w-4 h-4 mr-2 text-orange-500"/> 重复故障预警 (同机同件 ≥2次)
               </h4>
               {recurringFailures.length > 0 ? (
                  <ul className="space-y-3">
                     {recurringFailures.map((item, idx) => (
                        <li key={idx} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100 hover:shadow-md transition">
                           <div>
                              <div className="text-sm font-bold text-gray-900">{item.machine_sn}</div>
                              <div className="text-xs text-orange-700 mt-1 font-medium">
                                 {item.part} 更换 <span className="text-lg font-bold">{item.count}</span> 次
                              </div>
                           </div>
                           <Link to={`/production/list`} className="px-3 py-1 bg-white border border-orange-200 text-orange-600 text-xs rounded hover:bg-orange-100">
                              溯源
                           </Link>
                        </li>
                     ))}
                  </ul>
               ) : (
                  <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                     暂无重复故障
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
