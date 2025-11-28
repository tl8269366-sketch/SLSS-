SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'USER',
  `status` VARCHAR(20) DEFAULT 'active',
  `phone` VARCHAR(20) DEFAULT NULL,
  `permissions` JSON DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `process_templates` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `target_module` VARCHAR(50),
  `form_schema` JSON,
  `workflow` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `repair_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(50) NOT NULL UNIQUE,
  `machine_sn` VARCHAR(100) NOT NULL,
  `customer_name` VARCHAR(100),
  `fault_description` TEXT,
  `discovery_phase` VARCHAR(50),
  `status` VARCHAR(50) DEFAULT 'pending',
  `assigned_to` VARCHAR(50),
  `template_id` VARCHAR(50),
  `module` VARCHAR(50),
  `current_node_id` VARCHAR(50),
  `dynamic_data` JSON,
  `shipment_config_json` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_machine_sn` (`machine_sn`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lifecycle_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `machine_sn` VARCHAR(100) NOT NULL,
  `event_type` VARCHAR(50) NOT NULL,
  `part_name` VARCHAR(100),
  `old_sn` VARCHAR(100),
  `new_sn` VARCHAR(100),
  `bad_part_reason` VARCHAR(255),
  `operator` VARCHAR(50),
  `details` TEXT,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_machine_sn` (`machine_sn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `production_batches` (
  `contract_no` VARCHAR(100) PRIMARY KEY,
  `model` VARCHAR(100),
  `customer_name` VARCHAR(100),
  `column_config` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `production_assets` (
  `_id` VARCHAR(100) PRIMARY KEY,
  `contract_no` VARCHAR(100) NOT NULL,
  `machine_sn` VARCHAR(100),
  `model` VARCHAR(100),
  `customer_name` VARCHAR(100),
  `data_json` JSON,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_contract` (`contract_no`),
  INDEX `idx_machine_sn` (`machine_sn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
