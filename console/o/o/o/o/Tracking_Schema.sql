-- Copyright (c) Microsoft Corporation.  All rights reserved.

SET NOCOUNT ON

declare @localized_string_AddWriterRole_Failed nvarchar(256)
set @localized_string_AddWriterRole_Failed = N'Échec de l''ajout du rôle ''''tracking_writer'''''

DECLARE @ret int, @Error int
IF NOT EXISTS( SELECT 1 FROM [dbo].[sysusers] WHERE name=N'tracking_writer' and issqlrole=1 )
 BEGIN

	EXEC @ret = sp_addrole N'tracking_writer'

	SELECT @Error = @@ERROR

	IF @ret <> 0 or @Error <> 0
		RAISERROR( @localized_string_AddWriterRole_Failed, 16, -1 )
 END
GO

declare @localized_string_AddReaderRole_Failed nvarchar(256)
set @localized_string_AddReaderRole_Failed = N'Échec de l''ajout du rôle ''''tracking_reader'''''

DECLARE @ret int, @Error int
IF NOT EXISTS( SELECT 1 FROM [dbo].[sysusers] WHERE name=N'tracking_reader' and issqlrole=1 )
 BEGIN

	EXEC @ret = sp_addrole N'tracking_reader'

	SELECT @Error = @@ERROR

	IF @ret <> 0 or @Error <> 0
		RAISERROR( @localized_string_AddReaderRole_Failed, 16, -1 )
 END
GO

declare @localized_string_AddProfileReaderWriterRole_Failed nvarchar(256)
set @localized_string_AddProfileReaderWriterRole_Failed = N'Échec de l''ajout du rôle ''''tracking_profilereaderwriter'''''

DECLARE @ret int, @Error int
IF NOT EXISTS( SELECT 1 FROM [dbo].[sysusers] WHERE name=N'tracking_profilereaderwriter' and issqlrole=1 )
 BEGIN

	EXEC @ret = sp_addrole N'tracking_profilereaderwriter'

	SELECT @Error = @@ERROR

	IF @ret <> 0 or @Error <> 0
		RAISERROR( @localized_string_AddProfileReaderWriterRole_Failed, 16, -1 )
 END
GO

/*
		Drop Views
*/
IF OBJECT_ID('[dbo].[vw_TrackingPartitionSetName]') IS NOT NULL
	DROP VIEW [dbo].[vw_TrackingPartitionSetName]
GO

IF OBJECT_ID('[dbo].[vw_TrackingPartitionInterval]') IS NOT NULL
	DROP VIEW [dbo].[vw_TrackingPartitionInterval]
GO

IF OBJECT_ID('[dbo].[vw_TrackingProfileInstance]') IS NOT NULL
	DROP VIEW [dbo].[vw_TrackingProfileInstance]
GO

IF OBJECT_ID('[dbo].[vw_TrackingProfile]') IS NOT NULL
	DROP VIEW [dbo].[vw_TrackingProfile]
GO

IF OBJECT_ID('[dbo].[vw_DefaultTrackingProfile]') IS NOT NULL
	DROP VIEW [dbo].[vw_DefaultTrackingProfile]
GO

IF OBJECT_ID('[dbo].[vw_AddedActivity]') IS NOT NULL
	DROP VIEW [dbo].[vw_AddedActivity]
GO

IF OBJECT_ID('[dbo].[vw_RemovedActivity]') IS NOT NULL
	DROP VIEW [dbo].[vw_RemovedActivity]
GO

IF OBJECT_ID('[dbo].[vw_TrackingDataItemAnnotation]') IS NOT NULL
	DROP VIEW [dbo].[vw_TrackingDataItemAnnotation]
GO

IF OBJECT_ID('[dbo].[vw_EventAnnotation]') IS NOT NULL
	DROP VIEW [dbo].[vw_EventAnnotation]
GO

IF OBJECT_ID('[dbo].[vw_TrackingDataItem]') IS NOT NULL
	DROP VIEW [dbo].[vw_TrackingDataItem]
GO

IF OBJECT_ID('[dbo].[vw_ActivityExecutionStatusEvent]') IS NOT NULL
	DROP VIEW [dbo].[vw_ActivityExecutionStatusEvent]
GO

IF OBJECT_ID('[dbo].[vw_UserEvent]') IS NOT NULL
	DROP VIEW [dbo].[vw_UserEvent]
GO

IF OBJECT_ID('[dbo].[vw_ActivityInstance]') IS NOT NULL
	DROP VIEW [dbo].[vw_ActivityInstance]
