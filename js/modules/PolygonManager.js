/**
 * PolygonManager - Manages polygon drawing functionality
 */
class PolygonManager {
    constructor(scene, selectionManager) {
        this.scene = scene;
        this.selectionManager = selectionManager;
        this.isCurrentlyDrawing = false;
        this.points = [];
        this.currentPolygon = null;
        this.previewLines = [];
        this.previewPoint = null;
        this.minPoints = 3; // Minimum points for a polygon
        this.maxPoints = 20; // Maximum points for a polygon
        this.snapDistance = 1.0; // Distance for snapping to first point
        this.isSnappedToFirst = false; // Whether mouse is snapped to first point
        
        // Callback for when polygon is completed
        this.onPolygonCompleted = null;
        this.onPolygonCancelled = null;
        
        // Material for polygon
        this.polygonMaterial = new BABYLON.StandardMaterial("polygonMaterial", this.scene);
        this.polygonMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2); // Green color like other shapes
        this.polygonMaterial.backFaceCulling = false; // Make it 2-sided
        
        // Material for preview
        this.previewMaterial = new BABYLON.StandardMaterial("polygonPreviewMaterial", this.scene);
        this.previewMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.2);
        this.previewMaterial.alpha = 0.5;
        this.previewMaterial.backFaceCulling = false;
        
        // Material for points
        this.pointMaterial = new BABYLON.StandardMaterial("polygonPointMaterial", this.scene);
        this.pointMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
        this.pointMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    }

    /**
     * Start polygon drawing
     */
    startDrawing() {
        this.isCurrentlyDrawing = true;
        this.points = [];
        this.clearPreview();
        console.log('Polygon drawing started');
    }

    /**
     * Stop polygon drawing
     */
    stopDrawing() {
        this.isCurrentlyDrawing = false;
        this.points = [];
        this.isSnappedToFirst = false;
        this.clearPreview();
        console.log('Polygon drawing stopped');
    }

    /**
     * Add a point to the current polygon
     * @param {BABYLON.Vector3} point - The point to add
     */
    addPoint(point) {
        if (!this.isCurrentlyDrawing) return;

        // If we're snapped to first point, complete the polygon instead of adding a new point
        if (this.isSnappedToFirst && this.points.length >= this.minPoints) {
            console.log('Completing polygon by clicking on first point');
            this.completePolygon();
            return;
        }

        // Clone the point to avoid reference issues
        const newPoint = point.clone();
        newPoint.y = 0.01; // Slightly above ground to avoid z-fighting
        
        this.points.push(newPoint);
        console.log(`Point ${this.points.length} added:`, newPoint);
        console.log(`Polygon will connect points in order: ${this.points.map((p, i) => `${i + 1}→${i + 2}`).join(', ')}${this.points.length >= this.minPoints ? `, ${this.points.length}→1 (closing)` : ''}`);

        // Update preview (this will automatically redraw the polygon)
        this.updatePreview();
    }

    /**
     * Remove the last point from the current polygon
     * @returns {boolean} True if a point was removed
     */
    removeLastPoint() {
        if (!this.isCurrentlyDrawing || this.points.length === 0) {
            console.log('No points to remove or not currently drawing');
            return false;
        }

        // Remove the last point
        const removedPoint = this.points.pop();
        console.log(`Point ${this.points.length + 1} removed:`, removedPoint);
        console.log(`Remaining points: ${this.points.length}`);

        // Reset snap state
        this.isSnappedToFirst = false;

        // Update preview (this will automatically redraw the polygon)
        this.updatePreview();

        // Show feedback message
        if (this.points.length === 0) {
            console.log('All points removed. Click to add new points.');
        } else {
            console.log(`Continue adding points. Current: ${this.points.length} points`);
        }

        return true;
    }

    /**
     * Update preview with current points and mouse position
     * @param {BABYLON.Vector3} mousePoint - Current mouse position (optional)
     */
    updatePreview(mousePoint = null) {
        this.clearPreview();

        if (this.points.length === 0) return;

        // Always recalculate and redraw the polygon when points change
        this.redrawPolygon();

        // Create point markers for all points with order indicators
        this.points.forEach((point, index) => {
            const pointMesh = BABYLON.MeshBuilder.CreateSphere(`polygon_point_${index}`, {
                diameter: 0.3
            }, this.scene);
            pointMesh.position = point;
            pointMesh.material = this.pointMaterial;
            pointMesh.renderingGroupId = 1;
            this.previewLines.push(pointMesh);
            
            // Add number indicator to show point order
            const textMesh = BABYLON.MeshBuilder.CreatePlane(`polygon_text_${index}`, {
                width: 0.2,
                height: 0.2
            }, this.scene);
            textMesh.position = point.clone();
            textMesh.position.y = 0.1;
            textMesh.lookAt(point.add(new BABYLON.Vector3(0, 1, 0)));
            
            // Create dynamic texture for number
            const dynamicTexture = new BABYLON.DynamicTexture(`polygon_texture_${index}`, 64, this.scene);
            const context = dynamicTexture.getContext();
            context.fillStyle = "white";
            context.fillRect(0, 0, 64, 64);
            context.fillStyle = "black";
            context.font = "bold 32px Arial";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText((index + 1).toString(), 32, 32);
            dynamicTexture.update();
            
            const textMaterial = new BABYLON.StandardMaterial(`polygon_text_material_${index}`, this.scene);
            textMaterial.diffuseTexture = dynamicTexture;
            textMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            textMesh.material = textMaterial;
            textMesh.renderingGroupId = 1;
            this.previewLines.push(textMesh);
        });

        // Create lines between points with direction arrows
        for (let i = 0; i < this.points.length - 1; i++) {
            const line = this.createLine(this.points[i], this.points[i + 1]);
            this.previewLines.push(line);
            
            // Add arrow to show direction
            this.createDirectionArrow(this.points[i], this.points[i + 1], i);
        }

        // If we have enough points, show closing line from last to first point
        if (this.points.length >= this.minPoints) {
            const closingLine = this.createLine(this.points[this.points.length - 1], this.points[0]);
            closingLine.color = new BABYLON.Color3(0.2, 0.8, 0.2); // Green color for closing line
            this.previewLines.push(closingLine);
            
            // Add arrow to closing line
            this.createDirectionArrow(this.points[this.points.length - 1], this.points[0], 'closing');
        }

        // If we have a mouse point, handle snapping and create preview
        if (mousePoint && this.points.length > 0) {
            let actualMousePoint = mousePoint;
            
            // Check for snapping to first point if we have enough points
            if (this.points.length >= this.minPoints) {
                const distanceToFirst = BABYLON.Vector3.Distance(mousePoint, this.points[0]);
                
                if (distanceToFirst <= this.snapDistance) {
                    // Snap to first point
                    actualMousePoint = this.points[0].clone();
                    this.isSnappedToFirst = true;
                    
                    // Create special snap indicator
                    const snapIndicator = BABYLON.MeshBuilder.CreateSphere("polygon_snap_indicator", {
                        diameter: 0.4
                    }, this.scene);
                    snapIndicator.position = this.points[0].clone();
                    snapIndicator.position.y = 0.02;
                    snapIndicator.material = this.previewMaterial;
                    snapIndicator.renderingGroupId = 1;
                    this.previewLines.push(snapIndicator);
                    
                    console.log('Snapped to first point');
                } else if (this.isSnappedToFirst && distanceToFirst > this.snapDistance * 1.5) {
                    // Unsnap if moved far enough away
                    this.isSnappedToFirst = false;
                    console.log('Unsnapped from first point');
                }
            }
            
            // Create preview line to actual mouse position (snapped or not)
            const previewLine = this.createLine(this.points[this.points.length - 1], actualMousePoint);
            if (this.isSnappedToFirst) {
                previewLine.color = new BABYLON.Color3(0.8, 0.2, 0.2); // Red color when snapped
            }
            this.previewLines.push(previewLine);
            
            // Create preview point at actual mouse position
            this.previewPoint = BABYLON.MeshBuilder.CreateSphere("polygon_preview_point", {
                diameter: 0.2
            }, this.scene);
            this.previewPoint.position = actualMousePoint.clone();
            this.previewPoint.position.y = 0.01;
            this.previewPoint.material = this.previewMaterial;
            this.previewPoint.renderingGroupId = 1;
        }
    }

    /**
     * Create a line between two points
     * @param {BABYLON.Vector3} start - Start point
     * @param {BABYLON.Vector3} end - End point
     * @returns {BABYLON.Mesh} The line mesh
     */
    createLine(start, end) {
        const line = BABYLON.MeshBuilder.CreateLines("polygon_line", {
            points: [start, end]
        }, this.scene);
        line.color = new BABYLON.Color3(0.8, 0.8, 0.2);
        line.renderingGroupId = 1;
        return line;
    }

    /**
     * Create a direction arrow between two points
     * @param {BABYLON.Vector3} start - Start point
     * @param {BABYLON.Vector3} end - End point
     * @param {number} index - Arrow index for unique naming
     */
    createDirectionArrow(start, end, index) {
        // Calculate direction vector
        const direction = end.subtract(start);
        const length = direction.length();
        
        if (length < 0.1) return; // Skip very short lines
        
        // Normalize direction
        direction.normalize();
        
        // Calculate arrow position (80% along the line)
        const arrowPosition = start.add(direction.scale(length * 0.8));
        
        // Create arrow as a small cone
        const arrow = BABYLON.MeshBuilder.CreateCylinder(`polygon_arrow_${index}`, {
            height: 0.2,
            diameterTop: 0,
            diameterBottom: 0.15
        }, this.scene);
        
        arrow.position = arrowPosition;
        arrow.position.y = 0.05;
        
        // Rotate arrow to point in direction
        const angle = Math.atan2(direction.x, direction.z);
        arrow.rotation.y = angle;
        
        // Create arrow material
        const arrowMaterial = new BABYLON.StandardMaterial(`polygon_arrow_material_${index}`, this.scene);
        arrowMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2); // Red color for arrows
        arrowMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        arrow.material = arrowMaterial;
        arrow.renderingGroupId = 1;
        
        this.previewLines.push(arrow);
    }

    /**
     * Redraw the polygon based on current points
     */
    redrawPolygon() {
        if (this.points.length < this.minPoints) {
            // Clear polygon if not enough points
            if (this.currentPolygon) {
                this.currentPolygon.dispose();
                this.currentPolygon = null;
            }
            return;
        }

        // Clean up points before creating polygon
        const cleanedPoints = this.cleanupPolygonPoints(this.points);
        if (cleanedPoints.length < this.minPoints) {
            console.warn('Not enough valid points after cleanup');
            if (this.currentPolygon) {
                this.currentPolygon.dispose();
                this.currentPolygon = null;
            }
            return;
        }

        // Clear existing polygon
        if (this.currentPolygon) {
            this.currentPolygon.dispose();
        }

        // Create polygon using custom mesh
        const center = this.calculateCenter(cleanedPoints);
        const relativePoints = cleanedPoints.map(point => point.subtract(center));
        
        // Create polygon mesh using custom vertices
        this.currentPolygon = this.createCustomPolygonMesh(relativePoints);

        this.currentPolygon.material = this.polygonMaterial;
        this.currentPolygon.renderingGroupId = 1;
        this.currentPolygon.receiveShadows = true;
        this.currentPolygon.castShadows = true;

        // Position the polygon at the center of points
        this.currentPolygon.position = center;

        console.log(`Polygon redrawn with ${cleanedPoints.length} points (cleaned from ${this.points.length})`);
    }

    /**
     * Create the final polygon mesh
     */
    createPolygon() {
        if (this.points.length < this.minPoints) return;

        // Use the new redraw method
        this.redrawPolygon();
    }

    /**
     * Create custom polygon mesh
     * @param {BABYLON.Vector3[]} relativePoints - Points relative to center
     * @returns {BABYLON.Mesh} The polygon mesh
     */
    createCustomPolygonMesh(relativePoints) {
        // Create vertices array
        const positions = [];
        const indices = [];
        const normals = [];
        const uvs = [];

        // Add polygon vertices (no center point needed)
        relativePoints.forEach((point, index) => {
            positions.push(point.x, 0.01, point.z);
            normals.push(0, 1, 0); // Normal pointing upward
            
            // UV coordinates for texture mapping
            const u = (point.x + 1) / 2; // Normalize to 0-1
            const v = (point.z + 1) / 2;
            uvs.push(u, v);
        });

        // Create triangles using proper polygon triangulation
        this.triangulatePolygon(relativePoints, indices);

        // Create the mesh
        const mesh = new BABYLON.Mesh("polygon", this.scene);
        
        // Set vertex data
        mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
        mesh.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs);
        mesh.setIndices(indices);

        return mesh;
    }

    /**
     * Triangulate a polygon using ear clipping algorithm
     * @param {BABYLON.Vector3[]} points - Polygon vertices
     * @param {number[]} indices - Array to store triangle indices
     */
    triangulatePolygon(points, indices) {
        if (points.length < 3) return;
        
        // Check if polygon is complex (concave or self-intersecting)
        const isComplex = this.isComplexPolygon(points);
        
        if (isComplex) {
            console.log('Complex polygon detected, using advanced triangulation');
            this.triangulateComplexPolygon(points, indices);
            return;
        }
        
        // Validate polygon before triangulation
        if (!this.validatePolygon(points)) {
            console.warn('Invalid polygon detected, using fan triangulation');
            this.fanTriangulation(points, indices);
            return;
        }
        
        if (points.length === 3) {
            // Triangle - just one triangle (reverse order for upward normals)
            indices.push(0, 2, 1);
            return;
        }
        
        if (points.length === 4) {
            // Quad - two triangles (reverse order for upward normals)
            indices.push(0, 2, 1);
            indices.push(0, 3, 2);
            return;
        }
        
        // For polygons with more than 4 points, use ear clipping
        // Create a list of vertex indices
        const vertexIndices = [];
        for (let i = 0; i < points.length; i++) {
            vertexIndices.push(i);
        }
        
        // Ear clipping algorithm with improved stability
        let iterations = 0;
        const maxIterations = points.length * 2; // Prevent infinite loops
        
        while (vertexIndices.length > 3 && iterations < maxIterations) {
            let earFound = false;
            iterations++;
            
            for (let i = 0; i < vertexIndices.length; i++) {
                const prev = vertexIndices[(i - 1 + vertexIndices.length) % vertexIndices.length];
                const curr = vertexIndices[i];
                const next = vertexIndices[(i + 1) % vertexIndices.length];
                
                if (this.isEar(points, vertexIndices, prev, curr, next)) {
                    // Add triangle (reverse order for upward normals)
                    indices.push(prev, next, curr);
                    
                    // Remove the ear vertex
                    vertexIndices.splice(i, 1);
                    earFound = true;
                    break;
                }
            }
            
            if (!earFound) {
                // Try alternative approaches before giving up
                if (this.tryAlternativeEarClipping(points, vertexIndices, indices)) {
                    continue;
                }
                
                // Final fallback to fan triangulation
                console.warn('Ear clipping failed after', iterations, 'iterations, using fan triangulation');
                this.fanTriangulation(points, indices, vertexIndices);
                break;
            }
        }
        
        // Add the final triangle (reverse order for upward normals)
        if (vertexIndices.length === 3) {
            indices.push(vertexIndices[0], vertexIndices[2], vertexIndices[1]);
        }
    }
    
    /**
     * Check if polygon is complex (concave or self-intersecting)
     * @param {BABYLON.Vector3[]} points - Polygon vertices
     * @returns {boolean} True if polygon is complex
     */
    isComplexPolygon(points) {
        if (points.length < 4) return false;
        
        // Check for self-intersections
        if (this.hasSelfIntersections(points)) {
            console.log('Self-intersecting polygon detected');
            return true;
        }
        
        // Check for concavity
        if (this.isConcavePolygon(points)) {
            console.log('Concave polygon detected');
            return true;
        }
        
        return false;
    }

    /**
     * Check if polygon has self-intersections
     * @param {BABYLON.Vector3[]} points - Polygon vertices
     * @returns {boolean} True if polygon has self-intersections
     */
    hasSelfIntersections(points) {
        const n = points.length;
        
        for (let i = 0; i < n; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % n];
            
            for (let j = i + 2; j < n; j++) {
                const p3 = points[j];
                const p4 = points[(j + 1) % n];
                
                // Skip adjacent edges
                if (j === (i + 1) % n || i === (j + 1) % n) continue;
                
                if (this.linesIntersect(p1, p2, p3, p4)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Check if two line segments intersect
     * @param {BABYLON.Vector3} p1 - First line start
     * @param {BABYLON.Vector3} p2 - First line end
     * @param {BABYLON.Vector3} p3 - Second line start
     * @param {BABYLON.Vector3} p4 - Second line end
     * @returns {boolean} True if lines intersect
     */
    linesIntersect(p1, p2, p3, p4) {
        const denom = (p4.z - p3.z) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.z - p1.z);
        
        if (Math.abs(denom) < 0.0001) return false; // Parallel lines
        
        const ua = ((p4.x - p3.x) * (p1.z - p3.z) - (p4.z - p3.z) * (p1.x - p3.x)) / denom;
        const ub = ((p2.x - p1.x) * (p1.z - p3.z) - (p2.z - p1.z) * (p1.x - p3.x)) / denom;
        
        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }

    /**
     * Check if polygon is concave
     * @param {BABYLON.Vector3[]} points - Polygon vertices
     * @returns {boolean} True if polygon is concave
     */
    isConcavePolygon(points) {
        let sign = 0;
        const n = points.length;
        
        for (let i = 0; i < n; i++) {
            const prev = points[(i - 1 + n) % n];
            const curr = points[i];
            const next = points[(i + 1) % n];
            
            // Use the improved cross product calculation
            const cross = this.calculateCrossProduct(prev, curr, next);
            
            if (Math.abs(cross) > 0.0001) {
                const currentSign = cross > 0 ? 1 : -1;
                
                if (sign === 0) {
                    sign = currentSign;
                } else if (sign !== currentSign) {
                    return true; // Concave
                }
            }
        }
        
        return false;
    }

    /**
     * Triangulate complex polygon using constrained Delaunay triangulation
     * @param {BABYLON.Vector3[]} points - Polygon vertices
     * @param {number[]} indices - Array to store triangle indices
     */
    triangulateComplexPolygon(points, indices) {
        console.log('Using complex polygon triangulation for', points.length, 'points');
        
        // For complex polygons, use a more robust approach
        // First, try to decompose into simpler polygons
        const simplePolygons = this.decomposeComplexPolygon(points);
        
        if (simplePolygons.length > 1) {
            console.log('Decomposed into', simplePolygons.length, 'simple polygons');
            // Triangulate each simple polygon
            simplePolygons.forEach(polygon => {
                this.triangulateSimplePolygon(polygon, indices);
            });
        } else {
            // Use advanced ear clipping with better handling
            this.advancedEarClipping(points, indices);
        }
    }

    /**
     * Decompose complex polygon into simpler polygons
     * @param {BABYLON.Vector3[]} points - Original polygon vertices
     * @returns {BABYLON.Vector3[][]} Array of simpler polygons
     */
    decomposeComplexPolygon(points) {
        // For now, return the original polygon
        // In a full implementation, this would use polygon decomposition algorithms
        return [points];
    }

    /**
     * Triangulate a simple polygon
     * @param {BABYLON.Vector3[]} points - Polygon vertices
     * @param {number[]} indices - Array to store triangle indices
     */
    triangulateSimplePolygon(points, indices) {
        if (points.length < 3) return;
        
        if (points.length === 3) {
            indices.push(0, 2, 1);
            return;
        }
        
        // Use fan triangulation for simple polygons
        this.fanTriangulation(points, indices);
    }

    /**
     * Advanced ear clipping for complex polygons
     * @param {BABYLON.Vector3[]} points - Polygon vertices
     * @param {number[]} indices - Array to store triangle indices
     */
    advancedEarClipping(points, indices) {
        const vertexIndices = [];
        for (let i = 0; i < points.length; i++) {
            vertexIndices.push(i);
        }
        
        let iterations = 0;
        const maxIterations = points.length * 3;
        
        while (vertexIndices.length > 3 && iterations < maxIterations) {
            let earFound = false;
            iterations++;
            
            // Try to find an ear with more relaxed constraints
            for (let i = 0; i < vertexIndices.length; i++) {
                const prev = vertexIndices[(i - 1 + vertexIndices.length) % vertexIndices.length];
                const curr = vertexIndices[i];
                const next = vertexIndices[(i + 1) % vertexIndices.length];
                
                if (this.isAdvancedEar(points, vertexIndices, prev, curr, next)) {
                    indices.push(prev, next, curr);
                    vertexIndices.splice(i, 1);
                    earFound = true;
                    break;
                }
            }
            
            if (!earFound) {
                // Force triangulation by removing problematic vertices
                console.warn('Advanced ear clipping failed, forcing triangulation');
                this.forceTriangulation(points, vertexIndices, indices);
                break;
            }
        }
        
        // Add final triangle
        if (vertexIndices.length === 3) {
            indices.push(vertexIndices[0], vertexIndices[2], vertexIndices[1]);
        }
    }


    /**
     * Check if vertex is an ear with advanced criteria
     * @param {BABYLON.Vector3[]} points - All polygon points
     * @param {number[]} vertexIndices - Current vertex indices
     * @param {number} prev - Previous vertex index
     * @param {number} curr - Current vertex index
     * @param {number} next - Next vertex index
     * @returns {boolean} True if the vertex is an ear
     */
    isAdvancedEar(points, vertexIndices, prev, curr, next) {
        const p1 = points[prev];
        const p2 = points[curr];
        const p3 = points[next];
        
        // More relaxed convexity check
        const cross = (p2.x - p1.x) * (p3.z - p1.z) - (p2.z - p1.z) * (p3.x - p1.x);
        if (cross < -0.001) return false; // Too concave
        
        // Check for intersections with other edges
        for (let i = 0; i < vertexIndices.length; i++) {
            const idx = vertexIndices[i];
            if (idx === prev || idx === curr || idx === next) continue;
            
            const point = points[idx];
            if (this.isPointInTriangle(point, p1, p2, p3)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Force triangulation when normal methods fail
     * @param {BABYLON.Vector3[]} points - All polygon points
     * @param {number[]} vertexIndices - Current vertex indices
     * @param {number[]} indices - Array to store triangle indices
     */
    forceTriangulation(points, vertexIndices, indices) {
        // Use fan triangulation from a safe vertex
        const centerIndex = Math.floor(vertexIndices.length / 2);
        const center = vertexIndices[centerIndex];
        
        for (let i = 1; i < vertexIndices.length - 1; i++) {
            const next = (centerIndex + i) % vertexIndices.length;
            const prev = (centerIndex + i + 1) % vertexIndices.length;
            indices.push(vertexIndices[center], vertexIndices[next], vertexIndices[prev]);
        }
    }


    /**
     * Validate polygon for triangulation
     * @param {BABYLON.Vector3[]} points - Polygon vertices
     * @returns {boolean} True if polygon is valid for triangulation
     */
    validatePolygon(points) {
        if (points.length < 3) return false;
        
        // Check for duplicate points
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                if (BABYLON.Vector3.Distance(points[i], points[j]) < 0.001) {
                    console.warn('Duplicate points detected in polygon');
                    return false;
                }
            }
        }
        
        // Check for collinear points
        for (let i = 0; i < points.length; i++) {
            const prev = points[(i - 1 + points.length) % points.length];
            const curr = points[i];
            const next = points[(i + 1) % points.length];
            
            const cross = (curr.x - prev.x) * (next.z - prev.z) - (curr.z - prev.z) * (next.x - prev.x);
            if (Math.abs(cross) < 0.001) {
                console.warn('Collinear points detected in polygon');
                return false;
            }
        }
        
        return true;
    }

    /**
     * Fan triangulation fallback method
     * @param {BABYLON.Vector3[]} points - All polygon points
     * @param {number[]} indices - Array to store triangle indices
     * @param {number[]} vertexIndices - Current vertex indices (optional)
     */
    fanTriangulation(points, indices, vertexIndices = null) {
        if (!vertexIndices) {
            vertexIndices = [];
            for (let i = 0; i < points.length; i++) {
                vertexIndices.push(i);
            }
        }
        
        // Fan triangulation from first vertex
        for (let i = 1; i < vertexIndices.length - 1; i++) {
            indices.push(vertexIndices[0], vertexIndices[i + 1], vertexIndices[i]);
        }
    }

    /**
     * Try alternative ear clipping approaches
     * @param {BABYLON.Vector3[]} points - All polygon points
     * @param {number[]} vertexIndices - Current vertex indices
     * @param {number[]} indices - Array to store triangle indices
     * @returns {boolean} True if alternative method succeeded
     */
    tryAlternativeEarClipping(points, vertexIndices, indices) {
        // Try with relaxed convexity check
        for (let i = 0; i < vertexIndices.length; i++) {
            const prev = vertexIndices[(i - 1 + vertexIndices.length) % vertexIndices.length];
            const curr = vertexIndices[i];
            const next = vertexIndices[(i + 1) % vertexIndices.length];
            
            if (this.isEarRelaxed(points, vertexIndices, prev, curr, next)) {
                indices.push(prev, next, curr);
                vertexIndices.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    /**
     * Check if a vertex is an ear with relaxed convexity check
     * @param {BABYLON.Vector3[]} points - All polygon points
     * @param {number[]} vertexIndices - Current vertex indices
     * @param {number} prev - Previous vertex index
     * @param {number} curr - Current vertex index
     * @param {number} next - Next vertex index
     * @returns {boolean} True if the vertex is an ear
     */
    isEarRelaxed(points, vertexIndices, prev, curr, next) {
        const p1 = points[prev];
        const p2 = points[curr];
        const p3 = points[next];
        
        // Relaxed convexity check (allow slightly concave vertices)
        // Use the improved cross product calculation
        const cross = this.calculateCrossProduct(p1, p2, p3);
        if (cross < -0.001) return false; // Too concave
        
        // Check if any other vertex is inside the triangle
        for (let i = 0; i < vertexIndices.length; i++) {
            const idx = vertexIndices[i];
            if (idx === prev || idx === curr || idx === next) continue;
            
            const point = points[idx];
            if (this.isPointInTriangle(point, p1, p2, p3)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Check if a vertex is an ear (convex vertex with no other vertices inside the triangle)
     * @param {BABYLON.Vector3[]} points - All polygon points
     * @param {number[]} vertexIndices - Current vertex indices
     * @param {number} prev - Previous vertex index
     * @param {number} curr - Current vertex index
     * @param {number} next - Next vertex index
     * @returns {boolean} True if the vertex is an ear
     */
    isEar(points, vertexIndices, prev, curr, next) {
        const p1 = points[prev];
        const p2 = points[curr];
        const p3 = points[next];
        
        // Check if the triangle is convex (counter-clockwise)
        // Use more robust cross product calculation for negative coordinates
        const cross = this.calculateCrossProduct(p1, p2, p3);
        if (cross <= 0) return false; // Not convex
        
        // Check if any other vertex is inside the triangle
        for (let i = 0; i < vertexIndices.length; i++) {
            const idx = vertexIndices[i];
            if (idx === prev || idx === curr || idx === next) continue;
            
            const point = points[idx];
            if (this.isPointInTriangle(point, p1, p2, p3)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Calculate cross product for three points (more robust for negative coordinates)
     * @param {BABYLON.Vector3} p1 - First point
     * @param {BABYLON.Vector3} p2 - Second point
     * @param {BABYLON.Vector3} p3 - Third point
     * @returns {number} Cross product value
     */
    calculateCrossProduct(p1, p2, p3) {
        // Calculate vectors from p1 to p2 and p1 to p3
        const v1x = p2.x - p1.x;
        const v1z = p2.z - p1.z;
        const v2x = p3.x - p1.x;
        const v2z = p3.z - p1.z;
        
        // Cross product: v1 × v2 = v1x * v2z - v1z * v2x
        // This gives the signed area of the parallelogram formed by the vectors
        const cross = v1x * v2z - v1z * v2x;
        
        // Add small epsilon to handle floating point precision issues
        const epsilon = 1e-10;
        if (Math.abs(cross) < epsilon) {
            return 0; // Collinear points
        }
        
        return cross;
    }

    /**
     * Check if a point is inside a triangle
     * @param {BABYLON.Vector3} point - Point to check
     * @param {BABYLON.Vector3} a - Triangle vertex A
     * @param {BABYLON.Vector3} b - Triangle vertex B
     * @param {BABYLON.Vector3} c - Triangle vertex C
     * @returns {boolean} True if point is inside triangle
     */
    isPointInTriangle(point, a, b, c) {
        // Use barycentric coordinates with improved numerical stability
        const denom = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
        if (Math.abs(denom) < 0.0001) {
            // Degenerate triangle, use alternative method
            return this.isPointInTriangleAlternative(point, a, b, c);
        }
        
        const alpha = ((b.z - c.z) * (point.x - c.x) + (c.x - b.x) * (point.z - c.z)) / denom;
        const beta = ((c.z - a.z) * (point.x - c.x) + (a.x - c.x) * (point.z - c.z)) / denom;
        const gamma = 1 - alpha - beta;
        
        // Use small epsilon for numerical stability
        const epsilon = 0.0001;
        return alpha >= -epsilon && beta >= -epsilon && gamma >= -epsilon;
    }

    /**
     * Alternative point-in-triangle test using cross products
     * @param {BABYLON.Vector3} point - Point to check
     * @param {BABYLON.Vector3} a - Triangle vertex A
     * @param {BABYLON.Vector3} b - Triangle vertex B
     * @param {BABYLON.Vector3} c - Triangle vertex C
     * @returns {boolean} True if point is inside triangle
     */
    isPointInTriangleAlternative(point, a, b, c) {
        // Use cross product method for degenerate cases
        const cross1 = (b.x - a.x) * (point.z - a.z) - (b.z - a.z) * (point.x - a.x);
        const cross2 = (c.x - b.x) * (point.z - b.z) - (c.z - b.z) * (point.x - b.x);
        const cross3 = (a.x - c.x) * (point.z - c.z) - (a.z - c.z) * (point.x - c.x);
        
        // All cross products should have the same sign for point to be inside
        return (cross1 >= 0 && cross2 >= 0 && cross3 >= 0) || 
               (cross1 <= 0 && cross2 <= 0 && cross3 <= 0);
    }

    /**
     * Calculate polygon dimensions (area, perimeter, vertices)
     * @returns {Object} Dimensions object
     */
    calculatePolygonDimensions() {
        const dimensions = {
            area: 0,
            perimeter: 0,
            vertices: this.points.length
        };

        if (this.points.length < 3) return dimensions;

        // Calculate perimeter
        let perimeter = 0;
        for (let i = 0; i < this.points.length; i++) {
            const current = this.points[i];
            const next = this.points[(i + 1) % this.points.length];
            perimeter += BABYLON.Vector3.Distance(current, next);
        }
        dimensions.perimeter = perimeter.toFixed(2);

        // Calculate area using shoelace formula
        let area = 0;
        for (let i = 0; i < this.points.length; i++) {
            const current = this.points[i];
            const next = this.points[(i + 1) % this.points.length];
            area += current.x * next.z - next.x * current.z;
        }
        area = Math.abs(area) / 2;
        dimensions.area = area.toFixed(2);

        return dimensions;
    }

    /**
     * Clean up polygon points by removing duplicates and collinear points
     * @param {BABYLON.Vector3[]} points - Original polygon points
     * @returns {BABYLON.Vector3[]} Cleaned polygon points
     */
    cleanupPolygonPoints(points) {
        if (points.length < 3) return points;
        
        const cleaned = [];
        const epsilon = 0.001;
        
        // Remove duplicate points
        for (let i = 0; i < points.length; i++) {
            const current = points[i];
            let isDuplicate = false;
            
            for (let j = 0; j < cleaned.length; j++) {
                if (BABYLON.Vector3.Distance(current, cleaned[j]) < epsilon) {
                    isDuplicate = true;
                    break;
                }
            }
            
            if (!isDuplicate) {
                cleaned.push(current);
            }
        }
        
        // Remove collinear points
        const finalCleaned = [];
        for (let i = 0; i < cleaned.length; i++) {
            const prev = cleaned[(i - 1 + cleaned.length) % cleaned.length];
            const curr = cleaned[i];
            const next = cleaned[(i + 1) % cleaned.length];
            
            const cross = (curr.x - prev.x) * (next.z - prev.z) - (curr.z - prev.z) * (next.x - prev.x);
            if (Math.abs(cross) > epsilon) {
                finalCleaned.push(curr);
            }
        }
        
        return finalCleaned.length >= 3 ? finalCleaned : cleaned;
    }

    /**
     * Calculate the center point of all polygon points
     * @param {BABYLON.Vector3[]} points - Points to calculate center for (optional)
     * @returns {BABYLON.Vector3} Center point
     */
    calculateCenter(points = null) {
        const pointList = points || this.points;
        if (pointList.length === 0) return BABYLON.Vector3.Zero();

        const center = BABYLON.Vector3.Zero();
        pointList.forEach(point => {
            center.addInPlace(point);
        });
        center.scaleInPlace(1 / pointList.length);
        center.y = 0;

        return center;
    }

    /**
     * Complete the polygon (close it)
     */
    completePolygon() {
        if (this.points.length < this.minPoints) return;

        // Clear preview
        this.clearPreview();

        // Create final polygon with closed shape
        if (this.currentPolygon) {
            // Dispose current preview polygon
            this.currentPolygon.dispose();
        }

        // Create final closed polygon
        const center = this.calculateCenter();
        const relativePoints = this.points.map(point => point.subtract(center));
        
        // Create final polygon mesh
        this.currentPolygon = this.createCustomPolygonMesh(relativePoints);
        this.currentPolygon.material = this.polygonMaterial;
        this.currentPolygon.renderingGroupId = 1;
        this.currentPolygon.receiveShadows = true;
        this.currentPolygon.castShadows = true;
        this.currentPolygon.position = center;
        
        // Store polygon properties in userData
        const dimensions = this.calculatePolygonDimensions();
        this.currentPolygon.userData = {
            type: 'land',
            dimensions: dimensions,
            points: this.points.map(p => p.clone())
        };

        // Add to selection manager
        if (this.selectionManager) {
            this.selectionManager.addSelectableObject(this.currentPolygon);
        }

        console.log(`Polygon completed with ${this.points.length} points - closed shape`);

        // Reset for next polygon
        this.points = [];
        this.currentPolygon = null;
        this.isSnappedToFirst = false;
        this.isCurrentlyDrawing = false;
        
        // Call completion callback
        if (this.onPolygonCompleted) {
            this.onPolygonCompleted();
        }
    }

    /**
     * Cancel current polygon drawing
     */
    cancelDrawing() {
        this.clearPreview();
        if (this.currentPolygon) {
            this.currentPolygon.dispose();
            this.currentPolygon = null;
        }
        this.points = [];
        this.isSnappedToFirst = false;
        this.isCurrentlyDrawing = false;
        console.log('Polygon drawing cancelled');
        
        // Call cancellation callback
        if (this.onPolygonCancelled) {
            this.onPolygonCancelled();
        }
    }

    /**
     * Clear all preview elements
     */
    clearPreview() {
        this.previewLines.forEach(mesh => {
            if (mesh && mesh.dispose) {
                mesh.dispose();
            }
        });
        this.previewLines = [];

        if (this.previewPoint) {
            this.previewPoint.dispose();
            this.previewPoint = null;
        }
    }

    /**
     * Get statistics about polygons
     * @returns {Object} Statistics object
     */
    getStats() {
        const polygons = this.scene.meshes.filter(mesh => 
            mesh.name.startsWith('polygon') && mesh.name !== 'polygon'
        );
        
        return {
            total: polygons.length,
            points: this.points.length,
            isDrawing: this.isCurrentlyDrawing
        };
    }

    /**
     * Set snap distance for first point
     * @param {number} distance - Snap distance in units
     */
    setSnapDistance(distance) {
        this.snapDistance = Math.max(0.1, distance);
        console.log(`Snap distance set to: ${this.snapDistance}`);
    }

    /**
     * Test polygon creation with sample points
     */
    testPolygonCreation() {
        console.log('Testing polygon creation...');
        
        // Create a test triangle
        const testPoints = [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(2, 0, 0),
            new BABYLON.Vector3(1, 0, 2)
        ];
        
        this.points = testPoints;
        this.createPolygon();
        this.completePolygon();
        
        console.log('Test polygon created with points:', testPoints);
    }

    /**
     * Test E-shape polygon creation
     */
    testEShapePolygon() {
        console.log('Testing E-shape polygon creation...');
        
        // Create E-shape points (concave polygon)
        const eShapePoints = [
            new BABYLON.Vector3(0, 0, 0),    // Bottom left
            new BABYLON.Vector3(4, 0, 0),    // Bottom right
            new BABYLON.Vector3(4, 0, 1),    // Top right
            new BABYLON.Vector3(2, 0, 1),    // Inner right
            new BABYLON.Vector3(2, 0, 2),    // Inner top right
            new BABYLON.Vector3(1, 0, 2),    // Inner top left
            new BABYLON.Vector3(1, 0, 1),    // Inner left
            new BABYLON.Vector3(0, 0, 1)     // Top left
        ];
        
        this.points = eShapePoints;
        this.createPolygon();
        this.completePolygon();
        
        console.log('E-shape polygon created with points:', eShapePoints);
    }

    /**
     * Test complex polygon with self-intersections
     */
    testComplexPolygon() {
        console.log('Testing complex polygon creation...');
        
        // Create a star-like shape (self-intersecting)
        const complexPoints = [
            new BABYLON.Vector3(0, 0, 0),    // Center
            new BABYLON.Vector3(2, 0, 0),    // Right
            new BABYLON.Vector3(1, 0, 2),    // Top
            new BABYLON.Vector3(-1, 0, 2),   // Top left
            new BABYLON.Vector3(-2, 0, 0),   // Left
            new BABYLON.Vector3(-1, 0, -2),  // Bottom left
            new BABYLON.Vector3(1, 0, -2)    // Bottom right
        ];
        
        this.points = complexPoints;
        this.createPolygon();
        this.completePolygon();
        
        console.log('Complex polygon created with points:', complexPoints);
    }

    /**
     * Test polygon with negative coordinates (concave in -Z direction)
     */
    testNegativeZConcavePolygon() {
        console.log('Testing polygon with negative Z concave...');
        
        // Create a simple concave polygon in the -Z direction
        // Simple L-shape that's concave inward
        const negativeZPoints = [
            new BABYLON.Vector3(0, 0, 0),     // Start
            new BABYLON.Vector3(3, 0, 0),     // Right
            new BABYLON.Vector3(3, 0, -1),    // Right-middle
            new BABYLON.Vector3(2, 0, -1),    // Inner-right
            new BABYLON.Vector3(2, 0, -2),    // Inner-bottom
            new BABYLON.Vector3(1, 0, -2),    // Inner-left
            new BABYLON.Vector3(1, 0, -1),    // Inner-top
            new BABYLON.Vector3(0, 0, -1),    // Left-middle
            new BABYLON.Vector3(0, 0, 0)      // Back to start
        ];
        
        // Ensure counter-clockwise winding order
        const correctedPoints = this.ensureCounterClockwise(negativeZPoints);
        
        // Debug the polygon before creating
        this.debugPolygonWinding(correctedPoints, 'Negative Z Concave');
        
        this.points = correctedPoints;
        this.createPolygon();
        this.completePolygon();
        
        console.log('Negative Z concave polygon created with points:', negativeZPoints);
    }

    /**
     * Test polygon with negative coordinates (concave in -X direction)
     */
    testNegativeXConcavePolygon() {
        console.log('Testing polygon with negative X concave...');
        
        // Create a polygon that's concave in the -X direction
        const negativeXPoints = [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(0, 0, 3),
            new BABYLON.Vector3(-2, 0, 3),
            new BABYLON.Vector3(-2, 0, 2),
            new BABYLON.Vector3(-1, 0, 2),
            new BABYLON.Vector3(-1, 0, 1),
            new BABYLON.Vector3(-2, 0, 1),
            new BABYLON.Vector3(-2, 0, 0),
            new BABYLON.Vector3(0, 0, 0)
        ];
        
        this.points = negativeXPoints;
        this.createPolygon();
        this.completePolygon();
        
        console.log('Negative X concave polygon created with points:', negativeXPoints);
    }

    /**
     * Test polygon with positive coordinates (concave in +Z direction)
     */
    testPositiveZConcavePolygon() {
        console.log('Testing polygon with positive Z concave...');
        
        // Create a polygon that's concave in the +Z direction
        const positiveZPoints = [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(3, 0, 0),
            new BABYLON.Vector3(3, 0, 2),
            new BABYLON.Vector3(2, 0, 2),
            new BABYLON.Vector3(2, 0, 1),
            new BABYLON.Vector3(1, 0, 1),
            new BABYLON.Vector3(1, 0, 2),
            new BABYLON.Vector3(0, 0, 2),
            new BABYLON.Vector3(0, 0, 0)
        ];
        
        this.points = positiveZPoints;
        this.createPolygon();
        this.completePolygon();
        
        console.log('Positive Z concave polygon created with points:', positiveZPoints);
    }

    /**
     * Test polygon with positive coordinates (concave in +X direction)
     */
    testPositiveXConcavePolygon() {
        console.log('Testing polygon with positive X concave...');
        
        // Create a simple concave polygon in the +X direction
        // Simple L-shape that's concave inward
        const positiveXPoints = [
            new BABYLON.Vector3(0, 0, 0),     // Start
            new BABYLON.Vector3(0, 0, 3),     // Top
            new BABYLON.Vector3(1, 0, 3),     // Top-middle
            new BABYLON.Vector3(1, 0, 2),     // Inner-top
            new BABYLON.Vector3(2, 0, 2),     // Inner-right
            new BABYLON.Vector3(2, 0, 1),     // Inner-bottom
            new BABYLON.Vector3(1, 0, 1),     // Inner-left
            new BABYLON.Vector3(1, 0, 0),     // Bottom-middle
            new BABYLON.Vector3(0, 0, 0)      // Back to start
        ];
        
        // Ensure counter-clockwise winding order
        const correctedPoints = this.ensureCounterClockwise(positiveXPoints);
        
        // Debug the polygon before creating
        this.debugPolygonWinding(correctedPoints, 'Positive X Concave');
        
        this.points = correctedPoints;
        this.createPolygon();
        this.completePolygon();
        
        console.log('Positive X concave polygon created with points:', positiveXPoints);
    }

    /**
     * Debug polygon winding order
     * @param {BABYLON.Vector3[]} points - Polygon points
     * @param {string} name - Polygon name for logging
     */
    debugPolygonWinding(points, name) {
        console.log(`\n=== Debugging ${name} ===`);
        console.log('Points:', points.map((p, i) => `${i}: (${p.x}, ${p.z})`).join(' → '));
        
        let totalCross = 0;
        for (let i = 0; i < points.length; i++) {
            const prev = points[(i - 1 + points.length) % points.length];
            const curr = points[i];
            const next = points[(i + 1) % points.length];
            
            const cross = this.calculateCrossProduct(prev, curr, next);
            totalCross += cross;
            console.log(`Vertex ${i}: cross = ${cross.toFixed(6)}`);
        }
        
        console.log(`Total cross product: ${totalCross.toFixed(6)}`);
        console.log(`Winding order: ${totalCross > 0 ? 'Counter-clockwise' : 'Clockwise'}`);
        console.log(`Is concave: ${this.isConcavePolygon(points)}`);
        console.log('========================\n');
    }

    /**
     * Ensure polygon has counter-clockwise winding order
     * @param {BABYLON.Vector3[]} points - Polygon points
     * @returns {BABYLON.Vector3[]} Points with correct winding order
     */
    ensureCounterClockwise(points) {
        let totalCross = 0;
        for (let i = 0; i < points.length; i++) {
            const prev = points[(i - 1 + points.length) % points.length];
            const curr = points[i];
            const next = points[(i + 1) % points.length];
            
            const cross = this.calculateCrossProduct(prev, curr, next);
            totalCross += cross;
        }
        
        // If clockwise, reverse the order
        if (totalCross < 0) {
            console.log('Reversing polygon winding order to counter-clockwise');
            return points.slice().reverse();
        }
        
        return points;
    }

    /**
     * Test snap functionality
     */
    testSnapFunctionality() {
        console.log('Testing snap functionality...');
        
        // Start drawing
        this.startDrawing();
        
        // Add some points
        this.addPoint(new BABYLON.Vector3(0, 0, 0));
        this.addPoint(new BABYLON.Vector3(2, 0, 0));
        this.addPoint(new BABYLON.Vector3(2, 0, 2));
        
        console.log('Points added:', this.points.length);
        console.log('Min points required:', this.minPoints);
        console.log('Can snap:', this.points.length >= this.minPoints);
        
        // Test snap distance
        const testPoint = new BABYLON.Vector3(0.1, 0, 0.1); // Close to first point
        const distance = BABYLON.Vector3.Distance(testPoint, this.points[0]);
        console.log('Distance to first point:', distance);
        console.log('Snap distance:', this.snapDistance);
        console.log('Should snap:', distance <= this.snapDistance);
        
        // Test updatePreview with snap
        this.updatePreview(testPoint);
        console.log('Is snapped to first:', this.isSnappedToFirst);
        
        // Test completing polygon by clicking on first point
        if (this.isSnappedToFirst) {
            console.log('Testing completion by clicking first point...');
            this.addPoint(this.points[0]); // This should complete the polygon
        }
        
        console.log('Snap test completed');
    }

    /**
     * Flip normals of a polygon mesh
     * @param {BABYLON.Mesh} polygonMesh - The polygon mesh to flip
     */
    flipPolygonNormals(polygonMesh) {
        if (!polygonMesh || !polygonMesh.getVerticesData(BABYLON.VertexBuffer.NormalKind)) {
            console.warn('Cannot flip normals: mesh or normals not found');
            return;
        }

        // Get current normals
        const normals = polygonMesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        
        // Flip normals (multiply by -1)
        for (let i = 0; i < normals.length; i++) {
            normals[i] = -normals[i];
        }
        
        // Update the mesh with flipped normals
        polygonMesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
        
        console.log('Polygon normals flipped');
    }

    /**
     * Flip normals of the current polygon
     */
    flipCurrentPolygonNormals() {
        if (this.currentPolygon) {
            this.flipPolygonNormals(this.currentPolygon);
        } else {
            console.warn('No current polygon to flip');
        }
    }

    /**
     * Force a complete redraw of the polygon and preview
     */
    forceRedraw() {
        console.log('Forcing complete polygon redraw...');
        
        // Clear everything
        this.clearPreview();
        
        // Redraw polygon
        this.redrawPolygon();
        
        // Update preview
        this.updatePreview();
        
        console.log('Polygon redraw completed');
    }

    /**
     * Get current polygon statistics
     * @returns {Object} Current polygon statistics
     */
    getCurrentStats() {
        return {
            isDrawing: this.isCurrentlyDrawing,
            pointCount: this.points.length,
            hasPolygon: this.currentPolygon !== null,
            canComplete: this.points.length >= this.minPoints,
            isSnapped: this.isSnappedToFirst
        };
    }

    /**
     * Dispose of the polygon manager
     */
    dispose() {
        this.stopDrawing();
        this.clearPreview();
        
        if (this.currentPolygon) {
            this.currentPolygon.dispose();
        }

        if (this.polygonMaterial) {
            this.polygonMaterial.dispose();
        }
        if (this.previewMaterial) {
            this.previewMaterial.dispose();
        }
        if (this.pointMaterial) {
            this.pointMaterial.dispose();
        }
    }
}
