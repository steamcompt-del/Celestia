import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Host from './pages/Host';
import Join from './pages/Join';
import Room from './pages/Room';

function App() {
    return (
        <BrowserRouter>
            <div className="app">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/host/:token" element={<Host />} />
                    <Route path="/join/:token" element={<Join />} />
                    <Route path="/room/:token" element={<Room />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;
