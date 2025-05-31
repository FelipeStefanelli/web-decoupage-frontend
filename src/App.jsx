import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Decoupage from './pages/Decoupage';
import Script from './pages/Script';
import { VisibilityProvider } from '@/contexts/VisibilityContext';
import './App.css';
import Header from '@/components/Header';
import SideMenu from '@/components/SideMenu';
import LockScreen from './components/LockScreen';
import { useState } from 'react';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ paddingTop: '0px', overflow: 'hidden' }}
            >
              <Decoupage />
            </motion.div>
          }
        />
        <Route
          path="/script"
          element={
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ paddingTop: '0px', overflow: 'hidden' }}
            >
              <Script />
            </motion.div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [unlocked, setUnlocked] = useState(true);
  return (
    <VisibilityProvider>
    <HashRouter>
      {!unlocked && <LockScreen onUnlock={() => setUnlocked(true)} />}
      {unlocked && (
        <>
          <Header />
          <SideMenu />
          <AnimatedRoutes />
        </>
      )}
    </HashRouter>
  </VisibilityProvider>
  );
}

export default App;
