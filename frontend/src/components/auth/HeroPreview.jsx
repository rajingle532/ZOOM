import React, { useState, useEffect, memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
    Lock,
    Zap,
    HardDrive,
    Video,
    Mic,
    MicOff,
    Users,
    Disc,
    Hand,
    MessageSquare,
    PhoneOff,
    ScreenShare
} from 'lucide-react';
import styles from '../../styles/auth.module.css';

const participants = [
    {
        id: 'raj',
        name: 'Raj (Host)',
        initial: 'R',
        tint: styles.avatarEmerald,
        showMicOff: false
    },
    {
        id: 'sarah',
        name: 'Sarah Miller',
        initial: 'S',
        tint: styles.avatarSky,
        showMicOff: true
    },
    {
        id: 'alex',
        name: 'Alex Rivera',
        initial: 'A',
        tint: styles.avatarAmber,
        showMicOff: false
    },
    {
        id: 'elena',
        name: 'Elena Rostova',
        initial: 'E',
        tint: styles.avatarRose,
        showMicOff: false
    }
];

const waveformScales = [0.4, 0.9, 0.6, 1.0, 0.5];

function HeroPreviewComponent() {
    // Media query check: HeroPreview must NOT mount below 1024px so timers never run on mobile
    const [isDesktop, setIsDesktop] = useState(() => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(min-width: 1024px)').matches;
        }
        return true;
    });

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mediaQuery = window.matchMedia('(min-width: 1024px)');
        const handler = (e) => setIsDesktop(e.matches);

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handler);
        } else {
            mediaQuery.addListener(handler);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handler);
            } else {
                mediaQuery.removeListener(handler);
            }
        };
    }, []);

    const [recSeconds, setRecSeconds] = useState(1122); // Start at 00:18:42
    const [activeSpeakerIndex, setActiveSpeakerIndex] = useState(0);
    const [isShortViewport, setIsShortViewport] = useState(false);
    const shouldReduceMotion = useReducedMotion();

    // Viewport height listener for < 860px (switches to 1x2 tiles)
    useEffect(() => {
        if (!isDesktop) return;
        const checkHeight = () => {
            if (typeof window !== 'undefined') {
                setIsShortViewport(window.innerHeight < 860);
            }
        };
        checkHeight();
        window.addEventListener('resize', checkHeight);
        return () => window.removeEventListener('resize', checkHeight);
    }, [isDesktop]);

    // Live ticking REC timer
    useEffect(() => {
        if (!isDesktop) return;
        const timer = setInterval(() => {
            setRecSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [isDesktop]);

    // Rotate active speaker every 4 seconds (rotates among visible tiles)
    useEffect(() => {
        if (!isDesktop) return;
        const interval = setInterval(() => {
            setActiveSpeakerIndex((prev) => (prev + 1) % (isShortViewport ? 2 : 4));
        }, 4000);
        return () => clearInterval(interval);
    }, [isDesktop, isShortViewport]);

    // Format seconds into HH:MM:SS
    const formatRecTime = (totalSec) => {
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const chipVariants = {
        hidden: { opacity: 0, scale: 0.9 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { duration: 0.4, delay: 0.2, ease: "easeOut" }
        }
    };

    if (!isDesktop) {
        return null;
    }

    const visibleParticipants = isShortViewport
        ? participants.slice(0, 2)
        : participants;

    return (
        <div className={styles.previewWrap}>
            {/* Satellite Chip A (Top-Right: top -1.75rem, right -1.25rem) */}
            <motion.div
                className={styles.satelliteChipA}
                variants={shouldReduceMotion ? undefined : chipVariants}
                initial={shouldReduceMotion ? false : "hidden"}
                animate="visible"
            >
                <Zap strokeWidth={1.75} className={`${styles.satelliteChipIcon} ${styles.iconAccent}`} />
                <span>Direct connection</span>
            </motion.div>

            {/* Satellite Chip B (Bottom-Left: bottom -1.75rem, left -1.25rem) */}
            <motion.div
                className={styles.satelliteChipB}
                variants={shouldReduceMotion ? undefined : chipVariants}
                initial={shouldReduceMotion ? false : "hidden"}
                animate="visible"
            >
                <HardDrive strokeWidth={1.75} className={`${styles.satelliteChipIcon} ${styles.iconAccent}`} />
                <span>Recording saves to your disk</span>
            </motion.div>

            {/* The Hero Preview Window Card */}
            <div className={styles.previewCard}>
                {/* 1. Top Bar */}
                <div className={styles.windowBar}>
                    <div className={styles.windowUrl}>
                        <Lock strokeWidth={1.75} className={`${styles.topBarIcon} ${styles.iconAccent}`} />
                        <span>alpha-9x</span>
                    </div>
                    <div className={styles.windowMetaRight}>
                        <div className={styles.recIndicator}>
                            <div className={styles.recPulseDot} />
                            <span>REC {formatRecTime(recSeconds)}</span>
                        </div>
                        <div className={styles.participantCount}>
                            <Users strokeWidth={1.75} className={styles.topBarIcon} />
                            <span>{visibleParticipants.length}</span>
                        </div>
                        {/* 3-Bar Signal Icon (Inline SVG) */}
                        <svg
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            className={`${styles.signalIcon} ${styles.iconAccent}`}
                            aria-hidden="true"
                        >
                            <rect x="2" y="10" width="3" height="6" rx="1" />
                            <rect x="7" y="6" width="3" height="10" rx="1" />
                            <rect x="12" y="2" width="3" height="14" rx="1" />
                        </svg>
                    </div>
                </div>

                {/* 2. Stage (Flex: 1 1 0, Min-Height: 0) */}
                <div className={styles.stage}>
                    {visibleParticipants.map((p, idx) => {
                        const isSpeaking = activeSpeakerIndex === idx;
                        return (
                            <div
                                key={p.id}
                                className={`${styles.tile} ${isSpeaking ? styles.speakingTile : ''}`}
                            >
                                <div className={`${styles.avatarCircle} ${p.tint}`}>
                                    {p.initial}
                                </div>
                                {isSpeaking ? (
                                    <div className={styles.speakingWaveContainer}>
                                        {waveformScales.map((scale, i) => (
                                            <motion.div
                                                key={i}
                                                className={styles.activeWaveBar}
                                                animate={shouldReduceMotion ? { scaleY: 0.5 } : { scaleY: [0.25, scale, 0.25] }}
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
                                    <span>{p.name}</span>
                                    {isSpeaking ? (
                                        <span className={styles.speakingPulseDot} />
                                    ) : p.showMicOff ? (
                                        <MicOff strokeWidth={1.75} className={styles.tileMicOffIcon} />
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 3. Dock Row */}
                <div className={styles.dockRow}>
                    <div className={styles.dockLeftSpacer} />
                    <div className={styles.dockPill}>
                        <div className={styles.dockIconBtn} title="Mic">
                            <Mic strokeWidth={1.75} className={`${styles.dockIcon} ${styles.iconAccent}`} />
                        </div>
                        <div className={styles.dockIconBtn} title="Camera">
                            <Video strokeWidth={1.75} className={styles.dockIcon} />
                        </div>
                        <div className={styles.dockIconBtn} title="Share screen">
                            <ScreenShare strokeWidth={1.75} className={styles.dockIcon} />
                        </div>
                        <div className={styles.dockIconBtn} title="Record">
                            <Disc strokeWidth={1.75} className={`${styles.dockIcon} ${styles.iconDanger}`} />
                        </div>
                        <div className={styles.dockIconBtn} title="Raise hand">
                            <Hand strokeWidth={1.75} className={styles.dockIcon} />
                        </div>
                        <div className={styles.dockIconBtn} title="Chat">
                            <MessageSquare strokeWidth={1.75} className={styles.dockIcon} />
                        </div>
                        <div className={`${styles.dockIconBtn} ${styles.dockLeaveBtn}`} title="Leave">
                            <PhoneOff strokeWidth={1.75} className={styles.dockIcon} />
                        </div>
                    </div>
                    <div className={styles.dockDirectBadge}>
                        <span className={styles.dockBadgeDot} />
                        <span>64ms direct P2P</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export const HeroPreview = memo(HeroPreviewComponent);
export default HeroPreview;
