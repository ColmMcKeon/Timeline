const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadData:       ()            => ipcRenderer.invoke('load-data'),
  openFileDialog: ()            => ipcRenderer.invoke('open-file-dialog'),
  listProjects:     ()                  => ipcRenderer.invoke('list-projects'),
  loadProject:      (file, archived)    => ipcRenderer.invoke('load-project', file, archived),
  saveProject:      (file, data)        => ipcRenderer.invoke('save-project', file, data),
  getDataDir:       ()                  => ipcRenderer.invoke('get-data-dir'),
  listTeams:        ()                  => ipcRenderer.invoke('list-teams'),
  loadTeam:         (file)              => ipcRenderer.invoke('load-team', file),
  saveTeam:         (file, members)     => ipcRenderer.invoke('save-team', file, members),
  archiveProject:   (file)              => ipcRenderer.invoke('archive-project', file),
  unarchiveProject: (file)              => ipcRenderer.invoke('unarchive-project', file),
  saveData:     (data)   => ipcRenderer.invoke('save-data', data),
  setDirty:     (dirty)  => ipcRenderer.send('set-dirty', dirty),
  saveComplete: ()       => ipcRenderer.send('save-complete'),
  onSaveAndQuit:    (cb)          => ipcRenderer.on('save-and-quit', cb),
  captureTimeline:  (filename)    => ipcRenderer.invoke('capture-page', filename),
  exportPdf:        (rect, label, reportHtml, filename) => ipcRenderer.invoke('export-pdf', rect, label, reportHtml, filename),
});
