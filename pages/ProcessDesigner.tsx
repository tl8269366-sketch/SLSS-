
import React, { useState, useEffect } from 'react';
import { 
  Save, Plus, Trash2, Layout, GitMerge, Eye, 
  Type, List, Calendar, Hash, FileText, X, ArrowRight,
  CheckSquare, Circle, Upload, User, Users, Divide, AlertTriangle, 
  Play, StopCircle, GitBranch, Split, FolderTree
} from 'lucide-react';
import { ProcessTemplate, FormFieldConfig, WorkflowNode, UserRole } from '../types';
import { SmartFormRenderer } from '../components/SmartFormRenderer';

// --- CONSTANTS ---
const DEFAULT_TEMPLATE: ProcessTemplate = {
  id: '',
  name: '新建自定义流程',
  description: '',
  targetModule: 'service', // Default to service module
  formSchema: [],
  workflow: [
    { id: 'start', name: '开始', role: 'ALL', nextNodes: ['approval'], type: 'start' },
    { id: 'approval', name: '经理审批', role: UserRole.MANAGER, nextNodes: ['exclusive_gate'], type: 'process' },
    { id: 'exclusive_gate', name: '金额判断', role: 'ALL', nextNodes: ['process_repair', 'process_replace'], type: 'exclusive' },
    { id: 'process_repair', name: '维修处理', role: UserRole.TECHNICIAN, nextNodes: ['end'], type: 'process' },
    { id: 'process_replace', name: '换货处理', role: UserRole.TECHNICIAN, nextNodes: ['end'], type: 'process' },
    { id: 'end', name: '结束', role: 'ALL', nextNodes: [], type: 'end' }
  ],
  created_at: '',
  updated_at: ''
};

const COMPONENT_GROUPS = [
  {
    title: '基础控件',
    items: [
      { type: 'text', label: '单行文本', icon: Type },
      { type: 'textarea', label: '多行文本', icon: FileText },
      { type: 'number', label: '数字输入', icon: Hash },
      { type: 'select', label: '下拉选择', icon: List },
      { type: 'radio', label: '单选框', icon: Circle },
      { type: 'checkbox', label: '多选框', icon: CheckSquare },
    ]
  },
  {
    title: '高级控件',
    items: [
      { type: 'date', label: '日期时间', icon: Calendar },
      { type: 'file', label: '附件上传', icon: Upload },
      { type: 'user', label: '人员选择', icon: User },
      { type: 'dept', label: '部门选择', icon: Users },
    ]
  },
  {
    title: '布局与说明',
    items: [
      { type: 'divider', label: '分割线', icon: Divide },
      { type: 'note', label: '说明文字', icon: AlertTriangle },
    ]
  }
];

