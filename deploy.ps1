$timestamp = (Get-Date).ToString("yyyyMMddHHmmss")
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "BAT DAU DEPLOY PHIEN BAN: $timestamp" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$htmlPath = "app.html"
$htmlContent = Get-Content $htmlPath -Raw -Encoding UTF8

# Cap nhat app.css
$htmlContent = $htmlContent -replace 'app\.css(\?v=\d+)?', "app.css?v=$timestamp"
# Cap nhat app.js
$htmlContent = $htmlContent -replace 'app\.js(\?v=\d+)?', "app.js?v=$timestamp"

Set-Content $htmlPath $htmlContent -Encoding UTF8
Write-Host "[OK] Da cap nhat version trong app.html." -ForegroundColor Green

try {
    $gitCheck = git --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Git not found"
    }
} catch {
    Write-Host "[LOI] Khong tim thay Git tren may tinh." -ForegroundColor Red
    Write-Host "Ban hay tai Git tai: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "Bam phim bat ky de thoat..." -ForegroundColor Cyan
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

$gitStatus = git status 2>&1
if ($gitStatus -match "not a git repository") {
    Write-Host "Lan dau tien: Dang cau hinh ket noi voi GitHub..." -ForegroundColor Yellow
    git init
    git remote add origin https://github.com/Minads-sys/quan-ly-ho-boi-v3.git
    git fetch origin
    git branch -M main
    git reset origin/main

    Write-Host "Dang day code len GitHub..." -ForegroundColor Cyan
    git add .
    git commit -m "Deploy version $timestamp"
    git push -u origin main
    Write-Host "[OK] Day code len GitHub thanh cong!" -ForegroundColor Green
} else {
    Write-Host "Dang day code len GitHub..." -ForegroundColor Cyan
    git add .
    git commit -m "Deploy version $timestamp"
    git push origin main
    Write-Host "[OK] Day code len GitHub thanh cong!" -ForegroundColor Green
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Hoan thanh! Bam phim bat ky de thoat..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
