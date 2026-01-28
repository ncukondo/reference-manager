FROM mcr.microsoft.com/vscode/devcontainers/base:ubuntu

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js v24.4.1
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs=24.4.1-1nodesource1


# Install Claude CLI (native binary)
RUN curl -fsSL https://claude.ai/install.sh | bash

# Set up non-root user
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Create the user if it doesn't exist
RUN if ! id -u $USERNAME > /dev/null 2>&1; then \
        groupadd --gid $USER_GID $USERNAME \
        && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME; \
    fi

# Give sudo access
RUN apt-get update && apt-get install -y sudo \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Install uv
COPY --from=ghcr.io/astral-sh/uv:0.8.3 /uv /uvx /bin/


# Switch to non-root user and set up uv for them
USER $USERNAME

# Configure npm global install directory for non-root user
RUN mkdir -p /home/$USERNAME/.npm-global
ENV NPM_CONFIG_PREFIX=/home/$USERNAME/.npm-global

# Add npm global bin to PATH
ENV PATH=/home/$USERNAME/.npm-global/bin:$PATH

# Set working directory
WORKDIR /workspace
