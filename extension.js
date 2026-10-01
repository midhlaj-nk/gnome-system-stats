/* System Overview — GNOME Shell 42 extension
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

const { GObject, St, GLib, Clutter } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Icons = Me.imports.sensors.icons;

const BASE_TICK = 2;                 // seconds between loop ticks
const SENSOR_MODULES = ['mouse', 'battery', 'cpu', 'memory', 'temp', 'gputemp',
                        'nvmetemp', 'fan', 'network'];
const SECTION_ORDER = ['Devices', 'System', 'Network'];

let indicator = null;

function loadSensors() {
    let list = [];
    for (let name of SENSOR_MODULES) {
        try {
            list.push(Me.imports.sensors[name].Sensor);
        } catch (e) {
            logError(e, `system-overview: failed loading sensor "${name}"`);
        }
    }
    return list;
}

const OverviewIndicator = GObject.registerClass(
class OverviewIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'System Overview');

        this._settings = ExtensionUtils.getSettings(
            'org.gnome.shell.extensions.system-overview');
        this._sensors = loadSensors();

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
                    gicon: Icons.gicon(s.icon),
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
                gicon: Icons.gicon(s.icon),
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

function init() {}

function enable() {
    indicator = new OverviewIndicator();
    Main.panel.addToStatusArea('system-overview', indicator);
}

function disable() {
    if (indicator) {
        indicator.destroy();
        indicator = null;
    }
}
