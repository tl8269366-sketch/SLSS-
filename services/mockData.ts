

import { User, UserRole, OrderStatus, RepairOrder, Asset, LifecycleEvent, TestReport, LogisticsRecord, DiscoveryPhase } from "../types";

export const MOCK_USERS: User[] = [
  { 
    id: 1, 
    username: 'stars', 
    password: 'Gyh@20210625', 
    role: UserRole.ADMIN, 
    status: 'active',
    permissions: [
      'VIEW_DASHBOARD', 
      'VIEW_ORDERS', 
      'MANAGE_ORDERS', 
      'DESIGN_PROCESS',
      'PROD_ENTRY_ASSEMBLY', 
      'PROD_ENTRY_INSPECT_INIT', 
      'PROD_ENTRY_AGING', 
      'PROD_ENTRY_INSPECT_FINAL', 
      'PROD_REPAIR', 
      'PROD_QUERY', 
      'MANAGE_SYSTEM'
    ]
  }
];

export const MOCK_ASSETS: Asset[] = [
  {
    contract_no: '551C FKF',
    invoice_date: '2023-01-15',
    model: '551C FKF',
    machine_sn: 'HM217S007647',
    mb_model: 'X11DPI-N',
    mb_sn: '223B20146',
    mb_operator: '王树鹏',
    cpu_model: '5115',
    cpu_sn: 'M93B5J2600159',
    cpu_sn_2: 'M8Y162M800360',
    cpu_operator: '刘峻良',
    psu_info: '康舒 800W',
    psu_cage_sn: 'ZH0821102100562A00',
    psu_module_1_sn: 'FSE052A0400CGB2201000999',
    psu_module_2_sn: 'FSE052A0400CGB2201000661',
    psu_operator: '刘鎏',
    hdd_info: 'WD 4T',
    hdd_sn: 'BS0405ZH',
    hdd_operator: '乔洪泽',
    mem_info: '三星 32G 2933',
    mem_sns: 'K1CJ00011819B507B6, K1DL00011819B68083, K1DL00011819B63343',
    mem_operator: '于顺堂',
    pcie_sn: '',
    created_at: '2023-01-15',
    batch_name: 'IMPORT_TEST_001',
    factory_config_json: JSON.stringify({
      mb: { model: 'X11DPI-N', sn: '223B20146' },
      cpu: [{ model: '5115', sn: 'M93B5J2600159' }, { sn: 'M8Y162M800360' }],
      psu: { info: '康舒 800W', cage_sn: 'ZH0821102100562A00' },
      storage: { model: 'WD 4T', sn: 'BS0405ZH' },
      memory: { model: '三星 32G 2933', sns: 'K1CJ00011819B507B6, K1DL00011819B68083' }
    })
  },
  {
    contract_no: 'CONT-2023002',
    invoice_date: '2023-02-20',
    model: '551C FKF',
    machine_sn: 'SRV-2023-002',
    mb_model: 'X11DPI-N',
    mb_sn: 'I721A1846',
    cpu_model: '5115',
    cpu_sn: 'M0C084J800232',
    psu_info: '康舒 800W',
    psu_cage_sn: 'ZH0824041500293A00',
    psu_module_1_sn: 'FSE052A0400CGB25280',
    created_at: '2023-02-20',
    batch_name: 'PROD_20230220_0900',
    factory_config_json: JSON.stringify({
      mb: { model: 'X11DPI-N', sn: 'I721A1846' },
      cpu: [{ model: '5115', sn: 'M0C084J800232' }],
      psu: { info: '康舒 800W' }
    })
  },
  {
    contract_no: 'CONT-2023003',
    invoice_date: '2023-03-10',
    model: '5406 FAF',
    machine_sn: 'WARN-2023-REPEAT', 
    mb_model: 'X11DPI-N',
    mb_sn: 'OLD-MB-001',
    created_at: '2023-03-10',
    batch_name: 'PROD_20230310_0900',
    factory_config_json: '{}'
  }
];

