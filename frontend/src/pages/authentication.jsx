import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lock,
    Zap,
    HardDrive,
    Video,
    User,
    KeyRound,
    Eye,
    EyeOff,
    ArrowLeft,
    Loader2,
    Mic,
    MicOff,
    Users,
    SignalHigh,
    Disc,
    Hand,
    MessageSquare,
    PhoneOff,
    ScreenShare
} from 'lucide-react';
import Snackbar from '@mui/material/Snackbar';
import { AuthContext } from '../contexts/AuthContext';
import styles from '../styles/auth.module.css';

export default function Authentication() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [name, setName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [capsLockActive, setCapsLockActive] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [message, setMessage] = useState("");
    const [formState, setFormState] = useState(0); // 0 = Sign In, 1 = Sign Up
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [shake, setShake] = useState(false);

    // Live preview states: REC elapsed timer & dynamic speaker rotation
    const [recSeconds, setRecSeconds] = useState(1122); // Start at 00:18:42
    const [activeSpeakerIndex, setActiveSpeakerIndex] = useState(0);
    const [isShortViewport, setIsShortViewport] = useState(false);

    const { handleRegister, handleLogin } = useContext(AuthContext);
    const navigate = useNavigate();

    // Viewport height listener for < 860px (1x2 tiles optimization)
    useEffect(() => {
        const checkHeight = () => {
            if (typeof window !== 'undefined') {
                setIsShortViewport(window.innerHeight < 860);
            }
        };
        checkHeight();
        window.addEventListener('resize', checkHeight);
        return () => window.removeEventListener('resize', checkHeight);
    }, []);

    // Live ticking REC timer
    useEffect(() => {
        const timer = setInterval(() => {
            setRecSeconds(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Rotate active speaker every 4 seconds (rotates among visible tiles)
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveSpeakerIndex(prev => (prev + 1) % (isShortViewport ? 2 : 4));
        }, 4000);
        return () => clearInterval(interval);
    }, [isShortViewport]);

    // Format seconds into HH:MM:SS
    const formatRecTime = (totalSec) => {
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    // Password strength evaluation (4 segments)
    const getPasswordStrength = (pass) => {
        if (!pass) return { score: 0, label: "" };
        let score = 0;
        if (pass.length >= 6) score++;
        if (pass.length >= 8) score++;
        if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;
        const labels = ["Weak", "Fair", "Good", "Strong"];
        return { score, label: labels[Math.max(0, score - 1)] || "Weak" };
    };

    const strength = getPasswordStrength(password);

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 450);
    };

    const handleAuth = async (e) => {
        if (e) e.preventDefault();
        setError("");
        setFieldErrors({});

        if (formState === 0) {
            const errors = {};
            if (!username.trim()) errors.username = "Username is required";
            if (!password) errors.password = "Password is required";

            if (Object.keys(errors).length > 0) {
                setFieldErrors(errors);
                triggerShake();
                return;
            }

            setIsLoading(true);
            try {
                await handleLogin(username.trim(), password);
            } catch (err) {
                console.error("Auth error:", err);
                const errMsg = err?.response?.data?.message || "Invalid username or password";
                setError(errMsg);
                triggerShake();
            } finally {
                setIsLoading(false);
            }
        } else {
            const errors = {};
            if (!name.trim()) errors.name = "Full name is required";
            if (!username.trim()) errors.username = "Username is required";
            if (!password) errors.password = "Password is required";
            else if (password.length < 6) errors.password = "Password must be at least 6 characters";
            if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";

            if (Object.keys(errors).length > 0) {
                setFieldErrors(errors);
                triggerShake();
                return;
            }

            setIsLoading(true);
            try {
                let result = await handleRegister(name.trim(), username.trim(), password);
                setUsername("");
                setPassword("");
                setConfirmPassword("");
                setName("");
                setMessage(result || "Account created successfully! You can now sign in.");
                setOpen(true);
                setFormState(0);
            } catch (err) {
                console.error("Auth error:", err);
                const errMsg = err?.response?.data?.message || "Registration failed. Please try a different username.";
                setError(errMsg);
                triggerShake();
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleGuestJoin = () => {
        const randomRoom = Math.random().toString(36).substring(2, 8);
        navigate(`/${randomRoom}`);
    };

    // Staggered entrance variants for left panel
    const leftContainerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.05
            }
        }
    };

    const leftItemVariants = {
        hidden: { opacity: 0, y: 16 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
        }
    };

    const chipVariants = {
        hidden: { opacity: 0, scale: 0.9 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { duration: 0.4, delay: 0.4, ease: "easeOut" }
        }
    };

    // 5 Animated waveform bar relative heights
    const waveformScales = [0.4, 0.9, 0.6, 1.0, 0.5];

    return (
        <div className={styles.authContainer}>
            {/* ================= LEFT PANEL (50/50 Desktop Split, Grid Rows: auto 1fr auto) ================= */}
            <div className={styles.leftPanel}>
                <div className={styles.emeraldGlowTop} />
                <div className={styles.emeraldGlowBottom} />
                <div className={styles.noiseOverlay} />

                {/* Row 1: Logo Only (32px padding from edges) */}
                <div className={styles.leftHeader}>
                    <div className={styles.brandLink} onClick={() => navigate('/')}>
                        <div className={styles.brandIcon}>
                            <Video size={20} strokeWidth={1.75} />
                        </div>
                        <span className={styles.brandTitle}>PulseMeet</span>
                    </div>
                </div>

                {/* Row 2: Headline, Subtext, Hero Preview (Vertically Centered with >= 4rem gap) */}
                <motion.div
                    className={styles.leftMiddleContent}
                    variants={leftContainerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.h1 className={styles.headline} variants={leftItemVariants}>
                        Video meetings, <span className={styles.emeraldText}>straight between browsers.</span>
                    </motion.h1>

                    <motion.p className={styles.subtext} variants={leftItemVariants}>
                        Audio and video go directly between participants. Our server only helps them find each other.
                    </motion.p>

                    {/* Large Product Preview Window & Floating Satellite Chips */}
                    <motion.div className={styles.previewHeroWrapper} variants={leftItemVariants}>
                        {/* Satellite Chip A (Top-Right, Outside Card) */}
                        <motion.div
                            className={styles.satelliteChipA}
                            variants={chipVariants}
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0 }}
                        >
                            <Zap size={16} strokeWidth={1.75} className="text-[#34D399]" />
                            <span>Direct connection</span>
                        </motion.div>

                        {/* Satellite Chip B (Bottom-Left, Outside Card) */}
                        <motion.div
                            className={styles.satelliteChipB}
                            variants={chipVariants}
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                        >
                            <HardDrive size={16} strokeWidth={1.75} className="text-[#34D399]" />
                            <span>Recording saves to your disk</span>
                        </motion.div>

                        {/* The Hero Preview Window Card */}
                        <div className={styles.previewWindowCard}>
                            {/* Window Top Bar */}
                            <div className={styles.windowBar}>
                                <div className={styles.windowUrl}>
                                    <Lock size={18} strokeWidth={1.75} className="text-[#34D399]" />
                                    <span>alpha-9x</span>
                                </div>
                                <div className={styles.windowMetaRight}>
                                    <div className={styles.recIndicator}>
                                        <div className={styles.recPulseDot} />
                                        <span>REC {formatRecTime(recSeconds)}</span>
                                    </div>
                                    <div className={styles.participantCount}>
                                        <Users size={18} strokeWidth={1.75} />
                                        <span>4</span>
                                    </div>
                                    <SignalHigh size={18} strokeWidth={1.75} className="text-[#34D399]" />
                                </div>
                            </div>

                            {/* 2x2 Grid of 16:9 Tiles (Switches to 1x2 when height < 860px) */}
                            <div className={styles.tilesGrid}>
                                {/* Tile 1: Host Raj (Emerald Tint) */}
                                <div className={`${styles.videoTile} ${activeSpeakerIndex === 0 ? styles.speakingTile : ''}`}>
                                    <div className={`${styles.avatarCircle} ${styles.avatarEmerald}`}>
                                        R
                                    </div>
                                    {activeSpeakerIndex === 0 ? (
                                        <div className={styles.speakingWaveContainer}>
                                            {waveformScales.map((scale, i) => (
                                                <motion.div
                                                    key={i}
                                                    className={styles.activeWaveBar}
                                                    animate={{ scaleY: [0.25, scale, 0.25] }}
                                                    transition={{
                                                        duration: 0.6,
                                                        repeat: Infinity,
                                                        ease: "easeInOut",
                                                        delay: i * 0.1
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={styles.speakingWavePlaceholder} />
                                    )}
                                    <div className={styles.tileNameChip}>
                                        <span>Raj (Host)</span>
                                        {activeSpeakerIndex === 0 && <span className={styles.speakingPulseDot} />}
                                    </div>
                                </div>

                                {/* Tile 2: Sarah Miller (Sky Tint) */}
                                <div className={`${styles.videoTile} ${activeSpeakerIndex === 1 ? styles.speakingTile : ''}`}>
                                    <div className={`${styles.avatarCircle} ${styles.avatarSky}`}>
                                        S
                                    </div>
                                    {activeSpeakerIndex === 1 ? (
                                        <div className={styles.speakingWaveContainer}>
                                            {waveformScales.map((scale, i) => (
                                                <motion.div
                                                    key={i}
                                                    className={styles.activeWaveBar}
                                                    animate={{ scaleY: [0.25, scale, 0.25] }}
                                                    transition={{
                                                        duration: 0.6,
                                                        repeat: Infinity,
                                                        ease: "easeInOut",
                                                        delay: i * 0.1
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={styles.speakingWavePlaceholder} />
                                    )}
                                    <div className={styles.tileNameChip}>
                                        <span>Sarah Miller</span>
                                        {activeSpeakerIndex === 1 ? (
                                            <span className={styles.speakingPulseDot} />
                                        ) : (
                                            <MicOff size={13} strokeWidth={1.75} className="text-[#A1A1AA]" />
                                        )}
                                    </div>
                                </div>

                                {/* Tile 3: Alex Rivera (Amber Tint, Hidden on Short Viewports) */}
                                <div className={`${styles.videoTile} ${styles.tileHiddenShort} ${activeSpeakerIndex === 2 ? styles.speakingTile : ''}`}>
                                    <div className={`${styles.avatarCircle} ${styles.avatarAmber}`}>
                                        A
                                    </div>
                                    {activeSpeakerIndex === 2 ? (
                                        <div className={styles.speakingWaveContainer}>
                                            {waveformScales.map((scale, i) => (
                                                <motion.div
                                                    key={i}
                                                    className={styles.activeWaveBar}
                                                    animate={{ scaleY: [0.25, scale, 0.25] }}
                                                    transition={{
                                                        duration: 0.6,
                                                        repeat: Infinity,
                                                        ease: "easeInOut",
                                                        delay: i * 0.1
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={styles.speakingWavePlaceholder} />
                                    )}
                                    <div className={styles.tileNameChip}>
                                        <span>Alex Rivera</span>
                                        {activeSpeakerIndex === 2 && <span className={styles.speakingPulseDot} />}
                                    </div>
                                </div>

                                {/* Tile 4: Elena Rostova (Rose Tint, Hidden on Short Viewports) */}
                                <div className={`${styles.videoTile} ${styles.tileHiddenShort} ${activeSpeakerIndex === 3 ? styles.speakingTile : ''}`}>
                                    <div className={`${styles.avatarCircle} ${styles.avatarRose}`}>
                                        E
                                    </div>
                                    {activeSpeakerIndex === 3 ? (
                                        <div className={styles.speakingWaveContainer}>
                                            {waveformScales.map((scale, i) => (
                                                <motion.div
                                                    key={i}
                                                    className={styles.activeWaveBar}
                                                    animate={{ scaleY: [0.25, scale, 0.25] }}
                                                    transition={{
                                                        duration: 0.6,
                                                        repeat: Infinity,
                                                        ease: "easeInOut",
                                                        delay: i * 0.1
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={styles.speakingWavePlaceholder} />
                                    )}
                                    <div className={styles.tileNameChip}>
                                        <span>Elena Rostova</span>
                                        {activeSpeakerIndex === 3 && <span className={styles.speakingPulseDot} />}
                                    </div>
                                </div>
                            </div>

                            {/* Window Bottom Centered Pill Dock */}
                            <div className={styles.previewDockMini}>
                                <div className={styles.dockPill}>
                                    <div className={styles.dockIconBtn} title="Mic">
                                        <Mic size={18} strokeWidth={1.75} className="text-[#34D399]" />
                                    </div>
                                    <div className={styles.dockIconBtn} title="Camera">
                                        <Video size={18} strokeWidth={1.75} />
                                    </div>
                                    <div className={styles.dockIconBtn} title="Share screen">
                                        <ScreenShare size={18} strokeWidth={1.75} />
                                    </div>
                                    <div className={styles.dockIconBtn} title="Record">
                                        <Disc size={18} strokeWidth={1.75} className="text-[#F43F5E]" />
                                    </div>
                                    <div className={styles.dockIconBtn} title="Raise hand">
                                        <Hand size={18} strokeWidth={1.75} />
                                    </div>
                                    <div className={styles.dockIconBtn} title="Chat">
                                        <MessageSquare size={18} strokeWidth={1.75} />
                                    </div>
                                    <div className={`${styles.dockIconBtn} ${styles.dockLeaveBtn}`} title="Leave">
                                        <PhoneOff size={18} strokeWidth={1.75} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Row 3: Left Footer Trust Row */}
                <div className={styles.leftTrustRow}>
                    <div className={styles.trustItem}>
                        <Lock size={18} strokeWidth={1.75} className="text-[#34D399]" />
                        <span>Peer-to-peer</span>
                    </div>
                    <div className={styles.trustDivider} />
                    <div className={styles.trustItem}>
                        <Zap size={18} strokeWidth={1.75} className="text-[#34D399]" />
                        <span>Low latency</span>
                    </div>
                    <div className={styles.trustDivider} />
                    <div className={styles.trustItem}>
                        <HardDrive size={18} strokeWidth={1.75} className="text-[#34D399]" />
                        <span>Local recording</span>
                    </div>
                </div>
            </div>

            {/* ================= RIGHT PANEL ================= */}
            <div className={styles.rightPanel}>
                {/* Top-Right "Back to Home" Ghost Button */}
                <div className={styles.topRightNav}>
                    <div className={styles.mobileBrandHeader}>
                        <div className={styles.brandIcon}>
                            <Video size={20} strokeWidth={1.75} />
                        </div>
                        <span className={styles.brandTitle}>PulseMeet</span>
                    </div>

                    <div className={styles.backGhostLink} onClick={() => navigate('/')}>
                        <ArrowLeft size={18} strokeWidth={1.75} />
                        <span>Back to home</span>
                    </div>
                </div>

                {/* Centered Form Card (30rem wide, Shake on Error) */}
                <motion.div
                    className={styles.formCard}
                    animate={shake ? { x: [0, -8, 8, -4, 4, 0] } : { x: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                    <div className={styles.formCardGlow} />

                    {/* Segmented Control Tabs (44px / 2.75rem high) */}
                    <div className={styles.segmentedControl} role="tablist">
                        <motion.div
                            className={styles.activeTabIndicator}
                            animate={{ x: formState === 0 ? 0 : "100%" }}
                            transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        />
                        <button
                            type="button"
                            role="tab"
                            aria-selected={formState === 0}
                            className={`${styles.tabSegment} ${formState === 0 ? styles.tabSegmentActive : ''}`}
                            onClick={() => { setFormState(0); setError(""); setFieldErrors({}); }}
                        >
                            Sign in
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={formState === 1}
                            className={`${styles.tabSegment} ${formState === 1 ? styles.tabSegmentActive : ''}`}
                            onClick={() => { setFormState(1); setError(""); setFieldErrors({}); }}
                        >
                            Create account
                        </button>
                    </div>

                    {/* Card Title & Subtitle */}
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>
                            {formState === 0 ? "Welcome back" : "Create an account"}
                        </h2>
                        <p className={styles.cardSubtitle}>
                            {formState === 0
                                ? "Enter your credentials to access your meetings."
                                : "Start instant, browser-native video meetings."}
                        </p>
                    </div>

                    {/* Server Error Alert Banner */}
                    {error && (
                        <div className={styles.alertError} role="alert" aria-live="polite">
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Form Body with Crossfade Transition */}
                    <AnimatePresence mode="wait">
                        <motion.form
                            key={formState}
                            onSubmit={handleAuth}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2 }}
                            className={styles.formBody}
                            noValidate
                        >
                            {/* Full Name Input (Create Account Only) */}
                            {formState === 1 && (
                                <div className={styles.inputGroup}>
                                    <label htmlFor="name-input" className={styles.inputLabel}>
                                        Full name
                                    </label>
                                    <div className={`${styles.inputWrapper} ${fieldErrors.name ? styles.inputWrapperError : ''}`}>
                                        <div className={styles.inputIcon}>
                                            <User size={18} strokeWidth={1.75} />
                                        </div>
                                        <input
                                            id="name-input"
                                            name="name"
                                            type="text"
                                            autoComplete="name"
                                            autoFocus
                                            value={name}
                                            onChange={(e) => {
                                                setName(e.target.value);
                                                if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: null }));
                                            }}
                                            placeholder="Raj Ingle"
                                            className={styles.inputField}
                                        />
                                    </div>
                                    {fieldErrors.name && (
                                        <span className={styles.fieldErrorText}>{fieldErrors.name}</span>
                                    )}
                                </div>
                            )}

                            {/* Username Input */}
                            <div className={styles.inputGroup}>
                                <label htmlFor="username-input" className={styles.inputLabel}>
                                    Username
                                </label>
                                <div className={`${styles.inputWrapper} ${fieldErrors.username ? styles.inputWrapperError : ''}`}>
                                    <div className={styles.inputIcon}>
                                        <User size={18} strokeWidth={1.75} />
                                    </div>
                                    <input
                                        id="username-input"
                                        name="username"
                                        type="text"
                                        autoComplete="username"
                                        autoFocus={formState === 0}
                                        value={username}
                                        onChange={(e) => {
                                            setUsername(e.target.value);
                                            if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: null }));
                                        }}
                                        placeholder="yourname"
                                        className={styles.inputField}
                                    />
                                </div>
                                {fieldErrors.username && (
                                    <span className={styles.fieldErrorText}>{fieldErrors.username}</span>
                                )}
                            </div>

                            {/* Password Input */}
                            <div className={styles.inputGroup}>
                                <label htmlFor="password-input" className={styles.inputLabel}>
                                    Password
                                </label>
                                <div className={`${styles.inputWrapper} ${fieldErrors.password ? styles.inputWrapperError : ''}`}>
                                    <div className={styles.inputIcon}>
                                        <KeyRound size={18} strokeWidth={1.75} />
                                    </div>
                                    <input
                                        id="password-input"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete={formState === 0 ? "current-password" : "new-password"}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: null }));
                                        }}
                                        onKeyDown={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
                                        onKeyUp={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
                                        onBlur={() => setCapsLockActive(false)}
                                        placeholder="Enter your password"
                                        className={styles.inputField}
                                    />
                                    <button
                                        type="button"
                                        aria-label="Toggle password visibility"
                                        className={styles.passwordToggleBtn}
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={20} strokeWidth={1.75} /> : <Eye size={20} strokeWidth={1.75} />}
                                    </button>
                                </div>
                                {capsLockActive && (
                                    <span className={styles.capsLockWarning}>Caps Lock is ON</span>
                                )}
                                {fieldErrors.password && (
                                    <span className={styles.fieldErrorText}>{fieldErrors.password}</span>
                                )}

                                {/* Password Strength Meter (Create Account Only) */}
                                {formState === 1 && password.length > 0 && (
                                    <div className={styles.strengthMeterContainer}>
                                        <div className={styles.strengthSegments}>
                                            <div className={`${styles.strengthBar} ${strength.score >= 1 ? (strength.score === 1 ? styles.strengthActiveWeak : strength.score === 2 ? styles.strengthActiveFair : strength.score === 3 ? styles.strengthActiveGood : styles.strengthActiveStrong) : ''}`} />
                                            <div className={`${styles.strengthBar} ${strength.score >= 2 ? (strength.score === 2 ? styles.strengthActiveFair : strength.score === 3 ? styles.strengthActiveGood : styles.strengthActiveStrong) : ''}`} />
                                            <div className={`${styles.strengthBar} ${strength.score >= 3 ? (strength.score === 3 ? styles.strengthActiveGood : styles.strengthActiveStrong) : ''}`} />
                                            <div className={`${styles.strengthBar} ${strength.score >= 4 ? styles.strengthActiveStrong : ''}`} />
                                        </div>
                                        <span className={styles.strengthLabel}>Password strength: {strength.label}</span>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password Input (Create Account Only) */}
                            {formState === 1 && (
                                <div className={styles.inputGroup}>
                                    <label htmlFor="confirm-password-input" className={styles.inputLabel}>
                                        Confirm password
                                    </label>
                                    <div className={`${styles.inputWrapper} ${fieldErrors.confirmPassword ? styles.inputWrapperError : ''}`}>
                                        <div className={styles.inputIcon}>
                                            <KeyRound size={18} strokeWidth={1.75} />
                                        </div>
                                        <input
                                            id="confirm-password-input"
                                            name="confirmPassword"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            value={confirmPassword}
                                            onChange={(e) => {
                                                setConfirmPassword(e.target.value);
                                                if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: null }));
                                            }}
                                            onKeyDown={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
                                            onKeyUp={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
                                            onBlur={() => setCapsLockActive(false)}
                                            placeholder="Enter your password"
                                            className={styles.inputField}
                                        />
                                    </div>
                                    {capsLockActive && (
                                        <span className={styles.capsLockWarning}>Caps Lock is ON</span>
                                    )}
                                    {fieldErrors.confirmPassword && (
                                        <span className={styles.fieldErrorText}>{fieldErrors.confirmPassword}</span>
                                    )}
                                </div>
                            )}

                            {/* Terms Notice (Create account only) */}
                            {formState === 1 && (
                                <p className={styles.termsNotice}>
                                    By creating an account you agree to <span className={styles.termsLink}>Terms</span> and <span className={styles.termsLink}>Privacy</span>
                                </p>
                            )}

                            {/* Primary Button */}
                            <motion.button
                                type="submit"
                                disabled={isLoading}
                                className={styles.primarySubmitBtn}
                                whileTap={{ scale: 0.98 }}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={18} strokeWidth={1.75} className="animate-spin" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <span>{formState === 0 ? "Sign in" : "Create account"}</span>
                                )}
                            </motion.button>
                        </motion.form>
                    </AnimatePresence>

                    {/* Divider */}
                    <div className={styles.dividerRow}>
                        <span>or</span>
                    </div>

                    {/* Secondary Button: Join as guest */}
                    <button
                        type="button"
                        onClick={handleGuestJoin}
                        className={styles.guestSecondaryBtn}
                    >
                        <Zap size={18} strokeWidth={1.75} className="text-[#34D399]" />
                        <span>Join as guest</span>
                    </button>
                </motion.div>

                {/* Panel Footer (Centered at bottom) */}
                <div className={styles.panelFooter}>
                    © 2026 PulseMeet · Privacy · Terms · Status
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
