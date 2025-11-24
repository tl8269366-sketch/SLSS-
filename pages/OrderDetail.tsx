
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MOCK_ORDERS } from '../services/mockData';
import { analyzeFault, AnalysisResult } from '../services/geminiService';
import { OrderStatus, RepairOrder } from '../types';
import { 
  Cpu, Activity, Truck, Save, CheckCircle, 
  AlertTriangle, Microscope, Wrench, ClipboardCheck, 
  ChevronRight, RefreshCw, CircuitBoard, HardDrive, Zap, Server, 
  Eye, Code, ArrowLeft, BrainCircuit, PenLine, Plus, Trash2, Printer, FileText, X, FileCheck, Play, Download,
  CreditCard, Package
} from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Workflow Steps
const STEPS = [
  { id: 'diagnosis', label: '1. 故障复现与诊断', icon: Microscope },
  { id: 'repair', label: '2. 配件调拨与维修', icon: Wrench },
  { id: 'qa', label: '3. 老化与质检', icon: ClipboardCheck },
  { id: 'report', label: '4. 维修报告与确认', icon: FileText },
  { id: 'logistics', label: '5. 物流与交付', icon: Truck },
];

// --- Sub-components ---

const ConfigViewer: React.FC<{ jsonString?: string }> = ({ jsonString }) => {
  let data: any = {};
  
  if (!jsonString) {
    return <div className="text-gray-400 text-xs italic p-4 text-center border border-dashed border-gray-200 rounded-lg">暂无配置数据</div>;
  }
  try { data = JSON.parse(jsonString); } catch (e) { return <div className="text-red-500 text-xs">JSON Error</div>; }

  const Section = ({ icon: Icon, title, children, colorClass }: any) => (
    <div className="flex items-start p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group">
      <div className={`p-2 rounded-lg mr-3 shrink-0 ${colorClass} group-hover:scale-110 transition-transform`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{title}</h4>
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-3 bg-gray-50/50 p-3 rounded-lg border border-gray-100 h-full overflow-y-auto custom-scrollbar max-h-[600px]">
      {/* Motherboard */}
      {data.mb && (
        <Section icon={CircuitBoard} title="主板 (Motherboard)" colorClass="bg-blue-100 text-blue-600">
           <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-1">
              <span className="text-gray-700 font-medium">{data.mb?.model || 'Unknown Model'}</span>
              {data.mb?.sn && <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 w-fit">SN: {data.mb.sn}</span>}
           </div>
        </Section>
      )}

      {/* CPU */}
      {data.cpu && (
        <Section icon={Cpu} title="处理器 (CPU)" colorClass="bg-purple-100 text-purple-600">
           <div className="space-y-2">
             {Array.isArray(data.cpu) ? data.cpu.map((c: any, i: number) => (
               <div key={i} className="flex flex-col sm:flex-row sm:justify-between text-sm border-b border-dashed border-gray-200 last:border-0 pb-1 last:pb-0 gap-1">
                  <span className="text-gray-700">CPU #{i+1} <span className="text-gray-500 ml-1">{c.model}</span></span>
                  {c.sn && <span className="font-mono text-xs text-gray-600 bg-gray-50 px-1.5 rounded">{c.sn}</span>}
               </div>
             )) : <div className="text-xs text-gray-400">数据格式错误</div>}
           </div>
        </Section>
      )}

      {/* Memory */}
      {data.memory && (
         <Section icon={Server} title="内存 (Memory)" colorClass="bg-green-100 text-green-600">
            <div className="text-sm text-gray-800 font-medium mb-2">{data.memory.model}</div>
            <div className="flex flex-wrap gap-1.5">
               {data.memory.sns ? data.memory.sns.split(',').map((sn: string, i: number) => (
                 <span key={i} className="inline-block text-[10px] font-mono text-gray-600 bg-white px-1.5 py-0.5 border border-gray-200 rounded shadow-sm">{sn.trim()}</span>
               )) : <span className="text-xs text-gray-400">-</span>}
            </div>
         </Section>
      )}
      
      {/* Storage & PSU */}
      {(data.storage || data.psu) && (
        <div className="grid grid-cols-1 gap-3">
          {data.storage && (
             <Section icon={HardDrive} title="存储 (Storage)" colorClass="bg-indigo-100 text-indigo-600">
                <div className="flex justify-between text-sm items-center">
                   <span className="text-gray-700 font-medium">{data.storage.model}</span>
                   {data.storage.sn && <span className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded border">{data.storage.sn}</span>}
                </div>
             </Section>
          )}
          {data.psu && (
             <Section icon={Zap} title="电源 (PSU)" colorClass="bg-yellow-100 text-yellow-600">
                <div className="text-sm mb-1 font-medium text-gray-800">{data.psu.info}</div>
                {data.psu.modules && Array.isArray(data.psu.modules) && (
                  <div className="text-[10px] text-gray-500">Modules: {data.psu.modules.length}</div>
                )}
             </Section>
          )}
        </div>
      )}

      {/* PCIE Devices (New) */}
      {(data.pcie || (Array.isArray(data.pcie) && data.pcie.length > 0)) && (
        <Section icon={CreditCard} title="PCIE 设备 (Expansion)" colorClass="bg-pink-100 text-pink-600">
           {Array.isArray(data.pcie) ? data.pcie.map((p: any, i: number) => (
             <div key={i} className="flex flex-col sm:flex-row sm:justify-between text-sm gap-1 border-b border-dashed border-gray-200 last:border-0 pb-1 last:pb-0">
                <span className="text-gray-700">{p.model || 'Unknown Model'}</span>
                {p.sn && <span className="font-mono text-xs bg-pink-50 text-pink-700 px-2 py-0.5 rounded border border-pink-100 w-fit">{p.sn}</span>}
             </div>
           )) : (
             <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-1">
               <span className="text-gray-700">{data.pcie.model || 'Unknown Model'}</span>
               {data.pcie.sn && <span className="font-mono text-xs bg-pink-50 text-pink-700 px-2 py-0.5 rounded border border-pink-100 w-fit">{data.pcie.sn}</span>}
             </div>
           )}
        </Section>
      )}

      {/* Other (New) */}
      {data.other && (
        <Section icon={Package} title="其他 / 客户自增 (Other)" colorClass="bg-gray-100 text-gray-600">
            <div className="text-sm text-gray-800 whitespace-pre-wrap">{data.other}</div>
        </Section>
      )}
    </div>
  );
};

// Excel-like Config Editor
const ConfigEditor: React.FC<{ jsonString: string, onChange: (newJson: string) => void }> = ({ jsonString, onChange }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonString || '{}');
      // Ensure pcie is array if exists and single object
      if (parsed.pcie && !Array.isArray(parsed.pcie)) {
        parsed.pcie = [parsed.pcie];
      }
      setData(parsed);
    } catch (e) {
      setData({});
    }
  }, []);

  const updateField = (category: string, field: string | null, value: any, index?: number) => {
    const newData = { ...data };
    
    if (category === 'other') {
        newData['other'] = value;
    } else {
        if (!newData[category]) newData[category] = {};
        
        if (index !== undefined && Array.isArray(newData[category])) {
           newData[category][index][field!] = value;
        } else if (category === 'memory' && field === 'sns') {
           newData[category][field!] = value;
        } else {
           newData[category][field!] = value;
        }
    }
    
    setData(newData);
    onChange(JSON.stringify(newData));
  };

  const addItem = (category: string) => {
    const newData = { ...data };
    if (!newData[category]) newData[category] = [];
    if (Array.isArray(newData[category])) {
      newData[category].push({ model: '', sn: '' });
    }
    setData(newData);
    onChange(JSON.stringify(newData));
  };

  const removeItem = (category: string, index: number) => {
    const newData = { ...data };
    if (Array.isArray(newData[category])) {
      newData[category].splice(index, 1);
    }
    setData(newData);
    onChange(JSON.stringify(newData));
  };

  if (!data) return <div>Loading editor...</div>;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-1 space-y-4 bg-gray-50/50">
      {/* MB */}
      <div className="bg-white p-3 border border-gray-200 rounded-md shadow-sm">
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">主板 (MB)</h4>
        <div className="grid grid-cols-2 gap-2">
           <input className="text-sm border p-1 rounded" placeholder="型号" value={data.mb?.model || ''} onChange={e => updateField('mb', 'model', e.target.value)} />
           <input className="text-sm border p-1 rounded font-mono" placeholder="SN" value={data.mb?.sn || ''} onChange={e => updateField('mb', 'sn', e.target.value)} />
        </div>
      </div>

      {/* CPU (List) */}
      <div className="bg-white p-3 border border-gray-200 rounded-md shadow-sm">
        <div className="flex justify-between items-center mb-2">
           <h4 className="text-xs font-bold text-gray-500 uppercase">处理器 (CPU)</h4>
           <button onClick={() => addItem('cpu')} className="text-blue-600 text-xs hover:bg-blue-50 px-2 py-1 rounded">+ 添加</button>
        </div>
        {data.cpu && Array.isArray(data.cpu) && data.cpu.map((c: any, i: number) => (
           <div key={i} className="flex gap-2 mb-2 items-center">
              <span className="text-xs text-gray-400 w-4">{i+1}</span>
              <input className="text-sm border p-1 rounded w-1/3" placeholder="型号" value={c.model || ''} onChange={e => updateField('cpu', 'model', e.target.value, i)} />
              <input className="text-sm border p-1 rounded flex-1 font-mono" placeholder="SN" value={c.sn || ''} onChange={e => updateField('cpu', 'sn', e.target.value, i)} />
              <button onClick={() => removeItem('cpu', i)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
           </div>
        ))}
      </div>

      {/* Memory */}
      <div className="bg-white p-3 border border-gray-200 rounded-md shadow-sm">
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">内存 (Memory)</h4>
        <input className="text-sm border p-1 rounded w-full mb-2" placeholder="规格型号" value={data.memory?.model || ''} onChange={e => updateField('memory', 'model', e.target.value)} />
        <textarea 
           className="text-xs border p-1 rounded w-full font-mono h-20" 
           placeholder="SN列表 (逗号分隔)" 
           value={data.memory?.sns || ''} 
           onChange={e => updateField('memory', 'sns', e.target.value)} 
        />
      </div>

      {/* Storage */}
      <div className="bg-white p-3 border border-gray-200 rounded-md shadow-sm">
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">存储 (Storage)</h4>
        <div className="grid grid-cols-2 gap-2">
           <input className="text-sm border p-1 rounded" placeholder="型号" value={data.storage?.model || ''} onChange={e => updateField('storage', 'model', e.target.value)} />
           <input className="text-sm border p-1 rounded font-mono" placeholder="SN" value={data.storage?.sn || ''} onChange={e => updateField('storage', 'sn', e.target.value)} />
        </div>
      </div>

      {/* PCIE (List) - NEW */}
      <div className="bg-white p-3 border border-gray-200 rounded-md shadow-sm">
        <div className="flex justify-between items-center mb-2">
           <h4 className="text-xs font-bold text-gray-500 uppercase">PCIE 设备 (Expansion)</h4>
           <button onClick={() => addItem('pcie')} className="text-blue-600 text-xs hover:bg-blue-50 px-2 py-1 rounded">+ 添加</button>
        </div>
        {data.pcie && Array.isArray(data.pcie) && data.pcie.map((p: any, i: number) => (
           <div key={i} className="flex gap-2 mb-2 items-center">
              <span className="text-xs text-gray-400 w-4">{i+1}</span>
              <input className="text-sm border p-1 rounded w-1/3" placeholder="型号/名称" value={p.model || ''} onChange={e => updateField('pcie', 'model', e.target.value, i)} />
              <input className="text-sm border p-1 rounded flex-1 font-mono" placeholder="SN" value={p.sn || ''} onChange={e => updateField('pcie', 'sn', e.target.value, i)} />
              <button onClick={() => removeItem('pcie', i)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
           </div>
        ))}
        {(!data.pcie || data.pcie.length === 0) && (
            <div className="text-xs text-gray-400 text-center py-2 italic">无 PCIE 设备</div>
        )}
      </div>

      {/* Other (Text) - NEW */}
      <div className="bg-white p-3 border border-gray-200 rounded-md shadow-sm">
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">其他配件 (Other / Custom)</h4>
        <textarea 
           className="text-sm border p-1 rounded w-full h-20 bg-gray-50" 
           placeholder="客户自增设备或其他备注 (支持自定义输入)..." 
           value={data.other || ''} 
           onChange={e => updateField('other', null, e.target.value)} 
        />
      </div>
    </div>
  );
};

