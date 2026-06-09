$ErrorActionPreference = "Stop"

$Root = "C:\Users\samsung-user\Desktop\Coffee-Bean-Journey"
$Main = Join-Path $Root "src\main.js"
$ImportLine = 'import "./styles/chapter2PriorityLayout.css";'

if (!(Test-Path $Main)) {
  throw "Cannot find src\main.js at $Main"
}

$content = Get-Content -LiteralPath $Main -Raw

if ($content -notmatch [regex]::Escape($ImportLine)) {
  if ($content -match 'import "\./styles/finalLayoutTuning\.css";') {
    $replacement = 'import "./styles/finalLayoutTuning.css";' + "`r`n" + $ImportLine
    $content = $content -replace 'import "\./styles/finalLayoutTuning\.css";', $replacement
  }
  elseif ($content -match 'import "\./styles/sectionPolishPatch\.css";') {
    $replacement = 'import "./styles/sectionPolishPatch.css";' + "`r`n" + $ImportLine
    $content = $content -replace 'import "\./styles/sectionPolishPatch\.css";', $replacement
  }
  else {
    $content = $ImportLine + "`r`n" + $content
  }
  Set-Content -LiteralPath $Main -Value $content -NoNewline -Encoding UTF8
  Write-Host "Added CSS import to src/main.js"
} else {
  Write-Host "src/main.js already imports chapter2PriorityLayout.css"
}
