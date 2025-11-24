
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileSpreadsheet, Save, Plus, Trash2, RefreshCw, Database, ScanLine, Camera, X, Volume2, VolumeX, Wifi, WifiOff, Cloud, Check, Loader2, AlertCircle, Printer } from 'lucide-react';
import { Asset } from '../types';
import { MOCK_ASSETS } from '../services/mockData';

// Utility to generate batch name
const generateBatchName = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `PROD_${yyyy}${mm}${dd}_${hh}${min}`;
};

interface GridRow extends Partial<Asset> {
  _id: string; // Temp ID for React keys
  syncStatus: 'draft' | 'synced'; // New field for dual-status
}

const ProductionEntry: React.FC = () => {
  // -- State --
  const [batchName, setBatchName] = useState(generateBatchName());
  const [rows, setRows] = useState<GridRow[]>([
    { _id: '1', contract_no: '', model: '', machine_sn: '', syncStatus: 'draft' }
  ]);
  const [activeTab, setActiveTab] = useState<'scan' | 'import'>('scan');
  
  // UX State
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScanStatus, setLastScanStatus] = useState<'success' | 'error' | 'neutral'>('neutral');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [labelToPrint, setLabelToPrint] = useState<GridRow | null>(null);

  // Network State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const audioContextRef = useRef<AudioContext | null>(null);
  const scannerRef = useRef<any>(null);
  const scannerMountedRef = useRef<boolean>(false);
  const [isScanning, setIsScanning] = useState(false);

  // -- Network Listener --
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // -- Atomic Save Logic (Throttled) --
  // We use a ref to track if save is needed to avoid stale closures in setTimeout
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const batchNameRef = useRef(batchName);
  batchNameRef.current = batchName;

  const saveToLocal = useCallback(() => {
    try {
      localStorage.setItem('slss_prod_draft_v2', JSON.stringify({
        batchName: batchNameRef.current,
        rows: rowsRef.current
      }));
      const now = new Date();
      setLastSavedTime(`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`);
    } catch (e) {
      console.error("Local Save Failed", e);
    }
  }, []);

  // Trigger save on changes with short debounce (300ms) for "Atomic" feel without freezing UI
  useEffect(() => {
    const timeout = setTimeout(saveToLocal, 300);
    return () => clearTimeout(timeout);
  }, [rows, batchName, saveToLocal]);

  // Load Draft on Mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('slss_prod_draft_v2');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.rows && parsed.rows.length > 0) {
          setRows(parsed.rows);
          setBatchName(parsed.batchName || generateBatchName());
          setStatusMsg({ type: 'info', text: '已恢复上次未提交的草稿数据 (本地缓存)' });
        }
      } catch (e) {
        console.error("Failed to load draft");
      }
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch((e: any) => console.warn("Scanner stop error", e));
          scannerRef.current.clear();
        } catch (e) {}
      }
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // -- Audio Feedback --
  const playFeedbackSound = (type: 'success' | 'error') => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.15);
      } else {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.3);
      }
    } catch (e) { console.warn("Audio failed", e); }
  };

  // -- Handlers --

  const handleCellChange = (id: string, field: keyof Asset, value: string) => {
    setRows(prev => prev.map(r => {
      if (r._id === id) {
        // If editing a synced row, revert it to draft
        const newStatus = r.syncStatus === 'synced' ? 'draft' : r.syncStatus;
        return { ...r, [field]: value, syncStatus: newStatus };
      }
      return r;
    }));
  };

  const checkDuplicate = (value: string, currentId: string): boolean => {
    if (!value || value.length < 4) return false;
    // 1. Check current batch
    const inCurrentBatch = rows.some(r => r._id !== currentId && Object.values(r).some(v => v === value));
    // 2. Check history
    const inHistory = MOCK_ASSETS.some(a => Object.values(a).some(v => v === value));
    return inCurrentBatch || inHistory;
  };

  const addNewRow = (autoFocus = false) => {
    const lastRow = rows[rows.length - 1];
    const newRow: GridRow = { 
      _id: Date.now().toString(),
      contract_no: lastRow?.contract_no || '',
      invoice_date: lastRow?.invoice_date || '',
      model: lastRow?.model || '',
      machine_sn: '',
      syncStatus: 'draft'
    };
    setRows(prev => [...prev, newRow]);
  };

  const deleteRow = (id: string) => {
    if (rows.length === 1) {
       setRows([{ _id: Date.now().toString(), contract_no: '', model: '', machine_sn: '', syncStatus: 'draft' }]);
       return;
    }
    setRows(rows.filter(r => r._id !== id));
  };

  const handlePrintLabel = (row: GridRow) => {
    if (!row.machine_sn) {
      setStatusMsg({ type: 'error', text: '无法打印：缺少 SN' });
      return;
    }
    setLabelToPrint(row);
    // Slight delay to allow DOM to render the printable area
    setTimeout(() => {
      window.print();
      // Optional: Clear label after print (or keep it, doesn't matter since it's hidden)
      // setLabelToPrint(null); 
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.currentTarget.value.trim();
      
      if (checkDuplicate(val, id)) {
        playFeedbackSound('error');
        setLastScanStatus('error');
        setTimeout(() => setLastScanStatus('neutral'), 500);
        e.currentTarget.select();
        setStatusMsg({ type: 'error', text: `警告: SN [${val}] 已存在！` });
        return;
      }

      if (val.length > 0) {
        playFeedbackSound('success');
        setLastScanStatus('success');
        setTimeout(() => setLastScanStatus('neutral'), 300);
      }

      const inputs = Array.from(document.querySelectorAll('.scanner-input'));
      const currentIndex = inputs.indexOf(e.currentTarget);
      
      if (currentIndex !== -1 && currentIndex < inputs.length - 1) {
        (inputs[currentIndex + 1] as HTMLElement).focus();
      } else {
        addNewRow();
        playFeedbackSound('success');
        setTimeout(() => {
          const newInputs = Array.from(document.querySelectorAll('.scanner-input'));
          if (newInputs.length > currentIndex + 1) {
             (newInputs[currentIndex + 1] as HTMLElement).focus();
          }
        }, 100);
      }
    }
  };

  const handleSync = async () => {
    if (!isOnline) {
      setStatusMsg({ type: 'error', text: '当前处于离线状态，无法同步数据。数据已保存至本地。' });
      return;
    }

    const draftRows = rows.filter(r => r.syncStatus === 'draft' && r.machine_sn);
    if (draftRows.length === 0) {
      setStatusMsg({ type: 'info', text: '没有需要同步的草稿数据。' });
      return;
    }

    setIsSyncing(true);

    // Simulate Network Request
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Fake delay

      // 1. Transform to Assets
      const newAssets: Asset[] = draftRows.map(r => ({
        machine_sn: r.machine_sn!,
        contract_no: r.contract_no || 'UNKNOWN',
        model: r.model || 'UNKNOWN',
        invoice_date: r.invoice_date || new Date().toISOString().split('T')[0],
        batch_name: batchName,
        mb_model: r.mb_model,
        mb_sn: r.mb_sn,
        cpu_model: r.cpu_model,
        cpu_sn: r.cpu_sn,
        cpu_sn_2: r.cpu_sn_2,
        psu_info: r.psu_info,
        psu_cage_sn: r.psu_cage_sn,
        psu_module_1_sn: r.psu_module_1_sn,
        psu_module_2_sn: r.psu_module_2_sn,
        hdd_info: r.hdd_info,
        hdd_sn: r.hdd_sn,
        mem_info: r.mem_info,
        mem_sns: r.mem_sns,
        pcie_sn: r.pcie_sn,
        created_at: new Date().toISOString(),
        factory_config_json: JSON.stringify({
           mb: { model: r.mb_model, sn: r.mb_sn },
           cpu: [{ model: r.cpu_model, sn: r.cpu_sn }, { sn: r.cpu_sn_2 }],
           psu: { info: r.psu_info, cage_sn: r.psu_cage_sn, modules: [r.psu_module_1_sn, r.psu_module_2_sn] },
           storage: { model: r.hdd_info, sn: r.hdd_sn },
           memory: { model: r.mem_info, sns: r.mem_sns },
           pcie: [{ sn: r.pcie_sn }] // Sync PCIE SN if available
        })
      }));

      // 2. Commit to Mock DB
      MOCK_ASSETS.unshift(...newAssets);

      // 3. Update Local State: Mark uploaded rows as 'synced'
      setRows(prev => prev.map(r => {
         if (r.syncStatus === 'draft' && r.machine_sn) {
           return { ...r, syncStatus: 'synced' };
         }
         return r;
      }));

      setStatusMsg({ type: 'success', text: `同步成功！已上传 ${draftRows.length} 条数据。` });

    } catch (e) {
      setStatusMsg({ type: 'error', text: '同步失败，请检查网络连接。' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      
      // Limit to 1MB
      if (file.size > 1024 * 1024) {
        setStatusMsg({ type: 'error', text: "文件大小不能超过 1MB" });
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          if (!(window as any).XLSX) { 
             setStatusMsg({ type: 'error', text: "Excel组件未加载，请刷新页面" });
             return; 
          }
          const wb = (window as any).XLSX.read(evt.target?.result, { type: 'array' });
          const data = (window as any).XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          
          if (!data || data.length === 0) {
             throw new Error("无数据");
          }

          const mappedRows = data.map((d: any, idx: number) => ({
             _id: `imp_${idx}_${Date.now()}`,
             contract_no: d['合同号'] || '',
             invoice_date: d['发货日期'] || '',
             model: d['型号'] || '',
             machine_sn: d['SN'] || '', 
             mb_model: d['主板型号'] || '',
             mb_sn: d['SN_1'] || '', 
             cpu_model: d['CPU型号'] || '',
             cpu_sn: d['CPU序列号'] || '',
             cpu_sn_2: d['CPU序列号_1'] || '',
             psu_info: d['电源品牌、型号'] || '',
             psu_cage_sn: d['SN_2'] || '', 
             psu_module_1_sn: d['模块1'] || '',
             psu_module_2_sn: d['模块2'] || '',
             hdd_info: d['硬盘'] || '',
             hdd_sn: d['SN_3'] || '',
             mem_info: d['内存品牌、主频'] || '',
             mem_sns: ``, // Simplified
             pcie_sn: d['PCIE'] || '',
             syncStatus: 'draft' // Import as draft
          }));
          
          setRows(prev => [...prev.filter(r => r.machine_sn), ...mappedRows]);
          setActiveTab('scan');
          setStatusMsg({ type: 'success', text: `已导入 ${mappedRows.length} 条数据 (草稿)` });
        } catch (err: any) { 
           console.error(err);
           setStatusMsg({ type: 'error', text: `导入出错: ${err.message}` });
        }
      };
      reader.onerror = () => {
         setStatusMsg({ type: 'error', text: "文件读取失败" });
      };
      reader.readAsArrayBuffer(file);
      e.target.value = '';
    }
  };

  const startScanning = () => {
    if (!(window as any).Html5Qrcode) { alert("Scanner lib missing"); return; }
    setIsScanning(true);
    scannerMountedRef.current = true;
    setTimeout(() => {
      if (!scannerMountedRef.current) return;
      const html5QrcodeScanner = new (window as any).Html5Qrcode("reader");
      scannerRef.current = html5QrcodeScanner;
      html5QrcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
           playFeedbackSound('success');
           setRows(currentRows => {
              const lastRow = currentRows[currentRows.length - 1];
              if (lastRow.machine_sn && lastRow.machine_sn !== decodedText) {
                 return [...currentRows, { _id: Date.now().toString(), contract_no: lastRow.contract_no, model: lastRow.model, machine_sn: decodedText, syncStatus: 'draft' }];
              } else if (!lastRow.machine_sn) {
                 return currentRows.map(r => r._id === lastRow._id ? { ...r, machine_sn: decodedText } : r);
              }
              return currentRows;
           });
        }, () => {}
      ).catch(() => { setIsScanning(false); });
    }, 100);
  };
  const stopScanning = () => {
    scannerMountedRef.current = false;
    if (scannerRef.current) scannerRef.current.stop().then(() => { scannerRef.current.clear(); setIsScanning(false); });
    else setIsScanning(false);
  };

  // Counters
  const pendingCount = rows.filter(r => r.syncStatus === 'draft' && r.machine_sn).length;
  const syncedCount = rows.filter(r => r.syncStatus === 'synced').length;

  return (
    <div className="space-y-6">
      {/* Hidden Label Template */}
      <div 
         className="printable-content fixed top-0 left-0 -z-50 opacity-0" 
         style={{ width: '100mm', height: '60mm', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}
      >
        {labelToPrint && (
           <div className="w-full h-full p-2 border-2 border-black flex flex-col justify-between box-border bg-white text-black">
              <div className="flex justify-between items-start">
                 <div>
                    <h1 className="text-xl font-bold tracking-tighter">SERVER TAG</h1>
                    <p className="text-xs font-bold mt-1">SN: <span className="text-lg font-mono">{labelToPrint.machine_sn}</span></p>
                    <p className="text-xs mt-1">Model: {labelToPrint.model}</p>
                 </div>
                 <div className="w-20 h-20 bg-white">
                    {/* Use a public QR code API for the label */}
                    <img 
                       src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${labelToPrint.machine_sn}`} 
                       alt="QR" 
                       className="w-full h-full object-contain" 
                    />
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-1 text-[10px] leading-tight mt-2 border-t border-black pt-1">
                 <div>
                    <span className="font-bold">CPU:</span> {labelToPrint.cpu_model || 'N/A'}
                 </div>
                 <div>
                    <span className="font-bold">MEM:</span> {labelToPrint.mem_info ? 'Included' : '-'}
                 </div>
                 <div>
                    <span className="font-bold">HDD:</span> {labelToPrint.hdd_info ? 'Included' : '-'}
                 </div>
                 <div>
                    <span className="font-bold">Date:</span> {new Date().toLocaleDateString()}
                 </div>
              </div>

              <div className="text-[9px] text-center mt-auto font-bold uppercase tracking-widest">
                 TIGERWAY INNOVATION
              </div>
           </div>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
             <ScanLine className="mr-2 text-blue-600" /> 生产录入系统
          </h1>
          <div className="flex items-center text-xs text-gray-500 mt-1 space-x-3">
             <span className="flex items-center">
               <Database className="w-3 h-3 mr-1" /> 本地缓存 (Atomic Save): 
               <span className="ml-1 font-mono text-gray-700">{lastSavedTime || 'Pending...'}</span>
             </span>
             <span className="flex items-center">
               {isOnline ? <Wifi className="w-3 h-3 mr-1 text-green-500"/> : <WifiOff className="w-3 h-3 mr-1 text-red-500"/>}
               {isOnline ? '网络在线' : '离线模式 (Offline)'}
             </span>
          </div>
        </div>
        
        <div className="flex space-x-3 items-center">
           <button 
             onClick={() => setSoundEnabled(!soundEnabled)}
             className={`p-2 rounded border transition-colors ${soundEnabled ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}
             title={soundEnabled ? "提示音: 开" : "提示音: 关"}
           >
             {soundEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}
           </button>
           <div className="flex rounded-md shadow-sm">
             <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
               批次号
             </span>
             <input 
                type="text" 
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="flex-1 min-w-0 block w-48 px-3 py-2 rounded-none rounded-r-md border border-gray-300 sm:text-sm focus:ring-blue-500 focus:border-blue-500"
             />
           </div>
        </div>
      </div>

      {statusMsg && (
        <div className={`border px-4 py-3 rounded flex justify-between items-center animate-in slide-in-from-top-2 ${
           statusMsg.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
           statusMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
           'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center">
             {statusMsg.type === 'error' && <AlertCircle className="w-4 h-4 mr-2"/>}
             {statusMsg.type === 'success' && <Check className="w-4 h-4 mr-2"/>}
             <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="opacity-50 hover:opacity-100"><X className="w-4 h-4"/></button>
        </div>
      )}

      {isScanning && (
         <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg overflow-hidden w-full max-w-md shadow-2xl relative">
               <button onClick={stopScanning} className="absolute top-4 right-4 p-2 bg-white/50 rounded-full hover:bg-white text-black z-10"><X className="w-6 h-6"/></button>
               <div id="reader" className="w-full h-64 bg-black"></div>
               <div className="p-4 text-center bg-white"><p className="font-bold text-gray-800">正在扫描...</p></div>
            </div>
         </div>
      )}

      <div className={`bg-white rounded-lg shadow border transition-all duration-200 overflow-hidden ${lastScanStatus === 'error' ? 'ring-4 ring-red-300' : lastScanStatus === 'success' ? 'ring-4 ring-green-300' : 'border-gray-200'}`}>
         {/* Tabs */}
         <div className="flex border-b border-gray-200">
           <button onClick={() => setActiveTab('scan')} className={`flex-1 py-4 px-6 text-center font-medium text-sm ${activeTab === 'scan' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'}`}>扫码/网格录入</button>
           <button onClick={() => setActiveTab('import')} className={`flex-1 py-4 px-6 text-center font-medium text-sm ${activeTab === 'import' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'}`}>Excel 批量导入</button>
         </div>

         <div className="p-0">
           {activeTab === 'import' && (
             <div className="p-10 text-center">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 hover:bg-gray-50 transition-colors inline-block w-full max-w-2xl">
                  <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                  <label className="mt-4 block cursor-pointer">
                    <span className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition">选择 Excel 文件</span>
                    <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleExcelImport} />
                  </label>
                </div>
             </div>
           )}

           {activeTab === 'scan' && (
             <div className="overflow-x-auto relative">
               <div className="p-4 bg-blue-50/50 flex items-center justify-between border-b border-blue-100">
                  <div className="text-sm text-blue-800 flex items-center">
                     <span className="font-bold mr-2">操作指引:</span> 
                     <span className="bg-white border border-blue-200 px-2 py-0.5 rounded text-xs font-mono mr-1">Enter</span> 跳格 
                  </div>
                  <button onClick={startScanning} className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"><Camera className="w-4 h-4 mr-2"/> 摄像头</button>
               </div>
               
               <div className="w-full overflow-x-scroll pb-4">
                 <table className="w-full divide-y divide-gray-200" style={{ minWidth: '2200px' }}>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="sticky left-0 bg-gray-50 z-10 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-10 border-r">No.</th>
                      <th className="sticky left-10 bg-gray-50 z-10 px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase w-16 border-r shadow-sm">状态</th>
                      <th className="sticky left-28 bg-gray-50 z-10 px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase w-40 bg-yellow-50 border-r shadow-sm">整机 SN</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">合同号</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">型号</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32 bg-gray-50/50">主板型号</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32 bg-gray-50/50">主板 SN</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">CPU型号</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">CPU1 SN</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">CPU2 SN</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32 bg-gray-50/50">电源信息</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32 bg-gray-50/50">电源笼 SN</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32 bg-gray-50/50">模块1 SN</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32 bg-gray-50/50">模块2 SN</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">硬盘 SN</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">内存信息</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">内存 SN(s)</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32 bg-purple-50">PCIE SN</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20 sticky right-0 bg-gray-50">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rows.map((row, idx) => (
                      <tr key={row._id} className="hover:bg-gray-50 group">
                        <td className="sticky left-0 bg-white z-10 px-3 py-2 text-xs text-gray-400 text-center border-r">{idx + 1}</td>
                        
                        {/* Status Column */}
                        <td className="sticky left-10 bg-white z-10 p-1 text-center border-r shadow-sm">
                           {row.syncStatus === 'synced' ? (
                              <div className="flex justify-center text-green-500" title="已同步 (Cloud)"><Cloud className="w-5 h-5 fill-current" /></div>
                           ) : (
                              row.machine_sn ? <div className="flex justify-center text-gray-400" title="本地草稿 (Draft)"><Check className="w-5 h-5" /></div> : <div className="w-5 h-5 rounded-full border border-gray-200 mx-auto"></div>
                           )}
                        </td>

                        <td className="sticky left-28 bg-white z-10 p-1 bg-yellow-50 border-r shadow-sm">
                           <input 
                            className={`scanner-input w-full border-0 border-b-2 border-transparent focus:border-blue-500 focus:ring-0 bg-transparent text-sm font-bold p-1 transition-colors focus:bg-white ${row.syncStatus === 'synced' ? 'text-green-700' : 'text-gray-900'}`}
                            value={row.machine_sn}
                            placeholder="SN..."
                            onKeyDown={(e) => handleKeyDown(e, row._id)}
                            onChange={e => handleCellChange(row._id, 'machine_sn', e.target.value)}
                          />
                        </td>
                        
                        {/* Fields */}
                        <td className="p-1"><input className="scanner-input w-full bg-transparent text-xs p-1 focus:bg-white" value={row.contract_no} onKeyDown={(e) => handleKeyDown(e, row._id)} onChange={e => handleCellChange(row._id, 'contract_no', e.target.value)} /></td>
                        <td className="p-1"><input className="scanner-input w-full bg-transparent text-xs p-1 focus:bg-white" value={row.model} onKeyDown={(e) => handleKeyDown(e, row._id)} onChange={e => handleCellChange(row._id, 'model', e.target.value)} /></td>
                        <td className="p-1 bg-gray-50/30"><input className="scanner-input w-full bg-transparent text-xs p-1 focus:bg-white" value={row.mb_model || ''} onKeyDown={(e) => handleKeyDown(e, row._id)} onChange={e => handleCellChange(row._id, 'mb_model', e.target.value)} /></td>
                        <td className="p-1 bg-gray-50/30"><input className="scanner-input w-full bg-transparent text-xs p-1 focus:bg-white" value={row.mb_sn || ''} onKeyDown={(e) => handleKeyDown(e, row._id)} onChange={e => handleCellChange(row._id, 'mb_sn', e.target.value)} /></td>
                        <td className="p-1"><input className="scanner-input w-full bg-transparent text-xs p-1 focus:bg-white" value={row.cpu_model || ''} onKeyDown={(e) => handleKeyDown(e, row._id)} onChange={e => handleCellChange(row._id, 'cpu_model', e.target.value)} /></td>
                        <td className="p-1"><input className="scanner-input w-full bg-transparent text-xs p-1 focus:bg-white" value={row.cpu_sn || ''} onKeyDown={(e) => handleKeyDown(e, row._id)} onChange={e => handleCellChange(row._id, 'cpu_sn', e.target.value)} /></td>
                        <td className="p-1"><input className="scanner-input w-full bg-transparent text-xs p-1 focus:bg-white" value={row.cpu_sn_2 || ''} onKeyDown={(e) => handleKeyDown(e, row._id)} onChange={e => handleCellChange(row._id, 'cpu_sn_2', e.target.value)} /></td>
                        <td className="p-1 bg-gray-50/30"><input className="scanner-input w-full bg-transparent text-xs p-1 focus:bg-white" value={row.psu_info || ''} onKeyDown={(e) => handleKeyDown(e, row._id)} onChange={e => handleCellChange(row._id, 'psu_info', e.target.value)} /></td>
                        <td className="p-1 bg-gray-50/30"><input className="scanner-input w-full bg-transparent text-xs p-1 focus:bg-white" value={row.psu_cage_sn || ''} onKeyDown={(e) => handleKeyDown(e, row._id)} onChange={e => handleCellChange(row._id, 'psu_cage_sn', e.target.value)} /></td>
                        <td className="p-1 bg-gray-50/30"><input className="scanner-input w-full bg-transparent text-xs p-1 focus:bg-white" value={row.psu_module_1_sn || ''} onKeyDown={(e) => handleKeyDown(e, row._id)} onChange={e => handleCellChange(row._id, 'psu_module_1_sn', e.target.value)} /></td>
                        <td className="p-1 bg-gray-50/30"><input className="scanner-input w-full bg-transparent text-xs p-1 focus:bg-white" value={row.psu_module_2_sn || ''} onKeyDown={(e) => handleKeyDown(e, row._id)} onChange={e => handleCellChange(row._id, 'psu_module_2_sn', e.target.value)} /></td>
                        <td className="p-1"><input className="scanner-input w-full bg-transparent text-xs p-1 focus:bg-white" value={row.hdd_sn || ''} onKeyDown={(e) => handleKeyDown(e, row._id)} onChange={e => handleCellChange(row._id, 'hdd_sn', e.target.value)} /></td>
                        <td className="p-1"><input className="scanner-input w-full bg-transparent text-xs p-1 focus:bg-white" value={row.mem_info || ''} onKeyDown={(e) => handleKeyDown(e, row._id)} onChange={e => handleCellChange(row._id, 'mem_info', e.target.value)} /></td>
                        <td className="p-1"><input className="scanner-input w-full bg-transparent text-xs p-1 focus:bg-white" value={row.mem_sns || ''} onKeyDown={(e) => handleKeyDown(e, row._id)} onChange={e => handleCellChange(row._id, 'mem_sns', e.target.value)} /></td>
                        <td className="p-1 bg-purple-50/30"><input className="scanner-input w-full bg-transparent text-xs p-1 font-medium text-purple-700 focus:bg-white" value={row.pcie_sn || ''} onKeyDown={(e) => handleKeyDown(e, row._id)} onChange={e => handleCellChange(row._id, 'pcie_sn', e.target.value)} /></td>

                        <td className="sticky right-0 bg-white z-10 px-3 py-2 text-center border-l flex space-x-1 justify-center">
                          {row.syncStatus === 'synced' && (
                             <button onClick={() => handlePrintLabel(row)} className="text-gray-300 hover:text-blue-600 p-1" title="打印标签">
                                <Printer className="w-4 h-4" />
                             </button>
                          )}
                          <button onClick={() => deleteRow(row._id)} className="text-gray-300 hover:text-red-500 p-1" title="删除行">
                             <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
               </div>
             </div>
           )}
         </div>

         <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center">
            <div className="text-xs text-gray-500 flex items-center space-x-4">
              <span className="flex items-center"><Check className="w-3 h-3 mr-1"/> 待同步: {pendingCount}</span>
              <span className="flex items-center text-green-600"><Cloud className="w-3 h-3 mr-1"/> 已同步: {syncedCount}</span>
            </div>
            <div className="flex space-x-3">
               <button onClick={() => addNewRow(true)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-50 flex items-center text-sm font-medium">
                 <Plus className="w-4 h-4 mr-2" /> 新增一行
               </button>
               <button 
                 onClick={handleSync}
                 disabled={isSyncing || !isOnline}
                 className={`px-6 py-2 rounded shadow-sm flex items-center text-sm font-medium text-white transition-all ${
                   !isOnline ? 'bg-gray-400 cursor-not-allowed' : 
                   isSyncing ? 'bg-blue-400 cursor-wait' : 
                   pendingCount > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                 }`}
               >
                 {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Cloud className="w-4 h-4 mr-2" />} 
                 {isSyncing ? '同步中...' : !isOnline ? '网络离线' : `同步数据 (${pendingCount})`}
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default ProductionEntry;
