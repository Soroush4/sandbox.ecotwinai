/**
 * SurfaceTypesManager - Manages surface type definitions from CSV files
 * Handles roadTypes, soilTypes, waterTypes, groundTypes, grassTypes, treeTypes, and vegetationTypes
 */
class SurfaceTypesManager {
    constructor() {
        this.surfaceTypes = {
            roadTypes: [],
            soilTypes: [],
            waterTypes: [],
            vegetationTypes: [], // Kept for backward compatibility
            groundTypes: [],
            grassTypes: [],
            treeTypes: [],
            buildingArchyTypes: [],
            buildingGroups: []
        };
        
        this.csvFiles = {
            roadTypes: 'Samples/roadTypes.csv',
            soilTypes: 'Samples/soilTypes.csv',
            waterTypes: 'Samples/waterTypes.csv',
            vegetationTypes: 'Samples/vegetationTypes.csv',
            buildingArchyTypes: 'Samples/buildingArchyTypes.csv',
            buildingGroups: 'Samples/building_groups.csv'
        };
    }

    /**
     * Initialize by loading all CSV files or from localStorage
     */
    async init() {
        try {
            // Always reload vegetationTypes and split categories from CSV to ensure we have the latest data
            // But keep buildingArchyTypes and buildingGroups from localStorage if they exist
            if (localStorage.getItem('surfaceTypes_vegetationTypes')) {
                localStorage.removeItem('surfaceTypes_vegetationTypes');
            }
            // Clear split categories to force reload
            if (localStorage.getItem('surfaceTypes_groundTypes')) {
                localStorage.removeItem('surfaceTypes_groundTypes');
            }
            if (localStorage.getItem('surfaceTypes_grassTypes')) {
                localStorage.removeItem('surfaceTypes_grassTypes');
            }
            if (localStorage.getItem('surfaceTypes_treeTypes')) {
                localStorage.removeItem('surfaceTypes_treeTypes');
            }
            
            // Try to load from localStorage first
            this.loadFromLocalStorage();
            
            // Load from CSV files for any categories that are empty
            // But preserve buildingArchyTypes and buildingGroups from localStorage if they exist
            const categoriesToLoad = [];
            Object.keys(this.surfaceTypes).forEach(category => {
                // Skip split categories - they will be populated from vegetationTypes
                if (category === 'groundTypes' || category === 'grassTypes' || category === 'treeTypes') {
                    return;
                }
                // Skip buildingArchyTypes and buildingGroups if they exist in localStorage (preserve user changes)
                if ((category === 'buildingArchyTypes' || category === 'buildingGroups') && 
                    this.surfaceTypes[category] && this.surfaceTypes[category].length > 0) {
                    // Preserving from localStorage
                    return;
                }
                
                // For buildingGroups, use special parser
                if (category === 'buildingGroups' && (!this.surfaceTypes[category] || this.surfaceTypes[category].length === 0)) {
                    categoriesToLoad.push(category);
                    return;
                }
                if (!this.surfaceTypes[category] || this.surfaceTypes[category].length === 0) {
                    categoriesToLoad.push(category);
                }
            });
            
            if (categoriesToLoad.length > 0) {
                // Loading categories from CSV
                await Promise.all(
                    categoriesToLoad.map(category => this.loadCSVFile(category))
                );
                
                // After loading vegetationTypes, split it into groundTypes, grassTypes, and treeTypes
                if (this.surfaceTypes.vegetationTypes && this.surfaceTypes.vegetationTypes.length > 0) {
                    this.splitVegetationTypes();
                }
                
                // Save to localStorage after loading from CSV
                this.saveToLocalStorage();
            } else {
                // If data was loaded from localStorage, still need to split vegetationTypes if it exists
                if (this.surfaceTypes.vegetationTypes && this.surfaceTypes.vegetationTypes.length > 0) {
                    // Check if split categories are empty
                    if (!this.surfaceTypes.groundTypes || this.surfaceTypes.groundTypes.length === 0 ||
                        !this.surfaceTypes.grassTypes || this.surfaceTypes.grassTypes.length === 0 ||
                        !this.surfaceTypes.treeTypes || this.surfaceTypes.treeTypes.length === 0) {
                        this.splitVegetationTypes();
                        this.saveToLocalStorage();
                    }
                }
            }
            
            // console.log('Surface Types Manager initialized successfully');
        } catch (error) {
            console.error('Error initializing Surface Types Manager:', error);
        }
    }