// --- Repair Report Component ---
const RepairReportModal: React.FC<{ 
  order: RepairOrder; 
  onClose: () => void;
  onSave: (reportData: any) => void; 
}> = ({ order, onClose, onSave }) => {
  const [report, setReport] = useState<any>({
    returnDate: new Date().toLocaleDateString(),
    productSN: order.machine_sn,
    productModel: order.shipment_model || 'Unknown',
    customerName: order.customer_name,
    receivedConfig: '',
    shippedConfig: '',
    faultDesc: order.fault_description,
    testResult: '开机无显', // Default
    repairMethod: { type: 'REPLACE', part: 'MB', oldSN: '', newSN: '' },
    repairResult: '检测正常，Burn-in Test PASS',
    engineer: '高云晖',
    repairDate: new Date().toLocaleDateString()
  });

  const [downloading, setDownloading] = useState(false);

  // Pre-fill config summary logic
  useEffect(() => {
    // If existing report data exists, load it
    if (order.report_data_json) {
       try {
         const existing = JSON.parse(order.report_data_json);
         // Refresh potentially stale fields if this is a draft
         setReport({
            ...existing,
            faultDesc: order.fault_description,
            customerName: order.customer_name
         });
         return;
       } catch(e) {}
    }

    // Auto-summarize config
    const summarize = (json?: string) => {
      if (!json) return '';
      try {
        const d = JSON.parse(json);
        const parts = [];
        if (d.memory) parts.push(`内存: ${d.memory.model} * ${d.memory.sns ? d.memory.sns.split(',').length : 0}`);
        if (d.cpu) parts.push(`CPU: ${Array.isArray(d.cpu) ? d.cpu[0]?.model + '*' + d.cpu.length : ''}`);
        if (d.storage) parts.push(`硬盘: ${d.storage.model} * 1`);
        if (d.mb) parts.push(`主板: ${d.mb.model}`);
        
        // Add PCIE
        if (d.pcie) {
            const pcieList = Array.isArray(d.pcie) ? d.pcie : [d.pcie];
            pcieList.forEach((p:any) => {
                if(p.model || p.sn) parts.push(`PCIE: ${p.model || 'Unknown'} (SN:${p.sn || 'N/A'})`);
            });
        }
        // Add Other
        if (d.other) {
            parts.push(`其他: ${d.other}`);
        }

        return parts.join('\n');
      } catch (e) { return '配置解析失败'; }
    };
    
    setReport(prev => ({
      ...prev,
      receivedConfig: summarize(order.received_config_json || order.shipment_config_json),
      shippedConfig: summarize(order.received_config_json || order.shipment_config_json),
      faultDesc: order.fault_description,
      repairResult: order.status === OrderStatus.QA_AGING ? '老化测试中' : '检测正常'
    }));
  }, []);

  const exportToWord = () => {
    setDownloading(true);
    const content = document.querySelector('.printable-content')?.innerHTML;
    
    if (content) {
      // Create a full HTML document structure for Word
      // Note: This is a hacky but effective client-side way to generate "Word" files (MHTML/XML-ish HTML)
      const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
                            xmlns:w='urn:schemas-microsoft-com:office:word' 
                            xmlns='http://www.w3.org/TR/REC-html40'>
                      <head><meta charset='utf-8'><title>Repair Report</title></head><body>`;
      const footer = "</body></html>";
      const sourceHTML = header + content + footer;

      const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      
      const fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = source;
      fileDownload.download = `维修报告_${order.machine_sn}.doc`;
      fileDownload.click();
      document.body.removeChild(fileDownload);
    }
    setDownloading(false);
  };

  const exportToPDF = () => {
    setDownloading(true);
    const element = document.querySelector('.printable-content') as HTMLElement;
    if (element) {
      // Use html2canvas to capture the element
      html2canvas(element, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        // A4 size: 210mm x 297mm
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`维修报告_${order.machine_sn}.pdf`);
        setDownloading(false);
      });
    } else {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="bg-white w-full max-w-4xl shadow-2xl rounded-lg overflow-hidden flex flex-col max-h-[90vh] no-print-border">
         {/* Header - Hidden on Print */}
         <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center shrink-0 no-print">
           <div className="flex flex-col">
              <h3 className="text-xl font-bold flex items-center"><FileText className="mr-2"/> 维修检测报告 (Preview)</h3>
              <span className="text-xs text-slate-400 flex items-center mt-1"><RefreshCw className="w-3 h-3 mr-1"/> 数据已自动同步最新工单信息</span>
           </div>
           <div className="flex gap-2">
             <button onClick={exportToWord} disabled={downloading} className="px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded text-sm flex items-center border border-blue-600">
                <FileText size={14} className="mr-1"/> Word
             </button>
             <button onClick={exportToPDF} disabled={downloading} className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-sm flex items-center border border-red-600">
                <Download size={14} className="mr-1"/> PDF
             </button>
             <button onClick={() => window.print()} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm flex items-center"><Printer size={14} className="mr-1"/> 打印</button>
             <button onClick={() => onSave(report)} className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm flex items-center"><Save size={14} className="mr-1"/> 保存</button>
             <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24}/></button>
           </div>
         </div>

         {/* Report Body - Styled for Screen & Print */}
         <div className="p-8 overflow-y-auto bg-gray-100 flex-1 relative">
            {/* 'printable-content' class triggers global print rules in index.html */}
            <div className="printable-content bg-white p-8 shadow-sm mx-auto max-w-[210mm] min-h-[297mm] flex flex-col" style={{ fontFamily: 'SimSun, serif' }}>
               
               {/* --- Report Header with Logo --- */}
               <div className="flex justify-between items-end mb-8 border-b-2 border-gray-300 pb-2">
                  <div className="flex flex-col justify-end">
                     <div className="mb-1">
                        <img 
                           src="/header_logo.png" 
                           alt="TIGERWAY Logo" 
                           className="h-14 object-contain"
                           onError={(e) => {
                              // Fallback styling if image is missing
                              e.currentTarget.style.display = 'none';
                              // This ensures the user still sees something if they haven't added the file yet
                              const span = document.createElement('span');
                              span.innerHTML = '⚠️ 请添加 /header_logo.png';
                              span.className = 'text-red-500 text-xs';
                              e.currentTarget.parentNode?.appendChild(span);
                           }}
                        />
                     </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                     <p>服务单号: <span className="font-mono text-black">{order.order_number}</span></p>
                     <p>打印日期: {new Date().toLocaleDateString()}</p>
                  </div>
               </div>

               <h1 className="text-3xl font-bold text-center mb-6 tracking-widest text-black">维修检测报告</h1>
               
               <table className="w-full border-collapse border border-black text-sm">
                  <tbody>
                     {/* Basic Info */}
                     <tr>
                        <td className="border border-black p-2 font-bold bg-gray-50 w-24 text-center align-middle" rowSpan={2}>基本信息</td>
                        <td className="border border-black p-2 w-24">客户名称</td>
                        <td className="border border-black p-2"><input className="w-full outline-none bg-transparent" value={report.customerName} onChange={e => setReport({...report, customerName: e.target.value})}/></td>
                        <td className="border border-black p-2 w-24">返回日期</td>
                        <td className="border border-black p-2"><input className="w-full outline-none bg-transparent" value={report.returnDate} onChange={e => setReport({...report, returnDate: e.target.value})}/></td>
                     </tr>
                     <tr>
                        <td className="border border-black p-2">产品型号</td>
                        <td className="border border-black p-2"><input className="w-full outline-none bg-transparent" value={report.productModel} onChange={e => setReport({...report, productModel: e.target.value})}/></td>
                        <td className="border border-black p-2">产品 SN</td>
                        <td className="border border-black p-2"><input className="w-full outline-none font-mono bg-transparent" value={report.productSN} onChange={e => setReport({...report, productSN: e.target.value})}/></td>
                     </tr>

                     {/* Config Info */}
                     <tr>
                        <td className="border border-black p-2 font-bold bg-gray-50 text-center align-middle" rowSpan={2}>配置信息</td>
                        <td className="border border-black p-2 text-center font-bold bg-gray-50" colSpan={2}>收到配置 (Summary)</td>
                        <td className="border border-black p-2 text-center font-bold bg-gray-50" colSpan={2}>发货配置 (Summary)</td>
                     </tr>
                     <tr>
                        <td className="border border-black p-2 align-top h-32" colSpan={2}>
                           <textarea className="w-full h-full outline-none resize-none bg-transparent" value={report.receivedConfig} onChange={e => setReport({...report, receivedConfig: e.target.value})} />
                        </td>
                        <td className="border border-black p-2 align-top h-32" colSpan={2}>
                           <textarea className="w-full h-full outline-none resize-none bg-transparent" value={report.shippedConfig} onChange={e => setReport({...report, shippedConfig: e.target.value})} />
                        </td>
                     </tr>

                     {/* Fault */}
                     <tr>
                        <td className="border border-black p-2 font-bold bg-gray-50 text-center align-middle h-24">故障描述</td>
                        <td className="border border-black p-2 align-middle text-center text-lg" colSpan={4}>
                           <input className="w-full text-center outline-none bg-transparent" value={report.faultDesc} onChange={e => setReport({...report, faultDesc: e.target.value})}/>
                        </td>
                     </tr>

                     {/* Test Result */}
                     <tr>
                        <td className="border border-black p-2 font-bold bg-gray-50 text-center align-middle h-24">检测结果</td>
                        <td className="border border-black p-2 align-middle text-center text-lg" colSpan={4}>
                           <input className="w-full text-center outline-none bg-transparent" value={report.testResult} onChange={e => setReport({...report, testResult: e.target.value})}/>
                        </td>
                     </tr>

                     {/* Repair Method */}
                     <tr>
                        <td className="border border-black p-2 font-bold bg-gray-50 text-center align-middle" rowSpan={3}>维修方式</td>
                        <td className="border border-black p-2 bg-gray-50 text-center" colSpan={4}>
                           <label className="mr-4"><input type="radio" name="rtype" checked={true} readOnly/> 更换配件</label>
                           <label><input type="radio" name="rtype"/> 配件返修</label>
                        </td>
                     </tr>
                     <tr>
                        <td className="border border-black p-1 text-center bg-gray-50">配件型号</td>
                        <td className="border border-black p-1 text-center bg-gray-50" colSpan={1}>坏件 SN</td>
                        <td className="border border-black p-1 text-center bg-gray-50" colSpan={2}>新配件 SN</td>
                     </tr>
                     <tr>
                        <td className="border border-black p-1 h-16"><input className="w-full text-center outline-none bg-transparent" placeholder="例如: X11DPI-N" value={report.repairMethod.part} onChange={e => setReport({...report, repairMethod: {...report.repairMethod, part: e.target.value}})}/></td>
                        <td className="border border-black p-1" colSpan={1}><input className="w-full text-center outline-none bg-transparent" placeholder="Old SN" value={report.repairMethod.oldSN} onChange={e => setReport({...report, repairMethod: {...report.repairMethod, oldSN: e.target.value}})}/></td>
                        <td className="border border-black p-1" colSpan={2}><input className="w-full text-center outline-none bg-transparent" placeholder="New SN" value={report.repairMethod.newSN} onChange={e => setReport({...report, repairMethod: {...report.repairMethod, newSN: e.target.value}})}/></td>
                     </tr>

                     {/* Repair Result */}
                     <tr>
                        <td className="border border-black p-2 font-bold bg-gray-50 text-center align-middle h-24">维修结果</td>
                        <td className="border border-black p-2 align-middle text-center text-lg" colSpan={4}>
                           <input className="w-full text-center outline-none font-bold bg-transparent" value={report.repairResult} onChange={e => setReport({...report, repairResult: e.target.value})}/>
                        </td>
                     </tr>
                     
                     {/* Footer Signatures */}
                     <tr>
                        <td className="border border-black p-2 font-bold bg-gray-50 text-center">维修工程师</td>
                        <td className="border border-black p-2"><input className="w-full outline-none bg-transparent" value={report.engineer} onChange={e => setReport({...report, engineer: e.target.value})}/></td>
                        <td className="border border-black p-2 font-bold bg-gray-50 text-center">维修日期</td>
                        <td className="border border-black p-2" colSpan={2}><input className="w-full outline-none bg-transparent" value={report.repairDate} onChange={e => setReport({...report, repairDate: e.target.value})}/></td>
                     </tr>
                  </tbody>
               </table>

               <div className="flex-1"></div>

               {/* --- Report Footer with Company Info --- */}
               <div className="mt-8 border-t border-gray-300 pt-4 text-center text-xs font-bold text-[#4ade80]">
                  <p className="text-sm">威尔创新（天津）科技发展有限公司</p>
                  <p className="mt-1 font-sans">TIGERWAY Innovation(Tianjin)Technology Development Co.，Ltd.</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};


const OrderDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Received Config Edit State
  const [isEditingReceived, setIsEditingReceived] = useState(false);
  const [receivedConfigText, setReceivedConfigText] = useState(''); // Stores JSON string
  
  // Report State
  const [showReport, setShowReport] = useState(false);
  
  // AI Analysis State
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // Feedback
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    // Simulate API Fetch
    setTimeout(() => {
      const found = MOCK_ORDERS.find(o => o.id === Number(id));
      if (found) {
        setOrder(found);
        setReceivedConfigText(found.received_config_json || found.shipment_config_json || '{}');
      }
      setLoading(false);
    }, 500);
  }, [id]);

  const handleSaveOrder = (updates?: Partial<RepairOrder>) => {
    if (!order) return;
    
    // 1. Update the order object locally
    const updatedOrder = {
      ...order,
      ...updates,
      received_config_json: receivedConfigText,
      updated_at: new Date().toISOString()
    };
    
    // 2. Update Mock Data Source (Simulating Backend Update)
    const index = MOCK_ORDERS.findIndex(o => o.id === order.id);
    if (index !== -1) {
      MOCK_ORDERS[index] = updatedOrder;
    }
    
    setOrder(updatedOrder);
    setSaveStatus('工单已保存!');
    setTimeout(() => setSaveStatus(''), 3000);
    
    // Disable edit mode if active
    setIsEditingReceived(false);
  };

  const updateStatus = (newStatus: OrderStatus, message: string) => {
     handleSaveOrder({ status: newStatus });
     setSaveStatus(message);
     setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleSaveReport = (reportData: any) => {
    if (!order) return;
    
    // Save report data into order
    handleSaveOrder({ report_data_json: JSON.stringify(reportData) });

    setSaveStatus('维修报告已保存');
    setTimeout(() => setSaveStatus(''), 3000);
    setShowReport(false);
  };

  const runAIAnalysis = async () => {
    if (!order) return;
    setAiAnalyzing(true);
    setAnalysisResult(null);
    try {
      const configStr = order.received_config_json || order.shipment_config_json || "配置未知";
      const result = await analyzeFault(order.fault_description, configStr);
      setAnalysisResult(result);
    } catch (e) {
      console.error(e);
      alert("AI 分析失败");
    } finally {
      setAiAnalyzing(false);
    }
  };
  
  // Determine Workflow Step - UPDATED LOGIC FOR NEW STEP 4 (Report)
  const getCurrentStepIndex = () => {
    if (!order) return 0;
    
    // Steps: 0: Diagnosis, 1: Repair, 2: QA, 3: Report, 4: Logistics/Close
    
    if (order.status === OrderStatus.CLOSED) return 5; // Finished
    if (order.status === OrderStatus.SHIPPED) return 4; // Logistics

    // For statuses before shipping, check logic
    if (order.status === OrderStatus.QA_AGING) {
       // If report exists, we are visually at Step 4 (Ready for logistics)
       if (order.report_data_json) return 3; 
       return 2; // QA
    }
    if (order.status === OrderStatus.CHECKING) return 1; // Repairing/Diagnosis
    
    return 0; // Pending/Assigned
  };

  const currentStepIdx = getCurrentStepIndex();

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;
  if (!order) return <div className="p-8 text-center text-red-500">工单不存在</div>;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center">
          <button onClick={() => navigate('/orders')} className="mr-4 text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
             <div className="flex items-center gap-2">
               <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
               <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[order.status]}`}>
                 {STATUS_LABELS[order.status]}
               </span>
             </div>
             <p className="text-sm text-gray-500 mt-1">
               SN: <span className="font-mono text-gray-700 font-bold">{order.machine_sn}</span> | 客户: {order.customer_name}
             </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
           {saveStatus && <span className="text-green-600 text-sm font-bold animate-pulse">{saveStatus}</span>}
           
           <button onClick={runAIAnalysis} className="flex items-center px-3 py-2 bg-purple-600 text-white rounded shadow hover:bg-purple-700 transition-all text-sm">
             {aiAnalyzing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin"/> : <BrainCircuit className="w-4 h-4 mr-2"/>}
             AI 智能诊断
           </button>

           <button 
             onClick={() => handleSaveOrder()}
             className="flex items-center px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
           >
             <Save className="w-4 h-4 mr-2" /> 保存工单
           </button>
        </div>
      </div>

      {/* Progress Steps (Visual) - UPDATED */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px]">
          {STEPS.map((step, idx) => {
             const StepIcon = step.icon;
             const isActive = idx <= currentStepIdx;
             const isCurrent = idx === currentStepIdx;
             
             // Special visual check for report step: Active if report exists
             const isReportStep = step.id === 'report';
             const reportExists = !!order.report_data_json;
             
             const visualActive = isActive || (isReportStep && reportExists);
             
             return (
               <div key={step.id} className="flex items-center flex-1 last:flex-none relative">
                 <div className={`flex items-center justify-center w-8 h-8 rounded-full z-10 ${visualActive ? (isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-green-500 text-white') : 'bg-gray-200 text-gray-500'}`}>
                   {visualActive && !isCurrent ? <CheckCircle size={16} /> : <StepIcon size={16} />}
                 </div>
                 <span className={`ml-2 text-sm font-medium ${visualActive ? 'text-gray-900' : 'text-gray-400'}`}>
                   {step.label}
                 </span>
                 {idx < STEPS.length - 1 && (
                   <div className={`flex-1 mx-4 h-1 rounded ${idx < currentStepIdx || (idx === 2 && reportExists) ? 'bg-green-500' : 'bg-gray-100'}`} />
                 )}
               </div>
             );
          })}
        </div>
      </div>

      {/* Workflow Actions Panel (NEW) */}
      <div className="bg-gradient-to-r from-blue-50 to-white p-4 rounded-lg border border-blue-100 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
         <div className="flex items-center">
            <Activity className="w-5 h-5 text-blue-600 mr-2" />
            <div>
               <h3 className="font-bold text-gray-800 text-sm">工单流转控制 (Workflow)</h3>
               <p className="text-xs text-gray-500">当前阶段: <span className="font-bold text-blue-700">{STATUS_LABELS[order.status]}</span></p>
            </div>
         </div>
         <div className="flex space-x-2 items-center">
            {order.status === OrderStatus.CHECKING && (
               <button 
                 onClick={() => updateStatus(OrderStatus.QA_AGING, '已进入老化测试阶段')}
                 className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 text-sm font-medium"
               >
                  <Play className="w-4 h-4 mr-2" /> 维修完成 -> 开始老化 (QA)
               </button>
            )}

            {/* Step 3: QA -> Report (Step 4) */}
            {order.status === OrderStatus.QA_AGING && (
              <>
                 <span className="text-xs text-gray-400 mr-2">老化测试中...</span>
                 <button 
                    onClick={() => setShowReport(true)}
                    className={`flex items-center px-4 py-2 rounded shadow text-sm font-medium ${order.report_data_json ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                 >
                    <FileText className="w-4 h-4 mr-2" /> 
                    {order.report_data_json ? "查看/修改 维修报告 (已生成)" : "生成维修报告 (Next)"}
                 </button>
                 
                 {/* Only allow shipping if report exists */}
                 {order.report_data_json && (
                    <>
                      <ChevronRight className="text-gray-400"/>
                      <button 
                        onClick={() => updateStatus(OrderStatus.SHIPPED, '已标记为发货状态')}
                        className="flex items-center px-4 py-2 bg-orange-500 text-white rounded shadow hover:bg-orange-600 text-sm font-medium"
                      >
                          <Truck className="w-4 h-4 mr-2" /> 发货 (Ship)
                      </button>
                    </>
                 )}
              </>
            )}
            
            {order.status === OrderStatus.SHIPPED && (
               <>
               <button 
                  onClick={() => setShowReport(true)}
                  className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded shadow-sm hover:bg-gray-50 text-xs font-medium mr-2"
               >
                  <FileText className="w-3 h-3 mr-1" /> 查看报告
               </button>
               <button 
                 onClick={() => updateStatus(OrderStatus.CLOSED, '工单已关闭')}
                 className="flex items-center px-4 py-2 bg-gray-800 text-white rounded shadow hover:bg-gray-900 text-sm font-medium"
               >
                  <CheckCircle className="w-4 h-4 mr-2" /> 确认签收 -> 结单 (Close)
               </button>
               </>
            )}
            
            {order.status === OrderStatus.CLOSED && (
               <div className="flex items-center">
                 <button 
                    onClick={() => setShowReport(true)}
                    className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded shadow-sm hover:bg-gray-50 text-xs font-medium mr-4"
                 >
                    <FileText className="w-3 h-3 mr-1" /> 查看报告
                 </button>
                 <span className="px-4 py-2 bg-green-100 text-green-800 rounded border border-green-200 text-sm font-bold flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" /> 流程已结束
                 </span>
               </div>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Col: Shipment Config (Read Only) */}
        <div className="space-y-4">
           <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Truck className="w-5 h-5 mr-2 text-gray-500" /> 发货原始配置 (ERP)
              </h3>
              <span className="text-xs text-gray-400 font-mono">Read-Only</span>
           </div>
           <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] overflow-hidden">
             <ConfigViewer jsonString={order.shipment_config_json} />
           </div>
        </div>

        {/* Right Col: Received Config (Editable) */}
        <div className="space-y-4">
           <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <ClipboardCheck className="w-5 h-5 mr-2 text-blue-600" /> 接收实际配置 (Actual)
              </h3>
              <div className="flex space-x-2">
                {isEditingReceived ? (
                  <>
                     <button 
                       onClick={() => setIsEditingReceived(false)}
                       className="text-xs px-3 py-1 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded"
                     >
                       退出编辑
                     </button>
                  </>
                ) : (
                  <button 
                    onClick={() => {
                       // Ensure we have current data loaded before edit
                       setReceivedConfigText(order.received_config_json || order.shipment_config_json || '{}');
                       setIsEditingReceived(true);
                    }}
                    className="text-xs px-3 py-1 text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded flex items-center"
                  >
                    <PenLine className="w-3 h-3 mr-1" /> 修改配置
                  </button>
                )}
              </div>
           </div>

           <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] overflow-hidden relative">
             {isEditingReceived ? (
                // Use the new Form-based Editor
                <ConfigEditor 
                  jsonString={receivedConfigText}
                  onChange={(newJson) => setReceivedConfigText(newJson)}
                />
             ) : (
                <ConfigViewer jsonString={order.received_config_json || order.shipment_config_json} />
             )}
             
             {/* Overlay Badge if Modified */}
             {!isEditingReceived && order.received_config_json && order.received_config_json !== order.shipment_config_json && (
                <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-[10px] px-2 py-1 rounded-full font-bold border border-yellow-200 shadow-sm flex items-center">
                   <AlertTriangle className="w-3 h-3 mr-1" /> 已变更
                </div>
             )}
           </div>
        </div>

        {/* Full Width: Analysis & Fault Info */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                 <AlertTriangle className="w-5 h-5 mr-2 text-red-500" /> 故障描述
              </h3>
              <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-gray-800 text-sm leading-relaxed">
                 {order.fault_description}
              </div>
              <div className="mt-4">
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-2">工程师实测描述 (补充)</label>
                 <textarea 
                   className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                   rows={3}
                   placeholder="在此记录复现过程中的详细现象..."
                   value={order.actual_fault_description || ''}
                   onChange={e => setOrder({...order, actual_fault_description: e.target.value})}
                 />
              </div>
           </div>

           <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                 <BrainCircuit className="w-5 h-5 mr-2 text-purple-600" /> AI 辅助诊断结果
              </h3>
              {aiAnalyzing ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4">
                    <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
                    <p className="text-sm">正在分析配置与故障关联...</p>
                 </div>
              ) : analysisResult ? (
                 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-purple-50 p-3 rounded border border-purple-100">
                       <span className="text-xs font-bold text-purple-600 uppercase block mb-1">问题摘要</span>
                       <p className="text-sm text-gray-800">{analysisResult.summary}</p>
                    </div>
                    <div>
                       <span className="text-xs font-bold text-gray-500 uppercase block mb-1">可能原因</span>
                       <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                          {analysisResult.possibleCauses.map((c, i) => <li key={i}>{c}</li>)}
                       </ul>
                    </div>
                    <div className="bg-green-50 p-3 rounded border border-green-100">
                       <span className="text-xs font-bold text-green-600 uppercase block mb-1">维修建议</span>
                       <p className="text-sm text-gray-800">{analysisResult.recommendation}</p>
                    </div>
                 </div>
              ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
                    <BrainCircuit className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-sm">点击上方 "AI 智能诊断" 获取分析</p>
                 </div>
              )}
           </div>
        </div>
      </div>

      {/* Repair Report Modal */}
      {showReport && (
        <RepairReportModal 
          order={order} 
          onClose={() => setShowReport(false)} 
          onSave={handleSaveReport} 
        />
      )}
    </div>
  );
};

export default OrderDetail;