GO

IF OBJECT_ID('[dbo].[vw_TrackingWorkflowEvent]') IS NOT NULL
	DROP VIEW [dbo].[vw_TrackingWorkflowEvent]
GO

IF OBJECT_ID('[dbo].[vw_WorkflowInstanceEvent]') IS NOT NULL
	DROP VIEW [dbo].[vw_WorkflowInstanceEvent]
GO

IF OBJECT_ID('[dbo].[vw_WorkflowInstance]') IS NOT NULL
	DROP VIEW [dbo].[vw_WorkflowInstance]
GO

IF OBJECT_ID('[dbo].[vw_Activity]') IS NOT NULL
	DROP VIEW [dbo].[vw_Activity]
GO

IF OBJECT_ID('[dbo].[vw_Workflow]') IS NOT NULL
	DROP VIEW [dbo].[vw_Workflow]
GO

IF OBJECT_ID('[dbo].[vw_Type]') IS NOT NULL
	DROP VIEW [dbo].[vw_Type]
GO

IF OBJECT_ID('[dbo].[vw_ActivityExecutionStatus]') IS NOT NULL
	DROP VIEW [dbo].[vw_ActivityExecutionStatus]
GO

/*
		Drop Tables
*/

IF OBJECT_ID('TrackingPartitionSetName') IS NOT NULL
	DROP TABLE dbo.TrackingPartitionSetName
GO

IF OBJECT_ID('TrackingPartitionInterval') IS NOT NULL
	DROP TABLE dbo.TrackingPartitionInterval
GO

IF OBJECT_ID('TrackingProfileInstance') IS NOT NULL
	DROP TABLE dbo.TrackingProfileInstance
GO

IF OBJECT_ID('TrackingProfile') IS NOT NULL
	DROP TABLE dbo.TrackingProfile
GO

IF OBJECT_ID('DefaultTrackingProfile') IS NOT NULL
	DROP TABLE dbo.DefaultTrackingProfile
GO

IF OBJECT_ID('[dbo].[AddedActivity]') IS NOT NULL
	DROP TABLE [dbo].[AddedActivity]
GO

IF OBJECT_ID('[dbo].[RemovedActivity]') IS NOT NULL
	DROP TABLE [dbo].[RemovedActivity]
GO

IF OBJECT_ID('TrackingDataItemAnnotation') IS NOT NULL
	DROP TABLE dbo.TrackingDataItemAnnotation
GO

IF OBJECT_ID('EventAnnotation') IS NOT NULL
	DROP TABLE dbo.EventAnnotation
GO

IF OBJECT_ID('TrackingDataItem') IS NOT NULL
	DROP TABLE dbo.TrackingDataItem
GO

IF OBJECT_ID('ActivityExecutionStatusEvent') IS NOT NULL
	DROP TABLE dbo.ActivityExecutionStatusEvent
GO

IF OBJECT_ID('UserEvent') IS NOT NULL
	DROP TABLE dbo.UserEvent
GO

IF OBJECT_ID('ActivityInstance') IS NOT NULL
	DROP TABLE dbo.ActivityInstance
GO

IF OBJECT_ID('TrackingWorkflowEvent') IS NOT NULL
	DROP TABLE [dbo].[TrackingWorkflowEvent]
GO

IF OBJECT_ID('WorkflowInstanceEvent') IS NOT NULL
	DROP TABLE [dbo].[WorkflowInstanceEvent]
GO

IF OBJECT_ID('WorkflowInstance') IS NOT NULL
	DROP TABLE dbo.WorkflowInstance
GO

IF OBJECT_ID('[dbo].[Activity]') IS NOT NULL
	DROP TABLE [dbo].[Activity]
GO

IF OBJECT_ID('[dbo].[Workflow]') IS NOT NULL
	DROP TABLE [dbo].[Workflow]
GO

IF OBJECT_ID('Type') IS NOT NULL
	DROP TABLE dbo.Type
GO

IF OBJECT_ID('ActivityExecutionStatus') IS NOT NULL
	DROP TABLE dbo.ActivityExecutionStatus
GO

/*
		Create Tables
*/
CREATE TABLE dbo.ActivityExecutionStatus
(
	[ExecutionStatusId]				tinyint NOT NULL
	,[Description]	nvarchar(128)
)
GO