    /**
     * Split vegetationTypes into groundTypes, grassTypes, and treeTypes based on exact type names
     */
    splitVegetationTypes() {
        if (!this.surfaceTypes.vegetationTypes || this.surfaceTypes.vegetationTypes.length === 0) {
            return;
        }

        // Define exact lists for each category
        const groundTypesList = [
            'ground_default',
            'bare_soil',
            'semidesert'
        ];

        const grassTypesList = [
            'grass_default',
            'crops_mixed_farming',
            'short_grass',
            'tall_grass',
            'tundra',
            'irrigated_crops',
            'bogs_marshes'
        ];

        const treeTypesList = [
            'tree_default',
            'evergreen_needleleaf_tree',
            'deciduous_needleleaf_tree',
            'evergreen_broadleaf_tree',
            'deciduous_broadleaf_tree',
            'mixed_forest_woodland',
            'interrupted_forest',
            'evergreen_shrubs',
            'deciduous_shrubs'
        ];

        this.surfaceTypes.groundTypes = [];
        this.surfaceTypes.grassTypes = [];
        this.surfaceTypes.treeTypes = [];

        this.surfaceTypes.vegetationTypes.forEach(item => {
            // Get the vegetationType name (first key is usually 'vegetationType')
            const typeName = item.vegetationType || Object.values(item)[0];
            
            if (!typeName || typeof typeName !== 'string') {
                return;
            }

            // Remove any prefixes if present (gra:, gro:, tree:)
            const cleanName = typeName.replace(/^(gra|gro|tree):\s*/, '').trim();

            // Categorize based on exact match with predefined lists
            if (groundTypesList.includes(cleanName)) {
                this.surfaceTypes.groundTypes.push(item);
            } else if (grassTypesList.includes(cleanName)) {
                this.surfaceTypes.grassTypes.push(item);
            } else if (treeTypesList.includes(cleanName)) {
                this.surfaceTypes.treeTypes.push(item);
            } else {
                // If not found in any list, log a warning and try to categorize by name patterns as fallback
                console.warn(`Vegetation type "${cleanName}" not found in predefined lists, using fallback categorization`);
                const lowerName = cleanName.toLowerCase();
                
                if (lowerName.includes('ground') || lowerName.includes('soil') || lowerName.includes('bare')) {
                    this.surfaceTypes.groundTypes.push(item);
                } else if (lowerName.includes('tree') || lowerName.includes('forest') || 
                           lowerName.includes('woodland') || lowerName.includes('needleleaf') ||
                           lowerName.includes('broadleaf')) {
                    this.surfaceTypes.treeTypes.push(item);
                } else {
                    // Default to grass for unknown types
                    this.surfaceTypes.grassTypes.push(item);
                }
            }
        });

        // Split vegetation types into categories
    }

