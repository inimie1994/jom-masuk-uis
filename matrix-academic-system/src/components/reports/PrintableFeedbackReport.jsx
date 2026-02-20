import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

        // Calculate Performance Index (Sum of all means)
        const performanceIndex = questionStats.reduce((acc, curr) => acc + curr.mean, 0).toFixed(2);

        // Chart Data Preparation
        let qCounter = 0;
        const chartData = FEEDBACK_STRUCTURE.flatMap((group, gIdx) => {
            return group.questions.map((q, qIdx) => {
                const stat = questionStats[qCounter++];
                return {
                    name: `${qIdx + 1}`, // Resets per category
                    fullQuestion: q,
                    value: stat.mean,
                    category: group.category,
                    globalIndex: qCounter
                };
            });
        });

        // Calculate grouping stats
        let currentIndex = 0;
        const groupedStats = FEEDBACK_STRUCTURE.map(group => {
            const items = group.questions.map(() => {
                const stat = questionStats[currentIndex];
                currentIndex++;
                return stat;
            });

            // Calculate section average
            const sectionTotalMean = items.reduce((sum, item) => sum + item.mean, 0);
            const sectionAverage = (sectionTotalMean / items.length).toFixed(2);

            const groupStat = {
                category: group.category,
                items,
                sectionAverage
            };
            return groupStat;
        });

        return { questionStats, overallMean, groupedStats, performanceIndex, chartData };
    }, [responses]);

    const getPerformanceLabel = (index) => {
        const val = parseFloat(index);
        if (val >= 49) return 'CEMERLANG';
        if (val >= 37) return 'AMAT BAIK';
        if (val >= 25) return 'BAIK';
        if (val >= 13) return 'SEDERHANA';
        return 'TIDAK MEMENUHI PIAWAIAN';
    };

    const BAR_COLORS = ['#4F81BD', '#C0504D', '#9BBB59', '#8064A2', '#4BACC6', '#F79646', '#4F81BD', '#C0504D', '#9BBB59', '#8064A2', '#4BACC6', '#F79646'];

    if (!session || !stats) return null;

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const respondentNumbers = Array.from({ length: MAX_RESPONDENTS }, (_, i) => i + 1);

    return (
        <div className="bg-white p-0 max-w-[210mm] mx-auto min-h-[297mm] text-black font-sans print:p-0 text-[11px]">
            <style dangerouslySetInnerHTML={{ __html: "@page { margin: 5mm; }" }} />
            {/* Top Right Reference */}
            <div className="text-right text-[8px] mb-1 font-medium">LABSS/FAKULTI/2022/PIN. 2</div>

            {/* Main Header */}
            <div className="text-center mb-2">
                <h1 className="font-bold uppercase text-[10px] mb-1 tracking-wide leading-tight">LAPORAN ANALISIS BORANG SOAL SELIDIK PENGAJARAN DAN PEMBELAJARAN</h1>
                <div className="bg-orange-100 font-bold uppercase text-[9px] py-0.5 tracking-wide">
                    JABATAN/ PUSAT: JABATAN PENGAJIAN ISLAM, PUSAT MATRIKULASI
                </div>
            </div>

            {/* Section A */}
            <div className="mb-2">
                <h2 className="font-bold mb-1 text-[10px]">A. Butiran Pengajaran</h2>

                <div className="space-y-0.5 text-[9px]">
                    <div className="grid grid-cols-[140px_auto] items-center">
                        <div className="font-medium">Nama Pensyarah</div>
                        <div className="flex w-full">
                            <span className="mr-2">:</span>
                            <div className="bg-orange-100 px-2 w-[50%] uppercase font-medium">{session.lecturers?.name}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-[140px_auto] items-center">
                        <div className="font-medium">Kod & Nama Kursus</div>
                        <div className="flex w-full">
                            <span className="mr-2">:</span>
                            <div className="bg-orange-100 px-2 w-[50%] uppercase font-medium">
                                {session.subjects?.code} - {session.subjects?.name}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-[140px_1fr_120px_1fr] items-center">
                        <div className="font-medium">Sesi Akademik</div>
                        <div className="flex mr-4">
                            <span className="mr-2">:</span>
                            <div className="bg-orange-100 px-2 w-20 uppercase font-medium">II</div>
                        </div>
                        <div className="font-medium">Tahun Akademik</div>
                        <div className="flex">
                            <span className="mr-2">:</span>
                            <div className="bg-orange-100 px-2 w-24 uppercase font-medium">{session.semester_session || '2025/2026'}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-[140px_1fr_120px_1fr] items-center">
                        <div className="font-medium">Jam Kredit</div>
                        <div className="flex mr-4">
                            <span className="mr-2">:</span>
                            <div className="bg-orange-100 px-2 w-20 font-medium">3</div>
                        </div>
                        <div className="font-medium">Jam Pertemuan Seminggu</div>
                        <div className="flex">
                            <span className="mr-2">:</span>
                            <div className="bg-orange-100 px-2 w-24 font-medium">3</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-[140px_auto] items-center">
                        <div className="font-medium">Tempoh Pelaksanaan PdP</div>
                        <div className="flex items-center">
                            <span className="mr-2">:</span>
                            <span className="mr-2 text-[9px]">Dari</span>
                            <div className="bg-orange-100 px-3 min-w-[100px] text-center font-medium">
                                {formatDate(semesterDetails?.semester_start_date)}
                            </div>
                            <span className="mx-2 text-[9px]">Hingga:</span>
                            <div className="bg-orange-100 px-3 min-w-[100px] text-center font-medium">
                                {formatDate(semesterDetails?.semester_end_date)}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-[140px_1fr_120px_1fr] items-center">
                        <div className="font-medium">Jumlah Keseluruhan Pelajar</div>
                        <div className="flex items-center mr-4">
                            <span className="mr-2">:</span>
                            <div className="bg-orange-100 px-2 w-16 text-center font-medium">{totalStudents || 0}</div>
                            <span className="ml-1 text-[9px]">Orang</span>
                        </div>
                        <div className="font-medium">Bilangan Responden</div>
                        <div className="flex items-center">
                            <span className="mr-2">:</span>
                            <div className="bg-orange-100 border border-black px-2 w-16 text-center font-bold">
                                {responses.length}
                            </div>
                            <span className="ml-1 text-[9px]">Orang</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-1 font-bold text-[11px]">
                B. Penilaian : Penilaian pelajar terhadap kursus mengikut komponen di bawah:
            </div>

            {/* Table Styling for fixed 35 columns */}
            <div className="overflow-x-visible">
                <table className="w-full border-collapse border border-black text-[7px] mb-4 table-fixed">
                    <thead>
                        <tr className="bg-white">
                            <th className="border border-black p-0.5 text-center w-[40px] font-bold text-[6px]" rowSpan="2">Komponen</th>
                            <th className="border border-black p-0.5 text-center w-[12px] font-bold text-[6px]" rowSpan="2">Bil</th>
                            <th className="border border-black p-0.5 text-center font-bold text-[6px] w-[180px]" rowSpan="2">Aspek Penilaian</th>
                            <th className="border border-black p-0 text-center" colSpan={MAX_RESPONDENTS}>
                                <div className="border-b border-black p-0.5 font-bold text-[8px]">Bilangan Responden dan Skala/ Markah yang Diberikan</div>
                                <div className="flex divide-x divide-black w-full">
                                    {respondentNumbers.map((num) => (
                                        <div key={num} className="flex-1 p-0.5 text-[7px] text-center">{num}</div>
                                    ))}
                                </div>
                            </th>
                            <th className="border border-black p-0.5 text-center w-[20px] font-bold text-[6px]" rowSpan="2">JUMLAH</th>
                            <th className="border border-black p-0.5 text-center w-[20px] font-bold text-[6px]" rowSpan="2">PURATA</th>
                            <th className="border border-black p-0.5 text-center w-[25px] font-bold text-[6px]" rowSpan="2">PURATA<br />ASPEK</th>
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

                                            {/* Section Average Cell */}
                                            {iIndex === 0 && (
                                                <td className="border border-black p-0.5 text-center font-bold align-middle bg-white" rowSpan={group.items.length}>
                                                    {group.sectionAverage}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                        {/* Overall Mean Row */}
                        {/* Overall Mean Row */}
                        <tr className="bg-white font-bold text-[8px]">
                            <td className="border border-black p-1 text-center uppercase" colSpan="38">JUMLAH MARKAH KESELURUHAN</td>
                            <td className="border border-black p-1 text-center bg-gray-50" colSpan="3">
                                {stats.questionStats.reduce((sum, item) => sum + item.totalScore, 0)}
                            </td>
                        </tr>
                        <tr className="bg-white font-bold text-[8px]">
                            <td className="border border-black p-1 text-center uppercase" colSpan="38">INDEKS PRESTASI PENSYARAH (Maksimum = 60)</td>
                            <td className="border border-black p-1 text-center bg-orange-100" colSpan="3">
                                {stats.performanceIndex}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Legends */}
            <div className="mt-1 text-[8px] text-center font-medium">
                <div className="mb-0.5">Petunjuk Skala / Markah: 1 = Sangat Tidak Bersetuju, 2 = Tidak Bersetuju, 3 = Kurang Pasti, 4 = Bersetuju, 5 = Sangat Bersetuju.</div>
                <div>Petunjuk Indeks Prestasi: 1 - 12 = Tidak Memenuhi Piawaian yang ditetapkan, 13 - 24 = Sederhana, 25 - 36 = Baik, 37 - 48 = Amat Baik, 49 - 60 = Cemerlang.</div>
            </div>

            {/* Section C: Analytics */}
            <div className="mt-2 border-t border-black pt-2">
                <div className="font-bold text-[10px] mb-1">C. Analisis Penilaian Pelaksanaan Pengajaran dan Pembelajaran</div>

                <div className="border border-gray-300 rounded-lg p-1.5 bg-white h-[155px] w-full print:h-[155px] print:w-full">
                    <div className="text-center font-bold text-[8px] mb-1">Markah Purata Penilaian PdP yang dilaksanakan oleh Tenaga Pengajar</div>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={stats.chartData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 7 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 5]} tick={{ fontSize: 7 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ fontSize: '9px' }}
                                formatter={(value) => [value, "Markah Purata"]}
                                labelFormatter={(label, payload) => {
                                    if (payload && payload.length > 0) {
                                        return payload[0].payload.fullQuestion;
                                    }
                                    return label;
                                }}
                            />
                            <Bar dataKey="value" radius={[2, 2, 0, 0]} barSize={18}>
                                {stats.chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Section D: Findings */}
            <div className="mt-2 border-t border-black pt-1">
                <div className="font-bold text-[10px] mb-2">D. Dapatan Analisis Penilaian Soal Selidik PdP</div>

                <div className="flex items-center text-[9px] ml-4 mb-3">
                    <span className="mr-6">Berdasarkan markah yang diberikan oleh pelajar sebagai responden dalam soal selidik ini, didapati prestasi Pegawai Akademik adalah:</span>
                    <span className="font-bold uppercase text-[10px]">{getPerformanceLabel(stats.performanceIndex)}</span>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-4 text-[9px] w-full">
                    <div className="border border-black p-1.5 h-20 relative">
                        <p className="mb-4">Disediakan oleh:</p>
                        <div className="absolute bottom-1.5 left-2 right-2">
                            <p className="mb-0.5">Nama Pegawai Akademik : <span className="uppercase font-bold">{session.lecturers?.name}</span></p>
                            <p>Tarikh : {new Date().toLocaleDateString('en-GB')}</p>
                        </div>
                    </div>

                    <div className="border border-black p-1.5 h-20 relative">
                        <p className="mb-4">Disemak dan disahkan oleh:</p>
                        <div className="absolute bottom-1.5 left-2 right-2 text-[8px] leading-tight">
                            <p className="mb-0.5">Nama Ketua Jabatan / Timbalan Dekan (A & P) / Dekan/Timbalan Naib Canselor Akademik dan Pengantarabangsaan :</p>
                            <p>Tarikh :</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintableFeedbackReport;
