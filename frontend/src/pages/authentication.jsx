import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import PersonIcon from '@mui/icons-material/Person';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BadgeIcon from '@mui/icons-material/Badge';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LockIcon from '@mui/icons-material/Lock';
import BoltIcon from '@mui/icons-material/Bolt';
import ShieldIcon from '@mui/icons-material/Shield';
import MicIcon from '@mui/icons-material/Mic';
import { AuthContext } from '../contexts/AuthContext';
import styles from '../styles/auth.module.css';

export default function Authentication() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [formState, setFormState] = useState(0); // 0 = Sign In, 1 = Sign Up
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { handleRegister, handleLogin } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleAuth = async (e) => {
        if (e) e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            if (formState === 0) {
                if (!username.trim() || !password) {
                    setError("Please enter both username and password.");
                    setIsLoading(false);
                    return;
                }
                await handleLogin(username.trim(), password);
            } else {
                if (!name.trim() || !username.trim() || !password) {
                    setError("Please fill in all registration fields.");
                    setIsLoading(false);
                    return;
                }
                let result = await handleRegister(name.trim(), username.trim(), password);
                setUsername("");
                setPassword("");
                setName("");
                setMessage(result || "Registration successful! You can now sign in.");
                setOpen(true);
                setFormState(0);
            }
        } catch (err) {
            console.error("Auth error:", err);
            const errMsg = err?.response?.data?.message || "Authentication failed. Please verify your credentials.";
            setError(errMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGuestBypass = () => {
        const randomRoom = Math.random().toString(36).substring(2, 8);
        navigate(`/${randomRoom}`);
    };

    // Sleek Elevated Input Style
    const darkInputStyle = {
        '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            bgcolor: 'var(--pm-surface-elevated, #242433)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '& fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.08)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            },
            '&:hover fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.2)'
            },
            '&.Mui-focused': {
                boxShadow: '0 0 0 3px rgba(99, 91, 255, 0.25)',
                bgcolor: 'var(--pm-surface-elevated, #242433)'
            },
            '&.Mui-focused fieldset': {
                borderColor: 'var(--pm-primary, #635bff) !important',
                borderWidth: '1.5px'
            }
        },
        input: {
            color: 'var(--pm-text-primary, #ffffff)',
            fontSize: '0.95rem',
            fontWeight: 500,
            '&::placeholder': {
                color: 'var(--pm-text-tertiary, #6c6c80)',
                opacity: 1
            }
        },
        label: {
            color: 'var(--pm-text-secondary, #b4b4c7)',
            '&.Mui-focused': {
                color: 'var(--pm-primary, #635bff)'
            }
        }
    };

    return (
        <div className={styles.authWrapper}>
            {/* Left Showcase Canvas (Visual Experience & Live Call Simulator) */}
            <div className={styles.showcasePanel}>
                <div className={styles.ambientGlow1} />
                <div className={styles.ambientGlow2} />

                {/* Brand Header */}
                <div className={styles.brandHeader}>
                    <div className={styles.brandLink} onClick={() => navigate('/')}>
                        <div className={styles.brandLogoIcon}>
                            <VideocamRoundedIcon sx={{ color: '#fff', fontSize: 24 }} />
                        </div>
                        <span className={styles.brandLogoText}>PulseMeet</span>
                    </div>

                    <div className={styles.liveBadge}>
                        <div className={styles.livePulseDot} />
                        <span>WebRTC 2.0 Mesh Live</span>
                    </div>
                </div>

                {/* Hero Showcase Copy */}
                <div className={styles.showcaseBody}>
                    <h1 className={styles.showcaseHeading}>
                        Video meetings that feel <br />
                        <span className={styles.headingGradient}>instant and effortless.</span>
                    </h1>
                    <p className={styles.showcaseSubtext}>
                        High-fidelity, ultra-low-latency peer-to-peer conferencing engineered with direct browser streaming and client-side encryption.
                    </p>

                    {/* Floating Simulated Live Call Card */}
                    <div className={styles.liveCallCard}>
                        <div className={styles.liveCardHeader}>
                            <div className={styles.roomTag}>
                                🔒 room/alpha-9x
                            </div>
                            <div className={styles.recBadge}>
                                <div className={styles.recDot} />
                                REC 00:18:42
                            </div>
                        </div>

                        <div className={styles.cardVideoGrid}>
                            {/* Host Tile: Active Speaker with Waveform */}
                            <div className={`${styles.mockTile} ${styles.mockTileActive}`}>
                                <Avatar className={styles.mockAvatar} sx={{ bgcolor: 'var(--pm-primary, #635bff)' }}>
                                    R
                                </Avatar>
                                <div className={styles.audioWave}>
                                    <div className={styles.audioBar} />
                                    <div className={styles.audioBar} />
                                    <div className={styles.audioBar} />
                                </div>
                                <span className={styles.mockTag}>Raj (Host) 🎤</span>
                                <span className={styles.floatingReactionBadge}>👏</span>
                            </div>

                            {/* Remote Peer Tile */}
                            <div className={styles.mockTile}>
                                <Avatar className={styles.mockAvatar} sx={{ bgcolor: 'var(--pm-teal, #00d4aa)', color: '#111' }}>
                                    A
                                </Avatar>
                                <span className={styles.mockTag}>Alex Rivera</span>
                            </div>
                        </div>

                        <div className={styles.cardBottomStatus}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <MicIcon sx={{ fontSize: 14, color: 'var(--pm-teal, #00d4aa)' }} />
                                Active Speaker Detection
                            </span>
                            <div className={styles.latencyChip}>
                                <BoltIcon sx={{ fontSize: 15 }} />
                                <span>64ms P2P Direct</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Social Proof / Trust Wall */}
                <div className={styles.showcaseFooter}>
                    <div className={styles.avatarStack}>
                        <Avatar className={styles.stackAvatar} sx={{ bgcolor: '#6366f1' }}>R</Avatar>
                        <Avatar className={styles.stackAvatar} sx={{ bgcolor: '#00d4aa', color: '#111' }}>S</Avatar>
                        <Avatar className={styles.stackAvatar} sx={{ bgcolor: '#ffb347', color: '#111' }}>M</Avatar>
                        <Avatar className={styles.stackAvatar} sx={{ bgcolor: '#ec4899' }}>A</Avatar>
                    </div>
                    <div className={styles.proofText}>
                        <span className={styles.proofHighlight}>15,000+ meetings hosted</span> with sub-100ms latency and zero cloud data storage risk.
                    </div>
                </div>
            </div>

            {/* Right Form Canvas (Focused Auth Card) */}
            <div className={styles.formPanel}>
                <div className={styles.topFormNav}>
                    <div className={styles.backHomePill} onClick={() => navigate('/')}>
                        <ArrowBackIcon sx={{ fontSize: 15 }} />
                        <span>Back to Home</span>
                    </div>
                </div>

                <div className={styles.authCard}>
                    {/* Tab Switcher */}
                    <div className={styles.tabSwitcher}>
                        <div
                            className={`${styles.slidingHighlight} ${formState === 1 ? styles.slidingHighlightRight : ''}`}
                        />
                        <div
                            className={`${styles.tabItem} ${formState === 0 ? styles.tabItemActive : ''}`}
                            onClick={() => { setFormState(0); setError(""); }}
                        >
                            Sign In
                        </div>
                        <div
                            className={`${styles.tabItem} ${formState === 1 ? styles.tabItemActive : ''}`}
                            onClick={() => { setFormState(1); setError(""); }}
                        >
                            Create Account
                        </div>
                    </div>

                    <h2 className={styles.formTitle}>
                        {formState === 0 ? "Welcome back" : "Create account"}
                    </h2>
                    <p className={styles.formSubtitle}>
                        {formState === 0
                            ? "Enter your credentials to access your meeting hub"
                            : "Join PulseMeet for high-definition, browser-native video meetings"}
                    </p>

                    {error && (
                        <div className={styles.errorBanner}>
                            <ErrorOutlineIcon sx={{ fontSize: 18 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form
                        key={formState}
                        onSubmit={handleAuth}
                        className={styles.animatedForm}
                    >
                        {formState === 1 && (
                            <TextField
                                id="name-input"
                                label="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                variant="outlined"
                                fullWidth
                                autoFocus
                                placeholder="Raj Ingle"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <BadgeIcon sx={{ color: 'var(--pm-primary, #635bff)', fontSize: 20 }} />
                                        </InputAdornment>
                                    )
                                }}
                                sx={darkInputStyle}
                            />
                        )}

                        <TextField
                            id="username-input"
                            label="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            variant="outlined"
                            fullWidth
                            autoFocus={formState === 0}
                            placeholder="raj09"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonIcon sx={{ color: 'var(--pm-primary, #635bff)', fontSize: 20 }} />
                                    </InputAdornment>
                                )
                            }}
                            sx={darkInputStyle}
                        />

                        <TextField
                            id="password-input"
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            variant="outlined"
                            fullWidth
                            placeholder="••••••••"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlinedIcon sx={{ color: 'var(--pm-primary, #635bff)', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                            sx={{ color: 'var(--pm-text-secondary, #b4b4c7)', '&:hover': { color: '#ffffff' } }}
                                        >
                                            {showPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                            sx={darkInputStyle}
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={isLoading}
                            className={styles.submitBtn}
                        >
                            {isLoading ? "Processing..." : (formState === 0 ? "Sign In to PulseMeet" : "Create Account & Start")}
                        </Button>
                    </form>

                    {/* Quick Guest Room Bypass for Instant Testing */}
                    <div className={styles.guestDivider}>
                        <span>OR TEST WITHOUT ACCOUNT</span>
                    </div>

                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={handleGuestBypass}
                        className={styles.guestBypassBtn}
                        startIcon={<BoltIcon sx={{ color: 'var(--pm-teal, #00d4aa)' }} />}
                    >
                        Launch Instant Guest Room →
                    </Button>

                    {/* Trust Indicators Strip */}
                    <div className={styles.authTrustStrip}>
                        <div className={styles.trustItem}>
                            <LockIcon sx={{ fontSize: 13, color: 'var(--pm-teal, #00d4aa)' }} />
                            <span>P2P Direct</span>
                        </div>
                        <div className={styles.trustItem}>
                            <BoltIcon sx={{ fontSize: 13, color: 'var(--pm-primary, #635bff)' }} />
                            <span>Sub-100ms</span>
                        </div>
                        <div className={styles.trustItem}>
                            <ShieldIcon sx={{ fontSize: 13, color: 'var(--pm-amber, #ffb347)' }} />
                            <span>Zero Cloud Risk</span>
                        </div>
                    </div>
                </div>
            </div>

            <Snackbar
                open={open}
                autoHideDuration={4000}
                onClose={() => setOpen(false)}
                message={message}
            />
        </div>
    );
}
