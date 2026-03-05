import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import DoctorDashboard from './components/DoctorDashboard';
import DoctorProfile from './components/DoctorProfile';
import ChatInterface from './components/chat/ChatInterface';
import BookAppointment from './components/appointments/BookAppointment';
import HealthTracking from './components/health/HealthTracking';
import MedicineReminders from './components/medicines/MedicineReminders';
import VideoConsultation from './components/video/VideoConsultation';
import DoctorVideoConsultation from './components/video/DoctorVideoConsultation';
import Prescriptions from './components/prescriptions/Prescriptions';
import AuthSystem from "./components/auth/AuthSystem";
import DoctorPatientHealth from './components/health/DoctorPatientHealth';
import PatientDashboard from './components/PatientDashboard';
import PatientProfile from './components/PatientProfile';
import DoctorDetailPage from './components/DoctorDetailPage';
import AllDoctors from './components/AllDoctors';
import PharmacistDashboard from './components/PharmacistDashboard';
import PharmacistHomepage from './components/PharmacistHomepage';
import PharmacyProductDetail from './components/PharmacyProductDetail';
import ShoppingCart from './components/ShoppingCart';
import PharmacyBrowse from './components/PharmacyBrowse';
import Orders from './components/Orders';
import Patientprescriptions from './components/prescriptions/Patientprescriptions';
import PharmacistProfile from './components/PharmacistProfile'; // ← NEW

import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/auth" element={<AuthSystem />} />
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/chat" element={<ChatInterface />} />
          <Route path="/appointments" element={<BookAppointment />} />
          <Route path="/medicines" element={<MedicineReminders />} />
          <Route path="/teleconsult" element={<VideoConsultation />} />
          <Route path="/health-tracking" element={<HealthTracking />} />
          <Route path="/prescriptions" element={<Prescriptions />} />
          <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor-profile" element={<DoctorProfile />} />
          <Route path="/doctor-video" element={<DoctorVideoConsultation />} />
          <Route path="/doctor-patient-health" element={<DoctorPatientHealth />} />
          <Route path="/patient-profile" element={<PatientProfile />} />

          {/* Patient Prescriptions routes */}
          <Route path="/patient/prescriptions" element={<Patientprescriptions />} />
          <Route path="/patient/prescriptions/:id" element={<Patientprescriptions />} />

          {/* Pharmacist routes */}
          <Route path="/pharmacist-dashboard" element={<PharmacistDashboard />} />
          <Route path="/pharmacist-profile" element={<PharmacistProfile />} /> {/* ← NEW */}
          <Route path="/pharmacy-home" element={<PharmacistHomepage />} />

          {/* Pharmacy browse route */}
          <Route path="/pharmacy/browse" element={<PharmacyBrowse />} />

          {/* Doctor viewing routes */}
          <Route path="/doctors" element={<AllDoctors />} />
          <Route path="/doctor-detail/:doctorId" element={<DoctorDetailPage />} />

          <Route path="/pharmacy/product/:productId" element={<PharmacyProductDetail />} />
          <Route path="/cart" element={<ShoppingCart />} />
          <Route path="/orders" element={<Orders />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;