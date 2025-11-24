
import React, { useState } from 'react';
import { Search, Activity, Box, FileText, Truck, CheckCircle, AlertTriangle, Download, ChevronRight, Server } from 'lucide-react';
import { MOCK_ORDERS, MOCK_LIFECYCLE, MOCK_TEST_REPORTS, MOCK_LOGISTICS } from '../services/mockData';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';

const Portal: React.FC = () => {
  const [sn, setSn] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'timeline' | 'tests' | 'logistics'>('timeline');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if(!sn.trim()) return;

    const order = MOCK_ORDERS.find(o => o.machine_sn.toLowerCase() === sn.toLowerCase());
    if (order) {
      const lifecycle = MOCK_LIFECYCLE.filter(l => l.machine_sn === sn);
      const tests = MOCK_TEST_REPORTS.filter(t => t.machine_sn === sn);
      const logistics = MOCK_LOGISTICS.filter(l => l.order_id === order.id);
      setResult({ order, lifecycle, tests, logistics });
      setError('');
    } else {
      setResult(null);
      setError('未找到该序列号的维修记录。请检查 SN 是否正确 (例如: SRV-2023-001)。');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Portal Header */}
      <div className="bg-slate-900 text-white py-16 px-4 text-center relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-center mb-4">
             <Server className="w-12 h-12 text-blue-500 mr-3" />
             <h1 className="text-4xl md:text-5xl font-bold tracking-tight">SLSS 服务中心</h1>
          </div>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            全生命周期透明化服务。输入设备序列号 (SN) 获取维修进度、压测报告及物流详情。
          </p>
          
          <form onSubmit={handleSearch} className="mt-10 max-w-lg mx-auto flex gap-2 shadow-2xl rounded-lg p-1 bg-white/10 backdrop-blur-sm border border-white/20">
            <input 
              type="text" 
              placeholder="请输入机器序列号 (SN)..." 
              className="flex-1 px-6 py-4 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none bg-white"
              value={sn}
              onChange={(e) => setSn(e.target.value)}
            />
            <button type="submit" className="bg-blue-600 px-8 py-4 rounded-md font-bold hover:bg-blue-500 transition flex items-center text-white">
              <Search className="w-5 h-5" />
            </button>
          </form>
          {error && <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded inline-block text-red-200 font-medium backdrop-blur">{error}</div>}
        </div>
        
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute right-0 top-0 bg-blue-500 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
           <div className="absolute left-0 bottom-0 bg-purple-500 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>
      </div>

      {/* Result Section */}
      {result && (
        <div className="max-w-5xl mx-auto w-full p-4 md:p-6 -mt-10 relative z-20 mb-12">
          
          {/* Main Status Card */}
          <div className="bg-white rounded-xl shadow-xl overflow-hidden mb-6 border border-slate-100">
            <div className="bg-gradient-to-r from-white to-blue-50 p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                   <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">当前状态</span>
                   <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{result.order.machine_sn}</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  {STATUS_LABELS[result.order.status]}
                  {result.order.status === 'CLOSED' && <CheckCircle className="text-green-500 w-6 h-6" />}
                </h2>
              </div>
              
              <div className="flex gap-3">
                <button className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                   <FileText className="w-4 h-4 mr-2 text-red-500" /> 下载维修报告 (PDF)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
               <div className="p-6">
                 <p className="text-xs text-gray-400 uppercase mb-1">RMA 单号</p>
                 <p className="font-semibold text-gray-800">{result.order.order_number}</p>
               </div>
               <div className="p-6">
                 <p className="text-xs text-gray-400 uppercase mb-1">服务类型</p>
                 <p className="font-semibold text-gray-800">保内维修</p>
               </div>
               <div className="p-6">
                 <p className="text-xs text-gray-400 uppercase mb-1">创建时间</p>
                 <p className="font-semibold text-gray-800">{new Date(result.order.created_at).toLocaleDateString()}</p>
               </div>
               <div className="p-6">
                 <p className="text-xs text-gray-400 uppercase mb-1">最近更新</p>
                 <p className="font-semibold text-gray-800">{new Date(result.order.updated_at).toLocaleDateString()}</p>
               </div>
            </div>
            
            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-200 bg-gray-50/50">
              <button 
                onClick={() => setActiveTab('timeline')}
                className={`px-6 py-3 text-sm font-medium flex items-center border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Activity className="w-4 h-4 mr-2" /> 服务时间轴
              </button>
              <button 
                onClick={() => setActiveTab('tests')}
                className={`px-6 py-3 text-sm font-medium flex items-center border-b-2 transition-colors ${activeTab === 'tests' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <AlertTriangle className="w-4 h-4 mr-2" /> 压测日志 (Log)
              </button>
              <button 
                onClick={() => setActiveTab('logistics')}
                className={`px-6 py-3 text-sm font-medium flex items-center border-b-2 transition-colors ${activeTab === 'logistics' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Truck className="w-4 h-4 mr-2" /> 物流追踪
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6 bg-gray-50/30 min-h-[300px]">
              
              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <div className="space-y-8 pl-2">
                  {result.lifecycle.length === 0 ? (
                     <p className="text-gray-400 italic text-center py-10">暂无历史记录</p>
                  ) : (
                    result.lifecycle.map((event: any, i: number) => (
                      <div key={i} className="relative pl-8 border-l-2 border-gray-200 last:border-0 pb-4">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-500"></div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                           <div>
                             <h4 className="text-sm font-bold text-gray-900">{event.event_type}</h4>
                             <p className="text-sm text-gray-600 mt-1">{event.details || '无详细说明'}</p>
                             {event.old_sn && (
                               <div className="mt-2 inline-flex items-center bg-white border px-2 py-1 rounded text-xs text-gray-600">
                                  <span>换件:</span>
                                  <span className="ml-2 line-through text-gray-400">{event.old_sn}</span> 
                                  <ChevronRight className="w-3 h-3 mx-1" /> 
                                  <span className="font-bold text-green-600">{event.new_sn}</span>
                               </div>
                             )}
                           </div>
                           <span className="text-xs text-gray-400 mt-2 sm:mt-0 bg-gray-100 px-2 py-1 rounded">
                             {new Date(event.timestamp).toLocaleString()}
                           </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tests Tab */}
              {activeTab === 'tests' && (
                <div className="space-y-4">
                  {result.tests.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded border border-dashed border-gray-200">
                      <Activity className="mx-auto h-10 w-10 text-gray-300" />
                      <p className="mt-2 text-gray-500 text-sm">暂无相关压测记录</p>
                    </div>
                  ) : (
                    result.tests.map((test: any) => (
                      <div key={test.id} className="bg-slate-900 rounded-lg overflow-hidden shadow-sm">
                        <div className="flex justify-between items-center px-4 py-2 bg-slate-800 border-b border-slate-700">
                           <div className="flex items-center">
                             <span className={`w-2 h-2 rounded-full mr-2 ${test.status === 'PASS' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                             <span className="text-slate-200 font-mono text-sm font-bold">{test.test_type}</span>
                           </div>
                           <span className="text-slate-400 text-xs">{new Date(test.timestamp).toLocaleString()}</span>
                        </div>
                        <pre className="p-4 text-xs text-green-400 font-mono overflow-x-auto">
                          {test.log_snippet}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Logistics Tab */}
              {activeTab === 'logistics' && (
                <div>
                  {result.logistics.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                       <Truck className="w-12 h-12 mb-2 opacity-20" />
                       <p>暂无物流信息</p>
                    </div>
                  ) : (
                    <div className="flow-root">
                      <ul role="list" className="-mb-8">
                        {result.logistics.map((log: any, logIdx: number) => (
                          <li key={log.id}>
                            <div className="relative pb-8">
                              {logIdx !== result.logistics.length - 1 ? (
                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                              ) : null}
                              <div className="relative flex space-x-3">
                                <div>
                                  <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${logIdx === result.logistics.length - 1 ? 'bg-green-500' : 'bg-blue-500'}`}>
                                    <Box className="h-4 w-4 text-white" aria-hidden="true" />
                                  </span>
                                </div>
                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                  <div>
                                    <p className="text-sm text-gray-900">
                                      {log.status} <span className="text-gray-500">@ {log.location}</span>
                                    </p>
                                  </div>
                                  <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                    <time>{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</time>
                                    <div className="text-xs">{new Date(log.timestamp).toLocaleDateString()}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>
      )}
      
      <div className="flex-1"></div>
      <footer className="py-8 bg-white border-t border-gray-200 text-center text-gray-400 text-sm">
        <div className="max-w-7xl mx-auto px-4">
           <p className="mb-2">&copy; 2023 SLSS V2.0 生产售后一体化服务平台</p>
           <div className="flex justify-center space-x-4 text-xs">
             <a href="#" className="hover:text-gray-600">隐私政策</a>
             <a href="#" className="hover:text-gray-600">服务条款</a>
             <a href="#" className="hover:text-gray-600">技术支持</a>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default Portal;
