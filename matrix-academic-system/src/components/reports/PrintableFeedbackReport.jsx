import React, { useMemo } from 'react';

const FEEDBACK_STRUCTURE = [
    {
        category: "Pengajaran dan Pembelajaran",
        questions: [
            "Perancangan dan penyediaan kursus ini adalah baik",
            "Pegawai akademik mempunyai pengetahuan yang mendalam tentang kursus",
            "Pegawai akademik mempunyai kemahiran dalam penyampaian kandungan kursus",
            "Pegawai akademik menggunakan maklumat yang relevan dan terkini",
            "Pegawai akademik merangsang minat pelajar dengan kreatif dan inovatif",
            "Pegawai akademik berinteraksi dengan baik dan bersedia membantu pelajar",
            "Pegawai akademik menggunakan bahan bantu mengajar yang bersesuaian"
        ]
    },
    {
        category: "Pengujian dan Penilaian",
        questions: [
            "Kaedah dan strategi penilaian kursus adalah bersesuaian (tugasan/ ujian/ amali/ peperiksaan akhir/ dll.)",
            "Pemarkahan yang diberikan oleh pegawai akademik adalah telus dan adil"
        ]
    },
    {
        category: "Keterampilan dan Profesionalisme",
        questions: [
            "Penampilan pegawai akademik adalah baik",
            "Pegawai akademik mengamalkan ketepatan waktu",
            "Pegawai akademik bermotivasi dan menerapkan nilai-nilai Islam"
        ]
    }
];

const FLATTENED_QUESTIONS = FEEDBACK_STRUCTURE.flatMap(s => s.questions);

const MAX_RESPONDENTS = 35;

