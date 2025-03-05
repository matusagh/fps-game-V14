// ==========================================
// Math Utilities
// ==========================================

/**
 * Clamps a value between min and max
 * @param {number} value - The value to clamp
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {number} The clamped value
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Converts degrees to radians
 * @param {number} degrees - The angle in degrees
 * @returns {number} The angle in radians
 */
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * Converts radians to degrees
 * @param {number} radians - The angle in radians
 * @returns {number} The angle in degrees
 */
function radToDeg(radians) {
    return radians * 180 / Math.PI;
}

/**
 * Generates a random number between min and max
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {number} A random number between min and max
 */
function random(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Generates a random integer between min and max (inclusive)
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {number} A random integer between min and max
 */
function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
}

/**
 * Linear interpolation between two values
 * @param {number} start - The start value
 * @param {number} end - The end value
 * @param {number} t - The interpolation factor (0-1)
 * @returns {number} The interpolated value
 */
function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

// ==========================================
// Texture Utilities
// ==========================================

/**
 * Creates a canvas texture with text
 * @param {string} text - The text to render
 * @param {Object} options - Text rendering options
 * @param {number} [options.fontSize=70] - Font size in pixels
 * @param {string} [options.fontFamily='Arial'] - Font family
 * @param {string} [options.fillStyle='#FF00FF'] - Text fill color
 * @param {string} [options.strokeStyle='#00FFFF'] - Text stroke color
 * @param {number} [options.lineWidth=4] - Text stroke width
 * @returns {THREE.CanvasTexture} The generated texture
 */
function createTextTexture(text, options = {}) {
    const {
        fontSize = 70,
        fontFamily = 'Arial',
        fillStyle = '#FF00FF',
        strokeStyle = '#00FFFF',
        lineWidth = 4
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = `bold ${fontSize}px ${fontFamily}`;
    context.fillStyle = fillStyle;
    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    context.strokeText(text, canvas.width/2, canvas.height/2);
    context.fillText(text, canvas.width/2, canvas.height/2);
    
    return new THREE.CanvasTexture(canvas);
}

/**
 * Creates a gradient texture
 * @param {string[]} colors - Array of color values
 * @param {'vertical'|'horizontal'} [direction='vertical'] - Gradient direction
 * @returns {THREE.CanvasTexture} The generated gradient texture
 */
function createGradientTexture(colors, direction = 'vertical') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    const gradient = direction === 'vertical' 
        ? ctx.createLinearGradient(0, 0, 0, 128)
        : ctx.createLinearGradient(0, 0, 128, 0);
    
    colors.forEach((color, index) => {
        gradient.addColorStop(index / (colors.length - 1), color);
    });
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    
    return new THREE.CanvasTexture(canvas);
}

/**
 * Loads a texture with error handling
 * @param {string} url - The URL of the texture to load
 * @returns {Promise<THREE.Texture>} A promise that resolves with the loaded texture
 */
function loadTexture(url) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(
            url,
            texture => resolve(texture),
            undefined,
            error => reject(error)
        );
    });
}

// ==========================================
// Formatting Utilities
// ==========================================

/**
 * Formats time in MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// ==========================================
// Export Utilities
// ==========================================

window.gameUtils = {
    // Math
    clamp,
    degToRad,
    radToDeg,
    random,
    randomInt,
    lerp,
    
    // Textures
    createTextTexture,
    createGradientTexture,
    loadTexture,
    
    // Formatting
    formatTime
}; 