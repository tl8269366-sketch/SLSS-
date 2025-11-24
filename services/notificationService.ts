import { NotificationConfig, RepairOrder, User } from "../types";

const STORAGE_KEY = 'slss_notification_config';

const DEFAULT_CONFIG: NotificationConfig = {
  smtp: {
    enabled: false,
    host: 'smtp.exmail.qq.com',
    port: 465,
    secure: true,
    user: '',
    pass: '',
    fromName: 'SLSS System',
    fromEmail: ''
  },
  robots: {
    wecom: { enabled: false, webhook: '' },
    dingtalk: { enabled: false, webhook: '' },
    feishu: { enabled: false, webhook: '' }
  }
};

export const getNotificationConfig = (): NotificationConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load notification config", e);
  }
  return DEFAULT_CONFIG;
};

export const saveNotificationConfig = (config: NotificationConfig) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const sendNotification = async (
  type: 'ORDER_CREATED' | 'ORDER_ASSIGNED' | 'ORDER_CLOSED', 
  order: RepairOrder,
  targetUser?: User
) => {
  const config = getNotificationConfig();
  const timestamp = new Date().toLocaleString();
  
  let title = '';
  let content = '';
  // Markdown optimized for IM tools
  let markdown = '';

  switch (type) {
    case 'ORDER_CREATED':
      title = `🆕 新工单提醒: ${order.order_number}`;
      content = `收到新的维修工单。\nSN: ${order.machine_sn}\n客户: ${order.customer_name}\n故障: ${order.fault_description}\n默认处理人: ${targetUser?.username || '未分配'}`;
      markdown = `## ${title}\n> **SN:** <font color="info">${order.machine_sn}</font>\n> **客户:** ${order.customer_name}\n> **故障:** ${order.fault_description}\n> **默认处理人:** ${targetUser?.username || '未分配'}`;
      break;
    case 'ORDER_ASSIGNED':
      title = `👉 工单指派: ${order.order_number}`;
      content = `工单已指派给您。\nSN: ${order.machine_sn}\n当前状态: ${order.status}\n操作时间: ${timestamp}`;
      markdown = `## ${title}\n> **SN:** <font color="info">${order.machine_sn}</font>\n> **状态:** ${order.status}\n> **处理人:** @${targetUser?.username}\n> **时间:** ${timestamp}`;
      break;
    case 'ORDER_CLOSED':
      title = `✅ 工单结单: ${order.order_number}`;
      content = `工单已完成处理并关闭。\nSN: ${order.machine_sn}\n最终状态: CLOSED`;
      markdown = `## ${title}\n> **SN:** <font color="info">${order.machine_sn}</font>\n> **状态:** <font color="green">CLOSED</font>\n> **处理完成**`;
      break;
  }

  // 1. Simulate SMTP Sending
  if (config.smtp.enabled && config.smtp.user) {
    console.log(`[SMTP MOCK] Sending email to ${targetUser?.username || 'Admin'}...`);
    console.log(`Subject: ${title}`);
    console.log(`Body: ${content}`);
    // In a real app, you would call backend API here:
    // await fetch('/api/notify/email', { method: 'POST', body: ... });
  }

  // 2. Simulate Robot Webhooks
  if (config.robots.wecom.enabled && config.robots.wecom.webhook) {
    console.log(`[WeCom MOCK] Posting to ${config.robots.wecom.webhook}`);
    console.log(`Markdown Content:\n${markdown}`);
    // await fetch(config.robots.wecom.webhook, { method: 'POST', body: JSON.stringify({ msgtype: "markdown", markdown: { content: markdown } }) });
  }

  if (config.robots.dingtalk.enabled && config.robots.dingtalk.webhook) {
    console.log(`[DingTalk MOCK] Posting to ${config.robots.dingtalk.webhook}`);
    console.log(`Markdown Content:\n${markdown}`);
    // await fetch(config.robots.dingtalk.webhook, { method: 'POST', body: JSON.stringify({ msgtype: "markdown", markdown: { title: title, text: markdown } }) });
  }

  if (config.robots.feishu.enabled && config.robots.feishu.webhook) {
    console.log(`[Feishu MOCK] Posting to ${config.robots.feishu.webhook}`);
    console.log(`Text: ${title}\n${content}`);
    // await fetch(config.robots.feishu.webhook, { method: 'POST', body: JSON.stringify({ msg_type: "text", content: { text: title + "\n" + content } }) });
  }

  return true;
};