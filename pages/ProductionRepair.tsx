
import React, { useState } from 'react';
import { Search, Hammer, ArrowRight, Save, History, AlertTriangle, CheckCircle, Component, User } from 'lucide-react';
import { Asset, LifecycleEvent } from '../types';
import { MOCK_ASSETS, MOCK_LIFECYCLE } from '../services/mockData';
import { useAuth } from '../components/AuthContext';

const ProductionRepair: React.FC = () => {
  const { user } = useAuth();
  const [searchSn, setSearchSn] = useState('');
  const [asset, setAsset] = useState<Asset | null>(null);
  const [selectedPart, setSelectedPart] = useState<string | null>(null); // Key of the asset field
  const [partLabel, setPartLabel] = useState('');
  
  // Repair Form
  const [oldSn, setOldSn] = useState('');
  const [newSn, setNewSn] = useState('');
  const [reason, setReason] = useState('');
  const [operator, setOperator] = useState(user?.username || '');

  const [message, setMessage] = useState<{type:'success'|'error', text:string} | null>(null);

  const handleSearch = () => {
    if(!searchSn) return;
    const found = MOCK_ASSETS.find(a => a.machine_sn === searchSn);
    if(found) {
        setAsset(found);
        setSearchSn('');
        setMessage(null);
        setSelectedPart(null);
    } else {
        setAsset(null);
        setMessage({type: 'error', text: '未找到该机器 SN'});
    }
  };

  const handleSelectPart = (key: string, label: string, currentVal: string) => {
    setSelectedPart(key);
    setPartLabel(label);
    setOldSn(currentVal || '');
    setNewSn('');
    setReason('');
  };

  const handleSubmitRepair = () => {
    if(!asset || !selectedPart || !newSn || !reason) {
        setMessage({type:'error', text: '请填写完整维修信息 (新SN、原因)'});
        return;
    }

    // 1. Update Asset (Mock)
    (asset as any)[selectedPart] = newSn;
    
    // 2. Log Lifecycle
    const event: LifecycleEvent = {
        id: Date.now(),
        machine_sn: asset.machine_sn,
        event_type: 'PROD_REPAIR',
        part_name: partLabel,
        old_sn: oldSn,
        new_sn: newSn,
        bad_part_reason: reason,
        operator: operator,
        timestamp: new Date().toISOString(),
        details: `生产线维修: 更换${partLabel}`
    };
    MOCK_LIFECYCLE.unshift(event);

    setMessage({type:'success', text: '维修记录已提交，配件信息已更新'});
    setSelectedPart(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Hammer className="mr-2 text-orange-600" /> 生产维修系统
         </h1>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex gap-4 items-end">
         <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">扫描/输入 整机 SN</label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"/>
                <input 
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-lg font-mono"
                  placeholder="Scan Machine SN..."
                  value={searchSn}
                  onChange={e => setSearchSn(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  autoFocus
                />
            </div>
         </div>
         <button onClick={handleSearch} className="px-6 py-2.5 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">查询</button>
      </div>

      {message && (
        <div className={`p-4 rounded border flex items-center ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {message.type === 'error' ? <AlertTriangle className="w-5 h-5 mr-2"/> : <CheckCircle className="w-5 h-5 mr-2"/>}
            {message.text}
        </div>
      )}

      {/* Main Workspace */}
      {asset && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Component List */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200">
               <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 flex items-center"><Component className="w-4 h-4 mr-2"/> 配件清单 (点击修改)</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">{asset.machine_sn}</span>
               </div>
               <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {k: 'mb_sn', l: '主板 (MB)', v: asset.mb_sn},
                    {k: 'cpu_sn', l: 'CPU 1', v: asset.cpu_sn},
                    {k: 'cpu_sn_2', l: 'CPU 2', v: asset.cpu_sn_2},
                    {k: 'mem_sns', l: '内存 (Mem)', v: asset.mem_sns},
                    {k: 'hdd_sn', l: '硬盘 (HDD)', v: asset.hdd_sn},
                    {k: 'psu_cage_sn', l: '电源笼', v: asset.psu_cage_sn},
                    {k: 'psu_module_1_sn', l: '电源模块 1', v: asset.psu_module_1_sn},
                    {k: 'psu_module_2_sn', l: '电源模块 2', v: asset.psu_module_2_sn},
                    {k: 'pcie_sn', l: 'PCIE 扩展卡', v: asset.pcie_sn},
                  ].map(item => (
                     <div 
                        key={item.k} 
                        onClick={() => handleSelectPart(item.k, item.l, item.v || '')}
                        className={`p-3 border rounded cursor-pointer transition-all hover:shadow-md ${selectedPart === item.k ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'border-gray-200 hover:border-blue-300'}`}
                     >
                        <div className="text-xs text-gray-500 font-bold uppercase">{item.l}</div>
                        <div className="text-sm font-mono text-gray-800 break-all">{item.v || <span className="text-gray-300 italic">Empty</span>}</div>
                     </div>
                  ))}
               </div>
            </div>

            {/* Right: Repair Action */}
            <div className="bg-white rounded-lg shadow border border-gray-200 h-fit">
               <div className="p-4 border-b border-gray-200 bg-orange-50">
                  <h3 className="font-bold text-orange-800">维修操作台</h3>
               </div>
               <div className="p-6 space-y-4">
                  {!selectedPart ? (
                      <div className="text-center text-gray-400 py-10">
                          <ArrowRight className="w-8 h-8 mx-auto mb-2 opacity-20"/>
                          <p>请在左侧点击需要更换的配件</p>
                      </div>
                  ) : (
                      <>
                        <div className="bg-gray-50 p-3 rounded text-sm mb-4 border border-gray-200">
                            <span className="text-gray-500">正在维修:</span> <span className="font-bold text-gray-900">{partLabel}</span>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">原条码 (Old SN)</label>
                            <input className="w-full border border-gray-300 bg-gray-100 text-gray-500 rounded p-2 text-sm font-mono" value={oldSn} disabled />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">新条码 (New SN) <span className="text-red-500">*</span></label>
                            <input 
                                className="w-full border border-blue-500 rounded p-2 text-sm font-mono focus:ring-2 focus:ring-blue-200 outline-none" 
                                placeholder="Scan New SN" 
                                value={newSn} 
                                onChange={e => setNewSn(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">故障原因 (Reason) <span className="text-red-500">*</span></label>
                            <select className="w-full border border-gray-300 rounded p-2 text-sm" value={reason} onChange={e => setReason(e.target.value)}>
                                <option value="">-- 请选择 --</option>
                                <option value="DOA (开箱即损)">DOA (开箱即损)</option>
                                <option value="Functional Fail (功能测试不过)">Functional Fail (功能测试不过)</option>
                                <option value="Appearance (外观不良)">Appearance (外观不良)</option>
                                <option value="Wrong Part (错料)">Wrong Part (错料)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">操作员 (Operator)</label>
                            <div className="relative">
                                <User className="absolute left-2 top-2 w-4 h-4 text-gray-400"/>
                                <input className="w-full pl-8 border border-gray-300 rounded p-2 text-sm" value={operator} onChange={e => setOperator(e.target.value)} />
                            </div>
                        </div>

                        <button 
                            onClick={handleSubmitRepair}
                            className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-bold shadow-sm flex justify-center items-center mt-4"
                        >
                            <Save className="w-4 h-4 mr-2"/> 提交维修记录
                        </button>
                      </>
                  )}
               </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ProductionRepair;
