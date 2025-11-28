
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Check, Loader2, AlertCircle, ScanLine, Database, Wifi, WifiOff, ChevronRight, ArrowLeft, FileSpreadsheet, Save, Settings, X, Columns, ArrowDownToLine, Upload, FileDown, Table, CheckCircle } from 'lucide-react';
import { Asset, SystemSettings } from '../types';
import { DEFAULT_OPERATORS } from '../services/mockData';
import { useAuth } from '../components/AuthContext';
import { MOCK_MODE } from '../constants';

// --- Types ---

type ViewMode = 'dashboard' | 'history' | 'entry';

interface GridRow extends Partial<Asset> {
  _id: string; // Temp ID for React keys
}

interface ContractSummary {
  contractNo: string;
  model: string;
  customerName?: string;
  count: number;
  totalRows: number;
  lastUpdated: string;
}

// --- Dynamic Column Types ---
type ColumnType = 'mb' | 'cpu' | 'mem' | 'hdd' | 'psu' | 'pcie' | 'other';

interface ColumnField {
  key: string;
  label: string;
  type: 'input' | 'select';
  widthClass?: string;
}

interface ColumnGroup {
  id: string;
  type: ColumnType;
  title: string;
  colorClass: string; // e.g., 'blue', 'purple'
  fields: ColumnField[];
}

// --- Constants & Helpers ---
const LOCAL_STORAGE_INDEX_KEY = 'slss_prod_index';
const getLocalKey = (contractNo: string) => `slss_prod_batch_${contractNo}`;

// Priority map for column ordering
const TYPE_PRIORITY: Record<string, number> = {
  'mb': 10,
  'cpu': 20,
  'mem': 30,
  'hdd': 40,
  'psu': 50,
  'pcie': 60,
  'other': 99
};

// Helper: SN Validator
const getValidationClass = (value: string | undefined) => {
  if (!value) return '';
  const len = value.trim().length;
  if (len > 0 && len < 5) { // Simple validation
    return 'bg-red-50 text-red-600 border-red-300 focus:border-red-500 focus:ring-red-200';
  }
  return 'bg-transparent text-gray-800 focus:bg-white border-transparent focus:border-blue-500';
};

// Default Columns Generator
const generateDefaultColumns = (): ColumnGroup[] => [
  {
    id: 'mb_main',
    type: 'mb',
    title: '主板 (MB)',
    colorClass: 'blue',
    fields: [
      { key: 'mb_model', label: '型号', type: 'input', widthClass: 'w-20' },
      { key: 'mb_sn', label: 'SN', type: 'input', widthClass: 'w-24' },
      { key: 'mb_operator', label: 'OP', type: 'select', widthClass: 'w-16' },
    ]
  },
  {
    id: 'cpu_1',
    type: 'cpu',
    title: 'CPU 1',
    colorClass: 'purple',
    fields: [
      { key: 'cpu_model', label: '型号', type: 'input', widthClass: 'w-16' },
      { key: 'cpu_sn', label: 'SN', type: 'input', widthClass: 'w-24' },
      { key: 'cpu_operator', label: 'OP', type: 'select', widthClass: 'w-16' },
    ]
  },
  {
    id: 'cpu_2',
    type: 'cpu',
    title: 'CPU 2',
    colorClass: 'purple',
    fields: [
      { key: 'cpu_sn_2', label: 'SN', type: 'input', widthClass: 'w-24' },
      { key: 'cpu_operator', label: 'OP', type: 'select', widthClass: 'w-16' },
    ]
  },
  {
    id: 'mem_1',
    type: 'mem',
    title: '内存 (Mem)',
    colorClass: 'green',
    fields: [
      { key: 'mem_info', label: '信息', type: 'input', widthClass: 'w-20' },
      { key: 'mem_sns', label: 'SNs', type: 'input', widthClass: 'w-32' },
      { key: 'mem_operator', label: 'OP', type: 'select', widthClass: 'w-16' },
    ]
  },
  {
    id: 'hdd_1',
    type: 'hdd',
    title: '硬盘 (HDD)',
    colorClass: 'orange',
    fields: [
      { key: 'hdd_info', label: '信息', type: 'input', widthClass: 'w-20' },
      { key: 'hdd_sn', label: 'SN', type: 'input', widthClass: 'w-24' },
      { key: 'hdd_operator', label: 'OP', type: 'select', widthClass: 'w-16' },
    ]
  },
  {
    id: 'psu_1',
    type: 'psu',
    title: '电源 (PSU)',
    colorClass: 'yellow',
    fields: [
      { key: 'psu_info', label: '信息', type: 'input', widthClass: 'w-20' },
      { key: 'psu_cage_sn', label: '笼 SN', type: 'input', widthClass: 'w-24' },
      { key: 'psu_module_1_sn', label: '模1 SN', type: 'input', widthClass: 'w-24' },
      { key: 'psu_module_2_sn', label: '模2 SN', type: 'input', widthClass: 'w-24' },
      { key: 'psu_operator', label: 'OP', type: 'select', widthClass: 'w-16' },
    ]
  },
  {
    id: 'pcie_1',
    type: 'pcie',
    title: 'PCIE',
    colorClass: 'gray',
    fields: [
      { key: 'pcie_sn', label: 'SN', type: 'input', widthClass: 'w-24' },
      { key: 'pcie_operator', label: 'OP', type: 'select', widthClass: 'w-16' },
    ]
  }
];

