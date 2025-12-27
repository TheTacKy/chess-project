import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Settings from "./pages/Settings";
import Home from "./pages/Home";

function App() {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  };

  useEffect(() => {
    // Check saved theme, default to dark mode
    const savedTheme = localStorage.getItem('theme');
    const shouldBeDark = savedTheme ? savedTheme === 'dark' : true; // Default to dark
    
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <Router>
      <div className="App min-h-screen bg-white dark:bg-neutral-900">
        <div className="flex h-screen">
          {/* Left Sidebar */}
          <Sidebar isDark={isDark} toggleTheme={toggleTheme} />
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-auto bg-gray-200 dark:bg-zinc-800">
            <div className="container mx-auto px-4 py-4 flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/puzzles" element={<div className="p-8"><h1 className="text-2xl font-bold">Puzzles - Coming Soon</h1></div>} />
                <Route path="/news" element={<div className="p-8"><h1 className="text-2xl font-bold">News - Coming Soon</h1></div>} />
              </Routes>
            </div>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
