param(
  [string]$TargetHost = 'jan@t630',
  [string]$RemoteDir = '/var/www/html/lingua-play',
  [string]$CheckUrl = 'https://t630.local/lingua-play/'
)

$ErrorActionPreference = 'Stop'

function Invoke-Checked {
  param([scriptblock]$Action, [string]$Label)
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE"
  }
}

Write-Host '1/4 Running tests...'
Invoke-Checked { npm test } 'npm test'

Write-Host '2/4 Building production bundle...'
Invoke-Checked { npm run build } 'npm run build'

Write-Host "3/4 Deploying dist/ to ${TargetHost}:${RemoteDir}..."
Invoke-Checked { ssh $TargetHost "mkdir -p '$RemoteDir' && rm -rf '$RemoteDir'/*" } 'ssh prepare'
Invoke-Checked { scp -r dist/* "${TargetHost}:${RemoteDir}/" } 'scp upload'
Invoke-Checked {
  ssh $TargetHost "chmod 755 '$RemoteDir' '$RemoteDir/assets' && chmod 644 '$RemoteDir/index.html' '$RemoteDir/assets/'*"
} 'ssh chmod'

Write-Host "4/4 Verifying $CheckUrl..."
$status = Invoke-Checked { ssh $TargetHost "curl -sk -o /dev/null -w '%{http_code}' '$CheckUrl'" } 'curl check'
if ($status.Trim() -ne '200') {
  throw "Expected HTTP 200 from $CheckUrl, got '$status'"
}

Write-Host "Deployed successfully -> $CheckUrl (HTTP $status)"