// --- Performance Optimization: FastInput Component ---
const FastInput = React.memo(({ value, onChange, placeholder, className }: { value: string | undefined, onChange: (val: string) => void, placeholder?: string, className?: string }) => {
    // Ensure initial state is never undefined to avoid React warnings
    const [localValue, setLocalValue] = useState(value ?? '');
    
    useEffect(() => {
        setLocalValue(value ?? '');
    }, [value]);

    const handleBlur = () => {
        if (localValue !== (value ?? '')) {
            onChange(localValue);
        }
    };

    return (
        <input 
            className={className} 
            value={localValue} 
            onChange={(e) => setLocalValue(e.target.value)} 
            onBlur={handleBlur}
            placeholder={placeholder}
        />
    );
});

// --- Sub-Component: Import Wizard Modal ---

const ImportWizardModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: GridRow[]) => void;
}> = ({ isOpen, onClose, onImport }) => {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [previewRows, setPreviewRows] = useState<GridRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Reset state on close/open
  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setPreviewRows([]);
      setError(null);
    }
  }, [isOpen]);

  const handleDownloadTemplate = () => {
    try {
      if (!(window as any).XLSX) {
        alert("Excel 导出组件未加载，请检查网络");
        return;
      }
      const XLSX = (window as any).XLSX;
      
      // Define Template Headers
      const headers = [
        "合同号", "机型", "客户名称", "整机SN", 
        "主板型号", "主板SN", 
        "CPU型号", "CPU1 SN", "CPU2 SN", 
        "内存信息", "内存SN", 
        "硬盘信息", "硬盘SN",
        "电源信息", "电源笼SN"
      ];
      
      const exampleRow = [
        "2023-IMPORT-001", "551C FKF", "示例客户", "SRV-TEST-001", 
        "X11DPI-N", "MB123456", 
        "Intel 5115", "CPU-A-001", "CPU-B-001", 
        "Samsung 32G", "MEM-001, MEM-002", 
        "WD 4T", "HDD-001",
        "800W", "PSU-CAGE-001"
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "导入模板");
      XLSX.writeFile(wb, "SLSS_生产导入模板.xlsx");

    } catch (e: any) {
      setError("模板生成失败: " + e.message);
    }
  };

  const processFile = (file: File) => {
    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (!(window as any).XLSX) throw new Error("Excel 解析库未加载");
        
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = (window as any).XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = (window as any).XLSX.utils.sheet_to_json(sheet);

        if (!jsonData || jsonData.length === 0) {
          throw new Error("文件为空或格式不正确");
        }

        // Helper to find value from multiple possible keys (fuzzy match)
        const getVal = (row: any, keys: string[]) => {
            for (const k of keys) {
                if (row[k] != null) return String(row[k]).trim();
                // Lowercase check
                const foundKey = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
                if (foundKey && row[foundKey] != null) return String(row[foundKey]).trim();
            }
            return '';
        };

        const mappedRows: GridRow[] = jsonData.map((row: any) => ({
            _id: Math.random().toString(36).substr(2, 9),
            contract_no: getVal(row, ['合同号', 'contract_no', 'contract', '批次号']) || `BATCH-${new Date().toISOString().slice(0,10)}`,
            model: getVal(row, ['机型', 'model', '产品型号', 'sku']),
            machine_sn: getVal(row, ['SN', '机器序列号', '整机SN', 'Serial Number']),
            customer_name: getVal(row, ['客户', 'customer', '客户名称']),
            
            mb_model: getVal(row, ['主板型号', 'mb_model', 'mb model']),
            mb_sn: getVal(row, ['主板SN', 'mb_sn', 'mb sn', 'motherboard sn']),
            
            cpu_model: getVal(row, ['CPU型号', 'cpu_model']),
            cpu_sn: getVal(row, ['CPU1 SN', 'cpu_sn', 'cpu1', 'cpu sn']),
            cpu_sn_2: getVal(row, ['CPU2 SN', 'cpu_sn_2', 'cpu2']),
            
            mem_info: getVal(row, ['内存信息', 'mem_info']),
            mem_sns: getVal(row, ['内存SN', 'mem_sns', 'mem sn', 'memory sn']),
            
            hdd_info: getVal(row, ['硬盘信息', 'hdd_info']),
            hdd_sn: getVal(row, ['硬盘SN', 'hdd_sn', 'hdd sn', 'storage sn']),
            
            psu_info: getVal(row, ['电源信息', 'psu_info']),
            psu_cage_sn: getVal(row, ['电源笼SN', 'psu_cage_sn', 'cage sn']),
            psu_module_1_sn: getVal(row, ['电源模块1', 'psu_module_1_sn']),
            psu_module_2_sn: getVal(row, ['电源模块2', 'psu_module_2_sn']),
        }));

        setPreviewRows(mappedRows);
        setStep('preview');

      } catch (err: any) {
        console.error("Parse Error:", err);
        setError(err.message || "文件解析失败，请检查格式");
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError("文件读取失败");
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const confirmImport = () => {
    onImport(previewRows);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600"/> 批量导入向导
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">支持 .xlsx, .xls 格式文件</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100"><X size={20}/></button>
        </div>

        {/* Content */}
        <div className="p-8 flex-1 overflow-y-auto">
          {step === 'upload' ? (
             <div className="space-y-8">
                {/* Step 1: Download Template */}
                <div className="flex items-start p-4 bg-blue-50 border border-blue-100 rounded-lg">
                   <div className="bg-blue-100 p-2 rounded-lg mr-4">
                      <ArrowDownToLine className="w-6 h-6 text-blue-600" />
                   </div>
                   <div>
                      <h4 className="font-bold text-blue-900 text-sm">第一步：下载标准模板</h4>
                      <p className="text-xs text-blue-700 mt-1 mb-2">请使用标准模板整理生产数据，确保表头名称正确，避免导入失败。</p>
                      <button onClick={handleDownloadTemplate} className="text-xs font-bold bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-50 transition-colors">
                        点击下载 Excel 模板
                      </button>
                   </div>
                </div>

                {/* Step 2: Upload */}
                <div className="text-center">
                   <h4 className="font-bold text-gray-800 text-sm mb-4">第二步：上传填写好的文件</h4>
                   <div 
                      className={`border-2 border-dashed rounded-xl p-10 transition-all cursor-pointer ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
                      onClick={() => fileInputRef.current?.click()}
                   >
                      <input 
                         type="file" 
                         ref={fileInputRef} 
                         className="hidden" 
                         accept=".xlsx, .xls" 
                         onChange={handleFileChange} 
                      />
                      {loading ? (
                         <div className="flex flex-col items-center">
                           <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-2" />
                           <span className="text-sm text-gray-500">正在解析数据...</span>
                         </div>
                      ) : (
                         <div className="flex flex-col items-center">
                           <Upload className={`w-10 h-10 mb-3 ${error ? 'text-red-400' : 'text-gray-400'}`} />
                           <span className="text-sm font-medium text-gray-600">点击选择文件 或 拖拽至此</span>
                           {error && <span className="text-xs text-red-500 mt-2 font-bold">{error}</span>}
                         </div>
                      )}
                   </div>
                </div>
             </div>
          ) : (
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <h4 className="font-bold text-gray-800">解析预览 (前 5 条)</h4>
                   <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">共解析出 {previewRows.length} 条数据</span>
                </div>
                
                <div className="border rounded-lg overflow-hidden overflow-x-auto">
                   <table className="min-w-full text-xs text-left">
                      <thead className="bg-gray-100 font-bold text-gray-600">
                         <tr>
                            <th className="px-3 py-2">合同号</th>
                            <th className="px-3 py-2">机型</th>
                            <th className="px-3 py-2">SN</th>
                            <th className="px-3 py-2">主板SN</th>
                            <th className="px-3 py-2">CPU SN</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                         {previewRows.slice(0, 5).map((row, idx) => (
                            <tr key={idx}>
                               <td className="px-3 py-2 font-mono">{row.contract_no}</td>
                               <td className="px-3 py-2">{row.model}</td>
                               <td className="px-3 py-2 font-mono font-bold text-blue-600">{row.machine_sn || '-'}</td>
                               <td className="px-3 py-2 font-mono text-gray-500">{row.mb_sn || '-'}</td>
                               <td className="px-3 py-2 font-mono text-gray-500">{row.cpu_sn || '-'}</td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
                {previewRows.length > 5 && <div className="text-center text-xs text-gray-400">... 还有 {previewRows.length - 5} 条数据未显示</div>}
                
                <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-100 flex items-start">
                   <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                   请确认数据无误。导入后将自动进入编辑界面，您可以在那里进行最后的修改和保存。
                </div>
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
           {step === 'preview' ? (
              <button onClick={() => setStep('upload')} className="text-sm text-gray-500 hover:text-gray-800">返回重新上传</button>
           ) : <span></span>}
           
           <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 font-medium">取消</button>
              {step === 'preview' && (
                 <button onClick={confirmImport} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm flex items-center">
                    <Check className="w-4 h-4 mr-2" /> 确认导入
                 </button>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};


// --- Sub-Component: Contract Dashboard ---

const ContractDashboard: React.FC<{ 
  onNew: (contractNo: string, model: string, quantity: number, customerName: string) => void; 
  onView: (contractNo: string) => void; 
  onImport: (rows: GridRow[]) => void;
}> = ({ onNew, onView, onImport }) => {
  const [showNewModal, setShowNewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  const [newContract, setNewContract] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [newModel, setNewModel] = useState('');
  const [quantity, setQuantity] = useState<number>(50);
  
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(MOCK_MODE);

  // Load list from server or local
  useEffect(() => {
    const fetchContracts = async () => {
      // FORCE OFFLINE LOGIC IF MOCK MODE
      if (MOCK_MODE) {
          setIsOffline(true);
          try {
            const localData = localStorage.getItem(LOCAL_STORAGE_INDEX_KEY);
            if (localData) {
              setContracts(JSON.parse(localData));
            }
          } catch(e) {}
          setLoading(false);
          return;
      }

      // PRODUCTION MODE LOGIC
      try {
        const res = await fetch('/api/production/list');
        if (!res.ok) throw new Error("API Unavailable");
        
        const data = await res.json();
        if (Array.isArray(data)) {
          setContracts(data);
          setIsOffline(false);
        }
      } catch (err: any) {
        console.warn("Production API failed, showing error state:", err);
        // In strict Production mode, we do NOT fallback to local storage passively 
        // to avoid confusion, unless explicitly disconnected.
        setIsOffline(true); // Indicate connection issue
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, []);

  const handleCreateSubmit = () => {
    if (!newContract) return alert("请输入合同号");
    onNew(newContract, newModel, quantity, newCustomer);
    setShowNewModal(false);
    setNewContract(''); setNewModel(''); setNewCustomer(''); setQuantity(50);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
       <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              生产录入系统
              {isOffline ? 
                 <span className="ml-3 px-2 py-0.5 rounded bg-gray-200 text-gray-600 text-xs font-normal flex items-center" title="当前为演示模式或服务器断开"><WifiOff className="w-3 h-3 mr-1"/> 离线/演示</span> : 
                 <span className="ml-3 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-normal flex items-center" title="已连接生产数据库"><Wifi className="w-3 h-3 mr-1"/> 在线</span>
              }
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {isOffline ? "本地模式：数据仅保存在浏览器缓存中，清除缓存将丢失。" : "生产模式：数据实时保存至后端 MySQL 数据库。"}
            </p>
          </div>
          <div className="flex space-x-3">
            <button 
                onClick={() => setShowImportModal(true)}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg shadow-sm hover:bg-gray-50 flex items-center font-medium transition-colors"
            >
                <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600" /> 批量导入
            </button>
            <button 
                onClick={() => setShowNewModal(true)}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 flex items-center font-medium transition-colors"
            >
                <Plus className="w-5 h-5 mr-2" /> 新建生产批次
            </button>
          </div>
       </div>

       {loading ? (
         <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>
       ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contracts.map((item) => (
              <div 
                key={item.contractNo} 
                onClick={() => onView(item.contractNo)}
                className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group"
              >
                <div className="flex justify-between items-start mb-3">
                   <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-sm font-bold font-mono">
                     {item.contractNo}
                   </div>
                   <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
                {item.customerName && (
                  <div className="mb-2 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded w-fit">
                    客户: {item.customerName}
                  </div>
                )}
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">机型</p>
                      <p className="font-medium text-gray-800">{item.model || 'Unknown'}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-3xl font-bold text-gray-900">{item.count} <span className="text-sm text-gray-400 font-normal">/ {item.totalRows}</span></p>
                      <p className="text-xs text-gray-400">已录入 / 预计总数</p>
                   </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center text-xs text-gray-400">
                   <Database className="w-3 h-3 mr-1" /> 保存时间: {new Date(item.lastUpdated).toLocaleString()}
                </div>
              </div>
            ))}
            
            {contracts.length === 0 && (
               <div className="col-span-full py-16 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                  <Table className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>暂无生产记录，请点击右上角新建</p>
               </div>
            )}
         </div>
       )}

       {/* Import Modal */}
       <ImportWizardModal 
          isOpen={showImportModal} 
          onClose={() => setShowImportModal(false)} 
          onImport={onImport} 
       />

       {/* New Contract Modal */}
       {showNewModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
               <h3 className="text-lg font-bold text-gray-900 mb-4">新建生产合同/批次</h3>
               <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">合同号 (Contract No) <span className="text-red-500">*</span></label>
                    <input 
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="例如: 2023-CONT-001"
                      value={newContract}
                      onChange={e => setNewContract(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">预设客户名称 (可选)</label>
                    <input 
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="例如: 字节跳动"
                      value={newCustomer}
                      onChange={e => setNewCustomer(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">预计生产数量 <span className="text-red-500">*</span></label>
                    <input 
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="例如: 50"
                      value={quantity}
                      onChange={e => setQuantity(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">预设机型 (可选)</label>
                    <input 
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="例如: 551C FKF"
                      value={newModel}
                      onChange={e => setNewModel(e.target.value)}
                    />
                  </div>
               </div>
               <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setShowNewModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">取消</button>
                  <button onClick={handleCreateSubmit} className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">创建并开始</button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

// --- Sub-Component: Column Settings Modal ---
const ColumnSettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnGroup[];
  onAdd: (type: ColumnType) => void;
  onRemove: (id: string) => void;
}> = ({ isOpen, onClose, columns, onAdd, onRemove }) => {
  if (!isOpen) return null;

  const typeMap: Record<string, string> = {
    'cpu': 'CPU', 'mem': '内存', 'hdd': '硬盘', 'psu': '电源', 'pcie': 'PCIE', 'other': '其他'
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center"><Columns className="w-5 h-5 mr-2" /> 表格列设置</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500 hover:text-gray-700" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6">
            <h4 className="text-sm font-bold text-gray-700 mb-3">添加新列组</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(typeMap).map(([type, label]) => (
                <button 
                  key={type} 
                  onClick={() => onAdd(type as ColumnType)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-sm hover:bg-blue-100 flex items-center"
                >
                  <Plus className="w-3 h-3 mr-1"/> {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3">当前列配置 (点击删除)</h4>
            <div className="space-y-2">
              {columns.map((col, idx) => (
                <div key={col.id} className="flex justify-between items-center p-2 border border-gray-200 rounded bg-gray-50">
                  <div className="flex items-center">
                    <span className="text-xs text-gray-400 w-6 text-center">{idx + 1}</span>
                    <span className={`w-2 h-8 rounded-l mr-3 bg-${col.colorClass}-500 opacity-50`}></span>
                    <div>
                       <div className="font-bold text-sm text-gray-800">{col.title}</div>
                       <div className="text-xs text-gray-400">{col.fields.map(f => f.label).join(', ')}</div>
                    </div>
                  </div>
                  {col.type !== 'mb' && (
                    <button onClick={() => onRemove(col.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 border-t flex justify-end">
           <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded font-medium">完成</button>
        </div>
      </div>
    </div>
  );
};

// --- Sub-Component: Entry Grid ---

const EntryGrid: React.FC<{ 
  contractNo: string;
  initialRows?: GridRow[];
  onBack: () => void;
}> = ({ contractNo, initialRows, onBack }) => {
  const { user } = useAuth();
  
  const [rows, setRows] = useState<GridRow[]>(initialRows || []);
  const [operators, setOperators] = useState<string[]>(DEFAULT_OPERATORS);
  
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [loading, setLoading] = useState(true);

  // Dynamic Columns State
  const [columns, setColumns] = useState<ColumnGroup[]>(generateDefaultColumns());
  const [showColSettings, setShowColSettings] = useState(false);

  // Load Operators
  useEffect(() => {
    const savedSettings = localStorage.getItem('slss_system_settings');
    if (savedSettings) {
        try {
            const parsed: SystemSettings = JSON.parse(savedSettings);
            if (parsed.productionOperators && parsed.productionOperators.length > 0) {
                setOperators(parsed.productionOperators);
            }
        } catch(e) {}
    }
  }, []);

  // Initialize Data
  useEffect(() => {
    // If we have initial rows (from Import or New), use them immediately
    if (initialRows && initialRows.length > 0) {
        setRows(initialRows);
        setLoading(false);
        return;
    }

    const initData = async () => {
      setLoading(true);
      
      // BRANCH 1: Mock Mode (LocalStorage)
      if (MOCK_MODE) {
         const local = localStorage.getItem(getLocalKey(contractNo));
         if (local) {
            const json = JSON.parse(local);
            setRows(json.data);
            if (json.columnConfig) setColumns(json.columnConfig);
            setLastSavedTime(new Date(json.lastUpdated).toLocaleTimeString());
         }
         setLoading(false);
         return;
      }

      // BRANCH 2: Production Mode (API)
      try {
        const res = await fetch(`/api/production/load/${contractNo}`);
        if (res.ok) {
           const json = await res.json();
           if (json.data && Array.isArray(json.data)) {
             setRows(json.data);
             if (json.columnConfig) {
                setColumns(json.columnConfig); 
             }
             setLastSavedTime(new Date(json.lastUpdated).toLocaleTimeString());
           }
        } else if (res.status === 404) {
           // Not found is fine for new, but we usually won't hit this unless manually navigating
           setStatusMsg({ type: 'info', text: '全新批次' });
        } else {
           throw new Error("Failed to load");
        }
      } catch (e) {
        console.error("API Load failed", e);
        setStatusMsg({ type: 'error', text: '无法加载生产数据 (连接失败)' });
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [contractNo]); 

  // --- Column Management Logic ---
  const addColumnGroup = (type: ColumnType) => {
    const existing = columns.filter(c => c.type === type);
    const index = existing.length + 1;
    const id = `${type}_${Date.now()}`;
    let newGroup: ColumnGroup;

    const baseFields = [
       { key: `${type}_sn_${index}`, label: 'SN', type: 'input' as const, widthClass: 'w-24' },
       { key: `${type}_operator_${index}`, label: 'OP', type: 'select' as const, widthClass: 'w-16' }
    ];

    switch(type) {
        case 'cpu':
           newGroup = { id, type, title: `CPU ${index}`, colorClass: 'purple', fields: [{ key: `${type}_model_${index}`, label: '型号', type: 'input', widthClass: 'w-16' }, ...baseFields] }; break;
        case 'mem':
           newGroup = { id, type, title: `内存 ${index}`, colorClass: 'green', fields: [{ key: `${type}_info_${index}`, label: '信息', type: 'input', widthClass: 'w-20' }, ...baseFields] }; break;
        case 'hdd':
           newGroup = { id, type, title: `硬盘 ${index}`, colorClass: 'orange', fields: [{ key: `${type}_info_${index}`, label: '信息', type: 'input', widthClass: 'w-20' }, ...baseFields] }; break;
        case 'psu':
           newGroup = { id, type, title: `电源 ${index}`, colorClass: 'yellow', fields: [{ key: `${type}_info_${index}`, label: '信息', type: 'input', widthClass: 'w-20' }, ...baseFields] }; break;
        default:
           newGroup = { id, type, title: `${type.toUpperCase()} ${index}`, colorClass: 'gray', fields: baseFields };
    }
    
    let insertIndex = columns.length;
    const lastIndexOfType = columns.map(c => c.type).lastIndexOf(type);
    if (lastIndexOfType !== -1) insertIndex = lastIndexOfType + 1;
    else {
      const myPriority = TYPE_PRIORITY[type] || 99;
      const nextGroupIndex = columns.findIndex(c => (TYPE_PRIORITY[c.type] || 99) > myPriority);
      if (nextGroupIndex !== -1) insertIndex = nextGroupIndex;
    }

    const newColumns = [...columns];
    newColumns.splice(insertIndex, 0, newGroup);
    setColumns(newColumns);
  };

  const removeColumnGroup = (id: string) => {
    setColumns(columns.filter(c => c.id !== id));
  };

  // --- Unified Save Logic ---
  const saveData = async (dataToSave = rows, silent = false): Promise<boolean> => {
    setIsSaving(true);
    if (!silent) setStatusMsg({ type: 'info', text: '正在保存...' });

    const payload = {
        contractNo,
        data: dataToSave,
        columnConfig: columns,
        stats: { count: dataToSave.length, filled: dataToSave.filter(r => r.machine_sn).length },
        lastUpdated: new Date().toISOString()
    };

    try {
        // BRANCH 1: Mock Mode (LocalStorage)
        if (MOCK_MODE) {
            localStorage.setItem(getLocalKey(contractNo), JSON.stringify(payload));
            // Update Index
            const indexStr = localStorage.getItem(LOCAL_STORAGE_INDEX_KEY);
            const index: ContractSummary[] = indexStr ? JSON.parse(indexStr) : [];
            const existingIdx = index.findIndex(i => i.contractNo === contractNo);
            const summary: ContractSummary = {
                contractNo, 
                model: dataToSave[0]?.model || 'Unknown',
                customerName: dataToSave[0]?.customer_name,
                count: payload.stats.filled,
                totalRows: payload.stats.count,
                lastUpdated: payload.lastUpdated
            };
            if (existingIdx >= 0) index[existingIdx] = summary;
            else index.push(summary);
            localStorage.setItem(LOCAL_STORAGE_INDEX_KEY, JSON.stringify(index));

            if (!silent) setStatusMsg({ type: 'success', text: '保存成功 (本地离线)' });
        } 
        // BRANCH 2: Production Mode (API)
        else {
            const res = await fetch('/api/production/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) throw new Error("API Save Error");
            if (!silent) setStatusMsg({ type: 'success', text: '保存成功 (服务器)' });
        }

        setIsSaving(false);
        setLastSavedTime(new Date().toLocaleTimeString());
        setTimeout(() => setStatusMsg(null), 3000);
        return true;

    } catch (e) {
        setIsSaving(false);
        setStatusMsg({ type: 'error', text: '保存失败: 服务器未响应' });
        console.error(e);
        return false;
    }
  };

  const handleCellChange = useCallback((id: string, field: string, value: string) => {
    setRows(prev => {
      const rowIndex = prev.findIndex(r => r._id === id);
      if (rowIndex === -1) return prev;
      const newRows = [...prev];
      newRows[rowIndex] = { ...newRows[rowIndex], [field]: value };
      if (rowIndex === 0 && (field === 'model' || field === 'customer_name' || field.endsWith('_model') || field.endsWith('_info'))) {
        for (let i = 1; i < newRows.length; i++) newRows[i] = { ...newRows[i], [field]: value };
      }
      return newRows;
    });
  }, []);

  const addNewRow = () => {
    const lastRow = rows[rows.length - 1];
    setRows(prev => [...prev, { 
      _id: Date.now().toString() + Math.random(),
      contract_no: contractNo,
      model: rows[0]?.model || lastRow?.model || '',
      customer_name: rows[0]?.customer_name || lastRow?.customer_name || '',
      machine_sn: ''
    }]);
  };

  const deleteRow = (id: string) => {
    if (rows.length === 1 && !confirm("这是最后一行，确定删除吗？")) return;
    setRows(rows.filter(r => r._id !== id));
  };

  const handleFinish = async () => {
    const success = await saveData(rows);
    if (success) {
        setTimeout(() => {
            onBack();
        }, 500);
    }
  };

  const OperatorSelect = ({ value, onChange }: { value?: string, onChange: (v: string) => void }) => (
    <select className="w-full h-full border-none bg-transparent outline-none text-xs text-gray-600 focus:bg-white text-center cursor-pointer appearance-none hover:bg-gray-50" value={value || ''} onChange={e => onChange(e.target.value)}>
       <option value="">(空)</option>
       {operators.map(op => <option key={op} value={op}>{op}</option>)}
    </select>
  );

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400"/></div>;

  const colorMap: Record<string, string> = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      orange: 'bg-orange-50 border-orange-200 text-orange-800',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      gray: 'bg-gray-50 border-gray-200 text-gray-800'
  };

  return (
    <div className="space-y-4 h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center shrink-0 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
             <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full mr-2 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
             </button>
             <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                   <ScanLine className="w-5 h-5 mr-2 text-blue-600"/> 
                   <span className="font-mono">{contractNo}</span>
                   {rows[0]?.customer_name && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded flex items-center">{rows[0].customer_name}</span>}
                </h2>
                <div className="text-xs text-gray-400 mt-0.5 flex space-x-3">
                   <span className="flex items-center"><Database className="w-3 h-3 mr-1"/> Last Save: {lastSavedTime || 'Unsaved'}</span>
                </div>
             </div>
          </div>

          <div className="flex items-center space-x-3">
              <div className="hidden lg:flex items-center text-xs text-orange-600 bg-orange-50 px-3 py-1.5 rounded border border-orange-100">
                  <ArrowDownToLine className="w-3 h-3 mr-1"/> 提示: 修改第一行自动同步
              </div>
              {statusMsg && (
                <div className={`px-3 py-1.5 rounded text-sm flex items-center font-medium animate-pulse transition-all ${statusMsg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : statusMsg.type === 'info' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                   {statusMsg.type === 'error' ? <AlertCircle className="w-4 h-4 mr-2"/> : <Check className="w-4 h-4 mr-2"/>} {statusMsg.text}
                </div>
              )}
              <button onClick={() => setShowColSettings(true)} className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center text-sm font-medium shadow-sm"><Settings className="w-4 h-4 mr-1 text-gray-600"/> 列设置</button>
              <button onClick={addNewRow} className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center text-sm font-medium shadow-sm"><Plus className="w-4 h-4 mr-1"/> 加行</button>
              <button onClick={() => saveData(rows)} disabled={isSaving} className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-70 flex items-center text-sm font-bold shadow-md transform active:scale-95 transition-all">
                 {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>} 保存数据
              </button>
          </div>
       </div>

       <div className="bg-white rounded-lg shadow border border-gray-200 flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto custom-scrollbar">
             <table className="min-w-max divide-y divide-gray-200 border-collapse">
                <thead className="bg-gray-100 sticky top-0 z-20 shadow-sm text-xs font-bold text-gray-600">
                    <tr>
                        <th className="p-0 sticky left-0 z-30 bg-gray-100 border-r border-b w-14">NO.</th>
                        <th className="p-0 sticky left-14 z-30 bg-gray-100 border-r border-b w-28 text-left px-2 shadow-md">合同号</th>
                        <th className="p-0 border-r border-b w-32 px-1 text-center">客户名称</th>
                        <th className="p-0 border-r border-b w-24 px-1">机型</th>
                        <th className="p-0 border-r border-b w-40 px-1">机器 SN</th>
                        {columns.map(col => (<th key={col.id} className={`border-r border-b px-1 ${colorMap[col.colorClass]}`} colSpan={col.fields.length}>{col.title}</th>))}
                        <th className="p-0 border-b w-10">Del</th>
                    </tr>
                    <tr className="bg-gray-50 text-[10px] text-gray-500 font-normal">
                        <th className="sticky left-0 bg-gray-50 z-30 border-r border-b"></th>
                        <th className="sticky left-14 bg-gray-50 z-30 border-r border-b shadow-md"></th>
                        <th className="border-r border-b"></th>
                        <th className="border-r border-b"></th>
                        <th className="border-r border-b"></th>
                        {columns.map(col => (col.fields.map(field => (<th key={`${col.id}_${field.key}`} className={`border-r border-b px-1 ${field.widthClass || 'w-20'}`}>{field.label}</th>))))}
                        <th className="border-b"></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {rows.map((row, idx) => (
                        <tr key={row._id} className={`${idx === 0 ? 'bg-yellow-50/60 border-b-2 border-yellow-100 shadow-inner' : 'hover:bg-blue-50/30'} group transition-colors`}>
                            <td className={`text-center text-xs border-r sticky left-0 z-10 ${idx === 0 ? 'bg-yellow-100/80' : 'bg-white group-hover:bg-blue-50/30'}`}>{idx === 0 ? <span className="inline-block px-1 bg-yellow-400 text-yellow-900 text-[10px] rounded font-bold shadow-sm">模板</span> : <span className="text-gray-400">{idx + 1}</span>}</td>
                            <td className={`p-0 border-r sticky left-14 z-10 shadow-md ${idx === 0 ? 'bg-yellow-50/50' : 'bg-gray-50 group-hover:bg-gray-100'}`}><div className="w-full h-full px-2 py-2 text-xs font-mono font-bold text-gray-500 flex items-center truncate">{row.contract_no}</div></td>
                            <td className="p-0 border-r"><FastInput value={row.customer_name} onChange={(v) => handleCellChange(row._id, 'customer_name', v)} className="w-full h-full px-2 py-2 outline-none text-xs transition-colors text-center bg-transparent" /></td>
                            <td className="p-0 border-r"><FastInput value={row.model} onChange={(v) => handleCellChange(row._id, 'model', v)} className="w-full h-full px-2 py-2 outline-none text-xs transition-colors text-center bg-transparent" /></td>
                            <td className="p-0 border-r"><FastInput value={row.machine_sn} onChange={(v) => handleCellChange(row._id, 'machine_sn', v)} placeholder="Scan SN" className={`w-full h-full px-2 py-2 outline-none text-xs transition-colors text-center ${getValidationClass(row.machine_sn)}`} /></td>
                            {columns.map(col => (col.fields.map(field => (<td key={`${col.id}_${field.key}`} className={`p-0 border-r ${field.type === 'select' ? 'bg-gray-50/50' : ''}`}>{field.type === 'select' ? <OperatorSelect value={row[field.key]} onChange={(v) => handleCellChange(row._id, field.key, v)} /> : <FastInput value={row[field.key]} onChange={(v) => handleCellChange(row._id, field.key, v)} className={`w-full h-full px-2 py-2 outline-none text-xs transition-colors text-center bg-transparent ${getValidationClass(row[field.key])}`} />}</td>))))}
                            <td className="px-2 py-2 text-center border-l"><button onClick={() => deleteRow(row._id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4 mx-auto"/></button></td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={100} className="py-10 text-center text-gray-400">表格为空，请点击上方“加行”</td></tr>}
                </tbody>
             </table>
          </div>
       </div>

       <div className="flex justify-center pb-2">
           <button
             onClick={handleFinish}
             disabled={isSaving}
             className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md flex items-center text-base font-bold transition-all transform active:scale-95"
           >
             {isSaving ? <Loader2 className="w-5 h-5 mr-2 animate-spin"/> : <CheckCircle className="w-5 h-5 mr-2"/>}
             完成所有录入并返回
           </button>
       </div>

       <ColumnSettingsModal isOpen={showColSettings} onClose={() => setShowColSettings(false)} columns={columns} onAdd={addColumnGroup} onRemove={removeColumnGroup} />
    </div>
  );
};

const ProductionImport: React.FC = () => {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [selectedContract, setSelectedContract] = useState('');
  const [initialRows, setInitialRows] = useState<GridRow[] | undefined>(undefined);
  const [importTimestamp, setImportTimestamp] = useState(0);

  return (
    <div className="h-[calc(100vh-6rem)]">
      {view === 'dashboard' && (
        <ContractDashboard 
          onNew={(contractNo, model, quantity, customer) => {
            const newRows: GridRow[] = Array.from({ length: quantity }).map(() => ({ _id: Math.random().toString(36).substr(2, 9), contract_no: contractNo, model: model, machine_sn: '', customer_name: customer }));
            setSelectedContract(contractNo);
            setInitialRows(newRows);
            setView('entry');
          }}
          onView={(contractNo) => {
            setSelectedContract(contractNo);
            setInitialRows(undefined);
            setView('entry');
          }}
          onImport={(rows) => {
            setSelectedContract(rows[0].contract_no);
            setInitialRows(rows);
            setImportTimestamp(Date.now());
            setView('entry');
          }}
        />
      )}
      {view === 'entry' && (
        <EntryGrid 
          key={selectedContract ? `${selectedContract}-${importTimestamp}` : 'entry-grid'}
          contractNo={selectedContract}
          initialRows={initialRows}
          onBack={() => setView('dashboard')}
        />
      )}
    </div>
  );
};

export default ProductionImport;
