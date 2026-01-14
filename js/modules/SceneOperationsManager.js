/**
 * SceneOperationsManager - Manages scene operations like duplicate, delete, and empty scene
 */
class SceneOperationsManager {
    constructor(sceneManager, selectionManager, treeManager, lightingManager, buildingGenerator, 
                shape2DManager, polygonManager, rectangleManager, circleManager, stlManager, objectListManager, cameraController, uiManager) {
        this.sceneManager = sceneManager;
        this.selectionManager = selectionManager;
        this.treeManager = treeManager;
        this.lightingManager = lightingManager;
        this.buildingGenerator = buildingGenerator;
        this.shape2DManager = shape2DManager;
        this.polygonManager = polygonManager;
        this.rectangleManager = rectangleManager;
        this.circleManager = circleManager;
        this.stlManager = stlManager;
        this.objectListManager = objectListManager;
        this.cameraController = cameraController;
        this.uiManager = uiManager;
    }

    /**
     * Set object list manager (called after initialization)
     */
    setObjectListManager(objectListManager) {
        this.objectListManager = objectListManager;
    }

    /**
     * Dispatch scene change event to update object list
     */
    dispatchSceneChangeEvent() {
        const event = new CustomEvent('sceneChanged', {
            detail: { timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    /**
     * Duplicate selected objects - NEW ALGORITHM: Create from scratch instead of cloning
     */
    duplicateSelected() {
        if (!this.selectionManager) {
            console.log('SelectionManager not available');
            return;
        }

        const selectedObjects = this.selectionManager.getSelectedObjects();
        if (selectedObjects.length === 0) {
            console.log('No objects selected to duplicate');
            return;
        }

        console.log(`Duplicating ${selectedObjects.length} selected objects using new algorithm`);

        const duplicatedObjects = [];
        // No offset - duplicate should be at exact same position as original
        const scene = this.sceneManager.getScene();

        selectedObjects.forEach((obj, index) => {
            try {
                // Skip if object is an extrusion (we'll duplicate the parent shape instead)
                if (obj.name && obj.name.includes('_extrusion')) {
                    console.log(`Skipping extrusion ${obj.name}, will be handled by parent shape`);
                    return;
                }

                // Get object properties
                // Check if it's a tree TransformNode FIRST (before getShapeType which might return wrong type)
                const isTreeTransformNode = obj instanceof BABYLON.TransformNode && this.treeManager && 
                    (this.isTree(obj) || obj.name.startsWith('tree') || obj.name.includes('_tree_'));
                
                const shapeType = isTreeTransformNode ? 'tree' : this.getShapeType(obj);
                
                // IMPORTANT: Deep clone userData, but preserve Vector3 objects in points array
                // JSON.parse/stringify may lose Vector3 objects, so we need to handle points specially
                let userData = {};
                if (obj.userData) {
                    // First do JSON clone for most properties
                    userData = JSON.parse(JSON.stringify(obj.userData));
                    
                    // Then manually copy points array if it exists (preserve Vector3 objects)
                    if (obj.userData.points && Array.isArray(obj.userData.points)) {
                        userData.points = obj.userData.points.map(p => {
                            if (p instanceof BABYLON.Vector3) {
                                return p.clone();
                            } else if (p && typeof p === 'object' && (p.x !== undefined || p.y !== undefined || p.z !== undefined)) {
                                // Handle plain objects from JSON serialization
                                return {
                                    x: p.x !== undefined ? p.x : 0,
                                    y: p.y !== undefined ? p.y : 0,
                                    z: p.z !== undefined ? p.z : 0
                                };
                            }
                            return p;
                        });
                    }
                }
                
                // Debug: log object info for polygon detection
                console.log(`[Duplicate] Processing object: ${obj.name}, shapeType: ${shapeType}, userData:`, {
                    shapeType: userData.shapeType,
                    type: userData.type,
                    hasPoints: !!(userData.points && userData.points.length >= 3),
                    pointsLength: userData.points ? userData.points.length : 0,
                    pointsType: userData.points && userData.points.length > 0 ? typeof userData.points[0] : 'none'
                });
                
                // For trees (TransformNode), get position from the TransformNode itself
                // For other objects, get position from the mesh
                let position, rotation, scaling;
                if (isTreeTransformNode && obj instanceof BABYLON.TransformNode) {
                    position = obj.position.clone();
                    rotation = obj.rotation.clone();
                    scaling = obj.scaling.clone();
                    console.log(`[Duplicate] Tree TransformNode - Original position: ${position.x}, ${position.y}, ${position.z}`);
                } else {
                    position = obj.position.clone();
                    rotation = obj.rotation.clone();
                    scaling = obj.scaling.clone();
                    console.log(`[Duplicate] Regular object - Original position: ${position.x}, ${position.y}, ${position.z}`);
                }
                
                const originalExtrusion = obj.extrusion;
                
                // Debug: log object info
                console.log(`[Duplicate] Processing object: ${obj.name}, type: ${obj.constructor.name}, isTree: ${this.isTree(obj)}, isTreeTransformNode: ${isTreeTransformNode}, shapeType: ${shapeType}`);
                console.log(`[Duplicate] Original userData:`, userData);
                console.log(`[Duplicate] Original userData.type:`, userData.type);
                console.log(`[Duplicate] Original userData.shapeType:`, userData.shapeType);
                console.log(`[Duplicate] Original rotation: ${rotation.x}, ${rotation.y}, ${rotation.z}`);
                console.log(`[Duplicate] Original scaling: ${scaling.x}, ${scaling.y}, ${scaling.z}`);
                
                // Store original position (no offset - duplicate should be at exact same position)
                const originalPosition = position.clone();
                console.log(`[Duplicate] Original position: ${originalPosition.x}, ${originalPosition.y}, ${originalPosition.z}`);
                console.log(`[Duplicate] Duplicate will be at same position (no offset)`);

                let clonedMesh = null;
                const timestamp = Date.now();
                const uniqueId = `${timestamp}_${index}`;

                // Check if this is an imported STL object
                if (userData.isImportedSTL && userData.originalSTLData) {
                    try {
                        // Create a copy of the original STL data with a new name
                        const stlDataCopy = JSON.parse(JSON.stringify(userData.originalSTLData));
                        
                        // Generate a unique name for the duplicate based on type
                        const objectType = userData.type || 'ground';
                        const newName = this.generateUniqueNameByType(objectType);
                        
                        // Update the name in the STL data
                        stlDataCopy.name = newName;
                        
                        // Create the mesh from STL data
                        if (this.stlManager && this.stlManager.createMeshFromSTLObject) {
                            clonedMesh = this.stlManager.createMeshFromSTLObject(stlDataCopy, scene);
                        } else {
                            console.error('STLManager or createMeshFromSTLObject not available');
                            return;
                        }
                        
                        if (clonedMesh) {
                            // Set position, rotation, and scaling
                            clonedMesh.position = position.clone();
                            clonedMesh.rotation = rotation.clone();
                            clonedMesh.scaling = scaling.clone();
                            
                            // Update the name to match the duplicate naming
                            clonedMesh.name = newName;
                            if (clonedMesh.userData) {
                                clonedMesh.userData.name = newName;
                                // Preserve originalSTLData with the new name
                                clonedMesh.userData.originalSTLData = stlDataCopy;
                                // Preserve all other properties from original userData (type, shapeType, etc.)
                                if (userData.type) {
                                    clonedMesh.userData.type = userData.type;
                                }
                                if (userData.shapeType) {
                                    clonedMesh.userData.shapeType = userData.shapeType;
                                }
                                // Copy any other properties that might exist
                                Object.keys(userData).forEach(key => {
                                    if (key !== 'isImportedSTL' && key !== 'originalSTLData' && key !== 'name') {
                                        if (!clonedMesh.userData[key]) {
                                            clonedMesh.userData[key] = userData[key];
                                        }
                                    }
                                });
                            }
                            
                            console.log(`[Duplicate] Duplicated STL object: ${obj.name} -> ${clonedMesh.name}, type: ${clonedMesh.userData?.type || 'unknown'}`);
                        } else {
                            console.error(`Failed to create duplicate STL mesh for ${obj.name}`);
                            return;
                        }
                    } catch (error) {
                        console.error(`Error duplicating STL object ${obj.name}:`, error);
                        return;
                    }
                }
                // Create new mesh from scratch based on shape type
                // Check for circle first (even if shapeType is 'building', if it has diameterTop, it's a circle)
                else if (shapeType === 'circle' || (userData.dimensions && userData.dimensions.diameterTop !== undefined)) {
                    // Get dimensions from userData (original dimensions, NOT scaled)
                    // IMPORTANT: Do NOT apply scaling to dimensions here, because scaling will be applied via clonedMesh.scaling
                    // If we apply scaling to dimensions AND to scaling property, it will be double-scaled
                    let diameterTop, diameterBottom, height;
                    if (userData.dimensions) {
                        // Use original dimensions from userData (these are the base dimensions, not affected by scaling)
                        diameterTop = parseFloat(userData.dimensions.diameterTop) || 1;
                        diameterBottom = parseFloat(userData.dimensions.diameterBottom) || 1;
                        height = parseFloat(userData.dimensions.height) || 0.1;
                    } else {
                        // Fallback: use bounding box (but this may be inaccurate if scaled or rotated)
                        // If using bounding box, we need to divide by scaling to get original dimensions
                        const boundingInfo = obj.getBoundingInfo();
                        const scaledDiameter = boundingInfo.boundingBox.extendSize.x * 2;
                        const scaledHeight = boundingInfo.boundingBox.extendSize.y * 2;
                        
                        // Divide by scaling to get original dimensions
                        const diameterScaleFactor = scaling ? Math.max(Math.abs(scaling.x || 1), Math.abs(scaling.z || 1)) : 1;
                        const heightScaleFactor = scaling ? Math.abs(scaling.y || 1) : 1;
                        
                        diameterTop = scaledDiameter / diameterScaleFactor;
                        diameterBottom = diameterTop;
                        height = scaledHeight / heightScaleFactor;
                        
                        console.warn(`Circle ${obj.name} has no userData.dimensions, using bounding box (may be inaccurate)`);
                    }

                    // Generate unique name based on type
                    const circleType = userData.type || 'ground';
                    const newCircleName = this.generateUniqueNameByType(circleType);

                    // Create new cylinder from scratch using ORIGINAL dimensions (not scaled)
                    // Scaling will be applied via clonedMesh.scaling property
                    clonedMesh = BABYLON.MeshBuilder.CreateCylinder(newCircleName, {
                        height: height,
                        diameterTop: diameterTop,
                        diameterBottom: diameterBottom,
                        tessellation: 32
                    }, scene);

                    // IMPORTANT: Set userData IMMEDIATELY after creating the mesh, before any other operations
                    // This ensures type and all other properties are preserved
                    clonedMesh.userData = JSON.parse(JSON.stringify(userData));
                    clonedMesh.userData.name = newCircleName;
                    console.log(`[Duplicate] Set userData immediately after creation for ${newCircleName}:`, {
                        type: clonedMesh.userData?.type,
                        shapeType: clonedMesh.userData?.shapeType
                    });

                    // IMPORTANT: Copy material IMMEDIATELY after creating the mesh to preserve exact color
                    if (obj.material && obj.material instanceof BABYLON.StandardMaterial) {
                        const clonedMaterial = new BABYLON.StandardMaterial(`${obj.material.name}_copy_${uniqueId}`, scene);
                        clonedMaterial.diffuseColor = obj.material.diffuseColor ? obj.material.diffuseColor.clone() : new BABYLON.Color3(0.4, 0.3, 0.2);
                        clonedMaterial.specularColor = obj.material.specularColor ? obj.material.specularColor.clone() : new BABYLON.Color3(0.1, 0.1, 0.1);
                        clonedMaterial.emissiveColor = obj.material.emissiveColor ? obj.material.emissiveColor.clone() : new BABYLON.Color3(0, 0, 0);
                        clonedMaterial.ambientColor = obj.material.ambientColor ? obj.material.ambientColor.clone() : new BABYLON.Color3(0, 0, 0);
                        clonedMaterial.alpha = obj.material.alpha !== undefined ? obj.material.alpha : 1.0;
                        clonedMaterial.backFaceCulling = false; // 2-sided
                        clonedMaterial.twoSidedLighting = true; // Enable lighting on both sides
                        if (obj.material.roughness !== undefined) clonedMaterial.roughness = obj.material.roughness;
                        if (obj.material.metallic !== undefined) clonedMaterial.metallic = obj.material.metallic;
                        clonedMesh.material = clonedMaterial;
                        console.log(`[Duplicate] Set material immediately for ${newCircleName}, color:`, {
                            R: clonedMaterial.diffuseColor.r.toFixed(3),
                            G: clonedMaterial.diffuseColor.g.toFixed(3),
                            B: clonedMaterial.diffuseColor.b.toFixed(3)
                        });
                    }

                    // Set renderingGroupId based on type (use SceneManager helper)
                    const meshType = userData?.type || obj.userData?.type || 'ground';
                    clonedMesh.renderingGroupId = SceneManager.getRenderingGroupId(meshType);

                    // Set position (center Y at height/2)
                    // For circles, position.y is already at center (height/2), so we use it directly
                    // But if the original circle was scaled, we need to adjust
                    // Calculate the base Y position (bottom of the circle)
                    const originalHeight = userData.dimensions ? parseFloat(userData.dimensions.height) : height;
                    const originalBaseY = obj.position.y - (originalHeight / 2);
                    // New position should be at baseY + newHeight/2
                    clonedMesh.position = new BABYLON.Vector3(
                        position.x,
                        originalBaseY + height / 2,
                        position.z
                    );
                    
                    // IMPORTANT: Copy rotation and scaling from original
                    clonedMesh.rotation = rotation.clone();
                    clonedMesh.scaling = scaling.clone();

                } else if (shapeType === 'rectangle' || shapeType === 'building') {
                    // Get dimensions from userData or calculate from bounding box
                    let width, depth, height;
                    if (userData.dimensions) {
                        width = parseFloat(userData.dimensions.width) || 1;
                        depth = parseFloat(userData.dimensions.depth) || 1;
                        height = parseFloat(userData.dimensions.height) || 0.1;
                    } else {
                        const boundingInfo = obj.getBoundingInfo();
                        width = boundingInfo.boundingBox.extendSize.x * 2;
                        depth = boundingInfo.boundingBox.extendSize.z * 2;
                        height = boundingInfo.boundingBox.extendSize.y * 2;
                    }

                    // Generate unique name based on type
                    const rectangleType = userData.type || 'ground';
                    console.log(`[Duplicate] Rectangle/Building - userData.type: ${userData.type}, rectangleType: ${rectangleType}`);
                    const newBuildingName = this.generateUniqueNameByType(rectangleType);
                    console.log(`[Duplicate] Rectangle/Building - Generated name: ${newBuildingName}`);

                    // Create new box from scratch
                    clonedMesh = BABYLON.MeshBuilder.CreateBox(newBuildingName, {
                        width: width,
                        height: height,
                        depth: depth
                    }, scene);

                    // IMPORTANT: Set userData IMMEDIATELY after creating the mesh, before any other operations
                    // This ensures type and all other properties are preserved
                    clonedMesh.userData = JSON.parse(JSON.stringify(userData));
                    clonedMesh.userData.name = newBuildingName;
                    console.log(`[Duplicate] Set userData immediately after creation for ${newBuildingName}:`, {
                        type: clonedMesh.userData?.type,
                        shapeType: clonedMesh.userData?.shapeType
                    });

                    // IMPORTANT: Copy material IMMEDIATELY after creating the mesh to preserve exact color
                    if (obj.material && obj.material instanceof BABYLON.StandardMaterial) {
                        const clonedMaterial = new BABYLON.StandardMaterial(`${obj.material.name}_copy_${uniqueId}`, scene);
                        clonedMaterial.diffuseColor = obj.material.diffuseColor ? obj.material.diffuseColor.clone() : new BABYLON.Color3(0.4, 0.3, 0.2);
                        clonedMaterial.specularColor = obj.material.specularColor ? obj.material.specularColor.clone() : new BABYLON.Color3(0.1, 0.1, 0.1);
                        clonedMaterial.emissiveColor = obj.material.emissiveColor ? obj.material.emissiveColor.clone() : new BABYLON.Color3(0, 0, 0);
                        clonedMaterial.ambientColor = obj.material.ambientColor ? obj.material.ambientColor.clone() : new BABYLON.Color3(0, 0, 0);
                        clonedMaterial.alpha = obj.material.alpha !== undefined ? obj.material.alpha : 1.0;
                        clonedMaterial.backFaceCulling = false; // 2-sided
                        clonedMaterial.twoSidedLighting = true; // Enable lighting on both sides
                        if (obj.material.roughness !== undefined) clonedMaterial.roughness = obj.material.roughness;
                        if (obj.material.metallic !== undefined) clonedMaterial.metallic = obj.material.metallic;
                        clonedMesh.material = clonedMaterial;
                        console.log(`[Duplicate] Set material immediately for ${newBuildingName}, color:`, {
                            R: clonedMaterial.diffuseColor.r.toFixed(3),
                            G: clonedMaterial.diffuseColor.g.toFixed(3),
                            B: clonedMaterial.diffuseColor.b.toFixed(3)
                        });
                    }

                    // Set renderingGroupId based on type (use SceneManager helper)
                    const meshType = userData?.type || obj.userData?.type || 'ground';
                    clonedMesh.renderingGroupId = SceneManager.getRenderingGroupId(meshType);

                    // IMPORTANT: Copy position, rotation, and scaling EXACTLY from original
                    // Position should be exactly the same as original (no offset)
                    clonedMesh.position = position.clone();
                    clonedMesh.rotation = rotation.clone();
                    clonedMesh.scaling = scaling.clone();

                } else if (shapeType === 'polygon') {
                    // For polygons, we need to recreate from points if available, otherwise use VertexData
                    try {
                        // Generate unique name based on type
                        const polygonType = userData.type || 'ground';
                        const newPolygonName = this.generateUniqueNameByType(polygonType);
                        
                        // Check if polygon has points in userData (for 3D polygons created from extrusion)
                        if (userData.points && userData.points.length >= 3 && this.uiManager) {
                            // Recreate polygon from points using createCustomPolygonExtrusion
                            // Points in userData are stored as world coordinates, but we need to convert them properly
                            // Handle both Vector3 objects and plain objects (from JSON serialization)
                            const points = userData.points.map(p => {
                                let point;
                                if (p instanceof BABYLON.Vector3) {
                                    point = p.clone();
                                } else if (p.x !== undefined && p.y !== undefined && p.z !== undefined) {
                                    point = new BABYLON.Vector3(p.x, p.y, p.z);
                                } else if (p.x !== undefined && p.z !== undefined) {
                                    point = new BABYLON.Vector3(p.x, p.y !== undefined ? p.y : 0, p.z);
                                } else {
                                    console.warn('Invalid point format in userData.points:', p);
                                    return null;
                                }
                                return point;
                            }).filter(p => p !== null);
                            
                            // Check if we have valid points
                            if (points.length < 3) {
                                console.error('Not enough valid points for polygon duplication');
                                return;
                            }
                            
                            // Calculate center of points to convert from world to relative coordinates
                            const center = BABYLON.Vector3.Zero();
                            points.forEach(point => center.addInPlace(point));
                            center.scaleInPlace(1 / points.length);
                            center.y = 0; // Keep Y at 0 for 2D polygon shape
                            
                            // Convert points to relative coordinates (relative to center)
                            const relativePoints = points.map(point => point.subtract(center));
                            
                            console.log(`[Duplicate] Converted ${points.length} points from world to relative coordinates, center:`, center);
                            
                            // Get original height from userData (use originalHeight, not currentHeight which may be scaled)
                            // If originalHeight is not available, calculate from bounding box considering scaling
                            let originalHeight = userData.originalHeight;
                            if (!originalHeight) {
                                // Calculate from bounding box, but divide by scaling.y to get original height
                                const boundingInfo = obj.getBoundingInfo();
                                const scaledHeight = boundingInfo.boundingBox.extendSize.y * 2;
                                originalHeight = scaledHeight / (obj.scaling.y || 1);
                            }
                            if (!originalHeight || originalHeight < 0.001) {
                                originalHeight = 0.1; // Default height
                            }
                            
                            // Get current height (considering scaling) for positioning
                            const currentHeight = userData.currentHeight || (originalHeight * (obj.scaling.y || 1));
                            
                            // IMPORTANT: Use VertexData to duplicate polygon instead of createCustomPolygonExtrusion
                            // This preserves the normals exactly as they are in the original (no double-flipping)
                            // createCustomPolygonExtrusion always flips normals, which would cause double-flipping
                            const vertexData = BABYLON.VertexData.ExtractFromMesh(obj);
                            clonedMesh = new BABYLON.Mesh(newPolygonName, scene);
                            vertexData.applyToMesh(clonedMesh);
                            
                            // IMPORTANT: Set userData IMMEDIATELY after creating the mesh
                            // Preserve sideWallNormalsFlipped flag from original
                            const originalSideWallNormalsFlipped = userData.sideWallNormalsFlipped || false;
                            
                            // Deep clone userData, but preserve points as Vector3 objects
                            clonedMesh.userData = JSON.parse(JSON.stringify(userData));
                            clonedMesh.userData.name = newPolygonName;
                            clonedMesh.userData.originalHeight = originalHeight;
                            clonedMesh.userData.currentHeight = currentHeight;
                            // Ensure shapeType is set to 'polygon' to prevent misidentification
                            clonedMesh.userData.shapeType = 'polygon';
                            // IMPORTANT: Preserve sideWallNormalsFlipped flag from original (no double-flipping)
                            clonedMesh.userData.sideWallNormalsFlipped = originalSideWallNormalsFlipped;
                            
                            // IMPORTANT: Preserve points as Vector3 objects (JSON.parse converts them to plain objects)
                            // This is critical for future duplications
                            // Use obj.userData.points directly (not userData.points) because obj.userData.points still contains Vector3 objects
                            if (obj.userData && obj.userData.points && Array.isArray(obj.userData.points)) {
                                clonedMesh.userData.points = obj.userData.points.map(p => {
                                    if (p instanceof BABYLON.Vector3) {
                                        return p.clone();
                                    } else if (p && typeof p === 'object' && (p.x !== undefined || p.y !== undefined || p.z !== undefined)) {
                                        return new BABYLON.Vector3(p.x || 0, p.y || 0, p.z || 0);
                                    }
                                    return p;
                                });
                                console.log(`[Duplicate] Preserved ${clonedMesh.userData.points.length} points as Vector3 objects for future duplication`);
                            } else if (userData.points && Array.isArray(userData.points)) {
                                // Fallback: if obj.userData.points is not available, use userData.points (plain objects)
                                clonedMesh.userData.points = userData.points.map(p => {
                                    if (p instanceof BABYLON.Vector3) {
                                        return p.clone();
                                    } else if (p && typeof p === 'object' && (p.x !== undefined || p.y !== undefined || p.z !== undefined)) {
                                        return new BABYLON.Vector3(p.x || 0, p.y || 0, p.z || 0);
                                    }
                                    return p;
                                });
                                console.log(`[Duplicate] Converted ${clonedMesh.userData.points.length} points from plain objects to Vector3 objects for future duplication`);
                            }
                            
                            // Copy material from original
                            if (obj.material && obj.material instanceof BABYLON.StandardMaterial) {
                                const clonedMaterial = new BABYLON.StandardMaterial(`${obj.material.name}_copy_${uniqueId}`, scene);
                                clonedMaterial.diffuseColor = obj.material.diffuseColor ? obj.material.diffuseColor.clone() : new BABYLON.Color3(0.4, 0.3, 0.2);
                                clonedMaterial.specularColor = obj.material.specularColor ? obj.material.specularColor.clone() : new BABYLON.Color3(0.1, 0.1, 0.1);
                                clonedMaterial.emissiveColor = obj.material.emissiveColor ? obj.material.emissiveColor.clone() : new BABYLON.Color3(0, 0, 0);
                                clonedMaterial.ambientColor = obj.material.ambientColor ? obj.material.ambientColor.clone() : new BABYLON.Color3(0, 0, 0);
                                clonedMaterial.alpha = obj.material.alpha !== undefined ? obj.material.alpha : 1.0;
                                clonedMaterial.backFaceCulling = false; // Always 2-sided
                                clonedMaterial.twoSidedLighting = true; // Always enable lighting on both sides
                                if (obj.material.roughness !== undefined) clonedMaterial.roughness = obj.material.roughness;
                                if (obj.material.metallic !== undefined) clonedMaterial.metallic = obj.material.metallic;
                                clonedMesh.material = clonedMaterial;
                            }
                            
                            // Set position, rotation, and scaling (VertexData preserves local geometry, so we apply transforms)
                            // No offset - duplicate should be at exact same position as original
                            clonedMesh.position = position.clone();
                            
                            // Apply the same scaling and rotation as original to maintain the same visual appearance
                            clonedMesh.scaling = scaling.clone();
                            clonedMesh.rotation = rotation.clone();
                            
                            // IMPORTANT: Update userData.points to store the world coordinates for future duplications
                            // The points in userData are stored as world coordinates, and since we're duplicating at the same position,
                            // we can keep the same points. However, we need to ensure they are properly formatted as Vector3 objects
                            // and that they reflect the current world position of the cloned mesh.
                            if (clonedMesh.userData.points && Array.isArray(clonedMesh.userData.points)) {
                                // Points are stored as world coordinates, so they should remain the same since position is the same
                                // Just ensure they are properly formatted as Vector3 objects
                                clonedMesh.userData.points = clonedMesh.userData.points.map(p => {
                                    if (p instanceof BABYLON.Vector3) {
                                        return p.clone();
                                    } else if (p && typeof p === 'object' && (p.x !== undefined || p.y !== undefined || p.z !== undefined)) {
                                        return new BABYLON.Vector3(p.x || 0, p.y || 0, p.z || 0);
                                    }
                                    return p;
                                });
                                
                                console.log(`[Duplicate] Preserved ${clonedMesh.userData.points.length} points for future duplication`);
                            } else {
                                // If points are missing, try to extract them from the mesh geometry
                                // This is important for polygons that were duplicated before and lost their points
                                console.warn(`[Duplicate] Polygon ${newPolygonName} has no points in userData, attempting to extract from geometry`);
                                
                                try {
                                    const positions = clonedMesh.geometry.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                                    if (positions && positions.length > 0) {
                                        // Extract base points (points at y=0 or minimum y) - these are the polygon outline
                                        const baseY = Math.min(...Array.from({length: positions.length / 3}, (_, i) => positions[i * 3 + 1]));
                                        const tolerance = 0.01;
                                        
                                        // Find unique points at the base (polygon outline)
                                        const basePoints = [];
                                        const pointSet = new Set();
                                        
                                        for (let i = 0; i < positions.length; i += 3) {
                                            const y = positions[i + 1];
                                            if (Math.abs(y - baseY) < tolerance) {
                                                const x = positions[i];
                                                const z = positions[i + 2];
                                                const key = `${x.toFixed(3)},${z.toFixed(3)}`;
                                                
                                                if (!pointSet.has(key)) {
                                                    pointSet.add(key);
                                                    // Convert from local to world coordinates
                                                    const localPoint = new BABYLON.Vector3(x, y, z);
                                                    const worldPoint = BABYLON.Vector3.TransformCoordinates(localPoint, clonedMesh.getWorldMatrix());
                                                    basePoints.push(worldPoint);
                                                }
                                            }
                                        }
                                        
                                        if (basePoints.length >= 3) {
                                            clonedMesh.userData.points = basePoints;
                                            console.log(`[Duplicate] Extracted ${basePoints.length} points from geometry for ${newPolygonName}`);
                                        } else {
                                            console.warn(`[Duplicate] Could not extract enough points from geometry (found ${basePoints.length})`);
                                        }
                                    }
                                } catch (error) {
                                    console.error(`[Duplicate] Error extracting points from geometry:`, error);
                                }
                            }
                            
                            // Force mesh update after transforms to ensure normals are correctly transformed
                            clonedMesh.computeWorldMatrix(true);
                            clonedMesh.refreshBoundingInfo();
                            
                            console.log(`[Duplicate] Duplicated polygon using VertexData for ${newPolygonName} with originalHeight ${originalHeight}, currentHeight ${currentHeight}, scaling ${scaling.y}, sideWallNormalsFlipped: ${clonedMesh.userData.sideWallNormalsFlipped}`);
                        } else {
                            // Fallback: use VertexData approach for polygons without points
                            // This should not happen for polygons created with the tool, but handle it gracefully
                            console.warn(`[Duplicate] Polygon ${obj.name} has no points in userData, using VertexData approach`);
                            console.warn(`[Duplicate] userData.points:`, userData.points);
                            console.warn(`[Duplicate] userData:`, userData);
                            
                            const vertexData = BABYLON.VertexData.ExtractFromMesh(obj);
                            clonedMesh = new BABYLON.Mesh(newPolygonName, scene);
                            vertexData.applyToMesh(clonedMesh);
                            
                            // IMPORTANT: Set userData IMMEDIATELY after creating the mesh
                            clonedMesh.userData = JSON.parse(JSON.stringify(userData));
                            clonedMesh.userData.name = newPolygonName;
                            // Ensure shapeType is set to 'polygon' to prevent misidentification
                            clonedMesh.userData.shapeType = 'polygon';
                            
                            // Try to extract points from the mesh geometry if possible
                            // This is a fallback for polygons that don't have points in userData
                            try {
                                const positions = clonedMesh.geometry.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                                if (positions && positions.length > 0) {
                                    // Extract base points (points at y=0 or minimum y) - these are the polygon outline
                                    const baseY = Math.min(...Array.from({length: positions.length / 3}, (_, i) => positions[i * 3 + 1]));
                                    const tolerance = 0.01;
                                    
                                    // Find unique points at the base (polygon outline)
                                    const basePoints = [];
                                    const pointSet = new Set();
                                    
                                    for (let i = 0; i < positions.length; i += 3) {
                                        const y = positions[i + 1];
                                        if (Math.abs(y - baseY) < tolerance) {
                                            const x = positions[i];
                                            const z = positions[i + 2];
                                            const key = `${x.toFixed(3)},${z.toFixed(3)}`;
                                            
                                            if (!pointSet.has(key)) {
                                                pointSet.add(key);
                                                // Convert from local to world coordinates
                                                const localPoint = new BABYLON.Vector3(x, y, z);
                                                const worldPoint = BABYLON.Vector3.TransformCoordinates(localPoint, clonedMesh.getWorldMatrix());
                                                basePoints.push(worldPoint);
                                            }
                                        }
                                    }
                                    
                                    if (basePoints.length >= 3) {
                                        clonedMesh.userData.points = basePoints;
                                        console.log(`[Duplicate] Extracted ${basePoints.length} points from geometry for ${newPolygonName} (fallback)`);
                                    } else {
                                        console.warn(`[Duplicate] Could not extract enough points from geometry (found ${basePoints.length})`);
                                    }
                                }
                            } catch (error) {
                                console.warn(`[Duplicate] Could not extract points from mesh geometry:`, error);
                            }
                            
                            console.log(`[Duplicate] Used VertexData approach for ${newPolygonName} (no points in userData)`);
                        }
                        
                        // Set renderingGroupId based on type (use SceneManager helper)
                        const meshType = obj.userData?.type || 'ground';
                        clonedMesh.renderingGroupId = SceneManager.getRenderingGroupId(meshType);
                        
                    } catch (error) {
                        console.error(`Error duplicating polygon ${obj.name}:`, error);
                        return;
                    }

                } else if (isTreeTransformNode || (obj instanceof BABYLON.TransformNode && this.treeManager)) {
                    // Handle tree duplication - this is a large block, so we'll call a helper method
                    clonedMesh = this.duplicateTree(obj, position, rotation, scaling, scene);
                    if (!clonedMesh) {
                        return; // Tree duplication failed
                    }
                } else {
                    // Fallback: use VertexData for unknown shapes
                    // Only try to extract if it's a Mesh (not TransformNode)
                    if (obj instanceof BABYLON.Mesh) {
                        try {
                            const vertexData = BABYLON.VertexData.ExtractFromMesh(obj);
                            // Generate unique name based on type (default to 'ground' if type unknown)
                            const fallbackType = userData.type || 'ground';
                            const fallbackName = this.generateUniqueNameByType(fallbackType);
                            clonedMesh = new BABYLON.Mesh(fallbackName, scene);
                            vertexData.applyToMesh(clonedMesh);
                            clonedMesh.position = position.clone();
                        } catch (error) {
                            console.error(`Error duplicating unknown shape ${obj.name}:`, error);
                            return;
                        }
                    } else {
                        console.error(`[Duplicate] Cannot duplicate ${obj.name}: not a Mesh or TransformNode (type: ${obj.constructor.name})`);
                        return;
                    }
                }

                if (!clonedMesh) {
                    console.error(`[Duplicate] Failed to create duplicate for ${obj.name} - clonedMesh is null`);
                    console.error(`[Duplicate] Object type: ${obj.constructor.name}, isTree: ${this.isTree(obj)}, shapeType: ${shapeType}`);
                    return;
                }

                // Check if clonedMesh is a TransformNode (for trees) or a Mesh
                const isTransformNode = clonedMesh instanceof BABYLON.TransformNode;
                
                // Copy transform properties (only if not already set for STL objects, circles, rectangles, polygons)
                // For TransformNodes (trees), transform properties are already set during duplication
                // For circles, rectangles, and polygons, rotation and scaling are already set above
                // This section is mainly for fallback cases
                if (!userData.isImportedSTL && !isTransformNode && shapeType !== 'circle' && shapeType !== 'rectangle' && shapeType !== 'building' && shapeType !== 'polygon') {
                    clonedMesh.rotation = rotation.clone();
                    clonedMesh.scaling = scaling.clone();
                }

                // Create new material (completely independent)
                // Skip material handling for TransformNodes (trees) - they don't have materials
                // For STL objects, createMeshFromSTLObject already creates a material, but we should copy the original material properties
                // For rectangles/buildings/circles/polygons, material is already set immediately after creation
                // So we only need to handle material here if it wasn't set yet (for fallback cases)
                if (!isTransformNode && obj.material && obj instanceof BABYLON.Mesh && !clonedMesh.material) {
                    const clonedMaterial = new BABYLON.StandardMaterial(`${obj.material.name}_copy_${uniqueId}`, scene);
                    
                    if (obj.material instanceof BABYLON.StandardMaterial) {
                        // Copy diffuseColor (main color) - this is the most important property
                        if (obj.material.diffuseColor) {
                            clonedMaterial.diffuseColor = obj.material.diffuseColor.clone();
                            console.log(`[Duplicate] Copied diffuseColor for ${clonedMesh.name}:`, {
                                original: `R:${obj.material.diffuseColor.r.toFixed(3)}, G:${obj.material.diffuseColor.g.toFixed(3)}, B:${obj.material.diffuseColor.b.toFixed(3)}`,
                                cloned: `R:${clonedMaterial.diffuseColor.r.toFixed(3)}, G:${clonedMaterial.diffuseColor.g.toFixed(3)}, B:${clonedMaterial.diffuseColor.b.toFixed(3)}`
                            });
                        } else {
                            clonedMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2);
                            console.warn(`[Duplicate] Original material has no diffuseColor for ${obj.name}, using default`);
                        }
                        
                        // Copy all other material properties
                        clonedMaterial.specularColor = obj.material.specularColor ? obj.material.specularColor.clone() : new BABYLON.Color3(0.1, 0.1, 0.1);
                        clonedMaterial.emissiveColor = obj.material.emissiveColor ? obj.material.emissiveColor.clone() : new BABYLON.Color3(0, 0, 0);
                        clonedMaterial.ambientColor = obj.material.ambientColor ? obj.material.ambientColor.clone() : new BABYLON.Color3(0, 0, 0);
                        clonedMaterial.alpha = obj.material.alpha !== undefined ? obj.material.alpha : 1.0;
                        clonedMaterial.backFaceCulling = false; // 2-sided
                        clonedMaterial.twoSidedLighting = true; // Enable lighting on both sides
                        
                        // Copy additional material properties if they exist
                        if (obj.material.roughness !== undefined) {
                            clonedMaterial.roughness = obj.material.roughness;
                        }
                        if (obj.material.metallic !== undefined) {
                            clonedMaterial.metallic = obj.material.metallic;
                        }
                    } else {
                        // If material is not StandardMaterial, try to copy properties anyway
                        console.warn(`[Duplicate] Material for ${obj.name} is not StandardMaterial, type: ${obj.material.constructor.name}`);
                        if (obj.material.diffuseColor) {
                            clonedMaterial.diffuseColor = obj.material.diffuseColor.clone();
                        }
                    }
                    
                    // Dispose the material created by createMeshFromSTLObject if it exists
                    if (clonedMesh.material && clonedMesh.material.dispose) {
                        clonedMesh.material.dispose();
                    }
                    clonedMesh.material = clonedMaterial;
                    console.log(`[Duplicate] Material set for ${clonedMesh.name}, final color:`, {
                        R: clonedMaterial.diffuseColor.r.toFixed(3),
                        G: clonedMaterial.diffuseColor.g.toFixed(3),
                        B: clonedMaterial.diffuseColor.b.toFixed(3)
                    });
                } else if (!isTransformNode && !obj.material) {
                    console.warn(`[Duplicate] Object ${obj.name} has no material to copy`);
                }

                // Copy userData (only if not already set for STL objects and not TransformNodes)
                // For STL objects, userData is already set by createMeshFromSTLObject
                // For TransformNodes (trees), userData is not needed
                // For rectangles/buildings/circles/polygons, userData is already set immediately after creation
                // So we only need to update it if it wasn't set or if we need to preserve additional properties
                if (!userData.isImportedSTL && !isTransformNode && clonedMesh instanceof BABYLON.Mesh) {
                    // Check if userData was already set (for rectangles/buildings/circles/polygons)
                    if (!clonedMesh.userData || !clonedMesh.userData.type) {
                        // Deep copy userData to preserve all properties including type, dimensions, etc.
                        const copiedUserData = JSON.parse(JSON.stringify(userData));
                        clonedMesh.userData = copiedUserData;
                        console.log(`[Duplicate] Set userData (was not set): ${clonedMesh.name}`);
                    } else {
                        // userData already exists, but make sure type and shapeType are preserved
                        console.log(`[Duplicate] userData already exists for ${clonedMesh.name}, ensuring type is preserved`);
                    }
                    
                    // Update name in userData to match the new mesh name
                    if (clonedMesh.userData) {
                        clonedMesh.userData.name = clonedMesh.name;
                        // ALWAYS preserve type from original userData (override if different)
                        if (userData.type) {
                            clonedMesh.userData.type = userData.type;
                            console.log(`[Duplicate] Ensured type is set: ${userData.type} -> ${clonedMesh.userData.type}`);
                        } else {
                            console.warn(`[Duplicate] Original userData has no type for ${obj.name}`);
                        }
                        // ALWAYS preserve shapeType from original userData
                        if (userData.shapeType) {
                            clonedMesh.userData.shapeType = userData.shapeType;
                            console.log(`[Duplicate] Ensured shapeType is set: ${userData.shapeType} -> ${clonedMesh.userData.shapeType}`);
                        }
                        // Preserve all other properties from original userData
                        Object.keys(userData).forEach(key => {
                            if (key !== 'name' && !clonedMesh.userData[key]) {
                                clonedMesh.userData[key] = userData[key];
                            }
                        });
                    }
                    console.log(`[Duplicate] Final userData for ${clonedMesh.name}:`, {
                        type: clonedMesh.userData?.type,
                        shapeType: clonedMesh.userData?.shapeType,
                        dimensions: clonedMesh.userData?.dimensions
                    });
                }

                // Set rendering properties (only for Meshes, not TransformNodes)
                if (!isTransformNode && clonedMesh instanceof BABYLON.Mesh) {
                    // Set renderingGroupId based on type (use SceneManager helper)
                    const meshType = obj.userData?.type || 'ground';
                    clonedMesh.renderingGroupId = SceneManager.getRenderingGroupId(meshType);
                    // Copy visibility and enabled state from original
                    clonedMesh.setEnabled(obj.isEnabled !== undefined ? obj.isEnabled() : true);
                    clonedMesh.isVisible = obj.isVisible !== undefined ? obj.isVisible : true;
                    
                    // Copy metadata if exists
                    if (obj.metadata) {
                        clonedMesh.metadata = JSON.parse(JSON.stringify(obj.metadata));
                        console.log(`[Duplicate] Copied metadata for ${clonedMesh.name}`);
                    }
                    
                    // Copy rotationQuaternion if exists (alternative to rotation)
                    if (obj.rotationQuaternion) {
                        clonedMesh.rotationQuaternion = obj.rotationQuaternion.clone();
                        console.log(`[Duplicate] Copied rotationQuaternion for ${clonedMesh.name}`);
                    }
                    
                    // Copy receiveShadows and castShadows
                    if (obj.receiveShadows !== undefined) {
                        clonedMesh.receiveShadows = obj.receiveShadows;
                    }
                    if (obj.castShadows !== undefined) {
                        clonedMesh.castShadows = obj.castShadows;
                    }
                    
                    console.log(`[Duplicate] Copied all properties for ${clonedMesh.name}:`, {
                        renderingGroupId: clonedMesh.renderingGroupId,
                        isEnabled: clonedMesh.isEnabled(),
                        isVisible: clonedMesh.isVisible,
                        receiveShadows: clonedMesh.receiveShadows,
                        castShadows: clonedMesh.castShadows
                    });
                }

                // Handle extrusions if the original has one
                if (originalExtrusion && (shapeType === 'rectangle' || shapeType === 'building' || shapeType === 'polygon')) {
                    try {
                        // Extract extrusion vertex data
                        const extrusionVertexData = BABYLON.VertexData.ExtractFromMesh(originalExtrusion);
                        
                        // Create new extrusion mesh
                        const clonedExtrusion = new BABYLON.Mesh(`${originalExtrusion.name}_copy_${uniqueId}`, scene);
                        extrusionVertexData.applyToMesh(clonedExtrusion);
                        
                        // Create new material for extrusion
                        if (originalExtrusion.material) {
                            const clonedExtrusionMaterial = new BABYLON.StandardMaterial(`${originalExtrusion.material.name}_copy_${uniqueId}`, scene);
                            if (originalExtrusion.material instanceof BABYLON.StandardMaterial) {
                                clonedExtrusionMaterial.diffuseColor = originalExtrusion.material.diffuseColor ? originalExtrusion.material.diffuseColor.clone() : new BABYLON.Color3(1, 1, 1);
                                clonedExtrusionMaterial.specularColor = originalExtrusion.material.specularColor ? originalExtrusion.material.specularColor.clone() : new BABYLON.Color3(0.1, 0.1, 0.1);
                                clonedExtrusionMaterial.emissiveColor = originalExtrusion.material.emissiveColor ? originalExtrusion.material.emissiveColor.clone() : new BABYLON.Color3(0, 0, 0);
                                clonedExtrusionMaterial.alpha = originalExtrusion.material.alpha !== undefined ? originalExtrusion.material.alpha : 1.0;
                                clonedExtrusionMaterial.backFaceCulling = false; // 2-sided
                                clonedExtrusionMaterial.twoSidedLighting = true; // Enable lighting on both sides
                            }
                            clonedExtrusion.material = clonedExtrusionMaterial;
                        }
                        
                        // Copy extrusion userData
                        if (originalExtrusion.userData) {
                            clonedExtrusion.userData = JSON.parse(JSON.stringify(originalExtrusion.userData));
                        }
                        
                        // Set renderingGroupId based on type (use SceneManager helper)
                        const extrusionType = originalExtrusion.userData?.type || 'building';
                        clonedExtrusion.renderingGroupId = SceneManager.getRenderingGroupId(extrusionType);
                        
                        // Set extrusion position relative to cloned mesh
                        const originalExtrusionRelativePos = originalExtrusion.parent === obj ? originalExtrusion.position.clone() : originalExtrusion.position.clone();
                        clonedExtrusion.position = originalExtrusionRelativePos;
                        
                        // Parent to cloned mesh
                        clonedExtrusion.setParent(clonedMesh);
                        
                        // Link bidirectional
                        clonedMesh.extrusion = clonedExtrusion;
                        clonedExtrusion.basePolygon = clonedMesh;
                        
                        // Enable and make visible
                        clonedExtrusion.setEnabled(true);
                        clonedExtrusion.isVisible = true;
                        
                        // Add to selection manager
                        if (this.selectionManager) {
                            this.selectionManager.addSelectableObject(clonedExtrusion);
                        }
                    } catch (error) {
                        console.error(`Error duplicating extrusion for ${obj.name}:`, error);
                    }
                }

                // Add to selection manager
                if (this.selectionManager) {
                    this.selectionManager.addSelectableObject(clonedMesh);
                }

                // Update rectangleManager if applicable
                if (this.rectangleManager && (shapeType === 'rectangle' || shapeType === 'building')) {
                    this.rectangleManager.rectangles.push(clonedMesh);
                }

                // Note: createMeshFromSTLObject already adds STL buildings to SceneManager
                // So we don't need to add them again here

                // Enable shadows
                // For TransformNodes (trees), shadows are already handled during tree duplication
                // Only handle shadows for Meshes
                if (this.lightingManager && clonedMesh instanceof BABYLON.Mesh) {
                    this.lightingManager.updateShadowsForNewObject(clonedMesh);
                    if (clonedMesh.extrusion) {
                        this.lightingManager.updateShadowsForNewObject(clonedMesh.extrusion);
                    }
                }

                duplicatedObjects.push(clonedMesh);
                console.log(`Duplicated object: ${obj.name} -> ${clonedMesh.name} (created from scratch)`);
            } catch (error) {
                console.error(`Error duplicating object ${obj.name}:`, error);
            }
        });

        if (duplicatedObjects.length > 0) {
            // Clear current selection
            this.selectionManager.clearSelection();
            
            // Select duplicated objects
            duplicatedObjects.forEach(obj => {
                this.selectionManager.selectObject(obj, false, true);
            });

            // Dispatch scene change event
            this.dispatchSceneChangeEvent();

            // Update object list
            if (this.objectListManager) {
                this.objectListManager.updateObjectList();
            }

            console.log(`Duplicated ${duplicatedObjects.length} objects successfully using new algorithm`);
        } else {
            console.warn('No objects were duplicated');
        }
    }

    /**
     * Helper method to duplicate a tree (TransformNode with child meshes)
     * This is extracted from duplicateSelected to reduce complexity
     */
    duplicateTree(obj, position, rotation, scaling, scene) {
        console.log(`[Duplicate] Detected tree TransformNode: ${obj.name}, isTransformNode: ${obj instanceof BABYLON.TransformNode}`);
        try {
            // Check if this is a tree parent (TransformNode) or a tree mesh
            let treeData = null;
            if (this.treeManager) {
                treeData = this.treeManager.trees.find(t => t.parent === obj || t.meshes.includes(obj));
                console.log(`[Duplicate] TreeData found: ${treeData ? 'yes' : 'no'}, trees count: ${this.treeManager.trees.length}`);
            }
            
            // If obj is a TransformNode, try to get child meshes even if treeData not found
            if (obj instanceof BABYLON.TransformNode) {
                console.log(`[Duplicate] Object is TransformNode, getting child meshes...`);
                // If treeData not found, try to get child meshes directly
                if (!treeData) {
                    // Try multiple methods to get child meshes
                    let childMeshes = obj.getChildMeshes();
                    console.log(`[Duplicate] TreeData not found, getChildMeshes() count: ${childMeshes.length}`);
                    
                    // If getChildMeshes() returns empty, try getChildren() and filter for meshes
                    if (childMeshes.length === 0) {
                        const allChildren = obj.getChildren();
                        console.log(`[Duplicate] getChildren() count: ${allChildren.length}`);
                        childMeshes = allChildren.filter(child => child instanceof BABYLON.Mesh);
                        console.log(`[Duplicate] Filtered meshes count: ${childMeshes.length}`);
                    }
                    
                    // Also try to find meshes in scene that have this TransformNode as parent
                    if (childMeshes.length === 0 && scene) {
                        const sceneMeshes = scene.meshes.filter(mesh => 
                            mesh.parent === obj && mesh instanceof BABYLON.Mesh
                        );
                        console.log(`[Duplicate] Scene meshes with this parent: ${sceneMeshes.length}`);
                        childMeshes = sceneMeshes;
                    }
                    
                    if (childMeshes.length > 0) {
                        // Create treeData from child meshes
                        treeData = {
                            parent: obj,
                            meshes: childMeshes,
                            type: this.treeManager?.selectedTreeType || 'default'
                        };
                        console.log(`[Duplicate] Created treeData from ${childMeshes.length} child meshes`);
                    } else {
                        console.error(`[Duplicate] No child meshes found for TransformNode ${obj.name}`);
                        return null;
                    }
                }
                
                if (treeData && treeData.meshes && treeData.meshes.length > 0) {
                    console.log(`[Duplicate] Duplicating tree with ${treeData.meshes.length} meshes`);
                    // This is a tree parent (TransformNode) - duplicate the entire tree structure
                    const clonedMeshes = [];
                
                    // Clone all child meshes
                    // First, get the new tree name
                    const newTreeName = this.generateUniqueTreeName();
                    const treeNumberMatch = newTreeName.match(/^tree(\d+)$/);
                    const treeNumber = treeNumberMatch ? treeNumberMatch[1] : '1';
                    
                    treeData.meshes.forEach(mesh => {
                        if (mesh && !mesh.isDisposed() && mesh instanceof BABYLON.Mesh) {
                            try {
                                // Extract base mesh name (remove old tree number suffix)
                                const baseMeshName = mesh.name.replace(/_tree_\d+$/, '').replace(/^.*_tree_\d+_/, '');
                                const clonedMeshName = baseMeshName ? `${baseMeshName}_tree_${treeNumber}` : `${mesh.name}_tree_${treeNumber}`;
                                
                                // Clone the mesh with geometry
                                const clonedMesh = mesh.clone(clonedMeshName, null, true); // true = cloneChildren = false (we handle children separately)
                                
                                if (!clonedMesh) {
                                    console.error(`[Duplicate] Failed to clone mesh: ${mesh.name}`);
                                    return;
                                }
                                
                                clonedMesh.setEnabled(true);
                                clonedMesh.isVisible = true;
                                
                                // Ensure geometry is valid
                                if (!clonedMesh.geometry) {
                                    console.error(`[Duplicate] Cloned mesh has no geometry: ${clonedMeshName}`);
                                    clonedMesh.dispose();
                                    return;
                                }
                                
                                // Clone the material to avoid sharing material references
                                if (mesh.material) {
                                    try {
                                        const originalMaterial = mesh.material;
                                        const clonedMaterial = originalMaterial.clone(`${originalMaterial.name}_tree_${treeNumber}`);
                                        clonedMesh.material = clonedMaterial;
                                    } catch (matError) {
                                        console.warn(`[Duplicate] Failed to clone material for ${clonedMeshName}:`, matError);
                                        // Create a default material if cloning fails
                                        const defaultMaterial = new BABYLON.StandardMaterial(`${clonedMeshName}_mat`, scene);
                                        defaultMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2);
                                        clonedMesh.material = defaultMaterial;
                                    }
                                }
                                
                                clonedMeshes.push(clonedMesh);
                            } catch (cloneError) {
                                console.error(`[Duplicate] Error cloning mesh ${mesh.name}:`, cloneError);
                            }
                        }
                    });
                    
                    // Check if we have any valid meshes
                    if (clonedMeshes.length === 0) {
                        console.error(`[Duplicate] No valid meshes cloned for tree ${obj.name}`);
                        return null;
                    }
                    
                    // Create a new TransformNode for the duplicated tree
                    // newTreeName was already generated above
                    const clonedTreeParent = new BABYLON.TransformNode(newTreeName, scene);
                    
                    // IMPORTANT: Copy ALL properties from original tree TransformNode
                    // 1. Position (with offset applied)
                    clonedTreeParent.position = position.clone();
                    
                    // 2. Rotation
                    clonedTreeParent.rotation = rotation.clone();
                    
                    // 3. Scaling
                    clonedTreeParent.scaling = scaling.clone();
                    
                    // 4. UserData (if exists)
                    if (obj.userData) {
                        clonedTreeParent.userData = JSON.parse(JSON.stringify(obj.userData));
                        console.log(`[Duplicate] Tree parent - UserData copied:`, clonedTreeParent.userData);
                    }
                    
                    // 5. Metadata (if exists)
                    if (obj.metadata) {
                        clonedTreeParent.metadata = JSON.parse(JSON.stringify(obj.metadata));
                        console.log(`[Duplicate] Tree parent - Metadata copied:`, clonedTreeParent.metadata);
                    }
                    
                    // 6. Visibility and enabled state
                    clonedTreeParent.setEnabled(obj.isEnabled());
                    clonedTreeParent.isVisible = obj.isVisible !== undefined ? obj.isVisible : true;
                    
                    // 7. Any other TransformNode properties
                    if (obj.rotationQuaternion) {
                        clonedTreeParent.rotationQuaternion = obj.rotationQuaternion.clone();
                    }
                    
                    console.log(`[Duplicate] Tree parent - Position copied (with offset): ${clonedTreeParent.position.x}, ${clonedTreeParent.position.y}, ${clonedTreeParent.position.z}`);
                    console.log(`[Duplicate] Tree parent - Rotation copied: ${clonedTreeParent.rotation.x}, ${clonedTreeParent.rotation.y}, ${clonedTreeParent.rotation.z}`);
                    console.log(`[Duplicate] Tree parent - Scaling copied: ${clonedTreeParent.scaling.x}, ${clonedTreeParent.scaling.y}, ${clonedTreeParent.scaling.z}`);
                    console.log(`[Duplicate] Tree parent - Enabled: ${clonedTreeParent.isEnabled()}, Visible: ${clonedTreeParent.isVisible}`);
                    
                    // Parent all cloned meshes to the new tree parent
                    clonedMeshes.forEach(mesh => {
                        if (mesh && !mesh.isDisposed() && mesh.geometry) {
                            try {
                                mesh.setParent(clonedTreeParent);
                                // Reset local position to 0,0,0 since parent handles positioning
                                mesh.position = BABYLON.Vector3.Zero();
                                
                                // Copy mesh properties from original mesh
                                const originalMesh = treeData.meshes.find(m => m.name.replace(/_tree_\d+$/, '').replace(/^.*_tree_\d+_/, '') === mesh.name.replace(/_tree_\d+$/, '').replace(/^.*_tree_\d+_/, ''));
                                if (originalMesh) {
                                    // Set renderingGroupId based on type (trees should use 'tree' type)
                                    mesh.renderingGroupId = SceneManager.getRenderingGroupId('tree');
                                    mesh.receiveShadows = originalMesh.receiveShadows !== undefined ? originalMesh.receiveShadows : true;
                                    mesh.castShadows = originalMesh.castShadows !== undefined ? originalMesh.castShadows : true;
                                    mesh.isVisible = originalMesh.isVisible !== undefined ? originalMesh.isVisible : true;
                                    mesh.setEnabled(originalMesh.isEnabled());
                                    
                                    // Copy userData from original mesh
                                    if (originalMesh.userData) {
                                        mesh.userData = JSON.parse(JSON.stringify(originalMesh.userData));
                                    }
                                    
                                    // Copy metadata from original mesh
                                    if (originalMesh.metadata) {
                                        mesh.metadata = JSON.parse(JSON.stringify(originalMesh.metadata));
                                    }
                                } else {
                                    // Default values if original mesh not found
                                    mesh.renderingGroupId = 1;
                                    mesh.receiveShadows = true;
                                    mesh.castShadows = true;
                                }
                            } catch (parentError) {
                                console.error(`[Duplicate] Error parenting mesh ${mesh.name}:`, parentError);
                            }
                        }
                    });
                    
                    // Filter out any invalid meshes before adding to TreeManager
                    const validMeshes = clonedMeshes.filter(m => m && !m.isDisposed() && m.geometry);
                    
                    // Add to TreeManager
                    if (this.treeManager && validMeshes.length > 0) {
                        const newTreeData = {
                            id: this.treeManager.treeCounter++,
                            type: treeData.type || 'default',
                            parent: clonedTreeParent,
                            meshes: validMeshes,
                            position: position.clone()
                        };
                        
                        this.treeManager.trees.push(newTreeData);
                        
                        // Make tree selectable
                        if (this.selectionManager) {
                            this.selectionManager.addSelectableObject(clonedTreeParent);
                        }
                        
                        // Enable shadows
                        if (this.lightingManager) {
                            validMeshes.forEach(mesh => {
                                if (mesh && !mesh.isDisposed()) {
                                    this.lightingManager.updateShadowsForNewObject(mesh);
                                }
                            });
                        }
                        
                        // Dispatch scene change event
                        if (this.treeManager && this.treeManager.dispatchSceneChangeEvent) {
                            this.treeManager.dispatchSceneChangeEvent();
                        }
                        
                        console.log(`Duplicated tree: ${obj.name} -> ${clonedTreeParent.name} (${validMeshes.length} meshes)`);
                        return clonedTreeParent;
                    } else {
                        console.error(`[Duplicate] No valid meshes to add to TreeManager for tree ${obj.name}`);
                        // Dispose cloned meshes if we can't add them
                        clonedMeshes.forEach(mesh => {
                            if (mesh && !mesh.isDisposed()) {
                                mesh.dispose();
                            }
                        });
                        clonedTreeParent.dispose();
                        return null;
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error(`Error duplicating tree ${obj.name}:`, error);
            return null;
        }
    }

    /**
     * Delete selected objects
     */
    deleteSelected() {
        this.deleteSelectedObjects();
    }

    /**
     * Delete selected objects
     */
    deleteSelectedObjects() {
        if (!this.selectionManager) {
            console.log('SelectionManager not available');
            return;
        }

        const selectedObjects = this.selectionManager.getSelectedObjects();
        if (selectedObjects.length === 0) {
            console.log('No objects selected to delete');
            return;
        }

        console.log(`Deleting ${selectedObjects.length} selected objects`);

        // Delete each selected object
        selectedObjects.forEach(obj => {
            if (!obj || !obj.dispose) return;
            
            // Handle TransformNodes (including STL trees stored as TransformNodes)
            if (obj instanceof BABYLON.TransformNode) {
                const isImportedSTL = obj.userData && obj.userData.isImportedSTL;
                
                if (isImportedSTL) {
                    // STL tree stored as TransformNode - dispose all child meshes first
                    const scene = this.sceneManager ? this.sceneManager.getScene() : null;
                    if (scene) {
                        const childMeshes = obj.getChildMeshes();
                        childMeshes.forEach(childMesh => {
                            if (childMesh && !childMesh.isDisposed()) {
                                if (this.selectionManager) {
                                    this.selectionManager.removeSelectableObject(childMesh);
                                }
                                scene.removeMesh(childMesh);
                                if (childMesh.material && !childMesh.material.getClassName().includes('Shared')) {
                                    childMesh.material.dispose();
                                }
                                childMesh.dispose();
                            }
                        });
                        scene.removeTransformNode(obj);
                    }
                    obj.dispose();
                    console.log(`Deleted STL TransformNode: ${obj.name}`);
                    return;
                } else if (this.treeManager && this.isTree(obj)) {
                    // Regular tree TransformNode
                    const tree = this.treeManager.trees.find(t => t.parent === obj);
                    if (tree) {
                        this.treeManager.removeTree(tree);
                    } else {
                        // Fallback: dispose manually
                        const scene = this.sceneManager ? this.sceneManager.getScene() : null;
                        if (scene) {
                            const childMeshes = obj.getChildMeshes();
                            childMeshes.forEach(childMesh => {
                                if (childMesh && !childMesh.isDisposed()) {
                                    scene.removeMesh(childMesh);
                                    if (childMesh.material && !childMesh.material.getClassName().includes('Shared')) {
                                        childMesh.material.dispose();
                                    }
                                    childMesh.dispose();
                                }
                            });
                            scene.removeTransformNode(obj);
                        }
                        obj.dispose();
                    }
                    return;
                }
            }
            
            // Check if it's an imported STL object (including STL trees)
            const isImportedSTL = obj.userData && obj.userData.isImportedSTL;
            
            if (isImportedSTL) {
                // Handle imported STL objects (including trees)
                this.deleteImportedSTLObject(obj);
            }
            // Check if it's a tree (regular trees, not STL imported)
            else if (this.treeManager && this.isTree(obj)) {
                // Find the tree object in the tree manager
                const tree = this.treeManager.trees.find(t => t.parent === obj);
                if (tree) {
                    this.treeManager.removeTree(tree);
                } else {
                    // Fallback: just dispose the object
                    this.deleteImportedSTLObject(obj);
                }
            }
            // Check if it's a 2D shape
            else if (this.shape2DManager && this.is2DShape(obj)) {
                this.shape2DManager.removeShape(obj);
            } 
            // Check if it's a polygon
            else if (this.polygonManager && this.isPolygon(obj)) {
                // For now, just dispose the polygon object
                // TODO: Add proper polygon removal method to PolygonManager
                obj.dispose();
            }
            else {
                // It's a 3D building or other object
                obj.dispose();
            }
            console.log(`Deleted object: ${obj.name}`);
        });

        // Clear selection after deletion
        this.selectionManager.clearSelection();
        
        // Dispatch event to update object list
        this.dispatchSceneChangeEvent();
        
        console.log('Selected objects deleted and selection cleared');
    }

    /**
     * Delete an imported STL object (including STL trees)
     * @param {BABYLON.Mesh} obj - The STL object to delete
     */
    deleteImportedSTLObject(obj) {
        if (!obj) return;
        
        const scene = this.sceneManager ? this.sceneManager.getScene() : null;
        if (!scene) {
            console.warn('Scene not available for deleting STL object');
            return;
        }
        
        // Remove from selection manager first
        if (this.selectionManager) {
            this.selectionManager.removeSelectableObject(obj);
        }
        
        // Remove from SceneManager if it's a building
        if (obj.userData && obj.userData.type === 'building' && this.sceneManager) {
            try {
                // Find and remove building from SceneManager
                const buildings = this.sceneManager.getBuildings();
                const buildingIndex = buildings.findIndex(b => {
                    // Buildings can be stored as {mesh: ...} or directly as mesh
                    return (b.mesh && b.mesh === obj) || (b === obj);
                });
                if (buildingIndex !== -1) {
                    buildings.splice(buildingIndex, 1);
                }
            } catch (error) {
                console.warn('Error removing building from SceneManager:', error);
            }
        }
        
        // Remove from scene
        try {
            scene.removeMesh(obj);
        } catch (error) {
            console.warn('Error removing mesh from scene:', error);
        }
        
        // Dispose material if not shared
        if (obj.material) {
            // Check if this material is used by other meshes in the scene
            const isMaterialShared = scene.meshes.some(otherMesh => 
                otherMesh !== obj && 
                otherMesh.material === obj.material &&
                !otherMesh.isDisposed()
            );
            
            // Only dispose the material if it's not shared
            if (!isMaterialShared) {
                try {
                    obj.material.dispose();
                } catch (error) {
                    console.warn('Error disposing material:', error);
                }
            }
        }
        
        // Dispose the mesh
        try {
            obj.dispose();
        } catch (error) {
            console.warn('Error disposing mesh:', error);
        }
        
        console.log(`Deleted imported STL object: ${obj.name}`);
    }

    /**
     * Create empty scene with only ground
     */
    createEmptyScene() {
        // Use selectAll and deleteSelected approach - this is more reliable
        // Note: selectAll should be called before this method (from UIManager)
        
        // Delete all selected objects
        this.deleteSelected();
        
        // IMPORTANT: Also explicitly clear all STL objects that might not have been selected
        // This ensures STL trees and other STL objects are completely removed
        const scene = this.sceneManager ? this.sceneManager.getScene() : null;
        if (scene) {
            const allMeshes = scene.meshes.slice(); // Copy array to avoid modification during iteration
            allMeshes.forEach(mesh => {
                if (mesh && !mesh.isDisposed() && mesh.userData && mesh.userData.isImportedSTL) {
                    console.log(`[createEmptyScene] Removing remaining STL object: ${mesh.name}`);
                    this.deleteImportedSTLObject(mesh);
                }
            });
            
            // Also check transformNodes for STL objects (in case STL trees are stored as TransformNodes)
            const allTransformNodes = scene.transformNodes.slice();
            allTransformNodes.forEach(transformNode => {
                if (transformNode && transformNode.userData && transformNode.userData.isImportedSTL) {
                    console.log(`[createEmptyScene] Removing remaining STL TransformNode: ${transformNode.name}`);
                    // Get all child meshes and dispose them
                    const childMeshes = transformNode.getChildMeshes();
                    childMeshes.forEach(childMesh => {
                        if (childMesh && !childMesh.isDisposed()) {
                            scene.removeMesh(childMesh);
                            if (childMesh.material && !childMesh.material.getClassName().includes('Shared')) {
                                childMesh.material.dispose();
                            }
                            childMesh.dispose();
                        }
                    });
                    // Remove the TransformNode
                    scene.removeTransformNode(transformNode);
                    transformNode.dispose();
                }
            });
        }
        
        // Also clear all trees explicitly (to ensure TreeManager.trees array is cleared)
        if (this.treeManager && this.treeManager.clearAllTrees) {
            this.treeManager.clearAllTrees();
        }
        
        // Clear all buildings (this also clears roads and polygons)
        // This will clear any remaining buildings that weren't selected
        this.sceneManager.clearBuildings();
        this.buildingGenerator.clearBuildings();
        
        // Clear all rectangles, circles, and polygons
        this.clear2DShapes();

        // Reset camera
        if (this.cameraController && this.cameraController.resetCamera) {
            this.cameraController.resetCamera();
        }

        // Reset UI values
        const buildingCount = document.getElementById('buildingCount');
        const buildingCountValue = document.getElementById('buildingCountValue');
        const minHeight = document.getElementById('minHeight');
        const minHeightValue = document.getElementById('minHeightValue');
        const maxHeight = document.getElementById('maxHeight');
        const maxHeightValue = document.getElementById('maxHeightValue');
        
        if (buildingCount) buildingCount.value = 70;
        if (buildingCountValue) buildingCountValue.textContent = '70';
        if (minHeight) minHeight.value = 4;
        if (minHeightValue) minHeightValue.textContent = '4';
        if (maxHeight) maxHeight.value = 20;
        if (maxHeightValue) maxHeightValue.textContent = '20';

        // Ensure ground is visible
        if (!this.sceneManager.getGround()) {
            this.sceneManager.createGround();
        }
        
        // Dispatch scene change event to update object list
        this.dispatchSceneChangeEvent();
        
        // Force update object list to ensure it's synchronized
        if (this.objectListManager && this.objectListManager.updateObjectList) {
            this.objectListManager.updateObjectList();
        }
    }

    /**
     * Check if object is a 2D shape
     */
    is2DShape(obj) {
        if (!obj || !obj.name) return false;
        
        const shapeNames = ['rectangle', 'circle', 'triangle', 'text', 'polyline', 'line'];
        return shapeNames.some(name => obj.name.includes(name));
    }

    /**
     * Check if object is a tree
     */
    isTree(obj) {
        if (!obj || !obj.name) return false;
        
        // Check if it's a tree by name pattern
        const isTreeByName = obj.name.startsWith('tree_') || 
                           obj.name.includes('_tree_') || 
                           obj.name.startsWith('simple_tree_') ||
                           (obj.name.startsWith('tree') && /^\d+$/.test(obj.name.substring(4)));
        
        // Also check if it's a TransformNode that's a tree parent
        if (!isTreeByName && obj instanceof BABYLON.TransformNode && this.treeManager) {
            const treeData = this.treeManager.trees.find(t => t.parent === obj);
            return treeData !== undefined;
        }
        
        return isTreeByName;
    }

    /**
     * Check if object is a polygon
     */
    isPolygon(obj) {
        if (!obj || !obj.name) return false;
        
        return obj.name.includes('polygon');
    }

    /**
     * Clear all 2D shapes
     */
    clear2DShapes() {
        // Clear rectangles
        if (this.rectangleManager) {
            this.rectangleManager.clearAllRectangles();
        }
        
        // Clear circles
        if (this.circleManager) {
            this.circleManager.clearAllCircles();
        }
        
        // Clear polygons
        if (this.polygonManager) {
            this.polygonManager.clearAllPolygons();
        }
        
        // Clear other shapes from shape2DManager if it exists
        if (this.shape2DManager) {
            this.shape2DManager.clearAllShapes();
        }
        
        console.log('All 2D shapes cleared');
    }

    /**
     * Generate unique name based on type
     */
    generateUniqueNameByType(type) {
        const scene = this.sceneManager.getScene();
        
        // Special handling for buildings: use buildingشماره format (without underscore)
        if (type === 'building') {
            const usedNumbers = new Set();
            let maxNumber = 0;
            
            // Check all meshes in the scene for building names
            // Support both formats: building_1 (old), building1 (new)
            scene.meshes.forEach(mesh => {
                if (mesh.name && mesh.isEnabled() && !mesh.isDisposed()) {
                    // Check for buildingشماره format (without underscore) - new format
                    const noUnderscoreMatch = mesh.name.match(/^building(\d+)$/);
                    if (noUnderscoreMatch) {
                        const number = parseInt(noUnderscoreMatch[1]);
                        usedNumbers.add(number);
                        if (number > maxNumber) {
                            maxNumber = number;
                        }
                    }
                    // Also check for building_شماره format (with underscore) for backward compatibility
                    const underscoreMatch = mesh.name.match(/^building_(\d+)$/);
                    if (underscoreMatch) {
                        const number = parseInt(underscoreMatch[1]);
                        usedNumbers.add(number);
                        if (number > maxNumber) {
                            maxNumber = number;
                        }
                    }
                }
            });
            
            // Start from maxNumber + 1, but check for duplicates
            let nextNumber = maxNumber + 1;
            
            // Keep incrementing until we find a unique name
            while (usedNumbers.has(nextNumber)) {
                nextNumber++;
            }
            
            // Verify the name doesn't exist in the scene
            let proposedName = `building${nextNumber}`;
            while (scene.meshes.some(mesh => mesh.name === proposedName && !mesh.isDisposed())) {
                nextNumber++;
                proposedName = `building${nextNumber}`;
            }
            
            return proposedName;
        }
        
        // For other types (ground, waterway, highway, grass), use maxNumber + 1 logic
        let maxNumber = 0;
        const usedNumbers = new Set();
        
        // Check all meshes in the scene for names of this type
        // Only count enabled meshes that are still in the scene
        scene.meshes.forEach(mesh => {
            if (mesh.name && mesh.isEnabled() && !mesh.isDisposed() && mesh.name.startsWith(type) && /^\d+$/.test(mesh.name.substring(type.length))) {
                const match = mesh.name.match(new RegExp(`^${type}(\\d+)$`));
                if (match) {
                    const number = parseInt(match[1]);
                    usedNumbers.add(number);
                    if (number > maxNumber) {
                        maxNumber = number;
                    }
                }
            }
        });
        
        // Start from maxNumber + 1, but check for duplicates
        let nextNumber = maxNumber + 1;
        
        // Keep incrementing until we find a unique name
        while (usedNumbers.has(nextNumber)) {
            nextNumber++;
        }
        
        // Verify the name doesn't exist in the scene
        let proposedName = `${type}${nextNumber}`;
        while (scene.meshes.some(mesh => mesh.name === proposedName && !mesh.isDisposed())) {
            nextNumber++;
            proposedName = `${type}${nextNumber}`;
        }
        
        return proposedName;
    }

    /**
     * Generate unique tree name (tree1, tree2, tree3, ...)
     * Checks both TransformNodes and meshes in the scene
     */
    generateUniqueTreeName() {
        const usedNumbers = new Set();
        const scene = this.sceneManager.getScene();
        
        // Check TransformNodes (tree parents)
        if (scene && scene.transformNodes) {
            scene.transformNodes.forEach(node => {
                if (node.name && !node.isDisposed()) {
                    // Check for new naming: tree1, tree2, ...
                    const newFormatMatch = node.name.match(/^tree(\d+)$/);
                    if (newFormatMatch) {
                        const number = parseInt(newFormatMatch[1]);
                        usedNumbers.add(number);
                    }
                    // Also check for old format: tree_1_1, 3_tree_207, etc.
                    // Extract the last number from names like "3_tree_207"
                    const oldFormatMatch = node.name.match(/(?:tree|_tree_)(\d+)(?:_|$)/);
                    if (oldFormatMatch) {
                        const number = parseInt(oldFormatMatch[1]);
                        usedNumbers.add(number);
                    }
                }
            });
        }
        
        // Also check TreeManager trees
        if (this.treeManager && this.treeManager.trees) {
            this.treeManager.trees.forEach(tree => {
                if (tree.parent && tree.parent.name && !tree.parent.isDisposed()) {
                    const newFormatMatch = tree.parent.name.match(/^tree(\d+)$/);
                    if (newFormatMatch) {
                        const number = parseInt(newFormatMatch[1]);
                        usedNumbers.add(number);
                    }
                    const oldFormatMatch = tree.parent.name.match(/(?:tree|_tree_)(\d+)(?:_|$)/);
                    if (oldFormatMatch) {
                        const number = parseInt(oldFormatMatch[1]);
                        usedNumbers.add(number);
                    }
                }
            });
        }
        
        // Find the first available number
        let nextNumber = 1;
        while (usedNumbers.has(nextNumber)) {
            nextNumber++;
        }
        
        return `tree${nextNumber}`;
    }

    /**
     * Generate unique building name (for backward compatibility)
     */
    generateUniqueBuildingName() {
        return this.generateUniqueNameByType('building');
    }

    /**
     * Get shape type (rectangle, circle, polygon, etc.)
     */
    getShapeType(shape) {
        // First check if it's a tree (before checking userData)
        if (this.isTree(shape) || (shape instanceof BABYLON.TransformNode && this.treeManager)) {
            // Check if it's in TreeManager
            if (this.treeManager) {
                const treeData = this.treeManager.trees.find(t => t.parent === shape || t.meshes.includes(shape));
                if (treeData) {
                    return 'tree';
                }
            }
            // If it's a TransformNode with tree name pattern, it's a tree
            if (shape instanceof BABYLON.TransformNode && 
                (shape.name.startsWith('tree') || shape.name.includes('_tree_'))) {
                return 'tree';
            }
        }
        
        // First check userData for explicit shape type
        if (shape.userData && shape.userData.shapeType) {
            return shape.userData.shapeType;
        }
        
        // IMPORTANT: Check for polygon BEFORE checking dimensions
        // Polygons have points array, which is the most reliable indicator
        if (shape.userData && shape.userData.points && Array.isArray(shape.userData.points) && shape.userData.points.length >= 3) {
            return 'polygon';
        }
        
        // Also check name for polygon (before dimensions check)
        if (shape.name && (shape.name.includes('polygon') || shape.name.startsWith('ground') || shape.name.startsWith('grass') || 
            shape.name.startsWith('waterway') || shape.name.startsWith('highway'))) {
            // Double-check: if it has points, it's definitely a polygon
            if (shape.userData && shape.userData.points) {
                return 'polygon';
            }
        }
        
        // Check if this is a circle by looking for diameterTop in dimensions
        if (shape.userData && shape.userData.dimensions && shape.userData.dimensions.diameterTop !== undefined) {
            return 'circle';
        }
        
        // Check if this is a rectangle by looking for width/depth in dimensions
        if (shape.userData && shape.userData.dimensions && 
            (shape.userData.dimensions.width !== undefined || shape.userData.dimensions.depth !== undefined)) {
            return 'rectangle';
        }
        
        // Fallback to name-based detection
        if (shape.name.includes('circle')) return 'circle';
        if (shape.name.includes('rectangle')) return 'rectangle';
        if (shape.name.includes('polygon')) return 'polygon';
        if (shape.name.includes('building')) return 'building';
        if (shape.name.includes('tree') || shape.name.includes('_tree_')) return 'tree';
        return 'rectangle'; // Default
    }
}

