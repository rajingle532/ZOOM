import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, Snackbar } from '@mui/material';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import BoltIcon from '@mui/icons-material/Bolt';
import ShieldIcon from '@mui/icons-material/Shield';
import LanguageIcon from '@mui/icons-material/Language';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LockIcon from '@mui/icons-material/Lock';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import styles from '../styles/landing.module.css';

export default function LandingPage() {
    const navigate = useNavigate();
    const [testRoomCode] = useState(() => Math.random().toString(36).substring(2, 8));
    const [toastMessage, setToastMessage] = useState("");
    const [showToast, setShowToast] = useState(false);

    const handleJoinGuest = () => {
        const randomRoom = Math.random().toString(36).substring(2, 8);
        navigate(`/${randomRoom}`);
    };

    const handleCopyRoomLink = async () => {
        const link = `${window.location.origin}/${testRoomCode}`;
        try {
            await navigator.clipboard.writeText(link);
            setToastMessage("Room link copied to clipboard!");
            setShowToast(true);
        } catch {
            // fallback
        }
    };

    const handleLaunchTestRoom = () => {
        navigate(`/${testRoomCode}`);
    };

    return (
        <div className={styles.landingWrapper}>
            {/* 1. Sticky Navbar */}
            <header className={styles.navbar}>
                <div className={styles.brand} onClick={() => navigate("/")}>
                    <div className={styles.logoIcon}>
                        <VideocamRoundedIcon sx={{ fontSize: 22 }} />
                    </div>
                    <h1 className={styles.brandTitle}>PulseMeet</h1>
                </div>

                <div className={styles.navLinks}>
                    <Button
                        variant="text"
                        onClick={handleJoinGuest}
                        sx={{
                            color: 'var(--pm-text-secondary, #b4b4c7)',
                            textTransform: 'none',
                            borderRadius: '20px',
                            px: 2,
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            '&:hover': { color: '#ffffff' }
                        }}
                    >
                        Join as Guest
                    </Button>
                    <Button
                        variant="text"
                        onClick={() => navigate("/auth")}
                        sx={{
                            color: 'var(--pm-text-secondary, #b4b4c7)',
                            textTransform: 'none',
                            px: 2,
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            '&:hover': { color: '#ffffff' }
                        }}
                    >
                        Sign In
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => navigate("/auth")}
                        sx={{
                            background: 'var(--pm-primary, #635bff)',
                            color: '#fff',
                            textTransform: 'none',
                            borderRadius: '24px',
                            px: 2.5,
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            boxShadow: '0 4px 14px rgba(99, 91, 255, 0.35)',
                            '&:hover': { background: 'var(--pm-primary-hover, #7c75ff)' }
                        }}
                    >
                        Get Started
                    </Button>
                </div>
            </header>

            {/* 2. Hero Section */}
            <main className={styles.heroSection}>
                <div className={styles.announcementPill}>
                    <span>✨ Real-Time WebRTC P2P Video & Audio Infrastructure</span>
                </div>

                <h2 className={styles.heroTitle}>
                    Video meetings engineered for <span className={styles.gradientText}>speed</span> and <span className={styles.gradientText}>privacy</span>.
                </h2>

                <p className={styles.heroSubtitle}>
                    High-performance peer-to-peer audio, video, and screen sharing directly in your browser. Powered by WebRTC mesh architecture with sub-100ms latency and zero cloud data risk.
                </p>

                <div className={styles.heroActions}>
                    <Button
                        variant="contained"
                        size="large"
                        className={styles.primaryCta}
                        onClick={() => navigate("/auth")}
                        endIcon={<ArrowForwardIcon />}
                    >
                        Start Free Meeting
                    </Button>

                    <Button
                        variant="outlined"
                        size="large"
                        className={styles.secondaryCta}
                        onClick={handleJoinGuest}
                        startIcon={<BoltIcon sx={{ color: 'var(--pm-teal, #00d4aa)' }} />}
                    >
                        Instant Guest Room
                    </Button>
                </div>

                {/* 3. Interactive Room Launcher Box */}
                <div className={styles.launcherCard}>
                    <div className={styles.launcherHeader}>
                        <div className={styles.launcherTitleGroup}>
                            <h3 className={styles.launcherTitle}>Instant Test Room Ready</h3>
                            <p className={styles.launcherSubtitle}>
                                Test audio, video, recording, and active speaker detection immediately.
                            </p>
                        </div>
                        <div className={styles.liveTag}>
                            <span>● Ready to Connect</span>
                        </div>
                    </div>

                    <div className={styles.launcherInputGroup}>
                        <TextField
                            fullWidth
                            value={`${window.location.origin}/${testRoomCode}`}
                            size="small"
                            InputProps={{
                                readOnly: true,
                                style: { color: 'var(--pm-text-primary, #ffffff)', fontSize: '0.92rem', fontFamily: 'monospace' }
                            }}
                            sx={{
                                bgcolor: 'var(--pm-surface-elevated, #242433)',
                                borderRadius: '12px',
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' }
                                }
                            }}
                        />

                        <Button
                            variant="outlined"
                            onClick={handleCopyRoomLink}
                            startIcon={<ContentCopyIcon />}
                            sx={{
                                color: 'var(--pm-text-secondary, #b4b4c7)',
                                borderColor: 'rgba(255, 255, 255, 0.15)',
                                textTransform: 'none',
                                borderRadius: '12px',
                                px: 2.2,
                                py: 1.1,
                                whiteSpace: 'nowrap',
                                fontWeight: 600,
                                '&:hover': { color: '#fff', borderColor: '#fff' }
                            }}
                        >
                            Copy Link
                        </Button>

                        <Button
                            variant="contained"
                            onClick={handleLaunchTestRoom}
                            startIcon={<PlayArrowIcon />}
                            sx={{
                                background: 'var(--pm-primary, #635bff)',
                                color: '#ffffff',
                                textTransform: 'none',
                                borderRadius: '12px',
                                px: 2.8,
                                py: 1.1,
                                whiteSpace: 'nowrap',
                                fontWeight: 700,
                                boxShadow: '0 4px 14px rgba(99, 91, 255, 0.35)',
                                '&:hover': { background: 'var(--pm-primary-hover, #7c75ff)' }
                            }}
                        >
                            Enter Room
                        </Button>
                    </div>

                    <div className={styles.launcherBadgeGrid}>
                        <div className={styles.launcherBadgeItem}>
                            <LockIcon sx={{ fontSize: 16, color: 'var(--pm-teal, #00d4aa)' }} />
                            <span>Direct P2P Mesh</span>
                        </div>
                        <div className={styles.launcherBadgeItem}>
                            <BoltIcon sx={{ fontSize: 16, color: 'var(--pm-primary, #635bff)' }} />
                            <span>Sub-100ms Latency</span>
                        </div>
                        <div className={styles.launcherBadgeItem}>
                            <ShieldIcon sx={{ fontSize: 16, color: 'var(--pm-amber, #ffb347)' }} />
                            <span>Client-Side Recording</span>
                        </div>
                    </div>
                </div>

                {/* 4. Three-Card Feature Highlights Grid */}
                <section className={styles.featuresGrid}>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIconWrapper} style={{ background: 'rgba(99, 91, 255, 0.15)', color: 'var(--pm-primary, #635bff)' }}>
                            <BoltIcon sx={{ fontSize: 26 }} />
                        </div>
                        <h3 className={styles.featureTitle}>Sub-100ms P2P Latency</h3>
                        <p className={styles.featureDesc}>
                            Direct browser-to-browser WebRTC streaming eliminates centralized media relay servers, giving you silky smooth video and audio.
                        </p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIconWrapper} style={{ background: 'rgba(0, 212, 170, 0.15)', color: 'var(--pm-teal, #00d4aa)' }}>
                            <ShieldIcon sx={{ fontSize: 26 }} />
                        </div>
                        <h3 className={styles.featureTitle}>Local Privacy Recording</h3>
                        <p className={styles.featureDesc}>
                            Built-in browser MediaRecorder API captures meetings and saves directly as WebM files onto your local disk with zero cloud data storage.
                        </p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIconWrapper} style={{ background: 'rgba(255, 179, 71, 0.15)', color: 'var(--pm-amber, #ffb347)' }}>
                            <LanguageIcon sx={{ fontSize: 26 }} />
                        </div>
                        <h3 className={styles.featureTitle}>100% Browser Native</h3>
                        <p className={styles.featureDesc}>
                            Zero client downloads, extensions, or account requirements for guests. Simply share your room link to start collaborating immediately.
                        </p>
                    </div>
                </section>

                {/* 5. Production Metrics Strip */}
                <div className={styles.statsStrip}>
                    <div className={styles.statItem}>
                        <span className={styles.statNumber}>&lt;100ms</span>
                        <span className={styles.statLabel}>Mesh P2P Latency</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statNumber}>0 Bytes</span>
                        <span className={styles.statLabel}>Cloud Video Stored</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statNumber}>100%</span>
                        <span className={styles.statLabel}>Browser Native WebRTC</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statNumber}>0</span>
                        <span className={styles.statLabel}>App Installs Required</span>
                    </div>
                </div>
            </main>

            {/* 6. Minimalist SaaS Footer */}
            <footer className={styles.footer}>
                <div>
                    <strong>PulseMeet</strong> &copy; {new Date().getFullYear()} — Real-Time Peer-to-Peer Communication Platform.
                </div>
                <div>
                    Built with WebRTC, Socket.io, React & Node.js
                </div>
            </footer>

            <Snackbar
                open={showToast}
                autoHideDuration={3500}
                onClose={() => setShowToast(false)}
                message={toastMessage}
            />
        </div>
    );
}
