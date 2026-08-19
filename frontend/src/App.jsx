import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import ResumeUpload from './pages/ResumeUpload';
import RoundSelection from './pages/RoundSelection';
import ResumeRound from './pages/ResumeRound';
import CodingRound from './pages/CodingRound';
import CSFundamentalsRound from './pages/CSFundamentalsRound';
import FinalReport from './pages/FinalReport';
import RoundReport from './pages/RoundReport';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/upload" element={<ResumeUpload />} />
        <Route path="/rounds" element={<RoundSelection />} />
        <Route path="/round/resume" element={<ResumeRound />} />
        <Route path="/round/coding" element={<CodingRound />} />
        <Route path="/round/cs-fundamentals" element={<CSFundamentalsRound />} />
        <Route path="/report/combined" element={<FinalReport />}
         />
        <Route path="/report/round/:sessionId" element={<RoundReport />} />
      </Routes>
    </BrowserRouter>
  );
}