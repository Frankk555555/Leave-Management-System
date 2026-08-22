-- ================================================================
-- Performance Index Optimization Script
-- ================================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS AddIndexIfNotExists$$
CREATE PROCEDURE AddIndexIfNotExists(
    IN p_table_name VARCHAR(64),
    IN p_index_name VARCHAR(64),
    IN p_index_cols VARCHAR(255)
)
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND INDEX_NAME = p_index_name;

    IF v_count = 0 THEN
        SET @sql = CONCAT('CREATE INDEX ', p_index_name, ' ON ', p_table_name, '(', p_index_cols, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('Created index ', p_index_name, ' on ', p_table_name) AS result;
    ELSE
        SELECT CONCAT('Index ', p_index_name, ' already exists on ', p_table_name) AS result;
    END IF;
END$$

DELIMITER ;

-- 1. leave_requests: Composite user + status + start_date
CALL AddIndexIfNotExists('leave_requests', 'idx_leave_requests_user_status_start_date', 'user_id, status, start_date');
CALL AddIndexIfNotExists('leave_requests', 'idx_leave_requests_status_start_date', 'status, start_date');

-- 2. users: department + active, role + active, supervisor
CALL AddIndexIfNotExists('users', 'idx_users_dept_active', 'department_id, is_active');
CALL AddIndexIfNotExists('users', 'idx_users_role_active', 'role, is_active');
CALL AddIndexIfNotExists('users', 'idx_users_supervisor', 'supervisor_id');

-- 3. leave_history: request_id + created_at, action_by
CALL AddIndexIfNotExists('leave_history', 'idx_leave_history_request_created', 'leave_request_id, created_at');
CALL AddIndexIfNotExists('leave_history', 'idx_leave_history_action_by', 'action_by');

-- 4. notifications: user_id + is_read + created_at
CALL AddIndexIfNotExists('notifications', 'idx_notifications_user_read_created', 'user_id, is_read, created_at');

-- Clean up helper procedure
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;
