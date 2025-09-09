param(
  [Parameter(Mandatory=$false, ValueFromRemainingArguments=$true)]
  [string[]]$Args
)

$ErrorActionPreference = 'Stop'

$cli = Join-Path $PSScriptRoot '..\.vapi-cli\vapi.exe'
if (-not (Test-Path $cli)) {
  Write-Error "Vapi CLI introuvable à $cli. Téléchargez-le d'abord."
}

$apiKey = $env:VAPI_API_KEY
if (-not $apiKey) {
  Write-Warning 'VAPI_API_KEY non défini. Vous pouvez utiliser --api-key <clé> directement.'
}

& $cli @Args

