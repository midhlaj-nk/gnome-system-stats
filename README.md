# System Overview (GNOME Shell extension)

Top-bar indicator showing mouse/device battery, CPU, RAM, temperatures (CPU/GPU/NVMe), fan, battery and network.
Click the indicator to toggle which sensors are pinned to the panel.

## Which branch?

| Branch     | GNOME Shell | Ubuntu            |
|------------|-------------|-------------------|
| `main`     | 45 – 50     | 24.04 and newer   |
| `gnome-42` | 42          | 22.04             |

GNOME 45 changed extensions to ES modules, so the two versions can't share code.
Check yours with `gnome-shell --version`.

## Install

The folder name must match the extension UUID (`mouse-battery@midhexe`).

```bash
# GNOME 45+ (Ubuntu 24.04+)
git clone https://github.com/midhlaj-nk/gnome-system-stats.git \
  ~/.local/share/gnome-shell/extensions/mouse-battery@midhexe

# GNOME 42 (Ubuntu 22.04) instead:
# git clone -b gnome-42 https://github.com/midhlaj-nk/gnome-system-stats.git \
#   ~/.local/share/gnome-shell/extensions/mouse-battery@midhexe

glib-compile-schemas ~/.local/share/gnome-shell/extensions/mouse-battery@midhexe/schemas
```

Log out and back in (Wayland) or `Alt+F2` → `r` → Enter (X11 on GNOME 42), then:

```bash
gnome-extensions enable mouse-battery@midhexe
```

## Requirements

- `upower` (mouse battery)
- hwmon sensors in `/sys/class/hwmon` (temps, fan)
