import { Routes, Route, Navigate } from 'react-router-dom'
import BoardPage from './pages/BoardPage'
import GuestPage from './pages/GuestPage'
import AdminPage from './pages/AdminPage'
import Fireworks from './components/Fireworks'

export default function App() {
  return (
    <>
      {/* Deux nappes fixes pour la profondeur du fond, puis les feux par-dessus. */}
      <div className="ambient" aria-hidden="true">
        <span />
        <span />
      </div>
      <Fireworks />
      <Routes>
        <Route path="/" element={<BoardPage />} />
        <Route path="/moi/:slug" element={<GuestPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
