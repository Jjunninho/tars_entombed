function isValidHex(color) {
    return /^#([0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$/i.test(color);
}

function validateColor(color, fallback = '#fff') {
    return isValidHex(color) ? color : fallback;
}

window.EntitiesUtils = {
    validateColor
};
