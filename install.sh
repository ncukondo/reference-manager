#!/usr/bin/env bash
set -euo pipefail

# Installer for reference-manager single binary
# Usage: curl -fsSL https://raw.githubusercontent.com/ncukondo/reference-manager/main/install.sh | bash

REPO="ncukondo/reference-manager"
INSTALL_DIR="${REF_INSTALL_DIR:-$HOME/.local/bin}"
BINARY_NAME="ref"

# Colors (disabled if not a TTY)
if [[ -t 1 ]]; then
  BOLD="\033[1m"
  GREEN="\033[32m"
  RED="\033[31m"
  RESET="\033[0m"
else
  BOLD="" GREEN="" RED="" RESET=""
fi

info() { echo -e "${BOLD}$*${RESET}"; }
success() { echo -e "${GREEN}$*${RESET}"; }
error() { echo -e "${RED}error: $*${RESET}" >&2; exit 1; }

# Detect platform
detect_platform() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"

  case "$os" in
    Linux)  os="linux" ;;
    Darwin) error "macOS is not yet supported. Use npm install -g @ncukondo/reference-manager instead." ;;
    MINGW*|MSYS*|CYGWIN*) os="windows" ;;
    *) error "Unsupported OS: $os" ;;
  esac

  case "$arch" in
    x86_64|amd64) arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    *) error "Unsupported architecture: $arch" ;;
  esac

  echo "${os}-${arch}"
}

# Get latest release tag
get_latest_version() {
  local url="https://api.github.com/repos/${REPO}/releases/latest"
  if command -v curl &>/dev/null; then
    curl -fsSL "$url" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"//;s/".*//'
  elif command -v wget &>/dev/null; then
    wget -qO- "$url" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"//;s/".*//'
  else
    error "curl or wget is required"
  fi
}

# Download binary
download_binary() {
  local version="$1" platform="$2" dest="$3"
  local filename="ref-${platform}"
  [[ "$platform" == windows-* ]] && filename="${filename}.exe"

  local url="https://github.com/${REPO}/releases/download/${version}/${filename}"
  info "Downloading ${filename} (${version})..."

  if command -v curl &>/dev/null; then
    if [[ -t 1 ]]; then
      # TTY: show progress bar
      curl -fSL --progress-bar -o "$dest" "$url" || error "Download failed. Check that release ${version} exists with binary ${filename}."
    else
      curl -fsSL -o "$dest" "$url" || error "Download failed. Check that release ${version} exists with binary ${filename}."
    fi
  elif command -v wget &>/dev/null; then
    if [[ -t 1 ]]; then
      wget --show-progress -qO "$dest" "$url" || error "Download failed. Check that release ${version} exists with binary ${filename}."
    else
      wget -qO "$dest" "$url" || error "Download failed. Check that release ${version} exists with binary ${filename}."
    fi
  else
    error "curl or wget is required for downloading."
  fi

  chmod +x "$dest"
}

# Configure PATH in shell rc files
configure_path() {
  local install_dir="$1"
  local path_line="export PATH=\"${install_dir}:\$PATH\""

  # Skip if already in PATH
  if echo "$PATH" | tr ':' '\n' | grep -qx "$install_dir"; then
    return
  fi

  info "Adding ${install_dir} to PATH..."

  for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
    if [[ -f "$rc" ]] && ! grep -qF "$install_dir" "$rc"; then
      echo "" >> "$rc"
      echo "# reference-manager" >> "$rc"
      echo "$path_line" >> "$rc"
      info "  Updated $(basename "$rc")"
    fi
  done

  # Fish uses a different syntax
  local fish_config="$HOME/.config/fish/config.fish"
  if [[ -f "$fish_config" ]] && ! grep -qF "$install_dir" "$fish_config"; then
    echo "" >> "$fish_config"
    echo "# reference-manager" >> "$fish_config"
    echo "fish_add_path ${install_dir}" >> "$fish_config"
    info "  Updated config.fish"
  fi
}

main() {
  local platform version

  platform="$(detect_platform)"
  info "Detected platform: ${platform}"

  version="${REF_VERSION:-$(get_latest_version)}"
  [[ -z "$version" ]] && error "Could not determine latest version. Set REF_VERSION=v0.x.x to install a specific version."

  mkdir -p "$INSTALL_DIR"
  download_binary "$version" "$platform" "${INSTALL_DIR}/${BINARY_NAME}"

  configure_path "$INSTALL_DIR"

  # Verify
  if "${INSTALL_DIR}/${BINARY_NAME}" --version &>/dev/null; then
    success "Installed ref $(${INSTALL_DIR}/${BINARY_NAME} --version) to ${INSTALL_DIR}/${BINARY_NAME}"
  else
    error "Installation completed but binary verification failed"
  fi

  if ! command -v ref &>/dev/null; then
    echo ""
    info "Restart your shell or run:"
    echo "  export PATH=\"${INSTALL_DIR}:\$PATH\""
  fi
}

main
