
export const getGrade = (marks) => {
    if (marks >= 85) return { grade: 'A', points: 4.00, status: 'LULUS' };
    if (marks >= 80) return { grade: 'A-', points: 3.67, status: 'LULUS' };
    if (marks >= 75) return { grade: 'B+', points: 3.33, status: 'LULUS' };
    if (marks >= 70) return { grade: 'B', points: 3.00, status: 'LULUS' };
    if (marks >= 65) return { grade: 'B-', points: 2.67, status: 'LULUS' };
    if (marks >= 60) return { grade: 'C+', points: 2.33, status: 'LULUS' };
    if (marks >= 55) return { grade: 'C', points: 2.00, status: 'LULUS' };
    if (marks >= 50) return { grade: 'C-', points: 1.67, status: 'GAGAL' };
    if (marks >= 45) return { grade: 'D+', points: 1.33, status: 'GAGAL' };
    if (marks >= 40) return { grade: 'D', points: 1.00, status: 'GAGAL' };
    return { grade: 'F', points: 0.00, status: 'GAGAL' };
};
