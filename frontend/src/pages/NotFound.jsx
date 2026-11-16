import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Video, Home, LayoutDashboard } from 'lucide-react';
import styles from '../styles/notfound.module.css';

export default function NotFound() {
    const navigate = useNavigate();
    const shouldReduceMotion = useReducedMotion();
    const hasToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('token'));

    return (
        <div className={styles.notFoundContainer}>
            <div className={styles.emeraldGlowTop} />
            <div className={styles.emeraldGlowBottom} />

            {/* Top Navigation */}
            <header className={styles.header}>
                <div className={styles.brandLink} onClick={() => navigate('/')}>
                    <div className={styles.brandIcon}>
                        <Video strokeWidth={1.75} className={styles.logoMarkIcon} />
                    </div>
                    <span className={styles.brandTitle}>PulseMeet</span>
                </div>
            </header>

            {/* Main 404 Card */}
            <main className={styles.contentWrapper}>
                <motion.div
                    className={styles.card}
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className={styles.badge}>
                        <span className={styles.badgeDot} />
                        <span>404 Not Found</span>
                    </div>

                    <div className={styles.codeNumber}>404</div>

                    <h1 className={styles.title}>Room or Page Not Found</h1>

                    <p className={styles.description}>
                        The meeting room or page you are looking for doesn't exist, has ended, or the room code in the URL is invalid.
                    </p>

                    <div className={styles.actionRow}>
                        <button
                            type="button"
                            className={styles.primaryBtn}
                            onClick={() => navigate(hasToken ? '/home' : '/auth')}
                        >
                            <LayoutDashboard size={18} strokeWidth={2} />
                            <span>{hasToken ? 'Return to Dashboard' : 'Sign In to Dashboard'}</span>
                        </button>

                        <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={() => navigate('/')}
                        >
                            <Home size={18} strokeWidth={1.75} />
                            <span>Back to Home</span>
                        </button>
                    </div>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className={styles.footer}>
                © 2026 PulseMeet
            </footer>
        </div>
    );
}
