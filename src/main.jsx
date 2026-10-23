import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { GuestLayout, Home, MenuPage, Wifi, Review, Feedback, Offers } from './pages/Guest.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Admin from './pages/Admin.jsx'
import Landing from './pages/Landing.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <BrowserRouter><Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/admin" element={<Admin />} />
    <Route path="/admin/:id" element={<Admin />} />
    <Route path="/:slug" element={<GuestLayout />}>
      <Route index element={<Home />} />
      <Route path="t/:table" element={<Home />} />
      <Route path="menu" element={<MenuPage />} />
      <Route path="wifi" element={<Wifi />} />
      <Route path="review" element={<Review />} />
      <Route path="feedback" element={<Feedback />} />
      <Route path="offers" element={<Offers />} />
    </Route>
  </Routes></BrowserRouter>
)
