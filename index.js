const Plugin = require('@structures/plugin');

const { bulk, filters: { byProps } } = require('@webpack');
const { Dispatcher } = require('@webpack/common');
const { bindAll } = require('@utilities');

const {
   AccessiblityEvents,
   VoiceEvents,
   NotificationEvents
} = require('./constants');

const [
   experiments,
   notifications,
   accessibility,
   storage,
   keybinds,
   voice
] = bulk(
   byProps('hasRegisteredExperiment'),
   byProps('getDesktopType'),
   byProps('isZoomedIn'),
   byProps('ObjectStorage'),
   byProps('hasKeybind'),
   byProps('isDeaf')
);

module.exports = class PersistSettings extends Plugin {
   constructor(...args) {
      super(...args);

      bindAll(this, [
         'restore',
         'backupVoice',
         'backupKeybinds',
         'backupSettings',
         'backupExperiments',
         'backupAccessibility',
         'backupNotifications'
      ]);
   }

   start() {
      Dispatcher.subscribe('CONNECTION_OPEN', this.restore);
      Dispatcher.subscribe('KEYBINDS_ADD_KEYBIND', this.backupKeybinds);
      Dispatcher.subscribe('KEYBINDS_SET_KEYBIND', this.backupKeybinds);
      Dispatcher.subscribe('USER_SETTINGS_UPDATE', this.backupSettings);
      Dispatcher.subscribe('KEYBINDS_DELETE_KEYBIND', this.backupKeybinds);
      Dispatcher.subscribe('KEYBINDS_ENABLE_ALL_KEYBINDS', this.backupKeybinds);
      Dispatcher.subscribe('EXPERIMENT_OVERRIDE_BUCKET', this.backupExperiments);

      for (const event of AccessiblityEvents) {
         Dispatcher.subscribe(event, this.backupAccessibility);
      }

      for (const event of VoiceEvents) {
         Dispatcher.subscribe(event, this.backupVoice);
      }

      for (const event of NotificationEvents) {
         Dispatcher.subscribe(event, this.backupNotifications);
      }

      setTimeout(() => this.didRestore || this.restore(), 1000 * 10);
   }

   stop() {
      Dispatcher.unsubscribe('CONNECTION_OPEN', this.restore);
      Dispatcher.unsubscribe('KEYBINDS_ADD_KEYBIND', this.backupKeybinds);
      Dispatcher.unsubscribe('KEYBINDS_SET_KEYBIND', this.backupKeybinds);
      Dispatcher.unsubscribe('USER_SETTINGS_UPDATE', this.backupSettings);
      Dispatcher.unsubscribe('KEYBINDS_DELETE_KEYBIND', this.backupKeybinds);
      Dispatcher.unsubscribe('KEYBINDS_ENABLE_ALL_KEYBINDS', this.backupKeybinds);
      Dispatcher.unsubscribe('EXPERIMENT_OVERRIDE_BUCKET', this.backupExperiments);

      for (const event of AccessiblityEvents) {
         Dispatcher.unsubscribe(event, this.backupAccessibility);
      }

      for (const event of VoiceEvents) {
         Dispatcher.unsubscribe(event, this.backupVoice);
      }

      for (const event of NotificationEvents) {
         Dispatcher.unsubscribe(event, this.backupNotifications);
      }
   }

   backupKeybinds() {
      const data = keybinds.getState();
      this.settings.set('keybinds', data);
   }

   backupAccessibility() {
      const data = accessibility.getState();
      this.settings.set('accessibility', data);
   }

   backupNotifications() {
      const data = notifications.getState();
      this.settings.set('notifications', data);
   }

   backupExperiments() {
      const data = experiments.getSerializedState()?.experimentOverrides;
      this.settings.set('experiments', data);
   }

   backupVoice() {
      const data = voice.getState()?.settingsByContext;
      this.settings.set('voice', data);
   }

   backupSettings() {
      this.backupVoice();
      this.backupKeybinds();
      this.backupExperiments();
      this.backupAccessibility();
      this.backupNotifications();
   }

   restore() {
      this.didRestore = true;
      this.restoreVoice();
      this.restoreKeybinds();
      this.restoreExperiments();
      this.restoreAccessibility();
      this.restoreNotifications();
   }

   restoreKeybinds() {
      const backup = this.settings.get('keybinds', null);
      if (!backup) return this.backupKeybinds();

      const store = {
         _version: 2,
         _state: backup
      };

      storage.impl.set('keybinds', store);
      keybinds.initialize(store._state);
   }

   restoreExperiments() {
      const backup = this.settings.get('experiments', null);
      if (!backup) return this.backupExperiments();

      storage.impl.set('exerimentOverrides', backup);
      experiments.initialize(backup);
   }

   restoreVoice() {
      const backup = this.settings.get('voice', null);
      if (!backup) return this.backupVoice();

      storage.impl.set('MediaEngineStore', backup);
      voice.initialize(backup);
   }

   restoreAccessibility() {
      const backup = this.settings.get('accessibility', null);
      if (!backup) return this.backupAccessibility();

      const store = {
         _version: 7,
         _state: backup
      };

      storage.impl.set('AccessibilityStore', store);
      accessibility.initialize(store._state);
   }

   restoreNotifications() {
      const backup = this.settings.get('notifications', null);
      if (!backup) return this.backupNotifications();

      const store = {
         _version: 1,
         _state: backup
      };

      storage.impl.set('notifications', store);
      notifications.initialize(store._state);
   }
};