export const MOCK_ORDERS: RepairOrder[] = [
  {
    id: 101,
    order_number: 'RMA-20231025-01',
    machine_sn: 'HM217S007647',
    customer_name: '北京字节跳动科技有限公司',
    fault_description: '服务器随机内核崩溃 (Kernel Panic)。客户报告在高负载下系统不稳定。',
    discovery_phase: DiscoveryPhase.IN_USE,
    status: OrderStatus.CHECKING,
    assigned_to: 1, 
    shipment_model: '551C FKF',
    shipment_date: '2023-01-15',
    shipment_config_json: MOCK_ASSETS[0].factory_config_json,
    created_at: '2023-10-25T09:00:00Z',
    updated_at: '2023-10-26T10:00:00Z'
  },
  {
    id: 99,
    order_number: 'RMA-20230901-05',
    machine_sn: 'SRV-2023-002',
    customer_name: '阿里巴巴云计算有限公司',
    fault_description: '开机无显示，风扇狂转。已更换内存无效。',
    discovery_phase: DiscoveryPhase.IN_USE,
    status: OrderStatus.CHECKING, 
    assigned_to: 1,
    created_at: '2023-09-01T09:00:00Z', 
    updated_at: '2023-09-05T10:00:00Z'
  },
  {
    id: 102,
    order_number: 'RMA-20231027-02',
    machine_sn: 'WARN-2023-REPEAT',
    customer_name: '腾讯科技(深圳)有限公司',
    fault_description: '主板再次故障，PCIE 无法识别。',
    discovery_phase: DiscoveryPhase.IN_USE,
    status: OrderStatus.ASSIGNED,
    assigned_to: 1,
    created_at: '2023-10-27T09:00:00Z',
    updated_at: '2023-10-27T09:00:00Z'
  },
  { id: 90, order_number: 'RMA-20230801-01', machine_sn: 'SN-001', customer_name: '北京字节跳动科技有限公司', fault_description: 'Mem error', discovery_phase: DiscoveryPhase.IN_USE, status: OrderStatus.CLOSED, created_at: '2023-08-01T09:00:00Z', updated_at: '2023-08-05T10:00:00Z' },
  { id: 91, order_number: 'RMA-20230802-02', machine_sn: 'SN-002', customer_name: '百度在线网络技术有限公司', fault_description: 'HDD fail', discovery_phase: DiscoveryPhase.IN_USE, status: OrderStatus.CLOSED, created_at: '2023-08-02T09:00:00Z', updated_at: '2023-08-06T10:00:00Z' },
  { id: 92, order_number: 'RMA-20230815-03', machine_sn: 'SN-003', customer_name: '北京字节跳动科技有限公司', fault_description: 'PSU fail', discovery_phase: DiscoveryPhase.IN_USE, status: OrderStatus.CLOSED, created_at: '2023-08-15T09:00:00Z', updated_at: '2023-08-16T10:00:00Z' }
];

export const MOCK_LIFECYCLE: LifecycleEvent[] = [
  { id: 1, machine_sn: 'HM217S007647', event_type: 'FACTORY_SHIP', timestamp: '2023-01-15T08:00:00Z', details: '出厂发货' },
  { id: 2, machine_sn: 'HM217S007647', event_type: 'LOGISTICS_UPDATE', timestamp: '2023-10-25T09:00:00Z', details: '收到客户寄修机器，外观完好' },
  { id: 10, machine_sn: 'SN-001', event_type: 'REPAIR_SWAP', part_name: '内存 (Memory)', timestamp: '2023-08-04T10:00:00Z', details: '更换内存' },
  { id: 11, machine_sn: 'SN-002', event_type: 'REPAIR_SWAP', part_name: '硬盘 (Storage)', timestamp: '2023-08-05T10:00:00Z', details: '更换硬盘' },
  { id: 12, machine_sn: 'SN-003', event_type: 'REPAIR_SWAP', part_name: '电源 (PSU)', timestamp: '2023-08-16T10:00:00Z', details: '更换电源模块' },
  { id: 20, machine_sn: 'WARN-2023-REPEAT', event_type: 'REPAIR_SWAP', part_name: '主板 (Motherboard)', old_sn: 'OLD-MB-001', new_sn: 'NEW-MB-001', timestamp: '2023-06-01T10:00:00Z', details: '第一次更换主板' },
  { id: 21, machine_sn: 'WARN-2023-REPEAT', event_type: 'REPAIR_SWAP', part_name: '主板 (Motherboard)', old_sn: 'NEW-MB-001', new_sn: 'NEW-MB-002', timestamp: '2023-10-27T10:00:00Z', details: '第二次更换主板 (Recurring)' }
];

export const MOCK_TEST_REPORTS: TestReport[] = [
  {
    id: 1,
    machine_sn: 'HM217S007647',
    test_type: 'STRESS_CPU',
    status: 'FAIL',
    timestamp: '2023-10-26T11:00:00Z',
    log_snippet: `[11:00:01] Starting Stress Prime 2004 (Ortho)...\n[11:00:05] CPU0: 100% Load, Temp: 65C | Vcore: 1.2V\n[11:10:00] FATAL ERROR: Hardware failure detected at Core #4`
  }
];

export const MOCK_LOGISTICS: LogisticsRecord[] = [
  { id: 1, order_id: 101, status: '已揽收', location: '北京市海淀区上地', timestamp: '2023-10-24T14:00:00Z' },
  { id: 5, order_id: 101, status: '已签收', location: 'SLSS 维修中心收发室', timestamp: '2023-10-25T09:00:00Z' }
];

// Initial Operators
export const DEFAULT_OPERATORS = [
  "王树鹏", "乔洪泽", "吴及超", "刘峻良", "刘鎏", "于顺堂"
].sort((a, b) => a.localeCompare(b, 'zh-CN'));