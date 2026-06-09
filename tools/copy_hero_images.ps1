# Copy the six ChatGPT PNG images from Downloads into the website hero slideshow folder.
# Run this from anywhere in PowerShell.

$DST = "C:\Users\samsung-user\Desktop\Coffee-Bean-Journey"
$HeroDir = Join-Path $DST "public\images\hero-slides"
New-Item -ItemType Directory -Path $HeroDir -Force | Out-Null

$heroFiles = @(
  "C:\Users\samsung-user\Downloads\ChatGPT Image 2026年6月9日 12_04_28.png",
  "C:\Users\samsung-user\Downloads\ChatGPT Image 2026年6月9日 12_04_25.png",
  "C:\Users\samsung-user\Downloads\ChatGPT Image 2026年6月9日 12_04_23.png",
  "C:\Users\samsung-user\Downloads\ChatGPT Image 2026年6月9日 12_03_23.png",
  "C:\Users\samsung-user\Downloads\ChatGPT Image 2026年6月9日 12_03_14 (2).png",
  "C:\Users\samsung-user\Downloads\ChatGPT Image 2026年6月9日 12_03_14 (1).png"
)

for ($i = 0; $i -lt $heroFiles.Count; $i++) {
  if (!(Test-Path $heroFiles[$i])) {
    Write-Host "Missing image:" $heroFiles[$i] -ForegroundColor Red
    exit 1
  }
  Copy-Item $heroFiles[$i] (Join-Path $HeroDir ("hero-{0}.png" -f ($i + 1))) -Force
}

Write-Host "Hero images copied to $HeroDir" -ForegroundColor Green
