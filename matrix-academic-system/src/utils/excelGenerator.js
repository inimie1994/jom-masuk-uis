import * as XLSX from 'xlsx';

export const generateLecturerFeedbackExcel = async (session, responses, totalStudents, semesterDetails) => {
    try {
        const response = await fetch(new URL('../assets/BORANG MANUAL_LAPORAN ANALISIS SOAL SELIDIK template.xlsx', import.meta.url).href);
        const arrayBuffer = await response.arrayBuffer();

        // Read the workbook from the template
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // --- Helper to safely set cell value ---
        const setCell = (r, c, val) => {
            const cellRef = XLSX.utils.encode_cell({ r, c });
            if (!worksheet[cellRef]) {
                worksheet[cellRef] = { t: 's', v: '' }; // Initialize if missing
            }
            worksheet[cellRef].v = val;

            // Adjust type based on value
            if (typeof val === 'number') worksheet[cellRef].t = 'n';
            else worksheet[cellRef].t = 's';
        };

        const formatDate = (dateString) => {
            if (!dateString) return '-';
            // Simple format DD/MM/YYYY
            const d = new Date(dateString);
            return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
        };

        // --- 1. Fill Header Details ---

        // Rows and Cols are 0-indexed in SheetJS internal model, but typically referenced as 1-based in Excel.
        // Based on analysis (Indices are 0-based):

        // Name: Row 316 (index 315), Col 5 (F)
        setCell(315, 5, session.lecturers?.name || '');

        // Course: Row 418 (index 417), Col 5 (F)
        setCell(417, 5, `${session.subjects?.code} - ${session.subjects?.name}`);

        // Session: Row 520 (index 519), Col 5 (F)
        setCell(519, 5, "II"); // Hardcoded as per layout or session

        // Academic Year: Row 541 (index 540), Col 5 (F)
        setCell(540, 5, session.semester_session || '2025/2026');

        // Credit Hours: Row 622 (index 621), Col 5 (F)
        setCell(621, 5, 3);

        // Contact Hours: Row 643 (index 642), Col 5 (F)
        setCell(642, 5, 3);

        // Start Date: Row 725 (index 724), Col 6 (G)
        // End Date: Row 730 (index 729), Col 11 (L) ?? Logic check: JSON had value at index 11
        setCell(724, 6, formatDate(semesterDetails?.semester_start_date));
        setCell(729, 11, formatDate(semesterDetails?.semester_end_date));

        // Total Students: Row 826 (index 825), Col 5 (F)
        setCell(825, 5, totalStudents || 0);

        // Respondents: Row 847 (index 846), Col 5 (F)
        setCell(846, 5, responses.length);


        // --- 2. Fill Feedback Matrix ---
        // Questions start at Row 1180 (index 1179)
        // Interval appears to be 51 rows
        // Col I (8) to AQ (42) for Respondents 1-35

        const QUESTION_START_ROW = 1179;
        const ROW_INTERVAL = 51;
        const COL_START = 8; // I
        const MAX_RESPONDENTS = 35;

        // Flatten questions to match the row iterator
        // Structure in PrintableFeedbackReport:
        // Cat 1: 7 questions
        // Cat 2: 2 questions
        // Cat 3: 3 questions
        // Total 12 questions

        // We iterate through all 12 questions
        for (let qIdx = 0; qIdx < 12; qIdx++) {
            const currentRow = QUESTION_START_ROW + (qIdx * ROW_INTERVAL);

            // For each respondent (up to 35)
            for (let rIdx = 0; rIdx < MAX_RESPONDENTS; rIdx++) {
                const respondent = responses[rIdx];
                let ratingVal = '';

                if (respondent) {
                    // ratings is an array of 12 ints
                    const r = respondent.ratings[qIdx];
                    if (r >= 1 && r <= 5) {
                        ratingVal = r;
                    }
                }

                // Write to cell
                setCell(currentRow, COL_START + rIdx, ratingVal);
            }
        }

        // --- 3. Save file ---
        XLSX.writeFile(workbook, `Laporan_Feedback_${session.subjects?.code}.xlsx`);

    } catch (error) {
        console.error("Error generating Excel:", error);
        alert("Failed to generate Excel report.");
    }
};
