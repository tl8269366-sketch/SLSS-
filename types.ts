

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  TECHNICIAN = 'TECHNICIAN',
  PRODUCTION = 'PRODUCTION'
}

export type Permission = 
  | 'VIEW_DASHBOARD'
  | 'MANAGE_SYSTEM'
  | 'VIEW_ORDERS'
  | 'MANAGE_ORDERS'
  | 'DESIGN_PROCESS'
  | 'PROD_ENTRY_ASSEMBLY'      
  | 'PROD_ENTRY_INSPECT_INIT'  
  | 'PROD_ENTRY_AGING'         
  | 'PROD_ENTRY_INSPECT_FINAL' 
  | 'PROD_REPAIR'              
  | 'PROD_QUERY'               

export enum OrderStatus {
  PENDING = 'PENDING',         
  ASSIGNED = 'ASSIGNED',       
  CHECKING = 'CHECKING',       
  QA_AGING = 'QA_AGING',       
  SHIPPED = 'SHIPPED',         
  CLOSED = 'CLOSED'            
}

export enum DiscoveryPhase {
  IN_USE = '使用中',
  UNUSED = '未使用',
  PRODUCTION_RETURN = '生产返回',
  LOAN_RETURN = '借测归还',
  TEST_RETURN = '退测',
  OTHER = '其他'
}

export interface User {
  id: number;
  username: string;
  password?: string; 
  role: UserRole;
  permissions: Permission[]; 
  status: 'active' | 'pending';
  phone?: string;
}

export interface Asset {
  id?: string; 
  contract_no: string; 
  customer_name?: string; // Added field
  batch_name?: string; 
  invoice_date: string; 
  model: string; 
  machine_sn: string; 
  production_stage?: string;
  current_operator?: string; 
  
  // Standard fields (kept for type safety, but interface allows extras)
  mb_model?: string; 
  mb_sn?: string; 
  mb_operator?: string;
  cpu_model?: string; 
  cpu_sn?: string; 
  cpu_sn_2?: string; 
  cpu_operator?: string;
  psu_info?: string; 
  psu_cage_sn?: string; 
  psu_module_1_sn?: string; 
  psu_module_2_sn?: string; 
  psu_operator?: string;
  hdd_info?: string; 
  hdd_sn?: string; 
  hdd_operator?: string;
  mem_info?: string; 
  mem_sns?: string; 
  mem_operator?: string;
  pcie_sn?: string; 
  pcie_operator?: string;
  
  created_at?: string;
  factory_config_json?: string; 
  
  // Allow dynamic keys for custom columns (e.g. cpu_sn_3, hdd_sn_2)
  [key: string]: any;
}

export interface TestReport {
  id: number;
  machine_sn: string;
  test_type: 'STRESS_CPU' | 'MEMTEST' | 'IO_CHECK';
  status: 'PASS' | 'FAIL';
  log_snippet: string;
  report_url?: string;
  timestamp: string;
}

export interface LogisticsRecord {
  id: number;
  order_id: number;
  status: string;
  location: string;
  timestamp: string;
}

export interface RepairPartItem {
  id: string;
  part_name: string;
  old_sn: string;
  new_sn: string;
}

// --- Dynamic Process & Form Types (Enhanced) ---

export type FormFieldType = 
  | 'text' | 'textarea' | 'number' // Basic Inputs
  | 'select' | 'radio' | 'checkbox' // Choice Inputs
  | 'date' | 'time' // Date/Time
  | 'user' | 'dept' // Organizational
  | 'file' // Advanced
  | 'divider' | 'note'; // Layout

export interface FormFieldConfig {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[]; // For select/radio/checkbox
  placeholder?: string;
  width?: 'full' | 'half';
  description?: string; // For 'note' type or help text
  defaultValue?: any;
}

export interface WorkflowNode {
  id: string;
  name: string; 
  // Enhanced Types: Parallel (Fork), Exclusive (Decision)
  type: 'start' | 'process' | 'end' | 'parallel' | 'exclusive';
  role: UserRole | 'ALL'; 
  nextNodes: string[]; 
}

export interface ProcessTemplate {
  id: string;
  name: string;
  description?: string;
  targetModule: 'service' | 'production'; // New field: determines menu placement
  formSchema: FormFieldConfig[];
  workflow: WorkflowNode[];
  created_at: string;
  updated_at: string;
}

export interface RepairOrder {
  id: number;
  order_number: string;
  machine_sn: string;
  customer_name: string; 
  fault_description: string;
  discovery_phase: DiscoveryPhase; 
  
  shipment_model?: string;
  shipment_date?: string;
  shipment_config_json?: string; 
  received_config_json?: string; 
  actual_fault_description?: string; 
  parts_list?: RepairPartItem[]; 
  report_data_json?: string; 
  
  status: OrderStatus | string;
  assigned_to?: number; 
  logistics_provider?: string; 
  tracking_number?: string;
  
  // Dynamic Data
  template_id?: string;
  module?: 'service' | 'production'; // New field: to categorize orders
  current_node_id?: string; 
  dynamic_data?: Record<string, any>; 
  
  created_at: string;
  updated_at: string;
}

export interface LifecycleEvent {
  id: number;
  machine_sn: string;
  event_type: 'FACTORY_SHIP' | 'REPAIR_SWAP' | 'STRESS_TEST' | 'LOGISTICS_UPDATE' | 'PROD_STAGE' | 'PROD_REPAIR';
  part_name?: string;
  old_sn?: string; 
  new_sn?: string; 
  bad_part_reason?: string; 
  operator?: string; 
  timestamp: string;
  technician_name?: string;
  details?: string;
}

export type DatabaseType = 'mysql' | 'postgres' | 'oracle' | 'sqlite';
export interface DatabaseConfig {
  type: DatabaseType;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  databaseName?: string;
  filePath?: string; 
  ssl?: boolean;
}
export interface RedisConfig {
  enabled: boolean;
  host: string;
  port: number;
  password?: string;
  dbIndex: number;
}
export interface AIConfig {
  provider: 'google' | 'openai' | 'deepseek' | 'zhipu' | 'modelscope' | 'custom';
  model: string;
  baseUrl: string;
  apiKey: string;
}
export interface SMTPConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}
export interface RobotConfig {
  wecom: { enabled: boolean; webhook: string; };
  dingtalk: { enabled: boolean; webhook: string; secret?: string; };
  feishu: { enabled: boolean; webhook: string; };
}
export interface NotificationConfig {
  smtp: SMTPConfig;
  robots: RobotConfig;
}
export interface SystemSettings {
  appName: string;
  systemMode: 'production' | 'demo'; // NEW: Toggle between real DB and Mock data
  maintenanceMode: boolean;
  logRetentionDays: number;
  defaultAssigneeId?: number; 
  productionOperators?: string[]; 
}
export interface SystemStatus {
  cpuUsage: number;
  memoryUsage: number;
  uptime: number; 
  dbStatus: 'connected' | 'disconnected' | 'latency_high';
  dbLatency: number; 
  redisStatus: 'connected' | 'disconnected' | 'disabled';
  activeConnections: number;
}