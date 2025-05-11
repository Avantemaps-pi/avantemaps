// src/components/LoadingScreen.jsx
import React from 'react';
import './LoadingScreen.css'; // Import corresponding CSS

const LoadingScreen = () => (
  <div className="loading-screen">
    <img src="/loading-icon.svg" alt="Loading..." className="loading-icon" />
  </div>
);

export default LoadingScreen;
