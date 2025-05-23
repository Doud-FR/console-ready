@{
GUID="CA046F10-CA64-4740-8FF9-2565DBA61A4F"
Author="Microsoft Corporation"
CompanyName="Microsoft Corporation"
Copyright="© Microsoft Corporation. All rights reserved."
ModuleVersion="3.0.0.0"
PowerShellVersion = '5.1'
CLRVersion="4.0"
AliasesToExport = @()
FunctionsToExport = @()
CmdletsToExport="Get-WinEvent", "Get-Counter", "Import-Counter", "Export-Counter", "New-WinEvent"
NestedModules="Microsoft.PowerShell.Commands.Diagnostics.dll"
TypesToProcess="..\..\GetEvent.types.ps1xml"
FormatsToProcess="..\..\Event.format.ps1xml","..\..\Diagnostics.format.ps1xml" 
HelpInfoURI = 'https://aka.ms/powershell51-help'
CompatiblePSEditions = @('Desktop')
}
