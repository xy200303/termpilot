$dir = Join-Path $env:APPDATA 'TermPilot\bin'
$path = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not $path) { exit 0 }
$norm = $dir.TrimEnd('\')
$items = New-Object System.Collections.Generic.List[string]
foreach ($item in $path.Split(';')) {
  if (-not $item) { continue }
  if ($item.TrimEnd('\').Equals($norm, [StringComparison]::OrdinalIgnoreCase)) { continue }
  $items.Add($item)
}
[Environment]::SetEnvironmentVariable('Path', ($items -join ';'), 'User')
