/**
 * STLManager - Manages STL file import and export operations
 */
class STLManager {
    constructor(sceneManager, treeManager, selectionManager, lightingManager, uiManager) {
        this.sceneManager = sceneManager;
        this.treeManager = treeManager;
        this.selectionManager = selectionManager;
        this.lightingManager = lightingManager;
        this.uiManager = uiManager; // Reference to UIManager for helper methods
        
        // STL Import settings
        this.smoothingAngleThreshold = 180; // Default: 180 degrees
    }

    /**
     * Import STL file
     */
    importSTL() {
        // Show import dialog first
        this.showSTLImportDialog();
    }

    /**
     * Show STL import dialog to ask user about import mode
     */
    showSTLImportDialog() {
        const dialog = document.getElementById('stlImportDialog');
        if (!dialog) {
            console.error('STL import dialog not found');
            // Fallback: directly open file picker with default values
            this.openSTLFilePicker(false, 'y-up', false);
            return;
        }

        // Reset to default values
        const newSceneRadio = document.querySelector('input[name="stlImportMode"][value="new-scene"]');
        if (newSceneRadio) {
            newSceneRadio.checked = true;
        }
        
        const axisUpSelect = document.getElementById('stlImportAxisUp');
        if (axisUpSelect) {
            axisUpSelect.value = 'y-up';
        }
        
        const flipNormalsCheckbox = document.getElementById('stlImportFlipNormals');
        if (flipNormalsCheckbox) {
            flipNormalsCheckbox.checked = false;
        }

        // Show dialog
        dialog.style.display = 'flex';

        // Setup event listeners
        const closeBtn = document.getElementById('stlImportDialogClose');
        const cancelBtn = document.getElementById('stlImportDialogCancel');
        const confirmBtn = document.getElementById('stlImportDialogConfirm');

        const closeDialog = () => {
            dialog.style.display = 'none';
        };

        const handleConfirm = () => {
            const importMode = document.querySelector('input[name="stlImportMode"]:checked');
            const clearScene = importMode && importMode.value === 'new-scene';
            const axisUpSelect = document.getElementById('stlImportAxisUp');
            const axisUp = axisUpSelect ? axisUpSelect.value : 'y-up';
            const flipNormalsCheckbox = document.getElementById('stlImportFlipNormals');
            const flipNormals = flipNormalsCheckbox ? flipNormalsCheckbox.checked : false;
            closeDialog();
            this.openSTLFilePicker(clearScene, axisUp, flipNormals);
        };

        // Remove old listeners and add new ones
        if (closeBtn) {
            closeBtn.onclick = closeDialog;
        }
        if (cancelBtn) {
            cancelBtn.onclick = closeDialog;
        }
        if (confirmBtn) {
            confirmBtn.onclick = handleConfirm;
        }

        // Close on overlay click
        dialog.onclick = (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        };
    }

