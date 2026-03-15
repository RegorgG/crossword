import React from 'react';
import ReactDOM from "react-dom/client";
import {
    BrowserRouter as Router,
    Navigate,
    Routes,
    Route,
} from 'react-router-dom';
import Parser from './parser';
import './index.css';

function App() {
    return <Router>
        <Routes>
            <Route path="/" element={<Parser />} />
            <Route path="/parser" element={<Navigate to="/" />} />
            <Route path="/index.html" element={<Navigate to="/" />} />
            <Route path="/document.html" element={<Navigate to="/" />} />
        </Routes>
    </Router>;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
