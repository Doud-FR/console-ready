@{
GUID="{17fc1f02-cff3-45fb-ac4f-126594c70b1e}"
Author="Microsoft Corporation"
CompanyName="Microsoft Corporation"
Copyright="� Microsoft Corporation. All rights reserved."
ModuleVersion="2.0.0.0"
ModuleToProcess="Microsoft.Tpm.Commands"
PowerShellVersion = '5.1'
CLRVersion="4.0"
AliasesToExport = @()
FunctionsToExport = @()
CmdletsToExport=
	"Get-Tpm",
	"Initialize-Tpm",
	"Clear-Tpm",
	"Unblock-Tpm",
	"Enable-TpmAutoProvisioning",
	"Disable-TpmAutoProvisioning",
	"Import-TpmOwnerAuth",
	"Set-TpmOwnerAuth",
	"ConvertTo-TpmOwnerAuth",
	"Get-TpmEndorsementKeyInfo",
	"Get-TpmSupportedFeature"
HelpInfoUri="https://aka.ms/winsvr-2025-pshelp"
CompatiblePSEditions = @('Desktop','Core')
}
