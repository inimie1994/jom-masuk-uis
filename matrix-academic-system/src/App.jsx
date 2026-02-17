
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import Login from './pages/Login';
import LecturerLogin from './pages/LecturerLogin';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Lecturers from './pages/Lecturers';
import Subjects from './pages/Subjects';
import Classes from './pages/Classes';
import Enrollment from './pages/Enrollment';
import Timetable from './pages/Timetable';
import Attendance from './pages/Attendance';
import Assessments from './pages/Assessments';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import LecturerDashboard from './pages/LecturerDashboard';
import MyStudents from './pages/MyStudents';
import LecturerTimetable from './pages/LecturerTimetable';

import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/lecturer-login" element={<LecturerLogin />} />

            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="lecturer-dashboard" element={<LecturerDashboard />} />
              <Route path="lecturer-timetable" element={<LecturerTimetable />} />
              <Route path="my-students" element={<MyStudents />} />
              <Route path="my-students" element={<MyStudents />} />
              <Route path="students" element={<Students />} />
              <Route path="lecturers" element={<Lecturers />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="classes" element={<Classes />} />
              <Route path="enrollment" element={<Enrollment />} />
              <Route path="timetable" element={<Timetable />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="assessments" element={<Assessments />} />
              <Route path="reports" element={<Reports />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
