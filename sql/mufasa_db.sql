-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost
-- Tiempo de generación: 15-04-2026 a las 09:11:33
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

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `achievement`
--

CREATE TABLE `achievement` (
  `id_achievement` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `description` varchar(500) NOT NULL,
  `created_at` date NOT NULL,
  `validation_status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `validated_by` int(11) DEFAULT NULL,
  `validated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

--
-- Volcado de datos para la tabla `audit_log`
--

INSERT INTO `audit_log` (`id_audit`, `id_user`, `action`, `entity_type`, `entity_id`, `success`, `detail`, `created_at`) VALUES
(1, NULL, 'create', 'goal', 8, 1, 'Goal draft saved successfully.', '2026-04-10 10:50:27'),
(2, NULL, 'create', 'goal', NULL, 0, 'Goal creation failed: missing required fields.', '2026-04-10 10:50:31'),
(3, NULL, 'create', 'goal', NULL, 0, 'Goal creation failed: missing required fields.', '2026-04-10 11:19:57'),
(4, NULL, 'create', 'goal', 9, 1, 'Goal draft saved successfully.', '2026-04-10 11:26:45'),
(5, NULL, 'create', 'goal', 10, 1, 'Goal draft saved successfully.', '2026-04-14 13:57:21'),
(6, NULL, 'create', 'goal', NULL, 0, 'Goal creation failed: missing required fields.', '2026-04-14 13:58:09');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `blocker`
--

CREATE TABLE `blocker` (
  `id_blocker` int(11) NOT NULL,
  `id_log` int(11) NOT NULL,
  `description` text NOT NULL,
  `resolution_status` enum('pending','resolved') DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `goal`
--

CREATE TABLE `goal` (
  `id_goal` int(11) NOT NULL,
  `title` varchar(200) NOT NULL DEFAULT '',
  `description` text DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `status` enum('active','paused','completed','cancelled') NOT NULL DEFAULT 'active',
  `is_draft` tinyint(1) NOT NULL DEFAULT 0,
  `id_user` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `goal`
--

INSERT INTO `goal` (`id_goal`, `title`, `description`, `start_date`, `end_date`, `priority`, `status`, `is_draft`, `id_user`, `created_at`, `updated_at`) VALUES
(1, 'Implement MFA', 'Add two-factor authentication to all users', NULL, NULL, 'medium', 'active', 0, NULL, '2026-04-10 10:45:37', NULL),
(2, 'Migrate to OAuth 2.0', 'Replace legacy auth with OAuth 2.0', NULL, NULL, 'medium', 'active', 0, NULL, '2026-04-10 10:45:37', NULL),
(3, 'API latency < 200ms', 'Reduce average response time to under 200ms', NULL, NULL, 'medium', 'active', 0, NULL, '2026-04-10 10:45:37', NULL),
(8, 'hola', NULL, NULL, NULL, 'medium', 'active', 1, NULL, '2026-04-10 10:50:27', NULL),
(10, 'Prueba2', NULL, NULL, NULL, 'medium', 'active', 1, NULL, '2026-04-14 13:57:21', NULL);

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
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `log_project`
--

CREATE TABLE `log_project` (
  `id_log` int(11) NOT NULL,
  `id_project` int(11) NOT NULL,
  `id_team` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `privilege`
--

CREATE TABLE `privilege` (
  `id_privilege` int(11) NOT NULL,
  `privilege_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `privilege`
--

INSERT INTO `privilege` (`id_privilege`, `privilege_name`, `description`, `created_at`) VALUES
(1, 'manage_users', 'Create, edit and deactivate users', '2026-04-08 13:04:58'),
(2, 'manage_teams', 'Create, edit and delete teams', '2026-04-08 13:04:58'),
(3, 'manage_roles', 'Define roles and permissions', '2026-04-08 13:04:58'),
(4, 'view_team_logs', 'View team members log entries', '2026-04-08 13:04:58'),
(5, 'manage_goals', 'Create and edit strategic goals', '2026-04-08 13:04:58'),
(6, 'generate_reports', 'Generate PDF and Excel reports', '2026-04-08 13:04:58'),
(7, 'create_log', 'Create personal log entries', '2026-04-08 13:04:58'),
(8, 'view_own_logs', 'View own log history', '2026-04-08 13:04:58'),
(9, 'create_self_review', 'Generate self-review', '2026-04-08 13:04:58'),
(10, 'view_projects', 'View assigned projects', '2026-04-08 13:04:58');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `project`
--

CREATE TABLE `project` (
  `id_project` int(11) NOT NULL,
  `project_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('active','inactive','completed') DEFAULT 'active',
  `start_date` date DEFAULT (curdate())
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `project`
--

INSERT INTO `project` (`id_project`, `project_name`, `description`, `status`, `start_date`) VALUES
(1, 'Platform Redesign', 'Improving user experience and overall platform performance.', 'active', '2026-01-15'),
(2, 'API Integration', 'Third-party API integrations for payments and notifications.', 'active', '2026-02-01'),
(3, 'Internal Tools', 'Internal dashboard and tooling for the ops team.', 'completed', '2025-11-01');

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
  `period` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `role`
--

CREATE TABLE `role` (
  `id_role` int(11) NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `role`
--

INSERT INTO `role` (`id_role`, `role_name`, `description`, `created_at`) VALUES
(1, 'admin', 'Full system access', '2026-04-08 13:04:58'),
(2, 'manager', 'Goals, reports and highlights management', '2026-04-08 13:04:58'),
(3, 'team-leader', 'Team management and log visibility', '2026-04-08 13:04:58'),
(4, 'employee', 'Personal log and self-review', '2026-04-08 13:04:58'),
(5, 'project-manager', 'Project planning and resource management', '2026-04-08 14:22:09');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `role_privilege`
--

CREATE TABLE `role_privilege` (
  `id_role` int(11) NOT NULL,
  `id_privilege` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `role_privilege`
--

INSERT INTO `role_privilege` (`id_role`, `id_privilege`, `created_at`) VALUES
(1, 1, '2026-04-08 13:04:58'),
(1, 2, '2026-04-08 13:04:58'),
(1, 3, '2026-04-08 13:04:58'),
(2, 5, '2026-04-08 13:04:58'),
(2, 6, '2026-04-08 13:04:58'),
(3, 4, '2026-04-08 13:04:58'),
(3, 6, '2026-04-08 13:04:58'),
(4, 7, '2026-04-08 13:04:58'),
(4, 8, '2026-04-08 13:04:58'),
(4, 9, '2026-04-08 13:04:58'),
(4, 10, '2026-04-08 13:04:58');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `team`
--

CREATE TABLE `team` (
  `id_team` int(11) NOT NULL,
  `team_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `id_leader` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `team`
--

INSERT INTO `team` (`id_team`, `team_name`, `description`, `created_at`, `id_leader`) VALUES
(2, 'Backend Squad', NULL, '2026-04-08 13:04:58', NULL),
(3, 'Frontend Guild', NULL, '2026-04-08 13:04:58', NULL),
(5, 'Alex Team', 'Creacion prueba de equipo', '2026-04-09 09:41:13', 17),
(8, 'Chivas Team', 'Equipo de prueba', '2026-04-14 20:06:46', 13);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user`
--

CREATE TABLE `user` (
  `id_user` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(100) NOT NULL,
  `slack_user` varchar(50) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `status` enum('pending','active','inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `user`
--

INSERT INTO `user` (`id_user`, `username`, `password`, `full_name`, `email`, `slack_user`, `avatar`, `is_active`, `status`) VALUES
(13, 'admin', '$2b$12$1dojbzLEjVqYsBRWfvipKOFUjus6Xd2WZ1uhKsE1hsBSrcshCR8vS', 'Paco Arreola', 'admin@change.org', 'Paco.slack', NULL, 1, 'active'),
(14, 'Laksh@change.org', '$2b$12$ZJRptVrNnKXNGMt0RStvj.XoV1lADtwF5crYTQ1OhWmlIYJoTzrGe', 'Lakshmi Jara', 'Laksh@change.org', NULL, NULL, 1, 'active'),
(16, 'Alex@change.org', '$2b$12$Db9cqADkeAd9IG6WJiS8pei/dM4M4cqAsLAWN7sTJOH0LLo2OuEfO', 'Alexander Vilchis', 'Alex@change.org', 'AlexV.slack', NULL, 1, 'active'),
(17, 'VictorH@change.org', '$2b$12$t7WE6GYUH1e5U51Q.lLt9uHfbTOyAKXWXJJBq5x4N7sL3hZwNzGQu', 'Victor Hugo Feregrino', 'VictorH@change.org', 'Victor.slack', NULL, 1, 'active'),
(18, 'pruebas1@change.org', '$2b$12$yj9RLMnlzIjQILoKjgyzOumVsBM9HdJRdNSZSezNEK5vIIp6cgHyW', 'Usuario de Prueba 1', 'pruebas1@change.org', 'pruebas1.slack', NULL, 1, 'active'),
(23, 'asdas@change.org', '$2b$12$swc.3.h.vgqSLEu2cEU72.CbmFd.o5PFV9/RHNZo1X9IrKgX4ymq6', 'Francisco', 'asdas@change.org', NULL, NULL, 1, 'active');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_assignment`
--

CREATE TABLE `user_assignment` (
  `id_user` int(11) NOT NULL,
  `id_project` int(11) NOT NULL,
  `id_team` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_role`
--

CREATE TABLE `user_role` (
  `id_user` int(11) NOT NULL,
  `id_role` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `user_role`
--

INSERT INTO `user_role` (`id_user`, `id_role`, `created_at`) VALUES
(13, 1, '2026-04-14 18:24:26'),
(14, 5, '2026-04-14 18:53:21'),
(16, 2, '2026-04-14 19:03:14'),
(17, 3, '2026-04-14 19:23:01'),
(18, 4, '2026-04-14 19:37:43'),
(23, 4, '2026-04-15 00:54:35');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_team`
--

CREATE TABLE `user_team` (
  `id_user` int(11) NOT NULL,
  `id_team` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `achievement`
--
ALTER TABLE `achievement`
  ADD PRIMARY KEY (`id_achievement`),
  ADD KEY `id_user` (`id_user`),
  ADD KEY `achievement_validated_by_fk` (`validated_by`);

--
-- Indices de la tabla `audit_log`
--
ALTER TABLE `audit_log`
  ADD PRIMARY KEY (`id_audit`),
  ADD KEY `id_user` (`id_user`),
  ADD KEY `entity_type` (`entity_type`),
  ADD KEY `created_at` (`created_at`);

--
-- Indices de la tabla `blocker`
--
ALTER TABLE `blocker`
  ADD PRIMARY KEY (`id_blocker`),
  ADD KEY `id_log` (`id_log`);

--
-- Indices de la tabla `goal`
--
ALTER TABLE `goal`
  ADD PRIMARY KEY (`id_goal`),
  ADD KEY `goal_ibfk_2` (`id_user`);

--
-- Indices de la tabla `goal_project`
--
ALTER TABLE `goal_project`
  ADD PRIMARY KEY (`id_goal`,`id_project`),
  ADD KEY `id_project` (`id_project`),
  ADD KEY `linked_by` (`linked_by`);

--
-- Indices de la tabla `highlight`
--
ALTER TABLE `highlight`
  ADD PRIMARY KEY (`id_highlight`),
  ADD KEY `id_user` (`id_user`),
  ADD KEY `id_project` (`id_project`),
  ADD KEY `id_team` (`id_team`);

--
-- Indices de la tabla `log`
--
ALTER TABLE `log`
  ADD PRIMARY KEY (`id_log`),
  ADD KEY `id_user` (`id_user`);

--
-- Indices de la tabla `log_project`
--
ALTER TABLE `log_project`
  ADD PRIMARY KEY (`id_log`,`id_project`),
  ADD KEY `id_project` (`id_project`),
  ADD KEY `id_team` (`id_team`);

--
-- Indices de la tabla `privilege`
--
ALTER TABLE `privilege`
  ADD PRIMARY KEY (`id_privilege`);

--
-- Indices de la tabla `project`
--
ALTER TABLE `project`
  ADD PRIMARY KEY (`id_project`);

--
-- Indices de la tabla `report`
--
ALTER TABLE `report`
  ADD PRIMARY KEY (`id_report`),
  ADD KEY `id_user` (`id_user`),
  ADD KEY `id_project` (`id_project`),
  ADD KEY `id_team` (`id_team`);

--
-- Indices de la tabla `role`
--
ALTER TABLE `role`
  ADD PRIMARY KEY (`id_role`);

--
-- Indices de la tabla `role_privilege`
--
ALTER TABLE `role_privilege`
  ADD PRIMARY KEY (`id_role`,`id_privilege`),
  ADD KEY `id_privilege` (`id_privilege`);

--
-- Indices de la tabla `team`
--
ALTER TABLE `team`
  ADD PRIMARY KEY (`id_team`),
  ADD KEY `team_ibfk_1` (`id_leader`);

--
-- Indices de la tabla `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id_user`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indices de la tabla `user_assignment`
--
ALTER TABLE `user_assignment`
  ADD PRIMARY KEY (`id_user`,`id_project`),
  ADD KEY `id_project` (`id_project`),
  ADD KEY `id_team` (`id_team`);

--
-- Indices de la tabla `user_role`
--
ALTER TABLE `user_role`
  ADD PRIMARY KEY (`id_user`,`id_role`),
  ADD KEY `id_role` (`id_role`);

--
-- Indices de la tabla `user_team`
--
ALTER TABLE `user_team`
  ADD PRIMARY KEY (`id_user`,`id_team`),
  ADD KEY `id_team` (`id_team`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `achievement`
--
ALTER TABLE `achievement`
  MODIFY `id_achievement` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `audit_log`
--
ALTER TABLE `audit_log`
  MODIFY `id_audit` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `blocker`
--
ALTER TABLE `blocker`
  MODIFY `id_blocker` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `goal`
--
ALTER TABLE `goal`
  MODIFY `id_goal` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `highlight`
--
ALTER TABLE `highlight`
  MODIFY `id_highlight` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `log`
--
ALTER TABLE `log`
  MODIFY `id_log` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT de la tabla `privilege`
--
ALTER TABLE `privilege`
  MODIFY `id_privilege` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `project`
--
ALTER TABLE `project`
  MODIFY `id_project` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
-- AUTO_INCREMENT de la tabla `team`
--
ALTER TABLE `team`
  MODIFY `id_team` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `user`
--
ALTER TABLE `user`
  MODIFY `id_user` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `achievement`
--
ALTER TABLE `achievement`
  ADD CONSTRAINT `achievement_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE,
  ADD CONSTRAINT `achievement_validated_by_fk` FOREIGN KEY (`validated_by`) REFERENCES `user` (`id_user`);

--
-- Filtros para la tabla `audit_log`
--
ALTER TABLE `audit_log`
  ADD CONSTRAINT `al_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE SET NULL;

--
-- Filtros para la tabla `blocker`
--
ALTER TABLE `blocker`
  ADD CONSTRAINT `blocker_ibfk_1` FOREIGN KEY (`id_log`) REFERENCES `log` (`id_log`) ON DELETE CASCADE;

--
-- Filtros para la tabla `goal`
--
ALTER TABLE `goal`
  ADD CONSTRAINT `goal_ibfk_2` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE SET NULL;

--
-- Filtros para la tabla `goal_project`
--
ALTER TABLE `goal_project`
  ADD CONSTRAINT `gp_ibfk_1` FOREIGN KEY (`id_goal`) REFERENCES `goal` (`id_goal`) ON DELETE CASCADE,
  ADD CONSTRAINT `gp_ibfk_2` FOREIGN KEY (`id_project`) REFERENCES `project` (`id_project`) ON DELETE CASCADE,
  ADD CONSTRAINT `gp_ibfk_3` FOREIGN KEY (`linked_by`) REFERENCES `user` (`id_user`) ON DELETE SET NULL;

--
-- Filtros para la tabla `highlight`
--
ALTER TABLE `highlight`
  ADD CONSTRAINT `hl_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`),
  ADD CONSTRAINT `hl_ibfk_2` FOREIGN KEY (`id_project`) REFERENCES `project` (`id_project`) ON DELETE SET NULL,
  ADD CONSTRAINT `hl_ibfk_3` FOREIGN KEY (`id_team`) REFERENCES `team` (`id_team`) ON DELETE SET NULL;

--
-- Filtros para la tabla `log`
--
ALTER TABLE `log`
  ADD CONSTRAINT `log_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE;

--
-- Filtros para la tabla `log_project`
--
ALTER TABLE `log_project`
  ADD CONSTRAINT `log_project_ibfk_1` FOREIGN KEY (`id_log`) REFERENCES `log` (`id_log`) ON DELETE CASCADE,
  ADD CONSTRAINT `log_project_ibfk_2` FOREIGN KEY (`id_project`) REFERENCES `project` (`id_project`),
  ADD CONSTRAINT `log_project_ibfk_3` FOREIGN KEY (`id_team`) REFERENCES `team` (`id_team`);

--
-- Filtros para la tabla `report`
--
ALTER TABLE `report`
  ADD CONSTRAINT `report_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`),
  ADD CONSTRAINT `report_ibfk_2` FOREIGN KEY (`id_project`) REFERENCES `project` (`id_project`),
  ADD CONSTRAINT `report_ibfk_3` FOREIGN KEY (`id_team`) REFERENCES `team` (`id_team`);

--
-- Filtros para la tabla `role_privilege`
--
ALTER TABLE `role_privilege`
  ADD CONSTRAINT `role_privilege_ibfk_1` FOREIGN KEY (`id_role`) REFERENCES `role` (`id_role`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_privilege_ibfk_2` FOREIGN KEY (`id_privilege`) REFERENCES `privilege` (`id_privilege`) ON DELETE CASCADE;

--
-- Filtros para la tabla `team`
--
ALTER TABLE `team`
  ADD CONSTRAINT `team_ibfk_1` FOREIGN KEY (`id_leader`) REFERENCES `user` (`id_user`) ON DELETE SET NULL;

--
-- Filtros para la tabla `user_assignment`
--
ALTER TABLE `user_assignment`
  ADD CONSTRAINT `user_assignment_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_assignment_ibfk_2` FOREIGN KEY (`id_project`) REFERENCES `project` (`id_project`),
  ADD CONSTRAINT `user_assignment_ibfk_3` FOREIGN KEY (`id_team`) REFERENCES `team` (`id_team`);

--
-- Filtros para la tabla `user_role`
--
ALTER TABLE `user_role`
  ADD CONSTRAINT `user_role_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_role_ibfk_2` FOREIGN KEY (`id_role`) REFERENCES `role` (`id_role`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_team`
--
ALTER TABLE `user_team`
  ADD CONSTRAINT `user_team_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_team_ibfk_2` FOREIGN KEY (`id_team`) REFERENCES `team` (`id_team`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
