import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import TagOutlinedIcon from '@mui/icons-material/TagOutlined';
import { AuthContext } from '../contexts/AuthContext';
import withAuth from '../utils/withAuth';
import styles from '../styles/home.module.css';

function History() {
    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history || []);
            } catch (err) {
                console.error("Failed to load history:", err);
                setError("Unable to load meeting history");
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div className={styles.homeWrapper}>
            {/* Top Navigation */}
            <header className={styles.navbar}>
                <div className={styles.brand} onClick={() => navigate('/home')}>
                    <div className={styles.logoIcon}>
                        <VideocamRoundedIcon sx={{ color: '#fff', fontSize: 22 }} />
                    </div>
                    <span className={styles.brandTitle}>PulseMeet</span>
                </div>

                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/home')}
                    sx={{
                        color: 'var(--pm-text-secondary, #b4b4c7)',
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '20px',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        px: 2,
                        '&:hover': {
                            borderColor: 'var(--pm-primary, #635bff)',
                            color: '#fff',
                            backgroundColor: 'rgba(99, 91, 255, 0.1)'
                        }
                    }}
                >
                    Back to Dashboard
                </Button>
            </header>

            <main className={styles.mainContainer} style={{ maxWidth: 880 }}>
                <div style={{ marginBottom: '2.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <HistoryRoundedIcon sx={{ color: 'var(--pm-primary, #635bff)', fontSize: 32 }} />
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                            Meeting History
                        </h1>
                    </div>
                    <p style={{ color: 'var(--pm-text-secondary, #b4b4c7)', margin: 0, fontSize: '0.95rem' }}>
                        Browse all past conferences, session dates, and re-join past rooms
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'var(--pm-danger-dim, rgba(255, 92, 92, 0.15))',
                        color: 'var(--pm-danger, #ff5c5c)',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        marginBottom: '1.5rem',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--pm-text-secondary, #b4b4c7)' }}>
                        Loading your past conferences...
                    </div>
                ) : meetings.length === 0 ? (
                    <div style={{
                        background: 'var(--pm-surface, #1c1c27)',
                        borderRadius: '20px',
                        padding: '3.5rem 2rem',
                        textAlign: 'center',
                        color: 'var(--pm-text-tertiary, #6c6c80)',
                        boxShadow: 'var(--pm-shadow-md, 0 8px 24px rgba(0, 0, 0, 0.35))'
                    }}>
                        <HistoryRoundedIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1.5 }} />
                        <h3 style={{ color: 'var(--pm-text-secondary, #b4b4c7)', margin: '0 0 6px 0' }}>No past meetings recorded</h3>
                        <p style={{ fontSize: '0.9rem', margin: 0 }}>Meetings you host or attend will appear here automatically.</p>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/home')}
                            sx={{
                                mt: 3,
                                textTransform: 'none',
                                fontWeight: 700,
                                background: 'var(--pm-primary, #635bff)',
                                borderRadius: '10px',
                                boxShadow: '0 4px 14px rgba(99, 91, 255, 0.35)',
                                '&:hover': {
                                    background: 'var(--pm-primary-hover, #7c75ff)'
                                }
                            }}
                        >
                            Start a New Meeting
                        </Button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {meetings.map((meeting, index) => (
                            <div
                                key={meeting._id || index}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'var(--pm-surface, #1c1c27)',
                                    borderRadius: '16px',
                                    padding: '1.2rem 1.6rem',
                                    boxShadow: 'var(--pm-shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.25))',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <TagOutlinedIcon sx={{ color: 'var(--pm-primary, #635bff)', fontSize: 18 }} />
                                        <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.05rem', fontFamily: 'monospace' }}>
                                            {meeting.meetingCode}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--pm-text-tertiary, #6c6c80)', fontSize: '0.82rem' }}>
                                        <CalendarTodayOutlinedIcon sx={{ fontSize: 14 }} />
                                        <span>{formatDate(meeting.date)}</span>
                                    </div>
                                </div>

                                <Button
                                    variant="outlined"
                                    size="small"
                                    endIcon={<ArrowForwardRoundedIcon />}
                                    onClick={() => navigate(`/${meeting.meetingCode}`)}
                                    sx={{
                                        color: 'var(--pm-primary-hover, #7c75ff)',
                                        borderColor: 'rgba(99, 91, 255, 0.3)',
                                        borderRadius: '10px',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                        px: 2,
                                        '&:hover': {
                                            borderColor: 'var(--pm-primary, #635bff)',
                                            color: '#fff',
                                            backgroundColor: 'rgba(99, 91, 255, 0.1)'
                                        }
                                    }}
                                >
                                    Re-join
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default withAuth(History);
