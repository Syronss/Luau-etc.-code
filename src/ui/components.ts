/**
 * UI Components - Modern, yeniden kullanılabilir UI bileşenleri
 */
import * as monaco from 'monaco-editor'; // Add this import
import EditorStore, { FileData, ProjectData } from "../store/EditorStore";

export class FileTree {
export class FileTree {
    private container: HTMLElement;
    private files: FileData[] = [];

    constructor(containerId: string) {
        const element = document.getElementById(containerId);
        if (!element) throw new Error(`Container ${containerId} not found`);
        this.container = element;
        this.render();
        this.setupListeners();
    }

    private setupListeners() {
        EditorStore.on('projectChanged', (project: ProjectData) => {
            this.files = project.files;
            this.render();
        });

        EditorStore.on('fileAdded', () => {
            const project = EditorStore.getCurrentProject();
            if (project) {
                this.files = project.files;
                this.render();
            }
        });

        EditorStore.on('fileDeleted', () => {
            const project = EditorStore.getCurrentProject();
            if (project) {
                this.files = project.files;
                this.render();
            }
        });
    }

    private render() {
        this.container.innerHTML = `
            <div class="file-tree">
                <div class="file-tree-header">
                    <span class="file-tree-title">Files</span>
                    <button class="file-tree-btn" id="add-file-btn" title="New File">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <path fill="currentColor" d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
                <div class="file-tree-list">
                    ${this.files.map(file => this.renderFileItem(file)).join('')}
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    private renderFileItem(file: FileData): string {
        const isActive = EditorStore.getActiveFile()?.id === file.id;
        const isDirty = file.isDirty;
        const icon = this.getFileIcon(file.name);
        
        return `
            <div class="file-item ${isActive ? 'active' : ''}" data-file-id="${file.id}">
                <span class="file-icon">${icon}</span>
                <span class="file-name">${file.name}${isDirty ? ' •' : ''}</span>
                <button class="file-delete" data-file-id="${file.id}" title="Delete">×</button>
            </div>
        `;
    }

    private getFileIcon(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();
        const icons: Record<string, string> = {
            'lua': '🌙',
            'luau': '🌙',
            'js': '📜',
            'ts': '📘',
            'json': '📋',
            'md': '📝',
            'txt': '📄'
        };
        return icons[ext || ''] || '📄';
    }

    private attachEventListeners() {
        // File tıklama
        this.container.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if (!target.classList.contains('file-delete')) {
                    const fileId = (item as HTMLElement).dataset.fileId!;
                    this.selectFile(fileId);
                }
            });
        });

        // Dosya silme
        this.container.querySelectorAll('.file-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = (btn as HTMLElement).dataset.fileId!;
                this.deleteFile(fileId);
            });
        });

        // Yeni dosya
        const addBtn = this.container.querySelector('#add-file-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.createNewFile());
        }
    }

    private selectFile(fileId: string) {
        EditorStore.setActiveFile(fileId);
        const file = EditorStore.getFile(fileId);
        if (file) {
            const editor = EditorStore.getEditor();
            if (editor) {
                editor.setValue(file.content);
                monaco.editor.setModelLanguage(editor.getModel()!, file.language);
            }
        }
        this.render();
    }

    private deleteFile(fileId: string) {
        const file = EditorStore.getFile(fileId);
        if (file && confirm(`Delete ${file.name}?`)) {
            EditorStore.deleteFile(fileId);
        }
    }

    private createNewFile() {
        const name = prompt('File name:', 'new-file.luau');
        if (name) {
            const file = EditorStore.createNewFile(name);
            EditorStore.addFile(file);
            this.selectFile(file.id);
        }
    }
}

export class TabBar {
    private container: HTMLElement;
    private openFiles: FileData[] = [];

    constructor(containerId: string) {
        const element = document.getElementById(containerId);
        if (!element) throw new Error(`Container ${containerId} not found`);
        this.container = element;
        this.setupListeners();
    }

    private setupListeners() {
        EditorStore.on('projectChanged', (project: ProjectData) => {
            this.openFiles = project.files;
            this.render();
        });

        EditorStore.on('activeFileChanged', () => {
            this.render();
        });

        EditorStore.on('fileChanged', () => {
            this.render();
        });
    }

    private render() {
        this.container.innerHTML = `
            <div class="tab-bar">
                ${this.openFiles.map(file => this.renderTab(file)).join('')}
            </div>
        `;
        this.attachEventListeners();
    }

    private renderTab(file: FileData): string {
        const isActive = EditorStore.getActiveFile()?.id === file.id;
        const isDirty = file.isDirty;
        
        return `
            <div class="tab ${isActive ? 'active' : ''}" data-file-id="${file.id}">
                <span class="tab-name">${file.name}${isDirty ? ' •' : ''}</span>
                <button class="tab-close" data-file-id="${file.id}">×</button>
            </div>
        `;
    }

    private attachEventListeners() {
        // Tab tıklama
        this.container.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if (!target.classList.contains('tab-close')) {
                    const fileId = (tab as HTMLElement).dataset.fileId!;
                    EditorStore.setActiveFile(fileId);
                    const file = EditorStore.getFile(fileId);
                    if (file) {
                        const editor = EditorStore.getEditor();
                        if (editor) {
                            editor.setValue(file.content);
                        }
                    }
                }
            });
        });

        // Tab kapatma
        this.container.querySelectorAll('.tab-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = (btn as HTMLElement).dataset.fileId!;
                const file = EditorStore.getFile(fileId);
                if (file?.isDirty) {
                    if (confirm(`${file.name} has unsaved changes. Close anyway?`)) {
                        EditorStore.deleteFile(fileId);
                    }
                } else {
                    EditorStore.deleteFile(fileId);
                }
            });
        });
    }
}

export class StatusBar {
    private container: HTMLElement;

    constructor(containerId: string) {
        const element = document.getElementById(containerId);
        if (!element) throw new Error(`Container ${containerId} not found`);
        this.container = element;
        this.render();
        this.setupListeners();
    }

    private setupListeners() {
        EditorStore.on('activeFileChanged', () => this.render());
        EditorStore.on('fileChanged', () => this.render());
        
        const editor = EditorStore.getEditor();
        if (editor) {
            editor.onDidChangeCursorPosition(() => this.render());
        }
    }

    private render() {
        const editor = EditorStore.getEditor();
        const file = EditorStore.getActiveFile();
        const position = editor?.getPosition();
        
        this.container.innerHTML = `
            <div class="status-bar">
                <div class="status-left">
                    <span class="status-item">${file?.language || 'Luau'}</span>
                    ${file?.isDirty ? '<span class="status-item">Modified</span>' : ''}
                </div>
                <div class="status-right">
                    ${position ? `
                        <span class="status-item">Ln ${position.lineNumber}, Col ${position.column}</span>
                    ` : ''}
                    <span class="status-item">UTF-8</span>
                    <span class="status-item">LF</span>
                </div>
            </div>
        `;
    }
}

export class CommandPalette {
    private overlay: HTMLElement | null = null;
    private input: HTMLInputElement | null = null;
    private commands: Array<{name: string, action: () => void, shortcut?: string}> = [];

    constructor() {
        this.setupCommands();
        this.setupKeyboardShortcut();
    }

    private setupCommands() {
        this.commands = [
            {
                name: 'New File',
                action: () => {
                    const name = prompt('File name:', 'new-file.luau');
                    if (name) {
                        const file = EditorStore.createNewFile(name);
                        EditorStore.addFile(file);
                        EditorStore.setActiveFile(file.id);
                    }
                },
                shortcut: 'Ctrl+N'
            },
            {
                name: 'Save Project',
                action: () => EditorStore.saveProject(),
                shortcut: 'Ctrl+S'
            },
            {
                name: 'Export Project',
                action: () => {
                    const json = EditorStore.exportProject();
                    this.downloadFile('project.json', json);
                },
                shortcut: 'Ctrl+E'
            },
            {
                name: 'Format Document',
                action: () => {
                    const editor = EditorStore.getEditor();
                    if (editor) {
                        editor.getAction('editor.action.formatDocument')?.run();
                    }
                },
                shortcut: 'Shift+Alt+F'
            },
            {
                name: 'Toggle Minimap',
                action: () => {
                    const settings = EditorStore.getSettings();
                    if (settings) {
                        EditorStore.updateSettings({ minimap: !settings.minimap });
                        const editor = EditorStore.getEditor();
                        if (editor) {
                            editor.updateOptions({ minimap: { enabled: !settings.minimap } });
                        }
                    }
                }
            }
        ];
    }

    private setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+P or F1 - Command Palette
            if ((e.ctrlKey && e.shiftKey && e.key === 'P') || e.key === 'F1') {
                e.preventDefault();
                this.show();
            }
        });
    }

    show() {
        if (this.overlay) return;

        this.overlay = document.createElement('div');
        this.overlay.className = 'command-palette-overlay';
        this.overlay.innerHTML = `
            <div class="command-palette">
                <input type="text" class="command-input" placeholder="Type a command...">
                <div class="command-list"></div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        this.input = this.overlay.querySelector('.command-input') as HTMLInputElement;
        this.input.focus();

        this.input.addEventListener('input', () => this.filterCommands());
        this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
        });

