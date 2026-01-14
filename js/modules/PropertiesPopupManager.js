/**
 * PropertiesPopupManager - Manages properties popups for different object types
 */
class PropertiesPopupManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentShape = null;
        this.currentTree = null;
        this.currentPolygon = null;
        this.currentSTLMesh = null;
        
        // Setup event listeners for highway road type selection, waterway water type selection, grass vegetation type selection, ground vegetation type selection, tree vegetation type selection, and building envelope properties
        this.setupHighwayRoadTypeListeners();
        this.setupWaterwayWaterTypeListeners();
        this.setupGrassVegetationTypeListeners();
        this.setupGroundVegetationTypeListeners();
        this.setupTreeVegetationTypeListeners();
        this.setupBuildingEnvelopePropertiesListeners();
    }
    
    /**
     * Setup event listeners for highway road type dropdowns
     */
    setupHighwayRoadTypeListeners() {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            // Listen for type changes in all popups
            const typeSelects = [
                { select: 'shapeType', prefix: '' },
                { select: 'circleType', prefix: 'circle' },
                { select: 'polygonType', prefix: 'polygon' },
                { select: 'stlType', prefix: 'stl' }
            ];
            
            typeSelects.forEach(({ select, prefix }) => {
                const selectElement = document.getElementById(select);
                if (selectElement && !selectElement.hasAttribute('data-highway-listener')) {
                    selectElement.setAttribute('data-highway-listener', 'true');
                    selectElement.addEventListener('change', (e) => {
                        this.handleTypeChange(e.target.value, prefix);
                    });
                }
            });
            
            // Listen for road type changes in all popups
            const roadTypeSelects = [
                { select: 'highwayRoadType', prefix: '' },
                { select: 'circleHighwayRoadType', prefix: 'circle' },
                { select: 'polygonHighwayRoadType', prefix: 'polygon' },
                { select: 'stlHighwayRoadType', prefix: 'stl' }
            ];
            
            roadTypeSelects.forEach(({ select, prefix }) => {
                const selectElement = document.getElementById(select);
                if (selectElement && !selectElement.hasAttribute('data-highway-listener')) {
                    selectElement.setAttribute('data-highway-listener', 'true');
                    selectElement.addEventListener('change', (e) => {
                        this.handleRoadTypeChange(e.target.value, prefix);
                    });
                }
            });
            
            // Listen for customize field changes
            const customizeFields = [
                { prefix: '', fields: ['highwayAlbedo', 'highwayEmissivity', 'highwayThermalConductivity', 'highwayDensity', 'highwaySpecificHeatCapacity'] },
                { prefix: 'circle', fields: ['circleHighwayAlbedo', 'circleHighwayEmissivity', 'circleHighwayThermalConductivity', 'circleHighwayDensity', 'circleHighwaySpecificHeatCapacity'] },
                { prefix: 'polygon', fields: ['polygonHighwayAlbedo', 'polygonHighwayEmissivity', 'polygonHighwayThermalConductivity', 'polygonHighwayDensity', 'polygonHighwaySpecificHeatCapacity'] },
                { prefix: 'stl', fields: ['stlHighwayAlbedo', 'stlHighwayEmissivity', 'stlHighwayThermalConductivity', 'stlHighwayDensity', 'stlHighwaySpecificHeatCapacity'] }
            ];
            
            customizeFields.forEach(({ prefix, fields }) => {
                fields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field && !field.hasAttribute('data-highway-listener')) {
                        field.setAttribute('data-highway-listener', 'true');
                        field.addEventListener('input', () => {
                            this.saveCustomizeValues(prefix);
                        });
                    }
                });
            });
        }, 100);
    }
    
    /**
     * Setup event listeners for waterway water type dropdowns
     */
    setupWaterwayWaterTypeListeners() {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            // Listen for water type changes in all popups
            const waterTypeSelects = [
                { select: 'waterwayWaterType', prefix: '' },
                { select: 'circleWaterwayWaterType', prefix: 'circle' },
                { select: 'polygonWaterwayWaterType', prefix: 'polygon' },
                { select: 'stlWaterwayWaterType', prefix: 'stl' }
            ];
            
            waterTypeSelects.forEach(({ select, prefix }) => {
                const selectElement = document.getElementById(select);
                if (selectElement && !selectElement.hasAttribute('data-waterway-listener')) {
                    selectElement.setAttribute('data-waterway-listener', 'true');
                    selectElement.addEventListener('change', (e) => {
                        this.handleWaterTypeChange(e.target.value, prefix);
                    });
                }
            });
            
            // Listen for customize field changes
            const customizeFields = [
                { prefix: '', fields: ['waterwayAlbedo', 'waterwayEmissivity', 'waterwaySpecificHeatCapacity', 'waterwayDensity', 'waterwayDepth'] },
                { prefix: 'circle', fields: ['circleWaterwayAlbedo', 'circleWaterwayEmissivity', 'circleWaterwaySpecificHeatCapacity', 'circleWaterwayDensity', 'circleWaterwayDepth'] },
                { prefix: 'polygon', fields: ['polygonWaterwayAlbedo', 'polygonWaterwayEmissivity', 'polygonWaterwaySpecificHeatCapacity', 'polygonWaterwayDensity', 'polygonWaterwayDepth'] },
                { prefix: 'stl', fields: ['stlWaterwayAlbedo', 'stlWaterwayEmissivity', 'stlWaterwaySpecificHeatCapacity', 'stlWaterwayDensity', 'stlWaterwayDepth'] }
            ];
            
            customizeFields.forEach(({ prefix, fields }) => {
                fields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field && !field.hasAttribute('data-waterway-listener')) {
                        field.setAttribute('data-waterway-listener', 'true');
                        field.addEventListener('input', () => {
                            this.saveWaterwayCustomizeValues(prefix);
                        });
                    }
                });
            });
        }, 100);
    }
    
    /**
     * Handle type change - show/hide highway road type dropdown and waterway water type dropdown
     */
    handleTypeChange(type, prefix) {
        // Handle height field visibility based on type
        // For ground, grass, waterway, highway: height should be 0 (2D, no height field)
        // For building: height field should be visible and editable
        const flatTypes = ['ground', 'grass', 'waterway', 'highway'];
        const isFlatType = flatTypes.includes(type.toLowerCase());
        
        // Get height field elements based on prefix
        let heightGroup, heightInput;
        if (prefix === 'circle') {
            heightGroup = document.getElementById('circleHeightGroup');
            heightInput = document.getElementById('circleHeight');
        } else if (prefix === 'polygon') {
            heightGroup = document.getElementById('polygonHeightGroup');
            heightInput = document.getElementById('polygonHeight');
        } else {
            // Rectangle or default
            heightGroup = document.getElementById('heightGroup');
            heightInput = document.getElementById('shapeHeight');
        }
        
        // Show/hide height field based on type
        if (heightGroup) {
            if (type === 'building') {
                // For polygon, use 'block', for others use 'flex'
                heightGroup.style.display = (prefix === 'polygon') ? 'block' : 'flex';
                // Set minimum height for building if it's currently 0
                if (heightInput && parseFloat(heightInput.value) <= 0) {
                    heightInput.value = 0.1;
                }
            } else if (isFlatType) {
                heightGroup.style.display = 'none';
                // Set height to 0 for flat types
                if (heightInput) {
                    heightInput.value = 0;
                }
            } else {
                // For other types, show height field
                heightGroup.style.display = (prefix === 'polygon') ? 'block' : 'flex';
            }
        }
        
        // Handle highway
        const roadTypeGroup = document.getElementById(prefix ? `${prefix}HighwayRoadTypeGroup` : 'highwayRoadTypeGroup');
        const highwayCustomizeGroup = document.getElementById(prefix ? `${prefix}HighwayCustomizeGroup` : 'highwayCustomizeGroup');
        
        if (type === 'highway') {
            if (roadTypeGroup) {
                roadTypeGroup.style.display = 'flex';
                this.populateRoadTypeDropdown(prefix);
                const currentRoadType = this.getCurrentRoadType(prefix);
                const readonlyGroup = document.getElementById(prefix ? `${prefix}HighwayReadonlyValuesGroup` : 'highwayReadonlyValuesGroup');
                const customizeGroup = document.getElementById(prefix ? `${prefix}HighwayCustomizeGroup` : 'highwayCustomizeGroup');
                
                // Always show readonly values for highway (no customize option)
                    if (readonlyGroup) {
                        readonlyGroup.style.display = 'block';
                    }
                    if (customizeGroup) {
                        customizeGroup.style.display = 'none';
                    }
                // Load readonly values (use currentRoadType or default to 'default', but ignore 'customize')
                const roadTypeToLoad = (currentRoadType && currentRoadType !== 'customize') ? currentRoadType : 'default';
                    this.loadRoadTypeReadonlyValues(prefix, roadTypeToLoad);
            }
        } else {
            if (roadTypeGroup) {
                roadTypeGroup.style.display = 'none';
            }
            if (highwayCustomizeGroup) {
                highwayCustomizeGroup.style.display = 'none';
            }
            const highwayReadonlyGroup = document.getElementById(prefix ? `${prefix}HighwayReadonlyValuesGroup` : 'highwayReadonlyValuesGroup');
            if (highwayReadonlyGroup) {
                highwayReadonlyGroup.style.display = 'none';
            }
        }
        
        // Handle waterway
        const waterTypeGroup = document.getElementById(prefix ? `${prefix}WaterwayWaterTypeGroup` : 'waterwayWaterTypeGroup');
        const waterwayCustomizeGroup = document.getElementById(prefix ? `${prefix}WaterwayCustomizeGroup` : 'waterwayCustomizeGroup');
        
        if (type === 'waterway') {
            if (waterTypeGroup) {
                waterTypeGroup.style.display = 'flex';
                this.populateWaterTypeDropdown(prefix);
                this.loadWaterTypeValues(prefix);
                const currentWaterType = this.getCurrentWaterType(prefix);
                const readonlyGroup = document.getElementById(prefix ? `${prefix}WaterwayReadonlyValuesGroup` : 'waterwayReadonlyValuesGroup');
                const customizeGroup = document.getElementById(prefix ? `${prefix}WaterwayCustomizeGroup` : 'waterwayCustomizeGroup');
                
                if (currentWaterType === 'customize') {
                    if (customizeGroup) {
                        customizeGroup.style.display = 'block';
                    }
                    if (readonlyGroup) {
                        readonlyGroup.style.display = 'none';
                    }
                } else {
                    // Show readonly values for default or selected type
                    if (readonlyGroup) {
                        readonlyGroup.style.display = 'block';
                    }
                    if (customizeGroup) {
                        customizeGroup.style.display = 'none';
                    }
                    // Load readonly values (use currentWaterType or default to 'default')
                    const waterTypeToLoad = currentWaterType || 'default';
                    this.loadWaterTypeReadonlyValues(prefix, waterTypeToLoad);
                }
            }
        } else {
            if (waterTypeGroup) {
                waterTypeGroup.style.display = 'none';
            }
            if (waterwayCustomizeGroup) {
                waterwayCustomizeGroup.style.display = 'none';
            }
            const waterwayReadonlyGroup = document.getElementById(prefix ? `${prefix}WaterwayReadonlyValuesGroup` : 'waterwayReadonlyValuesGroup');
            if (waterwayReadonlyGroup) {
                waterwayReadonlyGroup.style.display = 'none';
            }
        }
        
        // Ensure vegetationType groups are hidden for waterway
        if (type === 'waterway') {
            // Hide grass vegetation type group
            const grassVegetationTypeGroup = document.getElementById(prefix ? `${prefix}GrassVegetationTypeGroup` : 'grassVegetationTypeGroup');
            if (grassVegetationTypeGroup) {
                grassVegetationTypeGroup.style.display = 'none';
            }
            const grassSoilTypeGroup = document.getElementById(prefix ? `${prefix}GrassSoilTypeGroup` : 'grassSoilTypeGroup');
            if (grassSoilTypeGroup) {
                grassSoilTypeGroup.style.display = 'none';
            }
            const grassReadonlyGroup = document.getElementById(prefix ? `${prefix}GrassReadonlyValuesGroup` : 'grassReadonlyValuesGroup');
            if (grassReadonlyGroup) {
                grassReadonlyGroup.style.display = 'none';
            }
            const grassCustomizeGroup = document.getElementById(prefix ? `${prefix}GrassCustomizeGroup` : 'grassCustomizeGroup');
            if (grassCustomizeGroup) {
                grassCustomizeGroup.style.display = 'none';
            }
            
            // Hide ground vegetation type group
            const groundVegetationTypeGroup = document.getElementById(prefix ? `${prefix}GroundVegetationTypeGroup` : 'groundVegetationTypeGroup');
            if (groundVegetationTypeGroup) {
                groundVegetationTypeGroup.style.display = 'none';
            }
            const groundSoilTypeGroup = document.getElementById(prefix ? `${prefix}GroundSoilTypeGroup` : 'groundSoilTypeGroup');
            if (groundSoilTypeGroup) {
                groundSoilTypeGroup.style.display = 'none';
            }
            const groundReadonlyGroup = document.getElementById(prefix ? `${prefix}GroundReadonlyValuesGroup` : 'groundReadonlyValuesGroup');
            if (groundReadonlyGroup) {
                groundReadonlyGroup.style.display = 'none';
            }
            const groundCustomizeGroup = document.getElementById(prefix ? `${prefix}GroundCustomizeGroup` : 'groundCustomizeGroup');
            if (groundCustomizeGroup) {
                groundCustomizeGroup.style.display = 'none';
            }
            
            // Hide tree vegetation type group
            const treeVegetationTypeGroup = document.getElementById(prefix === 'tree' ? 'treeTreeVegetationTypeGroup' : (prefix ? `${prefix}TreeVegetationTypeGroup` : 'treeVegetationTypeGroup'));
            if (treeVegetationTypeGroup) {
                treeVegetationTypeGroup.style.display = 'none';
            }
            const treeSoilTypeGroup = document.getElementById(prefix === 'tree' ? 'treeTreeSoilTypeGroup' : (prefix ? `${prefix}TreeSoilTypeGroup` : 'treeSoilTypeGroup'));
            if (treeSoilTypeGroup) {
                treeSoilTypeGroup.style.display = 'none';
            }
            const treeReadonlyGroup = document.getElementById(prefix === 'tree' ? 'treeTreeReadonlyValuesGroup' : (prefix ? `${prefix}TreeReadonlyValuesGroup` : 'treeReadonlyValuesGroup'));
            if (treeReadonlyGroup) {
                treeReadonlyGroup.style.display = 'none';
            }
            const treeCustomizeGroup = document.getElementById(prefix === 'tree' ? 'treeTreeCustomizeGroup' : (prefix ? `${prefix}TreeCustomizeGroup` : 'treeCustomizeGroup'));
            if (treeCustomizeGroup) {
                treeCustomizeGroup.style.display = 'none';
            }
        }
        
        // Handle grass
        const vegetationTypeGroup = document.getElementById(prefix ? `${prefix}GrassVegetationTypeGroup` : 'grassVegetationTypeGroup');
        const grassCustomizeGroup = document.getElementById(prefix ? `${prefix}GrassCustomizeGroup` : 'grassCustomizeGroup');
        
        if (type === 'grass') {
            if (vegetationTypeGroup) {
                vegetationTypeGroup.style.display = 'flex';
                this.populateVegetationTypeDropdown(prefix);
                this.loadVegetationTypeValues(prefix);
                const currentVegetationType = this.getCurrentVegetationType(prefix);
                const readonlyGroup = document.getElementById(prefix ? `${prefix}GrassReadonlyValuesGroup` : 'grassReadonlyValuesGroup');
                const customizeGroup = document.getElementById(prefix ? `${prefix}GrassCustomizeGroup` : 'grassCustomizeGroup');
                
                if (currentVegetationType === 'customize') {
                    if (customizeGroup) {
                        customizeGroup.style.display = 'block';
                    }
                    if (readonlyGroup) {
                        readonlyGroup.style.display = 'none';
                    }
                } else {
                    // Show readonly values for default or selected type
                    if (readonlyGroup) {
                        readonlyGroup.style.display = 'block';
                    }
                    if (customizeGroup) {
                        customizeGroup.style.display = 'none';
                    }
                    // Load readonly values (use currentVegetationType or default to 'grass_default')
                    const vegetationTypeToLoad = currentVegetationType || 'grass_default';
                    this.loadGrassVegetationTypeReadonlyValues(prefix, vegetationTypeToLoad);
                }
            }
            // Show and populate soil type dropdown for grass
            const grassSoilTypeGroup = document.getElementById(prefix ? `${prefix}GrassSoilTypeGroup` : 'grassSoilTypeGroup');
            if (grassSoilTypeGroup) {
                grassSoilTypeGroup.style.display = 'flex';
                this.populateSoilTypeDropdown(prefix, 'grass');
            }
        } else {
            if (vegetationTypeGroup) {
                vegetationTypeGroup.style.display = 'none';
            }
            if (grassCustomizeGroup) {
                grassCustomizeGroup.style.display = 'none';
            }
            const grassReadonlyGroup = document.getElementById(prefix ? `${prefix}GrassReadonlyValuesGroup` : 'grassReadonlyValuesGroup');
            if (grassReadonlyGroup) {
                grassReadonlyGroup.style.display = 'none';
            }
            // Hide soil type dropdown for grass
            const grassSoilTypeGroup = document.getElementById(prefix ? `${prefix}GrassSoilTypeGroup` : 'grassSoilTypeGroup');
            if (grassSoilTypeGroup) {
                grassSoilTypeGroup.style.display = 'none';
            }
        }
        
        // Handle ground
        const groundVegetationTypeGroup = document.getElementById(prefix ? `${prefix}GroundVegetationTypeGroup` : 'groundVegetationTypeGroup');
        const groundCustomizeGroup = document.getElementById(prefix ? `${prefix}GroundCustomizeGroup` : 'groundCustomizeGroup');
        
        if (type === 'ground') {
            if (groundVegetationTypeGroup) {
                groundVegetationTypeGroup.style.display = 'flex';
                this.populateGroundVegetationTypeDropdown(prefix);
                this.loadGroundVegetationTypeValues(prefix);
                // Show readonly values for all popups (main, circle, polygon, stl)
                const currentVegetationType = this.getCurrentGroundVegetationType(prefix);
                const readonlyGroup = document.getElementById(prefix ? `${prefix}GroundReadonlyValuesGroup` : 'groundReadonlyValuesGroup');
                const customizeGroup = document.getElementById(prefix ? `${prefix}GroundCustomizeGroup` : 'groundCustomizeGroup');
                
                if (currentVegetationType === 'customize') {
                    if (customizeGroup) {
                        customizeGroup.style.display = 'block';
                    }
                    if (readonlyGroup) {
                        readonlyGroup.style.display = 'none';
                    }
                } else {
                    // Show readonly values for default or selected type
                    if (readonlyGroup) {
                        readonlyGroup.style.display = 'block';
                    }
                    if (customizeGroup) {
                        customizeGroup.style.display = 'none';
                    }
                    // Load readonly values (use currentVegetationType or default to 'ground_default')
                    const vegetationTypeToLoad = currentVegetationType || 'ground_default';
                    this.loadGroundVegetationTypeReadonlyValues(prefix, vegetationTypeToLoad);
                }
            }
            // Show and populate soil type dropdown for ground
            const groundSoilTypeGroup = document.getElementById(prefix ? `${prefix}GroundSoilTypeGroup` : 'groundSoilTypeGroup');
            if (groundSoilTypeGroup) {
                groundSoilTypeGroup.style.display = 'flex';
                this.populateSoilTypeDropdown(prefix, 'ground');
            }
        } else {
            if (groundVegetationTypeGroup) {
                groundVegetationTypeGroup.style.display = 'none';
            }
            if (groundCustomizeGroup) {
                groundCustomizeGroup.style.display = 'none';
            }
            // Hide soil type dropdown for ground
            const groundSoilTypeGroup = document.getElementById(prefix ? `${prefix}GroundSoilTypeGroup` : 'groundSoilTypeGroup');
            if (groundSoilTypeGroup) {
                groundSoilTypeGroup.style.display = 'none';
            }
        }
        
        // Handle building envelope properties
        const buildingEnvelopePropertiesGroup = document.getElementById(prefix ? `${prefix}BuildingEnvelopePropertiesGroup` : 'buildingEnvelopePropertiesGroup');
        const buildingArchytypesGroup = document.getElementById(prefix ? `${prefix}BuildingArchytypesGroup` : 'buildingArchytypesGroup');
        const buildingGroupsGroup = document.getElementById(prefix ? `${prefix}BuildingGroupsGroup` : 'buildingGroupsGroup');
        const buildingEnvelopeReadonlyGroup = document.getElementById(prefix ? `${prefix}BuildingEnvelopeReadonlyValuesGroup` : 'buildingEnvelopeReadonlyValuesGroup');
        const buildingCustomSpecGroup = document.getElementById(prefix ? `${prefix}BuildingCustomSpecGroup` : 'buildingCustomSpecGroup');
        const buildingYearOfConstructionGroup = document.getElementById(prefix ? `${prefix}BuildingYearOfConstructionGroup` : 'buildingYearOfConstructionGroup');
        
        if (type === 'building') {
            // Show Year of Construction field
            if (buildingYearOfConstructionGroup) {
                buildingYearOfConstructionGroup.style.display = 'flex';
            }
            if (buildingEnvelopePropertiesGroup) {
                buildingEnvelopePropertiesGroup.style.display = 'flex';
                // Setup envelope properties dropdown
                this.setupBuildingEnvelopeProperties(prefix);
            }
        } else {
            // Hide Year of Construction field
            if (buildingYearOfConstructionGroup) {
                buildingYearOfConstructionGroup.style.display = 'none';
            }
            // Hide all building envelope property fields
            if (buildingEnvelopePropertiesGroup) {
                buildingEnvelopePropertiesGroup.style.display = 'none';
            }
            if (buildingArchytypesGroup) {
                buildingArchytypesGroup.style.display = 'none';
            }
            if (buildingGroupsGroup) {
                buildingGroupsGroup.style.display = 'none';
            }
            if (buildingEnvelopeReadonlyGroup) {
                buildingEnvelopeReadonlyGroup.style.display = 'none';
            }
            if (buildingCustomSpecGroup) {
                buildingCustomSpecGroup.style.display = 'none';
            }
            
            // Clear building envelope properties from userData when type changes away from building
            if (this.currentShape && this.currentShape.userData) {
                delete this.currentShape.userData.buildingEnvelopeProperties;
                delete this.currentShape.userData.buildingArchytype;
                delete this.currentShape.userData.buildingGroup;
                delete this.currentShape.userData.buildingCustomSpec;
            }
        }
        
        // Handle building envelope properties for circle, polygon, and stl (with prefix)
        if (prefix === 'circle' || prefix === 'polygon' || prefix === 'stl') {
            const prefixedBuildingEnvelopePropertiesGroup = document.getElementById(`${prefix}BuildingEnvelopePropertiesGroup`);
            const prefixedBuildingArchytypesGroup = document.getElementById(`${prefix}BuildingArchytypesGroup`);
            const prefixedBuildingGroupsGroup = document.getElementById(`${prefix}BuildingGroupsGroup`);
            const prefixedBuildingEnvelopeReadonlyGroup = document.getElementById(`${prefix}BuildingEnvelopeReadonlyValuesGroup`);
            const prefixedBuildingCustomSpecGroup = document.getElementById(`${prefix}BuildingCustomSpecGroup`);
            const prefixedBuildingYearOfConstructionGroup = document.getElementById(`${prefix}BuildingYearOfConstructionGroup`);
            
            if (type === 'building') {
                // Show Year of Construction field
                if (prefixedBuildingYearOfConstructionGroup) {
                    prefixedBuildingYearOfConstructionGroup.style.display = 'flex';
                }
                if (prefixedBuildingEnvelopePropertiesGroup) {
                    prefixedBuildingEnvelopePropertiesGroup.style.display = 'flex';
                    // Setup envelope properties dropdown
                    this.setupBuildingEnvelopeProperties(prefix);
                }
            } else {
                // Hide Year of Construction field
                if (prefixedBuildingYearOfConstructionGroup) {
                    prefixedBuildingYearOfConstructionGroup.style.display = 'none';
                }
                // Hide all building envelope property fields
                if (prefixedBuildingEnvelopePropertiesGroup) {
                    prefixedBuildingEnvelopePropertiesGroup.style.display = 'none';
                }
                if (prefixedBuildingArchytypesGroup) {
                    prefixedBuildingArchytypesGroup.style.display = 'none';
                }
                if (prefixedBuildingGroupsGroup) {
                    prefixedBuildingGroupsGroup.style.display = 'none';
                }
                if (prefixedBuildingEnvelopeReadonlyGroup) {
                    prefixedBuildingEnvelopeReadonlyGroup.style.display = 'none';
                }
                if (prefixedBuildingCustomSpecGroup) {
                    prefixedBuildingCustomSpecGroup.style.display = 'none';
                }
                
                // Clear building envelope properties from userData when type changes away from building
                if (this.currentShape && this.currentShape.userData) {
                    delete this.currentShape.userData.buildingEnvelopeProperties;
                    delete this.currentShape.userData.buildingArchytype;
                    delete this.currentShape.userData.buildingGroup;
                    delete this.currentShape.userData.buildingCustomSpec;
                }
            }
        }
        
        // Handle tree
        const treeVegetationTypeGroup = document.getElementById(prefix ? `${prefix}TreeVegetationTypeGroup` : 'treeVegetationTypeGroup');
        const treeCustomizeGroup = document.getElementById(prefix ? `${prefix}TreeCustomizeGroup` : 'treeCustomizeGroup');
        
        if (type === 'tree') {
            if (treeVegetationTypeGroup) {
                treeVegetationTypeGroup.style.display = 'flex';
                this.populateTreeVegetationTypeDropdown(prefix);
                this.loadTreeVegetationTypeValues(prefix);
                // Show readonly values for all popups (main, circle, polygon, stl, tree)
                const currentVegetationType = this.getCurrentTreeVegetationType(prefix);
                const readonlyGroup = document.getElementById(prefix === 'tree' ? 'treeTreeReadonlyValuesGroup' : (prefix ? `${prefix}TreeReadonlyValuesGroup` : 'treeReadonlyValuesGroup'));
                const customizeGroup = document.getElementById(prefix === 'tree' ? 'treeTreeCustomizeGroup' : (prefix ? `${prefix}TreeCustomizeGroup` : 'treeCustomizeGroup'));
                
                if (currentVegetationType === 'customize') {
                    if (customizeGroup) {
                        customizeGroup.style.display = 'block';
                    }
                    if (readonlyGroup) {
                        readonlyGroup.style.display = 'none';
                    }
                } else {
                    // Show readonly values for default or selected type
                    if (readonlyGroup) {
                        readonlyGroup.style.display = 'block';
                    }
                    if (customizeGroup) {
                        customizeGroup.style.display = 'none';
                    }
                    // Load readonly values (use currentVegetationType or default to 'tree_default')
                    const vegetationTypeToLoad = currentVegetationType || 'tree_default';
                    this.loadTreeVegetationTypeReadonlyValues(prefix, vegetationTypeToLoad);
                }
            } else {
                console.warn(`Tree vegetation type group not found for prefix: ${prefix}, looking for: ${prefix ? `${prefix}TreeVegetationTypeGroup` : 'treeVegetationTypeGroup'}`);
            }
            // Show and populate soil type dropdown for tree
            const treeSoilTypeGroup = document.getElementById(prefix === 'tree' ? 'treeTreeSoilTypeGroup' : (prefix ? `${prefix}TreeSoilTypeGroup` : 'treeSoilTypeGroup'));
            if (treeSoilTypeGroup) {
                treeSoilTypeGroup.style.display = 'flex';
                this.populateSoilTypeDropdown(prefix, 'tree');
            }
        } else {
            if (treeVegetationTypeGroup) {
                treeVegetationTypeGroup.style.display = 'none';
            }
            if (treeCustomizeGroup) {
                treeCustomizeGroup.style.display = 'none';
            }
            const treeReadonlyGroup = document.getElementById(prefix ? `${prefix}TreeReadonlyValuesGroup` : 'treeReadonlyValuesGroup');
            if (treeReadonlyGroup) {
                treeReadonlyGroup.style.display = 'none';
            }
            // Hide soil type dropdown for tree
            const treeSoilTypeGroup = document.getElementById(prefix === 'tree' ? 'treeTreeSoilTypeGroup' : (prefix ? `${prefix}TreeSoilTypeGroup` : 'treeSoilTypeGroup'));
            if (treeSoilTypeGroup) {
                treeSoilTypeGroup.style.display = 'none';
            }
        }
    }
    
    /**
     * Handle road type change - show/hide customize fields
     */
    handleRoadTypeChange(roadType, prefix) {
        const customizeGroup = document.getElementById(prefix ? `${prefix}HighwayCustomizeGroup` : 'highwayCustomizeGroup');
        const readonlyGroup = document.getElementById(prefix ? `${prefix}HighwayReadonlyValuesGroup` : 'highwayReadonlyValuesGroup');
        
        // Always show readonly values for highway (no customize option)
            if (readonlyGroup) {
            readonlyGroup.style.display = 'block';
            }
            if (customizeGroup) {
                customizeGroup.style.display = 'none';
            }
        
        // Load readonly values for selected road type (ignore 'customize' if somehow selected)
        if (roadType && roadType !== 'customize') {
            this.loadRoadTypeReadonlyValues(prefix, roadType);
        } else {
            this.loadRoadTypeReadonlyValues(prefix, 'default');
        }
        
        // Save the selected road type (but not 'customize')
        if (roadType && roadType !== 'customize') {
        this.saveRoadType(prefix, roadType);
        } else {
            this.saveRoadType(prefix, 'default');
        }
    }
    
    /**
     * Populate road type dropdown with options from SurfaceTypesManager
     */
    populateRoadTypeDropdown(prefix) {
        const dropdownId = prefix ? `${prefix}HighwayRoadType` : 'highwayRoadType';
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown || !this.uiManager.surfaceTypesManager) {
            return;
        }
        
        // Clear existing options
        dropdown.innerHTML = '';
        
        // Get road types from SurfaceTypesManager
        const roadTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('roadTypes');
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = 'default';
        defaultOption.textContent = 'Default';
        dropdown.appendChild(defaultOption);
        
        // Add all road types
        roadTypes.forEach(roadType => {
            const roadTypeName = roadType.roadType || Object.values(roadType)[0];
            if (roadTypeName && roadTypeName !== 'default') {
                const option = document.createElement('option');
                option.value = roadTypeName;
                option.textContent = roadTypeName;
                dropdown.appendChild(option);
            }
        });
        
        // Set default value (no customize option for highway)
        const currentRoadType = this.getCurrentRoadType(prefix);
        if (currentRoadType && currentRoadType !== 'customize') {
            dropdown.value = currentRoadType;
        } else {
            dropdown.value = 'default';
        }
    }
    
    /**
     * Load values from selected road type
     */
    loadRoadTypeValues(prefix, roadType = null) {
        if (!this.uiManager.surfaceTypesManager) {
            return;
        }
        
        const dropdownId = prefix ? `${prefix}HighwayRoadType` : 'highwayRoadType';
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown) {
            return;
        }
        
        const selectedRoadType = roadType || dropdown.value;
        
        if (selectedRoadType === 'customize' || selectedRoadType === 'default') {
            // Load default values
            const defaultValues = this.getDefaultRoadTypeValues();
            this.setCustomizeFieldValues(prefix, defaultValues);
            return;
        }
        
        // Get road type from SurfaceTypesManager
        const roadTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('roadTypes');
        const selectedType = roadTypes.find(rt => {
            const typeName = rt.roadType || Object.values(rt)[0];
            return typeName === selectedRoadType;
        });
        
        if (selectedType) {
            const values = {
                albedo: selectedType.albedo || 0.1,
                emissivity: selectedType.emissivity || 0.95,
                thermalConductivity: selectedType.thermalConductivity || 1.2,
                density: selectedType.density || 2300,
                specificHeatCapacity: selectedType.specificHeatCapacity || 870
            };
            this.setCustomizeFieldValues(prefix, values);
        }
    }
    
    /**
     * Load readonly values from selected road type
     */
    loadRoadTypeReadonlyValues(prefix, roadType = null) {
        if (!this.uiManager.surfaceTypesManager) {
            return;
        }
        
        const dropdownId = prefix ? `${prefix}HighwayRoadType` : 'highwayRoadType';
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown) {
            return;
        }
        
        const selectedRoadType = roadType || dropdown.value;
        
        if (selectedRoadType === 'customize') {
            return;
        }
        
        // Get road type from SurfaceTypesManager
        const roadTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('roadTypes');
        // For 'default', find the road type with roadType === 'default'
        const selectedType = roadTypes.find(rt => {
            const typeName = rt.roadType || Object.values(rt)[0];
            return typeName === selectedRoadType;
        });
        
        if (selectedType) {
            const readonlyFieldIds = {
                albedo: prefix ? `${prefix}HighwayReadonlyAlbedo` : 'highwayReadonlyAlbedo',
                emissivity: prefix ? `${prefix}HighwayReadonlyEmissivity` : 'highwayReadonlyEmissivity',
                thermalConductivity: prefix ? `${prefix}HighwayReadonlyThermalConductivity` : 'highwayReadonlyThermalConductivity',
                density: prefix ? `${prefix}HighwayReadonlyDensity` : 'highwayReadonlyDensity',
                specificHeatCapacity: prefix ? `${prefix}HighwayReadonlySpecificHeatCapacity` : 'highwayReadonlySpecificHeatCapacity'
            };
            
            Object.keys(readonlyFieldIds).forEach(key => {
                const field = document.getElementById(readonlyFieldIds[key]);
                if (field && selectedType[key] !== undefined) {
                    field.value = selectedType[key];
                }
            });
        }
    }
    
    /**
     * Get default road type values
     */
    getDefaultRoadTypeValues() {
        return {
            albedo: 0.1,
            emissivity: 0.95,
            thermalConductivity: 1.2,
            density: 2300,
            specificHeatCapacity: 870
        };
    }
    
    /**
     * Set customize field values
     */
    setCustomizeFieldValues(prefix, values) {
        const fieldIds = {
            albedo: prefix ? `${prefix}HighwayAlbedo` : 'highwayAlbedo',
            emissivity: prefix ? `${prefix}HighwayEmissivity` : 'highwayEmissivity',
            thermalConductivity: prefix ? `${prefix}HighwayThermalConductivity` : 'highwayThermalConductivity',
            density: prefix ? `${prefix}HighwayDensity` : 'highwayDensity',
            specificHeatCapacity: prefix ? `${prefix}HighwaySpecificHeatCapacity` : 'highwaySpecificHeatCapacity'
        };
        
        Object.keys(fieldIds).forEach(key => {
            const field = document.getElementById(fieldIds[key]);
            if (field && values[key] !== undefined) {
                field.value = values[key];
            }
        });
    }
    
    /**
     * Load customize values from shape userData
     */
    loadCustomizeValues(prefix) {
        if (!this.currentShape || !this.currentShape.userData) {
            return;
        }
        
        const customizeValues = this.currentShape.userData.highwayCustomizeValues;
        if (customizeValues) {
            this.setCustomizeFieldValues(prefix, customizeValues);
        } else {
            // Load from current road type if available
            const dropdownId = prefix ? `${prefix}HighwayRoadType` : 'highwayRoadType';
            const dropdown = document.getElementById(dropdownId);
            if (dropdown && dropdown.value !== 'customize') {
                this.loadRoadTypeValues(prefix, dropdown.value);
            }
        }
    }
    
    /**
     * Save customize values to shape userData
     */
    saveCustomizeValues(prefix) {
        if (!this.currentShape) {
            return;
        }
        
        const fieldIds = {
            albedo: prefix ? `${prefix}HighwayAlbedo` : 'highwayAlbedo',
            emissivity: prefix ? `${prefix}HighwayEmissivity` : 'highwayEmissivity',
            thermalConductivity: prefix ? `${prefix}HighwayThermalConductivity` : 'highwayThermalConductivity',
            density: prefix ? `${prefix}HighwayDensity` : 'highwayDensity',
            specificHeatCapacity: prefix ? `${prefix}HighwaySpecificHeatCapacity` : 'highwaySpecificHeatCapacity'
        };
        
        const values = {};
        Object.keys(fieldIds).forEach(key => {
            const field = document.getElementById(fieldIds[key]);
            if (field) {
                values[key] = parseFloat(field.value) || 0;
            }
        });
        
        if (!this.currentShape.userData) {
            this.currentShape.userData = {};
        }
        
        this.currentShape.userData.highwayCustomizeValues = values;
        this.currentShape.userData.highwayRoadType = 'customize';
    }
    
    /**
     * Save selected road type to shape userData
     */
    saveRoadType(prefix, roadType) {
        if (!this.currentShape) {
            return;
        }
        
        if (!this.currentShape.userData) {
            this.currentShape.userData = {};
        }
        
        this.currentShape.userData.highwayRoadType = roadType;
        
        // Ensure no period properties for highway
        delete this.currentShape.userData.startPeriod;
        delete this.currentShape.userData.endPeriod;
        delete this.currentShape.userData.buildingArchetypePeriod;
        delete this.currentShape.userData.buildingGroupPeriod;
        
        // If not customize, also save the values from the road type
        if (roadType !== 'customize') {
            this.loadRoadTypeValues(prefix, roadType);
            const values = this.getCustomizeFieldValues(prefix);
            this.currentShape.userData.highwayCustomizeValues = values;
        }
    }
    
    /**
     * Get customize field values
     */
    getCustomizeFieldValues(prefix) {
        const fieldIds = {
            albedo: prefix ? `${prefix}HighwayAlbedo` : 'highwayAlbedo',
            emissivity: prefix ? `${prefix}HighwayEmissivity` : 'highwayEmissivity',
            thermalConductivity: prefix ? `${prefix}HighwayThermalConductivity` : 'highwayThermalConductivity',
            density: prefix ? `${prefix}HighwayDensity` : 'highwayDensity',
            specificHeatCapacity: prefix ? `${prefix}HighwaySpecificHeatCapacity` : 'highwaySpecificHeatCapacity'
        };
        
        const values = {};
        Object.keys(fieldIds).forEach(key => {
            const field = document.getElementById(fieldIds[key]);
            if (field) {
                values[key] = parseFloat(field.value) || 0;
            }
        });
        
        return values;
    }
    
    /**
     * Get current road type from shape userData
     */
    getCurrentRoadType(prefix) {
        if (!this.currentShape || !this.currentShape.userData) {
            return 'default';
        }
        
        return this.currentShape.userData.highwayRoadType || 'default';
    }
    
    /**
     * Handle water type change - show/hide customize fields
     */
    handleWaterTypeChange(waterType, prefix) {
        const customizeGroup = document.getElementById(prefix ? `${prefix}WaterwayCustomizeGroup` : 'waterwayCustomizeGroup');
        const readonlyGroup = document.getElementById(prefix ? `${prefix}WaterwayReadonlyValuesGroup` : 'waterwayReadonlyValuesGroup');
        
        if (waterType === 'customize') {
            if (customizeGroup) {
                customizeGroup.style.display = 'block';
                this.loadWaterwayCustomizeValues(prefix);
            }
            if (readonlyGroup) {
                readonlyGroup.style.display = 'none';
            }
        } else {
            if (customizeGroup) {
                customizeGroup.style.display = 'none';
            }
            if (readonlyGroup) {
                readonlyGroup.style.display = 'block';
            }
            // Load values from selected water type
            this.loadWaterTypeValues(prefix, waterType);
            this.loadWaterTypeReadonlyValues(prefix, waterType);
        }
        
        // Save the selected water type
        this.saveWaterType(prefix, waterType);
    }
    
    /**
     * Populate water type dropdown with options from SurfaceTypesManager
     */
    populateWaterTypeDropdown(prefix) {
        const dropdownId = prefix ? `${prefix}WaterwayWaterType` : 'waterwayWaterType';
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown || !this.uiManager.surfaceTypesManager) {
            return;
        }
        
        // Clear existing options
        dropdown.innerHTML = '';
        
        // Get water types from SurfaceTypesManager
        const waterTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('waterTypes');
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = 'default';
        defaultOption.textContent = 'Default';
        dropdown.appendChild(defaultOption);
        
        // Add all water types
        waterTypes.forEach(waterType => {
            const waterTypeName = waterType.waterType || Object.values(waterType)[0];
            if (waterTypeName && waterTypeName !== 'default') {
                const option = document.createElement('option');
                option.value = waterTypeName;
                option.textContent = waterTypeName;
                dropdown.appendChild(option);
            }
        });
        
        // Add customize option at the end
        const customizeOption = document.createElement('option');
        customizeOption.value = 'customize';
        customizeOption.textContent = 'Customize';
        dropdown.appendChild(customizeOption);
        
        // Set default value
        const currentWaterType = this.getCurrentWaterType(prefix);
        if (currentWaterType) {
            dropdown.value = currentWaterType;
        } else {
            dropdown.value = 'default';
        }
    }
    
    /**
     * Load values from selected water type
     */
    loadWaterTypeValues(prefix, waterType = null) {
        if (!this.uiManager.surfaceTypesManager) {
            return;
        }
        
        const dropdownId = prefix ? `${prefix}WaterwayWaterType` : 'waterwayWaterType';
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown) {
            return;
        }
        
        const selectedWaterType = waterType || dropdown.value;
        
        if (selectedWaterType === 'customize' || selectedWaterType === 'default') {
            // Load default values
            const defaultValues = this.getDefaultWaterTypeValues();
            this.setWaterwayCustomizeFieldValues(prefix, defaultValues);
            return;
        }
        
        // Get water type from SurfaceTypesManager
        const waterTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('waterTypes');
        const selectedType = waterTypes.find(wt => {
            const typeName = wt.waterType || Object.values(wt)[0];
            return typeName === selectedWaterType;
        });
        
        if (selectedType) {
            const values = {
                albedo: selectedType.albedo || 0.06,
                emissivity: selectedType.emissivity || 0.96,
                specificHeatCapacity: selectedType.specificHeatCapacity || 4190,
                density: selectedType.density || 1000,
                depth: selectedType.depth || 50
            };
            this.setWaterwayCustomizeFieldValues(prefix, values);
        }
    }
    
    /**
     * Load readonly values from selected water type
     */
    loadWaterTypeReadonlyValues(prefix, waterType = null) {
        if (!this.uiManager.surfaceTypesManager) {
            return;
        }
        
        const dropdownId = prefix ? `${prefix}WaterwayWaterType` : 'waterwayWaterType';
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown) {
            return;
        }
        
        const selectedWaterType = waterType || dropdown.value;
        
        if (selectedWaterType === 'customize') {
            return;
        }
        
        // Get water type from SurfaceTypesManager
        const waterTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('waterTypes');
        // For 'default', find the water type with waterType === 'default'
        const selectedType = waterTypes.find(wt => {
            const typeName = wt.waterType || Object.values(wt)[0];
            return typeName === selectedWaterType;
        });
        
        if (selectedType) {
            const readonlyFieldIds = {
                albedo: prefix ? `${prefix}WaterwayReadonlyAlbedo` : 'waterwayReadonlyAlbedo',
                emissivity: prefix ? `${prefix}WaterwayReadonlyEmissivity` : 'waterwayReadonlyEmissivity',
                specificHeatCapacity: prefix ? `${prefix}WaterwayReadonlySpecificHeatCapacity` : 'waterwayReadonlySpecificHeatCapacity',
                density: prefix ? `${prefix}WaterwayReadonlyDensity` : 'waterwayReadonlyDensity',
                depth: prefix ? `${prefix}WaterwayReadonlyDepth` : 'waterwayReadonlyDepth'
            };
            
            Object.keys(readonlyFieldIds).forEach(key => {
                const field = document.getElementById(readonlyFieldIds[key]);
                if (field && selectedType[key] !== undefined) {
                    field.value = selectedType[key];
                }
            });
        }
    }
    
    /**
     * Get default water type values
     */
    getDefaultWaterTypeValues() {
        return {
            albedo: 0.06,
            emissivity: 0.96,
            specificHeatCapacity: 4190,
            density: 1000,
            depth: 50
        };
    }
    
    /**
     * Set waterway customize field values
     */
    setWaterwayCustomizeFieldValues(prefix, values) {
        const fieldIds = {
            albedo: prefix ? `${prefix}WaterwayAlbedo` : 'waterwayAlbedo',
            emissivity: prefix ? `${prefix}WaterwayEmissivity` : 'waterwayEmissivity',
            specificHeatCapacity: prefix ? `${prefix}WaterwaySpecificHeatCapacity` : 'waterwaySpecificHeatCapacity',
            density: prefix ? `${prefix}WaterwayDensity` : 'waterwayDensity',
            depth: prefix ? `${prefix}WaterwayDepth` : 'waterwayDepth'
        };
        
        Object.keys(fieldIds).forEach(key => {
            const field = document.getElementById(fieldIds[key]);
            if (field && values[key] !== undefined) {
                field.value = values[key];
            }
        });
    }
    
    /**
     * Load waterway customize values from shape userData
     */
    loadWaterwayCustomizeValues(prefix) {
        if (!this.currentShape || !this.currentShape.userData) {
            return;
        }
        
        const customizeValues = this.currentShape.userData.waterwayCustomizeValues;
        if (customizeValues) {
            this.setWaterwayCustomizeFieldValues(prefix, customizeValues);
        } else {
            // Load from current water type if available
            const dropdownId = prefix ? `${prefix}WaterwayWaterType` : 'waterwayWaterType';
            const dropdown = document.getElementById(dropdownId);
            if (dropdown && dropdown.value !== 'customize') {
                this.loadWaterTypeValues(prefix, dropdown.value);
            }
        }
    }
    
    /**
     * Save waterway customize values to shape userData
     */
    saveWaterwayCustomizeValues(prefix) {
        if (!this.currentShape) {
            return;
        }
        
        const fieldIds = {
            albedo: prefix ? `${prefix}WaterwayAlbedo` : 'waterwayAlbedo',
            emissivity: prefix ? `${prefix}WaterwayEmissivity` : 'waterwayEmissivity',
            specificHeatCapacity: prefix ? `${prefix}WaterwaySpecificHeatCapacity` : 'waterwaySpecificHeatCapacity',
            density: prefix ? `${prefix}WaterwayDensity` : 'waterwayDensity',
            depth: prefix ? `${prefix}WaterwayDepth` : 'waterwayDepth'
        };
        
        const values = {};
        Object.keys(fieldIds).forEach(key => {
            const field = document.getElementById(fieldIds[key]);
            if (field) {
                values[key] = parseFloat(field.value) || 0;
            }
        });
        
        if (!this.currentShape.userData) {
            this.currentShape.userData = {};
        }
        
        this.currentShape.userData.waterwayCustomizeValues = values;
        this.currentShape.userData.waterwayWaterType = 'customize';
    }
    
    /**
     * Save selected water type to shape userData
     */
    saveWaterType(prefix, waterType) {
        if (!this.currentShape) {
            return;
        }
        
        if (!this.currentShape.userData) {
            this.currentShape.userData = {};
        }
        
        this.currentShape.userData.waterwayWaterType = waterType;
        
        // Ensure no period properties for waterway
        delete this.currentShape.userData.startPeriod;
        delete this.currentShape.userData.endPeriod;
        delete this.currentShape.userData.buildingArchetypePeriod;
        delete this.currentShape.userData.buildingGroupPeriod;
        
        // If not customize, also save the values from the water type
        if (waterType !== 'customize') {
            this.loadWaterTypeValues(prefix, waterType);
            const values = this.getWaterwayCustomizeFieldValues(prefix);
            this.currentShape.userData.waterwayCustomizeValues = values;
        }
    }
    
    /**
     * Get waterway customize field values
     */
    getWaterwayCustomizeFieldValues(prefix) {
        const fieldIds = {
            albedo: prefix ? `${prefix}WaterwayAlbedo` : 'waterwayAlbedo',
            emissivity: prefix ? `${prefix}WaterwayEmissivity` : 'waterwayEmissivity',
            specificHeatCapacity: prefix ? `${prefix}WaterwaySpecificHeatCapacity` : 'waterwaySpecificHeatCapacity',
            density: prefix ? `${prefix}WaterwayDensity` : 'waterwayDensity',
            depth: prefix ? `${prefix}WaterwayDepth` : 'waterwayDepth'
        };
        
        const values = {};
        Object.keys(fieldIds).forEach(key => {
            const field = document.getElementById(fieldIds[key]);
            if (field) {
                values[key] = parseFloat(field.value) || 0;
            }
        });
        
        return values;
    }
    
    /**
     * Get current water type from shape userData
     */
    getCurrentWaterType(prefix) {
        if (!this.currentShape || !this.currentShape.userData) {
            return 'default';
        }
        
        return this.currentShape.userData.waterwayWaterType || 'default';
    }
    
    /**
     * Setup event listeners for grass vegetation type dropdowns
     */
    setupGrassVegetationTypeListeners() {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            // Listen for vegetation type changes in all popups
            const vegetationTypeSelects = [
                { select: 'grassVegetationType', prefix: '' },
                { select: 'circleGrassVegetationType', prefix: 'circle' },
                { select: 'polygonGrassVegetationType', prefix: 'polygon' },
                { select: 'stlGrassVegetationType', prefix: 'stl' }
            ];
            
            vegetationTypeSelects.forEach(({ select, prefix }) => {
                const selectElement = document.getElementById(select);
                if (selectElement && !selectElement.hasAttribute('data-grass-listener')) {
                    selectElement.setAttribute('data-grass-listener', 'true');
                    selectElement.addEventListener('change', (e) => {
                        this.handleVegetationTypeChange(e.target.value, prefix);
                    });
                }
            });
            
            // Listen for customize field changes
            const customizeFields = [
                { prefix: '', fields: ['grassRootFractionLayer1', 'grassRootFractionLayer2', 'grassRootFractionLayer3', 'grassRootFractionLayer4', 'grassMinCanopyRes', 'grassLeafAreaIndex', 'grassTallVegCorrFac', 'grassMomentumRoughLength', 'grassHeatRoughLength', 'grassThermalCondStable', 'grassThermalCondUnstable', 'grassAlbedo', 'grassEmissivity', 'grassDensity', 'grassHeatCapacity'] },
                { prefix: 'circle', fields: ['circleGrassRootFractionLayer1', 'circleGrassRootFractionLayer2', 'circleGrassRootFractionLayer3', 'circleGrassRootFractionLayer4', 'circleGrassMinCanopyRes', 'circleGrassLeafAreaIndex', 'circleGrassTallVegCorrFac', 'circleGrassMomentumRoughLength', 'circleGrassHeatRoughLength', 'circleGrassThermalCondStable', 'circleGrassThermalCondUnstable', 'circleGrassAlbedo', 'circleGrassEmissivity', 'circleGrassDensity', 'circleGrassHeatCapacity'] },
                { prefix: 'polygon', fields: ['polygonGrassRootFractionLayer1', 'polygonGrassRootFractionLayer2', 'polygonGrassRootFractionLayer3', 'polygonGrassRootFractionLayer4', 'polygonGrassMinCanopyRes', 'polygonGrassLeafAreaIndex', 'polygonGrassTallVegCorrFac', 'polygonGrassMomentumRoughLength', 'polygonGrassHeatRoughLength', 'polygonGrassThermalCondStable', 'polygonGrassThermalCondUnstable', 'polygonGrassAlbedo', 'polygonGrassEmissivity', 'polygonGrassDensity', 'polygonGrassHeatCapacity'] },
                { prefix: 'stl', fields: ['stlGrassRootFractionLayer1', 'stlGrassRootFractionLayer2', 'stlGrassRootFractionLayer3', 'stlGrassRootFractionLayer4', 'stlGrassMinCanopyRes', 'stlGrassLeafAreaIndex', 'stlGrassTallVegCorrFac', 'stlGrassMomentumRoughLength', 'stlGrassHeatRoughLength', 'stlGrassThermalCondStable', 'stlGrassThermalCondUnstable', 'stlGrassAlbedo', 'stlGrassEmissivity', 'stlGrassDensity', 'stlGrassHeatCapacity'] }
            ];
            
            customizeFields.forEach(({ prefix, fields }) => {
                fields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field && !field.hasAttribute('data-grass-listener')) {
                        field.setAttribute('data-grass-listener', 'true');
                        field.addEventListener('input', () => {
                            this.saveGrassCustomizeValues(prefix);
                        });
                    }
                });
            });
        }, 100);
    }
    
    /**
     * Handle vegetation type change - show/hide customize fields
     */
    handleVegetationTypeChange(vegetationType, prefix) {
        const customizeGroup = document.getElementById(prefix ? `${prefix}GrassCustomizeGroup` : 'grassCustomizeGroup');
        const readonlyGroup = document.getElementById(prefix ? `${prefix}GrassReadonlyValuesGroup` : 'grassReadonlyValuesGroup');
        
        if (vegetationType === 'customize') {
            if (customizeGroup) {
                customizeGroup.style.display = 'block';
                this.loadGrassCustomizeValues(prefix);
            }
            if (readonlyGroup) {
                readonlyGroup.style.display = 'none';
            }
        } else {
            if (customizeGroup) {
                customizeGroup.style.display = 'none';
            }
            if (readonlyGroup) {
                readonlyGroup.style.display = 'block';
            }
            // Load values from selected vegetation type
            this.loadVegetationTypeValues(prefix, vegetationType);
            this.loadGrassVegetationTypeReadonlyValues(prefix, vegetationType);
        }
        
        // Save the selected vegetation type
        this.saveVegetationType(prefix, vegetationType);
    }
    
    /**
     * Populate vegetation type dropdown with specific options from SurfaceTypesManager
     * Only includes vegetation types suitable for grass (with significant vegetation cover)
     */
    populateVegetationTypeDropdown(prefix) {
        const dropdownId = prefix ? `${prefix}GrassVegetationType` : 'grassVegetationType';
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown || !this.uiManager.surfaceTypesManager) {
            return;
        }
        
        // Clear existing options
        dropdown.innerHTML = '';
        
        // Get grass types from SurfaceTypesManager
        const grassTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('grassTypes');
        
        if (!grassTypes || grassTypes.length === 0) {
            console.warn('No grass types found in SurfaceTypesManager');
            return;
        }
        
        // Add default option (grass_default) first
        const defaultOption = document.createElement('option');
        defaultOption.value = 'grass_default';
        defaultOption.textContent = 'Grass Default';
        dropdown.appendChild(defaultOption);
        
        // Add all grass types (excluding grass_default which is already added)
        grassTypes.forEach(vt => {
                // Get vegetation type name (handle different possible field names)
                const vtName = vt.vegetationType || vt['vegetationType'] || Object.values(vt)[0];
                // Remove prefixes if present (gra:, gro:, tree:)
                const cleanName = vtName.replace(/^(gra|gro|tree):/, '');
            
            // Skip if it's the default
            if (cleanName === 'grass_default' || vtName === 'grass_default') {
                return;
            }
            
                const option = document.createElement('option');
            option.value = cleanName;
                // Format name for display (replace underscores with spaces and capitalize)
            option.textContent = cleanName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                dropdown.appendChild(option);
        });
        
        // Add customize option at the end
        const customizeOption = document.createElement('option');
        customizeOption.value = 'customize';
        customizeOption.textContent = 'Customize';
        dropdown.appendChild(customizeOption);
        
        // Set default value
        const currentVegetationType = this.getCurrentVegetationType(prefix);
        if (currentVegetationType) {
            dropdown.value = currentVegetationType;
        } else {
            dropdown.value = 'grass_default';
        }
    }
    
    /**
     * Load values from selected vegetation type
     */
    loadVegetationTypeValues(prefix, vegetationType = null) {
        if (!this.uiManager.surfaceTypesManager) {
            return;
        }
        
        const dropdownId = prefix ? `${prefix}GrassVegetationType` : 'grassVegetationType';
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown) {
            return;
        }
        
        const selectedVegetationType = vegetationType || dropdown.value;
        
        if (selectedVegetationType === 'customize' || selectedVegetationType === 'grass_default') {
            // Load default values (grass_default)
            const defaultValues = this.getDefaultVegetationTypeValues();
            this.setGrassCustomizeFieldValues(prefix, defaultValues);
            return;
        }
        
        // Get grass types from SurfaceTypesManager
        const grassTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('grassTypes');
        // Also check vegetationTypes for backward compatibility
        const vegetationTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('vegetationTypes');
        const allTypes = [...grassTypes, ...vegetationTypes];
        const selectedType = allTypes.find(vt => {
            const typeName = vt.vegetationType || Object.values(vt)[0];
            const cleanName = typeName.replace(/^(gra|gro|tree):/, '');
            return cleanName === selectedVegetationType || typeName === selectedVegetationType;
        });
        
        if (selectedType) {
            const values = {
                root_fraction_layer_1: selectedType.root_fraction_layer_1 || 0.35,
                root_fraction_layer_2: selectedType.root_fraction_layer_2 || 0.38,
                root_fraction_layer_3: selectedType.root_fraction_layer_3 || 0.23,
                root_fraction_layer_4: selectedType.root_fraction_layer_4 || 0.04,
                minCanopyRes: selectedType.minCanopyRes || 110,
                leafAreaIndex: selectedType.leafAreaIndex || 2,
                tallVegCorrFac: selectedType.tallVegCorrFac || 0,
                momentumRoughLength: selectedType.momentumRoughLength || 0.03,
                heatRoughLength: selectedType.heatRoughLength || 0.0003,
                thermalCondStable: selectedType.thermalCondStable || 10,
                thermalCondUnstable: selectedType.thermalCondUnstable || 10,
                albedo: selectedType.albedo || 0.18,
                emissivity: selectedType.emissivity || 0.95,
                density: selectedType.density || 1000,
                heatCapacity: selectedType.heatCapacity || 1600
            };
            this.setGrassCustomizeFieldValues(prefix, values);
        }
    }
    
    /**
     * Load readonly values from selected grass vegetation type
     */
    loadGrassVegetationTypeReadonlyValues(prefix, vegetationType = null) {
        if (!this.uiManager.surfaceTypesManager) {
            return;
        }
        
        const dropdownId = prefix ? `${prefix}GrassVegetationType` : 'grassVegetationType';
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown) {
            return;
        }
        
        const selectedVegetationType = vegetationType || dropdown.value;
        
        if (selectedVegetationType === 'customize') {
            return;
        }
        
        // Get grass types from SurfaceTypesManager
        const grassTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('grassTypes');
        // Also check vegetationTypes for backward compatibility
        const vegetationTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('vegetationTypes');
        const allTypes = [...grassTypes, ...vegetationTypes];
        // Try to find with exact match first, then try with prefix (gra:, tree:, gro:)
        let selectedType = vegetationTypes.find(vt => {
            const typeName = vt.vegetationType || Object.values(vt)[0];
            return typeName === selectedVegetationType;
        });
        
        // If not found, try with prefix
        if (!selectedType) {
            const prefixMap = {
                'grass_default': 'gra: grass_default',
                'tree_default': 'tree: tree_default',
                'ground_default': 'gro: ground_default'
            };
            const prefixedType = prefixMap[selectedVegetationType] || selectedVegetationType;
            selectedType = vegetationTypes.find(vt => {
                const typeName = vt.vegetationType || Object.values(vt)[0];
                return typeName === prefixedType || typeName.endsWith(selectedVegetationType);
            });
        }
        
        if (selectedType) {
            const readonlyFieldIds = {
                root_fraction_layer_1: prefix ? `${prefix}GrassReadonlyRootFractionLayer1` : 'grassReadonlyRootFractionLayer1',
                root_fraction_layer_2: prefix ? `${prefix}GrassReadonlyRootFractionLayer2` : 'grassReadonlyRootFractionLayer2',
                root_fraction_layer_3: prefix ? `${prefix}GrassReadonlyRootFractionLayer3` : 'grassReadonlyRootFractionLayer3',
                root_fraction_layer_4: prefix ? `${prefix}GrassReadonlyRootFractionLayer4` : 'grassReadonlyRootFractionLayer4',
                minCanopyRes: prefix ? `${prefix}GrassReadonlyMinCanopyRes` : 'grassReadonlyMinCanopyRes',
                leafAreaIndex: prefix ? `${prefix}GrassReadonlyLeafAreaIndex` : 'grassReadonlyLeafAreaIndex',
                tallVegCorrFac: prefix ? `${prefix}GrassReadonlyTallVegCorrFac` : 'grassReadonlyTallVegCorrFac',
                momentumRoughLength: prefix ? `${prefix}GrassReadonlyMomentumRoughLength` : 'grassReadonlyMomentumRoughLength',
                heatRoughLength: prefix ? `${prefix}GrassReadonlyHeatRoughLength` : 'grassReadonlyHeatRoughLength',
                thermalCondStable: prefix ? `${prefix}GrassReadonlyThermalCondStable` : 'grassReadonlyThermalCondStable',
                thermalCondUnstable: prefix ? `${prefix}GrassReadonlyThermalCondUnstable` : 'grassReadonlyThermalCondUnstable',
                albedo: prefix ? `${prefix}GrassReadonlyAlbedo` : 'grassReadonlyAlbedo',
                emissivity: prefix ? `${prefix}GrassReadonlyEmissivity` : 'grassReadonlyEmissivity',
                density: prefix ? `${prefix}GrassReadonlyDensity` : 'grassReadonlyDensity',
                heatCapacity: prefix ? `${prefix}GrassReadonlyHeatCapacity` : 'grassReadonlyHeatCapacity'
            };
            
            Object.keys(readonlyFieldIds).forEach(key => {
                const field = document.getElementById(readonlyFieldIds[key]);
                if (field && selectedType[key] !== undefined) {
                    field.value = selectedType[key];
                }
            });
        }
    }
    
    /**
     * Get default vegetation type values (grass_default)
     */
    getDefaultVegetationTypeValues() {
        return {
            root_fraction_layer_1: 0.35,
            root_fraction_layer_2: 0.38,
            root_fraction_layer_3: 0.23,
            root_fraction_layer_4: 0.04,
            minCanopyRes: 110,
            leafAreaIndex: 2,
            tallVegCorrFac: 0,
            momentumRoughLength: 0.03,
            heatRoughLength: 0.0003,
            thermalCondStable: 10,
            thermalCondUnstable: 10,
            albedo: 0.18,
            emissivity: 0.95,
            density: 1000,
            heatCapacity: 1600
        };
    }
    
    /**
     * Set grass customize field values
     */
    setGrassCustomizeFieldValues(prefix, values) {
        const fieldIds = {
            root_fraction_layer_1: prefix ? `${prefix}GrassRootFractionLayer1` : 'grassRootFractionLayer1',
            root_fraction_layer_2: prefix ? `${prefix}GrassRootFractionLayer2` : 'grassRootFractionLayer2',
            root_fraction_layer_3: prefix ? `${prefix}GrassRootFractionLayer3` : 'grassRootFractionLayer3',
            root_fraction_layer_4: prefix ? `${prefix}GrassRootFractionLayer4` : 'grassRootFractionLayer4',
            minCanopyRes: prefix ? `${prefix}GrassMinCanopyRes` : 'grassMinCanopyRes',
            leafAreaIndex: prefix ? `${prefix}GrassLeafAreaIndex` : 'grassLeafAreaIndex',
            tallVegCorrFac: prefix ? `${prefix}GrassTallVegCorrFac` : 'grassTallVegCorrFac',
            momentumRoughLength: prefix ? `${prefix}GrassMomentumRoughLength` : 'grassMomentumRoughLength',
            heatRoughLength: prefix ? `${prefix}GrassHeatRoughLength` : 'grassHeatRoughLength',
            thermalCondStable: prefix ? `${prefix}GrassThermalCondStable` : 'grassThermalCondStable',
            thermalCondUnstable: prefix ? `${prefix}GrassThermalCondUnstable` : 'grassThermalCondUnstable',
            albedo: prefix ? `${prefix}GrassAlbedo` : 'grassAlbedo',
            emissivity: prefix ? `${prefix}GrassEmissivity` : 'grassEmissivity',
            density: prefix ? `${prefix}GrassDensity` : 'grassDensity',
            heatCapacity: prefix ? `${prefix}GrassHeatCapacity` : 'grassHeatCapacity'
        };
        
        Object.keys(fieldIds).forEach(key => {
            const field = document.getElementById(fieldIds[key]);
            if (field && values[key] !== undefined) {
                field.value = values[key];
            }
        });
    }
    
    /**
     * Load grass customize values from shape userData
     */
    loadGrassCustomizeValues(prefix) {
        if (!this.currentShape || !this.currentShape.userData) {
            return;
        }
        
        const customizeValues = this.currentShape.userData.grassCustomizeValues;
        if (customizeValues) {
            this.setGrassCustomizeFieldValues(prefix, customizeValues);
        } else {
            // Load from current vegetation type if available
            const dropdownId = prefix ? `${prefix}GrassVegetationType` : 'grassVegetationType';
            const dropdown = document.getElementById(dropdownId);
            if (dropdown && dropdown.value !== 'customize') {
                this.loadVegetationTypeValues(prefix, dropdown.value);
            }
        }
    }
    
    /**
     * Save grass customize values to shape userData
     */
    saveGrassCustomizeValues(prefix) {
        if (!this.currentShape) {
            return;
        }
        
        const fieldIds = {
            root_fraction_layer_1: prefix ? `${prefix}GrassRootFractionLayer1` : 'grassRootFractionLayer1',
            root_fraction_layer_2: prefix ? `${prefix}GrassRootFractionLayer2` : 'grassRootFractionLayer2',
            root_fraction_layer_3: prefix ? `${prefix}GrassRootFractionLayer3` : 'grassRootFractionLayer3',
            root_fraction_layer_4: prefix ? `${prefix}GrassRootFractionLayer4` : 'grassRootFractionLayer4',
            minCanopyRes: prefix ? `${prefix}GrassMinCanopyRes` : 'grassMinCanopyRes',
            leafAreaIndex: prefix ? `${prefix}GrassLeafAreaIndex` : 'grassLeafAreaIndex',
            tallVegCorrFac: prefix ? `${prefix}GrassTallVegCorrFac` : 'grassTallVegCorrFac',
            momentumRoughLength: prefix ? `${prefix}GrassMomentumRoughLength` : 'grassMomentumRoughLength',
            heatRoughLength: prefix ? `${prefix}GrassHeatRoughLength` : 'grassHeatRoughLength',
            thermalCondStable: prefix ? `${prefix}GrassThermalCondStable` : 'grassThermalCondStable',
            thermalCondUnstable: prefix ? `${prefix}GrassThermalCondUnstable` : 'grassThermalCondUnstable',
            albedo: prefix ? `${prefix}GrassAlbedo` : 'grassAlbedo',
            emissivity: prefix ? `${prefix}GrassEmissivity` : 'grassEmissivity',
            density: prefix ? `${prefix}GrassDensity` : 'grassDensity',
            heatCapacity: prefix ? `${prefix}GrassHeatCapacity` : 'grassHeatCapacity'
        };
        
        const values = {};
        Object.keys(fieldIds).forEach(key => {
            const field = document.getElementById(fieldIds[key]);
            if (field) {
                values[key] = parseFloat(field.value) || 0;
            }
        });
        
        if (!this.currentShape.userData) {
            this.currentShape.userData = {};
        }
        
        this.currentShape.userData.grassCustomizeValues = values;
        this.currentShape.userData.grassVegetationType = 'customize';
    }
    
    /**
     * Save selected vegetation type to shape userData
     */
    saveVegetationType(prefix, vegetationType) {
        if (!this.currentShape) {
            return;
        }
        
        if (!this.currentShape.userData) {
            this.currentShape.userData = {};
        }
        
        this.currentShape.userData.grassVegetationType = vegetationType;
        
        // Ensure no period properties for grass
        delete this.currentShape.userData.startPeriod;
        delete this.currentShape.userData.endPeriod;
        delete this.currentShape.userData.buildingArchetypePeriod;
        delete this.currentShape.userData.buildingGroupPeriod;
        
        // If not customize, also save the values from the vegetation type
        if (vegetationType !== 'customize') {
            this.loadVegetationTypeValues(prefix, vegetationType);
            const values = this.getGrassCustomizeFieldValues(prefix);
            this.currentShape.userData.grassCustomizeValues = values;
        }
    }
    
    /**
     * Get grass customize field values
     */
    getGrassCustomizeFieldValues(prefix) {
        const fieldIds = {
            root_fraction_layer_1: prefix ? `${prefix}GrassRootFractionLayer1` : 'grassRootFractionLayer1',
            root_fraction_layer_2: prefix ? `${prefix}GrassRootFractionLayer2` : 'grassRootFractionLayer2',
            root_fraction_layer_3: prefix ? `${prefix}GrassRootFractionLayer3` : 'grassRootFractionLayer3',
            root_fraction_layer_4: prefix ? `${prefix}GrassRootFractionLayer4` : 'grassRootFractionLayer4',
            minCanopyRes: prefix ? `${prefix}GrassMinCanopyRes` : 'grassMinCanopyRes',
            leafAreaIndex: prefix ? `${prefix}GrassLeafAreaIndex` : 'grassLeafAreaIndex',
            tallVegCorrFac: prefix ? `${prefix}GrassTallVegCorrFac` : 'grassTallVegCorrFac',
            momentumRoughLength: prefix ? `${prefix}GrassMomentumRoughLength` : 'grassMomentumRoughLength',
            heatRoughLength: prefix ? `${prefix}GrassHeatRoughLength` : 'grassHeatRoughLength',
            thermalCondStable: prefix ? `${prefix}GrassThermalCondStable` : 'grassThermalCondStable',
            thermalCondUnstable: prefix ? `${prefix}GrassThermalCondUnstable` : 'grassThermalCondUnstable',
            albedo: prefix ? `${prefix}GrassAlbedo` : 'grassAlbedo',
            emissivity: prefix ? `${prefix}GrassEmissivity` : 'grassEmissivity',
            density: prefix ? `${prefix}GrassDensity` : 'grassDensity',
            heatCapacity: prefix ? `${prefix}GrassHeatCapacity` : 'grassHeatCapacity'
        };
        
        const values = {};
        Object.keys(fieldIds).forEach(key => {
            const field = document.getElementById(fieldIds[key]);
            if (field) {
                values[key] = parseFloat(field.value) || 0;
            }
        });
        
        return values;
    }
    
    /**
     * Get current vegetation type from shape userData
     */
    getCurrentVegetationType(prefix) {
        if (!this.currentShape || !this.currentShape.userData) {
            return 'grass_default';
        }
        
        return this.currentShape.userData.grassVegetationType || 'grass_default';
    }

    /**
     * Show properties popup for a shape
     */
    showPropertiesPopup(shape) {
        this.currentShape = shape;
        // Also set in UIManager for compatibility with existing code
        this.uiManager.currentShape = shape;
        
        // Get shape properties
        const properties = this.uiManager.getShapeProperties(shape);
        console.log('Showing properties for shape:', shape.name);
        console.log('Shape userData:', shape.userData);
        console.log('Properties:', properties);
        
        // Use the actual color from the shape material
        let displayColor = properties.color;
        
        // Fill form fields
        document.getElementById('shapeName').value = properties.name;
        const shapeTypeSelect = document.getElementById('shapeType');
        shapeTypeSelect.value = properties.type;
        // Store the initial type value for change detection
        shapeTypeSelect.setAttribute('data-previous-value', properties.type);
        // Color is now automatically determined by type (no color picker)
        document.getElementById('shapeLength').value = properties.length;
        document.getElementById('shapeWidth').value = properties.width;
        
        // Set height value based on type
        // For flat types (ground, grass, waterway, highway), height should be 0
        const flatTypes = ['ground', 'grass', 'waterway', 'highway'];
        const isFlatType = flatTypes.includes(properties.type?.toLowerCase());
        const heightValue = isFlatType ? 0 : (properties.height || 0.1);
        document.getElementById('shapeHeight').value = heightValue;
        
        // Show/hide fields based on shape type
        this.uiManager.updatePropertiesFields(properties.type);
        
        // Show/hide height field based on type
        const heightGroup = document.getElementById('heightGroup');
        if (heightGroup) {
            if (properties.type === 'building') {
                heightGroup.style.display = 'flex';
            } else if (isFlatType) {
                heightGroup.style.display = 'none';
            } else {
                heightGroup.style.display = 'flex';
            }
        }
        
        // Set radius value for shapes that have radius
        if (properties.shapeType === 'circle') {
            document.getElementById('shapeRadius').value = properties.radius || 0;
        }
        
        // Setup highway road type dropdown if type is highway
        if (properties.type === 'highway') {
            this.handleTypeChange('highway', '');
        } else {
            this.handleTypeChange(properties.type, '');
        }
        
        // Setup building envelope properties if type is building
        if (properties.type === 'building') {
            this.setupBuildingEnvelopeProperties('');
            // Load Year of Construction value
            const yearOfConstructionInput = document.getElementById('buildingYearOfConstruction');
            if (yearOfConstructionInput && shape.userData) {
                yearOfConstructionInput.value = shape.userData.yearOfConstruction || '';
            }
            // Setup event listener to save Year of Construction
            this.setupYearOfConstructionListener('');
        } else {
            // IMPORTANT: Hide all building-related groups when type is not building
            // This includes period groups which should only be visible for buildings
            const archetypePeriodGroup = document.getElementById('buildingArchetypePeriodGroup');
            const groupPeriodGroup = document.getElementById('buildingGroupPeriodGroup');
            const envelopePropertiesGroup = document.getElementById('buildingEnvelopePropertiesGroup');
            const archytypesGroup = document.getElementById('buildingArchytypesGroup');
            const groupsGroup = document.getElementById('buildingGroupsGroup');
            const readonlyGroup = document.getElementById('buildingEnvelopeReadonlyValuesGroup');
            const customSpecGroup = document.getElementById('buildingCustomSpecGroup');
            const yearOfConstructionGroup = document.getElementById('buildingYearOfConstructionGroup');
            
            if (archetypePeriodGroup) archetypePeriodGroup.style.display = 'none';
            if (groupPeriodGroup) groupPeriodGroup.style.display = 'none';
            if (envelopePropertiesGroup) envelopePropertiesGroup.style.display = 'none';
            if (archytypesGroup) archytypesGroup.style.display = 'none';
            if (groupsGroup) groupsGroup.style.display = 'none';
            if (readonlyGroup) readonlyGroup.style.display = 'none';
            if (customSpecGroup) customSpecGroup.style.display = 'none';
            if (yearOfConstructionGroup) yearOfConstructionGroup.style.display = 'none';
        }
        
        // Show popup
        const popup = document.getElementById('propertiesPopup');
        popup.classList.add('show');
        // Adjust position based on object list visibility
        this.uiManager.adjustPropertiesPopupPositionForElement(popup);
    }

    /**
     * Hide properties popup
     */
    hidePropertiesPopup() {
        // Remove preview extrusion when hiding popup
        this.uiManager.removePreviewExtrusion();
        
        document.getElementById('propertiesPopup').classList.remove('show');
        document.getElementById('circlePropertiesPopup').classList.remove('show');
        document.getElementById('polygonPropertiesPopup').classList.remove('show');
        document.getElementById('treePropertiesPopup').classList.remove('show');
        document.getElementById('stlPropertiesPopup').classList.remove('show');
        this.currentShape = null;
        // Also clear in UIManager for compatibility
        this.uiManager.currentShape = null;
    }

    /**
     * Show circle properties popup
     */
    showCirclePropertiesPopup(shape) {
        this.currentShape = shape;
        // Also set in UIManager for compatibility with existing code
        this.uiManager.currentShape = shape;
        
        // Get shape properties
        const properties = this.uiManager.getShapeProperties(shape);
        console.log('Showing circle properties for shape:', shape.name);
        console.log('Shape userData:', shape.userData);
        console.log('Properties:', properties);
        
        // Use the actual color from the shape material
        let displayColor = properties.color;
        
        // Fill form fields
        document.getElementById('circleName').value = properties.name;
        document.getElementById('circleType').value = properties.type;
        // Color is now automatically determined by type (no color picker)
        
        // Set values for diameter and height
        document.getElementById('circleDiameter').value = properties.diameterTop || 0.1;
        
        // Set height value based on type
        // For flat types (ground, grass, waterway, highway), height should be 0
        const flatTypes = ['ground', 'grass', 'waterway', 'highway'];
        const isFlatType = flatTypes.includes(properties.type?.toLowerCase());
        const heightValue = isFlatType ? 0 : (properties.height || 0.1);
        document.getElementById('circleHeight').value = heightValue;
        
        // Show/hide height field based on type
        const heightGroup = document.getElementById('circleHeightGroup');
        if (heightGroup) {
            if (properties.type === 'building') {
                heightGroup.style.display = 'flex';
            } else if (isFlatType) {
                heightGroup.style.display = 'none';
            } else {
                heightGroup.style.display = 'flex';
            }
        }
        
        // Setup highway road type dropdown if type is highway
        if (properties.type === 'highway') {
            this.handleTypeChange('highway', 'circle');
        } else {
            this.handleTypeChange(properties.type, 'circle');
        }
        
        // Setup building envelope properties if type is building
        if (properties.type === 'building') {
            this.setupBuildingEnvelopeProperties('circle');
            // Load Year of Construction value
            const yearOfConstructionInput = document.getElementById('circleBuildingYearOfConstruction');
            if (yearOfConstructionInput && shape.userData) {
                yearOfConstructionInput.value = shape.userData.yearOfConstruction || '';
            }
            // Setup event listener to save Year of Construction
            this.setupYearOfConstructionListener('circle');
        } else {
            // IMPORTANT: Hide all building-related groups when type is not building
            // This includes period groups which should only be visible for buildings
            const archetypePeriodGroup = document.getElementById('circleBuildingArchetypePeriodGroup');
            const groupPeriodGroup = document.getElementById('circleBuildingGroupPeriodGroup');
            const envelopePropertiesGroup = document.getElementById('circleBuildingEnvelopePropertiesGroup');
            const archytypesGroup = document.getElementById('circleBuildingArchytypesGroup');
            const groupsGroup = document.getElementById('circleBuildingGroupsGroup');
            const readonlyGroup = document.getElementById('circleBuildingEnvelopeReadonlyValuesGroup');
            const customSpecGroup = document.getElementById('circleBuildingCustomSpecGroup');
            const yearOfConstructionGroup = document.getElementById('circleBuildingYearOfConstructionGroup');
            
            if (archetypePeriodGroup) archetypePeriodGroup.style.display = 'none';
            if (groupPeriodGroup) groupPeriodGroup.style.display = 'none';
            if (envelopePropertiesGroup) envelopePropertiesGroup.style.display = 'none';
            if (archytypesGroup) archytypesGroup.style.display = 'none';
            if (groupsGroup) groupsGroup.style.display = 'none';
            if (readonlyGroup) readonlyGroup.style.display = 'none';
            if (customSpecGroup) customSpecGroup.style.display = 'none';
            if (yearOfConstructionGroup) yearOfConstructionGroup.style.display = 'none';
        }
        
        // Show popup
        const popup = document.getElementById('circlePropertiesPopup');
        popup.classList.add('show');
        // Adjust position based on object list visibility
        this.uiManager.adjustPropertiesPopupPositionForElement(popup);
    }

    /**
     * Hide circle properties popup
     */
    hideCirclePropertiesPopup() {
        document.getElementById('circlePropertiesPopup').classList.remove('show');
        this.currentShape = null;
        // Also clear in UIManager for compatibility
        this.uiManager.currentShape = null;
    }

    /**
     * Show tree properties popup
     */
    showTreePropertiesPopup(tree) {
        // If tree is a mesh child, find the parent TransformNode
        let treeParent = tree;
        if (tree instanceof BABYLON.Mesh && tree.parent instanceof BABYLON.TransformNode) {
            treeParent = tree.parent;
        } else if (this.uiManager.treeManager) {
            // Try to find the parent tree in TreeManager
            const treeData = this.uiManager.treeManager.trees.find(t => 
                t.parent === tree || t.meshes.includes(tree)
            );
            if (treeData && treeData.parent) {
                treeParent = treeData.parent;
            }
        }
        
        this.currentShape = treeParent;
        this.currentTree = treeParent; // Store tree reference for name validation
        // Also set in UIManager for compatibility with existing code
        this.uiManager.currentShape = treeParent;
        this.uiManager.currentTree = treeParent;
        
        console.log('Showing tree properties for:', treeParent.name, '(original object:', tree.name, ')');
        
        // Get tree type from name (e.g., "tree_1_0" -> "1")
        const treeType = this.uiManager.getTreeTypeFromName(treeParent.name);
        
        // Fill form fields - use parent name, not child mesh name
        document.getElementById('treeName').value = treeParent.name;
        document.getElementById('treeCategory').value = 'Tree';
        
        // Set current scale value from parent
        const currentScale = treeParent.scaling.x; // Use X scaling as reference
        document.getElementById('treeScale').value = currentScale.toFixed(1);
        
        // Setup tree vegetation type dropdown
        try {
            this.populateTreeVegetationTypeDropdown('tree');
            this.loadTreeVegetationTypeValues('tree');
            const currentVegetationType = this.getCurrentTreeVegetationType('tree');
            const readonlyGroup = document.getElementById('treeTreeReadonlyValuesGroup');
            const customizeGroup = document.getElementById('treeTreeCustomizeGroup');
            
            // Setup soil type dropdown for tree
            this.populateSoilTypeDropdown('tree', 'tree');
            
            if (currentVegetationType === 'customize') {
                if (customizeGroup) {
                    customizeGroup.style.display = 'block';
                }
                if (readonlyGroup) {
                    readonlyGroup.style.display = 'none';
                }
            } else {
                // Show readonly values for default or selected type
                if (readonlyGroup) {
                    readonlyGroup.style.display = 'block';
                }
                if (customizeGroup) {
                    customizeGroup.style.display = 'none';
                }
                // Load readonly values (use currentVegetationType or default to 'tree_default')
                const vegetationTypeToLoad = currentVegetationType || 'tree_default';
                this.loadTreeVegetationTypeReadonlyValues('tree', vegetationTypeToLoad);
            }
        } catch (error) {
            console.error('Error setting up tree vegetation type dropdown:', error);
        }
        
        // Show popup
        const popup = document.getElementById('treePropertiesPopup');
        if (popup) {
        popup.classList.add('show');
        // Adjust position based on object list visibility
        this.uiManager.adjustPropertiesPopupPositionForElement(popup);
        } else {
            console.error('Tree properties popup not found');
        }
    }

    /**
     * Hide tree properties popup
     */
    hideTreePropertiesPopup() {
        document.getElementById('treePropertiesPopup').classList.remove('show');
        this.currentShape = null;
        // Also clear in UIManager for compatibility
        this.uiManager.currentShape = null;
        this.uiManager.currentTree = null;
    }

    /**
     * Show STL properties popup
     */
    showSTLPropertiesPopup(mesh) {
        this.currentShape = mesh;
        this.currentSTLMesh = mesh; // Store STL mesh reference for name validation
        // Also set in UIManager for compatibility with existing code
        this.uiManager.currentShape = mesh;
        this.uiManager.currentSTLMesh = mesh;
        
        console.log('Showing STL properties for mesh:', mesh.name);
        console.log('Mesh userData:', mesh.userData);
        
        // Fill form fields
        const stlNameInput = document.getElementById('stlName');
        const stlTypeSelect = document.getElementById('stlType');
        const stlNameError = document.getElementById('stlNameError');
        
        if (stlNameInput) {
            stlNameInput.value = mesh.name || '';
        }
        
        if (stlTypeSelect) {
            const type = mesh.userData?.type || 'ground';
            stlTypeSelect.value = type;
            
            // Setup highway road type dropdown if type is highway
            if (type === 'highway') {
                // Ensure no period properties for highway
                if (mesh.userData) {
                    delete mesh.userData.startPeriod;
                    delete mesh.userData.endPeriod;
                    delete mesh.userData.buildingArchetypePeriod;
                    delete mesh.userData.buildingGroupPeriod;
                }
                this.handleTypeChange('highway', 'stl');
            } else if (type === 'waterway' || type === 'grass' || type === 'ground' || type === 'tree') {
                // Ensure no period properties for waterway, grass, ground, tree
                if (mesh.userData) {
                    delete mesh.userData.startPeriod;
                    delete mesh.userData.endPeriod;
                    delete mesh.userData.buildingArchetypePeriod;
                    delete mesh.userData.buildingGroupPeriod;
                }
                this.handleTypeChange(type, 'stl');
            } else {
                this.handleTypeChange(type, 'stl');
            }
            
            // Setup building envelope properties if type is building
            if (type === 'building') {
                this.setupBuildingEnvelopeProperties('stl');
                // Load Year of Construction value
                const yearOfConstructionInput = document.getElementById('stlBuildingYearOfConstruction');
                if (yearOfConstructionInput && mesh.userData) {
                    yearOfConstructionInput.value = mesh.userData.yearOfConstruction || '';
                }
                // Setup event listener to save Year of Construction
                this.setupYearOfConstructionListener('stl');
            }
        }
        
        // Clear error message
        if (stlNameError) {
            stlNameError.style.display = 'none';
            stlNameError.textContent = '';
        }
        
        // Show popup
        const popup = document.getElementById('stlPropertiesPopup');
        if (popup) {
            popup.classList.add('show');
            // Adjust position based on object list visibility
            this.uiManager.adjustPropertiesPopupPositionForElement(popup);
        }
    }

    /**
     * Hide STL properties popup
     */
    hideSTLPropertiesPopup() {
        const popup = document.getElementById('stlPropertiesPopup');
        if (popup) {
            popup.classList.remove('show');
        }
        this.currentShape = null;
        this.currentSTLMesh = null;
        // Also clear in UIManager for compatibility
        this.uiManager.currentShape = null;
        this.uiManager.currentSTLMesh = null;
    }

    /**
     * Show polygon properties popup
     */
    showPolygonPropertiesPopup(polygon) {
        this.currentShape = polygon;
        this.currentPolygon = polygon; // Store polygon reference for name validation
        // Also set in UIManager for compatibility with existing code
        this.uiManager.currentShape = polygon;
        this.uiManager.currentPolygon = polygon;
        
        // Store original values for cancel functionality
        // IMPORTANT: Ensure userData exists before setting properties
        if (!polygon.userData) {
            polygon.userData = {};
        }
        
        const type = polygon.userData?.type || 'ground';
        const color = this.uiManager.getShapeColor(polygon);
        
        // Store original values in userData
        polygon.userData.originalName = polygon.name;
        polygon.userData.originalType = type;
        polygon.userData.originalColor = color;
        
        // Set type
        const polygonTypeSelect = document.getElementById('polygonType');
        polygonTypeSelect.value = type;
        // Store the initial type value for change detection
        polygonTypeSelect.setAttribute('data-previous-value', type);
        
        // Use current polygon name (don't generate new name)
        document.getElementById('polygonName').value = polygon.name;
        
        // Set color
        // Color is now automatically determined by type (no color picker)
        
        // Show/hide height field based on type
        // Only 'building' type can have height > 0, all other types should have height = 0
        const isBuilding = type?.toLowerCase() === 'building';
        const heightGroup = document.getElementById('polygonHeightGroup');
        const heightInput = document.getElementById('polygonHeight');
        
        if (isBuilding) {
            heightGroup.style.display = 'block';
            // Set current height for building
            const currentHeight = polygon.userData?.currentHeight || 1;
            if (heightInput) {
                heightInput.value = currentHeight;
            }
        } else {
            // For all non-building types, hide height input and set height to 0
            heightGroup.style.display = 'none';
            if (heightInput) {
                heightInput.value = 0;
            }
        }
        
        // Set triangle count
        const triangleCount = this.uiManager.getPolygonTriangleCount(polygon);
        document.getElementById('polygonTriangles').value = triangleCount;
        
        // Setup highway road type dropdown if type is highway
        if (type === 'highway') {
            this.handleTypeChange('highway', 'polygon');
        } else {
            this.handleTypeChange(type, 'polygon');
        }
        
        // Setup building envelope properties if type is building
        if (type === 'building') {
            this.setupBuildingEnvelopeProperties('polygon');
            // Load Year of Construction value
            const yearOfConstructionInput = document.getElementById('polygonBuildingYearOfConstruction');
            if (yearOfConstructionInput && polygon.userData) {
                yearOfConstructionInput.value = polygon.userData.yearOfConstruction || '';
            }
            // Setup event listener to save Year of Construction
            this.setupYearOfConstructionListener('polygon');
        } else {
            // IMPORTANT: Hide all building-related groups when type is not building
            // This includes period groups which should only be visible for buildings
            const archetypePeriodGroup = document.getElementById('polygonBuildingArchetypePeriodGroup');
            const groupPeriodGroup = document.getElementById('polygonBuildingGroupPeriodGroup');
            const envelopePropertiesGroup = document.getElementById('polygonBuildingEnvelopePropertiesGroup');
            const archytypesGroup = document.getElementById('polygonBuildingArchytypesGroup');
            const groupsGroup = document.getElementById('polygonBuildingGroupsGroup');
            const readonlyGroup = document.getElementById('polygonBuildingEnvelopeReadonlyValuesGroup');
            const customSpecGroup = document.getElementById('polygonBuildingCustomSpecGroup');
            const yearOfConstructionGroup = document.getElementById('polygonBuildingYearOfConstructionGroup');
            
            if (archetypePeriodGroup) archetypePeriodGroup.style.display = 'none';
            if (groupPeriodGroup) groupPeriodGroup.style.display = 'none';
            if (envelopePropertiesGroup) envelopePropertiesGroup.style.display = 'none';
            if (archytypesGroup) archytypesGroup.style.display = 'none';
            if (groupsGroup) groupsGroup.style.display = 'none';
            if (readonlyGroup) readonlyGroup.style.display = 'none';
            if (customSpecGroup) customSpecGroup.style.display = 'none';
            if (yearOfConstructionGroup) yearOfConstructionGroup.style.display = 'none';
        }
        
        // Show popup
        const popup = document.getElementById('polygonPropertiesPopup');
        popup.classList.add('show');
        // Adjust position based on object list visibility
        this.uiManager.adjustPropertiesPopupPositionForElement(popup);
    }

    /**
     * Hide polygon properties popup
     */
    hidePolygonPropertiesPopup() {
        document.getElementById('polygonPropertiesPopup').classList.remove('show');
        this.currentShape = null;
        // Also clear in UIManager for compatibility
        this.uiManager.currentShape = null;
        this.uiManager.currentPolygon = null;
        
        // IMPORTANT: Reset polygonType dropdown to 'ground' so new polygons default to ground
        // This prevents new polygons from inheriting the type of the previously edited polygon
        const polygonTypeSelect = document.getElementById('polygonType');
        if (polygonTypeSelect) {
            polygonTypeSelect.value = 'ground';
            polygonTypeSelect.removeAttribute('data-previous-value');
        }
    }
    
    /**
     * Setup event listeners for ground vegetation type dropdowns
     */
    setupGroundVegetationTypeListeners() {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            // Listen for vegetation type changes in all popups
            const vegetationTypeSelects = [
                { select: 'groundVegetationType', prefix: '' },
                { select: 'circleGroundVegetationType', prefix: 'circle' },
                { select: 'polygonGroundVegetationType', prefix: 'polygon' },
                { select: 'stlGroundVegetationType', prefix: 'stl' }
            ];
            
            vegetationTypeSelects.forEach(({ select, prefix }) => {
                const selectElement = document.getElementById(select);
                if (selectElement && !selectElement.hasAttribute('data-ground-listener')) {
                    selectElement.setAttribute('data-ground-listener', 'true');
                    selectElement.addEventListener('change', (e) => {
                        this.handleGroundVegetationTypeChange(e.target.value, prefix);
                    });
                }
            });
            
            // Listen for customize field changes
            const customizeFields = [
                { prefix: '', fields: ['groundRootFractionLayer1', 'groundRootFractionLayer2', 'groundRootFractionLayer3', 'groundRootFractionLayer4', 'groundMinCanopyRes', 'groundLeafAreaIndex', 'groundTallVegCorrFac', 'groundMomentumRoughLength', 'groundHeatRoughLength', 'groundThermalCondStable', 'groundThermalCondUnstable', 'groundAlbedo', 'groundEmissivity', 'groundDensity', 'groundHeatCapacity'] },
                { prefix: 'circle', fields: ['circleGroundRootFractionLayer1', 'circleGroundRootFractionLayer2', 'circleGroundRootFractionLayer3', 'circleGroundRootFractionLayer4', 'circleGroundMinCanopyRes', 'circleGroundLeafAreaIndex', 'circleGroundTallVegCorrFac', 'circleGroundMomentumRoughLength', 'circleGroundHeatRoughLength', 'circleGroundThermalCondStable', 'circleGroundThermalCondUnstable', 'circleGroundAlbedo', 'circleGroundEmissivity', 'circleGroundDensity', 'circleGroundHeatCapacity'] },
                { prefix: 'polygon', fields: ['polygonGroundRootFractionLayer1', 'polygonGroundRootFractionLayer2', 'polygonGroundRootFractionLayer3', 'polygonGroundRootFractionLayer4', 'polygonGroundMinCanopyRes', 'polygonGroundLeafAreaIndex', 'polygonGroundTallVegCorrFac', 'polygonGroundMomentumRoughLength', 'polygonGroundHeatRoughLength', 'polygonGroundThermalCondStable', 'polygonGroundThermalCondUnstable', 'polygonGroundAlbedo', 'polygonGroundEmissivity', 'polygonGroundDensity', 'polygonGroundHeatCapacity'] },
                { prefix: 'stl', fields: ['stlGroundRootFractionLayer1', 'stlGroundRootFractionLayer2', 'stlGroundRootFractionLayer3', 'stlGroundRootFractionLayer4', 'stlGroundMinCanopyRes', 'stlGroundLeafAreaIndex', 'stlGroundTallVegCorrFac', 'stlGroundMomentumRoughLength', 'stlGroundHeatRoughLength', 'stlGroundThermalCondStable', 'stlGroundThermalCondUnstable', 'stlGroundAlbedo', 'stlGroundEmissivity', 'stlGroundDensity', 'stlGroundHeatCapacity'] }
            ];
            
            customizeFields.forEach(({ prefix, fields }) => {
                fields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field && !field.hasAttribute('data-ground-listener')) {
                        field.setAttribute('data-ground-listener', 'true');
                        field.addEventListener('input', () => {
                            this.saveGroundCustomizeValues(prefix);
                        });
                    }
                });
            });
        }, 100);
    }
    
    /**
     * Handle ground vegetation type change - show/hide customize fields
     */
    handleGroundVegetationTypeChange(vegetationType, prefix) {
        const customizeGroup = document.getElementById(prefix ? `${prefix}GroundCustomizeGroup` : 'groundCustomizeGroup');
        const readonlyGroup = document.getElementById(prefix ? `${prefix}GroundReadonlyValuesGroup` : 'groundReadonlyValuesGroup');
        
        if (vegetationType === 'customize') {
            if (customizeGroup) {
                customizeGroup.style.display = 'block';
                this.loadGroundCustomizeValues(prefix);
            }
            if (readonlyGroup) {
                readonlyGroup.style.display = 'none';
            }
        } else {
            if (customizeGroup) {
                customizeGroup.style.display = 'none';
            }
            if (readonlyGroup) {
                readonlyGroup.style.display = 'block';
            }
            // Load values from selected vegetation type
            this.loadGroundVegetationTypeValues(prefix, vegetationType);
            // Load readonly values for all popups (main, circle, polygon, stl)
            this.loadGroundVegetationTypeReadonlyValues(prefix, vegetationType);
        }
        
        // Save the selected vegetation type
        this.saveGroundVegetationType(prefix, vegetationType);
    }
    
    /**
     * Populate ground vegetation type dropdown with specific options from SurfaceTypesManager
     * Only includes vegetation types suitable for ground (with little to no vegetation cover)
     */
    populateGroundVegetationTypeDropdown(prefix) {
        const dropdownId = prefix ? `${prefix}GroundVegetationType` : 'groundVegetationType';
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown || !this.uiManager.surfaceTypesManager) {
            return;
        }
        
        // Clear existing options
        dropdown.innerHTML = '';
        
        // Get vegetation types from SurfaceTypesManager
        const vegetationTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('vegetationTypes');
        
        if (!vegetationTypes || vegetationTypes.length === 0) {
            console.warn('No vegetation types found in SurfaceTypesManager');
            return;
        }
        
        // Define allowed vegetation types for ground
        // These are types with little to no vegetation cover (low leafAreaIndex and low/no minCanopyRes)
        // Based on CSV data: ground_default, bare_soil, semidesert, tundra
        const allowedTypes = [
            'ground_default',    // Default ground (leafAreaIndex=0, minCanopyRes=0)
            'bare_soil',         // Bare soil (leafAreaIndex=0, minCanopyRes=0)
            'semidesert',        // Semidesert (leafAreaIndex=0.5, minCanopyRes=150)
            'tundra'             // Tundra (leafAreaIndex=1, minCanopyRes=80)
        ];
        
        // Add default option (ground_default) first
        const defaultOption = document.createElement('option');
        defaultOption.value = 'ground_default';
        defaultOption.textContent = 'Ground Default';
        dropdown.appendChild(defaultOption);
        
        // Add all allowed vegetation types (excluding ground_default which is already added)
        allowedTypes.filter(type => type !== 'ground_default').forEach(typeName => {
            // Check if this type exists in vegetationTypes
            const exists = vegetationTypes.some(vt => {
                // Get vegetation type name (handle different possible field names)
                const vtName = vt.vegetationType || vt['vegetationType'] || Object.values(vt)[0];
                // Remove prefixes if present (gra:, gro:, tree:)
                const cleanName = vtName.replace(/^(gra|gro|tree):/, '');
                return cleanName === typeName || vtName === typeName;
            });
            
            if (exists) {
                const option = document.createElement('option');
                option.value = typeName;
                // Format name for display (replace underscores with spaces and capitalize)
                option.textContent = typeName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                dropdown.appendChild(option);
            } else {
                console.warn(`Vegetation type "${typeName}" not found in vegetationTypes array`);
            }
        });
        
        // Add customize option at the end
        const customizeOption = document.createElement('option');
        customizeOption.value = 'customize';
        customizeOption.textContent = 'Customize';
        dropdown.appendChild(customizeOption);
        
        // Set default value
        const currentVegetationType = this.getCurrentGroundVegetationType(prefix);
        if (currentVegetationType) {
            dropdown.value = currentVegetationType;
        } else {
            dropdown.value = 'ground_default';
        }
    }
    
    /**
     * Load values from selected ground vegetation type
     */
    loadGroundVegetationTypeValues(prefix, vegetationType = null) {
        if (!this.uiManager.surfaceTypesManager) {
            return;
        }
        
        const dropdownId = prefix ? `${prefix}GroundVegetationType` : 'groundVegetationType';
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown) {
            return;
        }
        
        const selectedVegetationType = vegetationType || dropdown.value;
        
        if (selectedVegetationType === 'customize' || selectedVegetationType === 'ground_default') {
            // Load default values (ground_default)
            const defaultValues = this.getDefaultGroundVegetationTypeValues();
            this.setGroundCustomizeFieldValues(prefix, defaultValues);
            return;
        }
        
        // Get vegetation type from SurfaceTypesManager
        const vegetationTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('vegetationTypes');
        const selectedType = vegetationTypes.find(vt => {
            const typeName = vt.vegetationType || Object.values(vt)[0];
            return typeName === selectedVegetationType;
        });
        
        if (selectedType) {
            const values = {
                root_fraction_layer_1: selectedType.root_fraction_layer_1 || 0,
                root_fraction_layer_2: selectedType.root_fraction_layer_2 || 0,
                root_fraction_layer_3: selectedType.root_fraction_layer_3 || 0,
                root_fraction_layer_4: selectedType.root_fraction_layer_4 || 0,
                minCanopyRes: selectedType.minCanopyRes || 0,
                leafAreaIndex: selectedType.leafAreaIndex || 0,
                tallVegCorrFac: selectedType.tallVegCorrFac || 0,
                momentumRoughLength: selectedType.momentumRoughLength || 0.005,
                heatRoughLength: selectedType.heatRoughLength || 0.00005,
                thermalCondStable: selectedType.thermalCondStable || 0,
                thermalCondUnstable: selectedType.thermalCondUnstable || 0,
                albedo: selectedType.albedo || 0.17,
                emissivity: selectedType.emissivity || 0.94,
                density: selectedType.density || 1600,
                heatCapacity: selectedType.heatCapacity || 1600
            };
            this.setGroundCustomizeFieldValues(prefix, values);
        }
    }
    
    /**
     * Load readonly values from selected ground vegetation type
     */
    loadGroundVegetationTypeReadonlyValues(prefix, vegetationType = null) {
        if (!this.uiManager.surfaceTypesManager) {
            return;
        }
        
        const dropdownId = prefix ? `${prefix}GroundVegetationType` : 'groundVegetationType';
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown) {
            return;
        }
        
        const selectedVegetationType = vegetationType || dropdown.value;
        
        if (selectedVegetationType === 'customize') {
            return;
        }
        
        // Get vegetation type from SurfaceTypesManager
        const vegetationTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('vegetationTypes');
        // Try to find with exact match first, then try with prefix (gra:, tree:, gro:)
        let selectedType = vegetationTypes.find(vt => {
            const typeName = vt.vegetationType || Object.values(vt)[0];
            return typeName === selectedVegetationType;
        });
        
        // If not found, try with prefix
        if (!selectedType) {
            const prefixMap = {
                'grass_default': 'gra: grass_default',
                'tree_default': 'tree: tree_default',
                'ground_default': 'gro: ground_default'
            };
            const prefixedType = prefixMap[selectedVegetationType] || selectedVegetationType;
            selectedType = vegetationTypes.find(vt => {
                const typeName = vt.vegetationType || Object.values(vt)[0];
                return typeName === prefixedType || typeName.endsWith(selectedVegetationType);
            });
        }
        
        if (selectedType) {
            const readonlyFieldIds = {
                root_fraction_layer_1: prefix ? `${prefix}GroundReadonlyRootFractionLayer1` : 'groundReadonlyRootFractionLayer1',
                root_fraction_layer_2: prefix ? `${prefix}GroundReadonlyRootFractionLayer2` : 'groundReadonlyRootFractionLayer2',
                root_fraction_layer_3: prefix ? `${prefix}GroundReadonlyRootFractionLayer3` : 'groundReadonlyRootFractionLayer3',
                root_fraction_layer_4: prefix ? `${prefix}GroundReadonlyRootFractionLayer4` : 'groundReadonlyRootFractionLayer4',
                minCanopyRes: prefix ? `${prefix}GroundReadonlyMinCanopyRes` : 'groundReadonlyMinCanopyRes',
                leafAreaIndex: prefix ? `${prefix}GroundReadonlyLeafAreaIndex` : 'groundReadonlyLeafAreaIndex',
                tallVegCorrFac: prefix ? `${prefix}GroundReadonlyTallVegCorrFac` : 'groundReadonlyTallVegCorrFac',
                momentumRoughLength: prefix ? `${prefix}GroundReadonlyMomentumRoughLength` : 'groundReadonlyMomentumRoughLength',
                heatRoughLength: prefix ? `${prefix}GroundReadonlyHeatRoughLength` : 'groundReadonlyHeatRoughLength',
                thermalCondStable: prefix ? `${prefix}GroundReadonlyThermalCondStable` : 'groundReadonlyThermalCondStable',
                thermalCondUnstable: prefix ? `${prefix}GroundReadonlyThermalCondUnstable` : 'groundReadonlyThermalCondUnstable',
                albedo: prefix ? `${prefix}GroundReadonlyAlbedo` : 'groundReadonlyAlbedo',
                emissivity: prefix ? `${prefix}GroundReadonlyEmissivity` : 'groundReadonlyEmissivity',
                density: prefix ? `${prefix}GroundReadonlyDensity` : 'groundReadonlyDensity',
                heatCapacity: prefix ? `${prefix}GroundReadonlyHeatCapacity` : 'groundReadonlyHeatCapacity'
            };
            
            Object.keys(readonlyFieldIds).forEach(key => {
                const field = document.getElementById(readonlyFieldIds[key]);
                if (field && selectedType[key] !== undefined) {
                    field.value = selectedType[key];
                }
            });
        }
    }
    
    /**
     * Get default ground vegetation type values (ground_default)
     */
    getDefaultGroundVegetationTypeValues() {
        return {
            root_fraction_layer_1: 0,
            root_fraction_layer_2: 0,
            root_fraction_layer_3: 0,
            root_fraction_layer_4: 0,
            minCanopyRes: 0,
            leafAreaIndex: 0,
            tallVegCorrFac: 0,
            momentumRoughLength: 0.005,
            heatRoughLength: 0.00005,
            thermalCondStable: 0,
            thermalCondUnstable: 0,
            albedo: 0.17,
            emissivity: 0.94,
            density: 1600,
            heatCapacity: 1600
        };
    }
    
    /**
     * Save ground vegetation type to shape userData
     */
    saveGroundVegetationType(prefix, vegetationType) {
        if (!this.currentShape || !this.currentShape.userData) {
            return;
        }
        
        this.currentShape.userData.groundVegetationType = vegetationType;
        
        // Ensure no period properties for ground
        delete this.currentShape.userData.startPeriod;
        delete this.currentShape.userData.endPeriod;
        delete this.currentShape.userData.buildingArchetypePeriod;
        delete this.currentShape.userData.buildingGroupPeriod;
        
        // If not customize, also save the values from the vegetation type
        if (vegetationType !== 'customize') {
            this.loadGroundVegetationTypeValues(prefix, vegetationType);
            const values = this.getGroundCustomizeFieldValues(prefix);
            this.currentShape.userData.groundCustomizeValues = values;
        }
    }
    
    /**
     * Save ground customize values to shape userData
     */
    saveGroundCustomizeValues(prefix) {
        if (!this.currentShape || !this.currentShape.userData) {
            return;
        }
        
        const values = this.getGroundCustomizeFieldValues(prefix);
        this.currentShape.userData.groundCustomizeValues = values;
    }
    
    /**
     * Load ground customize values from shape userData
     */
    loadGroundCustomizeValues(prefix) {
        if (!this.currentShape || !this.currentShape.userData || !this.currentShape.userData.groundCustomizeValues) {
            const defaultValues = this.getDefaultGroundVegetationTypeValues();
            this.setGroundCustomizeFieldValues(prefix, defaultValues);
            return;
        }
        
        const values = this.currentShape.userData.groundCustomizeValues;
        this.setGroundCustomizeFieldValues(prefix, values);
    }
    
    /**
     * Get current ground vegetation type from shape userData
     */
    getCurrentGroundVegetationType(prefix) {
        if (!this.currentShape || !this.currentShape.userData) {
            return 'ground_default';
        }
        
        return this.currentShape.userData.groundVegetationType || 'ground_default';
    }
    
    /**
     * Set ground customize field values
     */
    setGroundCustomizeFieldValues(prefix, values) {
        const fieldIds = {
            root_fraction_layer_1: prefix ? `${prefix}GroundRootFractionLayer1` : 'groundRootFractionLayer1',
            root_fraction_layer_2: prefix ? `${prefix}GroundRootFractionLayer2` : 'groundRootFractionLayer2',
            root_fraction_layer_3: prefix ? `${prefix}GroundRootFractionLayer3` : 'groundRootFractionLayer3',
            root_fraction_layer_4: prefix ? `${prefix}GroundRootFractionLayer4` : 'groundRootFractionLayer4',
            minCanopyRes: prefix ? `${prefix}GroundMinCanopyRes` : 'groundMinCanopyRes',
            leafAreaIndex: prefix ? `${prefix}GroundLeafAreaIndex` : 'groundLeafAreaIndex',
            tallVegCorrFac: prefix ? `${prefix}GroundTallVegCorrFac` : 'groundTallVegCorrFac',
            momentumRoughLength: prefix ? `${prefix}GroundMomentumRoughLength` : 'groundMomentumRoughLength',
            heatRoughLength: prefix ? `${prefix}GroundHeatRoughLength` : 'groundHeatRoughLength',
            thermalCondStable: prefix ? `${prefix}GroundThermalCondStable` : 'groundThermalCondStable',
            thermalCondUnstable: prefix ? `${prefix}GroundThermalCondUnstable` : 'groundThermalCondUnstable',
            albedo: prefix ? `${prefix}GroundAlbedo` : 'groundAlbedo',
            emissivity: prefix ? `${prefix}GroundEmissivity` : 'groundEmissivity',
            density: prefix ? `${prefix}GroundDensity` : 'groundDensity',
            heatCapacity: prefix ? `${prefix}GroundHeatCapacity` : 'groundHeatCapacity'
        };
        
        Object.keys(fieldIds).forEach(key => {
            const field = document.getElementById(fieldIds[key]);
            if (field && values[key] !== undefined) {
                field.value = values[key];
            }
        });
    }
    
    /**
     * Get ground customize field values
     */
    getGroundCustomizeFieldValues(prefix) {
        const fieldIds = {
            root_fraction_layer_1: prefix ? `${prefix}GroundRootFractionLayer1` : 'groundRootFractionLayer1',
            root_fraction_layer_2: prefix ? `${prefix}GroundRootFractionLayer2` : 'groundRootFractionLayer2',
            root_fraction_layer_3: prefix ? `${prefix}GroundRootFractionLayer3` : 'groundRootFractionLayer3',
            root_fraction_layer_4: prefix ? `${prefix}GroundRootFractionLayer4` : 'groundRootFractionLayer4',
            minCanopyRes: prefix ? `${prefix}GroundMinCanopyRes` : 'groundMinCanopyRes',
            leafAreaIndex: prefix ? `${prefix}GroundLeafAreaIndex` : 'groundLeafAreaIndex',
            tallVegCorrFac: prefix ? `${prefix}GroundTallVegCorrFac` : 'groundTallVegCorrFac',
            momentumRoughLength: prefix ? `${prefix}GroundMomentumRoughLength` : 'groundMomentumRoughLength',
            heatRoughLength: prefix ? `${prefix}GroundHeatRoughLength` : 'groundHeatRoughLength',
            thermalCondStable: prefix ? `${prefix}GroundThermalCondStable` : 'groundThermalCondStable',
            thermalCondUnstable: prefix ? `${prefix}GroundThermalCondUnstable` : 'groundThermalCondUnstable',
            albedo: prefix ? `${prefix}GroundAlbedo` : 'groundAlbedo',
            emissivity: prefix ? `${prefix}GroundEmissivity` : 'groundEmissivity',
            density: prefix ? `${prefix}GroundDensity` : 'groundDensity',
            heatCapacity: prefix ? `${prefix}GroundHeatCapacity` : 'groundHeatCapacity'
        };
        
        const values = {};
        Object.keys(fieldIds).forEach(key => {
            const field = document.getElementById(fieldIds[key]);
            if (field) {
                values[key] = parseFloat(field.value) || 0;
            }
        });
        
        return values;
    }
    
    /**
     * Setup event listeners for building envelope properties dropdowns
     */
    setupBuildingEnvelopePropertiesListeners() {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            // Listen for envelope properties changes in all popups
            const envelopePropertiesSelects = [
                { select: 'buildingEnvelopeProperties', prefix: '' },
                { select: 'circleBuildingEnvelopeProperties', prefix: 'circle' },
                { select: 'polygonBuildingEnvelopeProperties', prefix: 'polygon' }
            ];
            
            envelopePropertiesSelects.forEach(({ select, prefix }) => {
                const selectElement = document.getElementById(select);
                if (selectElement && !selectElement.hasAttribute('data-building-listener')) {
                    selectElement.setAttribute('data-building-listener', 'true');
                    selectElement.addEventListener('change', (e) => {
                        this.handleBuildingEnvelopePropertiesChange(e.target.value, prefix);
                    });
                }
            });
            
            // Listen for custom spec field changes
            const customSpecFields = [
                { prefix: '', fields: ['buildingCustomStartPeriod', 'buildingCustomEndPeriod', 'buildingCustomUvalueWindow', 'buildingCustomWindowSHGC', 'buildingCustomWindowEmissivity', 'buildingCustomThermalConductivityWall1', 'buildingCustomThermalConductivityRoof1', 'buildingCustomThermalConductivityFloor1', 'buildingCustomSpecificHeatWall1', 'buildingCustomSpecificHeatRoof1', 'buildingCustomSpecificHeatFloor1', 'buildingCustomDensityWall1', 'buildingCustomDensityRoof1', 'buildingCustomDensityFloor1', 'buildingCustomThicknessWall1', 'buildingCustomThicknessRoof1', 'buildingCustomThicknessFloor1', 'buildingCustomWallAlbedo', 'buildingCustomRoofAlbedo', 'buildingCustomFloorAlbedo', 'buildingCustomWallEmissivity', 'buildingCustomRoofEmissivity', 'buildingCustomFloorEmissivity'] },
                { prefix: 'circle', fields: ['circleBuildingCustomStartPeriod', 'circleBuildingCustomEndPeriod', 'circleBuildingCustomUvalueWindow', 'circleBuildingCustomWindowSHGC', 'circleBuildingCustomWindowEmissivity', 'circleBuildingCustomThermalConductivityWall1', 'circleBuildingCustomThermalConductivityRoof1', 'circleBuildingCustomThermalConductivityFloor1', 'circleBuildingCustomSpecificHeatWall1', 'circleBuildingCustomSpecificHeatRoof1', 'circleBuildingCustomSpecificHeatFloor1', 'circleBuildingCustomDensityWall1', 'circleBuildingCustomDensityRoof1', 'circleBuildingCustomDensityFloor1', 'circleBuildingCustomThicknessWall1', 'circleBuildingCustomThicknessRoof1', 'circleBuildingCustomThicknessFloor1', 'circleBuildingCustomWallAlbedo', 'circleBuildingCustomRoofAlbedo', 'circleBuildingCustomFloorAlbedo', 'circleBuildingCustomWallEmissivity', 'circleBuildingCustomRoofEmissivity', 'circleBuildingCustomFloorEmissivity'] },
                { prefix: 'polygon', fields: ['polygonBuildingCustomStartPeriod', 'polygonBuildingCustomEndPeriod', 'polygonBuildingCustomUvalueWindow', 'polygonBuildingCustomWindowSHGC', 'polygonBuildingCustomWindowEmissivity', 'polygonBuildingCustomThermalConductivityWall1', 'polygonBuildingCustomThermalConductivityRoof1', 'polygonBuildingCustomThermalConductivityFloor1', 'polygonBuildingCustomSpecificHeatWall1', 'polygonBuildingCustomSpecificHeatRoof1', 'polygonBuildingCustomSpecificHeatFloor1', 'polygonBuildingCustomDensityWall1', 'polygonBuildingCustomDensityRoof1', 'polygonBuildingCustomDensityFloor1', 'polygonBuildingCustomThicknessWall1', 'polygonBuildingCustomThicknessRoof1', 'polygonBuildingCustomThicknessFloor1', 'polygonBuildingCustomWallAlbedo', 'polygonBuildingCustomRoofAlbedo', 'polygonBuildingCustomFloorAlbedo', 'polygonBuildingCustomWallEmissivity', 'polygonBuildingCustomRoofEmissivity', 'polygonBuildingCustomFloorEmissivity'] }
            ];
            
            customSpecFields.forEach(({ prefix, fields }) => {
                fields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field && !field.hasAttribute('data-building-custom-listener')) {
                        field.setAttribute('data-building-custom-listener', 'true');
                        field.addEventListener('input', () => {
                            this.saveBuildingCustomSpecValues(prefix);
                        });
                    }
                });
            });
        }, 100);
    }
    
    /**
     * Setup event listener for Year of Construction field
     * @param {string} prefix - Prefix for element IDs ('', 'circle', or 'polygon')
     */
    setupYearOfConstructionListener(prefix) {
        const fieldId = prefix ? `${prefix}BuildingYearOfConstruction` : 'buildingYearOfConstruction';
        const field = document.getElementById(fieldId);
        
        if (field && !field.hasAttribute('data-year-of-construction-listener')) {
            field.setAttribute('data-year-of-construction-listener', 'true');
            
            // Prevent non-numeric input (except backspace, delete, arrow keys, etc.)
            field.addEventListener('keydown', (e) => {
                // Allow: backspace, delete, tab, escape, enter, decimal point, and arrow keys
                if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
                    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                    (e.keyCode === 65 && e.ctrlKey === true) ||
                    (e.keyCode === 67 && e.ctrlKey === true) ||
                    (e.keyCode === 86 && e.ctrlKey === true) ||
                    (e.keyCode === 88 && e.ctrlKey === true) ||
                    // Allow: home, end, left, right arrow keys
                    (e.keyCode >= 35 && e.keyCode <= 39)) {
                    return;
                }
                // Ensure that it is a number and stop the keypress if not
                if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                    e.preventDefault();
                }
            });
            
            // Validate on input
            field.addEventListener('input', () => {
                const value = field.value.trim();
                if (value !== '') {
                    const numValue = parseInt(value, 10);
                    // If not a valid positive integer, show error
                    if (isNaN(numValue) || numValue < 1 || !Number.isInteger(numValue) || value !== numValue.toString()) {
                        field.style.borderColor = 'red';
                    } else {
                        field.style.borderColor = '';
                    }
                } else {
                    field.style.borderColor = '';
                }
                this.saveYearOfConstruction(prefix);
            });
            
            // Validate on blur
            field.addEventListener('blur', () => {
                this.saveYearOfConstruction(prefix);
            });
        }
    }
    
    /**
     * Save Year of Construction value to userData
     * @param {string} prefix - Prefix for element IDs ('', 'circle', or 'polygon')
     */
    saveYearOfConstruction(prefix) {
        if (!this.currentShape) {
            return;
        }
        if (!this.currentShape.userData) {
            this.currentShape.userData = {};
        }
        
        const fieldId = prefix ? `${prefix}BuildingYearOfConstruction` : 'buildingYearOfConstruction';
        const field = document.getElementById(fieldId);
        
        if (field) {
            const value = field.value.trim();
            // Save the value (can be empty since it's optional)
            if (value === '') {
                // Remove the property if empty
                delete this.currentShape.userData.yearOfConstruction;
                // Remove any validation error styling
                field.style.borderColor = '';
            } else {
                // Validate: must be a positive integer
                const numValue = parseInt(value, 10);
                if (isNaN(numValue) || numValue < 1 || !Number.isInteger(numValue) || value !== numValue.toString()) {
                    // Invalid value: show error and don't save
                    field.style.borderColor = 'red';
                    // Clear the invalid value
                    field.value = '';
                    delete this.currentShape.userData.yearOfConstruction;
                } else {
                    // Valid positive integer: save it
                    this.currentShape.userData.yearOfConstruction = numValue;
                    // Remove any validation error styling
                    field.style.borderColor = '';
                }
            }
        }
    }
    
    /**
     * Save building custom spec values
     */
    saveBuildingCustomSpecValues(prefix) {
        if (!this.currentShape) {
            return;
        }
        if (!this.currentShape.userData) {
            this.currentShape.userData = {};
        }
        
        const values = {};
        
        // Save layer counts
        const wallLayersInput = document.getElementById(prefix ? `${prefix}BuildingCustomWallLayers` : 'buildingCustomWallLayers');
        const roofLayersInput = document.getElementById(prefix ? `${prefix}BuildingCustomRoofLayers` : 'buildingCustomRoofLayers');
        const floorLayersInput = document.getElementById(prefix ? `${prefix}BuildingCustomFloorLayers` : 'buildingCustomFloorLayers');
        
        if (wallLayersInput) {
            values.number_of_wall_layers = parseInt(wallLayersInput.value) || 1;
        }
        if (roofLayersInput) {
            values.number_of_roof_layers = parseInt(roofLayersInput.value) || 1;
        }
        if (floorLayersInput) {
            values.number_of_floor_layers = parseInt(floorLayersInput.value) || 1;
        }
        
        // Always save startPeriod and endPeriod as 'NA' for custom spec
        values.startPeriod = 'NA';
        values.endPeriod = 'NA';
        
        // Save basic fields (excluding startPeriod and endPeriod which are always NA)
        const fieldIds = {
            'Uvalue_window(W/m2/K)': prefix ? `${prefix}BuildingCustomUvalueWindow` : 'buildingCustomUvalueWindow',
            'windowSHGC(-)': prefix ? `${prefix}BuildingCustomWindowSHGC` : 'buildingCustomWindowSHGC',
            'windowEmissivity(-)': prefix ? `${prefix}BuildingCustomWindowEmissivity` : 'buildingCustomWindowEmissivity',
            'wallAlbedo(-)': prefix ? `${prefix}BuildingCustomWallAlbedo` : 'buildingCustomWallAlbedo',
            'roofAlbedo(-)': prefix ? `${prefix}BuildingCustomRoofAlbedo` : 'buildingCustomRoofAlbedo',
            'floorAlbedo(-)': prefix ? `${prefix}BuildingCustomFloorAlbedo` : 'buildingCustomFloorAlbedo',
            'wallEmissivity(-)': prefix ? `${prefix}BuildingCustomWallEmissivity` : 'buildingCustomWallEmissivity',
            'roofEmissivity(-)': prefix ? `${prefix}BuildingCustomRoofEmissivity` : 'buildingCustomRoofEmissivity',
            'floorEmissivity(-)': prefix ? `${prefix}BuildingCustomFloorEmissivity` : 'buildingCustomFloorEmissivity'
        };
        
        Object.keys(fieldIds).forEach(key => {
            const field = document.getElementById(fieldIds[key]);
            if (field) {
                const numValue = parseFloat(field.value);
                values[key] = isNaN(numValue) ? field.value : numValue;
            }
        });
        
        // Save dynamic layer fields
        const containerId = prefix ? `${prefix}BuildingCustomLayerFields` : 'buildingCustomLayerFields';
        const container = document.getElementById(containerId);
        if (container) {
            const inputs = container.querySelectorAll('input[data-property]');
            inputs.forEach(input => {
                const key = input.dataset.property;
                if (input.value) {
                    const numValue = parseFloat(input.value);
                    values[key] = isNaN(numValue) ? input.value : numValue;
                }
            });
        }
        
        this.currentShape.userData.buildingCustomSpec = values;
    }
    
    /**
     * Setup building envelope properties dropdown
     */
    setupBuildingEnvelopeProperties(prefix) {
        const dropdownId = prefix ? `${prefix}BuildingEnvelopeProperties` : 'buildingEnvelopeProperties';
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown) {
            return;
        }
        
        // Load saved value if exists
        const savedValue = this.getCurrentBuildingEnvelopeProperties(prefix);
        if (savedValue) {
            dropdown.value = savedValue;
        } else {
            dropdown.value = 'archytypes'; // Default to archytypes
        }
        
        // Trigger change to show/hide appropriate fields
        this.handleBuildingEnvelopePropertiesChange(dropdown.value, prefix);
    }
    
    /**
     * Handle building envelope properties change
     */
    handleBuildingEnvelopePropertiesChange(envelopeType, prefix) {
        // Save the selected type
        this.saveBuildingEnvelopeProperties(prefix, envelopeType);
        
        // Get group elements
        const archytypesGroup = document.getElementById(prefix ? `${prefix}BuildingArchytypesGroup` : 'buildingArchytypesGroup');
        const archetypePeriodGroup = document.getElementById(prefix ? `${prefix}BuildingArchetypePeriodGroup` : 'buildingArchetypePeriodGroup');
        const groupsGroup = document.getElementById(prefix ? `${prefix}BuildingGroupsGroup` : 'buildingGroupsGroup');
        const groupPeriodGroup = document.getElementById(prefix ? `${prefix}BuildingGroupPeriodGroup` : 'buildingGroupPeriodGroup');
        const readonlyGroup = document.getElementById(prefix ? `${prefix}BuildingEnvelopeReadonlyValuesGroup` : 'buildingEnvelopeReadonlyValuesGroup');
        const customSpecGroup = document.getElementById(prefix ? `${prefix}BuildingCustomSpecGroup` : 'buildingCustomSpecGroup');
        
        // Hide all groups first
        if (archytypesGroup) archytypesGroup.style.display = 'none';
        if (archetypePeriodGroup) archetypePeriodGroup.style.display = 'none';
        if (groupsGroup) groupsGroup.style.display = 'none';
        if (groupPeriodGroup) groupPeriodGroup.style.display = 'none';
        if (readonlyGroup) readonlyGroup.style.display = 'none';
        if (customSpecGroup) customSpecGroup.style.display = 'none';
        
        // Show appropriate group based on selection
        if (envelopeType === 'archytypes') {
            if (archytypesGroup) {
                archytypesGroup.style.display = 'flex';
                this.populateBuildingArchytypesDropdown(prefix);
            }
            
            // Show period dropdown
            const periodGroup = document.getElementById(prefix ? `${prefix}BuildingArchetypePeriodGroup` : 'buildingArchetypePeriodGroup');
            if (periodGroup) {
                periodGroup.style.display = 'flex';
            }
            
            if (readonlyGroup) {
                readonlyGroup.style.display = 'block';
                // Load readonly values for selected archytype and period
                const selectedArchytype = this.getCurrentBuildingArchytype(prefix);
                if (selectedArchytype !== null && selectedArchytype !== undefined) {
                    this.populateBuildingArchetypePeriodsDropdown(prefix, selectedArchytype);
                    const selectedPeriod = this.getCurrentBuildingArchetypePeriod(prefix);
                    if (selectedPeriod !== null && selectedPeriod !== undefined) {
                        this.loadBuildingArchetypePeriodReadonlyValues(prefix, selectedArchytype, selectedPeriod);
                    }
                }
            }
        } else if (envelopeType === 'groups') {
            if (groupsGroup) {
                groupsGroup.style.display = 'flex';
                this.populateBuildingGroupsDropdown(prefix);
            }
            
            // Show period dropdown
            const periodGroup = document.getElementById(prefix ? `${prefix}BuildingGroupPeriodGroup` : 'buildingGroupPeriodGroup');
            if (periodGroup) {
                periodGroup.style.display = 'flex';
            }
            
            if (readonlyGroup) {
                readonlyGroup.style.display = 'block';
                // Load readonly values for selected group and period
                const selectedGroup = this.getCurrentBuildingGroup(prefix);
                if (selectedGroup !== null && selectedGroup !== undefined) {
                    this.populateBuildingGroupPeriodsDropdown(prefix, selectedGroup);
                    const selectedPeriod = this.getCurrentBuildingGroupPeriod(prefix);
                    if (selectedPeriod !== null && selectedPeriod !== undefined) {
                        this.loadBuildingGroupPeriodReadonlyValues(prefix, selectedGroup, selectedPeriod);
                    }
                }
            }
        } else if (envelopeType === 'customSpec') {
            if (customSpecGroup) {
                customSpecGroup.style.display = 'block';
                // Setup layer count listeners
                this.setupCustomSpecLayerListeners(prefix);
                // Set Start Period and End Period to NA and readonly
                const startPeriodField = document.getElementById(prefix ? `${prefix}BuildingCustomStartPeriod` : 'buildingCustomStartPeriod');
                const endPeriodField = document.getElementById(prefix ? `${prefix}BuildingCustomEndPeriod` : 'buildingCustomEndPeriod');
                if (startPeriodField) {
                    startPeriodField.value = 'NA';
                    startPeriodField.readOnly = true;
                }
                if (endPeriodField) {
                    endPeriodField.value = 'NA';
                    endPeriodField.readOnly = true;
                }
                // Load custom values (will initialize with defaults if empty)
                this.loadBuildingCustomSpecValues(prefix);
            }
        }
    }
    
    /**
     * Get current building envelope properties
     */
    getCurrentBuildingEnvelopeProperties(prefix) {
        if (!this.currentShape || !this.currentShape.userData) {
            return null;
        }
        return this.currentShape.userData.buildingEnvelopeProperties || null;
    }
    
    /**
     * Save building envelope properties
     */
    saveBuildingEnvelopeProperties(prefix, envelopeType) {
        if (!this.currentShape) {
            return;
        }
        if (!this.currentShape.userData) {
            this.currentShape.userData = {};
        }
        this.currentShape.userData.buildingEnvelopeProperties = envelopeType;
    }
    
    /**
     * Populate building archytypes dropdown
     */
    populateBuildingArchytypesDropdown(prefix) {
        const dropdownId = prefix ? `${prefix}BuildingArchytype` : 'buildingArchytype';
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown || !this.uiManager.surfaceTypesManager) {
            return;
        }
        
        // Clear existing options
        dropdown.innerHTML = '';
        
        // Get parsed archytypes from UIManager (if available) or parse from CSV
        let archytypes = [];
        if (this.uiManager.buildingArchetypes && this.uiManager.buildingArchetypes.length > 0) {
            archytypes = this.uiManager.buildingArchetypes;
        } else {
            // Fallback: parse from CSV data
            const rawData = this.uiManager.surfaceTypesManager.getSurfaceTypes('buildingArchyTypes');
            if (rawData && rawData.length > 0) {
                archytypes = this.uiManager.parseBuildingArchetypes(rawData);
            }
        }
        
        if (!archytypes || archytypes.length === 0) {
            return;
        }
        
        // Add options based on usage_group_building_name
        archytypes.forEach((archytype, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = archytype.usage_group_building_name || `Archetype ${index + 1}`;
            dropdown.appendChild(option);
        });
        
        // Set current value if exists
        const currentArchytype = this.getCurrentBuildingArchytype(prefix);
        if (currentArchytype !== null && currentArchytype !== undefined) {
            dropdown.value = currentArchytype;
            // Populate periods for selected archetype
            this.populateBuildingArchetypePeriodsDropdown(prefix, currentArchytype);
        } else if (archytypes.length > 0) {
            // Default to first archetype
            dropdown.value = '0';
            this.saveBuildingArchytype(prefix, '0');
            // Populate periods for first archetype
            this.populateBuildingArchetypePeriodsDropdown(prefix, '0');
        }
        
        // Add event listener for changes
        if (!dropdown.hasAttribute('data-archytype-listener')) {
            dropdown.setAttribute('data-archytype-listener', 'true');
            dropdown.addEventListener('change', (e) => {
                this.handleBuildingArchytypeChange(e.target.value, prefix);
            });
        }
    }
    
    /**
     * Populate building groups dropdown
     */
    populateBuildingGroupsDropdown(prefix) {
        const dropdownId = prefix ? `${prefix}BuildingGroup` : 'buildingGroup';
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown || !this.uiManager.surfaceTypesManager) {
            return;
        }
        
        // Clear existing options
        dropdown.innerHTML = '';
        
        // Ensure buildingGroups is loaded
        if (!this.uiManager.buildingGroups || this.uiManager.buildingGroups.length === 0) {
            // Load building groups data if not already loaded
            if (this.uiManager.loadBuildingGroupsData) {
                this.uiManager.loadBuildingGroupsData();
            }
        }
        
        // Get parsed groups from UIManager (if available) or parse from CSV
        let groups = [];
        if (this.uiManager.buildingGroups && this.uiManager.buildingGroups.length > 0) {
            groups = this.uiManager.buildingGroups;
        } else {
            // Fallback: parse from CSV data
            const rawData = this.uiManager.surfaceTypesManager.getSurfaceTypes('buildingGroups');
            if (rawData && rawData.length > 0) {
                if (this.uiManager.parseBuildingGroups) {
                    groups = this.uiManager.parseBuildingGroups(rawData);
                    // Store parsed groups for future use
                    if (groups && groups.length > 0) {
                        this.uiManager.buildingGroups = groups;
                    }
                }
            }
        }
        
        if (!groups || groups.length === 0) {
            return;
        }
        
        // Add options based on group_name
        groups.forEach((group, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = group.group_name || `Group ${index + 1}`;
            dropdown.appendChild(option);
        });
        
        // Set current value if exists
        const currentGroup = this.getCurrentBuildingGroup(prefix);
        if (currentGroup !== null && currentGroup !== undefined) {
            dropdown.value = currentGroup;
            // Populate periods for selected group
            this.populateBuildingGroupPeriodsDropdown(prefix, currentGroup);
        } else if (groups.length > 0) {
            // Default to first group
            dropdown.value = '0';
            this.saveBuildingGroup(prefix, '0');
            // Populate periods for first group
            this.populateBuildingGroupPeriodsDropdown(prefix, '0');
        }
        
        // Add event listener for changes
        if (!dropdown.hasAttribute('data-group-listener')) {
            dropdown.setAttribute('data-group-listener', 'true');
            dropdown.addEventListener('change', (e) => {
                this.handleBuildingGroupChange(e.target.value, prefix);
            });
        }
    }
    
    /**
     * Handle building archytype change
     */
    handleBuildingArchytypeChange(archytypeIndex, prefix) {
        this.saveBuildingArchytype(prefix, archytypeIndex);
        
        // Populate periods dropdown for selected archetype
        this.populateBuildingArchetypePeriodsDropdown(prefix, archytypeIndex);
        
        // Load readonly values for selected archetype and period
        const selectedPeriod = this.getCurrentBuildingArchetypePeriod(prefix);
        if (selectedPeriod !== null && selectedPeriod !== undefined) {
            this.loadBuildingArchetypePeriodReadonlyValues(prefix, archytypeIndex, selectedPeriod);
        }
    }
    
    /**
     * Populate building archetype periods dropdown
     * @param {string} prefix - Prefix for element IDs (empty string for regular popup, 'circle' or 'polygon' for prefixed)
     * @param {string} archytypeIndex - Index of selected archetype
     */
    populateBuildingArchetypePeriodsDropdown(prefix, archytypeIndex) {
        const dropdownId = prefix ? `${prefix}BuildingArchetypePeriod` : 'buildingArchetypePeriod';
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown) {
            return;
        }
        
        // Clear existing options
        dropdown.innerHTML = '';
        
        // Get parsed archytypes from UIManager
        let archytypes = [];
        if (this.uiManager.buildingArchetypes && this.uiManager.buildingArchetypes.length > 0) {
            archytypes = this.uiManager.buildingArchetypes;
        } else {
            // Fallback: parse from CSV data
            const rawData = this.uiManager.surfaceTypesManager.getSurfaceTypes('buildingArchyTypes');
            if (rawData && rawData.length > 0) {
                archytypes = this.uiManager.parseBuildingArchetypes(rawData);
            }
        }
        
        const archytypeIndexNum = parseInt(archytypeIndex);
        if (!archytypes || !archytypes[archytypeIndexNum] || !archytypes[archytypeIndexNum].periods) {
            return;
        }
        
        const archytype = archytypes[archytypeIndexNum];
        const periods = archytype.periods || [];
        
        // Add options based on startPeriod and endPeriod
        periods.forEach((period, index) => {
            const option = document.createElement('option');
            const startPeriod = period.startPeriod || '';
            const endPeriod = period.endPeriod || '';
            option.value = index;
            option.textContent = `${startPeriod} - ${endPeriod}`;
            dropdown.appendChild(option);
        });
        
        // Set current value if exists
        const currentPeriod = this.getCurrentBuildingArchetypePeriod(prefix);
        if (currentPeriod !== null && currentPeriod !== undefined && currentPeriod < periods.length) {
            dropdown.value = currentPeriod;
        } else if (periods.length > 0) {
            // Default to first period
            dropdown.value = '0';
            this.saveBuildingArchetypePeriod(prefix, '0');
        }
        
        // Add event listener for changes
        if (!dropdown.hasAttribute('data-period-listener')) {
            dropdown.setAttribute('data-period-listener', 'true');
            dropdown.addEventListener('change', (e) => {
                this.handleBuildingArchetypePeriodChange(prefix, archytypeIndex, e.target.value);
            });
        }
    }
    
    /**
     * Handle building archetype period change
     * @param {string} prefix - Prefix for element IDs
     * @param {string} archytypeIndex - Index of selected archetype
     * @param {string} periodIndex - Index of selected period
     */
    handleBuildingArchetypePeriodChange(prefix, archytypeIndex, periodIndex) {
        this.saveBuildingArchetypePeriod(prefix, periodIndex);
        this.loadBuildingArchetypePeriodReadonlyValues(prefix, archytypeIndex, periodIndex);
    }
    
    /**
     * Load building archetype period readonly values
     * @param {string} prefix - Prefix for element IDs
     * @param {string} archytypeIndex - Index of selected archetype
     * @param {string} periodIndex - Index of selected period
     */
    loadBuildingArchetypePeriodReadonlyValues(prefix, archytypeIndex, periodIndex) {
        // Get parsed archytypes from UIManager
        let archytypes = [];
        if (this.uiManager.buildingArchetypes && this.uiManager.buildingArchetypes.length > 0) {
            archytypes = this.uiManager.buildingArchetypes;
        } else {
            // Fallback: parse from CSV data
            const rawData = this.uiManager.surfaceTypesManager.getSurfaceTypes('buildingArchyTypes');
            if (rawData && rawData.length > 0) {
                archytypes = this.uiManager.parseBuildingArchetypes(rawData);
            }
        }
        
        const archytypeIndexNum = parseInt(archytypeIndex);
        const periodIndexNum = parseInt(periodIndex);
        
        if (!archytypes || !archytypes[archytypeIndexNum] || !archytypes[archytypeIndexNum].periods) {
            return;
        }
        
        const archytype = archytypes[archytypeIndexNum];
        const periods = archytype.periods || [];
        
        if (!periods[periodIndexNum]) {
            return;
        }
        
        const period = periods[periodIndexNum];
        
        // Get layer counts
        const wallLayers = archytype.number_of_wall_layers || 1;
        const roofLayers = archytype.number_of_roof_layers || 1;
        const floorLayers = archytype.number_of_floor_layers || 1;
        
        // Generate headers based on layer counts
        const headers = this.uiManager.generateArchetypeHeaders(wallLayers, roofLayers, floorLayers);
        
        // Set readonly values dynamically based on headers
        this.setBuildingArchetypePeriodReadonlyValues(prefix, period, headers);
    }
    
    /**
     * Set building archetype period readonly values dynamically
     * @param {string} prefix - Prefix for element IDs
     * @param {Object} period - Period data object
     * @param {Array} headers - Array of header names
     */
    setBuildingArchetypePeriodReadonlyValues(prefix, period, headers) {
        // Get readonly group
        const readonlyGroup = document.getElementById(prefix ? `${prefix}BuildingEnvelopeReadonlyValuesGroup` : 'buildingEnvelopeReadonlyValuesGroup');
        if (!readonlyGroup) {
            return;
        }
        
        // First, hide all existing fields
        const existingFields = readonlyGroup.querySelectorAll('.property-group');
        existingFields.forEach(field => {
            field.style.display = 'none';
        });
        
        // Map headers to field IDs and labels
        const getFieldId = (header) => {
            // Standard field mappings
            const standardMappings = {
                'startPeriod': prefix ? `${prefix}BuildingReadonlyStartPeriod` : 'buildingReadonlyStartPeriod',
                'endPeriod': prefix ? `${prefix}BuildingReadonlyEndPeriod` : 'buildingReadonlyEndPeriod',
                'Uvalue_window(W/m2/K)': prefix ? `${prefix}BuildingReadonlyUvalueWindow` : 'buildingReadonlyUvalueWindow',
                'windowSHGC(-)': prefix ? `${prefix}BuildingReadonlyWindowSHGC` : 'buildingReadonlyWindowSHGC',
                'windowEmissivity(-)': prefix ? `${prefix}BuildingReadonlyWindowEmissivity` : 'buildingReadonlyWindowEmissivity',
                'wallAlbedo(-)': prefix ? `${prefix}BuildingReadonlyWallAlbedo` : 'buildingReadonlyWallAlbedo',
                'roofAlbedo(-)': prefix ? `${prefix}BuildingReadonlyRoofAlbedo` : 'buildingReadonlyRoofAlbedo',
                'floorAlbedo(-)': prefix ? `${prefix}BuildingReadonlyFloorAlbedo` : 'buildingReadonlyFloorAlbedo',
                'wallEmissivity(-)': prefix ? `${prefix}BuildingReadonlyWallEmissivity` : 'buildingReadonlyWallEmissivity',
                'roofEmissivity(-)': prefix ? `${prefix}BuildingReadonlyRoofEmissivity` : 'buildingReadonlyRoofEmissivity',
                'floorEmissivity(-)': prefix ? `${prefix}BuildingReadonlyFloorEmissivity` : 'buildingReadonlyFloorEmissivity',
                'ThermalConductivity_wall1[Wm-1K-1]': prefix ? `${prefix}BuildingReadonlyThermalConductivityWall1` : 'buildingReadonlyThermalConductivityWall1',
                'ThermalConductivity_roof1[Wm-1K-1]': prefix ? `${prefix}BuildingReadonlyThermalConductivityRoof1` : 'buildingReadonlyThermalConductivityRoof1',
                'ThermalConductivity_floor1[Wm-1K-1]': prefix ? `${prefix}BuildingReadonlyThermalConductivityFloor1` : 'buildingReadonlyThermalConductivityFloor1',
                'SpecificHeat_wall1[Jkg-1K-1]': prefix ? `${prefix}BuildingReadonlySpecificHeatWall1` : 'buildingReadonlySpecificHeatWall1',
                'SpecificHeat_roof1[Jkg-1K-1]': prefix ? `${prefix}BuildingReadonlySpecificHeatRoof1` : 'buildingReadonlySpecificHeatRoof1',
                'SpecificHeat_floor1[Jkg-1K-1]': prefix ? `${prefix}BuildingReadonlySpecificHeatFloor1` : 'buildingReadonlySpecificHeatFloor1',
                'Density_wall1[kgm-3]': prefix ? `${prefix}BuildingReadonlyDensityWall1` : 'buildingReadonlyDensityWall1',
                'Density_roof1[kgm-3]': prefix ? `${prefix}BuildingReadonlyDensityRoof1` : 'buildingReadonlyDensityRoof1',
                'Density_floor1[kgm-3]': prefix ? `${prefix}BuildingReadonlyDensityFloor1` : 'buildingReadonlyDensityFloor1',
                'Thickness_wall1[m]': prefix ? `${prefix}BuildingReadonlyThicknessWall1` : 'buildingReadonlyThicknessWall1',
                'Thickness_roof1[m]': prefix ? `${prefix}BuildingReadonlyThicknessRoof1` : 'buildingReadonlyThicknessRoof1',
                'Thickness_floor1[m]': prefix ? `${prefix}BuildingReadonlyThicknessFloor1` : 'buildingReadonlyThicknessFloor1'
            };
            
            if (standardMappings[header]) {
                return standardMappings[header];
            }
            
            // Generate field ID from header for dynamic fields
            const cleanHeader = header.replace(/[^a-zA-Z0-9]/g, '');
            return prefix ? `${prefix}BuildingReadonly${cleanHeader}` : `buildingReadonly${cleanHeader}`;
        };
        
        // Show and populate fields for current headers
        headers.forEach(header => {
            const fieldId = getFieldId(header);
            if (!fieldId) return;
            
            let field = document.getElementById(fieldId);
            
            // If field doesn't exist, create it
            if (!field) {
                const fieldDiv = document.createElement('div');
                fieldDiv.className = 'property-group';
                
                const label = document.createElement('label');
                label.textContent = header;
                fieldDiv.appendChild(label);
                
                field = document.createElement('input');
                field.type = 'number';
                field.readOnly = true;
                field.id = fieldId;
                field.style.width = '100%';
                fieldDiv.appendChild(field);
                
                readonlyGroup.appendChild(fieldDiv);
            } else {
                // Show existing field
                const fieldDiv = field.closest('.property-group');
                if (fieldDiv) {
                    fieldDiv.style.display = 'flex';
                }
            }
            
            // Set value
            if (field && period[header] !== undefined && period[header] !== null && period[header] !== '') {
                field.value = period[header];
            } else {
                field.value = '';
            }
        });
    }
    
    /**
     * Get current building archetype period
     * @param {string} prefix - Prefix for element IDs
     * @returns {string|null} Current period index or null
     */
    getCurrentBuildingArchetypePeriod(prefix) {
        if (!this.currentShape || !this.currentShape.userData) {
            return null;
        }
        
        const key = prefix ? `${prefix}BuildingArchetypePeriod` : 'buildingArchetypePeriod';
        return this.currentShape.userData[key] !== undefined ? this.currentShape.userData[key] : null;
    }
    
    /**
     * Save building archetype period
     * @param {string} prefix - Prefix for element IDs
     * @param {string} periodIndex - Period index to save
     */
    saveBuildingArchetypePeriod(prefix, periodIndex) {
        if (!this.currentShape) {
            return;
        }
        
        if (!this.currentShape.userData) {
            this.currentShape.userData = {};
        }
        
        const key = prefix ? `${prefix}BuildingArchetypePeriod` : 'buildingArchetypePeriod';
        this.currentShape.userData[key] = periodIndex;
    }
    
    /**
     * Handle building group change
     */
    handleBuildingGroupChange(groupIndex, prefix) {
        this.saveBuildingGroup(prefix, groupIndex);
        
        // Populate periods dropdown for selected group
        this.populateBuildingGroupPeriodsDropdown(prefix, groupIndex);
        
        // Load readonly values for selected group and period
        const selectedPeriod = this.getCurrentBuildingGroupPeriod(prefix);
        if (selectedPeriod !== null && selectedPeriod !== undefined) {
            this.loadBuildingGroupPeriodReadonlyValues(prefix, groupIndex, selectedPeriod);
        }
    }
    
    /**
     * Populate building group periods dropdown
     * @param {string} prefix - Prefix for element IDs (empty string for regular popup, 'circle' or 'polygon' for prefixed)
     * @param {string} groupIndex - Index of selected group
     */
    populateBuildingGroupPeriodsDropdown(prefix, groupIndex) {
        const dropdownId = prefix ? `${prefix}BuildingGroupPeriod` : 'buildingGroupPeriod';
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown) {
            return;
        }
        
        // Clear existing options
        dropdown.innerHTML = '';
        
        // Ensure buildingGroups is loaded
        if (!this.uiManager.buildingGroups || this.uiManager.buildingGroups.length === 0) {
            // Load building groups data if not already loaded
            if (this.uiManager.loadBuildingGroupsData) {
                this.uiManager.loadBuildingGroupsData();
            }
        }
        
        // Get parsed groups from UIManager
        let groups = [];
        if (this.uiManager.buildingGroups && this.uiManager.buildingGroups.length > 0) {
            groups = this.uiManager.buildingGroups;
        } else {
            // Fallback: parse from CSV data
            const rawData = this.uiManager.surfaceTypesManager.getSurfaceTypes('buildingGroups');
            if (rawData && rawData.length > 0) {
                if (this.uiManager.parseBuildingGroups) {
                    groups = this.uiManager.parseBuildingGroups(rawData);
                    // Store parsed groups for future use
                    if (groups && groups.length > 0) {
                        this.uiManager.buildingGroups = groups;
                    }
                }
            }
        }
        
        const groupIndexNum = parseInt(groupIndex);
        if (!groups || !groups[groupIndexNum] || !groups[groupIndexNum].periods) {
            return;
        }
        
        const group = groups[groupIndexNum];
        const periods = group.periods || [];
        
        // Add options based on startPeriod and endPeriod
        periods.forEach((period, index) => {
            const option = document.createElement('option');
            const startPeriod = period.startPeriod || '';
            const endPeriod = period.endPeriod || '';
            option.value = index;
            option.textContent = `${startPeriod} - ${endPeriod}`;
            dropdown.appendChild(option);
        });
        
        // Set current value if exists
        const currentPeriod = this.getCurrentBuildingGroupPeriod(prefix);
        if (currentPeriod !== null && currentPeriod !== undefined && currentPeriod < periods.length) {
            dropdown.value = currentPeriod;
        } else if (periods.length > 0) {
            // Default to first period
            dropdown.value = '0';
            this.saveBuildingGroupPeriod(prefix, '0');
        }
        
        // Add event listener for changes
        if (!dropdown.hasAttribute('data-group-period-listener')) {
            dropdown.setAttribute('data-group-period-listener', 'true');
            dropdown.addEventListener('change', (e) => {
                this.handleBuildingGroupPeriodChange(prefix, groupIndex, e.target.value);
            });
        }
    }
    
    /**
     * Handle building group period change
     * @param {string} prefix - Prefix for element IDs
     * @param {string} groupIndex - Index of selected group
     * @param {string} periodIndex - Index of selected period
     */
    handleBuildingGroupPeriodChange(prefix, groupIndex, periodIndex) {
        this.saveBuildingGroupPeriod(prefix, periodIndex);
        this.loadBuildingGroupPeriodReadonlyValues(prefix, groupIndex, periodIndex);
    }
    
    /**
     * Load building group period readonly values
     * @param {string} prefix - Prefix for element IDs
     * @param {string} groupIndex - Index of selected group
     * @param {string} periodIndex - Index of selected period
     */
    loadBuildingGroupPeriodReadonlyValues(prefix, groupIndex, periodIndex) {
        // Ensure buildingGroups is loaded
        if (!this.uiManager.buildingGroups || this.uiManager.buildingGroups.length === 0) {
            // Load building groups data if not already loaded
            if (this.uiManager.loadBuildingGroupsData) {
                this.uiManager.loadBuildingGroupsData();
            }
        }
        
        // Get parsed groups from UIManager
        let groups = [];
        if (this.uiManager.buildingGroups && this.uiManager.buildingGroups.length > 0) {
            groups = this.uiManager.buildingGroups;
        } else {
            // Fallback: parse from CSV data
            const rawData = this.uiManager.surfaceTypesManager.getSurfaceTypes('buildingGroups');
            if (rawData && rawData.length > 0) {
                if (this.uiManager.parseBuildingGroups) {
                    groups = this.uiManager.parseBuildingGroups(rawData);
                    // Store parsed groups for future use
                    if (groups && groups.length > 0) {
                        this.uiManager.buildingGroups = groups;
                    }
                }
            }
        }
        
        const groupIndexNum = parseInt(groupIndex);
        const periodIndexNum = parseInt(periodIndex);
        
        if (!groups || !groups[groupIndexNum] || !groups[groupIndexNum].periods) {
            return;
        }
        
        const group = groups[groupIndexNum];
        const periods = group.periods || [];
        
        if (!periods[periodIndexNum]) {
            return;
        }
        
        const period = periods[periodIndexNum];
        
        // Get layer counts
        const wallLayers = group.number_of_wall_layers || 1;
        const roofLayers = group.number_of_roof_layers || 1;
        const floorLayers = group.number_of_floor_layers || 1;
        
        // Generate headers based on layer counts
        const headers = this.uiManager.generateArchetypeHeaders(wallLayers, roofLayers, floorLayers);
        
        // Set readonly values dynamically based on headers
        this.setBuildingArchetypePeriodReadonlyValues(prefix, period, headers);
    }
    
    /**
     * Get current building group period
     * @param {string} prefix - Prefix for element IDs
     * @returns {string|null} Current period index or null
     */
    getCurrentBuildingGroupPeriod(prefix) {
        if (!this.currentShape || !this.currentShape.userData) {
            return null;
        }
        
        const key = prefix ? `${prefix}BuildingGroupPeriod` : 'buildingGroupPeriod';
        return this.currentShape.userData[key] !== undefined ? this.currentShape.userData[key] : null;
    }
    
    /**
     * Save building group period
     * @param {string} prefix - Prefix for element IDs
     * @param {string} periodIndex - Period index to save
     */
    saveBuildingGroupPeriod(prefix, periodIndex) {
        if (!this.currentShape) {
            return;
        }
        
        if (!this.currentShape.userData) {
            this.currentShape.userData = {};
        }
        
        const key = prefix ? `${prefix}BuildingGroupPeriod` : 'buildingGroupPeriod';
        this.currentShape.userData[key] = periodIndex;
    }
    
    /**
     * Load building archytype readonly values
     */
    loadBuildingArchytypeReadonlyValues(prefix, archytypeIndex) {
        if (!this.uiManager.surfaceTypesManager) {
            return;
        }
        
        const archytypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('buildingArchyTypes');
        if (!archytypes || !archytypes[archytypeIndex]) {
            return;
        }
        
        const archytype = archytypes[archytypeIndex];
        this.setBuildingEnvelopeReadonlyValues(prefix, archytype);
    }
    
    /**
     * Load building group readonly values
     */
    loadBuildingGroupReadonlyValues(prefix, groupIndex) {
        if (!this.uiManager.surfaceTypesManager) {
            return;
        }
        
        const groups = this.uiManager.surfaceTypesManager.getSurfaceTypes('buildingGroups');
        if (!groups || !groups[groupIndex]) {
            return;
        }
        
        const group = groups[groupIndex];
        this.setBuildingEnvelopeReadonlyValues(prefix, group);
    }
    
    /**
     * Set building envelope readonly values
     */
    setBuildingEnvelopeReadonlyValues(prefix, data) {
        const fieldIds = {
            startPeriod: prefix ? `${prefix}BuildingReadonlyStartPeriod` : 'buildingReadonlyStartPeriod',
            endPeriod: prefix ? `${prefix}BuildingReadonlyEndPeriod` : 'buildingReadonlyEndPeriod',
            'Uvalue_window(W/m2/K)': prefix ? `${prefix}BuildingReadonlyUvalueWindow` : 'buildingReadonlyUvalueWindow',
            'windowSHGC(-)': prefix ? `${prefix}BuildingReadonlyWindowSHGC` : 'buildingReadonlyWindowSHGC',
            'windowEmissivity(-)': prefix ? `${prefix}BuildingReadonlyWindowEmissivity` : 'buildingReadonlyWindowEmissivity',
            'ThermalConductivity_wall1[Wm-1K-1]': prefix ? `${prefix}BuildingReadonlyThermalConductivityWall1` : 'buildingReadonlyThermalConductivityWall1',
            'ThermalConductivity_roof1[Wm-1K-1]': prefix ? `${prefix}BuildingReadonlyThermalConductivityRoof1` : 'buildingReadonlyThermalConductivityRoof1',
            'ThermalConductivity_floor1[Wm-1K-1]': prefix ? `${prefix}BuildingReadonlyThermalConductivityFloor1` : 'buildingReadonlyThermalConductivityFloor1',
            'SpecificHeat_wall1[Jkg-1K-1]': prefix ? `${prefix}BuildingReadonlySpecificHeatWall1` : 'buildingReadonlySpecificHeatWall1',
            'SpecificHeat_roof1[Jkg-1K-1]': prefix ? `${prefix}BuildingReadonlySpecificHeatRoof1` : 'buildingReadonlySpecificHeatRoof1',
            'SpecificHeat_floor1[Jkg-1K-1]': prefix ? `${prefix}BuildingReadonlySpecificHeatFloor1` : 'buildingReadonlySpecificHeatFloor1',
            'Density_wall1[kgm-3]': prefix ? `${prefix}BuildingReadonlyDensityWall1` : 'buildingReadonlyDensityWall1',
            'Density_roof1[kgm-3]': prefix ? `${prefix}BuildingReadonlyDensityRoof1` : 'buildingReadonlyDensityRoof1',
            'Density_floor1[kgm-3]': prefix ? `${prefix}BuildingReadonlyDensityFloor1` : 'buildingReadonlyDensityFloor1',
            'Thickness_wall1[m]': prefix ? `${prefix}BuildingReadonlyThicknessWall1` : 'buildingReadonlyThicknessWall1',
            'Thickness_roof1[m]': prefix ? `${prefix}BuildingReadonlyThicknessRoof1` : 'buildingReadonlyThicknessRoof1',
            'Thickness_floor1[m]': prefix ? `${prefix}BuildingReadonlyThicknessFloor1` : 'buildingReadonlyThicknessFloor1',
            'wallAlbedo(-)': prefix ? `${prefix}BuildingReadonlyWallAlbedo` : 'buildingReadonlyWallAlbedo',
            'roofAlbedo(-)': prefix ? `${prefix}BuildingReadonlyRoofAlbedo` : 'buildingReadonlyRoofAlbedo',
            'floorAlbedo(-)': prefix ? `${prefix}BuildingReadonlyFloorAlbedo` : 'buildingReadonlyFloorAlbedo',
            'wallEmissivity(-)': prefix ? `${prefix}BuildingReadonlyWallEmissivity` : 'buildingReadonlyWallEmissivity',
            'roofEmissivity(-)': prefix ? `${prefix}BuildingReadonlyRoofEmissivity` : 'buildingReadonlyRoofEmissivity',
            'floorEmissivity(-)': prefix ? `${prefix}BuildingReadonlyFloorEmissivity` : 'buildingReadonlyFloorEmissivity'
        };
        
        Object.keys(fieldIds).forEach(key => {
            const field = document.getElementById(fieldIds[key]);
            if (field && data[key] !== undefined) {
                field.value = data[key];
            }
        });
    }
    
    /**
     * Load building custom spec values
     */
    loadBuildingCustomSpecValues(prefix) {
        if (!this.currentShape) {
            return;
        }
        if (!this.currentShape.userData) {
            this.currentShape.userData = {};
        }
        
        let customValues = this.currentShape.userData.buildingCustomSpec || {};
        
        // Get layer counts
        const wallLayersInput = document.getElementById(prefix ? `${prefix}BuildingCustomWallLayers` : 'buildingCustomWallLayers');
        const roofLayersInput = document.getElementById(prefix ? `${prefix}BuildingCustomRoofLayers` : 'buildingCustomRoofLayers');
        const floorLayersInput = document.getElementById(prefix ? `${prefix}BuildingCustomFloorLayers` : 'buildingCustomFloorLayers');
        
        const wallLayers = parseInt(wallLayersInput?.value || customValues.number_of_wall_layers || 1);
        const roofLayers = parseInt(roofLayersInput?.value || customValues.number_of_roof_layers || 1);
        const floorLayers = parseInt(floorLayersInput?.value || customValues.number_of_floor_layers || 1);
        
        // Set layer counts
        if (wallLayersInput) {
            wallLayersInput.value = wallLayers;
        }
        if (roofLayersInput) {
            roofLayersInput.value = roofLayers;
        }
        if (floorLayersInput) {
            floorLayersInput.value = floorLayers;
        }
        
        // If customValues is empty or missing required fields, initialize with default values
        const hasValues = Object.keys(customValues).length > 0 && 
                         customValues['Uvalue_window(W/m2/K)'] !== undefined;
        
        if (!hasValues) {
            // Initialize with default values
            customValues = this.getDefaultCustomSpecValues(wallLayers, roofLayers, floorLayers);
            // Save default values to userData
            this.currentShape.userData.buildingCustomSpec = customValues;
        } else {
            // Ensure startPeriod and endPeriod are NA
            customValues.startPeriod = 'NA';
            customValues.endPeriod = 'NA';
        }
        
        // Set Start Period and End Period to NA and readonly (always for custom spec)
        const startPeriodField = document.getElementById(prefix ? `${prefix}BuildingCustomStartPeriod` : 'buildingCustomStartPeriod');
        const endPeriodField = document.getElementById(prefix ? `${prefix}BuildingCustomEndPeriod` : 'buildingCustomEndPeriod');
        if (startPeriodField) {
            startPeriodField.value = 'NA';
            startPeriodField.readOnly = true;
        }
        if (endPeriodField) {
            endPeriodField.value = 'NA';
            endPeriodField.readOnly = true;
        }
        
        // Load basic fields
        const fieldIds = {
            'Uvalue_window(W/m2/K)': prefix ? `${prefix}BuildingCustomUvalueWindow` : 'buildingCustomUvalueWindow',
            'windowSHGC(-)': prefix ? `${prefix}BuildingCustomWindowSHGC` : 'buildingCustomWindowSHGC',
            'windowEmissivity(-)': prefix ? `${prefix}BuildingCustomWindowEmissivity` : 'buildingCustomWindowEmissivity',
            'wallAlbedo(-)': prefix ? `${prefix}BuildingCustomWallAlbedo` : 'buildingCustomWallAlbedo',
            'roofAlbedo(-)': prefix ? `${prefix}BuildingCustomRoofAlbedo` : 'buildingCustomRoofAlbedo',
            'floorAlbedo(-)': prefix ? `${prefix}BuildingCustomFloorAlbedo` : 'buildingCustomFloorAlbedo',
            'wallEmissivity(-)': prefix ? `${prefix}BuildingCustomWallEmissivity` : 'buildingCustomWallEmissivity',
            'roofEmissivity(-)': prefix ? `${prefix}BuildingCustomRoofEmissivity` : 'buildingCustomRoofEmissivity',
            'floorEmissivity(-)': prefix ? `${prefix}BuildingCustomFloorEmissivity` : 'buildingCustomFloorEmissivity'
        };
        
        Object.keys(fieldIds).forEach(key => {
            const field = document.getElementById(fieldIds[key]);
            if (field && customValues[key] !== undefined) {
                field.value = customValues[key];
            }
        });
        
        // Rebuild layer fields after loading layer counts (this will also load values)
        this.rebuildCustomSpecLayerFields(prefix);
    }
    
    /**
     * Get default custom spec values
     * @param {number} wallLayers - Number of wall layers
     * @param {number} roofLayers - Number of roof layers
     * @param {number} floorLayers - Number of floor layers
     * @returns {Object} Default values object
     */
    getDefaultCustomSpecValues(wallLayers = 1, roofLayers = 1, floorLayers = 1) {
        const defaultValues = {
            startPeriod: 'NA',
            endPeriod: 'NA',
            'Uvalue_window(W/m2/K)': 3.12,
            'windowSHGC(-)': 0.8,
            'windowEmissivity(-)': 0.84,
            'ThermalConductivity_wall1[Wm-1K-1]': 0.8,
            'ThermalConductivity_roof1[Wm-1K-1]': 0.8,
            'ThermalConductivity_floor1[Wm-1K-1]': 0.8,
            'SpecificHeat_wall1[Jkg-1K-1]': 800,
            'SpecificHeat_roof1[Jkg-1K-1]': 800,
            'SpecificHeat_floor1[Jkg-1K-1]': 800,
            'Density_wall1[kgm-3]': 2000,
            'Density_roof1[kgm-3]': 2000,
            'Density_floor1[kgm-3]': 2000,
            'Thickness_wall1[m]': 0.2,
            'Thickness_roof1[m]': 0.2,
            'Thickness_floor1[m]': 0.2,
            'wallAlbedo(-)': 0.3,
            'roofAlbedo(-)': 0.1,
            'floorAlbedo(-)': 0.7,
            'wallEmissivity(-)': 0.8,
            'roofEmissivity(-)': 0.8,
            'floorEmissivity(-)': 0.8,
            number_of_wall_layers: wallLayers,
            number_of_roof_layers: roofLayers,
            number_of_floor_layers: floorLayers
        };
        
        // Copy layer 1 values to additional layers if layer count > 1
        const layerTypes = [
            { name: 'wall', count: wallLayers },
            { name: 'roof', count: roofLayers },
            { name: 'floor', count: floorLayers }
        ];
        
        const properties = ['ThermalConductivity', 'SpecificHeat', 'Density', 'Thickness'];
        const units = {
            'ThermalConductivity': '[Wm-1K-1]',
            'SpecificHeat': '[Jkg-1K-1]',
            'Density': '[kgm-3]',
            'Thickness': '[m]'
        };
        
        layerTypes.forEach(layerType => {
            if (layerType.count > 1) {
                for (let layerNum = 2; layerNum <= layerType.count; layerNum++) {
                    properties.forEach(prop => {
                        const key = `${prop}_${layerType.name}${layerNum}${units[prop]}`;
                        const layer1Key = `${prop}_${layerType.name}1${units[prop]}`;
                        defaultValues[key] = defaultValues[layer1Key];
                    });
                }
            }
        });
        
        return defaultValues;
    }
    
    /**
     * Get current building archytype
     */
    getCurrentBuildingArchytype(prefix) {
        if (!this.currentShape || !this.currentShape.userData) {
            return null;
        }
        return this.currentShape.userData.buildingArchytype || null;
    }
    
    /**
     * Save building archytype
     */
    saveBuildingArchytype(prefix, archytypeIndex) {
        if (!this.currentShape) {
            return;
        }
        if (!this.currentShape.userData) {
            this.currentShape.userData = {};
        }
        this.currentShape.userData.buildingArchytype = archytypeIndex;
    }
    
    /**
     * Get current building group
     */
    getCurrentBuildingGroup(prefix) {
        if (!this.currentShape || !this.currentShape.userData) {
            return null;
        }
        return this.currentShape.userData.buildingGroup || null;
    }
    
    /**
     * Save building group
     */
    saveBuildingGroup(prefix, groupIndex) {
        if (!this.currentShape) {
            return;
        }
        if (!this.currentShape.userData) {
            this.currentShape.userData = {};
        }
        this.currentShape.userData.buildingGroup = groupIndex;
    }
    
    /**
     * Setup event listeners for tree vegetation type dropdowns
     */
    setupTreeVegetationTypeListeners() {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            // Listen for vegetation type changes in all popups
            const vegetationTypeSelects = [
                { select: 'treeVegetationType', prefix: '' },
                { select: 'treeTreeVegetationType', prefix: 'tree' },
                { select: 'circleTreeVegetationType', prefix: 'circle' },
                { select: 'polygonTreeVegetationType', prefix: 'polygon' },
                { select: 'stlTreeVegetationType', prefix: 'stl' }
            ];
            
            vegetationTypeSelects.forEach(({ select, prefix }) => {
                const selectElement = document.getElementById(select);
                if (selectElement && !selectElement.hasAttribute('data-tree-listener')) {
                    selectElement.setAttribute('data-tree-listener', 'true');
                    selectElement.addEventListener('change', (e) => {
                        this.handleTreeVegetationTypeChange(e.target.value, prefix);
                    });
                }
            });
            
            // Listen for customize field changes
            const customizeFields = [
                { prefix: '', fields: ['treeRootFractionLayer1', 'treeRootFractionLayer2', 'treeRootFractionLayer3', 'treeRootFractionLayer4', 'treeMinCanopyRes', 'treeLeafAreaIndex', 'treeTallVegCorrFac', 'treeMomentumRoughLength', 'treeHeatRoughLength', 'treeThermalCondStable', 'treeThermalCondUnstable', 'treeAlbedo', 'treeEmissivity', 'treeDensity', 'treeHeatCapacity'] },
                { prefix: 'tree', fields: ['treeTreeRootFractionLayer1', 'treeTreeRootFractionLayer2', 'treeTreeRootFractionLayer3', 'treeTreeRootFractionLayer4', 'treeTreeMinCanopyRes', 'treeTreeLeafAreaIndex', 'treeTreeTallVegCorrFac', 'treeTreeMomentumRoughLength', 'treeTreeHeatRoughLength', 'treeTreeThermalCondStable', 'treeTreeThermalCondUnstable', 'treeTreeAlbedo', 'treeTreeEmissivity', 'treeTreeDensity', 'treeTreeHeatCapacity'] },
                { prefix: 'circle', fields: ['circleTreeRootFractionLayer1', 'circleTreeRootFractionLayer2', 'circleTreeRootFractionLayer3', 'circleTreeRootFractionLayer4', 'circleTreeMinCanopyRes', 'circleTreeLeafAreaIndex', 'circleTreeTallVegCorrFac', 'circleTreeMomentumRoughLength', 'circleTreeHeatRoughLength', 'circleTreeThermalCondStable', 'circleTreeThermalCondUnstable', 'circleTreeAlbedo', 'circleTreeEmissivity', 'circleTreeDensity', 'circleTreeHeatCapacity'] },
                { prefix: 'polygon', fields: ['polygonTreeRootFractionLayer1', 'polygonTreeRootFractionLayer2', 'polygonTreeRootFractionLayer3', 'polygonTreeRootFractionLayer4', 'polygonTreeMinCanopyRes', 'polygonTreeLeafAreaIndex', 'polygonTreeTallVegCorrFac', 'polygonTreeMomentumRoughLength', 'polygonTreeHeatRoughLength', 'polygonTreeThermalCondStable', 'polygonTreeThermalCondUnstable', 'polygonTreeAlbedo', 'polygonTreeEmissivity', 'polygonTreeDensity', 'polygonTreeHeatCapacity'] },
                { prefix: 'stl', fields: ['stlTreeRootFractionLayer1', 'stlTreeRootFractionLayer2', 'stlTreeRootFractionLayer3', 'stlTreeRootFractionLayer4', 'stlTreeMinCanopyRes', 'stlTreeLeafAreaIndex', 'stlTreeTallVegCorrFac', 'stlTreeMomentumRoughLength', 'stlTreeHeatRoughLength', 'stlTreeThermalCondStable', 'stlTreeThermalCondUnstable', 'stlTreeAlbedo', 'stlTreeEmissivity', 'stlTreeDensity', 'stlTreeHeatCapacity'] }
            ];
            
            customizeFields.forEach(({ prefix, fields }) => {
                fields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field && !field.hasAttribute('data-tree-listener')) {
                        field.setAttribute('data-tree-listener', 'true');
                        field.addEventListener('input', () => {
                            this.saveTreeCustomizeValues(prefix);
                        });
                    }
                });
            });
        }, 100);
    }
    
    /**
     * Handle tree vegetation type change - show/hide customize fields
     */
    handleTreeVegetationTypeChange(vegetationType, prefix) {
        const customizeGroup = document.getElementById(prefix === 'tree' ? 'treeTreeCustomizeGroup' : (prefix ? `${prefix}TreeCustomizeGroup` : 'treeCustomizeGroup'));
        const readonlyGroup = document.getElementById(prefix === 'tree' ? 'treeTreeReadonlyValuesGroup' : (prefix ? `${prefix}TreeReadonlyValuesGroup` : 'treeReadonlyValuesGroup'));
        
        if (vegetationType === 'customize') {
            if (customizeGroup) {
                customizeGroup.style.display = 'block';
                this.loadTreeCustomizeValues(prefix);
            }
            if (readonlyGroup) {
                readonlyGroup.style.display = 'none';
            }
        } else {
            if (customizeGroup) {
                customizeGroup.style.display = 'none';
            }
            if (readonlyGroup) {
                readonlyGroup.style.display = 'block';
            }
            // Load values from selected vegetation type
            this.loadTreeVegetationTypeValues(prefix, vegetationType);
            // Load readonly values for all popups (main, circle, polygon, tree, stl)
            this.loadTreeVegetationTypeReadonlyValues(prefix, vegetationType);
        }
        
        // Save the selected vegetation type
        this.saveTreeVegetationType(prefix, vegetationType);
    }
    
    /**
     * Populate tree vegetation type dropdown with specific options from SurfaceTypesManager
     * Only includes vegetation types suitable for trees
     */
    populateTreeVegetationTypeDropdown(prefix) {
        const dropdownId = prefix === 'tree' ? 'treeTreeVegetationType' : (prefix ? `${prefix}TreeVegetationType` : 'treeVegetationType');
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown) {
            console.warn(`Tree vegetation type dropdown not found: ${dropdownId}`);
            return;
        }
        
        if (!this.uiManager.surfaceTypesManager) {
            console.warn('SurfaceTypesManager not available');
            return;
        }
        
        // Clear existing options
        dropdown.innerHTML = '';
        
        // Get tree types from SurfaceTypesManager
        const treeTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('treeTypes');
        
        if (!treeTypes || treeTypes.length === 0) {
            console.warn('No tree types found in SurfaceTypesManager');
            return;
        }
        
        // Add default option (tree_default)
        const defaultOption = document.createElement('option');
        defaultOption.value = 'tree_default';
        defaultOption.textContent = 'Tree Default';
        dropdown.appendChild(defaultOption);
        
        // Add all tree types (excluding tree_default which is already added)
        treeTypes.forEach(vt => {
            // Get vegetation type name (handle different possible field names)
            const vtName = vt.vegetationType || vt['vegetationType'] || Object.values(vt)[0];
            // Remove prefixes if present (gra:, gro:, tree:)
            const cleanName = vtName.replace(/^(gra|gro|tree):/, '');
            
            // Skip if it's the default
            if (cleanName === 'tree_default' || vtName === 'tree_default') {
                return;
            }
            
                const option = document.createElement('option');
            option.value = cleanName;
                // Format name for display (replace underscores with spaces and capitalize)
            option.textContent = cleanName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                dropdown.appendChild(option);
        });
        
        // Add customize option at the end
        const customizeOption = document.createElement('option');
        customizeOption.value = 'customize';
        customizeOption.textContent = 'Customize';
        dropdown.appendChild(customizeOption);
        
        // Set default value
        const currentVegetationType = this.getCurrentTreeVegetationType(prefix);
        if (currentVegetationType) {
            dropdown.value = currentVegetationType;
        } else {
            dropdown.value = 'tree_default';
        }
    }
    
    /**
     * Load values from selected tree vegetation type
     */
    loadTreeVegetationTypeValues(prefix, vegetationType = null) {
        if (!this.uiManager.surfaceTypesManager) {
            return;
        }
        
        const dropdownId = prefix === 'tree' ? 'treeTreeVegetationType' : (prefix ? `${prefix}TreeVegetationType` : 'treeVegetationType');
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown) {
            return;
        }
        
        const selectedVegetationType = vegetationType || dropdown.value;
        
        if (selectedVegetationType === 'customize' || selectedVegetationType === 'tree_default') {
            // Load default values (tree_default)
            const defaultValues = this.getDefaultTreeVegetationTypeValues();
            this.setTreeCustomizeFieldValues(prefix, defaultValues);
            return;
        }
        
        // Get tree types from SurfaceTypesManager
        const treeTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('treeTypes');
        // Also check vegetationTypes for backward compatibility
        const vegetationTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('vegetationTypes');
        const allTypes = [...treeTypes, ...vegetationTypes];
        const selectedType = allTypes.find(vt => {
            const typeName = vt.vegetationType || Object.values(vt)[0];
            const cleanName = typeName.replace(/^(gra|gro|tree):/, '');
            return cleanName === selectedVegetationType || typeName === selectedVegetationType;
        });
        
        if (selectedType) {
            const values = {
                root_fraction_layer_1: selectedType.root_fraction_layer_1 || 0.26,
                root_fraction_layer_2: selectedType.root_fraction_layer_2 || 0.39,
                root_fraction_layer_3: selectedType.root_fraction_layer_3 || 0.29,
                root_fraction_layer_4: selectedType.root_fraction_layer_4 || 0.06,
                minCanopyRes: selectedType.minCanopyRes || 500,
                leafAreaIndex: selectedType.leafAreaIndex || 5,
                tallVegCorrFac: selectedType.tallVegCorrFac || 0.03,
                momentumRoughLength: selectedType.momentumRoughLength || 2,
                heatRoughLength: selectedType.heatRoughLength || 2,
                thermalCondStable: selectedType.thermalCondStable || 20,
                thermalCondUnstable: selectedType.thermalCondUnstable || 15,
                albedo: selectedType.albedo || 0.12,
                emissivity: selectedType.emissivity || 0.97,
                density: selectedType.density || 1200,
                heatCapacity: selectedType.heatCapacity || 2000
            };
            this.setTreeCustomizeFieldValues(prefix, values);
        }
    }
    
    /**
     * Load readonly values from selected tree vegetation type
     */
    loadTreeVegetationTypeReadonlyValues(prefix, vegetationType = null) {
        if (!this.uiManager.surfaceTypesManager) {
            return;
        }
        
        const dropdownId = prefix === 'tree' ? 'treeTreeVegetationType' : (prefix ? `${prefix}TreeVegetationType` : 'treeVegetationType');
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown) {
            return;
        }
        
        const selectedVegetationType = vegetationType || dropdown.value;
        
        if (selectedVegetationType === 'customize') {
            return;
        }
        
        // Get tree types from SurfaceTypesManager
        const treeTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('treeTypes');
        // Also check vegetationTypes for backward compatibility
        const vegetationTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('vegetationTypes');
        const allTypes = [...treeTypes, ...vegetationTypes];
        // Try to find with exact match first, then try with prefix (gra:, tree:, gro:)
        let selectedType = allTypes.find(vt => {
            const typeName = vt.vegetationType || Object.values(vt)[0];
            const cleanName = typeName.replace(/^(gra|gro|tree):/, '');
            return cleanName === selectedVegetationType || typeName === selectedVegetationType;
        });
        
        // If not found, try with prefix
        if (!selectedType) {
            const prefixMap = {
                'grass_default': 'gra: grass_default',
                'tree_default': 'tree: tree_default',
                'ground_default': 'gro: ground_default'
            };
            const prefixedType = prefixMap[selectedVegetationType] || selectedVegetationType;
            selectedType = allTypes.find(vt => {
                const typeName = vt.vegetationType || Object.values(vt)[0];
                return typeName === prefixedType || typeName.endsWith(selectedVegetationType);
            });
        }
        
        if (selectedType) {
            const readonlyFieldIds = {
                root_fraction_layer_1: prefix === 'tree' ? 'treeTreeReadonlyRootFractionLayer1' : (prefix ? `${prefix}TreeReadonlyRootFractionLayer1` : 'treeReadonlyRootFractionLayer1'),
                root_fraction_layer_2: prefix === 'tree' ? 'treeTreeReadonlyRootFractionLayer2' : (prefix ? `${prefix}TreeReadonlyRootFractionLayer2` : 'treeReadonlyRootFractionLayer2'),
                root_fraction_layer_3: prefix === 'tree' ? 'treeTreeReadonlyRootFractionLayer3' : (prefix ? `${prefix}TreeReadonlyRootFractionLayer3` : 'treeReadonlyRootFractionLayer3'),
                root_fraction_layer_4: prefix === 'tree' ? 'treeTreeReadonlyRootFractionLayer4' : (prefix ? `${prefix}TreeReadonlyRootFractionLayer4` : 'treeReadonlyRootFractionLayer4'),
                minCanopyRes: prefix === 'tree' ? 'treeTreeReadonlyMinCanopyRes' : (prefix ? `${prefix}TreeReadonlyMinCanopyRes` : 'treeReadonlyMinCanopyRes'),
                leafAreaIndex: prefix === 'tree' ? 'treeTreeReadonlyLeafAreaIndex' : (prefix ? `${prefix}TreeReadonlyLeafAreaIndex` : 'treeReadonlyLeafAreaIndex'),
                tallVegCorrFac: prefix === 'tree' ? 'treeTreeReadonlyTallVegCorrFac' : (prefix ? `${prefix}TreeReadonlyTallVegCorrFac` : 'treeReadonlyTallVegCorrFac'),
                momentumRoughLength: prefix === 'tree' ? 'treeTreeReadonlyMomentumRoughLength' : (prefix ? `${prefix}TreeReadonlyMomentumRoughLength` : 'treeReadonlyMomentumRoughLength'),
                heatRoughLength: prefix === 'tree' ? 'treeTreeReadonlyHeatRoughLength' : (prefix ? `${prefix}TreeReadonlyHeatRoughLength` : 'treeReadonlyHeatRoughLength'),
                thermalCondStable: prefix === 'tree' ? 'treeTreeReadonlyThermalCondStable' : (prefix ? `${prefix}TreeReadonlyThermalCondStable` : 'treeReadonlyThermalCondStable'),
                thermalCondUnstable: prefix === 'tree' ? 'treeTreeReadonlyThermalCondUnstable' : (prefix ? `${prefix}TreeReadonlyThermalCondUnstable` : 'treeReadonlyThermalCondUnstable'),
                albedo: prefix === 'tree' ? 'treeTreeReadonlyAlbedo' : (prefix ? `${prefix}TreeReadonlyAlbedo` : 'treeReadonlyAlbedo'),
                emissivity: prefix === 'tree' ? 'treeTreeReadonlyEmissivity' : (prefix ? `${prefix}TreeReadonlyEmissivity` : 'treeReadonlyEmissivity'),
                density: prefix === 'tree' ? 'treeTreeReadonlyDensity' : (prefix ? `${prefix}TreeReadonlyDensity` : 'treeReadonlyDensity'),
                heatCapacity: prefix === 'tree' ? 'treeTreeReadonlyHeatCapacity' : (prefix ? `${prefix}TreeReadonlyHeatCapacity` : 'treeReadonlyHeatCapacity')
            };
            
            Object.keys(readonlyFieldIds).forEach(key => {
                const field = document.getElementById(readonlyFieldIds[key]);
                if (field && selectedType[key] !== undefined) {
                    field.value = selectedType[key];
                }
            });
        }
    }
    
    /**
     * Get default tree vegetation type values (tree_default)
     */
    getDefaultTreeVegetationTypeValues() {
        return {
            root_fraction_layer_1: 0.26,
            root_fraction_layer_2: 0.39,
            root_fraction_layer_3: 0.29,
            root_fraction_layer_4: 0.06,
            minCanopyRes: 500,
            leafAreaIndex: 5,
            tallVegCorrFac: 0.03,
            momentumRoughLength: 2,
            heatRoughLength: 2,
            thermalCondStable: 20,
            thermalCondUnstable: 15,
            albedo: 0.12,
            emissivity: 0.97,
            density: 1200,
            heatCapacity: 2000
        };
    }
    
    /**
     * Save tree vegetation type to shape userData
     */
    saveTreeVegetationType(prefix, vegetationType) {
        if (!this.currentShape || !this.currentShape.userData) {
            return;
        }
        
        // Ensure userData exists
        if (!this.currentShape.userData) {
            this.currentShape.userData = {};
        }
        this.currentShape.userData.treeVegetationType = vegetationType;
        
        // Ensure no period properties for tree
        delete this.currentShape.userData.startPeriod;
        delete this.currentShape.userData.endPeriod;
        delete this.currentShape.userData.buildingArchetypePeriod;
        delete this.currentShape.userData.buildingGroupPeriod;
        
        // If not customize, also save the values from the vegetation type
        if (vegetationType !== 'customize') {
            this.loadTreeVegetationTypeValues(prefix, vegetationType);
            const values = this.getTreeCustomizeFieldValues(prefix);
            this.currentShape.userData.treeCustomizeValues = values;
        }
    }
    
    /**
     * Save tree customize values to shape userData
     */
    saveTreeCustomizeValues(prefix) {
        if (!this.currentShape || !this.currentShape.userData) {
            return;
        }
        
        const values = this.getTreeCustomizeFieldValues(prefix);
        this.currentShape.userData.treeCustomizeValues = values;
    }
    
    /**
     * Load tree customize values from shape userData
     */
    loadTreeCustomizeValues(prefix) {
        if (!this.currentShape || !this.currentShape.userData || !this.currentShape.userData.treeCustomizeValues) {
            const defaultValues = this.getDefaultTreeVegetationTypeValues();
            this.setTreeCustomizeFieldValues(prefix, defaultValues);
            return;
        }
        
        const values = this.currentShape.userData.treeCustomizeValues;
        this.setTreeCustomizeFieldValues(prefix, values);
    }
    
    /**
     * Get current tree vegetation type from shape userData
     */
    getCurrentTreeVegetationType(prefix) {
        if (!this.currentShape || !this.currentShape.userData) {
            return 'tree_default';
        }
        
        return this.currentShape.userData.treeVegetationType || 'tree_default';
    }
    
    /**
     * Set tree customize field values
     */
    setTreeCustomizeFieldValues(prefix, values) {
        const fieldIds = {
            root_fraction_layer_1: prefix === 'tree' ? 'treeTreeRootFractionLayer1' : (prefix ? `${prefix}TreeRootFractionLayer1` : 'treeRootFractionLayer1'),
            root_fraction_layer_2: prefix === 'tree' ? 'treeTreeRootFractionLayer2' : (prefix ? `${prefix}TreeRootFractionLayer2` : 'treeRootFractionLayer2'),
            root_fraction_layer_3: prefix === 'tree' ? 'treeTreeRootFractionLayer3' : (prefix ? `${prefix}TreeRootFractionLayer3` : 'treeRootFractionLayer3'),
            root_fraction_layer_4: prefix === 'tree' ? 'treeTreeRootFractionLayer4' : (prefix ? `${prefix}TreeRootFractionLayer4` : 'treeRootFractionLayer4'),
            minCanopyRes: prefix === 'tree' ? 'treeTreeMinCanopyRes' : (prefix ? `${prefix}TreeMinCanopyRes` : 'treeMinCanopyRes'),
            leafAreaIndex: prefix === 'tree' ? 'treeTreeLeafAreaIndex' : (prefix ? `${prefix}TreeLeafAreaIndex` : 'treeLeafAreaIndex'),
            tallVegCorrFac: prefix === 'tree' ? 'treeTreeTallVegCorrFac' : (prefix ? `${prefix}TreeTallVegCorrFac` : 'treeTallVegCorrFac'),
            momentumRoughLength: prefix === 'tree' ? 'treeTreeMomentumRoughLength' : (prefix ? `${prefix}TreeMomentumRoughLength` : 'treeMomentumRoughLength'),
            heatRoughLength: prefix === 'tree' ? 'treeTreeHeatRoughLength' : (prefix ? `${prefix}TreeHeatRoughLength` : 'treeHeatRoughLength'),
            thermalCondStable: prefix === 'tree' ? 'treeTreeThermalCondStable' : (prefix ? `${prefix}TreeThermalCondStable` : 'treeThermalCondStable'),
            thermalCondUnstable: prefix === 'tree' ? 'treeTreeThermalCondUnstable' : (prefix ? `${prefix}TreeThermalCondUnstable` : 'treeThermalCondUnstable'),
            albedo: prefix === 'tree' ? 'treeTreeAlbedo' : (prefix ? `${prefix}TreeAlbedo` : 'treeAlbedo'),
            emissivity: prefix === 'tree' ? 'treeTreeEmissivity' : (prefix ? `${prefix}TreeEmissivity` : 'treeEmissivity'),
            density: prefix === 'tree' ? 'treeTreeDensity' : (prefix ? `${prefix}TreeDensity` : 'treeDensity'),
            heatCapacity: prefix === 'tree' ? 'treeTreeHeatCapacity' : (prefix ? `${prefix}TreeHeatCapacity` : 'treeHeatCapacity')
        };
        
        Object.keys(fieldIds).forEach(key => {
            const field = document.getElementById(fieldIds[key]);
            if (field && values[key] !== undefined) {
                field.value = values[key];
            }
        });
    }
    
    /**
     * Get tree customize field values
     */
    getTreeCustomizeFieldValues(prefix) {
        const fieldIds = {
            root_fraction_layer_1: prefix === 'tree' ? 'treeTreeRootFractionLayer1' : (prefix ? `${prefix}TreeRootFractionLayer1` : 'treeRootFractionLayer1'),
            root_fraction_layer_2: prefix === 'tree' ? 'treeTreeRootFractionLayer2' : (prefix ? `${prefix}TreeRootFractionLayer2` : 'treeRootFractionLayer2'),
            root_fraction_layer_3: prefix === 'tree' ? 'treeTreeRootFractionLayer3' : (prefix ? `${prefix}TreeRootFractionLayer3` : 'treeRootFractionLayer3'),
            root_fraction_layer_4: prefix === 'tree' ? 'treeTreeRootFractionLayer4' : (prefix ? `${prefix}TreeRootFractionLayer4` : 'treeRootFractionLayer4'),
            minCanopyRes: prefix === 'tree' ? 'treeTreeMinCanopyRes' : (prefix ? `${prefix}TreeMinCanopyRes` : 'treeMinCanopyRes'),
            leafAreaIndex: prefix === 'tree' ? 'treeTreeLeafAreaIndex' : (prefix ? `${prefix}TreeLeafAreaIndex` : 'treeLeafAreaIndex'),
            tallVegCorrFac: prefix === 'tree' ? 'treeTreeTallVegCorrFac' : (prefix ? `${prefix}TreeTallVegCorrFac` : 'treeTallVegCorrFac'),
            momentumRoughLength: prefix === 'tree' ? 'treeTreeMomentumRoughLength' : (prefix ? `${prefix}TreeMomentumRoughLength` : 'treeMomentumRoughLength'),
            heatRoughLength: prefix === 'tree' ? 'treeTreeHeatRoughLength' : (prefix ? `${prefix}TreeHeatRoughLength` : 'treeHeatRoughLength'),
            thermalCondStable: prefix === 'tree' ? 'treeTreeThermalCondStable' : (prefix ? `${prefix}TreeThermalCondStable` : 'treeThermalCondStable'),
            thermalCondUnstable: prefix === 'tree' ? 'treeTreeThermalCondUnstable' : (prefix ? `${prefix}TreeThermalCondUnstable` : 'treeThermalCondUnstable'),
            albedo: prefix === 'tree' ? 'treeTreeAlbedo' : (prefix ? `${prefix}TreeAlbedo` : 'treeAlbedo'),
            emissivity: prefix === 'tree' ? 'treeTreeEmissivity' : (prefix ? `${prefix}TreeEmissivity` : 'treeEmissivity'),
            density: prefix === 'tree' ? 'treeTreeDensity' : (prefix ? `${prefix}TreeDensity` : 'treeDensity'),
            heatCapacity: prefix === 'tree' ? 'treeTreeHeatCapacity' : (prefix ? `${prefix}TreeHeatCapacity` : 'treeHeatCapacity')
        };
        
        const values = {};
        Object.keys(fieldIds).forEach(key => {
            const field = document.getElementById(fieldIds[key]);
            if (field) {
                values[key] = parseFloat(field.value) || 0;
            }
        });
        
        return values;
    }
    
    /**
     * Populate soil type dropdown
     * @param {string} prefix - Prefix for element IDs (empty string, 'circle', 'polygon', 'stl', or 'tree')
     * @param {string} type - Type of object ('grass', 'ground', or 'tree')
     */
    populateSoilTypeDropdown(prefix, type) {
        const dropdownId = prefix === 'tree' ? `treeTreeSoilType` : (prefix ? `${prefix}${type.charAt(0).toUpperCase() + type.slice(1)}SoilType` : `${type}SoilType`);
        const dropdown = document.getElementById(dropdownId);
        
        if (!dropdown || !this.uiManager.surfaceTypesManager) {
            return;
        }
        
        // Clear existing options
        dropdown.innerHTML = '';
        
        // Get soil types from SurfaceTypesManager
        const soilTypes = this.uiManager.surfaceTypesManager.getSurfaceTypes('soilTypes');
        
        if (!soilTypes || soilTypes.length === 0) {
            return;
        }
        
        // Add options based on soilType column
        soilTypes.forEach((soilType, index) => {
            const soilTypeName = soilType.soilType || soilType[0] || '';
            if (soilTypeName && soilTypeName.trim() !== '') {
                const option = document.createElement('option');
                option.value = soilTypeName;
                option.textContent = soilTypeName;
                dropdown.appendChild(option);
            }
        });
        
        // Set current value if exists, otherwise default to 'default'
        const currentSoilType = this.getCurrentSoilType(prefix, type);
        if (currentSoilType !== null && currentSoilType !== undefined) {
            dropdown.value = currentSoilType;
        } else {
            // Default to 'default'
            dropdown.value = 'default';
            this.saveSoilType(prefix, type, 'default');
        }
        
        // Add event listener for changes
        if (!dropdown.hasAttribute(`data-soil-type-listener-${type}`)) {
            dropdown.setAttribute(`data-soil-type-listener-${type}`, 'true');
            dropdown.addEventListener('change', (e) => {
                this.saveSoilType(prefix, type, e.target.value);
            });
        }
    }
    
    /**
     * Get current soil type from userData
     * @param {string} prefix - Prefix for element IDs
     * @param {string} type - Type of object ('grass', 'ground', or 'tree')
     * @returns {string|null} Current soil type or null
     */
    getCurrentSoilType(prefix, type) {
        if (!this.currentShape || !this.currentShape.userData) {
            return null;
        }
        
        const key = `${type}SoilType`;
        return this.currentShape.userData[key] || null;
    }
    
    /**
     * Save soil type to userData
     * @param {string} prefix - Prefix for element IDs
     * @param {string} type - Type of object ('grass', 'ground', or 'tree')
     * @param {string} soilType - Selected soil type
     */
    saveSoilType(prefix, type, soilType) {
        if (!this.currentShape) {
            return;
        }
        
        // Ensure userData exists
        if (!this.currentShape.userData) {
            this.currentShape.userData = {};
        }
        
        const key = `${type}SoilType`;
        this.currentShape.userData[key] = soilType;
        
        // Ensure no period properties for grass, ground, tree
        delete this.currentShape.userData.startPeriod;
        delete this.currentShape.userData.endPeriod;
        delete this.currentShape.userData.buildingArchetypePeriod;
        delete this.currentShape.userData.buildingGroupPeriod;
    }
    
    /**
     * Setup event listeners for custom spec layer count inputs
     * @param {string} prefix - Prefix for element IDs
     */
    setupCustomSpecLayerListeners(prefix) {
        const wallLayersInput = document.getElementById(prefix ? `${prefix}BuildingCustomWallLayers` : 'buildingCustomWallLayers');
        const roofLayersInput = document.getElementById(prefix ? `${prefix}BuildingCustomRoofLayers` : 'buildingCustomRoofLayers');
        const floorLayersInput = document.getElementById(prefix ? `${prefix}BuildingCustomFloorLayers` : 'buildingCustomFloorLayers');
        
        if (wallLayersInput && !wallLayersInput.hasAttribute('data-layer-listener')) {
            wallLayersInput.setAttribute('data-layer-listener', 'true');
            wallLayersInput.addEventListener('change', () => {
                this.rebuildCustomSpecLayerFields(prefix);
                this.saveBuildingCustomSpecValues(prefix);
            });
        }
        
        if (roofLayersInput && !roofLayersInput.hasAttribute('data-layer-listener')) {
            roofLayersInput.setAttribute('data-layer-listener', 'true');
            roofLayersInput.addEventListener('change', () => {
                this.rebuildCustomSpecLayerFields(prefix);
                this.saveBuildingCustomSpecValues(prefix);
            });
        }
        
        if (floorLayersInput && !floorLayersInput.hasAttribute('data-layer-listener')) {
            floorLayersInput.setAttribute('data-layer-listener', 'true');
            floorLayersInput.addEventListener('change', () => {
                this.rebuildCustomSpecLayerFields(prefix);
                this.saveBuildingCustomSpecValues(prefix);
            });
        }
    }
    
    /**
     * Rebuild custom spec layer fields based on layer counts
     * @param {string} prefix - Prefix for element IDs
     */
    rebuildCustomSpecLayerFields(prefix) {
        const containerId = prefix ? `${prefix}BuildingCustomLayerFields` : 'buildingCustomLayerFields';
        const container = document.getElementById(containerId);
        if (!container) {
            return;
        }
        
        // Get layer counts
        const wallLayersInput = document.getElementById(prefix ? `${prefix}BuildingCustomWallLayers` : 'buildingCustomWallLayers');
        const roofLayersInput = document.getElementById(prefix ? `${prefix}BuildingCustomRoofLayers` : 'buildingCustomRoofLayers');
        const floorLayersInput = document.getElementById(prefix ? `${prefix}BuildingCustomFloorLayers` : 'buildingCustomFloorLayers');
        
        const wallLayers = parseInt(wallLayersInput?.value || 1);
        const roofLayers = parseInt(roofLayersInput?.value || 1);
        const floorLayers = parseInt(floorLayersInput?.value || 1);
        
        // Get current values from userData or use defaults
        let currentValues = {};
        if (this.currentShape && this.currentShape.userData && this.currentShape.userData.buildingCustomSpec) {
            currentValues = this.currentShape.userData.buildingCustomSpec;
        }
        
        // If no values exist, use defaults
        if (Object.keys(currentValues).length === 0 || !currentValues['Uvalue_window(W/m2/K)']) {
            currentValues = this.getDefaultCustomSpecValues(wallLayers, roofLayers, floorLayers);
            // Save defaults to userData
            if (this.currentShape && this.currentShape.userData) {
                this.currentShape.userData.buildingCustomSpec = currentValues;
            }
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Generate fields for each layer
        const properties = [
            { name: 'ThermalConductivity', unit: 'Wm⁻¹K⁻¹', step: '0.1' },
            { name: 'SpecificHeat', unit: 'Jkg⁻¹K⁻¹', step: '1' },
            { name: 'Density', unit: 'kgm⁻³', step: '1' },
            { name: 'Thickness', unit: 'm', step: '0.01' }
        ];
        
        const layerTypes = [
            { name: 'Wall', count: wallLayers, prefix: 'wall' },
            { name: 'Roof', count: roofLayers, prefix: 'roof' },
            { name: 'Floor', count: floorLayers, prefix: 'floor' }
        ];
        
        // Generate fields
        layerTypes.forEach(layerType => {
            for (let layerNum = 1; layerNum <= layerType.count; layerNum++) {
                properties.forEach(prop => {
                    const fieldId = prefix ? 
                        `${prefix}BuildingCustom${prop.name}${layerType.name}${layerNum}` : 
                        `buildingCustom${prop.name}${layerType.name}${layerNum}`;
                    
                    // Create key in format: ThermalConductivity_wall1[Wm-1K-1]
                    // Convert superscript to regular: ⁻¹ → -1, ⁻³ → -3
                    let unitKey = prop.unit.replace(/⁻¹/g, '-1').replace(/⁻³/g, '-3').replace(/⁻/g, '-');
                    const key = `${prop.name}_${layerType.prefix}${layerNum}[${unitKey}]`;
                    
                    // Get value: first from currentValues, if not found and layerNum > 1, copy from layer 1
                    let savedValue = currentValues[key];
                    if (savedValue === undefined || savedValue === null || savedValue === '') {
                        if (layerNum > 1) {
                            // Copy from layer 1
                            const layer1Key = `${prop.name}_${layerType.prefix}1[${unitKey}]`;
                            savedValue = currentValues[layer1Key];
                        }
                        
                        // If still no value, use default from getDefaultCustomSpecValues
                        if (savedValue === undefined || savedValue === null || savedValue === '') {
                            const defaults = this.getDefaultCustomSpecValues(wallLayers, roofLayers, floorLayers);
                            savedValue = defaults[key];
                            // If still not found, try to get from layer 1 default
                            if (savedValue === undefined && layerNum > 1) {
                                const layer1Key = `${prop.name}_${layerType.prefix}1[${unitKey}]`;
                                savedValue = defaults[layer1Key];
                            }
                            // Ensure we have a value
                            if (savedValue === undefined) {
                                savedValue = '';
                            }
                        }
                    }
                    
                    const propertyGroup = document.createElement('div');
                    propertyGroup.className = 'property-group';
                    
                    const label = document.createElement('label');
                    label.textContent = `${prop.name} ${layerType.name}${layerNum} (${prop.unit}):`;
                    label.setAttribute('for', fieldId);
                    
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.id = fieldId;
                    input.step = prop.step;
                    input.value = savedValue;
                    input.dataset.property = key;
                    
                    propertyGroup.appendChild(label);
                    propertyGroup.appendChild(input);
                    container.appendChild(propertyGroup);
                });
            }
        });
        
        // Re-attach save listeners
        const inputs = container.querySelectorAll('input');
        inputs.forEach(input => {
            if (!input.hasAttribute('data-save-listener')) {
                input.setAttribute('data-save-listener', 'true');
                input.addEventListener('change', () => {
                    this.saveBuildingCustomSpecValues(prefix);
                });
            }
        });
        
        // After rebuilding, ensure new layers have layer 1 values saved to userData
        if (this.currentShape && this.currentShape.userData && this.currentShape.userData.buildingCustomSpec) {
            const savedValues = this.currentShape.userData.buildingCustomSpec;
            layerTypes.forEach(layerType => {
                if (layerType.count > 1) {
                    for (let layerNum = 2; layerNum <= layerType.count; layerNum++) {
                        properties.forEach(prop => {
                            const unitKey = prop.unit.replace(/[⁻¹]/g, '').replace(/[⁻]/g, '-');
                            const key = `${prop.name}_${layerType.prefix}${layerNum}[${unitKey}]`;
                            const layer1Key = `${prop.name}_${layerType.prefix}1[${unitKey}]`;
                            
                            // If new layer doesn't have a value, copy from layer 1
                            if (!savedValues[key] && savedValues[layer1Key]) {
                                savedValues[key] = savedValues[layer1Key];
                            }
                        });
                    }
                }
            });
            // Update userData
            this.currentShape.userData.buildingCustomSpec = savedValues;
        }
    }
    
    /**
     * Get current custom spec layer values before rebuilding
     * @param {string} prefix - Prefix for element IDs
     * @returns {Object} Current values
     */
    getCurrentCustomSpecLayerValues(prefix) {
        const values = {};
        const containerId = prefix ? `${prefix}BuildingCustomLayerFields` : 'buildingCustomLayerFields';
        const container = document.getElementById(containerId);
        
        if (container) {
            const inputs = container.querySelectorAll('input[data-property]');
            inputs.forEach(input => {
                if (input.value) {
                    values[input.dataset.property] = input.value;
                }
            });
        }
        
        return values;
    }
}

