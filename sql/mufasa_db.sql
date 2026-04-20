-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost
-- Tiempo de generación: 20-04-2026 a las 02:26:33
-- Versión del servidor: 10.4.28-MariaDB
-- Versión de PHP: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `mufasa_db`
--

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_archive_user` (IN `p_id_user` INT)   BEGIN
    START TRANSACTION;

    UPDATE `user`
    SET status = 'inactive'
    WHERE id_user = p_id_user;

    DELETE FROM user_team
    WHERE id_user = p_id_user;

    COMMIT;

    SELECT 'OK: User archived successfully' AS message;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_assign_user_to_team` (IN `p_id_user` INT, IN `p_id_team` INT)   BEGIN
    DECLARE v_exists INT;

    START TRANSACTION;

    SELECT COUNT(*) INTO v_exists
    FROM user_team
    WHERE id_user = p_id_user AND id_team = p_id_team;

    IF v_exists > 0 THEN
        ROLLBACK;
        SELECT 'ERROR: User is already assigned to this team' AS message;
    ELSE
        INSERT INTO user_team (id_user, id_team)
        VALUES (p_id_user, p_id_team);
        COMMIT;
        SELECT 'OK: User assigned to team successfully' AS message;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_user` (IN `p_email` VARCHAR(150), IN `p_password_hash` VARCHAR(255), IN `p_full_name` VARCHAR(150), IN `p_id_role` INT)   BEGIN
    DECLARE v_id_user INT;

    START TRANSACTION;

    INSERT INTO `user` (email, password, full_name, status)
    VALUES (p_email, p_password_hash, p_full_name, 'active');

    SET v_id_user = LAST_INSERT_ID();

    INSERT INTO user_role (id_user, id_role)
    VALUES (v_id_user, p_id_role);

    COMMIT;

    SELECT v_id_user AS new_user_id;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_pending_users` ()   BEGIN
    SELECT
        u.id_user,
        u.full_name,
        u.email,
        u.status,
        r.role_name
    FROM `user` u
    LEFT JOIN user_role ur ON ur.id_user = u.id_user
    LEFT JOIN role      r  ON r.id_role  = ur.id_role
    WHERE u.status = 'pending'
    ORDER BY u.id_user ASC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_team_members` (IN `p_id_team` INT)   BEGIN
    SELECT
        u.id_user,
        u.full_name,
        u.email,
        u.status,
        r.role_name,
        t.team_name
    FROM user_team ut
    JOIN `user` u   ON u.id_user = ut.id_user
    JOIN team   t   ON t.id_team = ut.id_team
    LEFT JOIN user_role ur ON ur.id_user = u.id_user
    LEFT JOIN role      r  ON r.id_role  = ur.id_role
    WHERE ut.id_team = p_id_team;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_user_activity` (IN `p_id_user` INT)   BEGIN
    SELECT
        u.full_name,
        u.email,
        u.status,
        r.role_name,
        (SELECT COUNT(*) FROM log         WHERE id_user = u.id_user) AS total_logs,
        (SELECT COUNT(*) FROM blocker b
          JOIN log l ON l.id_log = b.id_log
          WHERE l.id_user = u.id_user)                               AS total_blockers,
        (SELECT COUNT(*) FROM achievement WHERE id_user = u.id_user) AS total_achievements,
        (SELECT MAX(DATE(created_at)) FROM log WHERE id_user = u.id_user) AS last_log_date
    FROM `user` u
    LEFT JOIN user_role ur ON ur.id_user = u.id_user
    LEFT JOIN role      r  ON r.id_role  = ur.id_role
    WHERE u.id_user = p_id_user;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_user_logs_summary` (IN `p_id_user` INT, IN `p_period` VARCHAR(20))   BEGIN
    DECLARE v_start DATE;
    DECLARE v_end   DATE DEFAULT CURDATE();

    CASE p_period
        WHEN 'Q1' THEN
            SET v_start = DATE(CONCAT(YEAR(CURDATE()), '-01-01'));
            SET v_end   = DATE(CONCAT(YEAR(CURDATE()), '-03-31'));
        WHEN 'Q2' THEN
            SET v_start = DATE(CONCAT(YEAR(CURDATE()), '-04-01'));
            SET v_end   = DATE(CONCAT(YEAR(CURDATE()), '-06-30'));
        WHEN 'Q3' THEN
            SET v_start = DATE(CONCAT(YEAR(CURDATE()), '-07-01'));
            SET v_end   = DATE(CONCAT(YEAR(CURDATE()), '-09-30'));
        WHEN 'Q4' THEN
            SET v_start = DATE(CONCAT(YEAR(CURDATE()), '-10-01'));
            SET v_end   = DATE(CONCAT(YEAR(CURDATE()), '-12-31'));
        WHEN 'last_week'  THEN SET v_start = DATE_SUB(CURDATE(), INTERVAL 7 DAY);
        WHEN 'last_month' THEN SET v_start = DATE_SUB(CURDATE(), INTERVAL 1 MONTH);
        ELSE
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid period';
    END CASE;

    SELECT
        u.full_name,
        p_period AS period,
        COUNT(DISTINCT l.id_log)     AS total_logs,
        COUNT(DISTINCT b.id_blocker) AS total_blockers,
        MIN(DATE(l.created_at))      AS first_log,
        MAX(DATE(l.created_at))      AS last_log
    FROM `user` u
    LEFT JOIN log     l ON l.id_user = u.id_user
        AND DATE(l.created_at) BETWEEN v_start AND v_end
    LEFT JOIN blocker b ON b.id_log  = l.id_log
    WHERE u.id_user = p_id_user
    GROUP BY u.id_user, u.full_name;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `achievement`
--

CREATE TABLE `achievement` (
  `id_achievement` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` varchar(500) NOT NULL,
  `validation_status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `validated_by` int(11) DEFAULT NULL,
  `validated_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ;

