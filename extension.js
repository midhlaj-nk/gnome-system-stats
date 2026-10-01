/* System Overview — GNOME Shell 45+ extension (ES modules)
 *
 * Core only. Each metric lives in its own module under sensors/.
 * A single poll loop ticks every BASE_TICK seconds and runs each
 * sensor when its own `interval` is due. The dropdown lists every
 * sensor with a switch; switched-on sensors appear in the panel.
 * The pinned set is persisted in GSettings ("pinned").
 *
 * Sensor contract (see sensors/*.js):
 *   { id, label, icon, section, interval, pinned (default),
 *     icon is an icon name; see sensors/icons.js,
 *     text, value,
 *     read()            -> fill this.text / this.value  (sync, fast)
 *     readAsync(done)   -> same, but call done() when finished (optional)
 *     color(value)      -> css color string or null     (optional) }
 */

import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Icons from './sensors/icons.js';
import {Sensor as Mouse} from './sensors/mouse.js';
import {Sensor as Battery} from './sensors/battery.js';
import {Sensor as Cpu} from './sensors/cpu.js';
import {Sensor as Memory} from './sensors/memory.js';
import {Sensor as Temp} from './sensors/temp.js';
import {Sensor as GpuTemp} from './sensors/gputemp.js';
import {Sensor as NvmeTemp} from './sensors/nvmetemp.js';
import {Sensor as Fan} from './sensors/fan.js';
import {Sensor as Network} from './sensors/network.js';

const BASE_TICK = 2;                 // seconds between loop ticks
const SENSORS = [Mouse, Battery, Cpu, Memory, Temp, GpuTemp, NvmeTemp, Fan,
                 Network];
const SECTION_ORDER = ['Devices', 'System', 'Network'];

const OverviewIndicator = GObject.registerClass(
class OverviewIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, 'System Overview');

        this._dir = extension.dir;
        this._settings = extension.getSettings();
        this._sensors = SENSORS;

        // --- panel: a box we refill whenever the pinned set changes
        this._box = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
        this.add_child(this._box);
        this._panelItems = {};     // id -> { icon, label }

        // --- dropdown: switch row per sensor
        this._switches = {};       // id -> PopupSwitchMenuItem
        this._valueText = {};      // id -> current value cache (for label)
        this._buildMenu();

        this._rebuildPanel();

        this._settingsChangedId = this._settings.connect(
            'changed::pinned', () => this._rebuildPanel());

        // --- poll loop
        this._tick();
        this._timeout = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, BASE_TICK, () => this._tick());
    }

    _pinnedIds() {
        return this._settings.get_strv('pinned');
    }

    _buildMenu() {
        let pinned = this._pinnedIds();
        for (let section of SECTION_ORDER) {
            let inSection = this._sensors.filter(s => s.section === section);
            if (inSection.length === 0)
                continue;
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(section));
            for (let s of inSection) {
                let on = pinned.includes(s.id);
                let item = new PopupMenu.PopupSwitchMenuItem(
                    this._rowLabel(s), on);
                item.insert_child_at_index(new St.Icon({
                    gicon: Icons.gicon(s.icon, this._dir),
                    style_class: 'popup-menu-icon',
                }), 0);
                item.connect('toggled', (_item, state) => {
                    this._setPinned(s.id, state);
                });
                this.menu.addMenuItem(item);
                this._switches[s.id] = item;
            }
        }
    }

    _rowLabel(s) {
        return s.label + ':  ' + s.text;
    }

    _setPinned(id, on) {
        let pinned = this._pinnedIds();
        let has = pinned.includes(id);
        if (on && !has)
            pinned.push(id);
        else if (!on && has)
            pinned = pinned.filter(x => x !== id);
        else
            return;
        this._settings.set_strv('pinned', pinned);   // triggers _rebuildPanel
    }

    _rebuildPanel() {
        this._box.destroy_all_children();
        this._panelItems = {};
        let pinned = this._pinnedIds();
        // keep module order, not the order they were toggled
        for (let s of this._sensors) {
            if (!pinned.includes(s.id))
                continue;
            let group = new St.BoxLayout({ style: 'padding-right: 8px;' });
            let icon = new St.Icon({
                gicon: Icons.gicon(s.icon, this._dir),
                style_class: 'system-status-icon',
                icon_size: 14,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'margin-right: 3px;',
            });
            let lbl = new St.Label({
                text: s.text,
                y_align: Clutter.ActorAlign.CENTER,
            });
            group.add_child(icon);
            group.add_child(lbl);
            this._box.add_child(group);
            this._panelItems[s.id] = { icon, label: lbl };
        }
        // reflect state in the switches too
        for (let s of this._sensors) {
            let sw = this._switches[s.id];
            if (sw) sw.setToggleState(pinned.includes(s.id));
        }
        this._refresh();
    }

    _tick() {
        let now = GLib.get_monotonic_time() / 1e6;
        for (let s of this._sensors) {
            if (now - (s._last || 0) < s.interval)
                continue;
            s._last = now;
            try {
                if (s.readAsync)
                    s.readAsync(() => this._refresh());
                else
                    s.read();
            } catch (e) {
                logError(e, `system-overview: sensor "${s.id}" read failed`);
                s.text = '!';
            }
        }
        this._refresh();
        return GLib.SOURCE_CONTINUE;
    }

    _refresh() {
        for (let s of this._sensors) {
            // panel
            let item = this._panelItems[s.id];
            if (item) {
                item.label.text = s.text;
                let col = s.color ? s.color(s.value) : null;
                item.label.style = col ? 'color: ' + col + ';' : '';
                item.icon.style = 'margin-right: 3px;' +
                    (col ? ' color: ' + col + ';' : '');
            }
            // dropdown row label
            let sw = this._switches[s.id];
            if (sw && sw.label)
                sw.label.text = this._rowLabel(s);
        }
    }

    destroy() {
        if (this._timeout) {
            GLib.source_remove(this._timeout);
            this._timeout = null;
        }
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        super.destroy();
    }
});

export default class SystemOverviewExtension extends Extension {
    enable() {
        this._indicator = new OverviewIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
