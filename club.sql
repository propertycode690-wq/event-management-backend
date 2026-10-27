-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 17, 2026 at 12:12 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `club`
--

-- --------------------------------------------------------

--
-- Table structure for table `donationpledge`
--

CREATE TABLE `donationpledge` (
  `id` varchar(191) NOT NULL,
  `entityType` varchar(50) NOT NULL,
  `entityId` varchar(191) NOT NULL,
  `amount` double NOT NULL,
  `tier` varchar(191) DEFAULT NULL,
  `cause` varchar(191) DEFAULT NULL,
  `donorName` varchar(191) DEFAULT NULL,
  `donorEmail` varchar(191) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'PENDING_GATEWAY',
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `event`
--

CREATE TABLE `event` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `federation` varchar(191) NOT NULL,
  `sport` varchar(191) DEFAULT NULL,
  `type` varchar(191) NOT NULL,
  `club` varchar(191) NOT NULL,
  `clubId` varchar(191) NOT NULL,
  `state` varchar(191) NOT NULL,
  `stateCode` varchar(10) NOT NULL,
  `city` varchar(191) NOT NULL,
  `date` varchar(50) NOT NULL,
  `fee` double NOT NULL,
  `entriesCount` int(11) DEFAULT 0,
  `maxCapacity` int(11) DEFAULT 50,
  `status` varchar(50) DEFAULT 'Registration Open',
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event`
--

INSERT INTO `event` (`id`, `name`, `federation`, `sport`, `type`, `club`, `clubId`, `state`, `stateCode`, `city`, `date`, `fee`, `entriesCount`, `maxCapacity`, `status`, `createdAt`) VALUES
('evt-1', 'Nite Hunt & Treeing Contest', 'UKC (United Kennel Club)', 'Coonhounds', 'Nite Hunt', 'Oak Ridge Hunting Club', 'club-1', 'Tennessee', 'TN', 'Knoxville', 'September 19, 2026', 30, 43, 50, 'Registration Open', '2026-08-17 12:42:10'),
('evt-2', 'Fall Championship Hunt', 'PKC (Professional Kennel Club)', 'Coonhounds', 'Championship Hunt', 'Oak Ridge Hunting Club', 'club-1', 'Tennessee', 'TN', 'Knoxville', 'October 24, 2026', 45, 28, 60, 'Registration Open', '2026-08-17 12:42:10');

-- --------------------------------------------------------

--
-- Table structure for table `evententry`
--

CREATE TABLE `evententry` (
  `id` varchar(191) NOT NULL,
  `eventId` varchar(191) NOT NULL,
  `dogId` varchar(191) DEFAULT NULL,
  `participant` varchar(191) NOT NULL,
  `handlerPhone` varchar(50) DEFAULT NULL,
  `fee` double NOT NULL,
  `paymentStatus` varchar(50) DEFAULT 'Paid',
  `confirmationCode` varchar(191) NOT NULL,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `financialtransaction`
--

CREATE TABLE `financialtransaction` (
  `id` varchar(191) NOT NULL,
  `type` varchar(50) NOT NULL,
  `category` varchar(191) NOT NULL,
  `amount` double NOT NULL,
  `period` varchar(50) DEFAULT NULL,
  `stateId` varchar(191) DEFAULT NULL,
  `clubId` varchar(191) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `localclub`
--

CREATE TABLE `localclub` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `city` varchar(191) NOT NULL,
  `county` varchar(191) DEFAULT NULL,
  `state` varchar(191) NOT NULL,
  `stateCode` varchar(10) NOT NULL,
  `stateId` varchar(191) NOT NULL,
  `zip` varchar(20) DEFAULT NULL,
  `distanceMiles` double DEFAULT NULL,
  `dogType` varchar(191) DEFAULT NULL,
  `federation` varchar(191) DEFAULT NULL,
  `eventType` varchar(191) DEFAULT NULL,
  `membersCount` int(11) DEFAULT 0,
  `eventsCount` int(11) DEFAULT 0,
  `entriesCount` int(11) DEFAULT 0,
  `revenue` double DEFAULT 0,
  `adminName` varchar(191) DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `localclub`
--

INSERT INTO `localclub` (`id`, `name`, `city`, `county`, `state`, `stateCode`, `stateId`, `zip`, `distanceMiles`, `dogType`, `federation`, `eventType`, `membersCount`, `eventsCount`, `entriesCount`, `revenue`, `adminName`, `createdAt`) VALUES
('club-1', 'Oak Ridge Hunting Club', 'Knoxville', 'Knox County', 'Tennessee', 'TN', 'tn', '37901', 18, 'Treeing Walker Coonhound', 'UKC (United Kennel Club)', 'Nite Hunt', 84, 6, 217, 6790, 'Robert Miller', '2026-08-17 12:42:10'),
('club-2', 'Cumberland Mountain Club', 'Middlesboro', 'Bell County', 'Kentucky', 'KY', 'ky', '40965', 64, 'English Redtick Coonhound', 'AKC (American Kennel Club)', 'Water Race', 96, 8, 304, 8940, 'Thomas Shelby', '2026-08-17 12:42:10'),
('club-tx-central', 'Central Texas Hound Club', 'Waco', 'McLennan County', 'Texas', 'TX', 'tx', '76701', 20, 'Treeing Walker Coonhound', 'Independent', 'Bench Show', 82, 6, 225, 8700, 'Caleb Vance', '2026-08-17 12:42:10');

-- --------------------------------------------------------

--
-- Table structure for table `member`
--

CREATE TABLE `member` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `state` varchar(191) DEFAULT NULL,
  `club` varchar(191) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Active',
  `duesAmount` double DEFAULT 35,
  `joinDate` varchar(50) DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `news`
--

CREATE TABLE `news` (
  `id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `summary` text NOT NULL,
  `category` varchar(191) NOT NULL,
  `author` varchar(191) NOT NULL,
  `date` varchar(50) NOT NULL,
  `state` varchar(191) DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order`
--

CREATE TABLE `order` (
  `id` varchar(191) NOT NULL,
  `orderNumber` varchar(191) NOT NULL,
  `customerName` varchar(191) NOT NULL,
  `total` double NOT NULL,
  `status` varchar(50) DEFAULT 'Completed',
  `itemsJson` text DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product`
--

CREATE TABLE `product` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `price` double NOT NULL,
  `category` varchar(191) NOT NULL,
  `scopeChannel` varchar(50) DEFAULT 'NATIONAL',
  `scopeEntity` varchar(191) DEFAULT NULL,
  `organizationType` varchar(50) DEFAULT NULL,
  `organizationId` varchar(191) DEFAULT NULL,
  `profit` double DEFAULT 0,
  `description` text DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stateassociation`
--

CREATE TABLE `stateassociation` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `code` varchar(10) NOT NULL,
  `organizations` varchar(191) DEFAULT 'UKC,PKC',
  `adminName` varchar(191) DEFAULT NULL,
  `clubsCount` int(11) DEFAULT 0,
  `membersCount` int(11) DEFAULT 0,
  `eventsCount` int(11) DEFAULT 0,
  `revenue` double DEFAULT 0,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stateassociation`
--

INSERT INTO `stateassociation` (`id`, `name`, `code`, `organizations`, `adminName`, `clubsCount`, `membersCount`, `eventsCount`, `revenue`, `createdAt`) VALUES
('ak', 'Alaska State Association', 'AK', 'PKC', 'Cody Campbell', 8, 420, 2, 18000, '2026-08-17 12:42:10'),
('al', 'Alabama State Association', 'AL', 'UKC', 'Marcus Vance', 15, 950, 4, 45000, '2026-08-17 12:42:10'),
('ar', 'Arkansas State Association', 'AR', 'UKC', 'Dominic Rossi', 36, 2240, 6, 115000, '2026-08-17 12:42:10'),
('az', 'Arizona State Association', 'AZ', 'UKC,PKC', 'Frank Reynolds', 18, 1100, 5, 62000, '2026-08-17 12:42:10'),
('ca', 'California State Association', 'CA', 'PKC', 'Elena Rostova', 31, 1980, 5, 98000, '2026-08-17 12:42:10'),
('tn', 'Tennessee State Association', 'TN', 'UKC,PKC', 'Robert Miller', 42, 2890, 8, 185000, '2026-08-17 12:42:10'),
('tx', 'Texas Hound Association', 'TX', 'UKC,PKC', 'Austin Sterling', 54, 3920, 7, 245000, '2026-08-17 12:42:10');

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `passwordHash` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `role` varchar(50) DEFAULT 'MEMBER',
  `phone` varchar(50) DEFAULT NULL,
  `stateCode` varchar(10) DEFAULT NULL,
  `clubId` varchar(191) DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp(),
  `updatedAt` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`id`, `email`, `passwordHash`, `name`, `role`, `phone`, `stateCode`, `clubId`, `createdAt`, `updatedAt`) VALUES
('usr-lalit', 'demo@example.com', '$2a$10$nTnliq1FmEm1BVgEVoWIwuZEVdqTchqLrnNvj.ShvQmJtU63w.6Uu', 'Lalit Panchole', 'SUPER_ADMIN', '(800) 555-0192', 'TX', 'club-1', '2026-08-17 12:42:10', '2026-08-17 12:42:10');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `donationpledge`
--
ALTER TABLE `donationpledge`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `event`
--
ALTER TABLE `event`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `evententry`
--
ALTER TABLE `evententry`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `financialtransaction`
--
ALTER TABLE `financialtransaction`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `localclub`
--
ALTER TABLE `localclub`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `member`
--
ALTER TABLE `member`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `news`
--
ALTER TABLE `news`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `order`
--
ALTER TABLE `order`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `orderNumber` (`orderNumber`);

--
-- Indexes for table `product`
--
ALTER TABLE `product`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `stateassociation`
--
ALTER TABLE `stateassociation`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