INSERT dbo.ActivityExecutionStatus VALUES ( 0, N'Initialized' )
INSERT dbo.ActivityExecutionStatus VALUES ( 1, N'Executing' )
INSERT dbo.ActivityExecutionStatus VALUES ( 2, N'Canceling' )
INSERT dbo.ActivityExecutionStatus VALUES ( 3, N'Closed' )
INSERT dbo.ActivityExecutionStatus VALUES ( 4, N'Compensating' )
INSERT dbo.ActivityExecutionStatus VALUES ( 5, N'Faulting' )
GO


CREATE TABLE [dbo].[Type]
(
	[TypeId]						int				NOT NULL identity CONSTRAINT pk_Type_TypeId PRIMARY KEY CLUSTERED
	,[TypeFullName]					nvarchar(128)	NOT NULL
	,[AssemblyFullName]				nvarchar(256)	NOT NULL
	,[IsInstanceType]				bit				NOT NULL
)

CREATE UNIQUE NONCLUSTERED INDEX [idx_Type_TypeFullName_AssemblyFullName] ON [dbo].[Type]([TypeFullName],[AssemblyFullName]) WITH IGNORE_DUP_KEY
GO

CREATE TABLE [dbo].[Workflow]
(
	[WorkflowTypeId]			int					NOT NULL	CONSTRAINT [fk_Workflow_WorkflowTypeId_Type_TypeId] FOREIGN KEY REFERENCES dbo.Type(TypeId)
	,[WorkflowDefinition]		ntext				NULL
)

CREATE UNIQUE CLUSTERED INDEX [idx_Workflow_WorkflowTypeId] ON [dbo].[Workflow]([WorkflowTypeId]) WITH IGNORE_DUP_KEY
GO


CREATE TABLE [dbo].[Activity]
(
	[WorkflowTypeId]				int				NOT NULL	CONSTRAINT [fk_Workflow_WorkflowTypeId] FOREIGN KEY REFERENCES [dbo].[Workflow]([WorkflowTypeId])
	,[QualifiedName]					nvarchar(128)	NOT NULL
	,[ActivityTypeId]				int				NOT NULl
	,[ParentQualifiedName]			nvarchar(128)	NULL
)

CREATE NONCLUSTERED INDEX [idx_Activity_WorkflowTypeId] ON [dbo].[Activity]([WorkflowTypeId])
CREATE NONCLUSTERED INDEX [idx_Activity_QualifiedName] ON [dbo].[Activity]([QualifiedName])

ALTER TABLE [dbo].[Activity] ADD CONSTRAINT [pk_WorkflowTypeId_QualifiedName] PRIMARY KEY ([WorkflowTypeId],[QualifiedName])
GO


CREATE TABLE [dbo].[WorkflowInstance]
(
	[WorkflowInstanceInternalId] bigint				NOT NULL	identity CONSTRAINT [pk_WorkflowInstance_WorkflowInstanceInternalId] PRIMARY KEY CLUSTERED
	,[WorkflowInstanceId]		uniqueidentifier	NOT NULL
	,[ContextGuid]				uniqueidentifier	NOT NULL
	,[CallerInstanceId]			uniqueidentifier	NULL
	,[CallPath]					nvarchar(400)		NULL
	,[CallerContextGuid]		uniqueidentifier	NULL
	,[CallerParentContextGuid]	uniqueidentifier	NULL
	,[WorkflowTypeId]			int					NOT NULL
	,[InitializedDateTime]		datetime			NOT NULL
	,[DbInitializedDateTime]	datetime			NOT NULL default(getutcdate())
	,[EndDateTime]				datetime			NULL
	,[DbEndDateTime]			datetime			NULL
)

CREATE NONCLUSTERED INDEX [idx_WorkflowInstance_WorkflowInstanceId_ContextGuid] ON [dbo].[WorkflowInstance]([WorkflowInstanceId],[ContextGuid])
GO

CREATE TABLE [dbo].[ActivityInstance]
(
	[WorkflowInstanceInternalId]	bigint				NOT NULL
	,[ActivityInstanceId]			bigint				NOT NULL	identity CONSTRAINT [pk_ActivityInstance_ActivityInstanceId] PRIMARY KEY NONCLUSTERED
	,[QualifiedName]				nvarchar(128)		NOT NULL	
	,[ContextGuid]					uniqueidentifier	NOT NULL
	,[ParentContextGuid]			uniqueidentifier	NULL
	,[WorkflowInstanceEventId] 		bigint				NULL
)

CREATE CLUSTERED INDEX [idx_ActivityInstance_WorkflowInstanceInternalId] ON [dbo].[ActivityInstance]([WorkflowInstanceInternalId])