const PrintableFeedbackReport = ({ session, responses, facultyLogo, totalStudents, semesterDetails }) => {
    // Calculate statistics
    const stats = useMemo(() => {
        if (!responses) return null;

        const questionStats = FLATTENED_QUESTIONS.map((q, index) => {
            let totalScore = 0;
            let validResponses = 0;

            const rowRatings = Array(MAX_RESPONDENTS).fill(null).map((_, rIdx) => {
                const r = responses[rIdx];
                if (!r) return '';

                const rating = r.ratings[index];
                if (rating >= 1 && rating <= 5) {
                    totalScore += rating;
                    validResponses++;
                    return rating;
                }
                return '-';
            });

            const mean = validResponses > 0 ? (totalScore / validResponses).toFixed(2) : 0;

            return {
                question: q,
                ratings: rowRatings,
                totalScore,
                mean: parseFloat(mean)
            };
        });

        const overallMean = (questionStats.reduce((acc, curr) => acc + curr.mean, 0) / FLATTENED_QUESTIONS.length).toFixed(2);

        // Calculate grouping stats
        let currentIndex = 0;
        const groupedStats = FEEDBACK_STRUCTURE.map(group => {
            const groupStat = {
                category: group.category,
                items: group.questions.map(() => {
                    const stat = questionStats[currentIndex];
                    currentIndex++;
                    return stat;
                })
            };
            return groupStat;
        });

        return { questionStats, overallMean, groupedStats };
    }, [responses]);

    if (!session || !stats) return null;

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const respondentNumbers = Array.from({ length: MAX_RESPONDENTS }, (_, i) => i + 1);

    return (
        <div className="bg-white p-8 max-w-[210mm] mx-auto min-h-[297mm] text-black font-sans print:p-0 text-sm">
            {/* Top Right Reference */}
            <div className="text-right text-[10px] mb-2 font-medium">LABSS/FAKULTI/2022/PIN. 2</div>

            {/* Main Header */}
            <div className="text-center mb-6">
                <h1 className="font-bold uppercase text-xs mb-1 tracking-wide">LAPORAN ANALISIS BORANG SOAL SELIDIK PENGAJARAN DAN PEMBELAJARAN</h1>
                <div className="bg-orange-100 font-bold uppercase text-xs py-1 tracking-wide">
                    JABATAN/ PUSAT: JABATAN PENGAJIAN ISLAM, PUSAT MATRIKULASI
                </div>
            </div>

            {/* Section A */}
            <div className="mb-8">
                <h2 className="font-bold mb-3 text-xs">A. Butiran Pengajaran</h2>

                <div className="space-y-2 text-[11px]">
                    <div className="grid grid-cols-[160px_auto] items-center">
                        <div className="font-medium">Nama Pensyarah</div>
                        <div className="flex w-full">
                            <span className="mr-2">:</span>
                            <div className="bg-orange-100 px-2 py-1 w-[50%] uppercase font-medium">{session.lecturers?.name}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-[160px_auto] items-center">
                        <div className="font-medium">Kod & Nama Kursus</div>
                        <div className="flex w-full">
                            <span className="mr-2">:</span>
                            <div className="bg-orange-100 px-2 py-1 w-[50%] uppercase font-medium">
                                {session.subjects?.code} - {session.subjects?.name}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-[160px_1fr_130px_1fr] items-center">
                        <div className="font-medium">Sesi Akademik</div>
                        <div className="flex mr-4">
                            <span className="mr-2">:</span>
                            <div className="bg-orange-100 px-2 py-1 w-24 uppercase font-medium">II</div>
                        </div>
                        <div className="font-medium">Tahun Akademik</div>
                        <div className="flex">
                            <span className="mr-2">:</span>
                            <div className="bg-orange-100 px-2 py-1 w-32 uppercase font-medium">{session.semester_session || '2025/2026'}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-[160px_1fr_130px_1fr] items-center">
                        <div className="font-medium">Jam Kredit</div>
                        <div className="flex mr-4">
                            <span className="mr-2">:</span>
                            <div className="bg-orange-100 px-2 py-1 w-24 font-medium">3</div>
                        </div>
                        <div className="font-medium">Jam Pertemuan Seminggu</div>
                        <div className="flex">
                            <span className="mr-2">:</span>
                            <div className="bg-orange-100 px-2 py-1 w-32 font-medium">3</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-[160px_auto] items-center">
                        <div className="font-medium">Tempoh Pelaksanaan PdP</div>
                        <div className="flex items-center">
                            <span className="mr-2">:</span>
                            <span className="mr-3 text-xs">Dari</span>
                            <div className="bg-orange-100 px-4 py-1 min-w-[120px] text-center font-medium">
                                {formatDate(semesterDetails?.semester_start_date)}
                            </div>
                            <span className="mx-3 text-xs">Hingga:</span>
                            <div className="bg-orange-100 px-4 py-1 min-w-[120px] text-center font-medium">
                                {formatDate(semesterDetails?.semester_end_date)}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-[160px_1fr_130px_1fr] items-center">
                        <div className="font-medium">Jumlah Keseluruhan Pelajar</div>
                        <div className="flex items-center mr-4">
                            <span className="mr-2">:</span>
                            <div className="bg-orange-100 px-2 py-1 w-20 text-center font-medium">{totalStudents || 0}</div>
                            <span className="ml-2 text-xs">Orang</span>
                        </div>
                        <div className="font-medium">Bilangan Responden</div>
                        <div className="flex items-center">
                            <span className="mr-2">:</span>
                            <div className="bg-orange-100 border border-black px-2 py-1 w-20 text-center font-bold">
                                {responses.length}
                            </div>
                            <span className="ml-2 text-xs">Orang</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-2 font-bold text-xs">
                B. Penilaian : Penilaian pelajar terhadap kursus mengikut komponen di bawah:
            </div>

            {/* Table Styling for fixed 35 columns */}
            <div className="overflow-x-visible">
                <table className="w-full border-collapse border border-black text-[7px] mb-6 table-fixed">
                    <thead>
                        <tr className="bg-white">
                            <th className="border border-black p-0.5 text-center w-[60px] font-bold" rowSpan="2">Komponen</th>
                            <th className="border border-black p-0.5 text-center w-[15px] font-bold" rowSpan="2">Bil</th>
                            <th className="border border-black p-0.5 text-center font-bold" rowSpan="2">Aspek Penilaian</th>
                            <th className="border border-black p-0 text-center" colSpan={MAX_RESPONDENTS}>
                                <div className="border-b border-black p-0.5 font-bold text-[8px]">Bilangan Responden dan Skala/ Markah yang Diberikan</div>
                                <div className="flex divide-x divide-black w-full">
                                    {respondentNumbers.map((num) => (
                                        <div key={num} className="flex-1 p-0.5 text-[7px] text-center">{num}</div>
                                    ))}
                                </div>
                            </th>
                            <th className="border border-black p-0.5 text-center w-[25px] font-bold" rowSpan="2">JUMLAH SKOR</th>
                            <th className="border border-black p-0.5 text-center w-[25px] font-bold" rowSpan="2">SKOR MIN</th>
                        </tr>
                        <tr className="hidden">
                            {/* Hidden row to help with table-fixed layout if needed, but flex above usually works */}
                        </tr>
                    </thead>
                    <tbody>
                        {stats.groupedStats.map((group, gIndex) => {
                            return (
                                <React.Fragment key={gIndex}>
                                    {group.items.map((stat, iIndex) => (
                                        <tr key={`${gIndex}-${iIndex}`}>
                                            {iIndex === 0 && (
                                                <td className="border border-black p-0.5 text-center font-bold align-middle leading-tight break-words" rowSpan={group.items.length}>
                                                    {group.category}
                                                </td>
                                            )}
                                            <td className="border border-black p-0.5 text-center align-middle">{iIndex + 1}</td>
                                            <td className="border border-black p-0.5 px-1 align-middle leading-tight text-[8px]">{stat.question}</td>

                                            {/* Fixed 35 Rating Cells */}
                                            {stat.ratings.map((rating, rIdx) => (
                                                <td key={rIdx} className="border border-black p-0 text-center align-middle font-medium">
                                                    {rating}
                                                </td>
                                            ))}

                                            <td className="border border-black p-0.5 text-center font-bold align-middle bg-gray-50">{stat.totalScore}</td>
                                            <td className="border border-black p-0.5 text-center font-bold align-middle bg-gray-50">{stat.mean.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                        {/* Overall Mean Row */}
                        <tr className="bg-white font-bold">
                            <td className="border border-black p-0.5 text-center uppercase text-[8px]" colSpan="3">JUMLAH MARKAH KESELURUHAN</td>
                            <td className="border border-black p-0.5 text-center bg-gray-50" colSpan={MAX_RESPONDENTS}></td>
                            <td className="border border-black p-0.5 text-center bg-gray-50">
                                {stats.questionStats.reduce((sum, item) => sum + item.totalScore, 0)}
                            </td>
                            <td className="border border-black p-0.5 text-center bg-orange-100">{stats.overallMean}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Signature Section */}
            <div className="mt-8 grid grid-cols-2 gap-12 text-[11px]">
                <div>
                    <p className="font-bold mb-12">DISEDIAKAN OLEH:</p> {/* Added space for signature */}
                    <div className="border-b border-black w-56 mb-2"></div>
                    <p className="uppercase font-bold">{session.lecturers?.name}</p>
                    <p>PENSYARAH</p>
                    <p>TARIKH: {new Date().toLocaleDateString('en-GB')}</p>
                </div>

                <div>
                    <p className="font-bold mb-12">DISAHKAN OLEH:</p>
                    <div className="border-b border-black w-56 mb-2"></div>
                    <p className="uppercase font-bold">KETUA JABATAN / DEKAN</p>
                    <p>TARIKH:</p>
                </div>
            </div>

            <div className="text-right text-[10px] mt-4 font-bold">
                Petunjuk Skala / Markah
            </div>
        </div>
    );
};

export default PrintableFeedbackReport;
