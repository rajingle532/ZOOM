import React, { useContext, useEffect, useState } from 'react';
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import {
    Button,
    TextField,
    Avatar,
    Snackbar,
    InputAdornment,
    Typography
} from '@mui/material';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BoltIcon from '@mui/icons-material/Bolt';
import ShieldIcon from '@mui/icons-material/Shield';
import StorageIcon from '@mui/icons-material/Storage';

import { AuthContext } from '../contexts/AuthContext';
import styles from '../styles/home.module.css';

function HomeComponent() {
    const navigate = useNavigate();
    const { userData, addToUserHistory, getHistoryOfUser } = useContext(AuthContext);

    const [meetingCode, setMeetingCode] = useState("");
    const [recentMeetings, setRecentMeetings] = useState([]);
    const [toastMessage, setToastMessage] = useState("");
    const [showToast, setShowToast] = useState(false);

    // Fetch user recent meeting history on load
    useEffect(() => {
        const fetchRecentHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                if (Array.isArray(history)) {
                    // Show up to 4 most recent meetings
                    setRecentMeetings(history.slice(0, 4));
                }
            } catch (err) {
                console.warn("Could not fetch recent meetings:", err);
            }
        };

        fetchRecentHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const displayName = userData?.name || userData?.username || "Friend";

    // 1. One-Click Instant Meeting
    const handleStartInstantMeeting = async () => {
        const randomCode = Math.random().toString(36).substring(2, 8);
        try {
            await addToUserHistory(randomCode);
        } catch (err) {
            console.error("Failed to add to history", err);
        }

        // Copy link to clipboard
        const meetingUrl = `${window.location.origin}/${randomCode}`;
        try {
            await navigator.clipboard.writeText(meetingUrl);
            setToastMessage(`Meeting link copied! Joining room...`);
            setShowToast(true);
        } catch {
            // fallback
        }

        setTimeout(() => {
            navigate(`/${randomCode}`);
        }, 300);
    };

    // 2. Join with Code
    const handleJoinWithCode = async (e) => {
        if (e) e.preventDefault();
        const code = meetingCode.trim();
        if (!code) {
            setToastMessage("Please enter a valid meeting code.");
            setShowToast(true);
            return;
        }

        // Extract code if user pasted a full URL
        let cleanCode = code;
        if (code.includes("/")) {
            cleanCode = code.split("/").filter(Boolean).pop();
        }

        try {
            await addToUserHistory(cleanCode);
        } catch (err) {
            console.error("Failed to record meeting to history", err);
        }

        navigate(`/${cleanCode}`);
    };

    const handleRejoinMeeting = async (code) => {
        try {
            await addToUserHistory(code);
        } catch (err) {
            console.error(err);
        }
        navigate(`/${code}`);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/auth");
    };

    const formatDate = (dateString) => {
        if (!dateString) return "Recently";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div className={styles.homeWrapper}>
            {/* 1. Header Navigation */}
            <header className={styles.navbar}>
                <div className={styles.brand} onClick={() => navigate("/home")}>
                    <div className={styles.logoIcon}>
                        <VideocamRoundedIcon sx={{ fontSize: 22 }} />
                    </div>
                    <h1 className={styles.brandTitle}>PulseMeet</h1>
                </div>

                <div className={styles.navRight}>
                    <div className={styles.userBadge}>
                        <Avatar className={styles.userAvatar}>
                            {displayName.charAt(0).toUpperCase()}
                        </Avatar>
                        <span className={styles.userName}>{displayName}</span>
                    </div>

                    <Button
                        variant="text"
                        onClick={() => navigate("/history")}
                        startIcon={<HistoryIcon />}
                        sx={{
                            color: 'var(--pm-text-secondary, #b4b4c7)',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            '&:hover': { color: '#ffffff' }
                        }}
                    >
                        History
                    </Button>

                    <Button
                        variant="outlined"
                        onClick={handleLogout}
                        startIcon={<LogoutIcon />}
                        sx={{
                            color: 'var(--pm-danger, #ff5c5c)',
                            borderColor: 'rgba(255, 92, 92, 0.3)',
                            textTransform: 'none',
                            borderRadius: '20px',
                            fontWeight: 600,
                            fontSize: '0.84rem',
                            px: 1.8,
                            '&:hover': {
                                borderColor: 'var(--pm-danger, #ff5c5c)',
                                bgcolor: 'rgba(255, 92, 92, 0.1)'
                            }
                        }}
                    >
                        Logout
                    </Button>
                </div>
            </header>

            {/* 2. Main Dashboard Content */}
            <main className={styles.mainContainer}>
                <div className={styles.welcomeHeader}>
                    <div>
                        <h2 className={styles.welcomeTitle}>
                            Welcome back, {displayName} 👋
                        </h2>
                        <p className={styles.welcomeSubtitle}>
                            Start a new instant video meeting or enter a code to join an ongoing call.
                        </p>
                    </div>

                    <div className={styles.statusPill}>
                        <div className={styles.statusPulse} />
                        <span>WebRTC Mesh Ready</span>
                    </div>
                </div>

                {/* Quick Action Cards Grid */}
                <div className={styles.actionCardsGrid}>
                    {/* Card 1: Instant Meeting */}
                    <div className={styles.actionCard}>
                        <div>
                            <div className={styles.cardIconCircle} style={{ background: 'rgba(99, 91, 255, 0.15)', color: 'var(--pm-primary, #635bff)' }}>
                                <VideoCallIcon sx={{ fontSize: 28 }} />
                            </div>
                            <h3 className={styles.cardTitle}>Instant Meeting</h3>
                            <p className={styles.cardDesc}>
                                Launch a new room with sub-100ms latency. The invite link is copied to your clipboard automatically.
                            </p>
                        </div>
                        <Button
                            variant="contained"
                            fullWidth
                            size="large"
                            className={styles.instantMeetingBtn}
                            onClick={handleStartInstantMeeting}
                            startIcon={<VideoCallIcon />}
                        >
                            Start Instant Meeting
                        </Button>
                    </div>

                    {/* Card 2: Join with Code */}
                    <div className={styles.actionCard}>
                        <div>
                            <div className={styles.cardIconCircle} style={{ background: 'rgba(0, 212, 170, 0.15)', color: 'var(--pm-teal, #00d4aa)' }}>
                                <KeyboardIcon sx={{ fontSize: 26 }} />
                            </div>
                            <h3 className={styles.cardTitle}>Join with Code</h3>
                            <p className={styles.cardDesc}>
                                Enter a 6-character room code or paste the full meeting link to enter the lobby and test your devices.
                            </p>
                        </div>

                        <form onSubmit={handleJoinWithCode} className={styles.joinInputGroup}>
                            <TextField
                                fullWidth
                                placeholder="e.g. abc-123 or paste link"
                                value={meetingCode}
                                onChange={(e) => setMeetingCode(e.target.value)}
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <KeyboardIcon sx={{ color: 'var(--pm-text-tertiary, #6c6c80)', fontSize: 18 }} />
                                        </InputAdornment>
                                    )
                                }}
                                sx={{
                                    bgcolor: 'var(--pm-surface-elevated, #242433)',
                                    borderRadius: '10px',
                                    input: { color: '#fff', fontSize: '0.9rem' },
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '10px',
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.08)' },
                                        '&:hover fieldset': { borderColor: 'var(--pm-teal, #00d4aa)' },
                                        '&.Mui-focused fieldset': { borderColor: 'var(--pm-teal, #00d4aa)' }
                                    }
                                }}
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                className={styles.joinBtn}
                            >
                                Join
                            </Button>
                        </form>
                    </div>
                </div>

                {/* 3. Platform Highlights Metrics Bar */}
                <div className={styles.platformMetricsGrid}>
                    <div className={styles.metricCard}>
                        <div className={styles.metricIcon} style={{ color: 'var(--pm-primary, #635bff)' }}>
                            <BoltIcon />
                        </div>
                        <div className={styles.metricText}>
                            <span className={styles.metricLabel}>P2P Mesh WebRTC</span>
                            <span className={styles.metricValue}>Sub-100ms Latency</span>
                        </div>
                    </div>

                    <div className={styles.metricCard}>
                        <div className={styles.metricIcon} style={{ color: 'var(--pm-teal, #00d4aa)' }}>
                            <ShieldIcon />
                        </div>
                        <div className={styles.metricText}>
                            <span className={styles.metricLabel}>Client-Side Encryption</span>
                            <span className={styles.metricValue}>Direct Browser Streams</span>
                        </div>
                    </div>

                    <div className={styles.metricCard}>
                        <div className={styles.metricIcon} style={{ color: 'var(--pm-amber, #ffb347)' }}>
                            <StorageIcon />
                        </div>
                        <div className={styles.metricText}>
                            <span className={styles.metricLabel}>Zero Cloud Risk</span>
                            <span className={styles.metricValue}>Local WebM Recording</span>
                        </div>
                    </div>
                </div>

                {/* 4. Recent Meetings History Section */}
                <section className={styles.recentSection}>
                    <div className={styles.recentSectionHeader}>
                        <h3 className={styles.recentSectionTitle}>Recent Meetings</h3>
                        <span className={styles.viewAllLink} onClick={() => navigate("/history")}>
                            View All History →
                        </span>
                    </div>

                    {recentMeetings.length === 0 ? (
                        <div className={styles.emptyRecent}>
                            <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5, color: 'var(--pm-text-secondary, #b4b4c7)' }}>
                                No recent meetings yet
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'var(--pm-text-tertiary, #6c6c80)' }}>
                                Start an instant meeting or join with a code to see your session history here.
                            </Typography>
                        </div>
                    ) : (
                        <div className={styles.recentList}>
                            {recentMeetings.map((meeting, index) => (
                                <div key={meeting._id || index} className={styles.recentItem}>
                                    <div className={styles.recentCodeGroup}>
                                        <span className={styles.recentCode}>
                                            {meeting.meetingCode}
                                        </span>
                                        <span className={styles.recentDate}>
                                            {formatDate(meeting.date)}
                                        </span>
                                    </div>

                                    <div className={styles.recentActions}>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/${meeting.meetingCode}`);
                                                setToastMessage("Room link copied to clipboard!");
                                                setShowToast(true);
                                            }}
                                            sx={{
                                                color: 'var(--pm-text-secondary, #b4b4c7)',
                                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                                textTransform: 'none',
                                                borderRadius: '8px',
                                                minWidth: 'auto',
                                                px: 1.5,
                                                '&:hover': { color: '#fff', borderColor: '#fff' }
                                            }}
                                        >
                                            <ContentCopyIcon sx={{ fontSize: 16 }} />
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            onClick={() => handleRejoinMeeting(meeting.meetingCode)}
                                            endIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />}
                                            sx={{
                                                color: 'var(--pm-primary-hover, #7c75ff)',
                                                borderColor: 'rgba(99, 91, 255, 0.3)',
                                                textTransform: 'none',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                '&:hover': {
                                                    borderColor: 'var(--pm-primary, #635bff)',
                                                    bgcolor: 'rgba(99, 91, 255, 0.1)'
                                                }
                                            }}
                                        >
                                            Re-join
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <Snackbar
                open={showToast}
                autoHideDuration={3500}
                onClose={() => setShowToast(false)}
                message={toastMessage}
            />
        </div>
    );
}

export default withAuth(HomeComponent);
