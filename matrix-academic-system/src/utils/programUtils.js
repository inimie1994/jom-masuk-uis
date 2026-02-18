
export const PROGRAMS = {
    'FA01': 'ASASI PENGAJIAN ISLAM',
    'FA02': 'ASASI PENGURUSAN',
    'FA03': 'PENGAJIAN ASAS TEKNOLOGI MAKLUMAT',
    'FA04': 'ASASI BAHASA ARAB',
    'FA05': 'ASASI KOMUNIKASI',
    'FA06': 'ASASI BAHASA INGGERIS'
};

/**
 * Extracts the program name from a student group string (e.g., "FA01 2A").
 * @param {string} groupString 
 * @returns {string} The full program name or the original string if not found.
 */
export const getProgramName = (groupString) => {
    if (!groupString) return 'N/A';
    const code = groupString.split(' ')[0];
    return PROGRAMS[code] || groupString;
};
