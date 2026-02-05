import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import CoinDetail from "./pages/CoinDetail.jsx";
import CoinTraining from "./pages/CoinTraining.jsx";
import CoinForecast from "./pages/CoinForecast.jsx";
import Navbar from "./components/Navbar.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Profile from "./pages/Profile.jsx";
import History from "./pages/History.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import About from "./pages/About.jsx";
import TopNews from "./pages/TopNews.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  return (
    <div className="min-h-screen text-white">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route
          path="/news"
          element={
            <ProtectedRoute>
              <TopNews />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/coin/:slug"
          element={
            <ProtectedRoute>
              <CoinDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coin/:slug/training"
          element={
            <ProtectedRoute>
              <CoinTraining />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coin/:slug/forecast"
          element={
            <ProtectedRoute>
              <CoinForecast />
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
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<div className="p-8">Page not found</div>} />
      </Routes>
    </div>
  );
}

export default App;

