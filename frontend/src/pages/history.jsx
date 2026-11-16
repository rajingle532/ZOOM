import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snackbar } from '@mui/material';
import {
    Video,
    ArrowLeft,
    History as HistoryIcon,
    Hash,
    Calendar,
    Copy,
    Check,
    ArrowRight,
    Loader2
} from 'lucide-react';

import { AuthContext } from '../contexts/AuthContext';
import withAuth from '../utils/withAuth';
import styles from '../styles/history.module.css';

function History() {
    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history || []);
            } catch (err) {
                console.error('Failed to load history:', err);
                setError('Unable to load meeting history');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return 'Recently';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleCopyLink = async (code, index) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const link = `${origin}/room/${code}`;
        try {
            await navigator.clipboard.writeText(link);
            setCopiedIndex(index);
            setToastMessage('Meeting link copied to clipboard!');
            setShowToast(true);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch {
            // fallback
        }
    };

    return (
        <div className={styles.historyWrapper}>
            <div className={styles.emeraldGlowTop} />

            {/* Top Navigation */}
            <header className={styles.navbar}>
                <div className={styles.brand} onClick={() => navigate('/home')}>
                    <div className={styles.brandIcon}>
                        <Video strokeWidth={1.75} className={styles.logoMarkIcon} />
                    </div>
                    <span className={styles.brandTitle}>PulseMeet</span>
                </div>

                <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => navigate('/home')}
                >
                    <ArrowLeft size={16} strokeWidth={2} />
                    <span>Back to Dashboard</span>
                </button>
            </header>

            <main className={styles.mainContainer}>
                <div className={styles.pageHeader}>
                    <div className={styles.titleGroup}>
                        <div className={styles.titleRow}>
                            <HistoryIcon size={28} strokeWidth={2} className={styles.headerIcon} />
                            <h1 className={styles.pageTitle}>Meeting History</h1>
                        </div>
                        <p className={styles.pageSubtitle}>
                            Browse all past conferences, session dates, and re-join past rooms.
                        </p>
                    </div>

                    {!loading && meetings.length > 0 && (
                        <div className={styles.countBadge}>
                            <span>{meetings.length} Total {meetings.length === 1 ? 'Session' : 'Sessions'}</span>
                        </div>
                    )}
                </div>

                {error && (
                    <div className={styles.errorBanner} role="alert">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className={styles.loadingBox}>
                        <Loader2 size={24} className={styles.spinIcon} />
                        <span>Loading your past conferences...</span>
                    </div>
                ) : meetings.length === 0 ? (
                    <div className={styles.emptyCard}>
                        <div className={styles.emptyIconWrapper}>
                            <HistoryIcon size={32} strokeWidth={1.75} />
                        </div>
                        <h3 className={styles.emptyTitle}>No past meetings recorded</h3>
                        <p className={styles.emptySubtitle}>
                            Meetings you host or attend will appear here automatically with timestamps and direct re-join links.
                        </p>
                        <button
                            type="button"
                            className={styles.startMeetingBtn}
                            onClick={() => navigate('/home')}
                        >
                            <Video size={18} strokeWidth={2} />
                            <span>Start a New Meeting</span>
                        </button>
                    </div>
                ) : (
                    <div className={styles.meetingList}>
                        {meetings.map((meeting, index) => (
                            <div key={meeting._id || index} className={styles.meetingItem}>
                                <div className={styles.meetingMeta}>
                                    <div className={styles.codeRow}>
                                        <Hash size={16} strokeWidth={2} className={styles.codeIcon} />
                                        <span className={styles.codeText}>
                                            {meeting.meetingCode}
                                        </span>
                                    </div>
                                    <div className={styles.dateRow}>
                                        <Calendar size={14} strokeWidth={1.75} />
                                        <span>{formatDate(meeting.date)}</span>
                                    </div>
                                </div>

                                <div className={styles.actionsGroup}>
                                    <button
                                        type="button"
                                        className={styles.copyBtn}
                                        onClick={() => handleCopyLink(meeting.meetingCode, index)}
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
                                        onClick={() => navigate(`/room/${meeting.meetingCode}`)}
                                    >
                                        <span>Re-join</span>
                                        <ArrowRight size={15} strokeWidth={2} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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

export default withAuth(History);
