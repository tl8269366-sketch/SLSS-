
import { OrderStatus, UserRole, Permission, SystemSettings } from "./types";

export const APP_NAME = "SLSS - 服务器全生命周期系统";

export const ROLE_COLORS = {
  [UserRole.ADMIN]: "bg-purple-100 text-purple-800",
  [UserRole.MANAGER]: "bg-blue-100 text-blue-800",
  [UserRole.TECHNICIAN]: "bg-green-100 text-green-800",
  [UserRole.PRODUCTION]: "bg-orange-100 text-orange-800",
};

export const STATUS_COLORS = {
  [OrderStatus.PENDING]: "bg-gray-100 text-gray-800",
  [OrderStatus.ASSIGNED]: "bg-blue-100 text-blue-800",
  [OrderStatus.CHECKING]: "bg-yellow-100 text-yellow-800",
  [OrderStatus.QA_AGING]: "bg-indigo-100 text-indigo-800",
  [OrderStatus.SHIPPED]: "bg-cyan-100 text-cyan-800",
  [OrderStatus.CLOSED]: "bg-slate-800 text-slate-100",
};

// Chinese Translations for Display
export const STATUS_LABELS = {
  [OrderStatus.PENDING]: "待处理",
  [OrderStatus.ASSIGNED]: "已分配",
  [OrderStatus.CHECKING]: "检测/维修中",
  [OrderStatus.QA_AGING]: "老化测试",
  [OrderStatus.SHIPPED]: "已发货",
  [OrderStatus.CLOSED]: "已关闭",
};

export const ROLE_LABELS = {
  [UserRole.ADMIN]: "管理员",
  [UserRole.MANAGER]: "服务经理",
  [UserRole.TECHNICIAN]: "技术工程师",
  [UserRole.PRODUCTION]: "生产专员",
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  'VIEW_DASHBOARD': '查看仪表盘',
  'MANAGE_SYSTEM': '系统高级配置',
  // After Sales
  'VIEW_ORDERS': '查看售后工单',
  'MANAGE_ORDERS': '管理/处理工单',
  'DESIGN_PROCESS': '设计业务流程',
  // Production
  'PROD_ENTRY_ASSEMBLY': '生产录入(组装)',
  'PROD_ENTRY_INSPECT_INIT': '生产录入(初检)',
  'PROD_ENTRY_AGING': '生产录入(老化)',
  'PROD_ENTRY_INSPECT_FINAL': '生产录入(终检)',
  'PROD_REPAIR': '生产维修系统',
  'PROD_QUERY': '生产记录查询'
};

// Helper to determine mode dynamically
export const isMockMode = (): boolean => {
  try {
    const settingsStr = localStorage.getItem('slss_system_settings');
    if (settingsStr) {
      const settings: SystemSettings = JSON.parse(settingsStr);
      // Explicitly check for 'production' mode
      return settings.systemMode !== 'production';
    }
  } catch (e) {
    console.warn("Failed to parse system settings, defaulting to Demo mode");
  }
  // Default to Demo mode if no settings found (safety first)
  return true;
};

export const MOCK_MODE = isMockMode();
