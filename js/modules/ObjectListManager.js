/**
 * ObjectListManager - Manages the object list panel
 */
class ObjectListManager {
    constructor(sceneManager, selectionManager, treeManager = null) {
        this.sceneManager = sceneManager;
        this.selectionManager = selectionManager;
        this.treeManager = treeManager;
        this.objectListPanel = null;
        this.objectListContainer = null;
        this.categories = {
            building: { name: 'Building', objects: [], expanded: false },
            highway: { name: 'Highway', objects: [], expanded: false },
            waterway: { name: 'Waterway', objects: [], expanded: false },
            green: { name: 'Green', objects: [], expanded: false },
            tree: { name: 'Tree', objects: [], expanded: false },
            ground: { name: 'Ground', objects: [], expanded: false },
            wireframe: { name: 'Wireframe', objects: [], expanded: false } // Hidden category for wireframes
        };
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize the object list manager
     */
    init() {
        this.createObjectListPanel();
        this.setupEventListeners();
        this.setupSceneChangeListeners();
        this.updateObjectList();
        this.isInitialized = true;
    }

    /**
     * Create the object list panel
     */
    createObjectListPanel() {
        // Create the main panel container
        this.objectListPanel = document.createElement('div');
        this.objectListPanel.id = 'objectListPanel';
        this.objectListPanel.className = 'object-list-panel';
        
        // Create panel header
        const header = document.createElement('div');
        header.className = 'object-list-header';
        header.innerHTML = `
            <h3>Objects in Scene</h3>
            <button id="refreshObjectList" class="refresh-btn" title="Refresh List">↻</button>
        `;
        
        // Create scrollable container
        this.objectListContainer = document.createElement('div');
        this.objectListContainer.className = 'object-list-container';
        
        // Assemble the panel
        this.objectListPanel.appendChild(header);
        this.objectListPanel.appendChild(this.objectListContainer);
        
        // Add to the page
        document.body.appendChild(this.objectListPanel);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshObjectList');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.updateObjectList();
            });
        }

        // Listen for selection changes to update the list
        window.addEventListener('selectionChanged', (event) => {
            this.updateSelectionInList();
        });

        // Listen for scene changes to update the list
        window.addEventListener('sceneChanged', () => {
            this.updateObjectList();
        });

        // Also listen on document for scene changes
        document.addEventListener('sceneChanged', () => {
            this.updateObjectList();
        });
    }

    /**
     * Setup additional scene change listeners for auto-updating the object list
     */
    setupSceneChangeListeners() {
        // Listen for specific events from different managers
        document.addEventListener('buildingAdded', () => {
            this.updateObjectList();
        });

        document.addEventListener('buildingRemoved', () => {
            this.updateObjectList();
        });

        document.addEventListener('treeAdded', () => {
            this.updateObjectList();
        });

        document.addEventListener('treeRemoved', () => {
            this.updateObjectList();
        });

        document.addEventListener('shapeAdded', () => {
            this.updateObjectList();
        });

        document.addEventListener('shapeRemoved', () => {
            this.updateObjectList();
        });

        // Listen for object deletion
        document.addEventListener('objectDeleted', () => {
            this.updateObjectList();
        });

        // Listen for object property changes
        document.addEventListener('objectPropertyChanged', () => {
            this.updateObjectList();
        });
    }

    /**
     * Update the object list with current scene objects
     */
    updateObjectList() {
        if (!this.objectListContainer) return;

        // Clear existing content
        this.objectListContainer.innerHTML = '';

        // Reset categories
        Object.keys(this.categories).forEach(key => {
            this.categories[key].objects = [];
        });

        // Get all meshes from the scene
        const scene = this.sceneManager.getScene();
        if (!scene) return;

        // Get buildings from SceneManager (to avoid duplicates)
        const buildings = this.sceneManager.getBuildings();
        const buildingMeshes = buildings.map(building => building.mesh);

        // Get trees from TreeManager
        const trees = this.treeManager ? this.treeManager.trees : [];
        const treeParents = trees.map(tree => tree.parent);

        // Get other meshes (shapes, etc.) from scene
        const otherMeshes = scene.meshes.filter(mesh => {
            // Filter out system meshes, grid, default earth, trees, buildings, and disabled meshes
            return mesh.name && 
                   mesh.isEnabled() && // Only include enabled meshes
                   !mesh.name.includes('__root__') &&
                   !mesh.name.includes('grid') &&
                   mesh.name !== 'earth' &&
                   !mesh.name.startsWith('tree_') && // Exclude tree meshes (they're handled separately)
                   !mesh.name.includes('_tree_') && // Also exclude tree mesh parts
                   !buildingMeshes.includes(mesh); // Exclude buildings (they're handled separately)
        });

        // Combine building meshes, tree parents, and other meshes (remove duplicates)
        const allMeshes = [...buildingMeshes, ...treeParents, ...otherMeshes];
        const meshes = [...new Set(allMeshes)]; // Remove duplicates using Set

        // Categorize objects and track which categories have new objects
        const categoriesWithObjects = new Set();
        meshes.forEach(mesh => {
            const category = this.getObjectCategory(mesh);
            if (this.categories[category]) {
                this.categories[category].objects.push(mesh);
                categoriesWithObjects.add(category);
            }
        });

        // Auto-expand categories that have objects
        categoriesWithObjects.forEach(categoryKey => {
            this.categories[categoryKey].expanded = true;
        });

        // Create category sections in specific order (exclude wireframe category from display)
        const categoryOrder = ['building', 'highway', 'waterway', 'green', 'tree', 'ground'];
        categoryOrder.forEach(categoryKey => {
            const category = this.categories[categoryKey];
            // Always show category sections, even if empty
            this.createCategorySection(categoryKey, category);
        });

        // Update selection highlighting
        this.updateSelectionInList();
    }

    /**
     * Get the category for an object based on its properties
     */
    getObjectCategory(mesh) {
        // First check userData.type (highest priority)
        if (mesh.userData && mesh.userData.type) {
            const type = mesh.userData.type.toLowerCase();
            if (this.categories[type]) {
                return type;
            }
        }

        // Check if mesh has a category property
        if (mesh.metadata && mesh.metadata.category) {
            const category = mesh.metadata.category.toLowerCase();
            if (this.categories[category]) {
                return category;
            }
        }

        // Check mesh name for category hints
        const name = mesh.name.toLowerCase();
        
        // Check for wireframes first
        if (name.includes('_edge_wireframe') || name.includes('_wireframe')) {
            return 'wireframe';
        }
        
        if (name === 'earth') {
            return 'ground';
        }
        
        if (name.includes('building') || name.includes('house') || name.includes('structure')) {
            return 'building';
        }
        
        // Check for trees - this should come before green to prioritize tree category
        if (name.includes('tree_') || name.includes('_tree_')) {
            return 'tree';
        }
        
        if (name.includes('tree') || name.includes('plant') || name.includes('vegetation')) {
            return 'green';
        }
        
        if (name.includes('road') || name.includes('street') || name.includes('highway') || name.includes('path')) {
            return 'highway';
        }
        
        if (name.includes('water') || name.includes('river') || name.includes('lake') || name.includes('pond')) {
            return 'waterway';
        }

        // Default to ground for unknown objects
        return 'ground';
    }

    /**
     * Create a category section in the object list
     */
    createCategorySection(categoryKey, category) {
        const section = document.createElement('div');
        section.className = 'object-category';
        section.dataset.category = categoryKey;

        // Category header
        const header = document.createElement('div');
        header.className = 'category-header';
        header.innerHTML = `
            <div class="category-info" style="display: flex; align-items: center; flex: 1;">
                <span class="category-name">${category.name}</span>
                <span class="category-count">(${category.objects.length})</span>
            </div>
            <div class="category-actions" style="display: flex; align-items: center; gap: 10px;">
                <span class="category-select" title="Select all objects in this category" style="cursor: pointer; padding: 2px 6px; background: #007acc; color: white; border-radius: 3px; font-size: 12px;">Select All</span>
                <span class="category-toggle">${category.expanded ? '▼' : '▶'}</span>
            </div>
        `;

        // Category content
        const content = document.createElement('div');
        content.className = 'category-content';
        content.style.display = category.expanded ? 'block' : 'none';

        // Add objects to category or empty message
        if (category.objects.length > 0) {
            category.objects.forEach(mesh => {
                const objectItem = this.createObjectItem(mesh);
                content.appendChild(objectItem);
            });
        } else {
            // Add empty message for categories with no objects
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'object-list-empty';
            emptyMessage.textContent = 'No objects in this category';
            content.appendChild(emptyMessage);
        }

        // Toggle functionality (only for toggle button)
        const toggleButton = header.querySelector('.category-toggle');
        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            category.expanded = !category.expanded;
            content.style.display = category.expanded ? 'block' : 'none';
            toggleButton.textContent = category.expanded ? '▼' : '▶';
        });

        // Select all functionality (only for select button)
        const selectButton = header.querySelector('.category-select');
        selectButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectAllObjectsInCategory(categoryKey, category);
        });

        section.appendChild(header);
        section.appendChild(content);
        this.objectListContainer.appendChild(section);
    }

    /**
     * Select all objects in a category
     */
    selectAllObjectsInCategory(categoryKey, category) {
        if (!this.selectionManager || category.objects.length === 0) {
            return;
        }

        // Clear current selection first
        this.selectionManager.clearSelection();

        // Select all objects in the category using multi-select mode
        category.objects.forEach((mesh, index) => {
            // For the first object, don't use multi-select (it will clear selection)
            // For subsequent objects, use multi-select to add to selection
            const isMultiSelect = index > 0;
            this.selectionManager.selectObject(mesh, isMultiSelect);
        });

        // Update selection highlighting in the list
        this.updateSelectionInList();

        console.log(`Selected ${category.objects.length} objects in category: ${category.name}`);
    }

    /**
     * Create an object item in the list
     */
    createObjectItem(mesh) {
        const item = document.createElement('div');
        item.className = 'object-item';
        item.dataset.meshId = mesh.id;
        item.dataset.meshName = mesh.name;

        // Object icon based on type
        const icon = this.getObjectIcon(mesh);
        
        // Object name and info
        const name = document.createElement('span');
        name.className = 'object-name';
        name.textContent = mesh.name || `Object ${mesh.id}`;

        // Object type indicator
        const type = document.createElement('span');
        type.className = 'object-type';
        type.textContent = this.getObjectType(mesh);

        item.innerHTML = `
            <span class="object-icon">${icon}</span>
            <span class="object-info">
                <span class="object-name">${mesh.name || `Object ${mesh.id}`}</span>
                <span class="object-type">${this.getObjectType(mesh)}</span>
            </span>
        `;

        // Click handler for selection
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectObject(mesh);
        });

        return item;
    }

    /**
     * Get icon for object type
     */
    getObjectIcon(mesh) {
        const category = this.getObjectCategory(mesh);
        
        switch (category) {
            case 'building':
                return '🏢';
            case 'highway':
                return '🛣️';
            case 'waterway':
                return '💧';
            case 'green':
                return '🌿';
            case 'tree':
                return '🌳';
            case 'ground':
                return '🏞️';
            case 'wireframe':
                return '🔲';
            default:
                return '🏞️'; // Default to ground icon
        }
    }

    /**
     * Get object type description
     */
    getObjectType(mesh) {
        const category = this.getObjectCategory(mesh);
        
        switch (category) {
            case 'building':
                return 'Building';
            case 'highway':
                return 'Road';
            case 'waterway':
                return 'Water';
            case 'green':
                return 'Vegetation';
            case 'tree':
                return 'Tree';
            case 'ground':
                return 'Ground';
            case 'wireframe':
                return 'Wireframe';
            default:
                return 'Ground'; // Default to ground type
        }
    }

    /**
     * Select an object from the list
     */
    selectObject(mesh) {
        // Don't allow selection of wireframes
        if (this.getObjectCategory(mesh) === 'wireframe') {
            console.log('Wireframes are not selectable');
            return;
        }
        
        // Clear current selection
        this.selectionManager.clearSelection();
        
        // Select the clicked object
        this.selectionManager.selectObject(mesh);
        
        // Update list highlighting
        this.updateSelectionInList();
    }

    /**
     * Update selection highlighting in the list
     */
    updateSelectionInList() {
        // Remove all selection highlighting
        const items = this.objectListContainer.querySelectorAll('.object-item');
        items.forEach(item => {
            item.classList.remove('selected');
        });

        // Highlight selected objects
        const selectedObjects = this.selectionManager.getSelectedObjects();
        selectedObjects.forEach(mesh => {
            const item = this.objectListContainer.querySelector(`[data-mesh-id="${mesh.id}"]`);
            if (item) {
                item.classList.add('selected');
            }
        });
    }

    /**
     * Show/hide the object list panel
     */
    toggleVisibility() {
        if (this.objectListPanel) {
            this.objectListPanel.classList.toggle('hidden');
        }
    }

    /**
     * Show the object list panel
     */
    show() {
        if (this.objectListPanel) {
            this.objectListPanel.classList.remove('hidden');
        }
    }

    /**
     * Hide the object list panel
     */
    hide() {
        if (this.objectListPanel) {
            this.objectListPanel.classList.add('hidden');
        }
    }

    /**
     * Get object list statistics
     */
    getStats() {
        const stats = {
            totalObjects: 0,
            categories: {}
        };

        Object.keys(this.categories).forEach(key => {
            const count = this.categories[key].objects.length;
            stats.categories[key] = count;
            stats.totalObjects += count;
        });

        return stats;
    }

    /**
     * Dispose of the object list manager
     */
    dispose() {
        if (this.objectListPanel && this.objectListPanel.parentNode) {
            this.objectListPanel.parentNode.removeChild(this.objectListPanel);
        }
        this.objectListPanel = null;
        this.objectListContainer = null;
    }
}
