/**
 * EditorStore - Merkezi state yönetimi
 * Tüm editör durumunu, dosyaları ve ayarları yönetir
 */

import * as monaco from "monaco-editor";

export interface FileData {
    id: string;
    name: string;
    path: string;
    content: string;
    language: string;
    isDirty: boolean;
    lastModified: number;
    readOnly?: boolean;
}

export interface ProjectData {
    id: string;
    name: string;
    files: FileData[];
    activeFileId: string | null;
    settings: ProjectSettings;
    createdAt: number;
    lastModified: number;
}

export interface ProjectSettings {
    tabSize: number;
    insertSpaces: boolean;
    theme: string;
    fontSize: number;
    fontFamily: string;
    minimap: boolean;
    lineNumbers: boolean;
    wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
}

class EditorStore {
    private static instance: EditorStore;
    private currentProject: ProjectData | null = null;
    private editor: monaco.editor.IStandaloneCodeEditor | null = null;
    private listeners: Map<string, Function[]> = new Map();

    private constructor() {
        this.loadFromStorage();
    }

    static getInstance(): EditorStore {
        if (!EditorStore.instance) {
            EditorStore.instance = new EditorStore();
        }
        return EditorStore.instance;
    }

    // Editor referansını kaydet
    setEditor(editor: monaco.editor.IStandaloneCodeEditor) {
        this.editor = editor;
    }

    getEditor(): monaco.editor.IStandaloneCodeEditor | null {
        return this.editor;
    }

