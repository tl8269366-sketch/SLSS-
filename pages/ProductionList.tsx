
import React, { useState } from 'react';
import { MOCK_ASSETS, MOCK_LIFECYCLE } from '../services/mockData';
import { Asset, LifecycleEvent } from '../types';
import { Search, Filter, Eye, Download, Server, CircuitBoard, HardDrive, Cpu, Zap, History, ArrowRight, GitCommit, Calendar, FileText } from 'lucide-react';

const ProductionList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterContract, setFilterContract] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Enhanced Filter Logic: Search within ALL component SNs
  const filteredAssets = MOCK_ASSETS.filter(a => {
    const term = searchTerm.toLowerCase().trim();
    
    // 1. Check specific filters
    const matchContract = !filterContract || (a.contract_no || '').toLowerCase().includes(filterContract.toLowerCase());
    const matchDate = !filterDate || (a.invoice_date || '').includes(filterDate);
    
    if (!matchContract || !matchDate) return false;

    // 2. Check Global Search Term
    if (!term) return true;

    // Aggregate all searchable fields into one string for easy checking
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

  // Get Lifecycle history for the selected asset
  const getAssetHistory = (sn: string): LifecycleEvent[] => {
    return MOCK_LIFECYCLE.filter(e => e.machine_sn === sn).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Server className="mr-2 text-blue-600" /> 生产数据查询 (ERP View)
        </h1>
        <div className="flex space-x-2">
           <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
             <Download className="w-4 h-4 mr-2" /> 导出 Excel
           </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col xl:flex-row gap-4">
          
          {/* Global Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="全字段搜索: 机器SN, CPU/内存/硬盘/电源模块 SN..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Contract Filter */}
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

          {/* Date Filter */}
          <div className="relative w-full xl:w-48">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Calendar className="h-4 w-4 text-gray-400" />
             </div>
             <input
               type="date"
               className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
               value={filterDate}
               onChange={(e) => setFilterDate(e.target.value)}
             />
          </div>
          
          {/* Action Button */}
          <button 
             onClick={() => {setSearchTerm(''); setFilterContract(''); setFilterDate('');}}
             className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap"
          >
             <Filter className="w-4 h-4 mr-2" /> 重置筛选
          </button>
        </div>

        {/* Data Grid */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">机器序列号 (SN)</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">合同号</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">型号</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">批次号</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">完成时间</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                      {asset.batch_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {asset.invoice_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                      <div className="flex flex-col">
                        <span>MB: {asset.mb_model || 'N/A'}</span>
                        <span>CPU: {asset.cpu_model || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                      <button 
                        onClick={() => setSelectedAsset(asset)}
                        className="text-blue-600 hover:text-blue-900 flex items-center justify-end w-full"
                      >
                        <Eye className="w-4 h-4 mr-1" /> 查看详情/溯源
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
        </div>
        
        {/* Simple Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
           <span className="text-sm text-gray-700">
             显示 <span className="font-medium">{filteredAssets.length}</span> 条结果
           </span>
           <div className="flex space-x-2">
             <button className="px-3 py-1 border rounded text-sm bg-white disabled:opacity-50" disabled>上一页</button>
             <button className="px-3 py-1 border rounded text-sm bg-white disabled:opacity-50" disabled>下一页</button>
           </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[95vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                 <Server className="w-5 h-5 mr-2 text-blue-600" /> 设备全生命周期档案
              </h3>
              <button onClick={() => setSelectedAsset(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
               
               {/* Column 1: Basic Info */}
               <div className="lg:col-span-1 space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                     <h4 className="text-xs font-bold text-blue-500 uppercase mb-3">基本信息</h4>
                     <div className="space-y-2 text-sm">
                       <div className="flex justify-between"><span className="text-gray-500">机器 SN:</span> <span className="font-mono font-bold text-blue-700">{selectedAsset.machine_sn}</span></div>
                       <div className="flex justify-between"><span className="text-gray-500">合同号:</span> <span>{selectedAsset.contract_no}</span></div>
                       <div className="flex justify-between"><span className="text-gray-500">型号:</span> <span>{selectedAsset.model}</span></div>
                       <div className="flex justify-between"><span className="text-gray-500">批次号:</span> <span>{selectedAsset.batch_name}</span></div>
                       <div className="flex justify-between"><span className="text-gray-500">完成时间:</span> <span>{selectedAsset.invoice_date}</span></div>
                       <div className="flex justify-between pt-2 border-t border-blue-200"><span className="text-gray-500">录入时间:</span> <span className="text-xs">{selectedAsset.created_at ? new Date(selectedAsset.created_at).toLocaleString() : '-'}</span></div>
                     </div>
                  </div>
                  
                  {/* Expansion */}
                  {selectedAsset.pcie_sn && (
                     <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 shadow-sm">
                       <h4 className="text-xs font-bold text-purple-500 uppercase mb-3 flex items-center"><CircuitBoard className="w-4 h-4 mr-2"/> PCIE 扩展卡</h4>
                       <div className="text-sm font-mono text-gray-800 break-all">{selectedAsset.pcie_sn}</div>
                     </div>
                  )}
               </div>

               {/* Column 2 & 3: BOM Configuration + Lifecycle */}
               <div className="lg:col-span-2 space-y-6">
                  
                  {/* Current Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Motherboard & CPU */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center"><CircuitBoard className="w-4 h-4 mr-2"/> 主板与处理器</h4>
                      <div className="space-y-4 text-sm">
                        <div>
                          <span className="block text-xs text-gray-500">主板 (Motherboard)</span>
                          <div className="font-medium">{selectedAsset.mb_model || 'Unknown'}</div>
                          <div className="text-xs font-mono text-gray-500 bg-gray-50 p-1 rounded inline-block border">{selectedAsset.mb_sn || 'N/A'}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="block text-xs text-gray-500">CPU 1</span>
                              <div className="text-xs font-mono text-gray-600 truncate" title={selectedAsset.cpu_sn}>{selectedAsset.cpu_sn || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="block text-xs text-gray-500">CPU 2</span>
                              <div className="text-xs font-mono text-gray-600 truncate" title={selectedAsset.cpu_sn_2}>{selectedAsset.cpu_sn_2 || 'N/A'}</div>
                            </div>
                        </div>
                      </div>
                    </div>

                    {/* Power Supply */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center"><Zap className="w-4 h-4 mr-2"/> 电源系统</h4>
                      <div className="space-y-4 text-sm">
                        <div>
                          <span className="block text-xs text-gray-500">电源型号</span>
                          <div className="font-medium">{selectedAsset.psu_info || 'N/A'}</div>
                          <div className="text-xs font-mono text-gray-500 mt-1">笼子 SN: {selectedAsset.psu_cage_sn || 'N/A'}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 bg-yellow-50 p-2 rounded border border-yellow-100">
                            <div>
                              <span className="block text-xs text-yellow-700">模块 1</span>
                              <div className="text-xs font-mono text-gray-600 break-all">{selectedAsset.psu_module_1_sn || '-'}</div>
                            </div>
                            <div>
                              <span className="block text-xs text-yellow-700">模块 2</span>
                              <div className="text-xs font-mono text-gray-600 break-all">{selectedAsset.psu_module_2_sn || '-'}</div>
                            </div>
                        </div>
                      </div>
                    </div>

                    {/* Storage & Memory */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm md:col-span-2">
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center"><HardDrive className="w-4 h-4 mr-2"/> 存储与内存</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="block text-xs text-gray-500 mb-1">硬盘 (HDD/SSD)</span>
                          <div className="font-medium">{selectedAsset.hdd_info}</div>
                          <div className="text-xs font-mono text-gray-500 border p-1 rounded mt-1 bg-gray-50">{selectedAsset.hdd_sn || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-500 mb-1">内存 (Memory)</span>
                          <div className="font-medium">{selectedAsset.mem_info}</div>
                          <div className="text-xs font-mono text-gray-500 border p-1 rounded mt-1 bg-gray-50 max-h-20 overflow-y-auto">
                            {selectedAsset.mem_sns ? selectedAsset.mem_sns.split(',').map((s, i) => (
                              <span key={i} className="block">{s.trim()}</span>
                            )) : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lifecycle History Section */}
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
                     <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                        <History className="w-4 h-4 mr-2 text-blue-600" /> 配件更换与维修追溯 (Lifecycle Traceability)
                     </h4>
                     
                     <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                        {getAssetHistory(selectedAsset.machine_sn).length > 0 ? (
                           getAssetHistory(selectedAsset.machine_sn).map((event, i) => (
                              <div key={i} className="ml-6 relative">
                                 <span className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-2 ring-blue-100">
                                    <GitCommit className="h-3 w-3 text-blue-500" />
                                 </span>
                                 <div>
                                    <div className="flex items-center text-sm font-medium text-gray-900">
                                       <span className="mr-2">{new Date(event.timestamp).toLocaleString()}</span>
                                       <span className={`px-2 py-0.5 rounded text-xs ${event.event_type === 'FACTORY_SHIP' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                          {event.event_type}
                                       </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">{event.details}</p>
                                    
                                    {/* Swap Details */}
                                    {event.old_sn && (
                                       <div className="mt-2 bg-white border border-gray-200 rounded p-2 text-xs inline-block shadow-sm">
                                          <div className="font-bold text-gray-700 mb-1">{event.part_name || 'Component'} 更换:</div>
                                          <div className="flex items-center space-x-2 font-mono">
                                             <span className="text-red-500 line-through bg-red-50 px-1 rounded" title="Old SN">{event.old_sn}</span>
                                             <ArrowRight className="w-3 h-3 text-gray-400" />
                                             <span className="text-green-600 bg-green-50 px-1 rounded" title="New SN">{event.new_sn}</span>
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           ))
                        ) : (
                           <div className="ml-6 text-sm text-gray-400 italic">暂无维修更换记录</div>
                        )}
                        
                        {/* Initial State Marker */}
                        <div className="ml-6 relative">
                           <span className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 ring-2 ring-gray-50">
                              <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                           </span>
                           <span className="text-xs text-gray-400">档案建立 (初始生产配置)</span>
                        </div>
                     </div>
                  </div>

               </div>
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

export default ProductionList;
