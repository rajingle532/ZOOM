import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    Lock,
    Zap,
    HardDrive,
    Video,
    User,
    Mail,
    KeyRound,
    Eye,
    EyeOff,
    ArrowLeft,
    Loader2,
    Check,
    Circle
} from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import HeroPreview from '../components/auth/HeroPreview';
import { generateRoomCode } from '../utils/roomCode';
import styles from '../styles/auth.module.css';

export default function Authentication() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [registerUsername, setRegisterUsername] = useState("");
    const [loginIdentifier, setLoginIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [confirmBlurred, setConfirmBlurred] = useState(false);
    const [capsLockActive, setCapsLockActive] = useState(false);
    const [error, setError] = useState("");
    const [successNotice, setSuccessNotice] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [formState, setFormState] = useState(0); // 0 = Sign In, 1 = Sign Up
    const [isLoading, setIsLoading] = useState(false);
    const [shake, setShake] = useState(false);

    const shouldReduceMotion = useReducedMotion();
    const { handleRegister, handleLogin } = useContext(AuthContext);
    const navigate = useNavigate();

    // Item 1: Unified switchTab that completely resets state across tabs
    const switchTab = (next, { prefill } = {}) => {
        setFormState(next);
        setName("");
        setEmail("");
        setRegisterUsername("");
        setLoginIdentifier("");
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowConfirmPassword(false);
        setIsPasswordFocused(false);
        setConfirmBlurred(false);
        setCapsLockActive(false);
        setFieldErrors({});
        setError("");
        setSuccessNotice("");

        if (prefill?.identifier && next === 0) {
            setLoginIdentifier(prefill.identifier);
        }

        // Item 6: Autofocus first field on tab switch only when window >= 1024px
        if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(min-width: 1024px)").matches) {
            setTimeout(() => {
                if (next === 0) {
                    document.getElementById("identifier-input")?.focus();
                } else {
                    document.getElementById("name-input")?.focus();
                }
            }, 50);
        }
    };

    // Item 6: Autofocus first field on initial mount only when >= 1024px
    useEffect(() => {
        if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(min-width: 1024px)").matches) {
            document.getElementById("identifier-input")?.focus();
        }
    }, []);

    // Password rules checklist calculations
    const ruleMinLength = password.length >= 8;
    const ruleHasLetter = /[a-zA-Z]/.test(password);
    const ruleHasNumber = /[0-9]/.test(password);
    const allThreeRulesMet = ruleMinLength && ruleHasLetter && ruleHasNumber;

    // Password strength evaluation
    const getPasswordStrength = (pass) => {
        if (!pass) return { score: 0, label: "none" };
        if (!allThreeRulesMet) {
            return { score: 1, label: "weak" };
        }
        const hasSymbolOrMixedCase = /[^a-zA-Z0-9]/.test(pass) || (/[a-z]/.test(pass) && /[A-Z]/.test(pass));
        if (pass.length >= 12 && hasSymbolOrMixedCase) {
            return { score: 4, label: "strong" };
        }
        if (pass.length >= 10) {
            return { score: 3, label: "good" };
        }
        return { score: 2, label: "fair" };
    };

    const strength = getPasswordStrength(password);
    const showPasswordRules = formState === 1 && (isPasswordFocused || password.length > 0);

    // Confirm password matching calculations
    const isConfirmMatch = confirmPassword.length > 0 && password.length > 0 && confirmPassword === password;
    const isConfirmMismatch = (confirmBlurred && confirmPassword.length > 0 && confirmPassword !== password) ||
        (confirmPassword.length >= password.length && password.length > 0 && confirmPassword !== password);

    // Username helper text
    const hasUppercase = /[A-Z]/.test(registerUsername);
    const usernameHelperText = `3-24 letters, numbers or underscore.${hasUppercase ? " Saved in lowercase." : ""}`;

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 450);
    };

    const handleAuth = async (e) => {
        if (e) e.preventDefault();
        setError("");
        setSuccessNotice("");
        setFieldErrors({});

        if (formState === 0) {
            // Sign in tab validation
            const errors = {};
            if (!loginIdentifier.trim()) errors.username = "Email or username is required";
            if (!password) errors.password = "Password is required";

            if (Object.keys(errors).length > 0) {
                setFieldErrors(errors);
                triggerShake();
                return;
            }

            setIsLoading(true);
            try {
                await handleLogin(loginIdentifier.trim(), password);
            } catch (err) {
                console.error("Login error:", err);
                triggerShake();
                if (err?.response?.status === 429) {
                    setError("Too many attempts. Try again in a few minutes.");
                } else if (err?.isNetworkError) {
                    setError("Cannot reach the server. Check your connection.");
                } else if (err?.response?.data?.errors && Object.keys(err.response.data.errors).length > 0) {
                    setFieldErrors(err.response.data.errors);
                    setError("");
                } else {
                    let msg = err?.response?.data?.message || "Invalid credentials";
                    // Item 7: Login 401 copy
                    if (err?.response?.status === 401 && msg === "Invalid username or password") {
                        msg = "Incorrect email/username or password";
                    }
                    setError(msg);
                }
            } finally {
                setIsLoading(false);
            }
        } else {
            // Create account validation
            const errors = {};
            if (!name.trim()) {
                errors.name = "Full name is required";
            } else if (name.trim().length > 50) {
                errors.name = "Full name must be 50 characters or less";
            }

            const emailTrimmed = email.trim().toLowerCase();
            if (!emailTrimmed) {
                errors.email = "Email is required";
            } else if (emailTrimmed.length > 254) {
                errors.email = "Email must be 254 characters or less";
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
                errors.email = "Please enter a valid email address";
            }

            const usernameTrimmed = registerUsername.trim().toLowerCase();
            if (!usernameTrimmed) {
                errors.username = "Username is required";
            } else if (usernameTrimmed.length < 3 || usernameTrimmed.length > 24) {
                errors.username = "Username must be 3-24 characters";
            } else if (!/^[a-zA-Z0-9_]+$/.test(usernameTrimmed)) {
                errors.username = "3-24 letters, numbers or underscore.";
            }

            if (!password) {
                errors.password = "Password is required";
            } else if (password.length < 8 || password.length > 72) {
                errors.password = "Password must be 8-72 characters";
            } else if (!/[a-zA-Z]/.test(password)) {
                errors.password = "Password must contain at least one letter";
            } else if (!/[0-9]/.test(password)) {
                errors.password = "Password must contain at least one number";
            }

            if (!confirmPassword) {
                errors.confirmPassword = "Please confirm your password";
            } else if (password !== confirmPassword) {
                errors.confirmPassword = "Passwords do not match";
            }

            if (Object.keys(errors).length > 0) {
                setFieldErrors(errors);
                triggerShake();
                return;
            }

            setIsLoading(true);
            try {
                await handleRegister(name.trim(), usernameTrimmed, password, emailTrimmed);
                const registeredEmail = emailTrimmed;
                const registeredPassword = password;

                setPassword("");
                setConfirmPassword("");
                setName("");

                try {
                    // Auto-login with EMAIL + password
                    await handleLogin(registeredEmail, registeredPassword);
                } catch (loginErr) {
                    console.error("Auto-login error after registration:", loginErr);
                    switchTab(0, { prefill: { identifier: registeredEmail } });
                    setSuccessNotice("Account created. Please sign in.");
                }
            } catch (err) {
                console.error("Registration error:", err);
                triggerShake();
                if (err?.response?.status === 429) {
                    setError("Too many attempts. Try again in a few minutes.");
                } else if (err?.isNetworkError) {
                    setError("Cannot reach the server. Check your connection.");
                } else if (err?.response?.data?.errors && Object.keys(err.response.data.errors).length > 0) {
                    // Item 4: Map ONLY server response keys to fields. No regex inference
                    const srvErrors = err.response.data.errors;
                    const mappedErrors = {};
                    for (const [key, val] of Object.entries(srvErrors)) {
                        mappedErrors[key] = val;
                    }
                    setFieldErrors(mappedErrors);
                    setError("");
                } else {
                    // Item 4: If no errors object, show data.message in alert box
                    setError(err?.response?.data?.message || "Something went wrong.");
                    setFieldErrors({});
                }
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleGuestJoin = () => {
        const randomRoom = generateRoomCode();
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

    return (
        <div className={styles.authContainer}>
            {/* ================= LEFT PANEL (50/50 Desktop Split, Grid Rows: auto 1fr auto) ================= */}
            <div className={styles.leftPanel}>
                <div className={styles.emeraldGlowTop} />
                <div className={styles.emeraldGlowBottom} />
                <div className={styles.noiseOverlay} />

                {/* Row 1: Logo Only (Height: 2.25rem for shared alignment with Back to Home) */}
                <div className={styles.leftHeader}>
                    <div className={styles.brandLink} onClick={() => navigate('/')}>
                        <div className={styles.brandIcon}>
                            <Video strokeWidth={1.75} className={styles.logoMarkIcon} />
                        </div>
                        <span className={styles.brandTitle}>PulseMeet</span>
                    </div>
                </div>

                {/* Row 2: Headline, Subtext, Hero Preview */}
                <motion.div
                    className={styles.leftMiddleContent}
                    variants={leftContainerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.h1 className={styles.headline} variants={leftItemVariants}>
                        Video meetings, straight between <span className={styles.emeraldText}>browsers.</span>
                    </motion.h1>

                    <motion.p className={styles.subtext} variants={leftItemVariants}>
                        Audio and video go directly between participants. Our server only helps them find each other.
                    </motion.p>

                    {/* Hero Preview Window Card & Floating Satellite Chips */}
                    <motion.div variants={leftItemVariants}>
                        <HeroPreview />
                    </motion.div>
                </motion.div>

                {/* Row 3: Left Footer Trust Row */}
                <div className={styles.leftTrustRow}>
                    <div className={styles.trustItem}>
                        <Lock strokeWidth={1.75} className={`${styles.trustRowIcon} ${styles.iconAccent}`} />
                        <span>Peer-to-peer</span>
                    </div>
                    <div className={styles.trustDivider} />
                    <div className={styles.trustItem}>
                        <Zap strokeWidth={1.75} className={`${styles.trustRowIcon} ${styles.iconAccent}`} />
                        <span>Low latency</span>
                    </div>
                    <div className={styles.trustDivider} />
                    <div className={styles.trustItem}>
                        <HardDrive strokeWidth={1.75} className={`${styles.trustRowIcon} ${styles.iconAccent}`} />
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
                            <Video strokeWidth={1.75} className={styles.logoMarkIcon} />
                        </div>
                        <span className={styles.brandTitle}>PulseMeet</span>
                    </div>

                    <div className={styles.backGhostLink} onClick={() => navigate('/')}>
                        <ArrowLeft strokeWidth={1.75} className={styles.backGhostIcon} />
                        <span>Back to home</span>
                    </div>
                </div>

                {/* Centered Form Card (30rem wide, Shake on Error, Smooth Layout Animation) */}
                <motion.div
                    className={styles.formCard}
                    layout
                    animate={shake ? { x: [0, -8, 8, -4, 4, 0] } : { x: 0 }}
                    transition={{
                        layout: { duration: shouldReduceMotion ? 0 : 0.25, ease: "easeOut" },
                        x: { duration: 0.4, ease: "easeInOut" }
                    }}
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
                            onClick={() => switchTab(0)}
                        >
                            Sign in
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={formState === 1}
                            className={`${styles.tabSegment} ${formState === 1 ? styles.tabSegmentActive : ''}`}
                            onClick={() => switchTab(1)}
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

                    {/* Success Notice Banner (Animated Height + Opacity) */}
                    <AnimatePresence>
                        {successNotice && (
                            <motion.div
                                key="success-notice"
                                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                                transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeInOut" }}
                                style={{ overflow: "hidden" }}
                                className={styles.alertSuccess}
                                role="status"
                                aria-live="polite"
                            >
                                <span>{successNotice}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Server Error Alert Banner (Animated Height + Opacity) */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                key="error-alert"
                                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                                transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeInOut" }}
                                style={{ overflow: "hidden" }}
                                className={styles.alertError}
                                role="alert"
                                aria-live="polite"
                            >
                                <span>{error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Tab Body Wrapper with 0.2s Crossfade */}
                    <div className={styles.tabContentWrapper}>
                        <AnimatePresence mode="wait">
                            <motion.form
                                key={formState}
                                onSubmit={handleAuth}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className={styles.formBody}
                                noValidate
                            >
                                {/* 1. Full Name Input (Create Account Only) */}
                                {formState === 1 && (
                                    <div className={styles.inputGroup}>
                                        <label htmlFor="name-input" className={styles.inputLabel}>
                                            Full name
                                        </label>
                                        <div className={`${styles.inputWrapper} ${fieldErrors.name ? styles.inputWrapperError : ''}`}>
                                            <div className={styles.inputIconWrapper}>
                                                <User strokeWidth={1.75} className={styles.inputIcon} />
                                            </div>
                                            <input
                                                id="name-input"
                                                name="name"
                                                type="text"
                                                autoComplete="name"
                                                value={name}
                                                onChange={(e) => {
                                                    setName(e.target.value);
                                                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: null }));
                                                }}
                                                placeholder="Your full name"
                                                className={styles.inputField}
                                                aria-invalid={!!fieldErrors.name}
                                                aria-describedby={fieldErrors.name ? "name-error" : undefined}
                                            />
                                        </div>
                                        <AnimatePresence>
                                            {fieldErrors.name && (
                                                <motion.div
                                                    key="name-error"
                                                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                                                    transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeInOut" }}
                                                    style={{ overflow: "hidden" }}
                                                >
                                                    <span id="name-error" className={styles.fieldErrorText} role="alert">
                                                        {fieldErrors.name}
                                                    </span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* 2. Email Input (Create Account Only) */}
                                {formState === 1 && (
                                    <div className={styles.inputGroup}>
                                        <label htmlFor="email-input" className={styles.inputLabel}>
                                            Email
                                        </label>
                                        <div className={`${styles.inputWrapper} ${fieldErrors.email ? styles.inputWrapperError : ''}`}>
                                            <div className={styles.inputIconWrapper}>
                                                <Mail strokeWidth={1.75} className={styles.inputIcon} />
                                            </div>
                                            <input
                                                id="email-input"
                                                name="email"
                                                type="email"
                                                autoComplete="email"
                                                value={email}
                                                onChange={(e) => {
                                                    setEmail(e.target.value);
                                                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: null }));
                                                }}
                                                placeholder="you@example.com"
                                                className={styles.inputField}
                                                aria-invalid={!!fieldErrors.email}
                                                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                                            />
                                        </div>
                                        <AnimatePresence>
                                            {fieldErrors.email && (
                                                <motion.div
                                                    key="email-error"
                                                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                                                    transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeInOut" }}
                                                    style={{ overflow: "hidden" }}
                                                    className={styles.fieldErrorWithAction}
                                                >
                                                    <span id="email-error" className={styles.fieldErrorText} role="alert">
                                                        {fieldErrors.email}
                                                    </span>
                                                    {/already registered/i.test(fieldErrors.email) && (
                                                        <button
                                                            type="button"
                                                            className={styles.fieldActionLink}
                                                            onClick={() => switchTab(0, { prefill: { identifier: email.trim().toLowerCase() } })}
                                                        >
                                                            Sign in instead
                                                        </button>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* 3. Username / Email or username Input (Separated States) */}
                                <div className={styles.inputGroup}>
                                    <label htmlFor={formState === 0 ? "identifier-input" : "username-input"} className={styles.inputLabel}>
                                        {formState === 0 ? "Email or username" : "Username"}
                                    </label>
                                    <div className={`${styles.inputWrapper} ${(fieldErrors.username || fieldErrors.identifier) ? styles.inputWrapperError : ''}`}>
                                        <div className={styles.inputIconWrapper}>
                                            <User strokeWidth={1.75} className={styles.inputIcon} />
                                        </div>
                                        {formState === 0 ? (
                                            <input
                                                id="identifier-input"
                                                name="identifier"
                                                type="text"
                                                autoComplete="username"
                                                value={loginIdentifier}
                                                onChange={(e) => {
                                                    setLoginIdentifier(e.target.value);
                                                    if (fieldErrors.username || fieldErrors.identifier) setFieldErrors(prev => ({ ...prev, username: null, identifier: null }));
                                                }}
                                                placeholder="you@example.com or username"
                                                className={styles.inputField}
                                                aria-invalid={!!(fieldErrors.username || fieldErrors.identifier)}
                                                aria-describedby={(fieldErrors.username || fieldErrors.identifier) ? "identifier-error" : undefined}
                                            />
                                        ) : (
                                            <input
                                                id="username-input"
                                                name="username"
                                                type="text"
                                                autoComplete="username"
                                                value={registerUsername}
                                                onChange={(e) => {
                                                    setRegisterUsername(e.target.value);
                                                    if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: null }));
                                                }}
                                                placeholder="Choose a username"
                                                className={styles.inputField}
                                                aria-invalid={!!fieldErrors.username}
                                                aria-describedby="username-helper"
                                            />
                                        )}
                                    </div>
                                    <AnimatePresence>
                                        {formState === 0 && (fieldErrors.identifier || fieldErrors.username) && (
                                            <motion.div
                                                key="identifier-error"
                                                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                                                transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeInOut" }}
                                                style={{ overflow: "hidden" }}
                                            >
                                                <span id="identifier-error" className={styles.fieldErrorText} role="alert">
                                                    {fieldErrors.identifier || fieldErrors.username}
                                                </span>
                                            </motion.div>
                                        )}
                                        {formState === 1 && fieldErrors.username && (
                                            <motion.div
                                                key="username-error"
                                                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                                                transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeInOut" }}
                                                style={{ overflow: "hidden" }}
                                            >
                                                <span id="username-helper" className={styles.fieldHelperError} role="alert">
                                                    {fieldErrors.username}
                                                </span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    {formState === 1 && !fieldErrors.username && (
                                        <span id="username-helper" className={styles.fieldHelperText}>
                                            {usernameHelperText}
                                        </span>
                                    )}
                                </div>

                                {/* 4. Password Input */}
                                <div className={styles.inputGroup}>
                                    <label htmlFor="password-input" className={styles.inputLabel}>
                                        Password
                                    </label>
                                    <div className={`${styles.inputWrapper} ${fieldErrors.password ? styles.inputWrapperError : ''}`}>
                                        <div className={styles.inputIconWrapper}>
                                            <KeyRound strokeWidth={1.75} className={styles.inputIcon} />
                                        </div>
                                        <input
                                            id="password-input"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete={formState === 0 ? "current-password" : "new-password"}
                                            value={password}
                                            onFocus={() => setIsPasswordFocused(true)}
                                            onBlur={() => {
                                                setIsPasswordFocused(false);
                                                setCapsLockActive(false);
                                            }}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: null }));
                                            }}
                                            onKeyDown={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
                                            onKeyUp={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
                                            placeholder={formState === 0 ? "Enter your password" : "Create a password"}
                                            className={styles.inputField}
                                            aria-invalid={!!fieldErrors.password}
                                            aria-describedby={fieldErrors.password ? "password-error" : undefined}
                                        />
                                        <button
                                            type="button"
                                            aria-label="Toggle password visibility"
                                            className={styles.passwordToggleBtn}
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff strokeWidth={1.75} className={styles.eyeToggleIcon} />
                                            ) : (
                                                <Eye strokeWidth={1.75} className={styles.eyeToggleIcon} />
                                            )}
                                        </button>
                                    </div>
                                    {capsLockActive && (
                                        <span className={styles.capsLockWarning}>Caps Lock is ON</span>
                                    )}
                                    <AnimatePresence>
                                        {fieldErrors.password && (
                                            <motion.div
                                                key="password-error"
                                                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                                                transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeInOut" }}
                                                style={{ overflow: "hidden" }}
                                            >
                                                <span id="password-error" className={styles.fieldErrorText} role="alert">
                                                    {fieldErrors.password}
                                                </span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Compact Password Rules Checklist (Item 3) */}
                                    <AnimatePresence>
                                        {showPasswordRules && (
                                            <motion.div
                                                key="password-rules-box"
                                                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                                                transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeInOut" }}
                                                style={{ overflow: "hidden" }}
                                                className={styles.passwordChecklist}
                                            >
                                                {/* Three rules as chips in one row */}
                                                <div className={styles.rulesChipsRow}>
                                                    <div className={`${styles.checklistItem} ${ruleMinLength ? styles.checklistMet : styles.checklistUnmet}`}>
                                                        {ruleMinLength ? (
                                                            <Check strokeWidth={2} className={styles.ruleIcon} />
                                                        ) : (
                                                            <Circle strokeWidth={1.75} className={styles.ruleIcon} />
                                                        )}
                                                        <span>8+ characters</span>
                                                    </div>
                                                    <div className={`${styles.checklistItem} ${ruleHasLetter ? styles.checklistMet : styles.checklistUnmet}`}>
                                                        {ruleHasLetter ? (
                                                            <Check strokeWidth={2} className={styles.ruleIcon} />
                                                        ) : (
                                                            <Circle strokeWidth={1.75} className={styles.ruleIcon} />
                                                        )}
                                                        <span>A letter</span>
                                                    </div>
                                                    <div className={`${styles.checklistItem} ${ruleHasNumber ? styles.checklistMet : styles.checklistUnmet}`}>
                                                        {ruleHasNumber ? (
                                                            <Check strokeWidth={2} className={styles.ruleIcon} />
                                                        ) : (
                                                            <Circle strokeWidth={1.75} className={styles.ruleIcon} />
                                                        )}
                                                        <span>A number</span>
                                                    </div>
                                                </div>

                                                {/* 4-Segment Strength Bar + Label sharing one row */}
                                                <div className={styles.strengthMeterRow}>
                                                    <div className={styles.strengthSegments}>
                                                        <div className={`${styles.strengthBar} ${strength.score >= 1 ? (strength.score === 1 ? styles.strengthActiveWeak : strength.score === 2 ? styles.strengthActiveFair : strength.score === 3 ? styles.strengthActiveGood : styles.strengthActiveStrong) : ''}`} />
                                                        <div className={`${styles.strengthBar} ${strength.score >= 2 ? (strength.score === 2 ? styles.strengthActiveFair : strength.score === 3 ? styles.strengthActiveGood : styles.strengthActiveStrong) : ''}`} />
                                                        <div className={`${styles.strengthBar} ${strength.score >= 3 ? (strength.score === 3 ? styles.strengthActiveGood : styles.strengthActiveStrong) : ''}`} />
                                                        <div className={`${styles.strengthBar} ${strength.score >= 4 ? styles.strengthActiveStrong : ''}`} />
                                                    </div>
                                                    <span className={styles.strengthLabel}>
                                                        Strength: {strength.label}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* 5. Confirm Password Input (Create Account Only) */}
                                {formState === 1 && (
                                    <div className={styles.inputGroup}>
                                        <label htmlFor="confirm-password-input" className={styles.inputLabel}>
                                            Confirm password
                                        </label>
                                        <div className={`${styles.inputWrapper} ${fieldErrors.confirmPassword || isConfirmMismatch ? styles.inputWrapperError : ''}`}>
                                            <div className={styles.inputIconWrapper}>
                                                <KeyRound strokeWidth={1.75} className={styles.inputIcon} />
                                            </div>
                                            <input
                                                id="confirm-password-input"
                                                name="confirmPassword"
                                                type={showConfirmPassword ? "text" : "password"}
                                                autoComplete="new-password"
                                                value={confirmPassword}
                                                onChange={(e) => {
                                                    setConfirmPassword(e.target.value);
                                                    if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: null }));
                                                }}
                                                onKeyDown={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
                                                onKeyUp={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
                                                onBlur={() => {
                                                    setConfirmBlurred(true);
                                                    setCapsLockActive(false);
                                                }}
                                                placeholder="Re-enter your password"
                                                className={`${styles.inputField} ${styles.inputFieldConfirm}`}
                                                aria-invalid={isConfirmMismatch || !!fieldErrors.confirmPassword}
                                                aria-describedby={isConfirmMismatch || fieldErrors.confirmPassword ? "confirm-password-error" : undefined}
                                            />
                                            <div className={styles.inputRightActions}>
                                                {isConfirmMatch && (
                                                    <Check strokeWidth={2} className={styles.confirmMatchIcon} aria-label="Passwords match" />
                                                )}
                                                <button
                                                    type="button"
                                                    aria-label="Toggle confirm password visibility"
                                                    className={styles.passwordToggleBtn}
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                >
                                                    {showConfirmPassword ? (
                                                        <EyeOff strokeWidth={1.75} className={styles.eyeToggleIcon} />
                                                    ) : (
                                                        <Eye strokeWidth={1.75} className={styles.eyeToggleIcon} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        {capsLockActive && (
                                            <span className={styles.capsLockWarning}>Caps Lock is ON</span>
                                        )}
                                        <AnimatePresence>
                                            {(isConfirmMismatch || fieldErrors.confirmPassword) && (
                                                <motion.div
                                                    key="confirm-password-error"
                                                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                                                    transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeInOut" }}
                                                    style={{ overflow: "hidden" }}
                                                >
                                                    <span id="confirm-password-error" className={styles.fieldErrorText} role="alert">
                                                        {fieldErrors.confirmPassword || "Passwords do not match"}
                                                    </span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
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
                                            <Loader2 strokeWidth={1.75} className={`${styles.loaderIcon} ${styles.spin}`} />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <span>{formState === 0 ? "Sign in" : "Create account"}</span>
                                    )}
                                </motion.button>
                            </motion.form>
                        </AnimatePresence>
                    </div>

                    {/* Divider & Guest Join (Sign in tab only) */}
                    {formState === 0 && (
                        <>
                            <div className={styles.dividerRow}>
                                <span>or</span>
                            </div>

                            <button
                                type="button"
                                onClick={handleGuestJoin}
                                className={styles.guestSecondaryBtn}
                            >
                                <Zap strokeWidth={1.75} className={`${styles.guestSecondaryIcon} ${styles.iconAccent}`} />
                                <span>Join as guest</span>
                            </button>
                        </>
                    )}
                </motion.div>

                {/* Panel Footer (Clean text in flow below the card with margin-top: auto per Item L) */}
                <div className={styles.panelFooter}>
                    © 2026 PulseMeet
                </div>
            </div>
        </div>
    );
}
