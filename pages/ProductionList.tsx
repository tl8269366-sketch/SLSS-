import React, { useState, useEffect } from 'react';
import { MOCK_LIFECYCLE } from '../services/mockData';
import { Asset, LifecycleEvent } from '../types';
import { Search, Filter, Eye, Download, Server, CircuitBoard, HardDrive, Zap, History, ArrowRight, GitCommit, Calendar, FileText, Wrench, Loader2 } from 'lucide-react';

const ProductionQuery: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterContract, setFilterContract] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'bad_parts'>('info');
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all assets on mount
  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/production/all-assets');
        if (res.ok) {
          const data = await res.json();
          setAllAssets(data);
        }
      } catch (e) {
        console.error("Failed to load assets", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, []);

  // Enhanced Filter Logic
  const filteredAssets = allAssets.filter(a => {
    const term = searchTerm.toLowerCase().trim();
    
    // 1. Check specific filters
    const matchContract = !filterContract || (a.contract_no || '').toLowerCase().includes(filterContract.toLowerCase());
    
    if (!matchContract) return false;

    // 2. Check Global Search Term
    if (!term) return true;

    // Aggregate all searchable fields
    const searchableFields = [
      a.machine_sn,
      a.contract_no,
      a.batch_name,
      a.model,
      a.mb_sn,
      a.cpu_sn,
      a.cpu_sn_2,
      a.psu_cage_sn,
      a.psu_module_1_sn,
      a.psu_module_2_sn,
      a.hdd_sn,
      a.mem_sns,
      a.pcie_sn
    ].map(val => (val || '').toLowerCase());

    return searchableFields.some(field => field.includes(term));
  });

  // Get Lifecycle history (Mock for now, should ideally fetch /api/lifecycle)
  const getAssetHistory = (sn: string): LifecycleEvent[] => {
    return MOCK_LIFECYCLE.filter(e => e.machine_sn === sn).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  const getRepairHistory = (sn: string) => {
    return getAssetHistory(sn).filter(e => e.event_type === 'PROD_REPAIR' || e.event_type === 'REPAIR_SWAP');
  };

  const handleExport = () => {
    if (!(window as any).XLSX) { alert("Excel Library missing"); return; }
    
    const data = filteredAssets.map(a => ({
        "整机SN": a.machine_sn,
        "合同号": a.contract_no,
        "型号": a.model,
        "主板SN": a.mb_sn,
        "CPU1 SN": a.cpu_sn,
        "内存SN": a.mem_sns,
        "硬盘SN": a.hdd_sn,
        "当前工序": a.production_stage,
        "操作员": a.current_operator,
        "录入时间": a.created_at
    }));

    const ws = (window as any).XLSX.utils.json_to_sheet(data);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "SN统计");
    (window as any).XLSX.writeFile(wb, `SN_Stats_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Search className="mr-2 text-blue-600" /> 生产记录查询系统
        </h1>
        <div className="flex space-x-2">
           <button onClick={handleExport} className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
             <Download className="w-4 h-4 mr-2" /> 导出 SN 统计表
           </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col xl:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="双向查询: 输入 整机SN 或 任意配件SN (CPU/内存/硬盘/电源...)"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative w-full xl:w-64">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <FileText className="h-4 w-4 text-gray-400" />
             </div>
             <input
               type="text"
               placeholder="筛选合同号..."
               className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
               value={filterContract}
               onChange={(e) => setFilterContract(e.target.value)}
             />
          </div>
          
          <button 
             onClick={() => {setSearchTerm(''); setFilterContract('');}}
             className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap"
          >
             <Filter className="w-4 h-4 mr-2" /> 重置筛选
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
             <div className="py-20 text-center flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-500" /></div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">机器序列号 (SN)</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">合同号</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">型号</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">当前工序</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">当前操作员</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">主要配置</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAssets.length > 0 ? (
                  filteredAssets.map((asset, idx) => (
                    <tr key={idx} className="hover:bg-blue-50 transition-colors text-sm">
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-medium text-blue-700">
                        {asset.machine_sn}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">{asset.contract_no}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{asset.model}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-100 font-bold text-gray-600">{asset.production_stage || 'Unknown'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium">
                        {asset.current_operator || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                        <div className="flex flex-col">
                          <span className="truncate w-32" title={asset.mb_sn}>MB: {asset.mb_sn || 'N/A'}</span>
                          <span className="truncate w-32" title={asset.cpu_sn}>CPU: {asset.cpu_sn || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                        <button 
                          onClick={() => setSelectedAsset(asset)}
                          className="text-blue-600 hover:text-blue-900 flex items-center justify-end w-full"
                        >
                          <Eye className="w-4 h-4 mr-1" /> 查看追溯
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500 italic">
                      暂无数据，请尝试调整筛选条件
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
           <span className="text-sm text-gray-700">
             显示 <span className="font-medium">{filteredAssets.length}</span> 条结果
           </span>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[95vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                 <Server className="w-5 h-5 mr-2 text-blue-600" /> 设备档案 (SN: {selectedAsset.machine_sn})
              </h3>
              <button onClick={() => setSelectedAsset(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            {/* Tabs */}
            <div className="px-6 bg-white border-b border-gray-200 flex space-x-6">
                <button onClick={() => setActiveTab('info')} className={`py-3 text-sm font-medium border-b-2 ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>配置信息</button>
                <button onClick={() => setActiveTab('history')} className={`py-3 text-sm font-medium border-b-2 ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>全生命周期 (History)</button>
                <button onClick={() => setActiveTab('bad_parts')} className={`py-3 text-sm font-medium border-b-2 ${activeTab === 'bad_parts' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>维修/坏件记录</button>
            </div>
            
            <div className="p-6 h-[600px] overflow-y-auto">
               
               {activeTab === 'info' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 p-4 rounded border">
                            <h4 className="font-bold mb-2">基本信息</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span>合同号: {selectedAsset.contract_no}</span>
                                <span>型号: {selectedAsset.model}</span>
                                <span>批次: {selectedAsset.batch_name}</span>
                                <span>工序: {selectedAsset.production_stage}</span>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded border">
                            <h4 className="font-bold mb-2">核心部件</h4>
                            <div className="space-y-1 text-sm font-mono text-gray-600">
                                <div>MB: {selectedAsset.mb_sn}</div>
                                <div>CPU: {selectedAsset.cpu_sn}</div>
                                <div>MEM: {selectedAsset.mem_sns}</div>
                                <div>HDD: {selectedAsset.hdd_sn}</div>
                            </div>
                        </div>
                   </div>
               )}

               {activeTab === 'history' && (
                  <div className="space-y-6 border-l-2 border-gray-200 ml-4 pl-6 relative">
                      {getAssetHistory(selectedAsset.machine_sn).map((e, i) => (
                          <div key={i} className="relative">
                              <div className="absolute -left-[31px] top-0 w-6 h-6 bg-white border-2 border-blue-500 rounded-full flex items-center justify-center">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              </div>
                              <div className="flex flex-col">
                                  <span className="font-bold text-gray-800">{e.event_type}</span>
                                  <span className="text-xs text-gray-400">{new Date(e.timestamp).toLocaleString()}</span>
                                  <span className="text-sm text-gray-600 mt-1">{e.details}</span>
                                  <span className="text-xs bg-gray-100 w-fit px-2 py-0.5 rounded mt-1">操作员: {e.operator || e.technician_name || 'System'}</span>
                              </div>
                          </div>
                      ))}
                  </div>
               )}

               {activeTab === 'bad_parts' && (
                  <div>
                      {getRepairHistory(selectedAsset.machine_sn).length > 0 ? (
                          <table className="min-w-full divide-y divide-gray-200 border">
                              <thead className="bg-red-50">
                                  <tr>
                                      <th className="p-2 text-left text-xs font-bold text-red-800">维修时间</th>
                                      <th className="p-2 text-left text-xs font-bold text-red-800">部件</th>
                                      <th className="p-2 text-left text-xs font-bold text-red-800">退库坏件SN</th>
                                      <th className="p-2 text-left text-xs font-bold text-red-800">新换SN</th>
                                      <th className="p-2 text-left text-xs font-bold text-red-800">原因</th>
                                      <th className="p-2 text-left text-xs font-bold text-red-800">操作员</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                  {getRepairHistory(selectedAsset.machine_sn).map((e, i) => (
                                      <tr key={i}>
                                          <td className="p-2 text-xs">{new Date(e.timestamp).toLocaleDateString()}</td>
                                          <td className="p-2 text-xs">{e.part_name}</td>
                                          <td className="p-2 text-xs font-mono text-red-600 line-through">{e.old_sn}</td>
                                          <td className="p-2 text-xs font-mono text-green-600">{e.new_sn}</td>
                                          <td className="p-2 text-xs">{e.bad_part_reason || '-'}</td>
                                          <td className="p-2 text-xs">{e.operator || '-'}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      ) : (
                          <div className="text-center py-10 text-gray-400 flex flex-col items-center">
                              <Wrench className="w-10 h-10 mb-2 opacity-20"/>
                              <p>该设备暂无生产维修记录</p>
                          </div>
                      )}
                  </div>
               )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button 
                onClick={() => setSelectedAsset(null)}
                className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionQuery;