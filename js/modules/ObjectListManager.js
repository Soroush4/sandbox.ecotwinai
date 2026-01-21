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
            building: { name: 'Building', objects: [], expanded: false, visible: true },
            highway: { name: 'Highway', objects: [], expanded: false, visible: true },
            waterway: { name: 'Waterway', objects: [], expanded: false, visible: true },
            grass: { name: 'Grass', objects: [], expanded: false, visible: true },
            tree: { name: 'Tree', objects: [], expanded: false, visible: true },
            ground: { name: 'Ground', objects: [], expanded: false, visible: true },
            wireframe: { name: 'Wireframe', objects: [], expanded: false, visible: true } // Hidden category for wireframes
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
            <button id="closeObjectList" class="close-btn" title="Close">×</button>
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
        // Close button
        const closeBtn = document.getElementById('closeObjectList');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
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
        if (!this.objectListContainer) {
            return;
        }

        // Clear existing content
        this.objectListContainer.innerHTML = '';

        // Reset categories (preserve visibility state)
        Object.keys(this.categories).forEach(key => {
            const wasVisible = this.categories[key].visible !== false; // Preserve visibility state
            this.categories[key].objects = [];
            this.categories[key].visible = wasVisible; // Restore visibility state
        });

        // Get all meshes from the scene
        const scene = this.sceneManager.getScene();
        if (!scene) return;

        // Get buildings from SceneManager (to avoid duplicates)
        const buildings = this.sceneManager.getBuildings();
        const buildingMeshes = buildings
            .map(building => building.mesh)
            .filter(mesh => mesh && !mesh.isDisposed());

        // Get trees from TreeManager
        // Filter out trees that have been disposed or have no valid parent
        const trees = this.treeManager ? this.treeManager.trees : [];
        const treeParents = trees
            .filter(tree => tree && tree.parent && !tree.parent.isDisposed())
            .map(tree => tree.parent)
            .filter(parent => parent && !parent.isDisposed());

        // Get other meshes (shapes, etc.) from scene
        const otherMeshes = scene.meshes.filter(mesh => {
            // Filter out system meshes, grid, default earth, trees, buildings, disabled meshes, and disposed meshes
            if (!mesh || !mesh.name || !mesh.isEnabled() || mesh.isDisposed()) return false;
            
            // Exclude system meshes and helper meshes
            if (mesh.name.includes('__root__') || 
                mesh.name.includes('grid') || 
                mesh.name === 'earth' ||
                mesh.name === 'multiObjectCenter' ||
                mesh.name === 'singleObjectCenter') {
                return false;
            }
            
            // IMPORTANT: For polygon extrusions (buildings), include them in the list
            // Extrusions that are independent (not parented) should be shown
            // Only exclude extrusions that are children of visible polygons
            if (mesh.name.includes('_extrusion')) {
                // Check if this extrusion has a parent polygon
                const hasParentPolygon = mesh.parent && 
                                       mesh.parent.userData && 
                                       mesh.parent.userData.shapeType === 'polygon';
                
                // If parent polygon is visible and enabled, exclude extrusion (show parent instead)
                // If parent polygon is hidden (building type), include extrusion (it's the visible object)
                if (hasParentPolygon && mesh.parent.isVisible && mesh.parent.isEnabled()) {
                    return false; // Exclude extrusion, show parent polygon instead
                }
                // Otherwise, include extrusion (it's the visible object when polygon is hidden)
                // This allows building extrusions to appear in the object list
            }
            
            // Exclude meshes that are children of other meshes (unless they're extrusions handled above)
            if (mesh.parent && mesh.parent !== null && !mesh.parent.name.includes('__root__')) {
                // Only exclude if parent is a visible polygon (extrusion is child of visible polygon)
                if (mesh.parent.userData && mesh.parent.userData.shapeType === 'polygon' && 
                    mesh.parent.isVisible && mesh.parent.isEnabled()) {
                    return false;
                }
            }
            
            // Exclude buildings (they're handled separately)
            if (buildingMeshes.includes(mesh)) {
                return false;
            }
            
            // Exclude regular tree meshes (they're handled separately via TreeManager)
            // BUT include imported STL trees (they're simple meshes, not in TreeManager)
            const isImportedSTLTree = mesh.userData && 
                                      mesh.userData.isImportedSTL && 
                                      mesh.userData.type === 'tree';
            
            if (isImportedSTLTree) {
                // Include imported STL trees (only if not disposed)
                return !mesh.isDisposed();
            }
            
            // Exclude regular tree meshes (from TreeManager)
            // Check both old format (tree_1) and new format (tree1)
            if (mesh.name.startsWith('tree_') || 
                mesh.name.includes('_tree_') ||
                (mesh.name.startsWith('tree') && /^\d+$/.test(mesh.name.substring(4)))) {
                return false;
            }
            
            return true;
        });

        // Combine building meshes, tree parents, and other meshes (remove duplicates)
        const allMeshes = [...buildingMeshes, ...treeParents, ...otherMeshes];
        // Remove duplicates and filter out disposed meshes
        const meshes = [...new Set(allMeshes)].filter(mesh => 
            mesh && !mesh.isDisposed()
        );

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
        const categoryOrder = ['building', 'highway', 'waterway', 'grass', 'tree', 'ground'];
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
                console.log(`[OBJECT_LIST] Categorizing "${mesh.name}" as "${type}" based on userData.type`);
                return type;
            } else {
                console.warn(`[OBJECT_LIST] Type "${type}" not found in categories for "${mesh.name}", falling back to name-based categorization`);
            }
        }

        // Check if mesh has a category property
        if (mesh.metadata && mesh.metadata.category) {
            const category = mesh.metadata.category.toLowerCase();
            if (this.categories[category]) {
                return category;
            }
        }

        // Check if this is a TransformNode that's a tree parent
        // This should be checked early, before name-based checks
        if (mesh instanceof BABYLON.TransformNode) {
            const nodeName = mesh.name.toLowerCase();
            // Check for new naming convention: tree1, tree2, tree3, ...
            if (/^tree\d+$/.test(nodeName)) {
                return 'tree';
            }
            // Check for old naming conventions: tree_1, _tree_1, etc.
            if (nodeName.includes('tree_') || nodeName.includes('_tree_')) {
                return 'tree';
            }
            // Also check TreeManager to see if this TransformNode is a tree parent
            if (this.treeManager && this.treeManager.trees) {
                const treeData = this.treeManager.trees.find(t => t.parent === mesh);
                if (treeData) {
                    return 'tree';
                }
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
        
        // Check for trees - this should come before grass to prioritize tree category
        // Check for new naming convention: tree1, tree2, tree3, ... (starts with "tree" followed by digits)
        if (/^tree\d+$/.test(name)) {
            return 'tree';
        }
        // Check for old naming conventions: tree_1, _tree_1, etc.
        if (name.includes('tree_') || name.includes('_tree_')) {
            return 'tree';
        }
        
        // Only check for "tree" in name if it's not already identified as a tree
        // This prevents trees from being categorized as grass
        if (name.includes('plant') || name.includes('vegetation')) {
            return 'grass';
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
        const visibilityIcon = category.visible !== false ? '👁️' : '🚫';
        const visibilityTitle = category.visible !== false ? 'Hide all objects in this category' : 'Show all objects in this category';
        header.innerHTML = `
            <div class="category-info" style="display: flex; align-items: center; flex: 1;">
                <span class="category-name">${category.name}</span>
                <span class="category-count">(${category.objects.length})</span>
            </div>
            <div class="category-actions" style="display: flex; align-items: center; gap: 10px;">
                <span class="category-visibility" title="${visibilityTitle}" style="cursor: pointer; padding: 2px 6px; background: ${category.visible !== false ? '#28a745' : '#dc3545'}; color: white; border-radius: 3px; font-size: 12px; user-select: none;">${visibilityIcon}</span>
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

        // Visibility toggle functionality
        const visibilityButton = header.querySelector('.category-visibility');
        visibilityButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleCategoryVisibility(categoryKey, category, visibilityButton);
        });

        // Apply initial visibility state
        this.applyCategoryVisibility(categoryKey, category);

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
     * Toggle visibility of all objects in a category
     */
    toggleCategoryVisibility(categoryKey, category, visibilityButton) {
        // Toggle visibility state
        category.visible = !category.visible;
        
        // Apply visibility to all objects in the category
        this.applyCategoryVisibility(categoryKey, category);
        
        // Update button appearance
        if (visibilityButton) {
            visibilityButton.textContent = category.visible ? '👁️' : '🚫';
            visibilityButton.style.background = category.visible ? '#28a745' : '#dc3545';
            visibilityButton.title = category.visible ? 'Hide all objects in this category' : 'Show all objects in this category';
        }
        
        // Update individual object visibility buttons in the list
        this.updateObjectVisibilityButtons(categoryKey, category);
        
        console.log(`${category.visible ? 'Showed' : 'Hid'} all objects in category: ${category.name}`);
    }

    /**
     * Apply visibility state to all objects in a category
     */
    applyCategoryVisibility(categoryKey, category) {
        const isVisible = category.visible !== false;
        
        category.objects.forEach(mesh => {
            if (!mesh || mesh.isDisposed()) return;
            
            // For TransformNodes (like trees), we need to handle children
            if (mesh instanceof BABYLON.TransformNode && !(mesh instanceof BABYLON.Mesh)) {
                // Hide/show all children of the TransformNode
                mesh.getChildMeshes().forEach(child => {
                    if (child && !child.isDisposed()) {
                        child.isVisible = isVisible;
                        child.setEnabled(isVisible);
                        // IMPORTANT: Make invisible objects non-pickable
                        child.isPickable = isVisible;
                    }
                });
                // Also hide/show the TransformNode itself
                mesh.setEnabled(isVisible);
            } else if (mesh instanceof BABYLON.Mesh) {
                // Regular mesh - hide/show the mesh itself
                mesh.isVisible = isVisible;
                mesh.setEnabled(isVisible);
                // IMPORTANT: Make invisible objects non-pickable
                mesh.isPickable = isVisible;
                
                // Also handle child meshes if any (for complex objects)
                const childMeshes = mesh.getChildMeshes();
                if (childMeshes && childMeshes.length > 0) {
                    childMeshes.forEach(child => {
                        if (child && !child.isDisposed()) {
                            child.isVisible = isVisible;
                            child.setEnabled(isVisible);
                            // IMPORTANT: Make invisible objects non-pickable
                            child.isPickable = isVisible;
                        }
                    });
                }
            }
        });
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
        
        // IMPORTANT: For extrusions (buildings converted from polygons), 
        // display the base polygon name without "_extrusion" suffix
        let displayName = mesh.name || `Object ${mesh.id}`;
        if (mesh.name && mesh.name.includes('_extrusion')) {
            // Remove "_extrusion" suffix to show the original polygon name
            displayName = mesh.name.replace('_extrusion', '');
        }
        
        // Object name and info
        const name = document.createElement('span');
        name.className = 'object-name';
        name.textContent = displayName;

        // Object type indicator
        const type = document.createElement('span');
        type.className = 'object-type';
        type.textContent = this.getObjectType(mesh);

        // Check initial visibility state
        const isVisible = this.isObjectVisible(mesh);
        const visibilityIcon = isVisible ? '👁️' : '🚫';
        const visibilityTitle = isVisible ? 'Hide this object' : 'Show this object';

        item.innerHTML = `
            <span class="object-icon">${icon}</span>
            <span class="object-info">
                <span class="object-name">${displayName}</span>
                <span class="object-type">${this.getObjectType(mesh)}</span>
            </span>
            <span class="object-visibility" title="${visibilityTitle}" style="cursor: pointer; padding: 2px 6px; background: ${isVisible ? '#28a745' : '#dc3545'}; color: white; border-radius: 3px; font-size: 12px; user-select: none; margin-left: auto;">${visibilityIcon}</span>
        `;

        // Visibility toggle handler
        const visibilityButton = item.querySelector('.object-visibility');
        visibilityButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleObjectVisibility(mesh, visibilityButton);
        });

        // Click handler for selection (on the item, but not on visibility button)
        item.addEventListener('click', (e) => {
            // Don't select if clicking on visibility button
            if (e.target.classList.contains('object-visibility') || e.target.closest('.object-visibility')) {
                return;
            }
            e.stopPropagation();
            // Check if Ctrl key is pressed for multi-select
            const isMultiSelect = e.ctrlKey || e.metaKey; // Support both Ctrl (Windows/Linux) and Cmd (Mac)
            this.selectObject(mesh, isMultiSelect);
        });

        // Double-click handler for zoom to extent
        item.addEventListener('dblclick', (e) => {
            // Don't zoom if double-clicking on visibility button
            if (e.target.classList.contains('object-visibility') || e.target.closest('.object-visibility')) {
                return;
            }
            e.stopPropagation();
            e.preventDefault();
            // First select the object
            this.selectObject(mesh);
            // Then zoom to mesh extent (same as zoom extend)
            if (this.selectionManager && this.selectionManager.zoomToMeshExtent) {
                this.selectionManager.zoomToMeshExtent(mesh);
            }
        });

        return item;
    }

    /**
     * Check if an object is currently visible
     */
    isObjectVisible(mesh) {
        if (!mesh || mesh.isDisposed()) return false;
        
        // For TransformNodes (like trees), check children
        if (mesh instanceof BABYLON.TransformNode && !(mesh instanceof BABYLON.Mesh)) {
            const childMeshes = mesh.getChildMeshes();
            if (childMeshes && childMeshes.length > 0) {
                // Check if at least one child is visible
                return childMeshes.some(child => child && !child.isDisposed() && child.isVisible);
            }
            return mesh.isEnabled();
        } else if (mesh instanceof BABYLON.Mesh) {
            return mesh.isVisible && mesh.isEnabled();
        }
        
        return false;
    }

    /**
     * Toggle visibility of a single object
     */
    toggleObjectVisibility(mesh, visibilityButton) {
        if (!mesh || mesh.isDisposed()) return;
        
        // Determine current visibility state
        const currentlyVisible = this.isObjectVisible(mesh);
        const newVisibility = !currentlyVisible;
        
        // Apply visibility to the object
        this.applyObjectVisibility(mesh, newVisibility);
        
        // Update button appearance
        if (visibilityButton) {
            visibilityButton.textContent = newVisibility ? '👁️' : '🚫';
            visibilityButton.style.background = newVisibility ? '#28a745' : '#dc3545';
            visibilityButton.title = newVisibility ? 'Hide this object' : 'Show this object';
        }
        
        // Update category visibility button if needed
        const categoryKey = this.getObjectCategory(mesh);
        const category = this.categories[categoryKey];
        if (category) {
            this.updateCategoryVisibilityButton(categoryKey, category);
        }
        
        console.log(`${newVisibility ? 'Showed' : 'Hid'} object: ${mesh.name}`);
    }

    /**
     * Update all object visibility buttons in a category
     */
    updateObjectVisibilityButtons(categoryKey, category) {
        if (!this.objectListContainer) return;
        
        category.objects.forEach(mesh => {
            if (!mesh || mesh.isDisposed()) return;
            
            const item = this.objectListContainer.querySelector(`[data-mesh-id="${mesh.id}"]`);
            if (item) {
                const visibilityButton = item.querySelector('.object-visibility');
                if (visibilityButton) {
                    const isVisible = this.isObjectVisible(mesh);
                    visibilityButton.textContent = isVisible ? '👁️' : '🚫';
                    visibilityButton.style.background = isVisible ? '#28a745' : '#dc3545';
                    visibilityButton.title = isVisible ? 'Hide this object' : 'Show this object';
                }
            }
        });
    }

    /**
     * Update category visibility button based on current object visibility states
     */
    updateCategoryVisibilityButton(categoryKey, category) {
        if (!this.objectListContainer || category.objects.length === 0) return;
        
        // Check if all objects are visible, all hidden, or mixed
        let visibleCount = 0;
        category.objects.forEach(mesh => {
            if (this.isObjectVisible(mesh)) {
                visibleCount++;
            }
        });
        
        // If all visible, category is visible
        // If all hidden, category is hidden
        // If mixed, keep current state (or set to visible if we want to show all)
        const allVisible = visibleCount === category.objects.length;
        const allHidden = visibleCount === 0;
        
        if (allVisible) {
            category.visible = true;
        } else if (allHidden) {
            category.visible = false;
        }
        // If mixed, we don't change category.visible (keep current state)
        
        // Update category visibility button
        const categorySection = this.objectListContainer.querySelector(`[data-category="${categoryKey}"]`);
        if (categorySection) {
            const categoryVisibilityButton = categorySection.querySelector('.category-visibility');
            if (categoryVisibilityButton) {
                categoryVisibilityButton.textContent = category.visible ? '👁️' : '🚫';
                categoryVisibilityButton.style.background = category.visible ? '#28a745' : '#dc3545';
                categoryVisibilityButton.title = category.visible ? 'Hide all objects in this category' : 'Show all objects in this category';
            }
        }
    }

    /**
     * Apply visibility state to a single object
     */
    applyObjectVisibility(mesh, isVisible) {
        if (!mesh || mesh.isDisposed()) return;
        
        // For TransformNodes (like trees), handle children
        if (mesh instanceof BABYLON.TransformNode && !(mesh instanceof BABYLON.Mesh)) {
            // Hide/show all children of the TransformNode
            mesh.getChildMeshes().forEach(child => {
                if (child && !child.isDisposed()) {
                    child.isVisible = isVisible;
                    child.setEnabled(isVisible);
                    // IMPORTANT: Make invisible objects non-pickable
                    child.isPickable = isVisible;
                }
            });
            // Also hide/show the TransformNode itself
            mesh.setEnabled(isVisible);
        } else if (mesh instanceof BABYLON.Mesh) {
            // Regular mesh - hide/show the mesh itself
            mesh.isVisible = isVisible;
            mesh.setEnabled(isVisible);
            // IMPORTANT: Make invisible objects non-pickable
            mesh.isPickable = isVisible;
            
            // Also handle child meshes if any (for complex objects)
            const childMeshes = mesh.getChildMeshes();
            if (childMeshes && childMeshes.length > 0) {
                childMeshes.forEach(child => {
                    if (child && !child.isDisposed()) {
                        child.isVisible = isVisible;
                        child.setEnabled(isVisible);
                        // IMPORTANT: Make invisible objects non-pickable
                        child.isPickable = isVisible;
                    }
                });
            }
        }
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
            case 'grass':
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
            case 'grass':
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
     * @param {BABYLON.Mesh|BABYLON.TransformNode} mesh - The mesh to select
     * @param {boolean} isMultiSelect - If true, add to selection instead of replacing it
     */
    selectObject(mesh, isMultiSelect = false) {
        // Don't allow selection of wireframes
        if (this.getObjectCategory(mesh) === 'wireframe') {
            console.log('Wireframes are not selectable');
            return;
        }
        
        // IMPORTANT: Don't allow selection of invisible objects
        // They should remain invisible and cannot be selected
        if (!this.isObjectVisible(mesh)) {
            console.log(`Cannot select invisible object: ${mesh.name}. Use the visibility button to show it first.`);
            return;
        }
        
        // If not multi-select, clear current selection first
        if (!isMultiSelect) {
            this.selectionManager.clearSelection();
        }
        
        // Select the clicked object (with multi-select flag)
        this.selectionManager.selectObject(mesh, isMultiSelect);
        
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
     * Scroll to and highlight an object in the list
     * @param {BABYLON.Mesh|BABYLON.TransformNode} mesh - The mesh to scroll to
     */
    scrollToObjectInList(mesh) {
        if (!mesh || !this.objectListContainer) return;
        
        // For trees (TransformNode), the list shows the TransformNode (parent) itself, not child meshes
        // So we should search for the TransformNode directly in the list
        let targetMesh = mesh;
        
        // If it's a TransformNode (like trees), use it directly
        // Trees are added to the list as TransformNode (parent), not as child meshes
        if (mesh instanceof BABYLON.TransformNode) {
            targetMesh = mesh; // Use the TransformNode itself
        }
        
        // Find the item in the list by ID (for both Mesh and TransformNode)
        let item = this.objectListContainer.querySelector(`[data-mesh-id="${targetMesh.id}"]`);
        
        // If not found by ID, try to find by name
        if (!item && targetMesh.name) {
            item = this.objectListContainer.querySelector(`[data-mesh-name="${targetMesh.name}"]`);
        }
        
        // If still not found and it's a TransformNode, try to find by checking all items
        // (sometimes the ID might not match exactly)
        if (!item && targetMesh instanceof BABYLON.TransformNode) {
            const allItems = this.objectListContainer.querySelectorAll('.object-item');
            for (const listItem of allItems) {
                const itemMeshId = parseInt(listItem.dataset.meshId);
                const itemMeshName = listItem.dataset.meshName;
                
                // Check if this item matches the TransformNode
                if (itemMeshId === targetMesh.id || itemMeshName === targetMesh.name) {
                    item = listItem;
                    break;
                }
            }
        }
        
        if (item) {
            // Scroll to the item
            this.scrollToItem(item);
        } else {
            console.warn(`Object ${mesh.name || targetMesh.name} (ID: ${mesh.id || targetMesh.id}) not found in object list`);
        }
    }
    
    /**
     * Scroll to a specific item in the list and highlight it
     * @param {HTMLElement} item - The item element to scroll to
     */
    scrollToItem(item) {
        if (!item || !this.objectListContainer) return;
        
        // Ensure the category is expanded
        const categorySection = item.closest('.category-section');
        if (categorySection) {
            const categoryHeader = categorySection.querySelector('.category-header');
            if (categoryHeader) {
                const categoryContent = categorySection.querySelector('.category-content');
                if (categoryContent && categoryContent.style.display === 'none') {
                    // Expand the category
                    categoryContent.style.display = 'block';
                    categoryHeader.classList.add('expanded');
                }
            }
        }
        
        // Scroll to the item
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight the item temporarily
        item.classList.add('selected');
        
        // Remove highlight after a short delay (optional, to show it was scrolled to)
        setTimeout(() => {
            // Keep it selected if it's actually selected
            const selectedObjects = this.selectionManager.getSelectedObjects();
            const isActuallySelected = selectedObjects.some(obj => {
                return (obj.id === parseInt(item.dataset.meshId)) || 
                       (obj.name === item.dataset.meshName) ||
                       (obj === item.dataset.meshId);
            });
            
            if (!isActuallySelected) {
                item.classList.remove('selected');
            }
        }, 2000);
    }

    /**
     * Show/hide the object list panel
     */
    toggleVisibility() {
        if (this.objectListPanel) {
            const wasHidden = this.objectListPanel.classList.contains('hidden');
            this.objectListPanel.classList.toggle('hidden');
            const isHidden = this.objectListPanel.classList.contains('hidden');
            
            // Dispatch event for visibility change
            this.dispatchVisibilityChangeEvent(isHidden);
        }
    }

    /**
     * Show the object list panel
     */
    show() {
        if (this.objectListPanel) {
            this.objectListPanel.classList.remove('hidden');
            this.dispatchVisibilityChangeEvent(false);
        }
    }

    /**
     * Hide the object list panel
     */
    hide() {
        if (this.objectListPanel) {
            this.objectListPanel.classList.add('hidden');
            this.dispatchVisibilityChangeEvent(true);
        }
    }

    /**
     * Dispatch event when object list visibility changes
     */
    dispatchVisibilityChangeEvent(isHidden) {
        const event = new CustomEvent('objectListVisibilityChanged', {
            detail: { isHidden: isHidden }
        });
        document.dispatchEvent(event);
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
