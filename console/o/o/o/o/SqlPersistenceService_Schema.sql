-- Copyright (c) Microsoft Corporation.  All rights reserved.

SET NOCOUNT ON

--
-- ROLE state_persistence_users
--
declare @localized_string_AddRole_Failed nvarchar(256)
set @localized_string_AddRole_Failed = N'Échec de l''ajout du rôle ''''state_persistence_users''''.'

DECLARE @ret int, @Error int
IF NOT EXISTS( SELECT 1 FROM [dbo].[sysusers] WHERE name=N'state_persistence_users' and issqlrole=1 )
 BEGIN

	EXEC @ret = sp_addrole N'state_persistence_users'

	SELECT @Error = @@ERROR

	IF @ret <> 0 or @Error <> 0
		RAISERROR( @localized_string_AddRole_Failed, 16, -1 )
 END
GO


--
-- TABLE InstanceState
--
if exists (select * from dbo.sysobjects where id = object_id(N'[dbo].[InstanceState]') and OBJECTPROPERTY(id, N'IsUserTable') = 1)
drop table [dbo].[InstanceState]
GO
CREATE TABLE [dbo].[InstanceState] (
	[uidInstanceID] [uniqueidentifier] NOT NULL ,
	[state] [image] NULL ,
	[status] [int] NULL ,
	[unlocked] [int] NULL ,
	[blocked] [int] NULL ,
	[info] [ntext] COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[modified] [datetime] NOT NULL,
	[ownerID] [uniqueidentifier] NULL ,
	[ownedUntil] [datetime] NULL,
	[nextTimer] [datetime] NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
CREATE  UNIQUE CLUSTERED  INDEX [IX_InstanceState] ON [dbo].[InstanceState]([uidInstanceID]) ON [PRIMARY]
-- CREATE  NONCLUSTERED  INDEX [IX_InstanceState_Ownership] ON [dbo].[InstanceState]([ownerID],[ownedUntil])
GO


--
-- TABLE CompletedScope
--
IF EXISTS (SELECT * FROM [dbo].[sysobjects] WHERE id = object_id(N'[dbo].[CompletedScope]') AND OBJECTPROPERTY(id, N'IsUserTable') = 1)
DROP TABLE [dbo].[CompletedScope]
GO
CREATE TABLE [dbo].[CompletedScope] (
	[uidInstanceID] [uniqueidentifier] NOT NULL,
	[completedScopeID] [uniqueidentifier] NOT NULL,
	[state] [image] NOT NULL,
	[modified] [datetime] NOT NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
CREATE  NONCLUSTERED  INDEX [IX_CompletedScope] ON [dbo].[CompletedScope]([completedScopeID]) ON [PRIMARY]
GO
CREATE  NONCLUSTERED  INDEX [IX_CompletedScope_InstanceID] ON [dbo].[CompletedScope]( [uidInstanceID] )
GO


DBCC TRACEON (1204)
