# --- CONFIGURAR ESTAS 2 RUTAS ---
$ProjectRoot = "S:\Source\NET\tokenserver.angular\ng-oid-sso-cross-spa"
$Destination = "\\WS2019APP\inetpub\ANGULAR_APPS\test-spa-opendata.malvinasargentinas.gob.ar"
# --------------------------------

$ErrorActionPreference = "Stop"

Set-Location $ProjectRoot

# 1) Dependencias (determinístico)
npm ci

# 2) Build producción (root del host)
ng build --configuration=production --base-href / --deploy-url /

# 3) Detectar carpeta de salida (dist/*/browser)
$dist = Join-Path $ProjectRoot "dist"
$browserDir = Get-ChildItem -Path $dist -Recurse -Directory -Filter "browser" | Select-Object -First 1
$src = if ($browserDir) { $browserDir.FullName } else { (Get-ChildItem -Path $dist -Directory | Select-Object -First 1).FullName }

if (-not $src) { throw "No se encontró carpeta de build en dist." }

# 4) Copiar (mirror) al destino
robocopy $src $Destination *.* /MIR /R:2 /W:2 /NFL /NDL /NP | Out-Null

# 6) Copiar web.config desde la raíz del proyecto (si existe)
$wc = Join-Path $ProjectRoot "web.config"
if (Test-Path $wc) {
  Copy-Item $wc (Join-Path $Destination "web.config") -Force
} else {
  Write-Host "Aviso: no se encontró web.config en la raíz del proyecto." -ForegroundColor Yellow
}

Write-Host "Listo. Copiado desde '$src' a '$Destination'."
