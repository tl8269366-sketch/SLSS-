
import { OrderStatus, UserRole, Permission } from "./types";

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
  'VIEW_ORDERS': '查看工单列表',
  'MANAGE_ORDERS': '管理/处理工单',
  'VIEW_PRODUCTION': '查看生产数据 (ERP)',
  'MANAGE_PRODUCTION': '录入/导入生产数据',
  'MANAGE_SYSTEM': '系统高级配置'
};

export const MOCK_MODE = true; // Set to false if connecting to real backend