CREATE NONCLUSTERED INDEX [idx_ActivityInstance_WorkflowInstanceInternalId_QualifiedName_ContextGuid_ParentContextGuid] ON [dbo].[ActivityInstance]([WorkflowInstanceInternalId],[QualifiedName],[ContextGuid],[ParentContextGuid])

GO


CREATE TABLE [dbo].[ActivityExecutionStatusEvent]
(
	[ActivityExecutionStatusEventId]bigint			NOT NULL identity
	,[WorkflowInstanceInternalId]	bigint			NOT NULL	
	,[EventOrder]					int				NOT NULL
	,[ActivityInstanceId]			bigint			NOT NULL	
	,[ExecutionStatusId]			tinyint			NOT NULL
	,[EventDateTime]				datetime		NOT NULL
	,[DbEventDateTime]				datetime		NOT NULL default(getutcdate())
)

CREATE CLUSTERED INDEX [idx_ActivityExecutionStatusEvent_WorkflowInstanceInternalId] ON [dbo].[ActivityExecutionStatusEvent]([WorkflowInstanceInternalId])

GO


CREATE TABLE [dbo].[UserEvent]
(
	[UserEventId]					bigint			NOT NULL identity
	,[WorkflowInstanceInternalId]	bigint			NOT NULL	
	,[EventOrder]					int				NOT NULL
	,[ActivityInstanceId]			bigint			NOT NULL
	,[EventDateTime]				datetime		NOT NULL
	,[UserDataKey]					nvarchar(512)	NULL
	,[UserDataTypeId]				int				NULL
	,[UserData_Str]					nvarchar(512)	NULL
	,[UserData_Blob]				image			NULL
	,[UserDataNonSerializable]		bit				NOT NULL
	,[DbEventDateTime]				datetime		NOT NULL default(getutcdate())
)

CREATE CLUSTERED INDEX [idx_UserEvent_WorkflowInstanceInternalId] ON [dbo].[UserEvent]([WorkflowInstanceInternalId])

GO

CREATE TABLE [dbo].[TrackingWorkflowEvent]
(
	[TrackingWorkflowEventId]				tinyint			NOT NULL		CONSTRAINT [pk_TrackingWorkflowEvent_TrackingWorkflowEventId] PRIMARY KEY CLUSTERED
	,[Description]		nvarchar(32)	NOT NULL
)


INSERT [dbo].[TrackingWorkflowEvent] VALUES ( 0, N'Created' )
INSERT [dbo].[TrackingWorkflowEvent] VALUES ( 1, N'Completed' )
INSERT [dbo].[TrackingWorkflowEvent] VALUES ( 2, N'Idle' )
INSERT [dbo].[TrackingWorkflowEvent] VALUES ( 3, N'Suspended' )
INSERT [dbo].[TrackingWorkflowEvent] VALUES ( 4, N'Resumed' )
INSERT [dbo].[TrackingWorkflowEvent] VALUES ( 5, N'Persisted' )
INSERT [dbo].[TrackingWorkflowEvent] VALUES ( 6, N'Unloaded' )
INSERT [dbo].[TrackingWorkflowEvent] VALUES ( 7, N'Loaded' )
INSERT [dbo].[TrackingWorkflowEvent] VALUES ( 8, N'Exception' )
INSERT [dbo].[TrackingWorkflowEvent] VALUES ( 9, N'Terminated' )
INSERT [dbo].[TrackingWorkflowEvent] VALUES ( 10, N'Aborted' )
INSERT [dbo].[TrackingWorkflowEvent] VALUES ( 11, N'Changed' )
INSERT [dbo].[TrackingWorkflowEvent] VALUES ( 12, N'Started' )
        
GO

CREATE TABLE [dbo].[WorkflowInstanceEvent]
(
	[WorkflowInstanceEventId]		bigint			NOT NULL		identity CONSTRAINT [pk_WorkflowInstanceEvent_WorkflowInstanceEventId] PRIMARY KEY CLUSTERED
	,[WorkflowInstanceInternalId]	bigint			NOT NULL		
	,[TrackingWorkflowEventId]		tinyint			NOT NULL
	,[EventDateTime]				datetime		NOT NULL
	,[EventOrder]					int				NOT NULL
	,[EventArgTypeId]					int				NULL
	,[EventArg]							image			NULL
	,[DbEventDateTime]				datetime		NOT NULL default(getutcdate())
)

