# 论衡 Launcher (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  论衡" -ForegroundColor White
Write-Host "  ------------------------------"

# Kill any process on port 5173
$portProc = netstat -ano | Select-String ":5173.*LISTENING"
if ($portProc) {
    $pidStr = $portProc -replace '.*\s+(\d+)$', '$1'
    if ($pidStr -match '^\d+$') {
        Stop-Process -Id $pidStr -Force -ErrorAction SilentlyContinue
        Write-Host "  [*] 清理了占用 5173 端口的进程" -ForegroundColor DarkGray
    }
}

# Check node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "  [!] 依赖未安装，正在安装..." -ForegroundColor Yellow
    $env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
    npm install
}

Write-Host ""
Write-Host "  [*] 启动中，窗口即将打开..." -ForegroundColor Gray
Write-Host "  ------------------------------"
Write-Host ""

$env:VITE_PORT = "5173"
npm run dev

Write-Host ""
Write-Host "  论衡已关闭" -ForegroundColor Gray
