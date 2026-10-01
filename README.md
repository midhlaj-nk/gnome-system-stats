# System Overview (GNOME Shell extension)

Top-bar indicator showing mouse/device battery, CPU, RAM, temperatures (CPU/GPU/NVMe), fan, battery and network.
Click the indicator to toggle which sensors are pinned to the panel.

Targets **GNOME Shell 42**.

## Install

The folder name must match the extension UUID (`mouse-battery@midhexe`).

```bash
git clone https://github.com/midhlaj-nk/gnome-system-stats.git \
  ~/.local/share/gnome-shell/extensions/mouse-battery@midhexe
glib-compile-schemas ~/.local/share/gnome-shell/extensions/mouse-battery@midhexe/schemas
```

Restart GNOME Shell (X11: `Alt+F2`, type `r`, Enter; Wayland: log out and back in), then:

```bash
gnome-extensions enable mouse-battery@midhexe
```

## Requirements

- `upower` (mouse battery)
- hwmon sensors in `/sys/class/hwmon` (temps, fan)
