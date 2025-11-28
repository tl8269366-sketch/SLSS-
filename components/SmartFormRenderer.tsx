import React from 'react';
import { FormFieldConfig } from '../types';
import { User, Upload, Calendar, Users, FileText, AlertCircle, CheckSquare, Info, Loader2 } from 'lucide-react';
import { MOCK_USERS } from '../services/mockData';

interface SmartFormRendererProps {
  schema: FormFieldConfig[];
  data: Record<string, any>;
  errors?: Record<string, string>; // Validation errors
  onChange?: (key: string, value: any) => void;
  readOnly?: boolean;
}

export const SmartFormRenderer: React.FC<SmartFormRendererProps> = ({ schema, data, errors = {}, onChange, readOnly = false }) => {
  const [uploading, setUploading] = React.useState<string | null>(null); // Track uploading field ID

  const handleChange = (key: string, value: any) => {
    if (onChange) onChange(key, value);
  };

  const handleFileUpload = async (fieldLabel: string, file: File) => {
    setUploading(fieldLabel);
    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64Content = reader.result as string;
            
            // Send to backend
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    content: base64Content,
                    type: file.type
                })
            });
            
            if (res.ok) {
                const data = await res.json();
                handleChange(fieldLabel, data.filename); // Store filename/path
            } else {
                alert("Upload failed");
            }
            setUploading(null);
        };
    } catch (e) {
        console.error(e);
        setUploading(null);
    }
  };

  if (!schema || schema.length === 0) {
    return (
        <div className="text-gray-400 text-sm italic p-4 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50">
            暂无表单定义
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {schema.map((field) => {
        const value = data[field.label] || '';
        const error = errors[field.label];

        // --- Layout Components (Full Width) ---
        if (field.type === 'divider') {
          return <div key={field.id} className="col-span-full border-t border-gray-200 my-2"></div>;
        }
        if (field.type === 'note') {
          return (
            <div key={field.id} className="col-span-full bg-blue-50 text-blue-700 px-4 py-3 rounded-md text-sm flex items-start border border-blue-100">
              <Info className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
              <span>{field.description || '说明文字'}</span>
            </div>
          );
        }

        // --- Input Components ---
        return (
          <div key={field.id} className={field.width === 'half' ? '' : 'col-span-full'}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {field.label} {field.required && !readOnly && <span className="text-red-500">*</span>}
            </label>

            {readOnly ? (
              // READ-ONLY DISPLAY MODE
              <div className="text-sm text-gray-900 font-medium bg-gray-50/50 px-3 py-2.5 rounded border border-gray-200 min-h-[42px] flex items-center">
                 {field.type === 'file' ? (
                    value ? (
                      <a href={`/data/${value}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline cursor-pointer flex items-center hover:text-blue-800">
                        <FileText className="w-3 h-3 mr-1"/> {value}
                      </a>
                    ) : <span className="text-gray-400 text-xs">无附件</span>
                 ) : field.type === 'checkbox' ? (
                    <div className="flex gap-2 flex-wrap">
                      {Array.isArray(value) && value.length > 0 ? value.map((v: string) => (
                        <span key={v} className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded border border-blue-200">{v}</span>
                      )) : <span className="text-gray-400 text-xs italic">未选择</span>}
                    </div>
                 ) : (
                    value || <span className="text-gray-400 text-xs italic">未填写</span>
                 )}
              </div>
            ) : (
              // EDIT MODE
              <div className="relative">
                {/* Text / Number / Date / Time */}
                {['text', 'number', 'date', 'time'].includes(field.type) && (
                  <div className="relative">
                    <input
                      type={field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : field.type === 'number' ? 'number' : 'text'}
                      className={`block w-full border rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm transition-all
                        ${error 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50 text-red-900 placeholder-red-300' 
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white'
                        }`}
                      placeholder={field.placeholder}
                      value={value}
                      onChange={(e) => handleChange(field.label, e.target.value)}
                    />
                    {field.type === 'date' && !value && <Calendar className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />}
                  </div>
                )}

                {/* Textarea */}
                {field.type === 'textarea' && (
                  <textarea
                    rows={3}
                    className={`block w-full border rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm
                      ${error ? 'border-red-300 focus:ring-red-200 bg-red-50' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder={field.placeholder}
                    value={value}
                    onChange={(e) => handleChange(field.label, e.target.value)}
                  />
                )}

                {/* Select */}
                {field.type === 'select' && (
                  <select
                    className={`block w-full border rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 sm:text-sm bg-white
                      ${error ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`}
                    value={value}
                    onChange={(e) => handleChange(field.label, e.target.value)}
                  >
                    <option value="">-- 请选择 --</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {/* Radio */}
                {field.type === 'radio' && (
                  <div className={`flex flex-wrap gap-4 mt-2 p-2 rounded ${error ? 'bg-red-50 border border-red-100' : ''}`}>
                    {field.options?.map((opt) => (
                      <label key={opt} className="flex items-center cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-2 transition-colors ${value === opt ? 'border-blue-600 bg-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}>
                           {value === opt && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <span className="text-sm text-gray-700">{opt}</span>
                        <input type="radio" className="hidden" checked={value === opt} onChange={() => handleChange(field.label, opt)} />
                      </label>
                    ))}
                  </div>
                )}

                {/* Checkbox */}
                {field.type === 'checkbox' && (
                  <div className={`flex flex-wrap gap-4 mt-2 p-2 rounded ${error ? 'bg-red-50 border border-red-100' : ''}`}>
                    {field.options?.map((opt) => {
                      const currentVals = Array.isArray(value) ? value : [];
                      const isChecked = currentVals.includes(opt);
                      return (
                        <label key={opt} className="flex items-center cursor-pointer group">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 transition-colors ${isChecked ? 'border-blue-600 bg-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}>
                             {isChecked && <CheckSquare className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm text-gray-700">{opt}</span>
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isChecked}
                            onChange={(e) => {
                              const newVals = isChecked
                                ? currentVals.filter((v: string) => v !== opt)
                                : [...currentVals, opt];
                              handleChange(field.label, newVals);
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* User Selector */}
                {field.type === 'user' && (
                  <div className="relative">
                    <select
                      className={`block w-full pl-10 border rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 sm:text-sm appearance-none bg-white
                        ${error ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`}
                      value={value}
                      onChange={(e) => handleChange(field.label, e.target.value)}
                    >
                      <option value="">选择人员</option>
                      {MOCK_USERS.map(u => <option key={u.id} value={u.username}>{u.username} ({u.role})</option>)}
                    </select>
                    <User className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                )}

                {/* Dept Selector */}
                {field.type === 'dept' && (
                  <div className="relative">
                    <select
                        className={`block w-full pl-10 border rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 sm:text-sm appearance-none bg-white
                          ${error ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`}
                        value={value}
                        onChange={(e) => handleChange(field.label, e.target.value)}
                    >
                        <option value="">选择部门</option>
                        <option value="IT部">IT部</option>
                        <option value="生产部">生产部</option>
                        <option value="售后部">售后部</option>
                        <option value="研发部">研发部</option>
                    </select>
                    <Users className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                )}

                {/* File Upload */}
                {field.type === 'file' && (
                  <div className="flex items-center justify-center w-full">
                    {uploading === field.label ? (
                        <div className="flex flex-col items-center justify-center w-full h-24 border border-gray-200 rounded-lg bg-gray-50">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2"/>
                            <span className="text-xs text-gray-500">上传中...</span>
                        </div>
                    ) : (
                        <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                            ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className={`w-6 h-6 mb-2 ${error ? 'text-red-400' : 'text-gray-400'}`} />
                            <p className={`text-xs ${error ? 'text-red-500' : 'text-gray-500'}`}>{value ? `已上传: ${value}` : '点击上传附件 (保存到本地 data/ 目录)'}</p>
                        </div>
                        <input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => {
                                if (e.target.files?.[0]) handleFileUpload(field.label, e.target.files[0]);
                            }}
                        />
                        </label>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="flex items-center mt-1 text-xs text-red-600 animate-in slide-in-from-top-1">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
