import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import styles from '../../styles/errorBoundary.module.css';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an unhandled exception:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className={styles.boundaryContainer} role="alert">
                    <div className={styles.glowTop} />
                    <div className={styles.card}>
                        <div className={styles.iconWrapper}>
                            <AlertTriangle size={28} strokeWidth={2} />
                        </div>

                        <h1 className={styles.title}>Something went wrong</h1>

                        <p className={styles.description}>
                            An unexpected application error occurred (such as a device permission conflict, connection reset, or rendering exception).
                        </p>

                        {this.state.error?.message && (
                            <div className={styles.errorBox}>
                                {this.state.error.message}
                            </div>
                        )}

                        <div className={styles.actionRow}>
                            <button
                                type="button"
                                className={styles.primaryBtn}
                                onClick={this.handleReload}
                            >
                                <RotateCcw size={18} strokeWidth={2} />
                                <span>Reload Application</span>
                            </button>

                            <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={this.handleGoHome}
                            >
                                <Home size={18} strokeWidth={1.75} />
                                <span>Back to Home</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