const ProcessDesigner: React.FC = () => {
  const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<ProcessTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'workflow'>('form');
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (Array.isArray(data)) setTemplates(data);
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    if (!currentTemplate) return;
    setLoading(true);
    try {
      const toSave = { 
        ...currentTemplate, 
        id: currentTemplate.id || `tpl_${Date.now()}`, 
        updated_at: new Date().toISOString() 
      };
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave)
      });
      if (res.ok) {
        setMsg({ type: 'success', text: '流程模板已保存' });
        loadTemplates();
        if (!currentTemplate.id) setCurrentTemplate(toSave); 
      } else throw new Error('Failed');
    } catch (e) {
      setMsg({ type: 'error', text: '保存失败' });
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const addField = (type: any) => {
    if (!currentTemplate) return;
    const newField: FormFieldConfig = {
      id: `f_${Date.now()}`,
      label: type === 'divider' ? '分割线' : type === 'note' ? '说明文字' : '新控件',
      type: type,
      required: false,
      width: 'full',
      options: ['select', 'radio', 'checkbox'].includes(type) ? ['选项1', '选项2'] : undefined,
      placeholder: '请输入...',
      description: type === 'note' ? '这是一段说明文字，用于提示用户。' : undefined
    };
    setCurrentTemplate(prev => prev ? ({ ...prev, formSchema: [...prev.formSchema, newField] }) : null);
  };

  const FormPreviewModal = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
       <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
             <h3 className="font-bold text-gray-800 flex items-center"><Eye className="mr-2 w-5 h-5 text-blue-600"/> 表单预览: {currentTemplate?.name}</h3>
             <button onClick={() => setPreviewMode(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
          </div>
          <div className="p-8 bg-gray-50/30 overflow-y-auto flex-1">
             <SmartFormRenderer 
                schema={currentTemplate?.formSchema || []} 
                data={{}} 
                readOnly={false} 
                onChange={() => {}}
             />
          </div>
          <div className="px-6 py-4 border-t bg-white flex justify-end">
             <button onClick={() => setPreviewMode(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">关闭</button>
          </div>
       </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header Toolbar */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200 shrink-0">
         <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
               <GitMerge className="mr-3 text-purple-600"/> 流程与表单设计器
            </h1>
            <p className="text-sm text-gray-500 mt-1">设计业务流转规则和数据采集表单，支持发布到生产或售后模块菜单</p>
         </div>
         <div className="flex space-x-3">
            {currentTemplate && (
               <button onClick={() => setPreviewMode(true)} className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors">
                  <Eye className="w-4 h-4 mr-2"/> 预览表单
               </button>
            )}
            <button 
               onClick={() => { setCurrentTemplate({...DEFAULT_TEMPLATE}); }}
               className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-sm transition-colors"
            >
               <Plus className="w-4 h-4 mr-2"/> 新建流程
            </button>
         </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
         {/* Left: Template List */}
         <div className="w-64 bg-white rounded-lg shadow border border-gray-200 flex flex-col overflow-hidden shrink-0">
            <div className="p-4 bg-gray-50 border-b font-bold text-gray-700 flex items-center justify-between">
               <span>模板列表</span>
               <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">{templates.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
               {templates.map(t => (
                  <div 
                     key={t.id} 
                     onClick={() => setCurrentTemplate(t)}
                     className={`p-3 rounded-lg cursor-pointer text-sm transition-colors flex flex-col group ${currentTemplate?.id === t.id ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'hover:bg-gray-50 text-gray-600 border border-transparent'}`}
                  >
                     <div className="flex justify-between items-center mb-1">
                       <span className={`font-medium truncate ${currentTemplate?.id === t.id ? 'text-purple-800' : 'text-gray-800'}`}>{t.name}</span>
                       <button onClick={(e) => {e.stopPropagation(); if(confirm('Delete?')) {/* handle delete */}}} className="opacity-0 group-hover:opacity-100 text-red-400"><Trash2 size={14}/></button>
                     </div>
                     <span className={`text-[10px] px-1.5 py-0.5 rounded w-fit ${t.targetModule === 'production' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {t.targetModule === 'production' ? '生产制造' : '售后服务'}
                     </span>
                  </div>
               ))}
            </div>
         </div>

         {/* Right: Editor Canvas */}
         <div className="flex-1 bg-white rounded-lg shadow border border-gray-200 flex flex-col overflow-hidden relative">
            {currentTemplate ? (
               <>
                  {/* Editor Tabs */}
                  <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50/50">
                     <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
                        <button onClick={() => setActiveTab('form')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'form' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                           <Layout className="w-4 h-4 inline mr-2"/>表单配置
                        </button>
                        <button onClick={() => setActiveTab('workflow')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'workflow' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                           <GitMerge className="w-4 h-4 inline mr-2"/>流程配置
                        </button>
                     </div>
                     <div className="flex items-center space-x-3">
                        {/* Module Selector */}
                        <div className="flex items-center space-x-2 mr-2">
                           <FolderTree className="w-4 h-4 text-gray-400" />
                           <select 
                              className="bg-transparent text-sm font-medium text-gray-600 focus:outline-none border-b border-transparent hover:border-gray-300 focus:border-purple-500 transition-colors py-1"
                              value={currentTemplate.targetModule || 'service'}
                              onChange={e => setCurrentTemplate({...currentTemplate, targetModule: e.target.value as any})}
                           >
                              <option value="service">发布至：售后服务中心</option>
                              <option value="production">发布至：生产制造中心</option>
                           </select>
                        </div>

                        <div className="h-4 w-px bg-gray-300 mx-2"></div>

                        <input 
                           className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 outline-none text-sm px-2 py-1 font-bold w-48 transition-colors text-right" 
                           value={currentTemplate.name}
                           onChange={e => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                           placeholder="流程名称"
                        />
                        <button onClick={handleSave} disabled={loading} className="px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-md hover:bg-blue-700 flex items-center shadow-sm transition-colors ml-2">
                           <Save className="w-4 h-4 mr-1"/> {loading ? '保存中...' : '保存配置'}
                        </button>
                     </div>
                  </div>

                  {/* Editor Content */}
                  <div className="flex-1 overflow-hidden flex">
                     
                     {/* --- FORM EDITOR --- */}
                     {activeTab === 'form' && (
                        <>
                           <div className="w-56 border-r bg-gray-50 flex flex-col overflow-y-auto custom-scrollbar">
                              {COMPONENT_GROUPS.map((group, gIdx) => (
                                 <div key={gIdx} className="p-4 border-b border-gray-100 last:border-0">
                                    <div className="text-xs font-bold text-gray-400 uppercase mb-3">{group.title}</div>
                                    <div className="grid grid-cols-2 gap-2">
                                       {group.items.map(item => (
                                          <button 
                                             key={item.type}
                                             onClick={() => addField(item.type)}
                                             className="flex flex-col items-center justify-center p-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-purple-300 hover:text-purple-600 hover:shadow-sm transition-all aspect-square"
                                          >
                                             <item.icon className="w-5 h-5 mb-1 opacity-70"/> 
                                             <span>{item.label}</span>
                                          </button>
                                       ))}
                                    </div>
                                 </div>
                              ))}
                           </div>
                           
                           <div className="flex-1 p-8 overflow-y-auto bg-slate-100/50">
                              <div className="max-w-3xl mx-auto bg-white min-h-[700px] shadow-sm border border-gray-200 rounded-xl p-8 space-y-4">
                                 {currentTemplate.formSchema.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-300 border-2 border-dashed border-gray-100 rounded-lg py-32">
                                       <Layout className="w-16 h-16 mb-4 opacity-10"/>
                                       <p>点击左侧组件添加到表单</p>
                                    </div>
                                 )}
                                 {currentTemplate.formSchema.map((field, idx) => (
                                    <div key={field.id} className="group relative p-5 rounded-lg border border-transparent hover:border-purple-300 hover:bg-purple-50/20 transition-all hover:shadow-sm">
                                       <div className="flex gap-4 mb-3">
                                          <div className="flex-1">
                                             <label className="text-xs font-bold text-gray-400 uppercase block mb-1">控件标题</label>
                                             <input 
                                                className="w-full bg-transparent border-b border-gray-200 focus:border-purple-500 outline-none font-bold text-gray-800 text-sm"
                                                value={field.label}
                                                onChange={e => setCurrentTemplate(prev => prev ? ({...prev, formSchema: prev.formSchema.map(f => f.id === field.id ? {...f, label: e.target.value} : f)}) : null)}
                                             />
                                          </div>
                                          {field.type !== 'divider' && field.type !== 'note' && (
                                             <div className="w-24 pt-4">
                                                <label className="flex items-center cursor-pointer">
                                                   <input type="checkbox" checked={field.required} onChange={e => setCurrentTemplate(prev => prev ? ({...prev, formSchema: prev.formSchema.map(f => f.id === field.id ? {...f, required: e.target.checked} : f)}) : null)} className="mr-2 accent-purple-600"/>
                                                   <span className="text-xs text-gray-600">必填项</span>
                                                </label>
                                             </div>
                                          )}
                                          <div className="w-8 flex items-center justify-end">
                                             <button onClick={() => setCurrentTemplate(prev => prev ? ({...prev, formSchema: prev.formSchema.filter(f => f.id !== field.id)}) : null)} className="text-gray-300 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors">
                                                <Trash2 size={16}/>
                                             </button>
                                          </div>
                                       </div>
                                       
                                       {/* Additional Configs */}
                                       {['select', 'radio', 'checkbox'].includes(field.type) && (
                                          <div className="mb-3 bg-gray-50 p-2 rounded border border-gray-100">
                                             <label className="text-xs font-bold text-gray-400 uppercase block mb-1">选项 (逗号分隔)</label>
                                             <input className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs" value={field.options?.join(',') || ''} onChange={e => setCurrentTemplate(prev => prev ? ({...prev, formSchema: prev.formSchema.map(f => f.id === field.id ? {...f, options: e.target.value.split(',')} : f)}) : null)} />
                                          </div>
                                       )}
                                       
                                       {field.type === 'note' && (
                                          <div className="mb-3">
                                             <label className="text-xs font-bold text-gray-400 uppercase block mb-1">说明内容</label>
                                             <textarea className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs" value={field.description || ''} onChange={e => setCurrentTemplate(prev => prev ? ({...prev, formSchema: prev.formSchema.map(f => f.id === field.id ? {...f, description: e.target.value} : f)}) : null)} />
                                          </div>
                                       )}

                                       {/* Mock Display */}
                                       <div className="opacity-60 pointer-events-none">
                                          {field.type === 'divider' ? <hr className="border-gray-300"/> : 
                                           field.type === 'note' ? <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-100">{field.description || '说明文字'}</div> :
                                           <div className="h-9 bg-gray-50 border border-gray-200 rounded flex items-center px-3 text-xs text-gray-400">
                                              {field.type === 'file' ? '附件上传控件' : field.type === 'user' ? '人员选择器' : field.placeholder || '输入框预览'}
                                           </div>
                                          }
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        </>
                     )}

                     {/* --- WORKFLOW EDITOR --- */}
                     {activeTab === 'workflow' && (
                        <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
                           <div className="max-w-4xl mx-auto space-y-8 relative pb-20">
                              <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-gray-200 z-0"></div>
                              {currentTemplate.workflow.map((node, idx) => (
                                 <div key={node.id} className="relative z-10 pl-16 group">
                                    <div className={`absolute left-4 top-6 w-8 h-8 -ml-4 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-white 
                                       ${node.type === 'start' ? 'bg-green-500' : node.type === 'end' ? 'bg-slate-800' : node.type === 'parallel' ? 'bg-orange-500' : node.type === 'exclusive' ? 'bg-yellow-500' : 'bg-blue-600'}`}>
                                       {node.type === 'start' ? <Play size={12} fill="currentColor"/> : 
                                        node.type === 'end' ? <StopCircle size={14} /> : 
                                        node.type === 'parallel' ? <GitBranch size={14} /> :
                                        node.type === 'exclusive' ? <Split size={12} /> :
                                        <CheckSquare size={12} />}
                                    </div>

                                    <div className={`bg-white p-5 rounded-xl shadow-sm border transition-all ${node.type === 'exclusive' || node.type === 'parallel' ? 'border-l-4 border-l-orange-400 border-gray-200' : 'border-gray-200'}`}>
                                       <div className="flex justify-between items-start mb-4">
                                          <div>
                                             <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                   {node.type === 'exclusive' ? '条件网关' : node.type === 'parallel' ? '并行网关' : node.type.toUpperCase()}
                                                </span>
                                                <span className="text-xs font-mono text-gray-300">#{node.id}</span>
                                             </div>
                                             <input 
                                                className="font-bold text-lg text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-purple-500 outline-none mt-1 w-64"
                                                value={node.name}
                                                onChange={e => setCurrentTemplate(prev => prev ? ({...prev, workflow: prev.workflow.map(n => n.id === node.id ? {...n, name: e.target.value} : n)}) : null)}
                                             />
                                          </div>
                                          <div className="flex space-x-2">
                                             {node.type !== 'end' && node.type !== 'start' && (
                                                <button 
                                                   onClick={() => setCurrentTemplate(prev => prev ? ({...prev, workflow: prev.workflow.filter(n => n.id !== node.id)}) : null)}
                                                   className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50"
                                                >
                                                   <Trash2 size={16}/>
                                                </button>
                                             )}
                                          </div>
                                       </div>

                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                             <label className="text-xs font-bold text-gray-400 uppercase block mb-1">处理人 / 角色</label>
                                             <select 
                                                className="w-full text-sm bg-gray-50 border border-gray-200 rounded p-2"
                                                value={node.role}
                                                onChange={e => setCurrentTemplate(prev => prev ? ({...prev, workflow: prev.workflow.map(n => n.id === node.id ? {...n, role: e.target.value as any} : n)}) : null)}
                                             >
                                                <option value="ALL">所有人 (Any)</option>
                                                {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                                             </select>
                                          </div>
                                          
                                          <div>
                                             <label className="text-xs font-bold text-gray-400 uppercase block mb-1">节点类型</label>
                                             <select 
                                                className="w-full text-sm bg-gray-50 border border-gray-200 rounded p-2"
                                                value={node.type}
                                                onChange={e => setCurrentTemplate(prev => prev ? ({...prev, workflow: prev.workflow.map(n => n.id === node.id ? {...n, type: e.target.value as any} : n)}) : null)}
                                             >
                                                <option value="process">普通任务节点</option>
                                                <option value="exclusive">排他网关 (Exclusive)</option>
                                                <option value="parallel">并行网关 (Parallel)</option>
                                                <option value="start">开始节点</option>
                                                <option value="end">结束节点</option>
                                             </select>
                                          </div>

                                          {node.type !== 'end' && (
                                             <div className="col-span-full">
                                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1 flex items-center">
                                                   <ArrowRight className="w-3 h-3 mr-1"/> 流转至 (输入节点ID，逗号分隔)
                                                </label>
                                                <input 
                                                   className="w-full text-sm font-mono bg-blue-50 border border-blue-100 text-blue-700 rounded p-2"
                                                   placeholder="e.g. node_1, node_2"
                                                   value={node.nextNodes.join(', ')}
                                                   onChange={e => setCurrentTemplate(prev => prev ? ({...prev, workflow: prev.workflow.map(n => n.id === node.id ? {...n, nextNodes: e.target.value.split(',').map(s=>s.trim())} : n)}) : null)}
                                                />
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                   {currentTemplate.workflow.filter(n => n.id !== node.id).map(target => (
                                                      <span key={target.id} 
                                                         className="text-[10px] px-2 py-1 bg-gray-100 text-gray-500 rounded cursor-pointer border border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors"
                                                         onClick={() => {
                                                            const newTargets = node.nextNodes.includes(target.id) ? node.nextNodes : [...node.nextNodes, target.id];
                                                            setCurrentTemplate(prev => prev ? ({...prev, workflow: prev.workflow.map(n => n.id === node.id ? {...n, nextNodes: newTargets} : n)}) : null);
                                                         }}
                                                      >
                                                         {target.name}
                                                      </span>
                                                   ))}
                                                </div>
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                 </div>
                              ))}

                              <div className="pl-16">
                                 <button 
                                    onClick={() => setCurrentTemplate(prev => prev ? ({...prev, workflow: [...prev.workflow, { id: `node_${Date.now()}`, name: '新任务', type: 'process', role: 'ALL', nextNodes: [] }]}) : null)}
                                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 font-bold hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all flex justify-center items-center"
                                 >
                                    <Plus size={20} className="mr-2" /> 添加流程节点
                                 </button>
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               </>
            ) : (
               <div className="flex flex-col items-center justify-center h-full text-gray-300">
                  <GitMerge className="w-20 h-20 mb-6 opacity-20"/>
                  <p className="text-lg font-medium text-gray-400">请从左侧选择一个流程模板</p>
                  <button onClick={() => { setCurrentTemplate({...DEFAULT_TEMPLATE}); }} className="mt-4 text-purple-600 hover:underline">或点击新建</button>
               </div>
            )}
         </div>
      </div>

      {msg && (
         <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-lg font-medium animate-in slide-in-from-bottom-5 ${msg.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {msg.text}
         </div>
      )}

      {previewMode && <FormPreviewModal />}
    </div>
  );
};

export default ProcessDesigner;