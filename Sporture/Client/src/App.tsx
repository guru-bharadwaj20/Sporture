// Client/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./components/pages/LandingPage";
import Login from "./components/pages/Login";
import Register from "./components/pages/Register";
import Dashboard from "./components/pages/dashboard";
import Profile from "./components/pages/profile";
import Feedback from "./components/pages/feedback";
import EventDiscovery from "./components/pages/EventDiscovery";
import EventDetails from "./components/pages/EventDetails";
import CreateEvent from "./components/pages/CreateEvent";
import Reminders from "./components/pages/Reminders";
import ProtectedRoute from "./components/utils/ProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { ToastProvider } from "./components/common/ToastProvider";

function App() {
  return (
    // ErrorBoundary is outermost so a crash anywhere below still renders a
    // recoverable page rather than a blank document.
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Anyone can view events */}
        <Route path="/events" element={<EventDiscovery />} />
        <Route path="/events/:id" element={<EventDetails />} />
        
        {/* Protected Routes - Require Authentication */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/feedback" 
          element={
            <ProtectedRoute>
              <Feedback />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/create-event" 
          element={
            <ProtectedRoute>
              <CreateEvent />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reminders" 
          element={
            <ProtectedRoute>
              <Reminders />
            </ProtectedRoute>
          } 
        />
          </Routes>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;