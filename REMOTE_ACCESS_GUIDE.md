# Remote Access Guide: Claude Code from Phone

Complete setup guide for accessing Claude Code on your Windows desktop from your phone using Tailscale + SSH + tmux.

---

## Part 1: Install Tailscale (Desktop)

### Step 1: Download and Install Tailscale on Windows
1. Go to https://tailscale.com/download/windows
2. Download the Tailscale installer
3. Run the installer (requires admin privileges)
4. Click through the installation wizard

### Step 2: Sign Up and Connect
1. Tailscale will open in your browser
2. Sign up using Google, Microsoft, GitHub, or email
3. Authorize the connection
4. Your desktop is now on your Tailscale network

### Step 3: Note Your Tailscale IP
1. Right-click the Tailscale icon in your system tray (near clock)
2. Click on your device name
3. Note the IP address shown (format: `100.x.x.x`)
   - Write this down, you'll need it later

---

## Part 2: Enable SSH Server (Desktop)

### Step 4: Install OpenSSH Server on Windows
1. Open **Settings** → **Apps** → **Optional Features**
2. Click **Add a feature**
3. Search for "OpenSSH Server"
4. Click **Install**
5. Wait for installation to complete

### Step 5: Start and Configure SSH Service
1. Open **PowerShell as Administrator**
2. Run these commands:
```powershell
# Start the SSH service
Start-Service sshd

# Set SSH to start automatically
Set-Service -Name sshd -StartupType 'Automatic'

# Confirm the firewall rule is configured (should already exist)
Get-NetFirewallRule -Name *ssh*
```

### Step 6: Test SSH Locally
1. Open a regular PowerShell window
2. Test connection:
```powershell
ssh jaretwyatt@localhost
```
3. Type `yes` when prompted about authenticity
4. Enter your Windows password
5. If you see a command prompt, SSH is working!
6. Type `exit` to disconnect

---

## Part 3: Install tmux (Desktop)

### Step 7: Install tmux via Git Bash or WSL

**Option A: Using Git Bash (if you have Git installed)**
tmux is not natively available in Git Bash, so use Option B.

**Option B: Using WSL (Recommended)**
1. Open PowerShell as Administrator
2. Install WSL if not already installed:
```powershell
wsl --install
```
3. Restart your computer if prompted
4. Open WSL/Ubuntu terminal
5. Install tmux:
```bash
sudo apt update
sudo apt install tmux -y
```

**Option C: Using Scoop (Windows package manager)**
1. Open PowerShell
2. Install Scoop if not already installed:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```
3. Install tmux:
```powershell
scoop install tmux
```

---

## Part 4: Install Tailscale on Phone

### Step 8: Install Mobile App
**iOS:**
1. Open App Store
2. Search "Tailscale"
3. Install the Tailscale app

**Android:**
1. Open Google Play Store
2. Search "Tailscale"
3. Install the Tailscale app

### Step 9: Connect Phone to Tailscale
1. Open Tailscale app
2. Sign in with the SAME account you used on desktop
3. Authorize the connection
4. Your phone is now on your private Tailscale network

---

## Part 5: Install SSH Client on Phone

### Step 10: Install Terminal App

**iOS:**
- **Termius** (free, user-friendly) - Recommended for beginners
- **Blink Shell** (paid, powerful)
- Download from App Store

**Android:**
- **Termux** (free, full Linux environment) - Recommended
- **JuiceSSH** (free, simple)
- **Termius** (free)
- Download from Google Play Store

---

## Part 6: Connect from Phone

### Step 11: Configure SSH Connection in Your App

**Using Termius (iOS/Android):**
1. Open Termius
2. Tap **+ New Host**
3. Enter details:
   - **Alias:** Desktop
   - **Hostname:** Your Tailscale IP (e.g., `100.x.x.x`)
   - **Username:** `jaretwyatt`
   - **Password:** Your Windows password
4. Save

**Using Termux (Android):**
1. Open Termux
2. Type:
```bash
ssh jaretwyatt@100.x.x.x
```
(Replace with your actual Tailscale IP)
3. Type `yes` when prompted
4. Enter your Windows password

**Using Blink Shell (iOS):**
1. Open Blink Shell
2. Type:
```bash
ssh jaretwyatt@100.x.x.x
```

### Step 12: First Connection Test
1. Connect using your SSH client
2. You should see a Windows command prompt or bash prompt
3. Type `whoami` - should show `jaretwyatt`
4. Success! You're remotely connected

---

## Part 7: Use Claude Code with tmux

### Step 13: Start a tmux Session
When connected via SSH:

**If using WSL:**
```bash
# Start WSL from Windows SSH session
wsl

