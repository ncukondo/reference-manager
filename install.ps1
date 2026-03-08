# Installer for reference-manager single binary (Windows)
# Usage: irm https://raw.githubusercontent.com/ncukondo/reference-manager/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

$Repo = "ncukondo/reference-manager"
$InstallDir = if ($env:REF_INSTALL_DIR) { $env:REF_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "ref" }
$BinaryName = "ref.exe"

function Write-Info($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host $msg -ForegroundColor Green }
function Write-Err($msg) {
    Write-Host "error: $msg" -ForegroundColor Red
    exit 1
}

# Get latest release tag
function Get-LatestVersion {
    $url = "https://api.github.com/repos/$Repo/releases/latest"
    try {
        $release = Invoke-RestMethod -Uri $url -Headers @{ "User-Agent" = "ref-installer" }
        return $release.tag_name
    } catch {
        Write-Err "Could not fetch latest version from GitHub."
    }
}

# Download binary
function Download-Binary($version, $dest) {
    $filename = "ref-windows-x64.exe"
    $url = "https://github.com/$Repo/releases/download/$version/$filename"

    Write-Info "Downloading $filename ($version)..."

    try {
        $ProgressPreference = "SilentlyContinue"
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
    } catch {
        Write-Err "Download failed. Check that release $version exists with binary $filename."
    }
}

# Add to user PATH (persistent, via registry)
function Configure-Path($dir) {
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -split ";" | Where-Object { $_ -eq $dir }) {
        return
    }

    Write-Info "Adding $dir to user PATH..."
    $newPath = "$currentPath;$dir"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")

    # Also update current session
    $env:Path = "$dir;$env:Path"
    Write-Info "  PATH updated (takes effect in new terminals)"
}

# Main
function Main {
    $version = if ($env:REF_VERSION) { $env:REF_VERSION } else { Get-LatestVersion }
    if (-not $version) {
        Write-Err "Could not determine latest version. Set `$env:REF_VERSION='v0.x.x' to install a specific version."
    }

    Write-Info "Detected platform: windows-x64"

    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }

    $dest = Join-Path $InstallDir $BinaryName
    Download-Binary $version $dest

    Configure-Path $InstallDir

    # Verify
    try {
        $ver = & $dest --version 2>&1
        Write-Success "Installed ref $ver to $dest"
    } catch {
        Write-Err "Installation completed but binary verification failed"
    }

    if (-not (Get-Command ref -ErrorAction SilentlyContinue)) {
        Write-Host ""
        Write-Info "Restart your terminal to use 'ref' command."
    }
}

Main