    // Event system
    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    emit(event: string, data?: any) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(cb => cb(data));
        }
    }

    // Project operations
    createNewProject(name: string = "Untitled Project"): ProjectData {
        const project: ProjectData = {
            id: this.generateId(),
            name,
            files: [this.createNewFile("main.luau", "-- Welcome to MonaLuau\nprint('Hello, World!')")],
            activeFileId: null,
            settings: this.getDefaultSettings(),
            createdAt: Date.now(),
            lastModified: Date.now()
        };
        
        project.activeFileId = project.files[0].id;
        this.currentProject = project;
        this.saveToStorage();
        this.emit('projectChanged', project);
        return project;
    }

    getCurrentProject(): ProjectData | null {
        return this.currentProject;
    }

    loadProject(projectId: string): boolean {
        const projects = this.getAllProjects();
        const project = projects.find(p => p.id === projectId);
        if (project) {
            this.currentProject = project;
            this.emit('projectChanged', project);
            return true;
        }
        return false;
    }

    saveProject() {
        if (this.currentProject) {
            this.currentProject.lastModified = Date.now();
            this.saveToStorage();
            this.emit('projectSaved', this.currentProject);
        }
    }

    // File operations
    createNewFile(name: string, content: string = ""): FileData {
        const file: FileData = {
            id: this.generateId(),
            name,
            path: name,
            content,
            language: this.detectLanguage(name),
            isDirty: false,
            lastModified: Date.now()
        };
        return file;
    }

    addFile(file: FileData) {
        if (!this.currentProject) {
            this.createNewProject();
        }
        this.currentProject!.files.push(file);
        this.currentProject!.lastModified = Date.now();
        this.saveToStorage();
        this.emit('fileAdded', file);
    }

    getFile(fileId: string): FileData | undefined {
        return this.currentProject?.files.find(f => f.id === fileId);
    }

    updateFileContent(fileId: string, content: string) {
        const file = this.getFile(fileId);
        if (file) {
            file.content = content;
            file.isDirty = true;
            file.lastModified = Date.now();
            this.emit('fileChanged', file);
        }
    }

    setActiveFile(fileId: string) {
        if (this.currentProject) {
            this.currentProject.activeFileId = fileId;
            this.emit('activeFileChanged', fileId);
        }
    }

    getActiveFile(): FileData | null {
        if (!this.currentProject?.activeFileId) return null;
        return this.getFile(this.currentProject.activeFileId) || null;
    }

    deleteFile(fileId: string) {
        if (!this.currentProject) return;
        
        const index = this.currentProject.files.findIndex(f => f.id === fileId);
        if (index !== -1) {
            const deletedFile = this.currentProject.files.splice(index, 1)[0];
            
            // Eğer aktif dosya silindiyse, başka bir dosyayı aktif yap
            if (this.currentProject.activeFileId === fileId) {
                if (this.currentProject.files.length > 0) {
                    this.currentProject.activeFileId = this.currentProject.files[0].id;
                } else {
                    this.currentProject.activeFileId = null;
                }
            }
            
            this.saveToStorage();
            this.emit('fileDeleted', deletedFile);
        }
    }

    renameFile(fileId: string, newName: string) {
        const file = this.getFile(fileId);
        if (file) {
            file.name = newName;
            file.path = newName;
            file.language = this.detectLanguage(newName);
            this.saveToStorage();
            this.emit('fileRenamed', file);
        }
    }

    // Settings
    updateSettings(settings: Partial<ProjectSettings>) {
        if (this.currentProject) {
            Object.assign(this.currentProject.settings, settings);
            this.saveToStorage();
            this.emit('settingsChanged', this.currentProject.settings);
        }
    }

    getSettings(): ProjectSettings | null {
        return this.currentProject?.settings || null;
    }

    private getDefaultSettings(): ProjectSettings {
        return {
            tabSize: 4,
            insertSpaces: false,
            theme: 'krnlDark',
            fontSize: 14,
            fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
            minimap: true,
            lineNumbers: true,
            wordWrap: 'off'
        };
    }

    // Storage operations
    private saveToStorage() {
        try {
            if (this.currentProject) {
                // Mevcut projeyi kaydet
                const projects = this.getAllProjects();
                const index = projects.findIndex(p => p.id === this.currentProject!.id);
                
                if (index !== -1) {
                    projects[index] = this.currentProject;
                } else {
                    projects.push(this.currentProject);
                }
                
                localStorage.setItem('monaluau_projects', JSON.stringify(projects));
                localStorage.setItem('monaluau_current_project', this.currentProject.id);
            }
        } catch (err) {
            console.error('Failed to save to storage:', err);
        }
    }

    private loadFromStorage() {
        try {
            const currentProjectId = localStorage.getItem('monaluau_current_project');
            if (currentProjectId) {
                this.loadProject(currentProjectId);
            }
        } catch (err) {
            console.error('Failed to load from storage:', err);
        }
    }

    getAllProjects(): ProjectData[] {
        try {
            const data = localStorage.getItem('monaluau_projects');
            return data ? JSON.parse(data) : [];
        } catch (err) {
            console.error('Failed to get projects:', err);
            return [];
        }
    }

    // Utility functions
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private detectLanguage(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();
        const languageMap: Record<string, string> = {
            'lua': 'luau',
            'luau': 'luau',
            'rbxs': 'luau',
            'rbxm': 'luau',
            'js': 'javascript',
            'ts': 'typescript',
            'json': 'json',
            'txt': 'plaintext',
            'md': 'markdown'
        };
        return languageMap[ext || 'lua'] || 'luau';
    }

    // Export/Import
    exportProject(): string {
        if (!this.currentProject) throw new Error('No active project');
        return JSON.stringify(this.currentProject, null, 2);
    }

    importProject(jsonData: string): boolean {
        try {
            const project = JSON.parse(jsonData) as ProjectData;
            project.id = this.generateId(); // Yeni ID ver
            this.currentProject = project;
            this.saveToStorage();
            this.emit('projectChanged', project);
            return true;
        } catch (err) {
            console.error('Failed to import project:', err);
            return false;
        }
    }

    // Clear all
    clearAllProjects() {
        localStorage.removeItem('monaluau_projects');
        localStorage.removeItem('monaluau_current_project');
        this.currentProject = null;
        this.emit('projectsCleared');
    }
}

export default EditorStore.getInstance();