        this.renderCommands();
    }

    hide() {
        if (this.overlay) {
            document.body.removeChild(this.overlay);
            this.overlay = null;
            this.input = null;
        }
    }

    private filterCommands() {
        const query = this.input?.value.toLowerCase() || '';
        const filtered = this.commands.filter(cmd => 
            cmd.name.toLowerCase().includes(query)
        );
        this.renderCommands(filtered);
    }

    private renderCommands(commands = this.commands) {
        const list = this.overlay?.querySelector('.command-list');
        if (!list) return;

        list.innerHTML = commands.map((cmd, i) => `
            <div class="command-item ${i === 0 ? 'selected' : ''}" data-index="${i}">
                <span class="command-name">${cmd.name}</span>
                ${cmd.shortcut ? `<span class="command-shortcut">${cmd.shortcut}</span>` : ''}
            </div>
        `).join('');

        list.querySelectorAll('.command-item').forEach((item, i) => {
            item.addEventListener('click', () => {
                commands[i].action();
                this.hide();
            });
        });
    }

    private handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            this.hide();
        } else if (e.key === 'Enter') {
            const selected = this.overlay?.querySelector('.command-item.selected');
            if (selected) {
                const index = parseInt((selected as HTMLElement).dataset.index || '0');
                this.commands[index].action();
                this.hide();
            }
        }
    }

    private downloadFile(filename: string, content: string) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}
