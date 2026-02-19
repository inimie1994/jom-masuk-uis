import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

const QUESTIONS = [
    "Perancangan dan penyediaan kursus ini adalah baik",
    "Pegawai akademik mempunyai pengetahuan yang mendalam tentang kursus",
    "Pegawai akademik mempunyai kemahiran dalam penyampaian kandungan kursus",
    "Pegawai akademik menggunakan maklumat yang relevan dan terkini",
    "Pegawai akademik merangsang minat pelajar dengan kreatif dan inovatif",
    "Pegawai akademik berinteraksi dengan baik dan bersedia membantu pelajar",
    "Pegawai akademik menggunakan bahan bantu mengajar yang bersesuaian",
    "Kaedah dan strategi penilaian kursus adalah bersesuaian (tugasan/ ujian/ amali/ peperiksaan akhir/ dll.)",
    "Pemarkahan yang diberikan oleh pegawai akademik adalah telus dan adil",
    "Penampilan pegawai akademik adalah baik",
    "Pegawai akademik mengamalkan ketepatan waktu",
    "Pegawai akademik bermotivasi dan menerapkan nilai-nilai Islam"
];

const StudentFeedbackForm = () => {
    const { sessionId } = useParams();
    const [sessionDetails, setSessionDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);
    const [ratings, setRatings] = useState(new Array(QUESTIONS.length).fill(null));

    useEffect(() => {
        if (sessionId) {
            fetchSessionDetails();
        }
    }, [sessionId]);

    const fetchSessionDetails = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('feedback_sessions')
                .select(`
                    *,
                    lecturers (name),
                    subjects (code, name)
                `)
                .eq('id', sessionId)
                .single();

            if (error) throw error;
            if (!data.is_active) throw new Error("This feedback session is no longer active.");

            setSessionDetails(data);
        } catch (err) {
            console.error("Error fetching session:", err);
            setError(err.message || "Failed to load feedback session. Please check the link.");
        } finally {
            setLoading(false);
        }
    };

    const handleRatingChange = (questionIndex, value) => {
        const newRatings = [...ratings];
        newRatings[questionIndex] = value;
        setRatings(newRatings);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (ratings.some(r => r === null)) {
            alert("Please answer all questions before submitting.");
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('feedback_responses')
                .insert([
                    {
                        session_id: sessionId,
                        ratings: ratings,
                        created_at: new Date().toISOString()
                    }
                ]);

            if (error) throw error;
            setSubmitted(true);
        } catch (err) {
            console.error("Error submitting feedback:", err);
            alert("Failed to submit feedback. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <Loader className="animate-spin text-indigo-600 mb-4" size={32} />
                <p className="text-gray-500">Loading feedback form...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center">
                    <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Unavailable</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center animate-in zoom-in duration-300">
                    <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
                    <p className="text-gray-600 mb-6">Your feedback has been submitted successfully.</p>
                    <div className="p-4 bg-green-50 rounded-xl">
                        <p className="text-sm text-green-800 font-medium">You may close this window now.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div className="bg-indigo-600 px-6 py-8 text-white text-center">
                        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Lecturer Feedback</h1>
                        <p className="opacity-90">Please rate your experience honestly.</p>
                    </div>
                    <div className="p-6 sm:p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div>
                                <p className="text-gray-500 uppercase tracking-wide text-xs font-bold mb-1">Lecturer</p>
                                <p className="font-semibold text-gray-900 text-lg">{sessionDetails?.lecturers?.name}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 uppercase tracking-wide text-xs font-bold mb-1">Subject</p>
                                <p className="font-semibold text-gray-900 text-lg">
                                    <span className="text-indigo-600 mr-2">{sessionDetails?.subjects?.code}</span>
                                    {sessionDetails?.subjects?.name}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {QUESTIONS.map((question, index) => (
                        <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 transition-all hover:shadow-md">
                            <div className="flex items-start gap-4 mb-6">
                                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-full font-bold text-sm">
                                    {index + 1}
                                </span>
                                <h3 className="text-gray-900 font-medium text-lg leading-relaxed">{question}</h3>
                            </div>

                            <div className="ml-0 sm:ml-12">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50 rounded-xl p-4 sm:px-6">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:block">Sangat Tidak Setuju</div>

                                    <div className="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-4">
                                        {[1, 2, 3, 4, 5].map((value) => (
                                            <div key={value} className="flex flex-col items-center">
                                                <label className="relative group cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={`q-${index}`}
                                                        value={value}
                                                        checked={ratings[index] === value}
                                                        onChange={() => handleRatingChange(index, value)}
                                                        className="peer sr-only"
                                                    />
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full border-2 border-gray-200 bg-white text-gray-400 font-bold transition-all peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:text-white group-hover:border-indigo-300">
                                                        {value}
                                                    </div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:block">Sangat Setuju</div>

                                    <div className="flex justify-between w-full sm:hidden pt-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Tidak Setuju</span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Setuju</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-1 disabled:opacity-70 disabled:transform-none"
                        >
                            {submitting ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                    </div>
                </form>

                <div className="mt-12 text-center">
                    <p className="text-gray-400 text-sm">© 2026 Matrix Academic System. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default StudentFeedbackForm;
