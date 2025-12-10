/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-12.1.2-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: app
-- ------------------------------------------------------
-- Server version	12.1.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `Artist`
--

DROP TABLE IF EXISTS `Artist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Artist` (
  `ArtistId` varchar(255) NOT NULL,
  `ArtistName` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`ArtistId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ArtistGenre`
--

DROP TABLE IF EXISTS `ArtistGenre`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ArtistGenre` (
  `TrackId` varchar(255) NOT NULL,
  `TrackGenre` varchar(255) NOT NULL,
  PRIMARY KEY (`TrackId`,`TrackGenre`),
  CONSTRAINT `1` FOREIGN KEY (`TrackId`) REFERENCES `Track` (`TrackId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `ArtistView`
--

DROP TABLE IF EXISTS `ArtistView`;
/*!50001 DROP VIEW IF EXISTS `ArtistView`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `ArtistView` AS SELECT
 1 AS `ArtistName`,
  1 AS `ArtistCount` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `GenreView`
--

DROP TABLE IF EXISTS `GenreView`;
/*!50001 DROP VIEW IF EXISTS `GenreView`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `GenreView` AS SELECT
 1 AS `SingleGenre`,
  1 AS `GenreCount` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `PendingChanges`
--

DROP TABLE IF EXISTS `PendingChanges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `PendingChanges` (
  `ChangeId` int(11) NOT NULL AUTO_INCREMENT,
  `PlaylistId` varchar(255) DEFAULT NULL,
  `PlaylistName` varchar(255) DEFAULT NULL,
  `TrackId` varchar(255) DEFAULT NULL,
  `TrackName` varchar(255) DEFAULT NULL,
  `UserId` varchar(255) DEFAULT NULL,
  `ChangeType` enum('REMOVE_TRACK','DELETE_PLAYLIST','CREATE_PLAYLIST') DEFAULT 'REMOVE_TRACK',
  `CreatedAt` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ChangeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Playlist`
--

DROP TABLE IF EXISTS `Playlist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Playlist` (
  `PlaylistId` varchar(255) NOT NULL,
  `PlaylistName` varchar(255) DEFAULT NULL,
  `PlaylistDescription` varchar(1000) DEFAULT NULL,
  `ImageURL` varchar(500) DEFAULT NULL,
  `UserId` varchar(255) DEFAULT NULL,
  `IsLocalOnly` tinyint(1) DEFAULT 0,
  `LastUpdated` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`PlaylistId`),
  KEY `UserId` (`UserId`),
  CONSTRAINT `1` FOREIGN KEY (`UserId`) REFERENCES `User` (`UserId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PlaylistTrack`
--

DROP TABLE IF EXISTS `PlaylistTrack`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `PlaylistTrack` (
  `TrackId` varchar(255) NOT NULL,
  `PlaylistId` varchar(255) NOT NULL,
  PRIMARY KEY (`TrackId`,`PlaylistId`),
  KEY `PlaylistId` (`PlaylistId`),
  CONSTRAINT `1` FOREIGN KEY (`TrackId`) REFERENCES `Track` (`TrackId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `2` FOREIGN KEY (`PlaylistId`) REFERENCES `Playlist` (`PlaylistId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`think`@`localhost`*/ /*!50003 TRIGGER IF NOT EXISTS after_playlisttrack_delete
    AFTER DELETE ON PlaylistTrack
    FOR EACH ROW
    BEGIN
      DECLARE playlist_user_id VARCHAR(255);
      DECLARE playlist_name VARCHAR(255);
      DECLARE track_name VARCHAR(255);
      
      SELECT UserId, PlaylistName INTO playlist_user_id, playlist_name
      FROM Playlist 
      WHERE PlaylistId = OLD.PlaylistId 
      LIMIT 1;
      
      SELECT TrackName INTO track_name
      FROM Track
      WHERE TrackId = OLD.TrackId
      LIMIT 1;
      
      INSERT INTO PendingChanges (PlaylistId, PlaylistName, TrackId, TrackName, UserId, ChangeType)
      VALUES (OLD.PlaylistId, playlist_name, OLD.TrackId, track_name, playlist_user_id, 'REMOVE_TRACK');
    END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `Track`
--

DROP TABLE IF EXISTS `Track`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Track` (
  `TrackId` varchar(255) NOT NULL,
  `TrackName` varchar(255) DEFAULT NULL,
  `Album` varchar(255) DEFAULT NULL,
  `AlbumImageURL` varchar(500) DEFAULT NULL,
  `DurationMs` int(11) DEFAULT NULL,
  PRIMARY KEY (`TrackId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TrackArtist`
--

DROP TABLE IF EXISTS `TrackArtist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `TrackArtist` (
  `TrackId` varchar(255) NOT NULL,
  `ArtistId` varchar(255) NOT NULL,
  PRIMARY KEY (`TrackId`,`ArtistId`),
  KEY `ArtistId` (`ArtistId`),
  CONSTRAINT `1` FOREIGN KEY (`TrackId`) REFERENCES `Track` (`TrackId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `2` FOREIGN KEY (`ArtistId`) REFERENCES `Artist` (`ArtistId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TrackGenre`
--

DROP TABLE IF EXISTS `TrackGenre`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `TrackGenre` (
  `ArtistId` varchar(255) NOT NULL,
  `ArtistGenre` varchar(255) NOT NULL,
  PRIMARY KEY (`ArtistId`,`ArtistGenre`),
  CONSTRAINT `1` FOREIGN KEY (`ArtistId`) REFERENCES `Artist` (`ArtistId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `User`
--

DROP TABLE IF EXISTS `User`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `User` (
  `UserId` varchar(255) NOT NULL,
  `Username` varchar(255) DEFAULT NULL,
  `ImageURL` varchar(500) DEFAULT NULL,
  `Product` varchar(50) DEFAULT NULL,
  `LastUpdated` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`UserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Final view structure for view `ArtistView`
--

/*!50001 DROP VIEW IF EXISTS `ArtistView`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`think`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `ArtistView` AS select `Artist`.`ArtistName` AS `ArtistName`,count(`TrackArtist`.`ArtistId`) AS `ArtistCount` from (`TrackArtist` join `Artist`) where `Artist`.`ArtistId` = `TrackArtist`.`ArtistId` group by `Artist`.`ArtistName` order by count(`TrackArtist`.`ArtistId`) desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `GenreView`
--

/*!50001 DROP VIEW IF EXISTS `GenreView`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`think`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `GenreView` AS select trim(`j`.`genre`) AS `SingleGenre`,count(0) AS `GenreCount` from (`app`.`TrackGenre` join JSON_TABLE(concat('["',replace(`app`.`TrackGenre`.`ArtistGenre`,',','","'),'"]'), '$[*]' COLUMNS (`genre` varchar(255) PATH '$')) `j`) where `app`.`TrackGenre`.`ArtistGenre` is not null group by trim(`j`.`genre`) order by count(0) desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2025-12-09 16:16:59