CREATE NONCLUSTERED INDEX [idx_WorkflowInstanceEvent_WorkflowInstanceInternalId] ON [dbo].[WorkflowInstanceEvent]([WorkflowInstanceInternalId])

GO

CREATE TABLE [dbo].[TrackingDataItem]
(
	[TrackingDataItemId]			bigint			NOT NULL	identity CONSTRAINT [pk_TrackingDataItem_TrackingDataItemId] PRIMARY KEY CLUSTERED 
	,[WorkflowInstanceInternalId]	bigint			NOT NULL
	,[EventId]						bigint			NOT NULL
	,[EventTypeId]					char(1)			NOT NULL
	,[FieldName]					nvarchar(256)	NOT NULL
	,[FieldTypeId]					int				NULL
	,[Data_Str]						nvarchar(512)	NULL
	,[Data_Blob]					image			NULL
	,[DataNonSerializable]			bit				NOT NULL
)

CREATE NONCLUSTERED INDEX [idx_TrackingDataItem_WorkflowInstanceInternalId_EventId_EventTypeId] ON [dbo].[TrackingDataItem]( [WorkflowInstanceInternalId], [EventId], [EventTypeId] )
GO


CREATE TABLE [dbo].[TrackingDataItemAnnotation]
(
	[TrackingDataItemId]			bigint			NOT NULL
	,[WorkflowInstanceInternalId]	bigint			NOT NULL
	,[Annotation]					nvarchar(1024)	NOT NULL		
)

CREATE NONCLUSTERED INDEX [idx_TrackingDataItemAnnotation_TrackingDataItemId] ON [dbo].[TrackingDataItemAnnotation]( [TrackingDataItemId] )
CREATE NONCLUSTERED INDEX [idx_TrackingDataItemAnnotation_WorkflowInstanceInternalId] ON [dbo].[TrackingDataItemAnnotation]( [WorkflowInstanceInternalId] )
GO

CREATE TABLE [dbo].[EventAnnotation]
(
	[WorkflowInstanceInternalId]	bigint			NOT NULL
	,[EventId]						bigint			NOT NULL
	,[EventTypeId]					char(1)			NOT NULL
	,[Annotation]					nvarchar(1024)	NULL		
)

CREATE CLUSTERED INDEX [idx_EventAnnotation_WorkflowInstanceInternalId] ON [dbo].[EventAnnotation]( [WorkflowInstanceInternalId] )

CREATE NONCLUSTERED INDEX [idx_EventAnnotation_EventId_EventTypeId] ON [dbo].[EventAnnotation]( [EventId], [EventTypeId] )
GO


CREATE TABLE [dbo].[AddedActivity]
(
	[WorkflowInstanceInternalId]	bigint				NOT NULL		
	,[WorkflowInstanceEventId]		bigint				NOT NULL
	,[QualifiedName]				nvarchar(128)		NOT NULL
	,[ActivityTypeId]				int					NOT NULl
	,[ParentQualifiedName]			nvarchar(128)		NULL
	,[AddedActivityAction]			nvarchar(2000)		NULL
	,[Order]						int					NULL
)

CREATE CLUSTERED INDEX [idx_AddedActivity_WorkflowInstanceInternalId] ON [dbo].[AddedActivity]([WorkflowInstanceInternalId])

CREATE NONCLUSTERED INDEX [idx_AddedActivity_WorkflowInstanceEventId] ON [dbo].[AddedActivity]([WorkflowInstanceEventId])
GO


CREATE TABLE [dbo].[RemovedActivity]
(
	[WorkflowInstanceInternalId]	bigint				NOT NULL		
	,[WorkflowInstanceEventId]		bigint				NOT NULL
	,[QualifiedName]				nvarchar(128)		NOT NULL
	,[ParentQualifiedName]			nvarchar(128)		NULL
	,[RemovedActivityAction]		nvarchar(2000)		NULL
	,[Order]						int					NULL
)

CREATE CLUSTERED INDEX [idx_RemovedActivity_WorkflowInstanceInternalId] ON [dbo].[RemovedActivity]([WorkflowInstanceInternalId])

CREATE NONCLUSTERED INDEX [idx_RemovedActivity_WorkflowInstanceEventId] ON [dbo].[RemovedActivity]([WorkflowInstanceEventId])
GO

CREATE TABLE [dbo].[TrackingPartitionInterval]
(
	[Interval]	char(1) -- Just leave this as a heap, clustering doesn't affect 
)

INSERT INTO [dbo].[TrackingPartitionInterval] ( [Interval] ) VALUES ( 'm' )
GO