# Start tmux
tmux new -s claude
```

**If using native Windows bash:**
```bash
# Start tmux
tmux new -s claude
```

### Step 14: Navigate and Start Claude Code
```bash
# Navigate to your project
cd ~/.local/bin/strainscoutmd/strainscout_md

# Start Claude Code
claude-code
```

### Step 15: Learn Basic tmux Commands
- **Detach from session** (keeps it running): Press `Ctrl+b`, then `d`
- **Reconnect to session**: `tmux attach -t claude`
- **List sessions**: `tmux ls`
- **Kill session**: `tmux kill-session -t claude`

---

## Part 8: Your Daily Workflow

### Morning Routine:
1. Open Tailscale app on phone (ensure it's connected)
2. Open your SSH client app
3. Connect to your desktop
4. Type: `wsl` (if needed) then `tmux attach -t claude`
5. Claude Code session resumes right where you left off

### Working Session:
- Use Claude Code normally
- Chat interface works in terminal
- When done, press `Ctrl+b` then `d` to detach
- Type `exit` to close SSH connection

### Later That Day:
1. Reconnect via SSH
2. Type: `wsl` (if needed) then `tmux attach -t claude`
3. Your Claude session is still running!

---

## Troubleshooting

### Can't connect via SSH
- Verify Tailscale is running on both devices (green icon)
- Check your Tailscale IP hasn't changed: `tailscale ip`
- Ensure SSH service is running: `Get-Service sshd` in PowerShell

### tmux not found
- If using Windows natively, install via WSL or Scoop
- In WSL: `sudo apt install tmux`

### Connection drops frequently
- Tailscale keeps connections alive automatically
- tmux preserves your session even if disconnected
- Just reconnect and `tmux attach`

### Claude Code not in PATH
- May need to start Claude Code from its installation directory
- Or add it to PATH in your shell profile

### Windows firewall blocking SSH
```powershell
# Run in PowerShell as Admin
New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
```

---

## Security Notes

- Tailscale creates an encrypted mesh network (WireGuard protocol)
- Only devices on YOUR Tailscale account can connect
- SSH traffic is encrypted end-to-end
- No ports exposed to the public internet
- You can disable devices from Tailscale admin console: https://login.tailscale.com/admin/machines

---

## Advanced: SSH Key Authentication (Optional)

For password-less login:

**On your phone (if using Termux):**
```bash
ssh-keygen -t ed25519
ssh-copy-id jaretwyatt@100.x.x.x
```

**Using Termius/Blink:**
- Generate key in the app settings
- Copy public key
- Add to `C:\Users\jaretwyatt\.ssh\authorized_keys` on desktop

---

## Quick Reference

**Desktop Tailscale IP:** `100.x.x.x` (check with `tailscale ip`)

**SSH Command:** `ssh jaretwyatt@100.x.x.x`

**Start tmux:** `tmux new -s claude`

**Detach tmux:** `Ctrl+b` then `d`

**Reattach tmux:** `tmux attach -t claude`

**Start Claude Code:**
```bash
cd ~/.local/bin/strainscoutmd/strainscout_md
claude-code
```

---

Good luck! You'll be coding from your phone in no time.