--
-- Disparadores `achievement`
--
DELIMITER $$
CREATE TRIGGER `after_achievement_update` AFTER UPDATE ON `achievement` FOR EACH ROW BEGIN
    IF OLD.validation_status <> NEW.validation_status THEN
        INSERT INTO audit_log (id_user, action, entity_type, entity_id, success, detail)
        VALUES (NEW.validated_by, 'update', 'achievement', NEW.id_achievement, 1,
            CONCAT('Achievement status changed from ', OLD.validation_status, ' to ', NEW.validation_status));
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `audit_log`
--

CREATE TABLE `audit_log` (
  `id_audit` int(11) NOT NULL,
  `id_user` int(11) DEFAULT NULL,
  `action` enum('create','update','delete','link','login_fail','export') NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `success` tinyint(1) NOT NULL DEFAULT 1,
  `detail` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `blocker`
--

CREATE TABLE `blocker` (
  `id_blocker` int(11) NOT NULL,
  `id_log` int(11) NOT NULL,
  `description` text NOT NULL,
  `blocker_type` enum('organizational','technical','resource','dependency','other') NOT NULL DEFAULT 'organizational',
  `severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `resolution_status` enum('pending','resolved') NOT NULL DEFAULT 'pending',
  `detected_at` datetime NOT NULL DEFAULT current_timestamp(),
  `resolved_at` datetime DEFAULT NULL
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `goal`
--

CREATE TABLE `goal` (
  `id_goal` int(11) NOT NULL,
  `id_user` int(11) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `status` enum('active','paused','completed','cancelled') NOT NULL DEFAULT 'active',
  `is_draft` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `goal_project`
--

CREATE TABLE `goal_project` (
  `id_goal` int(11) NOT NULL,
  `id_project` int(11) NOT NULL,
  `linked_by` int(11) DEFAULT NULL,
  `linked_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `highlight`
--

CREATE TABLE `highlight` (
  `id_highlight` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `id_project` int(11) DEFAULT NULL,
  `id_team` int(11) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `impact` text DEFAULT NULL,
  `highlight_type` enum('technical','business','team','product') NOT NULL DEFAULT 'product',
  `verification_status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `highlight_date` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `log`
--

CREATE TABLE `log` (
  `id_log` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `completed` text NOT NULL,
  `planned` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Disparadores `log`
--
DELIMITER $$
CREATE TRIGGER `after_log_insert` AFTER INSERT ON `log` FOR EACH ROW BEGIN
    INSERT INTO audit_log (id_user, action, entity_type, entity_id, success, detail)
    VALUES (NEW.id_user, 'create', 'log', NEW.id_log, 1,
        CONCAT('Log entry created by user id: ', NEW.id_user));
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `log_project`
--

CREATE TABLE `log_project` (
  `id_log` int(11) NOT NULL,
  `id_project` int(11) NOT NULL,
  `id_team` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `privilege`
--

CREATE TABLE `privilege` (
  `id_privilege` int(11) NOT NULL,
  `privilege_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `privilege`
--

INSERT INTO `privilege` (`id_privilege`, `privilege_name`, `description`, `created_at`) VALUES
(1, 'manage_users', 'Create, edit and deactivate users', '2026-04-20 00:26:17'),
(2, 'manage_teams', 'Create, edit and delete teams', '2026-04-20 00:26:17'),
(3, 'manage_roles', 'Define roles and permissions', '2026-04-20 00:26:17'),
(4, 'view_team_logs', 'View team members log entries', '2026-04-20 00:26:17'),
(5, 'manage_goals', 'Create and edit strategic goals', '2026-04-20 00:26:17'),
(6, 'generate_reports', 'Generate PDF and Excel reports', '2026-04-20 00:26:17'),
(7, 'create_log', 'Create personal log entries', '2026-04-20 00:26:17'),
(8, 'view_own_logs', 'View own log history', '2026-04-20 00:26:17'),
(9, 'create_self_review', 'Generate self-review', '2026-04-20 00:26:17'),
(10, 'view_projects', 'View assigned projects', '2026-04-20 00:26:17');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `project`
--

CREATE TABLE `project` (
  `id_project` int(11) NOT NULL,
  `project_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `progress_status` enum('not_started','in_progress','on_hold','at_risk','completed','archived') NOT NULL DEFAULT 'not_started',
  `progress_percentage` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `last_progress_update` datetime DEFAULT NULL,
  `start_date` date DEFAULT curdate(),
  `end_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `project_team`
--

CREATE TABLE `project_team` (
  `id_project` int(11) NOT NULL,
  `id_team` int(11) NOT NULL,
  `assigned_by` int(11) DEFAULT NULL,
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `report`
--

CREATE TABLE `report` (
  `id_report` int(11) NOT NULL,
  `id_user` int(11) DEFAULT NULL,
  `id_project` int(11) DEFAULT NULL,
  `id_team` int(11) DEFAULT NULL,
  `report_type` varchar(50) DEFAULT NULL,
  `period` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `role`
--

CREATE TABLE `role` (
  `id_role` int(11) NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `role`
--

INSERT INTO `role` (`id_role`, `role_name`, `description`, `created_at`) VALUES
(1, 'admin', 'Full system access', '2026-04-20 00:26:17'),
(2, 'manager', 'Goals, reports and highlights management', '2026-04-20 00:26:17'),
(3, 'team-leader', 'Team management and log visibility', '2026-04-20 00:26:17'),
(4, 'employee', 'Personal log and self-review', '2026-04-20 00:26:17'),
(5, 'project-manager', 'Project planning and resource management', '2026-04-20 00:26:17');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `role_privilege`
--

CREATE TABLE `role_privilege` (
  `id_role` int(11) NOT NULL,
  `id_privilege` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `role_privilege`
--

INSERT INTO `role_privilege` (`id_role`, `id_privilege`, `created_at`) VALUES
(1, 1, '2026-04-20 00:26:17'),
(1, 2, '2026-04-20 00:26:17'),
(1, 3, '2026-04-20 00:26:17'),
(2, 5, '2026-04-20 00:26:17'),
(2, 6, '2026-04-20 00:26:17'),
(3, 4, '2026-04-20 00:26:17'),
(3, 6, '2026-04-20 00:26:17'),
(4, 7, '2026-04-20 00:26:17'),
(4, 8, '2026-04-20 00:26:17'),
(4, 9, '2026-04-20 00:26:17'),
(4, 10, '2026-04-20 00:26:17');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `summary`
--

CREATE TABLE `summary` (
  `id_summary` int(11) NOT NULL,
  `id_user` int(11) DEFAULT NULL,
  `id_project` int(11) DEFAULT NULL,
  `id_team` int(11) DEFAULT NULL,
  `generated_by` int(11) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `summary_text` text NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `team`
--

CREATE TABLE `team` (
  `id_team` int(11) NOT NULL,
  `team_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `id_leader` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user`
--

CREATE TABLE `user` (
  `id_user` int(11) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `slack_user` varchar(50) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `status` enum('pending','active','inactive') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `user`
--

INSERT INTO `user` (`id_user`, `email`, `password`, `full_name`, `slack_user`, `avatar`, `status`, `created_at`, `updated_at`) VALUES
(1, 'admin@change.org', '$2b$12$1dojbzLEjVqYsBRWfvipKOFUjus6Xd2WZ1uhKsE1hsBSrcshCR8vS', 'Paco Arreola', 'Paco.slack', NULL, 'active', '2026-04-20 00:26:17', NULL),
(2, 'pruebas1@change.org', '$2b$12$yj9RLMnlzIjQILoKjgyzOumVsBM9HdJRdNSZSezNEK5vIIp6cgHyW', 'Usuario de Prueba 1', 'pruebas1.slack', NULL, 'active', '2026-04-20 00:26:17', NULL);

--
-- Disparadores `user`
--
DELIMITER $$
CREATE TRIGGER `after_user_insert` AFTER INSERT ON `user` FOR EACH ROW BEGIN
    INSERT INTO audit_log (id_user, action, entity_type, entity_id, success, detail)
    VALUES (@current_user_id, 'create', 'user', NEW.id_user, 1,
        CONCAT('New user created: ', NEW.full_name, ' (', NEW.email, ')'));
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_user_update` AFTER UPDATE ON `user` FOR EACH ROW BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO audit_log (id_user, action, entity_type, entity_id, success, detail)
        VALUES (@current_user_id, 'update', 'user', NEW.id_user, 1,
            CONCAT('User status changed from ', OLD.status, ' to ', NEW.status));
    END IF;

    IF OLD.full_name <> NEW.full_name THEN
        INSERT INTO audit_log (id_user, action, entity_type, entity_id, success, detail)
        VALUES (@current_user_id, 'update', 'user', NEW.id_user, 1,
            CONCAT('User name changed from ', OLD.full_name, ' to ', NEW.full_name));
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_user_delete` BEFORE DELETE ON `user` FOR EACH ROW BEGIN
    DECLARE v_admin_count INT;
    DECLARE v_is_admin    INT;

    SELECT COUNT(*) INTO v_is_admin
    FROM user_role ur
    JOIN role r ON r.id_role = ur.id_role
    WHERE ur.id_user = OLD.id_user AND r.role_name = 'admin';

    IF v_is_admin > 0 THEN
        SELECT COUNT(*) INTO v_admin_count
        FROM user_role ur
        JOIN role r ON r.id_role = ur.id_role
        WHERE r.role_name = 'admin' AND ur.id_user <> OLD.id_user;

        IF v_admin_count = 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot delete the last admin user';
        END IF;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_assignment`
--

CREATE TABLE `user_assignment` (
  `id_user` int(11) NOT NULL,
  `id_project` int(11) NOT NULL,
  `id_team` int(11) DEFAULT NULL,
  `assigned_by` int(11) DEFAULT NULL,
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_role`
--

CREATE TABLE `user_role` (
  `id_user` int(11) NOT NULL,
  `id_role` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `user_role`
--

INSERT INTO `user_role` (`id_user`, `id_role`, `created_at`) VALUES
(1, 1, '2026-04-20 00:26:17'),
(2, 4, '2026-04-20 00:26:17');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_team`
--

CREATE TABLE `user_team` (
  `id_user` int(11) NOT NULL,
  `id_team` int(11) NOT NULL,
  `joined_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `achievement`
--
ALTER TABLE `achievement`
  ADD PRIMARY KEY (`id_achievement`),
  ADD KEY `idx_achievement_user` (`id_user`),
  ADD KEY `idx_achievement_validated_by` (`validated_by`);

--
-- Indices de la tabla `audit_log`
--
ALTER TABLE `audit_log`
  ADD PRIMARY KEY (`id_audit`),
  ADD KEY `idx_audit_user` (`id_user`),
  ADD KEY `idx_audit_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_audit_created_at` (`created_at`);

--
-- Indices de la tabla `blocker`
--
ALTER TABLE `blocker`
  ADD PRIMARY KEY (`id_blocker`),
  ADD KEY `idx_blocker_log` (`id_log`);

--
-- Indices de la tabla `goal`
--
ALTER TABLE `goal`
  ADD PRIMARY KEY (`id_goal`),
  ADD KEY `idx_goal_user` (`id_user`);

--
-- Indices de la tabla `goal_project`
--
ALTER TABLE `goal_project`
  ADD PRIMARY KEY (`id_goal`,`id_project`),
  ADD KEY `idx_goal_project_project` (`id_project`),
  ADD KEY `idx_goal_project_linked_by` (`linked_by`);

--
-- Indices de la tabla `highlight`
--
ALTER TABLE `highlight`
  ADD PRIMARY KEY (`id_highlight`),
  ADD KEY `idx_highlight_user` (`id_user`),
  ADD KEY `idx_highlight_project` (`id_project`),
  ADD KEY `idx_highlight_team` (`id_team`);

--
-- Indices de la tabla `log`
--
ALTER TABLE `log`
  ADD PRIMARY KEY (`id_log`),
  ADD KEY `idx_log_user` (`id_user`),
  ADD KEY `idx_log_created_at` (`created_at`);

--
-- Indices de la tabla `log_project`
--
ALTER TABLE `log_project`
  ADD PRIMARY KEY (`id_log`,`id_project`),
  ADD KEY `idx_log_project_project` (`id_project`),
  ADD KEY `idx_log_project_team` (`id_team`);

--
-- Indices de la tabla `privilege`
--
ALTER TABLE `privilege`
  ADD PRIMARY KEY (`id_privilege`),
  ADD UNIQUE KEY `uq_privilege_name` (`privilege_name`);

--
-- Indices de la tabla `project`
--
ALTER TABLE `project`
  ADD PRIMARY KEY (`id_project`);

--
-- Indices de la tabla `project_team`
--
ALTER TABLE `project_team`
  ADD PRIMARY KEY (`id_project`,`id_team`),
  ADD KEY `idx_project_team_team` (`id_team`),
  ADD KEY `idx_project_team_assigned_by` (`assigned_by`);

--
-- Indices de la tabla `report`
--
ALTER TABLE `report`
  ADD PRIMARY KEY (`id_report`),
  ADD KEY `idx_report_user` (`id_user`),
  ADD KEY `idx_report_project` (`id_project`),
  ADD KEY `idx_report_team` (`id_team`);

--
-- Indices de la tabla `role`
--
ALTER TABLE `role`
  ADD PRIMARY KEY (`id_role`),
  ADD UNIQUE KEY `uq_role_name` (`role_name`);

--
-- Indices de la tabla `role_privilege`
--
ALTER TABLE `role_privilege`
  ADD PRIMARY KEY (`id_role`,`id_privilege`),
  ADD KEY `idx_role_privilege_privilege` (`id_privilege`);

--
-- Indices de la tabla `summary`
--
ALTER TABLE `summary`
  ADD PRIMARY KEY (`id_summary`),
  ADD KEY `idx_summary_user` (`id_user`),
  ADD KEY `idx_summary_project` (`id_project`),
  ADD KEY `idx_summary_team` (`id_team`),
  ADD KEY `idx_summary_generated_by` (`generated_by`);

--
-- Indices de la tabla `team`
--
ALTER TABLE `team`
  ADD PRIMARY KEY (`id_team`),
  ADD KEY `idx_team_leader` (`id_leader`);

--
-- Indices de la tabla `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id_user`),
  ADD UNIQUE KEY `uq_user_email` (`email`);

--
-- Indices de la tabla `user_assignment`
--
ALTER TABLE `user_assignment`
  ADD PRIMARY KEY (`id_user`,`id_project`),
  ADD KEY `idx_user_assignment_project` (`id_project`),
  ADD KEY `idx_user_assignment_team` (`id_team`),
  ADD KEY `idx_user_assignment_assigned_by` (`assigned_by`);

--
-- Indices de la tabla `user_role`
--
ALTER TABLE `user_role`
  ADD PRIMARY KEY (`id_user`,`id_role`),
  ADD KEY `idx_user_role_role` (`id_role`);

--
-- Indices de la tabla `user_team`
--
ALTER TABLE `user_team`
  ADD PRIMARY KEY (`id_user`,`id_team`),
  ADD KEY `idx_user_team_team` (`id_team`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `achievement`
--
ALTER TABLE `achievement`
  MODIFY `id_achievement` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `audit_log`
--
ALTER TABLE `audit_log`
  MODIFY `id_audit` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `blocker`
--
ALTER TABLE `blocker`
  MODIFY `id_blocker` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `goal`
--
ALTER TABLE `goal`
  MODIFY `id_goal` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `highlight`
--
ALTER TABLE `highlight`
  MODIFY `id_highlight` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `log`
--
ALTER TABLE `log`
  MODIFY `id_log` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `privilege`
--
ALTER TABLE `privilege`
  MODIFY `id_privilege` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `project`
--
ALTER TABLE `project`
  MODIFY `id_project` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `report`
--
ALTER TABLE `report`
  MODIFY `id_report` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `role`
--
ALTER TABLE `role`
  MODIFY `id_role` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `summary`
--
ALTER TABLE `summary`
  MODIFY `id_summary` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `team`
--
ALTER TABLE `team`
  MODIFY `id_team` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `user`
--
ALTER TABLE `user`
  MODIFY `id_user` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `achievement`
--
ALTER TABLE `achievement`
  ADD CONSTRAINT `fk_achievement_user` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_achievement_validated_by` FOREIGN KEY (`validated_by`) REFERENCES `user` (`id_user`) ON DELETE SET NULL;

--
-- Filtros para la tabla `audit_log`
--
ALTER TABLE `audit_log`
  ADD CONSTRAINT `fk_audit_user` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE SET NULL;

--
-- Filtros para la tabla `blocker`
--
ALTER TABLE `blocker`
  ADD CONSTRAINT `fk_blocker_log` FOREIGN KEY (`id_log`) REFERENCES `log` (`id_log`) ON DELETE CASCADE;

--
-- Filtros para la tabla `goal`
--
ALTER TABLE `goal`
  ADD CONSTRAINT `fk_goal_user` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE SET NULL;

--
-- Filtros para la tabla `goal_project`
--
ALTER TABLE `goal_project`
  ADD CONSTRAINT `fk_goal_project_goal` FOREIGN KEY (`id_goal`) REFERENCES `goal` (`id_goal`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_goal_project_linked_by` FOREIGN KEY (`linked_by`) REFERENCES `user` (`id_user`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_goal_project_project` FOREIGN KEY (`id_project`) REFERENCES `project` (`id_project`) ON DELETE CASCADE;

--
-- Filtros para la tabla `highlight`
--
ALTER TABLE `highlight`
  ADD CONSTRAINT `fk_highlight_project` FOREIGN KEY (`id_project`) REFERENCES `project` (`id_project`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_highlight_team` FOREIGN KEY (`id_team`) REFERENCES `team` (`id_team`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_highlight_user` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE;

--
-- Filtros para la tabla `log`
--
ALTER TABLE `log`
  ADD CONSTRAINT `fk_log_user` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE;

--
-- Filtros para la tabla `log_project`
--
ALTER TABLE `log_project`
  ADD CONSTRAINT `fk_log_project_log` FOREIGN KEY (`id_log`) REFERENCES `log` (`id_log`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_log_project_project` FOREIGN KEY (`id_project`) REFERENCES `project` (`id_project`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_log_project_team` FOREIGN KEY (`id_team`) REFERENCES `team` (`id_team`) ON DELETE SET NULL;

--
-- Filtros para la tabla `project_team`
--
ALTER TABLE `project_team`
  ADD CONSTRAINT `fk_project_team_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `user` (`id_user`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_project_team_project` FOREIGN KEY (`id_project`) REFERENCES `project` (`id_project`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_project_team_team` FOREIGN KEY (`id_team`) REFERENCES `team` (`id_team`) ON DELETE CASCADE;

--
-- Filtros para la tabla `report`
--
ALTER TABLE `report`
  ADD CONSTRAINT `fk_report_project` FOREIGN KEY (`id_project`) REFERENCES `project` (`id_project`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_report_team` FOREIGN KEY (`id_team`) REFERENCES `team` (`id_team`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_report_user` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE SET NULL;

--
-- Filtros para la tabla `role_privilege`
--
ALTER TABLE `role_privilege`
  ADD CONSTRAINT `fk_role_privilege_privilege` FOREIGN KEY (`id_privilege`) REFERENCES `privilege` (`id_privilege`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_role_privilege_role` FOREIGN KEY (`id_role`) REFERENCES `role` (`id_role`) ON DELETE CASCADE;

--
-- Filtros para la tabla `summary`
--
ALTER TABLE `summary`
  ADD CONSTRAINT `fk_summary_generated_by` FOREIGN KEY (`generated_by`) REFERENCES `user` (`id_user`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_summary_project` FOREIGN KEY (`id_project`) REFERENCES `project` (`id_project`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_summary_team` FOREIGN KEY (`id_team`) REFERENCES `team` (`id_team`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_summary_user` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE SET NULL;

--
-- Filtros para la tabla `team`
--
ALTER TABLE `team`
  ADD CONSTRAINT `fk_team_leader` FOREIGN KEY (`id_leader`) REFERENCES `user` (`id_user`) ON DELETE SET NULL;

--
-- Filtros para la tabla `user_assignment`
--
ALTER TABLE `user_assignment`
  ADD CONSTRAINT `fk_user_assignment_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `user` (`id_user`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_user_assignment_project` FOREIGN KEY (`id_project`) REFERENCES `project` (`id_project`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_user_assignment_team` FOREIGN KEY (`id_team`) REFERENCES `team` (`id_team`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_user_assignment_user` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_role`
--
ALTER TABLE `user_role`
  ADD CONSTRAINT `fk_user_role_role` FOREIGN KEY (`id_role`) REFERENCES `role` (`id_role`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_user_role_user` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_team`
--
ALTER TABLE `user_team`
  ADD CONSTRAINT `fk_user_team_team` FOREIGN KEY (`id_team`) REFERENCES `team` (`id_team`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_user_team_user` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;