CREATE TABLE [dbo].[TrackingPartitionSetName]
(
	[PartitionId]			int					NOT NULL	identity 		
	,[Name]					varchar(32)			NOT NULL
	,[CreatedDateTime]		datetime			NOT NULL	default(getutcdate())
	,[EndDateTime]			datetime			NULL
	,[PartitionInterval]	char(1)				NOT NULL
)
GO

CREATE TABLE [dbo].[TrackingProfile]
(
	[TrackingProfileId]		int					NOT NULL	identity
	,[Version]			varchar(32)			NOT NULL
	,[WorkflowTypeId]				int					NOT NULL	CONSTRAINT [fk_TrackingProfile_WorkflowTypeId] FOREIGN KEY REFERENCES [dbo].[Type]( [TypeId] )
	,[TrackingProfileXml]		ntext				NULL
	,[InsertDateTime]		datetime			NOT NULL	default(getutcdate())
)

CREATE UNIQUE CLUSTERED INDEX [pk_TrackingProfile_WorkflowTypeId_Version] ON [dbo].[TrackingProfile] ( [WorkflowTypeId], [Version] ) WITH IGNORE_DUP_KEY
GO


CREATE TABLE [dbo].[TrackingProfileInstance]
(
	[InstanceId]			uniqueidentifier	NOT NULL	CONSTRAINT pk_TrackingProfileInstance_InstanceId PRIMARY KEY NONCLUSTERED
	,[TrackingProfileXml]		ntext				NULL
	,[UpdatedDateTime]		datetime			NOT NULL	default(getutcdate())
)
GO


CREATE TABLE [dbo].[DefaultTrackingProfile]
(
	[Version]				varchar(32)			NOT NULL	CONSTRAINT pk_DefaultTrackingProfile_Version PRIMARY KEY CLUSTERED
	,[TrackingProfileXml]		ntext				NOT NULL	
	,[InsertDateTime]		datetime			NOT NULL	default(getutcdate())
)

GO

