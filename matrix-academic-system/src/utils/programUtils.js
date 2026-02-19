
export const PROGRAMS = {
    'FA01': 'ASASI PENGAJIAN ISLAM',
    'FA02': 'ASASI PENGURUSAN',
    'FA03': 'PENGAJIAN ASAS TEKNOLOGI MAKLUMAT',
    'FA04': 'ASASI BAHASA ARAB',
    'FA05': 'ASASI KOMUNIKASI',
    'FA06': 'ASASI BAHASA INGGERIS'
};

export const DEPARTMENT_PROGRAM_MAP = {
    'JPI': ['FA01'],
    'JPIN': ['FA02', 'FA03', 'FA05'],
    'JB': ['FA04', 'FA06']
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

export const getProgramsForDepartment = (deptCode) => {
    return DEPARTMENT_PROGRAM_MAP[deptCode] || [];
};