    /**
     * Open file picker for STL import
     * @param {boolean} clearScene - Whether to clear the scene before importing
     * @param {string} axisUp - Axis up direction ('y-up' or 'z-up')
     * @param {boolean} flipNormals - Whether to flip normals
     */
    openSTLFilePicker(clearScene, axisUp = 'y-up', flipNormals = false) {
        // Create file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.stl';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                this.loadSTLFile(file, clearScene, axisUp, flipNormals);
            }
        });
        
        // Trigger file selection
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    /**
     * Load STL file and add to scene
     * @param {File} file - The STL file to load
     * @param {boolean} clearScene - Whether to clear the scene before importing
     * @param {string} axisUp - Axis up direction ('y-up' or 'z-up')
     * @param {boolean} flipNormals - Whether to flip normals
     */
    loadSTLFile(file, clearScene = false, axisUp = 'y-up', flipNormals = false) {
        // Show loading overlay
        this.showSTLImportLoading('Reading file...');
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                this.updateSTLImportLoadingStatus('Parsing STL file...');
                // Use setTimeout to allow UI to update, then parse asynchronously
                setTimeout(async () => {
                    try {
                        await this.parseSTLFile(content, clearScene, axisUp, flipNormals);
                    } catch (parseError) {
                        console.error('Error parsing STL file:', parseError);
                        this.hideSTLImportLoading();
                        alert('Error parsing STL file. Please check the file format and try again.\n\nError: ' + parseError.message);
                    }
                }, 10);
            } catch (error) {
                console.error('Error loading STL file:', error);
                this.hideSTLImportLoading();
                alert('Error loading STL file. Please try again.');
            }
        };
        
        reader.onerror = () => {
            this.hideSTLImportLoading();
            alert('Error reading file. Please try again.');
        };
        
        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentLoaded = Math.round((event.loaded / event.total) * 100);
                this.updateSTLImportLoadingStatus(`Reading file... ${percentLoaded}%`);
            }
        };
        
        // Read as text (ASCII STL format)
        reader.readAsText(file);
    }

    /**
     * Show STL import loading overlay
     * @param {string} status - Loading status message
     */
    showSTLImportLoading(status = 'Loading STL file...') {
        const loadingOverlay = document.getElementById('stlImportLoadingOverlay');
        const statusElement = document.getElementById('stlImportLoadingStatus');
        
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
        
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    /**
     * Update STL import loading status
     * @param {string} status - New status message
     * @param {string} objectName - Optional: Name of current object being processed
     */
    updateSTLImportLoadingStatus(status, objectName = null) {
        const statusElement = document.getElementById('stlImportLoadingStatus');
        const objectElement = document.getElementById('stlImportLoadingObject');
        
        if (statusElement) {
            statusElement.textContent = status;
        }
        
        if (objectElement) {
            if (objectName) {
                objectElement.textContent = objectName;
            } else {
                objectElement.textContent = '';
            }
        }
    }

    /**
     * Hide STL import loading overlay
     */
    hideSTLImportLoading() {
        const loadingOverlay = document.getElementById('stlImportLoadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    /**
     * Parse STL ASCII file content and create meshes
     * @param {string} content - The STL file content
     * @param {boolean} clearScene - Whether to clear the scene before importing
     * @param {string} axisUp - Axis up direction ('y-up' or 'z-up')
     * @param {boolean} flipNormals - Whether to flip normals
     */
    async parseSTLFile(content, clearScene = false, axisUp = 'y-up', flipNormals = false) {
        try {
            if (!this.sceneManager) {
                console.error('SceneManager not available');
                this.hideSTLImportLoading();
                return;
            }

            const scene = this.sceneManager.getScene();
            if (!scene) {
                console.error('Scene not available');
                this.hideSTLImportLoading();
                return;
            }

            // Clear scene if requested
            if (clearScene && this.uiManager && this.uiManager.createEmptyScene) {
                console.log('Clearing scene before importing STL file...');
                this.uiManager.createEmptyScene();
            }

            console.log('Parsing STL file...');
            this.updateSTLImportLoadingStatus('Parsing STL file...');

            // Split content into lines
            const lines = content.split('\n');
            const totalLines = lines.length;
            const objects = [];
            let currentObject = null;
            let currentTriangle = null;
            let inFacet = false;
            let inLoop = false;
            let vertexCount = 0;

            // IMPORTANT: Process in chunks to prevent browser freeze for large files
            // Increased chunk size for better performance
            const CHUNK_SIZE = 50000; // Increased to 50000 for maximum performance
            let currentIndex = 0;
            let currentObjectName = '';

            // Parse STL file line by line in chunks
            while (currentIndex < lines.length) {
                const endIndex = Math.min(currentIndex + CHUNK_SIZE, lines.length);
                
                for (let i = currentIndex; i < endIndex; i++) {
                    // Update progress every 100000 lines (less frequent updates for better performance)
                    if (i % 100000 === 0 && i > 0) {
                        const progress = Math.round((i / totalLines) * 100);
                        this.updateSTLImportLoadingStatus(`Parsing STL file... ${progress}%`, currentObjectName || null);
                    }
                    
                    const line = lines[i].trim();

                // Check for solid start
                if (line.startsWith('solid ')) {
                    const objectName = line.substring(6).trim();
                    currentObjectName = objectName; // Store for progress display
                    currentObject = {
                        name: objectName,
                        type: this.detectTypeFromName(objectName),
                        triangles: []
                    };
                    console.log(`Found solid: ${objectName}, type: ${currentObject.type}`);
                    // Update progress with object name
                    const progress = Math.round((i / totalLines) * 100);
                    this.updateSTLImportLoadingStatus(`Parsing STL file... ${progress}%`, objectName);
                }
                // Check for solid end
                else if (line.startsWith('endsolid ')) {
                    if (currentObject && currentObject.triangles.length > 0) {
                        objects.push(currentObject);
                    }
                    currentObject = null;
                    currentObjectName = ''; // Clear object name
                }
                // Check for facet start
                else if (line.startsWith('facet normal ')) {
                    if (!currentObject) continue;
                    
                    const normalMatch = line.match(/facet normal\s+([\d\.e\+\-]+)\s+([\d\.e\+\-]+)\s+([\d\.e\+\-]+)/);
                    if (normalMatch) {
                        const stlX = parseFloat(normalMatch[1]);
                        const stlY = parseFloat(normalMatch[2]);
                        const stlZ = parseFloat(normalMatch[3]);
                        
                        let normal;
                        if (axisUp === 'z-up') {
                            // STL format: (X, Y, Z) where Y=forward, Z=up
                            // Babylon.js: (X, Y, Z) where Y=up, Z=forward
                            // So we need to swap Y and Z: (x, y, z) -> (x, z, y)
                            normal = {
                                x: stlX,
                                y: stlZ,  // STL Z becomes Babylon Y (up)
                                z: stlY   // STL Y becomes Babylon Z (forward)
                            };
                        } else {
                            // Y-up: STL format: (X, Y, Z) where Y=up, Z=forward (same as Babylon.js)
                            // But reverse Z axis to match export behavior (flip forward/backward direction)
                            normal = {
                                x: stlX,
                                y: stlY,
                                z: -stlZ  // Reverse Z axis
                            };
                        }
                        
                        // Flip normals if requested
                        if (flipNormals) {
                            normal.x = -normal.x;
                            normal.y = -normal.y;
                            normal.z = -normal.z;
                        }
                        
                        currentTriangle = {
                            normal: normal,
                            vertices: []
                        };
                        inFacet = true;
                        vertexCount = 0;
                    }
                }
                // Check for facet end
                else if (line === 'endfacet') {
                    if (currentTriangle && currentTriangle.vertices.length === 3) {
                        currentObject.triangles.push(currentTriangle);
                    }
                    currentTriangle = null;
                    inFacet = false;
                    inLoop = false;
                }
                // Check for outer loop start
                else if (line === 'outer loop') {
                    inLoop = true;
                }
                // Check for loop end
                else if (line === 'endloop') {
                    inLoop = false;
                }
                // Check for vertex
                else if (line.startsWith('vertex ') && inFacet && inLoop) {
                    const vertexMatch = line.match(/vertex\s+([\d\.e\+\-]+)\s+([\d\.e\+\-]+)\s+([\d\.e\+\-]+)/);
                    if (vertexMatch && currentTriangle) {
                        const stlX = parseFloat(vertexMatch[1]);
                        const stlY = parseFloat(vertexMatch[2]);
                        const stlZ = parseFloat(vertexMatch[3]);
                        
                        let vertex;
                        if (axisUp === 'z-up') {
                            // STL format: (X, Y, Z) where Y=forward, Z=up
                            // Babylon.js: (X, Y, Z) where Y=up, Z=forward
                            // So we need to swap Y and Z: (x, y, z) -> (x, z, y)
                            vertex = {
                                x: stlX,
                                y: stlZ,  // STL Z becomes Babylon Y (up)
                                z: stlY   // STL Y becomes Babylon Z (forward)
                            };
                        } else {
                            // Y-up: STL format: (X, Y, Z) where Y=up, Z=forward (same as Babylon.js)
                            // But reverse Z axis to match export behavior (flip forward/backward direction)
                            vertex = {
                                x: stlX,
                                y: stlY,
                                z: -stlZ  // Reverse Z axis
                            };
                        }
                        
                        currentTriangle.vertices.push(vertex);
                        vertexCount++;
                    }
                }
                }
                
                // Update progress with current object name if available
                const progress = Math.round((endIndex / totalLines) * 100);
                this.updateSTLImportLoadingStatus(`Parsing STL file... ${progress}%`, currentObjectName || null);
                
                // Yield to browser to prevent freeze (less frequently for better performance)
                currentIndex = endIndex;
                if (currentIndex < lines.length) {
                    // Use requestIdleCallback if available for better performance, otherwise requestAnimationFrame
                    // Yield less frequently for maximum performance
                    if (currentIndex % (CHUNK_SIZE * 3) === 0) {
                        if (window.requestIdleCallback) {
                            await new Promise(resolve => requestIdleCallback(resolve, { timeout: 100 }));
                        } else {
                            await new Promise(resolve => requestAnimationFrame(resolve));
                        }
                    }
                }
            }

            console.log(`Parsed ${objects.length} objects from STL file`);
            this.updateSTLImportLoadingStatus(`Creating meshes... (${objects.length} objects)`);

            // Separate buildings from other objects for batch processing
            const buildings = objects.filter(obj => obj.type === 'building');
            const otherObjects = objects.filter(obj => obj.type !== 'building');
            
            console.log(`[STL Import] Processing ${buildings.length} buildings and ${otherObjects.length} other objects`);

            // Create meshes from parsed objects (process in batches for better performance)
            let createdCount = 0;
            const BATCH_SIZE = 20; // Base batch size
            const BUILDING_BATCH_SIZE = 50; // Larger batch for buildings
            
            // Process buildings first (with maximum optimization)
            if (buildings.length > 0) {
                let buildingBatchCount = 0;
                for (let index = 0; index < buildings.length; index++) {
                    const obj = buildings[index];
                    try {
                        // Update progress less frequently for buildings
                        if (index % 10 === 0 || index === buildings.length - 1) {
                            const progress = Math.round(((index + 1) / buildings.length) * 100);
                            this.updateSTLImportLoadingStatus(`Creating buildings... ${progress}% (${index + 1}/${buildings.length})`, obj.name);
                        }
                        
                        const mesh = this.createMeshFromSTLObject(obj, scene, true); // optimizeForPerformance = true
                        if (mesh) {
                            createdCount++;
                        }
                        
                        // Yield much less frequently for buildings
                        buildingBatchCount++;
                        if (buildingBatchCount >= BUILDING_BATCH_SIZE && index < buildings.length - 1) {
                            buildingBatchCount = 0;
                            if (window.requestIdleCallback) {
                                await new Promise(resolve => requestIdleCallback(resolve, { timeout: 100 }));
                            } else {
                                await new Promise(resolve => requestAnimationFrame(resolve));
                            }
                        }
                    } catch (error) {
                        console.error(`Error creating mesh for ${obj.name}:`, error);
                    }
                }
                
                // Batch update shadows for all buildings at once (much faster)
                if (this.lightingManager && buildings.length > 0) {
                    this.updateSTLImportLoadingStatus('Setting up shadows for buildings...', null);
                    const buildingMeshes = scene.meshes.filter(m => 
                        m.userData && m.userData.isImportedSTL && m.userData.type === 'building'
                    );
                    buildingMeshes.forEach(mesh => {
                        this.lightingManager.updateShadowsForNewObject(mesh);
                    });
                }
            }
            
            // Process other objects (with normal optimization)
            if (otherObjects.length > 0) {
                let otherBatchCount = 0; // Reset batch count for other objects
                for (let index = 0; index < otherObjects.length; index++) {
                    const obj = otherObjects[index];
                    try {
                        const progress = Math.round(((index + 1) / otherObjects.length) * 100);
                        this.updateSTLImportLoadingStatus(`Creating other objects... ${progress}% (${index + 1}/${otherObjects.length})`, obj.name);
                        
                        const mesh = this.createMeshFromSTLObject(obj, scene, false); // optimizeForPerformance = false
                        if (mesh) {
                            createdCount++;
                        }
                        
                        otherBatchCount++;
                        if (otherBatchCount >= BATCH_SIZE && index < otherObjects.length - 1) {
                            otherBatchCount = 0;
                            if (window.requestIdleCallback) {
                                await new Promise(resolve => requestIdleCallback(resolve, { timeout: 100 }));
                            } else {
                                await new Promise(resolve => requestAnimationFrame(resolve));
                            }
                        }
                    } catch (error) {
                        console.error(`Error creating mesh for ${obj.name}:`, error);
                    }
                }
            }

            console.log(`Created ${createdCount} meshes from STL file`);
            this.updateSTLImportLoadingStatus('Finalizing...');

            // IMPORTANT: Ensure all imported meshes have correct renderingGroupId
            // This includes checking child meshes if any exist
            this.updateRenderingGroupsForImportedMeshes(scene, objects);

            // Apply 2-sided materials to all meshes after import
            if (this.uiManager && this.uiManager.apply2SidedMaterialsToAll) {
                this.updateSTLImportLoadingStatus('Applying materials...');
                this.uiManager.apply2SidedMaterialsToAll();
            }

            // Dispatch scene change event to update object list
            if (this.uiManager && this.uiManager.dispatchSceneChangeEvent) {
                this.uiManager.dispatchSceneChangeEvent();
            }

            // Hide loading overlay
            this.hideSTLImportLoading();

            // Show success message
            alert(`Successfully imported ${createdCount} objects from STL file.`);
        } catch (error) {
            console.error('Error parsing STL file:', error);
            this.hideSTLImportLoading();
            alert('Error parsing STL file. Please check the file format and try again.');
        }
    }

    /**
     * Detect object type from name
     */
    detectTypeFromName(name) {
        const lowerName = name.toLowerCase();
        
        if (lowerName.startsWith('tree') && /^\d+$/.test(lowerName.substring(4))) {
            return 'tree';
        } else if (lowerName.startsWith('building') && /^\d+$/.test(lowerName.substring(8))) {
            return 'building';
        } else if (lowerName.startsWith('highway') && /^\d+$/.test(lowerName.substring(7))) {
            return 'highway';
        } else if (lowerName.startsWith('ground') && /^\d+$/.test(lowerName.substring(6))) {
            return 'ground';
        } else if (lowerName.startsWith('grass') && /^\d+$/.test(lowerName.substring(5))) {
            return 'grass';
        } else if (lowerName.startsWith('waterway') && /^\d+$/.test(lowerName.substring(8))) {
            return 'waterway';
        } else if (lowerName.startsWith('building')) {
            return 'building';
        } else if (lowerName.startsWith('highway')) {
            return 'highway';
        } else if (lowerName.startsWith('ground')) {
            return 'ground';
        } else if (lowerName.startsWith('grass')) {
            return 'grass';
        } else if (lowerName.startsWith('waterway') || lowerName.startsWith('water')) {
            return 'waterway';
        }
        
        // Default to ground if type cannot be determined
        return 'ground';
    }

    /**
     * Create a mesh from STL object data
     * @param {Object} obj - STL object data
     * @param {BABYLON.Scene} scene - Babylon.js scene
     * @param {boolean} optimizeForPerformance - If true, skip some expensive operations for better performance
     */
    createMeshFromSTLObject(obj, scene, optimizeForPerformance = false) {
        if (!obj || !obj.triangles || obj.triangles.length === 0) {
            return null;
        }

        // Collect all vertices and create indices
        // For performance optimization (buildings), use simpler approach without complex smoothing
        const positions = [];
        const indices = [];
        const normals = [];
        
        if (optimizeForPerformance) {
            // Ultra-fast path for buildings: simple vertex deduplication, no normals stored
            // We'll use ComputeNormals later which is much faster
            const vertexMap = new Map(); // key -> index
            
            obj.triangles.forEach((triangle) => {
                const triangleIndices = [];
                
                triangle.vertices.forEach((vertex) => {
                    // Use integer coordinates for fastest comparison (100x precision is enough for buildings)
                    const key = `${Math.round(vertex.x * 100)},${Math.round(vertex.y * 100)},${Math.round(vertex.z * 100)}`;
                    
                    if (!vertexMap.has(key)) {
                        const vertexIndex = positions.length / 3;
                        positions.push(vertex.x, vertex.y, vertex.z);
                        // Don't store normals - we'll compute them later using ComputeNormals
                        vertexMap.set(key, vertexIndex);
                        triangleIndices.push(vertexIndex);
                    } else {
                        triangleIndices.push(vertexMap.get(key));
                    }
                });
                
                // Add triangle indices (no normal checking for performance)
                if (triangleIndices.length === 3) {
                    indices.push(triangleIndices[0], triangleIndices[1], triangleIndices[2]);
                }
            });
        } else {
            // Original approach with smoothing for other objects
            const vertexMap = new Map(); // key -> array of {index, normal, triangleIndex}
            const angleDegrees = this.smoothingAngleThreshold || 180;
            const smoothingAngleThreshold = Math.cos((180 - angleDegrees) * Math.PI / 180);
            
            // First pass: collect vertices and group by position
            obj.triangles.forEach((triangle, triIndex) => {
                const triangleIndices = [];
                const triangleNormal = new BABYLON.Vector3(triangle.normal.x, triangle.normal.y, triangle.normal.z);

                // Process each vertex in the triangle
                triangle.vertices.forEach((vertex) => {
                    const key = `${vertex.x.toFixed(6)},${vertex.y.toFixed(6)},${vertex.z.toFixed(6)}`;
                    
                    if (!vertexMap.has(key)) {
                        vertexMap.set(key, []);
                    }
                    
                    const vertexGroup = vertexMap.get(key);
                    
                    // Find if there's a similar normal in this vertex group
                    let foundSimilar = false;
                    for (let i = 0; i < vertexGroup.length; i++) {
                        const existing = vertexGroup[i];
                        const existingNormal = new BABYLON.Vector3(
                            existing.normal.x,
                            existing.normal.y,
                            existing.normal.z
                        );
                        existingNormal.normalize();
                        
                        const dotProduct = BABYLON.Vector3.Dot(existingNormal, triangleNormal);
                        
                        // If normals are similar (angle < 60°), use the same vertex index
                        if (dotProduct > smoothingAngleThreshold) {
                            triangleIndices.push(existing.index);
                            foundSimilar = true;
                            
                            // Update normal by averaging (for better smoothing)
                            const count = existing.triangleCount || 1;
                            existing.normal.x = (existing.normal.x * count + triangle.normal.x) / (count + 1);
                            existing.normal.y = (existing.normal.y * count + triangle.normal.y) / (count + 1);
                            existing.normal.z = (existing.normal.z * count + triangle.normal.z) / (count + 1);
                            existing.triangleCount = count + 1;
                            break;
                        }
                    }
                    
                    // If no similar normal found, create a new vertex (hard edge)
                    if (!foundSimilar) {
                        const vertexIndex = positions.length / 3;
                        positions.push(vertex.x, vertex.y, vertex.z);
                        
                        vertexGroup.push({
                            index: vertexIndex,
                            normal: { x: triangle.normal.x, y: triangle.normal.y, z: triangle.normal.z },
                            triangleCount: 1
                        });
                        
                        triangleIndices.push(vertexIndex);
                    }
                });

                // Add triangle indices
                // Check if we need to flip the triangle order based on normal direction
                // In STL, normals should point outward. If the normal from STL points inward,
                // we need to reverse the vertex order to get correct lighting
                if (triangleIndices.length === 3) {
                    // Calculate normal from triangle vertices to verify direction
                    const v0 = triangle.vertices[0];
                    const v1 = triangle.vertices[1];
                    const v2 = triangle.vertices[2];
                    
                    const edge1 = new BABYLON.Vector3(v1.x - v0.x, v1.y - v0.y, v1.z - v0.z);
                    const edge2 = new BABYLON.Vector3(v2.x - v0.x, v2.y - v0.y, v2.z - v0.z);
                    const calculatedNormal = BABYLON.Vector3.Cross(edge1, edge2);
                    calculatedNormal.normalize();
                    
                    // Compare with STL normal
                    const stlNormal = new BABYLON.Vector3(triangle.normal.x, triangle.normal.y, triangle.normal.z);
                    stlNormal.normalize();
                    
                    const dotProduct = BABYLON.Vector3.Dot(calculatedNormal, stlNormal);
                    
                    // If normals are opposite (dot product < 0), reverse the triangle order
                    if (dotProduct < 0) {
                        // Reverse order: (0, 1, 2) -> (0, 2, 1)
                        indices.push(triangleIndices[0], triangleIndices[2], triangleIndices[1]);
                    } else {
                        // Keep original order
                        indices.push(triangleIndices[0], triangleIndices[1], triangleIndices[2]);
                    }
                }
            });
            
            // Second pass: calculate final normals for all vertices (only for non-optimized path)
            let smoothingStats = {
                totalVertices: 0,
                smoothedVertices: 0,
                hardEdges: 0,
                uniqueNormals: new Set(),
                maxVariantsPerPosition: 0
            };
            
            vertexMap.forEach((vertexGroup) => {
                smoothingStats.totalVertices++;
                if (vertexGroup.length > 1) {
                    smoothingStats.hardEdges++;
                }
                if (vertexGroup.length > smoothingStats.maxVariantsPerPosition) {
                    smoothingStats.maxVariantsPerPosition = vertexGroup.length;
                }
                
                vertexGroup.forEach((vertexData) => {
                    const normal = vertexData.normal;
                    
                    // Normalize the normal
                    const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
                    if (length > 0.0001) {
                        const normalizedX = normal.x / length;
                        const normalizedY = normal.y / length;
                        const normalizedZ = normal.z / length;
                        normals.push(normalizedX, normalizedY, normalizedZ);
                        
                        if (vertexData.triangleCount > 1) {
                            smoothingStats.smoothedVertices++;
                        }
                        
                        // Track unique normals
                        const normalKey = `${normalizedX.toFixed(3)},${normalizedY.toFixed(3)},${normalizedZ.toFixed(3)}`;
                        smoothingStats.uniqueNormals.add(normalKey);
                    } else {
                        normals.push(0, 1, 0);
                        smoothingStats.uniqueNormals.add('0.000,1.000,0.000');
                    }
                });
            });
        }
        
        // Log smoothing information (skip for performance optimization)
        if (!optimizeForPerformance) {
            console.log(`[STL Import] ${obj.name} - Smoothing Info:`, {
                totalPositions: smoothingStats.totalVertices,
                smoothedVertices: smoothingStats.smoothedVertices,
                hardEdges: smoothingStats.hardEdges,
                uniqueNormalCount: smoothingStats.uniqueNormals.size,
                maxVariantsPerPosition: smoothingStats.maxVariantsPerPosition,
                note: 'STL format does not have smoothing groups. Smoothing uses 60° angle threshold to preserve hard edges.'
            });
        }

        if (positions.length === 0) {
            return null;
        }

        // Create mesh
        const mesh = new BABYLON.Mesh(obj.name, scene);

        // Create vertex data
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        
        // Use smoothed normals (already calculated from STL normals)
        // For optimized path (buildings), use ComputeNormals which is much faster
        if (optimizeForPerformance) {
            // Use Babylon.js ComputeNormals - it's optimized and much faster than manual calculation
            // normals array is empty, ComputeNormals will fill it
            BABYLON.VertexData.ComputeNormals(positions, indices, normals);
        }
        // Set normals (either computed for buildings or pre-calculated for others)
        vertexData.normals = normals;

        // Apply vertex data to mesh
        vertexData.applyToMesh(mesh);

        // Calculate bounding box to determine mesh center and minimum Y
        // For optimized path, calculate bounding box manually (faster than refreshBoundingInfo)
        let min, max, center, originalMinY;
        if (optimizeForPerformance) {
            // Manual bounding box calculation (much faster for buildings)
            min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
            max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
            for (let i = 0; i < positions.length; i += 3) {
                min.x = Math.min(min.x, positions[i]);
                min.y = Math.min(min.y, positions[i + 1]);
                min.z = Math.min(min.z, positions[i + 2]);
                max.x = Math.max(max.x, positions[i]);
                max.y = Math.max(max.y, positions[i + 1]);
                max.z = Math.max(max.z, positions[i + 2]);
            }
            center = new BABYLON.Vector3(
                (min.x + max.x) / 2,
                (min.y + max.y) / 2,
                (min.z + max.z) / 2
            );
            originalMinY = min.y;
        } else {
            mesh.refreshBoundingInfo();
            const boundingInfo = mesh.getBoundingInfo();
            min = boundingInfo.boundingBox.minimum;
            max = boundingInfo.boundingBox.maximum;
            center = new BABYLON.Vector3(
                (min.x + max.x) / 2,
                (min.y + max.y) / 2,
                (min.z + max.z) / 2
            );
            originalMinY = min.y;
        }

        // Adjust mesh position and vertices:
        // 1. Move mesh to center position (so gizmo appears at center X/Z)
        // 2. Offset vertices so mesh center is at origin in local space
        mesh.position = center.clone();
        
        // Offset all vertices so mesh center is at origin in local space
        const offset = center.clone();
        const adjustedPositions = [];
        for (let i = 0; i < positions.length; i += 3) {
            adjustedPositions.push(
                positions[i] - offset.x,
                positions[i + 1] - offset.y,
                positions[i + 2] - offset.z
            );
        }
        
        // Update mesh with adjusted positions
        mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, adjustedPositions);
        
        // Recalculate normals from geometry to ensure correct direction
        // This fixes the issue where STL normals might be inverted
        // For optimized path (buildings), skip this as we already computed normals and they're relative to geometry
        if (!optimizeForPerformance) {
            const recalculatedNormals = [];
            BABYLON.VertexData.ComputeNormals(adjustedPositions, indices, recalculatedNormals);
            mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, recalculatedNormals);
        } else {
            // For buildings, adjust normals to match adjusted positions (recompute for adjusted geometry)
            const recalculatedNormals = [];
            BABYLON.VertexData.ComputeNormals(adjustedPositions, indices, recalculatedNormals);
            mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, recalculatedNormals);
        }
        
        // Calculate minimum Y after offset (in local space, should be negative or zero)
        let updatedMin, updatedMax, localMinY, worldMinY;
        if (optimizeForPerformance) {
            // Manual calculation (faster for buildings)
            updatedMin = new BABYLON.Vector3(Infinity, Infinity, Infinity);
            updatedMax = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
            for (let i = 0; i < adjustedPositions.length; i += 3) {
                updatedMin.x = Math.min(updatedMin.x, adjustedPositions[i]);
                updatedMin.y = Math.min(updatedMin.y, adjustedPositions[i + 1]);
                updatedMin.z = Math.min(updatedMin.z, adjustedPositions[i + 2]);
                updatedMax.x = Math.max(updatedMax.x, adjustedPositions[i]);
                updatedMax.y = Math.max(updatedMax.y, adjustedPositions[i + 1]);
                updatedMax.z = Math.max(updatedMax.z, adjustedPositions[i + 2]);
            }
            localMinY = updatedMin.y;
            worldMinY = mesh.position.y + localMinY;
        } else {
            mesh.refreshBoundingInfo();
            const updatedBoundingInfo = mesh.getBoundingInfo();
            updatedMin = updatedBoundingInfo.boundingBox.minimum;
            updatedMax = updatedBoundingInfo.boundingBox.maximum;
            localMinY = updatedMin.y;
            worldMinY = mesh.position.y + localMinY;
        }

        // Create material based on type - ensure color is set correctly
        const material = new BABYLON.StandardMaterial(`${obj.name}Material`, scene);
        const color = (this.uiManager && this.uiManager.getColorByType) ? 
            this.uiManager.getColorByType(obj.type) : 
            new BABYLON.Color3(0.8, 0.8, 0.8);
        material.diffuseColor = color;
        // IMPORTANT: For highway and other surface types, use 2-sided material to ensure visibility
        // This prevents issues where normals might be facing inward
        material.backFaceCulling = false; // 2-sided for better visibility
        material.twoSidedLighting = true; // Enable lighting on both sides
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        material.roughness = 0.7;
        material.alpha = 1.0; // Ensure full opacity
        mesh.material = material;

        // Enable edges rendering (skip for buildings for better performance)
        if (!optimizeForPerformance) {
            mesh.enableEdgesRendering();
            mesh.edgesWidth = 1.0;
            mesh.edgesColor = new BABYLON.Color4(0, 0, 0, 1);
        }
        
        // Set userData based on type
        // Store original STL data for real-time smoothing updates
        // For performance optimization (buildings), skip deep copy of STL data
        let originalSTLDataCopy = null;
        if (!optimizeForPerformance) {
            // Only deep copy for non-buildings (ground, grass, etc.) that might need smoothing updates
            originalSTLDataCopy = JSON.parse(JSON.stringify(obj));
            // Remove period properties from originalSTLData if they exist
            delete originalSTLDataCopy.startPeriod;
            delete originalSTLDataCopy.endPeriod;
            delete originalSTLDataCopy.buildingArchetypePeriod;
            delete originalSTLDataCopy.buildingGroupPeriod;
        } else {
            // For buildings, store minimal data (just name and type) to save memory and time
            originalSTLDataCopy = {
                name: obj.name,
                type: obj.type,
                triangles: [] // Empty - not needed for buildings
            };
        }
        
        const userData = {
            type: obj.type,
            shapeType: obj.type === 'tree' ? 'tree' : (obj.type === 'building' ? 'building' : 'polygon'),
            dimensions: {
                width: updatedMax.x - updatedMin.x,
                depth: updatedMax.z - updatedMin.z,
                height: updatedMax.y - updatedMin.y
            },
            originalHeight: updatedMax.y - updatedMin.y,
            baseY: worldMinY, // Store world-space minimum Y for gizmo positioning
            isImportedSTL: true, // Flag to identify imported STL meshes
            originalSTLData: originalSTLDataCopy // Minimal copy for buildings, full copy for others
        };

        // Add default surface type properties based on object type
        switch (obj.type) {
            case 'highway':
                userData.highwayRoadType = 'default';
                // Ensure no period properties for highway
                delete userData.startPeriod;
                delete userData.endPeriod;
                delete userData.buildingArchetypePeriod;
                delete userData.buildingGroupPeriod;
                break;
            case 'waterway':
                userData.waterwayWaterType = 'default';
                // Ensure no period properties for waterway
                delete userData.startPeriod;
                delete userData.endPeriod;
                delete userData.buildingArchetypePeriod;
                delete userData.buildingGroupPeriod;
                break;
            case 'grass':
                userData.grassVegetationType = 'grass_default';
                userData.grassSoilType = 'default';
                // Ensure no period properties for grass
                delete userData.startPeriod;
                delete userData.endPeriod;
                delete userData.buildingArchetypePeriod;
                delete userData.buildingGroupPeriod;
                break;
            case 'ground':
                userData.groundVegetationType = 'ground_default';
                userData.groundSoilType = 'default';
                // Ensure no period properties for ground
                delete userData.startPeriod;
                delete userData.endPeriod;
                delete userData.buildingArchetypePeriod;
                delete userData.buildingGroupPeriod;
                break;
            case 'tree':
                userData.treeVegetationType = 'tree_default';
                userData.treeSoilType = 'default';
                // Ensure no period properties for tree
                delete userData.startPeriod;
                delete userData.endPeriod;
                delete userData.buildingArchetypePeriod;
                delete userData.buildingGroupPeriod;
                break;
            case 'building':
                // Default building envelope properties
                userData.buildingEnvelopeProperties = 'archetype';
                // Year of Construction is optional, so we don't set a default
                break;
        }

        mesh.userData = userData;
        
        // Set rendering priority based on type (after userData is set)
        mesh.renderingGroupId = SceneManager.getRenderingGroupId(obj.type);

        // Enable shadows
        mesh.receiveShadows = true;
        mesh.castShadows = true;

        // Add to selection manager
        if (this.selectionManager) {
            this.selectionManager.addSelectableObject(mesh);
        }

        // Add to scene manager if it's a building
        if (obj.type === 'building' && this.sceneManager) {
            // SceneManager.addBuilding expects an object with mesh property
            this.sceneManager.addBuilding({ mesh: mesh });
        }

        // For trees, we would need to handle them differently (as TransformNode with child meshes)
        // For now, trees are imported as regular meshes
        if (obj.type === 'tree' && this.treeManager) {
            // Note: Trees imported from STL won't have the same structure as drawn trees
            // They will be simple meshes, not TransformNodes with child meshes
            console.log(`Imported tree: ${obj.name} (as simple mesh)`);
        }

        // Update shadows (batch update for buildings for better performance)
        if (this.lightingManager) {
            if (optimizeForPerformance) {
                // For buildings, defer shadow update to batch processing
                // Just set flags, actual shadow setup will be done in batch
                mesh.receiveShadows = true;
                mesh.castShadows = true;
            } else {
                this.lightingManager.updateShadowsForNewObject(mesh);
            }
        }

        // Skip console.log for buildings (performance optimization)
        if (!optimizeForPerformance) {
            console.log(`Created mesh: ${obj.name} (type: ${obj.type}, triangles: ${obj.triangles.length}, renderingGroupId: ${mesh.renderingGroupId}, isVisible: ${mesh.isVisible}, isEnabled: ${mesh.isEnabled()})`);

            // IMPORTANT: Log highway meshes specifically for debugging
            if (obj.type === 'highway') {
                console.log(`[STL Import] Highway mesh created: ${obj.name}`, {
                    type: obj.type,
                    renderingGroupId: mesh.renderingGroupId,
                    isVisible: mesh.isVisible,
                    isEnabled: mesh.isEnabled(),
                    hasMaterial: !!mesh.material,
                    materialAlpha: mesh.material?.alpha,
                    materialDiffuseColor: mesh.material?.diffuseColor,
                    position: mesh.position,
                    triangles: obj.triangles.length
                });
            }
        }

        return mesh;
    }

    /**
     * Calculate bounding box for a mesh
     */
    calculateBoundingBox(mesh) {
        const boundingInfo = mesh.getBoundingInfo();
        const min = boundingInfo.boundingBox.minimum;
        const max = boundingInfo.boundingBox.maximum;
        
        return {
            width: max.x - min.x,
            depth: max.z - min.z,
            height: max.y - min.y
        };
    }

    /**
     * Export all 3D models to STL format (ASCII)
     */
    exportSTL() {
        if (!this.sceneManager) {
            console.error('SceneManager not available');
            return;
        }

        const scene = this.sceneManager.getScene();
        if (!scene) {
            console.error('Scene not available');
            return;
        }

        // Show export settings dialog
        this.showSTLExportDialog();
    }

    /**
     * Show STL export settings dialog
     */
    showSTLExportDialog() {
        const dialog = document.getElementById('stlExportDialog');
        if (!dialog) {
            console.error('STL export dialog not found');
            return;
        }

        // Reset to default values
        const axisUpSelect = document.getElementById('stlAxisUp');
        if (axisUpSelect) {
            axisUpSelect.value = 'z-up';
        }

        // Show dialog
        dialog.style.display = 'flex';

        // Setup event listeners
        const closeBtn = document.getElementById('stlExportDialogClose');
        const cancelBtn = document.getElementById('stlExportDialogCancel');
        const confirmBtn = document.getElementById('stlExportDialogConfirm');

        const closeDialog = () => {
            dialog.style.display = 'none';
        };

        const handleConfirm = () => {
            const axisUp = axisUpSelect ? axisUpSelect.value : 'z-up';
            closeDialog();
            this.proceedWithSTLExport(axisUp);
        };

        // Remove old listeners and add new ones
        if (closeBtn) {
            closeBtn.onclick = closeDialog;
        }
        if (cancelBtn) {
            cancelBtn.onclick = closeDialog;
        }
        if (confirmBtn) {
            confirmBtn.onclick = handleConfirm;
        }

        // Close on overlay click
        dialog.onclick = (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        };
    }

    /**
     * Get export order for object types
     * @returns {Array<string>} Ordered array of type names
     */
    getExportOrder() {
        // Order: ground, grass, waterway, highway, building, tree
        return ['ground', 'grass', 'waterway', 'highway', 'building', 'tree'];
    }

    /**
     * Proceed with STL export after user confirms settings
     */
    async proceedWithSTLExport(axisUp) {
        const scene = this.sceneManager.getScene();
        if (!scene) {
            console.error('Scene not available');
            return;
        }

        console.log('Starting STL export...');

        // Collect all meshes to export
        const meshesToExport = [];

        // 1. Get all meshes with valid types (building, highway, ground, grass, waterway)
        const validTypes = ['building', 'highway', 'ground', 'grass', 'waterway'];
        const typedMeshes = scene.meshes.filter(mesh => {
            if (!mesh || !mesh.isEnabled() || !mesh.isVisible) return false;
            if (!mesh.userData || !mesh.userData.type) return false;
            return validTypes.includes(mesh.userData.type);
        });

        console.log(`Found ${typedMeshes.length} typed meshes`);

        // Group meshes by type for proper naming
        const meshesByType = {};
        typedMeshes.forEach(mesh => {
            const type = mesh.userData.type;
            if (!meshesByType[type]) {
                meshesByType[type] = [];
            }
            meshesByType[type].push(mesh);
        });

        // Add typed meshes to export list with proper naming in specified order
        const exportOrder = this.getExportOrder();
        exportOrder.forEach(type => {
            if (!meshesByType[type]) return; // Skip if no meshes of this type
            
            meshesByType[type].forEach((mesh, index) => {
                let exportName;
                
                // For waterway, grass, and ground, use simple type name (or type1, type2, etc. if multiple)
                if (type === 'waterway' || type === 'grass' || type === 'ground') {
                    exportName = meshesByType[type].length === 1 ? type : `${type}${index + 1}`;
                }
                // For other types, use type name format
                else {
                    exportName = meshesByType[type].length === 1 ? type : `${type}${index + 1}`;
                }
                
                meshesToExport.push({
                    mesh: mesh,
                    name: exportName,
                    type: type
                });
            });
        });

        // 2. Get trees from TreeManager (last in order)
        if (this.treeManager && this.treeManager.trees) {
            const trees = this.treeManager.trees;
            console.log(`[STL Export] Found ${trees.length} trees in TreeManager`);

            trees.forEach((tree, index) => {
                console.log(`[STL Export] Processing tree ${index + 1}:`, {
                    hasParent: !!tree.parent,
                    hasMeshes: !!tree.meshes,
                    meshesCount: tree.meshes ? tree.meshes.length : 0,
                    parentType: tree.parent ? tree.parent.constructor.name : 'none',
                    treeId: tree.id,
                    treeType: tree.type
                });

                if (tree.parent && tree.meshes && tree.meshes.length > 0) {
                    // Combine all meshes of a tree into one export object
                    meshesToExport.push({
                        mesh: tree.parent, // Use parent TransformNode for transform info
                        childMeshes: tree.meshes, // All child meshes
                        name: `tree${index + 1}`, // Name: tree1, tree2, ...
                        type: 'tree'
                    });
                    console.log(`[STL Export] Added tree ${index + 1} to export list`);
                } else {
                    console.warn(`[STL Export] Tree ${index + 1} skipped:`, {
                        hasParent: !!tree.parent,
                        hasMeshes: !!tree.meshes,
                        meshesCount: tree.meshes ? tree.meshes.length : 0
                    });
                }
            });
        } else {
            console.warn('[STL Export] TreeManager or trees array not available:', {
                hasTreeManager: !!this.treeManager,
                hasTrees: !!(this.treeManager && this.treeManager.trees),
                treesLength: this.treeManager && this.treeManager.trees ? this.treeManager.trees.length : 0
            });
        }

        // 2b. Also check for trees in scene (TransformNodes with name starting with "tree")
        // This handles trees that might have been imported from STL or created in other ways
        if (scene) {
            const treeTransformNodes = scene.transformNodes.filter(node => {
                if (!node || !node.isEnabled() || !node.isVisible) return false;
                const nodeName = node.name ? node.name.toLowerCase() : '';
                return nodeName.startsWith('tree') && /^tree\d+$/.test(nodeName);
            });

            console.log(`[STL Export] Found ${treeTransformNodes.length} tree TransformNodes in scene`);

            treeTransformNodes.forEach((treeNode, index) => {
                // Get child meshes of this TransformNode
                const childMeshes = treeNode.getChildMeshes ? treeNode.getChildMeshes() : [];
                const validChildMeshes = childMeshes.filter(mesh => 
                    mesh && mesh.isEnabled() && mesh.isVisible && !mesh.isDisposed()
                );

                console.log(`[STL Export] Tree TransformNode ${treeNode.name}:`, {
                    childMeshesCount: validChildMeshes.length,
                    isInTreeManager: this.treeManager && this.treeManager.trees ? 
                        this.treeManager.trees.some(t => t.parent === treeNode) : false
                });

                // Only add if not already in TreeManager
                const alreadyInTreeManager = this.treeManager && this.treeManager.trees ? 
                    this.treeManager.trees.some(t => t.parent === treeNode) : false;

                if (!alreadyInTreeManager && validChildMeshes.length > 0) {
                    meshesToExport.push({
                        mesh: treeNode,
                        childMeshes: validChildMeshes,
                        name: treeNode.name,
                        type: 'tree'
                    });
                    console.log(`[STL Export] Added tree TransformNode ${treeNode.name} to export list (not in TreeManager)`);
                }
            });
        }

        if (meshesToExport.length === 0) {
            alert('No objects to export. Please create some buildings, roads, or other objects first.');
            return;
        }

        console.log(`Total objects to export: ${meshesToExport.length}`);

        // Generate STL content
        const stlContent = this.generateSTLContent(meshesToExport, axisUp);

        // Ask user for file location and name
        await this.saveSTLFile(stlContent);
    }
    
    /**
     * Export STL to directory handle
     * @param {FileSystemDirectoryHandle} directoryHandle - Directory handle
     * @param {string} axisUp - 'y-up' or 'z-up'
     */
    async exportSTLToDirectory(directoryHandle, axisUp = 'z-up') {
        const scene = this.sceneManager.getScene();
        if (!scene) {
            throw new Error('Scene not available');
        }

        console.log('Starting STL export to directory...');

        // Collect all meshes to export (same logic as proceedWithSTLExport)
        const meshesToExport = [];

        // 1. Get all meshes with valid types (building, highway, ground, grass, waterway)
        const validTypes = ['building', 'highway', 'ground', 'grass', 'waterway'];
        const typedMeshes = scene.meshes.filter(mesh => {
            if (!mesh || !mesh.isEnabled() || !mesh.isVisible) return false;
            if (!mesh.userData || !mesh.userData.type) return false;
            return validTypes.includes(mesh.userData.type);
        });

        console.log(`Found ${typedMeshes.length} typed meshes`);

        // Group meshes by type for proper naming
        const meshesByType = {};
        typedMeshes.forEach(mesh => {
            const type = mesh.userData.type;
            if (!meshesByType[type]) {
                meshesByType[type] = [];
            }
            meshesByType[type].push(mesh);
        });

        // Add typed meshes to export list with proper naming in specified order
        const exportOrder = this.getExportOrder();
        exportOrder.forEach(type => {
            if (!meshesByType[type]) return; // Skip if no meshes of this type
            
            meshesByType[type].forEach((mesh, index) => {
                let exportName;
                
                if (type === 'waterway' || type === 'grass' || type === 'ground') {
                    exportName = meshesByType[type].length === 1 ? type : `${type}${index + 1}`;
                } else {
                    exportName = meshesByType[type].length === 1 ? type : `${type}${index + 1}`;
                }
                
                meshesToExport.push({
                    mesh: mesh,
                    name: exportName,
                    type: type
                });
            });
        });

        // 2. Get all STL imported meshes (preserve their original type order)
        const stlMeshes = scene.meshes.filter(mesh => {
            if (!mesh || !mesh.isEnabled() || !mesh.isVisible) return false;
            return mesh.userData && mesh.userData.isImportedSTL;
        });

        console.log(`Found ${stlMeshes.length} STL imported meshes`);

        // Group STL meshes by type and add in export order
        const stlMeshesByType = {};
        stlMeshes.forEach(mesh => {
            const type = mesh.userData?.type || 'ground';
            if (!stlMeshesByType[type]) {
                stlMeshesByType[type] = [];
            }
            stlMeshesByType[type].push(mesh);
        });

        // Add STL meshes in export order
        exportOrder.forEach(type => {
            if (!stlMeshesByType[type]) return; // Skip if no STL meshes of this type
            
            stlMeshesByType[type].forEach((mesh, index) => {
                const name = mesh.name || `${type}_stl_${index + 1}`;
                meshesToExport.push({
                    mesh: mesh,
                    name: name,
                    type: type
                });
            });
        });

        // 3. Get all trees from TreeManager (last in order)
        if (this.treeManager && this.treeManager.trees) {
            const trees = this.treeManager.trees;
            console.log(`[STL Export] Found ${trees.length} trees in TreeManager (exportSTLToDirectory)`);
            
            trees.forEach((tree, index) => {
                console.log(`[STL Export] Processing tree ${index + 1} (exportSTLToDirectory):`, {
                    hasParent: !!tree.parent,
                    hasMeshes: !!tree.meshes,
                    meshesCount: tree.meshes ? tree.meshes.length : 0
                });

                if (tree.parent && tree.meshes && tree.meshes.length > 0) {
                    // Combine all meshes of a tree into one export object
                    meshesToExport.push({
                        mesh: tree.parent, // Use parent TransformNode for transform info
                        childMeshes: tree.meshes, // All child meshes
                        name: `tree${index + 1}`, // Name: tree1, tree2, ...
                        type: 'tree'
                    });
                    console.log(`[STL Export] Added tree ${index + 1} to export list (exportSTLToDirectory)`);
                } else {
                    console.warn(`[STL Export] Tree ${index + 1} skipped (exportSTLToDirectory):`, {
                        hasParent: !!tree.parent,
                        hasMeshes: !!tree.meshes,
                        meshesCount: tree.meshes ? tree.meshes.length : 0
                    });
                }
            });
        } else {
            console.warn('[STL Export] TreeManager or trees array not available (exportSTLToDirectory):', {
                hasTreeManager: !!this.treeManager,
                hasTrees: !!(this.treeManager && this.treeManager.trees)
            });
        }

        // 3b. Also check for trees in scene (TransformNodes with name starting with "tree")
        if (scene) {
            const treeTransformNodes = scene.transformNodes.filter(node => {
                if (!node || !node.isEnabled() || !node.isVisible) return false;
                const nodeName = node.name ? node.name.toLowerCase() : '';
                return nodeName.startsWith('tree') && /^tree\d+$/.test(nodeName);
            });

            console.log(`[STL Export] Found ${treeTransformNodes.length} tree TransformNodes in scene (exportSTLToDirectory)`);

            treeTransformNodes.forEach((treeNode, index) => {
                const childMeshes = treeNode.getChildMeshes ? treeNode.getChildMeshes() : [];
                const validChildMeshes = childMeshes.filter(mesh => 
                    mesh && mesh.isEnabled() && mesh.isVisible && !mesh.isDisposed()
                );

                const alreadyInTreeManager = this.treeManager && this.treeManager.trees ? 
                    this.treeManager.trees.some(t => t.parent === treeNode) : false;

                if (!alreadyInTreeManager && validChildMeshes.length > 0) {
                    meshesToExport.push({
                        mesh: treeNode,
                        childMeshes: validChildMeshes,
                        name: treeNode.name,
                        type: 'tree'
                    });
                    console.log(`[STL Export] Added tree TransformNode ${treeNode.name} to export list (exportSTLToDirectory, not in TreeManager)`);
                }
            });
        }

        console.log(`[STL Export] Total objects to export (exportSTLToDirectory): ${meshesToExport.length}`);
        const treeCount = meshesToExport.filter(obj => obj.type === 'tree').length;
        console.log(`[STL Export] Trees in export list (exportSTLToDirectory): ${treeCount}`);

        if (meshesToExport.length === 0) {
            throw new Error('No meshes to export');
        }

        const stlContent = this.generateSTLContent(meshesToExport, axisUp);

        // Save STL file to directory
        const fileHandle = await directoryHandle.getFileHandle('geometry_new.stl', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(stlContent);
        await writable.close();

        console.log('STL file saved: geometry_new.stl');
    }

    /**
     * Generate STL ASCII content from meshes
     * @param {Array} meshesToExport - Array of meshes to export
     * @param {string} axisUp - 'y-up' or 'z-up'
     */
    generateSTLContent(meshesToExport, axisUp = 'z-up') {
        let stlContent = '';

        console.log(`[STL Export] Generating STL content for ${meshesToExport.length} objects`);

        meshesToExport.forEach((obj, index) => {
            const objectName = obj.name || `object_${index + 1}`;
            stlContent += `solid ${objectName}\n`;

            if (obj.type === 'tree') {
                // Handle trees: combine all child meshes
                // Note: getWorldMatrix() of child meshes already includes parent TransformNode transform
                console.log(`[STL Export] Processing tree: ${objectName}`, {
                    hasChildMeshes: !!obj.childMeshes,
                    childMeshesCount: obj.childMeshes ? obj.childMeshes.length : 0
                });

                if (obj.childMeshes && obj.childMeshes.length > 0) {
                    let treeTriangleCount = 0;
                    obj.childMeshes.forEach((childMesh, meshIndex) => {
                        console.log(`[STL Export] Processing child mesh ${meshIndex + 1} of tree ${objectName}:`, {
                            meshName: childMesh.name,
                            isEnabled: childMesh.isEnabled(),
                            isVisible: childMesh.isVisible
                        });
                        const triangles = this.meshToTriangles(childMesh);
                        console.log(`[STL Export] Child mesh ${meshIndex + 1} has ${triangles.length} triangles`);
                        treeTriangleCount += triangles.length;
                        triangles.forEach(triangle => {
                            stlContent += this.triangleToSTL(triangle, axisUp);
                        });
                    });
                    console.log(`[STL Export] Tree ${objectName} total triangles: ${treeTriangleCount}`);
                } else {
                    console.warn(`[STL Export] Tree ${objectName} has no child meshes!`);
                }
            } else {
                // Handle regular meshes
                const triangles = this.meshToTriangles(obj.mesh);
                triangles.forEach(triangle => {
                    stlContent += this.triangleToSTL(triangle, axisUp);
                });
            }

            stlContent += `endsolid ${objectName}\n`;
        });

        console.log(`[STL Export] STL content generated, length: ${stlContent.length} characters`);
        return stlContent;
    }

    /**
     * Generate STL content for zip export
     * @param {string} axisUp - 'y-up' or 'z-up'
     * @returns {string} STL content as string
     */
    async generateSTLContentForZip(axisUp = 'y-up') {
        const scene = this.sceneManager.getScene();
        if (!scene) {
            throw new Error('Scene not available');
        }

        console.log('Generating STL content for zip...');

        // Collect all meshes to export (same logic as exportSTLToDirectory)
        const meshesToExport = [];

        // 1. Get all meshes with valid types (building, highway, ground, grass, waterway)
        const validTypes = ['building', 'highway', 'ground', 'grass', 'waterway'];
        const typedMeshes = scene.meshes.filter(mesh => {
            if (!mesh || !mesh.isEnabled() || !mesh.isVisible) return false;
            if (!mesh.userData || !mesh.userData.type) return false;
            return validTypes.includes(mesh.userData.type);
        });

        console.log(`Found ${typedMeshes.length} typed meshes`);

        // Group meshes by type for proper naming
        const meshesByType = {};
        typedMeshes.forEach(mesh => {
            const type = mesh.userData.type;
            if (!meshesByType[type]) {
                meshesByType[type] = [];
            }
            meshesByType[type].push(mesh);
        });

        // Add typed meshes to export list with proper naming in specified order
        const exportOrder = this.getExportOrder();
        exportOrder.forEach(type => {
            if (!meshesByType[type]) return; // Skip if no meshes of this type
            
            meshesByType[type].forEach((mesh, index) => {
                let exportName;
                
                if (type === 'waterway' || type === 'grass' || type === 'ground') {
                    exportName = meshesByType[type].length === 1 ? type : `${type}${index + 1}`;
                } else {
                    exportName = meshesByType[type].length === 1 ? type : `${type}${index + 1}`;
                }
                
                meshesToExport.push({
                    mesh: mesh,
                    name: exportName,
                    type: type
                });
            });
        });

        // 2. Get all STL imported meshes (preserve their original type order)
        const stlMeshes = scene.meshes.filter(mesh => {
            if (!mesh || !mesh.isEnabled() || !mesh.isVisible) return false;
            return mesh.userData && mesh.userData.isImportedSTL;
        });

        console.log(`Found ${stlMeshes.length} STL imported meshes`);

        // Group STL meshes by type and add in export order
        const stlMeshesByType = {};
        stlMeshes.forEach(mesh => {
            const type = mesh.userData?.type || 'ground';
            if (!stlMeshesByType[type]) {
                stlMeshesByType[type] = [];
            }
            stlMeshesByType[type].push(mesh);
        });

        // Add STL meshes in export order
        exportOrder.forEach(type => {
            if (!stlMeshesByType[type]) return; // Skip if no STL meshes of this type
            
            stlMeshesByType[type].forEach((mesh, index) => {
                const name = mesh.name || `${type}_stl_${index + 1}`;
                meshesToExport.push({
                    mesh: mesh,
                    name: name,
                    type: type
                });
            });
        });

        // 3. Get all trees from TreeManager (last in order)
        if (this.treeManager && this.treeManager.trees) {
            const trees = this.treeManager.trees;
            console.log(`[STL Export] Found ${trees.length} trees in TreeManager (generateSTLContentForZip)`);
            
            trees.forEach((tree, index) => {
                console.log(`[STL Export] Processing tree ${index + 1} (generateSTLContentForZip):`, {
                    hasParent: !!tree.parent,
                    hasMeshes: !!tree.meshes,
                    meshesCount: tree.meshes ? tree.meshes.length : 0
                });

                if (tree.parent && tree.meshes && tree.meshes.length > 0) {
                    // Combine all meshes of a tree into one export object
                    meshesToExport.push({
                        mesh: tree.parent, // Use parent TransformNode for transform info
                        childMeshes: tree.meshes, // All child meshes
                        name: `tree${index + 1}`, // Name: tree1, tree2, ...
                        type: 'tree'
                    });
                    console.log(`[STL Export] Added tree ${index + 1} to export list (generateSTLContentForZip)`);
                } else {
                    console.warn(`[STL Export] Tree ${index + 1} skipped (generateSTLContentForZip):`, {
                        hasParent: !!tree.parent,
                        hasMeshes: !!tree.meshes,
                        meshesCount: tree.meshes ? tree.meshes.length : 0
                    });
                }
            });
        } else {
            console.warn('[STL Export] TreeManager or trees array not available (generateSTLContentForZip):', {
                hasTreeManager: !!this.treeManager,
                hasTrees: !!(this.treeManager && this.treeManager.trees)
            });
        }

        // 3b. Also check for trees in scene (TransformNodes with name starting with "tree")
        if (scene) {
            const treeTransformNodes = scene.transformNodes.filter(node => {
                if (!node || !node.isEnabled() || !node.isVisible) return false;
                const nodeName = node.name ? node.name.toLowerCase() : '';
                return nodeName.startsWith('tree') && /^tree\d+$/.test(nodeName);
            });

            console.log(`[STL Export] Found ${treeTransformNodes.length} tree TransformNodes in scene (generateSTLContentForZip)`);

            treeTransformNodes.forEach((treeNode, index) => {
                const childMeshes = treeNode.getChildMeshes ? treeNode.getChildMeshes() : [];
                const validChildMeshes = childMeshes.filter(mesh => 
                    mesh && mesh.isEnabled() && mesh.isVisible && !mesh.isDisposed()
                );

                const alreadyInTreeManager = this.treeManager && this.treeManager.trees ? 
                    this.treeManager.trees.some(t => t.parent === treeNode) : false;

                if (!alreadyInTreeManager && validChildMeshes.length > 0) {
                    meshesToExport.push({
                        mesh: treeNode,
                        childMeshes: validChildMeshes,
                        name: treeNode.name,
                        type: 'tree'
                    });
                    console.log(`[STL Export] Added tree TransformNode ${treeNode.name} to export list (generateSTLContentForZip, not in TreeManager)`);
                }
            });
        }

        console.log(`[STL Export] Total objects to export: ${meshesToExport.length}`);
        const treeCount = meshesToExport.filter(obj => obj.type === 'tree').length;
        console.log(`[STL Export] Trees in export list: ${treeCount}`);

        if (meshesToExport.length === 0) {
            console.warn('No meshes to export');
            return '';
        }

        return this.generateSTLContent(meshesToExport, axisUp);
    }

    /**
     * Convert a mesh to triangles with world positions
     * Note: For child meshes parented to TransformNode, getWorldMatrix() automatically includes parent transform
     */
    meshToTriangles(mesh) {
        if (!mesh) {
            console.warn('[STL Export] meshToTriangles: mesh is null or undefined');
            return [];
        }

        if (!mesh.isEnabled()) {
            console.warn(`[STL Export] meshToTriangles: mesh ${mesh.name} is not enabled`);
            return [];
        }

        try {
            // Get vertex data from mesh
            const vertexData = BABYLON.VertexData.ExtractFromMesh(mesh);
            if (!vertexData.positions || vertexData.positions.length === 0) {
                console.warn(`[STL Export] meshToTriangles: mesh ${mesh.name} has no positions`);
                return [];
            }

            const positions = vertexData.positions;
            const indices = vertexData.indices || [];

            // If no indices, create them (assuming triangles)
            let triangleIndices = indices;
            if (triangleIndices.length === 0) {
                triangleIndices = [];
                for (let i = 0; i < positions.length; i += 3) {
                    triangleIndices.push(i, i + 1, i + 2);
                }
            }

            const triangles = [];

            // Process each triangle
            for (let i = 0; i < triangleIndices.length; i += 3) {
                const i0 = triangleIndices[i] * 3;
                const i1 = triangleIndices[i + 1] * 3;
                const i2 = triangleIndices[i + 2] * 3;

                // Get vertex positions (local to mesh)
                const v0 = new BABYLON.Vector3(positions[i0], positions[i0 + 1], positions[i0 + 2]);
                const v1 = new BABYLON.Vector3(positions[i1], positions[i1 + 1], positions[i1 + 2]);
                const v2 = new BABYLON.Vector3(positions[i2], positions[i2 + 1], positions[i2 + 2]);

                // Use mesh's world matrix - this automatically includes parent transforms
                // For child meshes parented to TransformNode, getWorldMatrix() already accounts for parent
                const worldMatrix = mesh.getWorldMatrix();
                const finalV0 = BABYLON.Vector3.TransformCoordinates(v0, worldMatrix);
                const finalV1 = BABYLON.Vector3.TransformCoordinates(v1, worldMatrix);
                const finalV2 = BABYLON.Vector3.TransformCoordinates(v2, worldMatrix);

                // Calculate normal
                const normal = this.calculateTriangleNormal(finalV0, finalV1, finalV2);

                triangles.push({
                    normal: normal,
                    vertices: [finalV0, finalV1, finalV2]
                });
            }

            return triangles;
        } catch (error) {
            console.error(`Error converting mesh ${mesh.name} to triangles:`, error);
            return [];
        }
    }

    /**
     * Calculate triangle normal
     */
    calculateTriangleNormal(v0, v1, v2) {
        const edge1 = v1.subtract(v0);
        const edge2 = v2.subtract(v0);
        const normal = BABYLON.Vector3.Cross(edge1, edge2);
        normal.normalize();
        return normal;
    }

    /**
     * Convert a triangle to STL format
     * @param {Object} triangle - Triangle with normal and vertices
     * @param {string} axisUp - 'y-up' or 'z-up'
     */
    triangleToSTL(triangle, axisUp = 'z-up') {
        const normal = triangle.normal;
        const v0 = triangle.vertices[0];
        const v1 = triangle.vertices[1];
        const v2 = triangle.vertices[2];

        // Format: scientific notation with 6 decimal places (as in sample file)
        // Example: 0.000000e+00, 4.667083e+06
        const formatFloat = (val) => {
            // Use toExponential with 6 decimal places
            let str = val.toExponential(6);
            // Ensure positive exponent has + sign and is 2 digits
            str = str.replace(/e\+?(\d+)/, (match, exp) => {
                const expNum = parseInt(exp);
                const sign = expNum >= 0 ? '+' : '-';
                return 'e' + sign + Math.abs(expNum).toString().padStart(2, '0');
            });
            // Ensure negative exponent has - sign and is 2 digits
            str = str.replace(/e-(\d+)/, (match, exp) => {
                return 'e-' + exp.padStart(2, '0');
            });
            return str;
        };

        let stlNormal, stlV0, stlV1, stlV2;

        if (axisUp === 'z-up') {
            // Convert from Babylon.js coordinate system (X, Y, Z) to STL coordinate system (X, Z, Y)
            // Babylon: X=right, Y=up, Z=forward
            // STL: X=right, Y=forward, Z=up
            // So we swap Y and Z: (x, y, z) -> (x, z, y)
            const convertNormal = (n) => {
                return { x: n.x, y: n.z, z: n.y };
            };
            const convertVertex = (v) => {
                return { x: v.x, y: v.z, z: v.y };
            };

            stlNormal = convertNormal(normal);
            stlV0 = convertVertex(v0);
            stlV1 = convertVertex(v1);
            stlV2 = convertVertex(v2);
        } else {
            // Y-up: Keep Babylon.js coordinate system but reverse Z axis (flip forward/backward direction)
            stlNormal = { x: normal.x, y: normal.y, z: -normal.z };
            stlV0 = { x: v0.x, y: v0.y, z: -v0.z };
            stlV1 = { x: v1.x, y: v1.y, z: -v1.z };
            stlV2 = { x: v2.x, y: v2.y, z: -v2.z };
        }

        let stl = `  facet normal ${formatFloat(stlNormal.x)} ${formatFloat(stlNormal.y)} ${formatFloat(stlNormal.z)}\n`;
        stl += `    outer loop\n`;
        stl += `      vertex ${formatFloat(stlV0.x)} ${formatFloat(stlV0.y)} ${formatFloat(stlV0.z)}\n`;
        stl += `      vertex ${formatFloat(stlV1.x)} ${formatFloat(stlV1.y)} ${formatFloat(stlV1.z)}\n`;
        stl += `      vertex ${formatFloat(stlV2.x)} ${formatFloat(stlV2.y)} ${formatFloat(stlV2.z)}\n`;
        stl += `    endloop\n`;
        stl += `  endfacet\n`;

        return stl;
    }

    /**
     * Save STL file using File System Access API (if available) or fallback to download
     * @param {string} content - STL file content
     */
    async saveSTLFile(content) {
        // Check if File System Access API is supported
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: 'scene_export.stl',
                    types: [{
                        description: 'STL Files',
                        accept: {
                            'application/octet-stream': ['.stl'],
                            'text/plain': ['.stl']
                        }
                    }]
                });

                // Create a writable stream
                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();

                console.log(`STL file saved: ${fileHandle.name}`);
                alert(`File saved successfully: ${fileHandle.name}`);
            } catch (error) {
                // User cancelled or error occurred
                if (error.name !== 'AbortError') {
                    console.error('Error saving file:', error);
                    // Fallback to download
                    this.downloadSTLFile(content, 'scene_export.stl');
                }
            }
        } else {
            // Fallback to download method for browsers that don't support File System Access API
            this.downloadSTLFile(content, 'scene_export.stl');
        }
    }

    /**
     * Download STL file (fallback method)
     * @param {string} content - STL file content
     * @param {string} filename - Default filename
     */
    downloadSTLFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log(`STL file exported: ${filename}`);
    }

    /**
     * Set smoothing angle threshold
     */
    setSmoothingAngleThreshold(threshold) {
        this.smoothingAngleThreshold = threshold;
    }

    /**
     * Update rendering groups for all imported STL meshes
     * This ensures all meshes (including child meshes) have correct renderingGroupId
     * @param {BABYLON.Scene} scene - The scene
     * @param {Array} objects - Array of parsed STL objects
     */
    updateRenderingGroupsForImportedMeshes(scene, objects) {
        if (!scene) return;

        console.log('[STL Import] Updating rendering groups for all imported meshes...');

        // Get all meshes that were imported from STL
        const importedMeshes = scene.meshes.filter(mesh => {
            return mesh && 
                   mesh.userData && 
                   mesh.userData.isImportedSTL &&
                   mesh.isEnabled() &&
                   !mesh.isDisposed();
        });

        console.log(`[STL Import] Found ${importedMeshes.length} imported meshes to update`);

        // Update renderingGroupId for each mesh based on its type
        importedMeshes.forEach(mesh => {
            const type = mesh.userData?.type || 'ground';
            const expectedRenderingGroupId = SceneManager.getRenderingGroupId(type);
            
            // IMPORTANT: Log highway meshes specifically for debugging
            if (type === 'highway') {
                console.log(`[STL Import] Highway mesh found: ${mesh.name}`, {
                    type: type,
                    renderingGroupId: mesh.renderingGroupId,
                    expectedRenderingGroupId: expectedRenderingGroupId,
                    isVisible: mesh.isVisible,
                    isEnabled: mesh.isEnabled(),
                    hasMaterial: !!mesh.material,
                    materialAlpha: mesh.material?.alpha,
                    materialDiffuseColor: mesh.material?.diffuseColor,
                    position: mesh.position,
                    inScene: scene.meshes.includes(mesh)
                });
            }
            
            // IMPORTANT: Ensure mesh is visible and enabled
            if (!mesh.isVisible) {
                console.log(`[STL Import] Making mesh visible: ${mesh.name} (type: ${type})`);
                mesh.isVisible = true;
            }
            if (!mesh.isEnabled()) {
                console.log(`[STL Import] Enabling mesh: ${mesh.name} (type: ${type})`);
                mesh.setEnabled(true);
            }
            
            // Ensure mesh is in the scene
            if (!scene.meshes.includes(mesh)) {
                console.log(`[STL Import] Adding mesh to scene: ${mesh.name} (type: ${type})`);
                scene.addMesh(mesh);
            }
            
            // IMPORTANT: Ensure material is properly set for highway
            if (type === 'highway' && mesh.material) {
                // Ensure material is visible (alpha > 0)
                if (mesh.material.alpha === undefined || mesh.material.alpha === 0) {
                    console.log(`[STL Import] Fixing material alpha for highway ${mesh.name}: ${mesh.material.alpha} -> 1.0`);
                    mesh.material.alpha = 1.0;
                }
                // Ensure material has correct color
                const expectedColor = this.uiManager && this.uiManager.getColorByType ? 
                    this.uiManager.getColorByType('highway') : 
                    new BABYLON.Color3(0.3, 0.3, 0.3);
                if (!mesh.material.diffuseColor || 
                    Math.abs(mesh.material.diffuseColor.r - expectedColor.r) > 0.01 ||
                    Math.abs(mesh.material.diffuseColor.g - expectedColor.g) > 0.01 ||
                    Math.abs(mesh.material.diffuseColor.b - expectedColor.b) > 0.01) {
                    console.log(`[STL Import] Fixing material color for highway ${mesh.name}`);
                    mesh.material.diffuseColor = expectedColor.clone();
                }
            }
            
            // Update renderingGroupId if it's not set correctly
            if (mesh.renderingGroupId !== expectedRenderingGroupId) {
                console.log(`[STL Import] Updating renderingGroupId for ${mesh.name}: ${mesh.renderingGroupId} -> ${expectedRenderingGroupId} (type: ${type})`);
                mesh.renderingGroupId = expectedRenderingGroupId;
            }

            // IMPORTANT: Check for child meshes and update their renderingGroupId too
            // This handles cases where a mesh might have child meshes (though rare in STL)
            if (mesh.getChildMeshes && typeof mesh.getChildMeshes === 'function') {
                try {
                    const childMeshes = mesh.getChildMeshes();
                    if (childMeshes && childMeshes.length > 0) {
                        console.log(`[STL Import] Found ${childMeshes.length} child meshes for ${mesh.name}`);
                        childMeshes.forEach(childMesh => {
                            if (childMesh instanceof BABYLON.Mesh && !childMesh.isDisposed()) {
                                // Use the same renderingGroupId as parent, or determine from child's type if available
                                const childType = childMesh.userData?.type || type;
                                const childRenderingGroupId = SceneManager.getRenderingGroupId(childType);
                                
                                if (childMesh.renderingGroupId !== childRenderingGroupId) {
                                    console.log(`[STL Import] Updating renderingGroupId for child mesh ${childMesh.name}: ${childMesh.renderingGroupId} -> ${childRenderingGroupId} (type: ${childType})`);
                                    childMesh.renderingGroupId = childRenderingGroupId;
                                }
                            }
                        });
                    }
                } catch (error) {
                    console.warn(`[STL Import] Error getting child meshes for ${mesh.name}:`, error);
                }
            }
        });

        // Also check TransformNodes that might have been imported
        const importedTransformNodes = scene.transformNodes.filter(node => {
            return node && 
                   node.userData && 
                   node.userData.isImportedSTL &&
                   node.isEnabled() &&
                   !node.isDisposed();
        });

        if (importedTransformNodes.length > 0) {
            console.log(`[STL Import] Found ${importedTransformNodes.length} imported TransformNodes`);
            importedTransformNodes.forEach(transformNode => {
                const type = transformNode.userData?.type || 'ground';
                const expectedRenderingGroupId = SceneManager.getRenderingGroupId(type);
                
                // Update child meshes of TransformNode
                if (transformNode.getChildMeshes && typeof transformNode.getChildMeshes === 'function') {
                    try {
                        const childMeshes = transformNode.getChildMeshes();
                        if (childMeshes && childMeshes.length > 0) {
                            console.log(`[STL Import] Found ${childMeshes.length} child meshes for TransformNode ${transformNode.name}`);
                            childMeshes.forEach(childMesh => {
                                if (childMesh instanceof BABYLON.Mesh && !childMesh.isDisposed()) {
                                    // Use the same renderingGroupId as parent, or determine from child's type if available
                                    const childType = childMesh.userData?.type || type;
                                    const childRenderingGroupId = SceneManager.getRenderingGroupId(childType);
                                    
                                    if (childMesh.renderingGroupId !== childRenderingGroupId) {
                                        console.log(`[STL Import] Updating renderingGroupId for child mesh ${childMesh.name}: ${childMesh.renderingGroupId} -> ${childRenderingGroupId} (type: ${childType})`);
                                        childMesh.renderingGroupId = childRenderingGroupId;
                                    }
                                }
                            });
                        }
                    } catch (error) {
                        console.warn(`[STL Import] Error getting child meshes for TransformNode ${transformNode.name}:`, error);
                    }
                }
            });
        }

        // IMPORTANT: Final check for highway meshes specifically
        const highwayMeshes = importedMeshes.filter(mesh => mesh.userData?.type === 'highway');
        if (highwayMeshes.length > 0) {
            console.log(`[STL Import] Final check for ${highwayMeshes.length} highway meshes:`);
            highwayMeshes.forEach(mesh => {
                const issues = [];
                if (!mesh.isVisible) issues.push('not visible');
                if (!mesh.isEnabled()) issues.push('not enabled');
                if (!scene.meshes.includes(mesh)) issues.push('not in scene');
                if (mesh.renderingGroupId !== 4) issues.push(`wrong renderingGroupId (${mesh.renderingGroupId} instead of 4)`);
                if (!mesh.material) issues.push('no material');
                if (mesh.material && mesh.material.alpha === 0) issues.push('material alpha is 0');
                if (mesh.material && !mesh.material.diffuseColor) issues.push('no material color');
                
                if (issues.length > 0) {
                    console.warn(`[STL Import] Highway mesh ${mesh.name} has issues:`, issues);
                } else {
                    console.log(`[STL Import] Highway mesh ${mesh.name} is OK:`, {
                        renderingGroupId: mesh.renderingGroupId,
                        isVisible: mesh.isVisible,
                        isEnabled: mesh.isEnabled(),
                        hasMaterial: !!mesh.material,
                        materialColor: mesh.material?.diffuseColor,
                        position: mesh.position
                    });
                }
            });
        }

        console.log('[STL Import] Rendering groups update completed');
    }
}

