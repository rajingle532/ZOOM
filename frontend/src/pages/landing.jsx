import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snackbar } from '@mui/material';
import {
    Video,
    Zap,
    Shield,
    Globe,
    ArrowRight,
    Copy,
    Lock,
    Play,
    Check
} from 'lucide-react';

import styles from '../styles/landing.module.css';
import { generateRoomCode, parseRoomCode } from '../utils/roomCode';

export default function LandingPage() {
    const navigate = useNavigate();
    const [roomInput, setRoomInput] = useState(() => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return `${origin}/room/${generateRoomCode()}`;
    });
    const [launcherError, setLauncherError] = useState('');
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleJoinGuest = () => {
        const randomRoom = generateRoomCode();
        navigate(`/room/${randomRoom}`);
    };

    const handleCopyRoomLink = async () => {
        const cleanCode = parseRoomCode(roomInput);
        if (!cleanCode) {
            setLauncherError('Enter a valid room code or link');
            return;
        }
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const link = `${origin}/room/${cleanCode}`;
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setToastMessage('Meeting link copied to clipboard!');
            setShowToast(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    };

    const handleLaunchTestRoom = () => {
        const cleanCode = parseRoomCode(roomInput);
        if (!cleanCode) {
            setLauncherError('Enter a valid room code or link');
            return;
        }
        navigate(`/room/${cleanCode}`);
    };

    return (
        <div className={styles.landingWrapper}>
            <div className={styles.emeraldGlowTop} />
            <div className={styles.emeraldGlowBottom} />

            {/* 1. Sticky Glass Navbar */}
            <header className={styles.navbar}>
                <div className={styles.brand} onClick={() => navigate('/')}>
                    <div className={styles.brandIcon}>
                        <Video strokeWidth={1.75} className={styles.logoMarkIcon} />
                    </div>
                    <h1 className={styles.brandTitle}>PulseMeet</h1>
                </div>

                <div className={styles.navLinks}>
                    <button
                        type="button"
                        className={styles.guestBtn}
                        onClick={handleJoinGuest}
                    >
                        Join as Guest
                    </button>
                    <button
                        type="button"
                        className={styles.signInBtn}
                        onClick={() => navigate('/auth')}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        className={styles.getStartedBtn}
                        onClick={() => navigate('/auth')}
                    >
                        <span>Get Started</span>
                        <ArrowRight size={15} strokeWidth={2.2} />
                    </button>
                </div>
            </header>

            {/* 2. Hero Section */}
            <main className={styles.heroSection}>
                <div className={styles.announcementPill}>
                    <span className={styles.pillDot} />
                    <span>Real-Time WebRTC P2P Video & Audio Infrastructure</span>
                </div>

                <h2 className={styles.heroTitle}>
                    Video meetings engineered for <span className={styles.gradientText}>speed</span> and <span className={styles.gradientText}>privacy</span>.
                </h2>

                <p className={styles.heroSubtitle}>
                    High-performance peer-to-peer audio, video, and screen sharing directly in your browser. Powered by WebRTC mesh architecture with sub-100ms latency and zero cloud data risk.
                </p>

                <div className={styles.heroActions}>
                    <button
                        type="button"
                        className={styles.primaryCta}
                        onClick={() => navigate('/auth')}
                    >
                        <span>Start Free Meeting</span>
                        <ArrowRight size={18} strokeWidth={2} />
                    </button>

                    <button
                        type="button"
                        className={styles.secondaryCta}
                        onClick={handleJoinGuest}
                    >
                        <Zap size={18} strokeWidth={1.75} style={{ color: 'var(--pm-primary)' }} />
                        <span>Instant Guest Room</span>
                    </button>
                </div>

                {/* 3. Interactive Room Launcher Card */}
                <div className={styles.launcherCard}>
                    <div className={styles.launcherHeader}>
                        <div className={styles.launcherTitleGroup}>
                            <h3 className={styles.launcherTitle}>Instant Test Room Ready</h3>
                            <p className={styles.launcherSubtitle}>
                                Test audio, video, local recording, and active speaker detection immediately.
                            </p>
                        </div>
                        <div className={styles.liveTag}>
                            <span className={styles.liveDot} />
                            <span>Ready to Connect</span>
                        </div>
                    </div>

                    <div className={styles.launcherInputGroup}>
                        <div className={styles.roomInputWrapper}>
                            <input
                                type="text"
                                value={roomInput}
                                onChange={(e) => {
                                    setRoomInput(e.target.value);
                                    if (launcherError) setLauncherError('');
                                }}
                                placeholder="Enter room code or paste link"
                                className={`${styles.roomInput} ${launcherError ? styles.roomInputError : ''}`}
                            />
                            {launcherError && (
                                <span className={styles.launcherErrorText} role="alert">
                                    {launcherError}
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            className={styles.copyLinkBtn}
                            onClick={handleCopyRoomLink}
                        >
                            {copied ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={1.75} />}
                            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                        </button>

                        <button
                            type="button"
                            className={styles.enterRoomBtn}
                            onClick={handleLaunchTestRoom}
                        >
                            <Play size={16} strokeWidth={2} fill="currentColor" />
                            <span>Enter Room</span>
                        </button>
                    </div>

                    <div className={styles.launcherBadgeGrid}>
                        <div className={styles.launcherBadgeItem}>
                            <Lock size={15} strokeWidth={1.75} className={styles.badgeIconAccent} />
                            <span>Direct P2P Mesh</span>
                        </div>
                        <div className={styles.launcherBadgeItem}>
                            <Zap size={15} strokeWidth={1.75} className={styles.badgeIconAccent} />
                            <span>Sub-100ms Latency</span>
                        </div>
                        <div className={styles.launcherBadgeItem}>
                            <Shield size={15} strokeWidth={1.75} className={styles.badgeIconAccent} />
                            <span>Client-Side WebM Recording</span>
                        </div>
                    </div>
                </div>

                {/* 4. Three-Card Feature Highlights Grid */}
                <section className={styles.featuresGrid}>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIconWrapper}>
                            <Zap size={24} strokeWidth={2} />
                        </div>
                        <h3 className={styles.featureTitle}>Sub-100ms P2P Latency</h3>
                        <p className={styles.featureDesc}>
                            Direct browser-to-browser WebRTC streaming eliminates centralized media relay servers, delivering ultra-responsive video and audio.
                        </p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIconWrapper}>
                            <Shield size={24} strokeWidth={2} />
                        </div>
                        <h3 className={styles.featureTitle}>Local Privacy Recording</h3>
                        <p className={styles.featureDesc}>
                            Built-in MediaRecorder API captures meetings and saves directly onto your local disk with zero cloud data storage.
                        </p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIconWrapper}>
                            <Globe size={24} strokeWidth={2} />
                        </div>
                        <h3 className={styles.featureTitle}>100% Browser Native</h3>
                        <p className={styles.featureDesc}>
                            Zero client downloads, plugins, or extensions required. Simply share your room link to start collaborating immediately.
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