    /**
     * Save surface types to localStorage
     */
    saveToLocalStorage() {
        try {
            Object.keys(this.surfaceTypes).forEach(category => {
                const key = `surfaceTypes_${category}`;
                localStorage.setItem(key, JSON.stringify(this.surfaceTypes[category]));
            });
            // Surface types saved to localStorage
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    /**
     * Load surface types from localStorage
     * @returns {boolean} True if data was loaded from localStorage
     */
    loadFromLocalStorage() {
        try {
            let loaded = false;
            let allLoaded = true;
            Object.keys(this.surfaceTypes).forEach(category => {
                const key = `surfaceTypes_${category}`;
                const stored = localStorage.getItem(key);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    // Only load if data exists and is not empty
                    if (parsed && parsed.length > 0) {
                        this.surfaceTypes[category] = parsed;
                        loaded = true;
                        // Loaded from localStorage
                    } else {
                        allLoaded = false;
                        console.log(`Skipping empty ${category} in localStorage, will reload from CSV`);
                    }
                } else {
                    allLoaded = false;
                }
            });
            // Only return true if all categories were loaded successfully
            return loaded && allLoaded;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return false;
        }
    }

    /**
     * Load a CSV file
     * @param {string} type - Type of surface (roadTypes, soilTypes, waterTypes, vegetationTypes, buildingArchyTypes)
     */
    async loadCSVFile(type) {
        const filePath = this.csvFiles[type];
        if (!filePath) {
            console.error(`Unknown surface type: ${type}`);
            return;
        }

        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load ${filePath}: ${response.statusText}`);
            }
            
            const text = await response.text();
            
            // Special parsing for buildingArchyTypes and buildingGroups (has different structure)
            let data;
            if (type === 'buildingArchyTypes' || type === 'buildingGroups') {
                data = this.parseBuildingArchyTypesCSV(text);
            } else {
                data = this.parseCSV(text);
            }
            
            this.surfaceTypes[type] = data;
            
            // Loaded from CSV file
        } catch (error) {
            console.error(`Error loading ${filePath}:`, error);
            // Initialize with empty array if file not found
            this.surfaceTypes[type] = [];
        }
    }

    /**
     * Parse building archetypes CSV with special structure
     * Structure: 
     * - Rows 1-4: key,value pairs (usage_group_building_name, number_of_*)
     * - Row 5: header row (startPeriod, endPeriod, ...)
     * - Rows 6+: period data rows with all columns
     * @param {string} csvText - CSV file content
     * @returns {Array} Array of row objects
     */
    parseBuildingArchyTypesCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const data = [];
        let currentHeaders = null; // Store headers when we encounter header row

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) {
                // Empty line - add empty object to preserve structure and reset headers
                data.push({});
                currentHeaders = null;
                continue;
            }

            const values = this.parseCSVLine(line);
            if (values.length === 0) continue;

            const obj = {};

            // Check if this is a header row (starts with 'startPeriod' and has multiple columns)
            if (values.length > 2 && values[0].trim() === 'startPeriod' && values[1].trim() === 'endPeriod') {
                // This is a header row - store headers for subsequent period rows
                currentHeaders = values.map(v => v.trim());
                // Store header row as object with all headers
                currentHeaders.forEach((header, index) => {
                    obj[header] = header;
                });
            } else if (currentHeaders && values.length === currentHeaders.length) {
                // This is a period data row - use stored headers
                currentHeaders.forEach((header, index) => {
                    const value = values[index] ? values[index].trim() : '';
                    // Try to parse as number
                    const numValue = parseFloat(value);
                    obj[header] = (value !== '' && !isNaN(numValue)) ? numValue : value;
                });
            } else if (values.length >= 2) {
                // This is a config row (key,value pair)
                const key = values[0].trim();
                const value = values[1].trim();
                
                // Try to parse as number
                const numValue = parseFloat(value);
                obj[key] = (value !== '' && !isNaN(numValue)) ? numValue : value;
            } else if (values.length === 1) {
                // Single value row
                obj[values[0].trim()] = '';
            }

            data.push(obj);
        }

        return data;
    }

    /**
     * Parse CSV text into array of objects
     * @param {string} csvText - CSV file content
     * @returns {Array} Array of objects with properties from CSV
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            return [];
        }

        // Parse header using parseCSVLine to handle quoted values correctly
        const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
        
        // Parse data rows
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines
            
            const values = this.parseCSVLine(line);
            if (values.length !== headers.length) {
                console.warn(`Line ${i + 1} has ${values.length} values but expected ${headers.length}`);
                continue;
            }

            const obj = {};
            headers.forEach((header, index) => {
                const value = values[index];
                // Try to parse as number if possible
                const numValue = parseFloat(value);
                obj[header] = isNaN(numValue) ? value : numValue;
            });
            
            data.push(obj);
        }

        return data;
    }

    /**
     * Parse a single CSV line, handling quoted values
     * @param {string} line - CSV line
     * @returns {Array} Array of values
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    /**
     * Get all surface types of a specific category
     * @param {string} type - Type of surface (roadTypes, soilTypes, waterTypes, vegetationTypes)
     * @returns {Array} Array of surface type objects
     */
    getSurfaceTypes(type) {
        return this.surfaceTypes[type] || [];
    }

    /**
     * Get a specific surface type by name
     * @param {string} category - Category (roadTypes, soilTypes, waterTypes, vegetationTypes)
     * @param {string} name - Name of the surface type
     * @returns {Object|null} Surface type object or null if not found
     */
    getSurfaceType(category, name) {
        const types = this.surfaceTypes[category] || [];
        return types.find(t => {
            const key = Object.keys(t)[0]; // First key is usually the type name (roadType, soilType, etc.)
            return t[key] === name;
        }) || null;
    }

    /**
     * Add a new surface type
     * @param {string} category - Category (roadTypes, soilTypes, waterTypes, vegetationTypes)
     * @param {Object} surfaceType - Surface type object
     */
    addSurfaceType(category, surfaceType) {
        if (!this.surfaceTypes[category]) {
            this.surfaceTypes[category] = [];
        }
        this.surfaceTypes[category].push(surfaceType);
    }

    /**
     * Update an existing surface type
     * @param {string} category - Category
     * @param {string} name - Name of the surface type to update
     * @param {Object} updatedData - Updated surface type object
     */
    updateSurfaceType(category, name, updatedData) {
        const types = this.surfaceTypes[category] || [];
        const index = types.findIndex(t => {
            const key = Object.keys(t)[0];
            return t[key] === name;
        });
        
        if (index !== -1) {
            this.surfaceTypes[category][index] = updatedData;
        }
    }

    /**
     * Delete a surface type
     * @param {string} category - Category
     * @param {string} name - Name of the surface type to delete
     */
    deleteSurfaceType(category, name) {
        const types = this.surfaceTypes[category] || [];
        const index = types.findIndex(t => {
            const key = Object.keys(t)[0];
            return t[key] === name;
        });
        
        if (index !== -1) {
            this.surfaceTypes[category].splice(index, 1);
        }
    }

    /**
     * Export surface types to CSV format
     * @param {string} category - Category to export
     * @returns {string} CSV content
     */
    exportToCSV(category) {
        const types = this.surfaceTypes[category] || [];
        if (types.length === 0) {
            return '';
        }

        // Get headers from first object
        const headers = Object.keys(types[0]);
        
        // Build CSV content
        let csv = headers.join(',') + '\n';
        
        types.forEach(type => {
            const values = headers.map(header => {
                const value = type[header];
                // Handle numbers in scientific notation
                if (typeof value === 'number') {
                    return value.toString();
                }
                return value;
            });
            csv += values.join(',') + '\n';
        });
        
        return csv;
    }

    /**
     * Export all surface types to CSV files
     */
    exportAllToCSV() {
        const files = {};
        Object.keys(this.surfaceTypes).forEach(category => {
            files[category] = this.exportToCSV(category);
        });
        return files;
    }

    /**
     * Import surface types from CSV content
     * @param {string} category - Category to import into
     * @param {string} csvContent - CSV file content
     */
    importFromCSV(category, csvContent) {
        const data = this.parseCSV(csvContent);
        this.surfaceTypes[category] = data;
    }

    /**
     * Download CSV file
     * @param {string} category - Category to download
     * @param {string} filename - Filename for download
     */
    downloadCSV(category, filename) {
        const csv = this.exportToCSV(category);
        if (!csv) {
            console.warn(`No data to export for ${category}`);
            return;
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `${category}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Get all categories
     * @returns {Array} Array of category names
     */
    getCategories() {
        return Object.keys(this.surfaceTypes);
    }
}

