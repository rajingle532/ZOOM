import './App.css';
import { Route, BrowserRouter as Router, Routes, useParams, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import LandingPage from './pages/landing';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import VideoMeetComponent from './pages/VideoMeet';
import HomeComponent from './pages/home';
import History from './pages/history';
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/common/ErrorBoundary';
import { parseRoomCode } from './utils/roomCode';

/**
 * Validates room code parameter before rendering VideoMeet.
 * Invalid codes redirect cleanly to 404.
 */
function RoomRoute() {
    const { code } = useParams();
    const validCode = parseRoomCode(code);

    if (!validCode) {
        return <Navigate to="/404" replace />;
    }

    return <VideoMeetComponent />;
}

/**
 * Backward compatibility route for legacy /:url links.
 * Redirects valid room codes to standardized /room/:code path;
 * invalid codes redirect cleanly to 404.
 */
function LegacyRoomRedirect() {
    const { url } = useParams();
    const validCode = parseRoomCode(url);

    if (!validCode) {
        return <Navigate to="/404" replace />;
    }

    return <Navigate to={`/room/${validCode}`} replace />;
}

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <ErrorBoundary>
                <div className="App">
                    <Router>
                        <AuthProvider>
                            <Routes>
                                <Route path='/' element={<LandingPage />} />
                                <Route path='/auth' element={<Authentication />} />
                                <Route path='/home' element={<HomeComponent />} />
                                <Route path='/history' element={<History />} />
                                <Route path='/room/:code' element={<RoomRoute />} />
                                <Route path='/room' element={<Navigate to="/404" replace />} />
                                <Route path='/404' element={<NotFound />} />
                                <Route path='/:url' element={<LegacyRoomRedirect />} />
                                <Route path='*' element={<NotFound />} />
                            </Routes>
                        </AuthProvider>
                    </Router>
                </div>
            </ErrorBoundary>
        </ThemeProvider>
    );
}

export default App;
