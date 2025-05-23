SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

declare @localized_string_AddRole_Failed nvarchar(256)
set @localized_string_AddRole_Failed = N'Échec de l''ajout du rôle "persistenceUsers"'

DECLARE @ret int, @Error int
IF NOT EXISTS( SELECT 1 FROM [dbo].[sysusers] WHERE name=N'persistenceUsers' and issqlrole=1 )
 BEGIN

	EXEC @ret = sp_addrole N'persistenceUsers'

	SELECT @Error = @@ERROR

	IF @ret <> 0 or @Error <> 0
		RAISERROR( @localized_string_AddRole_Failed, 16, -1 )
 END
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[InstanceData]') AND type in (N'U'))
	DROP TABLE [dbo].[InstanceData]
GO
CREATE TABLE [dbo].[InstanceData](
	[id] [uniqueidentifier] NOT NULL,	
	[instance] [image] NULL,
	[instanceXml] [xml] NULL,
	[created] [datetime] NOT NULL,
	[lastUpdated] [datetime] NOT NULL,
	[lockOwner] [uniqueidentifier] NULL,
	[lockExpiration] [datetime] NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
CREATE UNIQUE CLUSTERED INDEX id_index
	ON [dbo].[InstanceData] ([id])
	WITH IGNORE_DUP_KEY
GO