INSERT [dbo].[DefaultTrackingProfile] ( [Version], [TrackingProfileXml] )
VALUES (
'1.0.0',
N'<?xml version="1.0" encoding="utf-16" standalone="yes"?>
<TrackingProfile xmlns="http://schemas.microsoft.com/winfx/2006/workflow/trackingprofile" version="1.0.0">
    <TrackPoints>
        <ActivityTrackPoint>
            <MatchingLocations>
                <ActivityTrackingLocation>
                    <Activity>
                        <Type>System.Workflow.ComponentModel.Activity, System.Workflow.ComponentModel, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35</Type>
                        <MatchDerivedTypes>true</MatchDerivedTypes>
                    </Activity>
                    <ExecutionStatusEvents>
                        <ExecutionStatus>Initialized</ExecutionStatus>
                        <ExecutionStatus>Executing</ExecutionStatus>
                        <ExecutionStatus>Compensating</ExecutionStatus>
                        <ExecutionStatus>Canceling</ExecutionStatus>
                        <ExecutionStatus>Closed</ExecutionStatus>
                        <ExecutionStatus>Faulting</ExecutionStatus>
                    </ExecutionStatusEvents>
                </ActivityTrackingLocation>
            </MatchingLocations>
        </ActivityTrackPoint>
		<WorkflowTrackPoint>
			<MatchingLocation>
				<WorkflowTrackingLocation>
					<TrackingWorkflowEvents>
						<TrackingWorkflowEvent>Created</TrackingWorkflowEvent>						
						<TrackingWorkflowEvent>Completed</TrackingWorkflowEvent>
						<TrackingWorkflowEvent>Idle</TrackingWorkflowEvent>
						<TrackingWorkflowEvent>Suspended</TrackingWorkflowEvent>
						<TrackingWorkflowEvent>Resumed</TrackingWorkflowEvent>
						<TrackingWorkflowEvent>Persisted</TrackingWorkflowEvent>
						<TrackingWorkflowEvent>Unloaded</TrackingWorkflowEvent>
						<TrackingWorkflowEvent>Loaded</TrackingWorkflowEvent>
						<TrackingWorkflowEvent>Exception</TrackingWorkflowEvent>
						<TrackingWorkflowEvent>Terminated</TrackingWorkflowEvent>
						<TrackingWorkflowEvent>Aborted</TrackingWorkflowEvent>
						<TrackingWorkflowEvent>Changed</TrackingWorkflowEvent>
						<TrackingWorkflowEvent>Started</TrackingWorkflowEvent>
					</TrackingWorkflowEvents>
				</WorkflowTrackingLocation>
			</MatchingLocation>
		</WorkflowTrackPoint>
        <UserTrackPoint>
            <MatchingLocations>
                <UserTrackingLocation>
                    <Activity>
                        <Type>System.Workflow.ComponentModel.Activity, System.Workflow.ComponentModel, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35</Type>
                        <MatchDerivedTypes>true</MatchDerivedTypes>
                    </Activity>
                    <Argument>
                        <Type>System.Object, mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35</Type>
                        <MatchDerivedTypes>true</MatchDerivedTypes>
                    </Argument>
                </UserTrackingLocation>
            </MatchingLocations>
        </UserTrackPoint>
    </TrackPoints>
</TrackingProfile>' )

GO


CREATE VIEW [dbo].[vw_ActivityExecutionStatus]
AS
SELECT		[ExecutionStatusId]
			,[Description]
FROM		[dbo].[ActivityExecutionStatus]
GO

GRANT SELECT ON [dbo].[vw_ActivityExecutionStatus] TO tracking_reader
GO

CREATE VIEW [dbo].[vw_Type]
AS
SELECT		[TypeId]
			,[TypeFullName]
			,[AssemblyFullName]
			,[IsInstanceType]
FROM		[dbo].[Type]
GO

GRANT SELECT ON [dbo].[vw_Type] TO tracking_reader
GO

CREATE VIEW [dbo].[vw_Workflow]
AS
SELECT		[WorkflowTypeId]
			,[WorkflowDefinition]
FROM		[dbo].[Workflow]
GO

GRANT SELECT ON [dbo].[vw_Workflow] TO tracking_reader
GO

CREATE VIEW [dbo].[vw_Activity]
AS
SELECT		[WorkflowTypeId]
			,[QualifiedName]
			,[ActivityTypeId]
			,[ParentQualifiedName]
FROM 		[dbo].[Activity]
GO

GRANT SELECT ON [dbo].[vw_Workflow] TO tracking_reader
GO



CREATE VIEW [dbo].[vw_WorkflowInstance]
AS
SELECT		[WorkflowInstanceInternalId]
			,[WorkflowInstanceId]
			,[ContextGuid]
			,[CallerInstanceId]
			,[CallPath]
			,[CallerContextGuid]
			,[CallerParentContextGuid]
			,[WorkflowTypeId]
			,[InitializedDateTime]
			,[DbInitializedDateTime]
			,[EndDateTime]
			,[DbEndDateTime]
FROM		[dbo].[WorkflowInstance]
GO

GRANT SELECT ON [dbo].[vw_WorkflowInstance] TO tracking_reader
GO

CREATE VIEW [dbo].[vw_ActivityInstance]
AS
SELECT		[WorkflowInstanceInternalId]
			,[ActivityInstanceId]
			,[QualifiedName]
			,[ContextGuid]
			,[ParentContextGuid]
			,[WorkflowInstanceEventId]
FROM		[dbo].[ActivityInstance]
GO

GRANT SELECT ON [dbo].[vw_ActivityInstance] TO tracking_reader
GO

CREATE VIEW [dbo].[vw_ActivityExecutionStatusEvent]
AS
SELECT		[ActivityExecutionStatusEventId]
			,[WorkflowInstanceInternalId]
			,[EventOrder]				
			,[ActivityInstanceId]		
			,[ExecutionStatusId]					
			,[EventDateTime]					
			,[DbEventDateTime]
FROM		[dbo].[ActivityExecutionStatusEvent]
GO

GRANT SELECT ON [dbo].[vw_ActivityExecutionStatusEvent] TO tracking_reader
GO

CREATE VIEW [dbo].[vw_TrackingWorkflowEvent]
AS
SELECT		[TrackingWorkflowEventId]
			,[Description]
FROM		[dbo].[TrackingWorkflowEvent]
GO

GRANT SELECT ON [dbo].[vw_TrackingWorkflowEvent] TO tracking_reader
GO

CREATE VIEW [dbo].[vw_WorkflowInstanceEvent]
AS
SELECT		[WorkflowInstanceEventId]	
			,[WorkflowInstanceInternalId]
			,[TrackingWorkflowEventId]
			,[EventDateTime]	
			,[EventOrder]		
			,[EventArgTypeId]		
			,[EventArg]					
			,[DbEventDateTime]	
FROM		[dbo].[WorkflowInstanceEvent]
GO


CREATE VIEW [dbo].[vw_UserEvent]
AS
SELECT		[UserEventId]
			,[WorkflowInstanceInternalId]
			,[EventOrder]
			,[ActivityInstanceId]
			,[EventDateTime]
			,[UserDataKey]
			,[UserDataTypeId]
			,[UserData_Str]
			,[UserData_Blob]
			,[UserDataNonSerializable]					
			,[DbEventDateTime]
FROM		[dbo].[UserEvent]
GO

GRANT SELECT ON [dbo].[vw_UserEvent] TO tracking_reader
GO


GRANT SELECT ON [dbo].[vw_WorkflowInstanceEvent] TO tracking_reader
GO

CREATE VIEW [dbo].[vw_TrackingDataItem]
AS
SELECT		[TrackingDataItemId]
			,[WorkflowInstanceInternalId]
			,[EventId]
			,[EventTypeId]
			,[FieldName]
			,[FieldTypeId]
			,[Data_Str]
			,[Data_Blob]
			,[DataNonSerializable]
FROM		[dbo].[TrackingDataItem]
GO

GRANT SELECT ON [dbo].[vw_TrackingDataItem] TO tracking_reader
GO


CREATE VIEW [dbo].[vw_TrackingDataItemAnnotation]
AS
SELECT		[TrackingDataItemId]
			,[WorkflowInstanceInternalId]
			,[Annotation]
FROM		[dbo].[TrackingDataItemAnnotation]
GO

GRANT SELECT ON [dbo].[vw_TrackingDataItemAnnotation] TO tracking_reader
GO


CREATE VIEW [dbo].[vw_EventAnnotation]
AS
SELECT		[WorkflowInstanceInternalId]
			,[EventId]
			,[EventTypeId]
			,[Annotation]
FROM		[dbo].[EventAnnotation]
GO

GRANT SELECT ON [dbo].[vw_EventAnnotation] TO tracking_reader
GO

CREATE VIEW [dbo].[vw_AddedActivity]
AS
SELECT		[WorkflowInstanceInternalId]
			,[WorkflowInstanceEventId]
			,[QualifiedName]
			,[ActivityTypeId]
			,[ParentQualifiedName]
			,[AddedActivityAction]
			,[Order]
FROM		[dbo].[AddedActivity]
GO

GRANT SELECT ON [dbo].[vw_AddedActivity] TO tracking_reader
GO

CREATE VIEW [dbo].[vw_RemovedActivity]
AS
SELECT		[WorkflowInstanceInternalId]
			,[WorkflowInstanceEventId]
			,[QualifiedName]
			,[ParentQualifiedName]
			,[RemovedActivityAction]
			,[Order]
FROM		[dbo].[RemovedActivity]
GO

GRANT SELECT ON [dbo].[vw_RemovedActivity] TO tracking_reader
GO

CREATE VIEW [dbo].[vw_TrackingProfile]
AS
SELECT		[TrackingProfileId]
			,[Version]
			,[WorkflowTypeId]
			,[TrackingProfileXml]
			,[InsertDateTime]
FROM		[dbo].[TrackingProfile]
GO

GRANT SELECT ON [dbo].[vw_TrackingProfile] TO tracking_reader
GO

CREATE VIEW [dbo].[vw_TrackingProfileInstance]
AS
SELECT		[InstanceId]
			,[TrackingProfileXml]
			,[UpdatedDateTime]
FROM		[dbo].[TrackingProfileInstance]
GO

GRANT SELECT ON [dbo].[vw_TrackingProfileInstance] TO tracking_reader
GO

CREATE VIEW [dbo].[vw_DefaultTrackingProfile]
AS
SELECT		[Version]
			,[TrackingProfileXml]
			,[InsertDateTime]
FROM		[dbo].[DefaultTrackingProfile]
GO

GRANT SELECT ON [dbo].[vw_DefaultTrackingProfile] TO tracking_reader
GO


CREATE VIEW [dbo].[vw_TrackingPartitionInterval]
AS
SELECT		[Interval]
FROM		[dbo].[TrackingPartitionInterval]
GO

GRANT SELECT ON [dbo].[vw_TrackingPartitionInterval] TO tracking_reader
GO

CREATE VIEW [dbo].[vw_TrackingPartitionSetName]
AS
SELECT		[PartitionId]
			,[Name]
			,[CreatedDateTime]
			,[EndDateTime]
			,[PartitionInterval]
FROM		[TrackingPartitionSetName]
GO

GRANT SELECT ON [dbo].[vw_TrackingPartitionSetName] TO tracking_reader
GO


