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
                // Use setTimeout to allow UI to update
                setTimeout(() => {
                    try {
                        this.parseSTLFile(content, clearScene, axisUp, flipNormals);
                    } catch (parseError) {
                        console.error('Error parsing STL file:', parseError);
                        this.hideSTLImportLoading();
                        alert('Error parsing STL file. Please check the file format and try again.');
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
     */
    updateSTLImportLoadingStatus(status) {
        const statusElement = document.getElementById('stlImportLoadingStatus');
        if (statusElement) {
            statusElement.textContent = status;
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
    parseSTLFile(content, clearScene = false, axisUp = 'y-up', flipNormals = false) {
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

            // Parse STL file line by line
            for (let i = 0; i < lines.length; i++) {
                // Update progress every 10000 lines
                if (i % 10000 === 0 && i > 0) {
                    const progress = Math.round((i / totalLines) * 100);
                    this.updateSTLImportLoadingStatus(`Parsing STL file... ${progress}%`);
                }
                
                const line = lines[i].trim();

                // Check for solid start
                if (line.startsWith('solid ')) {
                    const objectName = line.substring(6).trim();
                    currentObject = {
                        name: objectName,
                        type: this.detectTypeFromName(objectName),
                        triangles: []
                    };
                    console.log(`Found solid: ${objectName}, type: ${currentObject.type}`);
                }
                // Check for solid end
                else if (line.startsWith('endsolid ')) {
                    if (currentObject && currentObject.triangles.length > 0) {
                        objects.push(currentObject);
                    }
                    currentObject = null;
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
                            // STL format: (X, Y, Z) where Y=up, Z=forward (same as Babylon.js)
                            // No conversion needed
                            normal = {
                                x: stlX,
                                y: stlY,
                                z: stlZ
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
                            // STL format: (X, Y, Z) where Y=up, Z=forward (same as Babylon.js)
                            // No conversion needed
                            vertex = {
                                x: stlX,
                                y: stlY,
                                z: stlZ
                            };
                        }
                        
                        currentTriangle.vertices.push(vertex);
                        vertexCount++;
                    }
                }
            }

            console.log(`Parsed ${objects.length} objects from STL file`);
            this.updateSTLImportLoadingStatus(`Creating meshes... (${objects.length} objects)`);

            // Create meshes from parsed objects
            let createdCount = 0;
            objects.forEach((obj, index) => {
                try {
                    this.updateSTLImportLoadingStatus(`Creating mesh ${index + 1}/${objects.length}: ${obj.name}`);
                    const mesh = this.createMeshFromSTLObject(obj, scene);
                    if (mesh) {
                        createdCount++;
                    }
                } catch (error) {
                    console.error(`Error creating mesh for ${obj.name}:`, error);
                }
            });

            console.log(`Created ${createdCount} meshes from STL file`);
            this.updateSTLImportLoadingStatus('Finalizing...');

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
     */
    createMeshFromSTLObject(obj, scene) {
        if (!obj || !obj.triangles || obj.triangles.length === 0) {
            return null;
        }

        // Collect all vertices and create indices
        // Use a smarter approach: group vertices by position AND normal similarity
        // This allows proper smoothing while preserving hard edges
        const positions = [];
        const indices = [];
        const normals = [];
        const vertexMap = new Map(); // key -> array of {index, normal, triangleIndex}
        // Use smoothing angle threshold from preferences (convert degrees to cosine)
        // Note: We invert the angle (180 - angle) so that higher slider values = more smoothing
        // cos(0°) = 1 (less smoothing), cos(180°) = -1 (more smoothing)
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
        
        // Second pass: calculate final normals for all vertices
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
        
        // Log smoothing information
        console.log(`[STL Import] ${obj.name} - Smoothing Info:`, {
            totalPositions: smoothingStats.totalVertices,
            smoothedVertices: smoothingStats.smoothedVertices,
            hardEdges: smoothingStats.hardEdges,
            uniqueNormalCount: smoothingStats.uniqueNormals.size,
            maxVariantsPerPosition: smoothingStats.maxVariantsPerPosition,
            note: 'STL format does not have smoothing groups. Smoothing uses 60° angle threshold to preserve hard edges.'
        });

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
        // Note: STL format doesn't have smoothing groups, so we smooth by averaging
        // normals of all triangles sharing each vertex
        vertexData.normals = normals;

        // Apply vertex data to mesh
        vertexData.applyToMesh(mesh);

        // Calculate bounding box to determine mesh center and minimum Y
        mesh.refreshBoundingInfo();
        const boundingInfo = mesh.getBoundingInfo();
        const min = boundingInfo.boundingBox.minimum;
        const max = boundingInfo.boundingBox.maximum;
        const center = new BABYLON.Vector3(
            (min.x + max.x) / 2,
            (min.y + max.y) / 2,
            (min.z + max.z) / 2
        );
        const originalMinY = min.y; // Store original minimum Y before offset

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
        // ComputeNormals calculates normals based on triangle winding order (counter-clockwise = upward)
        const recalculatedNormals = [];
        BABYLON.VertexData.ComputeNormals(adjustedPositions, indices, recalculatedNormals);
        mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, recalculatedNormals);
        
        mesh.refreshBoundingInfo();
        
        // Calculate minimum Y after offset (in local space, should be negative or zero)
        const updatedBoundingInfo = mesh.getBoundingInfo();
        const updatedMin = updatedBoundingInfo.boundingBox.minimum;
        const updatedMax = updatedBoundingInfo.boundingBox.maximum;
        const localMinY = updatedMin.y;
        
        // Calculate world-space minimum Y for gizmo positioning
        const worldMinY = mesh.position.y + localMinY;

        // Set mesh properties based on type
        mesh.renderingGroupId = 1;

        // Create material based on type - ensure color is set correctly
        const material = new BABYLON.StandardMaterial(`${obj.name}Material`, scene);
        const color = (this.uiManager && this.uiManager.getColorByType) ? 
            this.uiManager.getColorByType(obj.type) : 
            new BABYLON.Color3(0.8, 0.8, 0.8);
        material.diffuseColor = color;
        material.backFaceCulling = false; // 2-sided
        material.twoSidedLighting = true; // Enable lighting on both sides
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        material.roughness = 0.7;
        mesh.material = material;

        // Enable edges rendering
        mesh.enableEdgesRendering();
        mesh.edgesWidth = 1.0;
        mesh.edgesColor = new BABYLON.Color4(0, 0, 0, 1);
        
        // Set userData based on type
        // Store original STL data for real-time smoothing updates
        const originalSTLDataCopy = JSON.parse(JSON.stringify(obj));
        
        // Remove period properties from originalSTLData if they exist
        delete originalSTLDataCopy.startPeriod;
        delete originalSTLDataCopy.endPeriod;
        delete originalSTLDataCopy.buildingArchetypePeriod;
        delete originalSTLDataCopy.buildingGroupPeriod;
        
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
            originalSTLData: originalSTLDataCopy // Deep copy of original STL data for rebuilding (without period properties)
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

        // Update shadows
        if (this.lightingManager) {
            this.lightingManager.updateShadowsForNewObject(mesh);
        }

        console.log(`Created mesh: ${obj.name} (type: ${obj.type}, triangles: ${obj.triangles.length})`);

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

        // Add typed meshes to export list with proper naming
        Object.keys(meshesByType).forEach(type => {
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

        // 2. Get trees from TreeManager
        if (this.treeManager && this.treeManager.trees) {
            const trees = this.treeManager.trees;
            console.log(`Found ${trees.length} trees`);

            trees.forEach((tree, index) => {
                if (tree.parent && tree.meshes && tree.meshes.length > 0) {
                    // Combine all meshes of a tree into one export object
                    meshesToExport.push({
                        mesh: tree.parent, // Use parent TransformNode for transform info
                        childMeshes: tree.meshes, // All child meshes
                        name: `tree${index + 1}`, // Name: tree1, tree2, ...
                        type: 'tree'
                    });
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

        // Add typed meshes to export list with proper naming
        Object.keys(meshesByType).forEach(type => {
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

        // 2. Get all STL imported meshes
        const stlMeshes = scene.meshes.filter(mesh => {
            if (!mesh || !mesh.isEnabled() || !mesh.isVisible) return false;
            return mesh.userData && mesh.userData.isImportedSTL;
        });

        console.log(`Found ${stlMeshes.length} STL imported meshes`);

        stlMeshes.forEach((mesh, index) => {
            const name = mesh.name || `stl_import_${index + 1}`;
            meshesToExport.push({
                mesh: mesh,
                name: name,
                type: 'stl'
            });
        });

        // 3. Get all trees from TreeManager (same logic as proceedWithSTLExport)
        if (this.treeManager && this.treeManager.trees) {
            const trees = this.treeManager.trees;
            console.log(`Found ${trees.length} trees`);
            
            trees.forEach((tree, index) => {
                if (tree.parent && tree.meshes && tree.meshes.length > 0) {
                    // Combine all meshes of a tree into one export object
                    meshesToExport.push({
                        mesh: tree.parent, // Use parent TransformNode for transform info
                        childMeshes: tree.meshes, // All child meshes
                        name: `tree${index + 1}`, // Name: tree1, tree2, ...
                        type: 'tree'
                    });
                }
            });
        }

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

        meshesToExport.forEach((obj, index) => {
            const objectName = obj.name || `object_${index + 1}`;
            stlContent += `solid ${objectName}\n`;

            if (obj.type === 'tree') {
                // Handle trees: combine all child meshes
                // Note: getWorldMatrix() of child meshes already includes parent TransformNode transform
                if (obj.childMeshes && obj.childMeshes.length > 0) {
                    obj.childMeshes.forEach(childMesh => {
                        const triangles = this.meshToTriangles(childMesh);
                        triangles.forEach(triangle => {
                            stlContent += this.triangleToSTL(triangle, axisUp);
                        });
                    });
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

        // Add typed meshes to export list with proper naming
        Object.keys(meshesByType).forEach(type => {
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

        // 2. Get all STL imported meshes
        const stlMeshes = scene.meshes.filter(mesh => {
            if (!mesh || !mesh.isEnabled() || !mesh.isVisible) return false;
            return mesh.userData && mesh.userData.isImportedSTL;
        });

        console.log(`Found ${stlMeshes.length} STL imported meshes`);

        stlMeshes.forEach((mesh, index) => {
            const name = mesh.name || `stl_import_${index + 1}`;
            meshesToExport.push({
                mesh: mesh,
                name: name,
                type: 'stl'
            });
        });

        // 3. Get all trees from TreeManager
        if (this.treeManager && this.treeManager.trees) {
            const trees = this.treeManager.trees;
            console.log(`Found ${trees.length} trees`);
            
            trees.forEach((tree, index) => {
                if (tree.parent && tree.meshes && tree.meshes.length > 0) {
                    // Combine all meshes of a tree into one export object
                    meshesToExport.push({
                        mesh: tree.parent, // Use parent TransformNode for transform info
                        childMeshes: tree.meshes, // All child meshes
                        name: `tree${index + 1}`, // Name: tree1, tree2, ...
                        type: 'tree'
                    });
                }
            });
        }

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
        if (!mesh || !mesh.isEnabled()) return [];

        try {
            // Get vertex data from mesh
            const vertexData = BABYLON.VertexData.ExtractFromMesh(mesh);
            if (!vertexData.positions || vertexData.positions.length === 0) {
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
            // Y-up: Keep Babylon.js coordinate system as is
            stlNormal = { x: normal.x, y: normal.y, z: normal.z };
            stlV0 = { x: v0.x, y: v0.y, z: v0.z };
            stlV1 = { x: v1.x, y: v1.y, z: v1.z };
            stlV2 = { x: v2.x, y: v2.y, z: v2.z };
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
}

