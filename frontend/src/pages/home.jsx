import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snackbar } from '@mui/material';
import {
    Video,
    Zap,
    Keyboard,
    History,
    LogOut,
    ArrowRight,
    Copy,
    Check,
    Shield,
    HardDrive,
    Mail,
    X,
    Loader2
} from 'lucide-react';

import withAuth from '../utils/withAuth';
import { AuthContext } from '../contexts/AuthContext';
import { generateRoomCode, parseRoomCode } from '../utils/roomCode';
import styles from '../styles/home.module.css';

function HomeComponent() {
    const navigate = useNavigate();
    const {
        userData,
        addToUserHistory,
        getHistoryOfUser,
        sendVerification,
        verifyEmail,
        addEmail
    } = useContext(AuthContext);

    const [meetingCode, setMeetingCode] = useState('');
    const [joinError, setJoinError] = useState('');
    const [recentMeetings, setRecentMeetings] = useState([]);
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);

    // Verification & Add Email Modal States
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyCode, setVerifyCode] = useState('');
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyError, setVerifyError] = useState('');

    const [showAddEmailModal, setShowAddEmailModal] = useState(false);
    const [newEmailInput, setNewEmailInput] = useState('');
    const [addEmailLoading, setAddEmailLoading] = useState(false);
    const [addEmailError, setAddEmailError] = useState('');

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
                console.warn('Could not fetch recent meetings:', err);
            }
        };

        fetchRecentHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const displayName = userData?.name || userData?.username || 'Member';

    // 1. One-Click Instant Meeting
    const handleStartInstantMeeting = async () => {
        const randomCode = generateRoomCode();
        try {
            await addToUserHistory(randomCode);
        } catch (err) {
            console.error('Failed to add to history', err);
        }

        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const meetingUrl = `${origin}/room/${randomCode}`;
        try {
            await navigator.clipboard.writeText(meetingUrl);
            setToastMessage('Meeting link copied! Joining room...');
            setShowToast(true);
        } catch {
            // fallback
        }

        setTimeout(() => {
            navigate(`/room/${randomCode}`);
        }, 300);
    };

    // 2. Join with Code
    const handleJoinWithCode = async (e) => {
        if (e) e.preventDefault();
        const cleanCode = parseRoomCode(meetingCode);
        if (!cleanCode) {
            setJoinError('Enter a valid room code or link');
            return;
        }

        try {
            await addToUserHistory(cleanCode);
        } catch (err) {
            console.error('Failed to record meeting to history', err);
        }

        navigate(`/room/${cleanCode}`);
    };

    const handleRejoinMeeting = async (code) => {
        try {
            await addToUserHistory(code);
        } catch (err) {
            console.error(err);
        }
        navigate(`/room/${code}`);
    };

    const handleCopyMeetingLink = async (code, index) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const meetingUrl = `${origin}/room/${code}`;
        try {
            await navigator.clipboard.writeText(meetingUrl);
            setCopiedIndex(index);
            setToastMessage('Room link copied to clipboard!');
            setShowToast(true);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch {
            // fallback
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth');
    };

    const handleSendVerificationOtp = async () => {
        try {
            await sendVerification();
            setToastMessage('Verification code sent to your email!');
            setShowToast(true);
        } catch (err) {
            setToastMessage(err?.response?.data?.message || 'Could not send verification code.');
            setShowToast(true);
        }
    };

    const handleVerifySubmit = async (e) => {
        if (e) e.preventDefault();
        setVerifyError('');

        if (!verifyCode.trim()) {
            setVerifyError('Please enter the 6-digit verification code');
            return;
        }

        setVerifyLoading(true);
        try {
            await verifyEmail(verifyCode.trim());
            setShowVerifyModal(false);
            setVerifyCode('');
            setToastMessage('Email verified successfully! 🎉');
            setShowToast(true);
        } catch (err) {
            setVerifyError(err?.response?.data?.message || 'Failed to verify code. Please check and try again.');
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleAddEmailSubmit = async (e) => {
        if (e) e.preventDefault();
        setAddEmailError('');

        const emailTrimmed = newEmailInput.trim().toLowerCase();
        if (!emailTrimmed) {
            setAddEmailError('Please enter an email address');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
            setAddEmailError('Please enter a valid email address');
            return;
        }

        setAddEmailLoading(true);
        try {
            await addEmail(emailTrimmed);
            setShowAddEmailModal(false);
            setNewEmailInput('');
            setShowVerifyModal(true);
            setToastMessage('Email added! Verification code sent.');
            setShowToast(true);
        } catch (err) {
            setAddEmailError(err?.response?.data?.message || 'Failed to add email. It may already be in use.');
        } finally {
            setAddEmailLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Recently';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={styles.homeWrapper}>
            <div className={styles.emeraldGlowTop} />

            {/* 1. Header Navigation */}
            <header className={styles.navbar}>
                <div className={styles.brand} onClick={() => navigate('/home')}>
                    <div className={styles.brandIcon}>
                        <Video strokeWidth={1.75} className={styles.logoMarkIcon} />
                    </div>
                    <h1 className={styles.brandTitle}>PulseMeet</h1>
                </div>

                <div className={styles.navRight}>
                    <div className={styles.userBadge}>
                        <div className={styles.userAvatar}>
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className={styles.userName}>{displayName}</span>
                    </div>

                    <button
                        type="button"
                        className={styles.historyBtn}
                        onClick={() => navigate('/history')}
                    >
                        <History size={16} strokeWidth={1.75} />
                        <span>History</span>
                    </button>

                    <button
                        type="button"
                        className={styles.logoutBtn}
                        onClick={handleLogout}
                    >
                        <LogOut size={15} strokeWidth={1.75} />
                        <span>Logout</span>
                    </button>
                </div>
            </header>

            {/* 2. Main Dashboard Content */}
            <main className={styles.mainContainer}>
                {/* Email Verification / Add Email Banner */}
                {userData && userData.isVerified === false && (
                    <div className={styles.verifyBanner}>
                        <div className={styles.verifyBannerLeft}>
                            <div className={styles.verifyBannerIcon}>
                                <Mail size={20} strokeWidth={2} />
                            </div>
                            <div>
                                <span className={styles.verifyBannerTitle}>
                                    {userData.email ? `Verify your email address (${userData.email})` : "Add an email to your account"}
                                </span>
                                <p className={styles.verifyBannerText}>
                                    {userData.email
                                        ? "Verify your email to enable account recovery and secure access."
                                        : "Link an email address to your account to enable password reset."}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            className={styles.verifyBannerAction}
                            onClick={async () => {
                                if (userData.email) {
                                    await handleSendVerificationOtp();
                                    setShowVerifyModal(true);
                                } else {
                                    setShowAddEmailModal(true);
                                }
                            }}
                        >
                            {userData.email ? "Verify Email" : "Add Email"}
                        </button>
                    </div>
                )}

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
                            <div className={styles.cardIconCircle}>
                                <Video size={28} strokeWidth={1.75} />
                            </div>
                            <h3 className={styles.cardTitle}>Instant Meeting</h3>
                            <p className={styles.cardDesc}>
                                Launch a new room with sub-100ms latency. The invite link is copied to your clipboard automatically.
                            </p>
                        </div>
                        <button
                            type="button"
                            className={styles.instantMeetingBtn}
                            onClick={handleStartInstantMeeting}
                        >
                            <Video size={18} strokeWidth={2} />
                            <span>Start Instant Meeting</span>
                        </button>
                    </div>

                    {/* Card 2: Join with Code */}
                    <div className={styles.actionCard}>
                        <div>
                            <div className={styles.cardIconCircle}>
                                <Keyboard size={26} strokeWidth={1.75} />
                            </div>
                            <h3 className={styles.cardTitle}>Join with Code</h3>
                            <p className={styles.cardDesc}>
                                Enter a room code or paste the full meeting link to enter the lobby and test your devices.
                            </p>
                        </div>

                        <form onSubmit={handleJoinWithCode} className={styles.joinInputGroup}>
                            <div className={styles.joinInputRow}>
                                <div className={styles.inputFieldWrapper}>
                                    <Keyboard size={18} strokeWidth={1.75} className={styles.inputFieldIcon} />
                                    <input
                                        type="text"
                                        placeholder="e.g. abc-123 or paste link"
                                        value={meetingCode}
                                        onChange={(e) => {
                                            setMeetingCode(e.target.value);
                                            if (joinError) setJoinError('');
                                        }}
                                        className={`${styles.codeField} ${joinError ? styles.codeFieldError : ''}`}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className={styles.joinBtn}
                                >
                                    <span>Join</span>
                                    <ArrowRight size={16} strokeWidth={2} />
                                </button>
                            </div>
                            {joinError && (
                                <span className={styles.fieldErrorText} role="alert">
                                    {joinError}
                                </span>
                            )}
                        </form>
                    </div>
                </div>

                {/* 3. Platform Highlights Metrics Bar */}
                <div className={styles.platformMetricsGrid}>
                    <div className={styles.metricCard}>
                        <div className={styles.metricIcon}>
                            <Zap size={20} strokeWidth={2} />
                        </div>
                        <div className={styles.metricText}>
                            <span className={styles.metricLabel}>P2P Mesh WebRTC</span>
                            <span className={styles.metricValue}>Sub-100ms Latency</span>
                        </div>
                    </div>

                    <div className={styles.metricCard}>
                        <div className={styles.metricIcon}>
                            <Shield size={20} strokeWidth={2} />
                        </div>
                        <div className={styles.metricText}>
                            <span className={styles.metricLabel}>Client-Side Encryption</span>
                            <span className={styles.metricValue}>Direct Browser Streams</span>
                        </div>
                    </div>

                    <div className={styles.metricCard}>
                        <div className={styles.metricIcon}>
                            <HardDrive size={20} strokeWidth={2} />
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
                        <span className={styles.viewAllLink} onClick={() => navigate('/history')}>
                            View All History →
                        </span>
                    </div>

                    {recentMeetings.length === 0 ? (
                        <div className={styles.emptyRecent}>
                            <div className={styles.emptyIcon}>
                                <History size={24} strokeWidth={1.75} />
                            </div>
                            <h4 className={styles.emptyTitle}>No recent meetings yet</h4>
                            <p className={styles.emptySubtitle}>
                                Start an instant meeting or join with a code to see your session history here.
                            </p>
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
                                        <button
                                            type="button"
                                            className={styles.copyCodeBtn}
                                            onClick={() => handleCopyMeetingLink(meeting.meetingCode, index)}
                                            aria-label="Copy meeting link"
                                        >
                                            {copiedIndex === index ? (
                                                <Check size={16} strokeWidth={2} style={{ color: 'var(--pm-primary)' }} />
                                            ) : (
                                                <Copy size={16} strokeWidth={1.75} />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.rejoinBtn}
                                            onClick={() => handleRejoinMeeting(meeting.meetingCode)}
                                        >
                                            <span>Re-join</span>
                                            <ArrowRight size={14} strokeWidth={2} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {/* Verify Email Modal */}
            {showVerifyModal && (
                <div className={styles.modalBackdrop}>
                    <div className={styles.modalContent}>
                        <button
                            type="button"
                            className={styles.modalCloseBtn}
                            onClick={() => setShowVerifyModal(false)}
                            aria-label="Close dialog"
                        >
                            <X size={18} strokeWidth={2} />
                        </button>

                        <h3 className={styles.modalTitle}>Verify email address</h3>
                        <p className={styles.modalSubtitle}>
                            Enter the 6-digit verification code sent to <strong>{userData?.email}</strong>:
                        </p>

                        {verifyError && (
                            <div className={styles.alertError}>
                                <span>{verifyError}</span>
                            </div>
                        )}

                        <form onSubmit={handleVerifySubmit}>
                            <input
                                type="text"
                                maxLength={6}
                                placeholder="e.g. 123456"
                                value={verifyCode}
                                onChange={(e) => {
                                    setVerifyCode(e.target.value);
                                    if (verifyError) setVerifyError('');
                                }}
                                className={styles.codeField}
                                style={{ textAlign: "center", fontSize: "1.25rem", letterSpacing: "4px" }}
                                autoFocus
                            />

                            <button
                                type="submit"
                                disabled={verifyLoading}
                                className={styles.modalSubmitBtn}
                            >
                                {verifyLoading ? (
                                    <>
                                        <Loader2 size={18} className={styles.spinIcon} />
                                        <span>Verifying...</span>
                                    </>
                                ) : (
                                    <span>Verify Email</span>
                                )}
                            </button>

                            <div style={{ textAlign: "center", marginTop: "1rem" }}>
                                <button
                                    type="button"
                                    onClick={handleSendVerificationOtp}
                                    style={{ background: "none", border: "none", color: "var(--pm-primary)", fontSize: "0.8125rem", cursor: "pointer", textDecoration: "underline" }}
                                >
                                    Resend code
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Email Modal */}
            {showAddEmailModal && (
                <div className={styles.modalBackdrop}>
                    <div className={styles.modalContent}>
                        <button
                            type="button"
                            className={styles.modalCloseBtn}
                            onClick={() => setShowAddEmailModal(false)}
                            aria-label="Close dialog"
                        >
                            <X size={18} strokeWidth={2} />
                        </button>

                        <h3 className={styles.modalTitle}>Add email address</h3>
                        <p className={styles.modalSubtitle}>
                            Link your email to PulseMeet to enable password recovery and verify your identity.
                        </p>

                        {addEmailError && (
                            <div className={styles.alertError}>
                                <span>{addEmailError}</span>
                            </div>
                        )}

                        <form onSubmit={handleAddEmailSubmit}>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={newEmailInput}
                                onChange={(e) => {
                                    setNewEmailInput(e.target.value);
                                    if (addEmailError) setAddEmailError('');
                                }}
                                className={styles.codeField}
                                autoFocus
                            />

                            <button
                                type="submit"
                                disabled={addEmailLoading}
                                className={styles.modalSubmitBtn}
                            >
                                {addEmailLoading ? (
                                    <>
                                        <Loader2 size={18} className={styles.spinIcon} />
                                        <span>Adding email...</span>
                                    </>
                                ) : (
                                    <span>Save & Send Verification</span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

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
