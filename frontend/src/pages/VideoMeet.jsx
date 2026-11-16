import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Badge,
    IconButton,
    TextField,
    Button,
    Typography,
    Box,
    Snackbar,
    Tooltip,
    Menu,
    MenuItem,
    Avatar
} from '@mui/material';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import StopIcon from '@mui/icons-material/Stop';
import PanToolIcon from '@mui/icons-material/PanTool';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

import styles from "../styles/videoComponent.module.css";
import { AuthContext } from '../contexts/AuthContext';
import { parseRoomCode } from '../utils/roomCode';
import { useMediaDevices } from '../hooks/useMediaDevices';
import { useWebRTC } from '../hooks/useWebRTC';

/**
 * Individual remote participant video tile with unified unmuted audio/video,
 * persistent media element rendering (opacity: 0 when camera is off so sound never drops),
 * autoplay recovery, per-peer local mute (to eliminate feedback during testing),
 * camera-off avatar representation, and speaking waveform animation.
 */
function PeerVideoTile({
    peerVideo,
    isPeerSpeaking,
    peerName,
    mediaState,
    getAvatarGradient
}) {
    const videoRef = useRef(null);
    const [isAudioMutedByMe, setIsAudioMutedByMe] = useState(false);
    const [autoplayBlocked, setAutoplayBlocked] = useState(false);

    const hasVideo = mediaState?.video !== false;
    const isMicMuted = mediaState?.audio === false;

    // Attach stream to video element and handle audio/video playback
    useEffect(() => {
        const videoEl = videoRef.current;
        const stream = peerVideo.stream;
        if (!videoEl || !stream) return;

        videoEl.srcObject = stream;
        videoEl.muted = isAudioMutedByMe;

        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    setAutoplayBlocked(false);
                })
                .catch((err) => {
                    if (err.name === 'NotAllowedError') {
                        console.warn(`[Autoplay] Blocked for peer ${peerVideo.socketId}:`, err);
                        setAutoplayBlocked(true);
                    }
                });
        }
    }, [peerVideo.stream, peerVideo.socketId, isAudioMutedByMe]);

    const handleEnableAudio = () => {
        if (videoRef.current) {
            videoRef.current.muted = false;
            setIsAudioMutedByMe(false);
            videoRef.current.play().then(() => setAutoplayBlocked(false)).catch(() => {});
        }
    };

    return (
        <div className={`${styles.videoTile} ${isPeerSpeaking ? styles.activeSpeaker : ""}`}>
            {/* Unified Video & Audio Element: Unmuted for remote peer so sound plays crystal clear! */}
            <video
                data-socket={peerVideo.socketId}
                ref={videoRef}
                autoPlay
                playsInline
                muted={isAudioMutedByMe}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: hasVideo ? 1 : 0,
                    zIndex: hasVideo ? 1 : 0,
                    pointerEvents: hasVideo ? 'auto' : 'none'
                }}
            />

            {/* Avatar card when camera is turned off (placed in front of video element) */}
            {!hasVideo && (
                <div className={styles.cameraOffCard} style={{ position: 'relative', zIndex: 2 }}>
                    <div className={styles.avatarWrapper}>
                        {isPeerSpeaking && <div className={styles.speakingWaveRing} />}
                        <Avatar
                            className={styles.cameraOffAvatar}
                            sx={{ background: getAvatarGradient(peerName) }}
                        >
                            {peerName.charAt(0).toUpperCase()}
                        </Avatar>
                    </div>
                    {isPeerSpeaking && (
                        <div className={styles.avatarSpeakingMiniBars}>
                            <div className={styles.miniBar} />
                            <div className={styles.miniBar} />
                            <div className={styles.miniBar} />
                            <div className={styles.miniBar} />
                        </div>
                    )}
                </div>
            )}

            {/* Autoplay blockage alert overlay */}
            {autoplayBlocked && (
                <div
                    onClick={handleEnableAudio}
                    style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        right: 12,
                        padding: '8px 14px',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: '#fff',
                        borderRadius: 10,
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        zIndex: 20,
                        textAlign: 'center',
                        boxShadow: '0 8px 24px rgba(239, 68, 68, 0.5)'
                    }}
                >
                    🔊 Audio paused by browser. Click here to enable sound!
                </div>
            )}

            {/* Tile Overlay */}
            <div className={styles.tileOverlay} style={{ zIndex: 10 }}>
                <div className={styles.participantNameTag}>
                    {isPeerSpeaking && (
                        <div className={styles.speakingIndicatorMini}>
                            <div className={styles.speakingMiniBar} />
                            <div className={styles.speakingMiniBar} />
                            <div className={styles.speakingMiniBar} />
                        </div>
                    )}
                    <span>{peerName}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* Remote mic muted indicator */}
                    {isMicMuted && (
                        <Tooltip title={`${peerName}'s microphone is muted`} arrow>
                            <MicOffIcon sx={{ color: '#F43F5E', fontSize: 18 }} />
                        </Tooltip>
                    )}

                    {/* Local mute speaker for this peer (crucial for same-device multi-browser testing) */}
                    <Tooltip title={isAudioMutedByMe ? "Unmute sound from this peer" : "Mute sound from this peer (prevents echo/feedback during testing)"} arrow>
                        <IconButton
                            size="small"
                            onClick={() => setIsAudioMutedByMe(!isAudioMutedByMe)}
                            sx={{
                                color: isAudioMutedByMe ? '#F43F5E' : 'rgba(255,255,255,0.7)',
                                bgcolor: 'rgba(0,0,0,0.4)',
                                p: 0.5,
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)', color: '#fff' }
                            }}
                        >
                            {isAudioMutedByMe ? <VolumeOffIcon sx={{ fontSize: 16 }} /> : <VolumeUpIcon sx={{ fontSize: 16 }} />}
                        </IconButton>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}

export default function VideoMeetComponent() {
    const { code, url } = useParams();
    const navigate = useNavigate();
    const { userData } = useContext(AuthContext);

    // Standardized room code resolution
    const roomCode = parseRoomCode(code || url) || "default-room";

    // Media element refs
    const localVideoref = useRef(null);
    const lobbyVideoref = useRef(null);

    // Call recording refs & state
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const [isRecording, setIsRecording] = useState(false);

    // UI state - Auto-open chat on desktop (>=1024px) for immediate visibility
    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState("");
    const [showModal, setModal] = useState(() => {
        if (typeof window !== "undefined") {
            return window.innerWidth >= 1024;
        }
        return false;
    });
    const [message, setMessage] = useState("");
    const [reactionAnchorEl, setReactionAnchorEl] = useState(null);
    const [toastMessage, setToastMessage] = useState("");
    const [showToast, setShowToast] = useState(false);

    // Global User Interaction Listener to guarantee Autoplay Policy Audio Unlocking
    useEffect(() => {
        const unlockAllAudio = () => {
            document.querySelectorAll('video').forEach((v) => {
                if (v && v !== localVideoref.current && v !== lobbyVideoref.current) {
                    if (v.paused) {
                        v.play().catch(() => {});
                    }
                }
            });
        };

        window.addEventListener('click', unlockAllAudio);
        window.addEventListener('touchstart', unlockAllAudio);
        window.addEventListener('keydown', unlockAllAudio);

        return () => {
            window.removeEventListener('click', unlockAllAudio);
            window.removeEventListener('touchstart', unlockAllAudio);
            window.removeEventListener('keydown', unlockAllAudio);
        };
    }, []);

    // 1. Decoupled Media Devices Hook
    const {
        localStream,
        localStreamRef,
        screenStream,
        screenStreamRef,
        video,
        audio,
        screen,
        screenAvailable,
        lobbyVolume,
        isLocalSpeaking,
        toggleVideo,
        toggleAudio,
        startScreenShare,
        stopScreenShare,
        stopAllTracks,
        getMediaPermissions
    } = useMediaDevices();

    // Show toast helper
    const triggerToast = useCallback((msg) => {
        setToastMessage(msg);
        setShowToast(true);
    }, []);

    // 2. Decoupled WebRTC Mesh Hook
    const {
        videos,
        messages,
        newMessages,
        setNewMessages,
        speakingPeers,
        peerMediaStates,
        floatingReactions,
        raisedHandUser,
        isHandRaised,
        replaceVideoTrack,
        broadcastMediaState,
        connectToRoom,
        sendMessage,
        sendReaction,
        toggleRaiseHand,
        leaveRoom
    } = useWebRTC({
        roomCode,
        localStreamRef,
        username,
        onError: triggerToast
    });

    // Sync authenticated user's display name
    useEffect(() => {
        if (userData && (userData.name || userData.username)) {
            setUsername(userData.name || userData.username);
        }
    }, [userData]);

    // Request initial permissions on mount
    useEffect(() => {
        getMediaPermissions();
    }, [getMediaPermissions]);

    // Local toggle handlers that broadcast updated media state to remote participants
    const handleToggleVideo = useCallback(() => {
        toggleVideo((nextVideo) => {
            broadcastMediaState({ video: nextVideo, audio });
        });
    }, [toggleVideo, broadcastMediaState, audio]);

    const handleToggleAudio = useCallback(() => {
        toggleAudio((nextAudio) => {
            broadcastMediaState({ video, audio: nextAudio });
        });
    }, [toggleAudio, broadcastMediaState, video]);

    // Attach stream to lobby video element (checks equality to prevent decoder refresh flicker)
    useEffect(() => {
        if (lobbyVideoref.current && localStream && lobbyVideoref.current.srcObject !== localStream) {
            lobbyVideoref.current.srcObject = localStream;
        }
    }, [localStream, askForUsername]);

    // Attach stream to in-call local video element (checks equality to eliminate frame stutter)
    useEffect(() => {
        if (!askForUsername && localVideoref.current) {
            const activeStream = screenStream || localStream;
            if (activeStream && localVideoref.current.srcObject !== activeStream) {
                localVideoref.current.srcObject = activeStream;
            }
        }
    }, [askForUsername, localStream, screenStream, video]);

    // 3. Connect to Conference
    const handleJoinMeeting = () => {
        const finalName = username.trim() || ("Guest-" + Math.floor(100 + Math.random() * 900));
        setUsername(finalName);
        setAskForUsername(false);

        // Resume AudioContext during trusted user gesture to permanently unlock audio pipeline
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                const ctx = new AudioCtx();
                ctx.resume().then(() => ctx.close()).catch(() => {});
            }
        } catch (e) {}

        connectToRoom();
        setTimeout(() => {
            broadcastMediaState({ video, audio });
        }, 300);
    };

    // 4. Leave / End Call with complete resource teardown
    const handleEndCall = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        leaveRoom();
        stopAllTracks();
        navigate('/home');
    };

    // 5. Screen Share with native "Stop sharing" event listener & sender track replacement
    const handleToggleScreenShare = async () => {
        if (!screen) {
            const screenTrack = await startScreenShare((cameraTrack) => {
                // Revert handler triggered when user clicks browser's native "Stop sharing" bar
                replaceVideoTrack(cameraTrack);
                if (localVideoref.current && localStreamRef.current) {
                    localVideoref.current.srcObject = localStreamRef.current;
                }
            });

            if (screenTrack) {
                replaceVideoTrack(screenTrack);
                if (localVideoref.current && screenStreamRef.current) {
                    localVideoref.current.srcObject = screenStreamRef.current;
                }
            }
        } else {
            stopScreenShare((cameraTrack) => {
                replaceVideoTrack(cameraTrack);
                if (localVideoref.current && localStreamRef.current) {
                    localVideoref.current.srcObject = localStreamRef.current;
                }
            });
        }
    };

    // 6. Local Call Recording via MediaRecorder API
    const handleToggleRecording = () => {
        if (!isRecording) {
            try {
                const streamToRecord = screenStreamRef.current || localStreamRef.current;
                if (!streamToRecord) {
                    triggerToast("No active media stream found to record.");
                    return;
                }

                recordedChunksRef.current = [];
                let options = { mimeType: 'video/webm;codecs=vp9,opus' };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = { mimeType: 'video/webm' };
                }

                const recorder = new MediaRecorder(streamToRecord, options);
                recorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        recordedChunksRef.current.push(event.data);
                    }
                };

                recorder.onstop = () => {
                    if (recordedChunksRef.current.length === 0) return;
                    const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = blobUrl;
                    a.download = `pulse-meet-recording-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.webm`;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(blobUrl);
                    }, 200);
                    recordedChunksRef.current = [];
                    triggerToast("Recording saved and downloaded successfully!");
                };

                recorder.start(1000);
                mediaRecorderRef.current = recorder;
                setIsRecording(true);
                triggerToast("Call recording started.");
            } catch (err) {
                console.error("Recording error:", err);
                triggerToast("Failed to start recording on this browser.");
            }
        } else {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
        }
    };

    // 7. Chat Message Dispatcher
    const handleSendMessage = () => {
        if (!message.trim()) return;
        sendMessage(message.trim(), username || "Participant");
        setMessage("");
    };

    // 8. Reactions & Raise Hand
    const handleSendReaction = (emoji) => {
        sendReaction(emoji, username || "Participant");
        setReactionAnchorEl(null);
    };

    const handleRaiseHand = () => {
        toggleRaiseHand(username || "Participant");
        triggerToast(!isHandRaised ? "You raised your hand ✋" : "Hand lowered.");
    };

    const handleCopyInviteLink = () => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const inviteUrl = `${origin}/room/${roomCode}`;
        navigator.clipboard.writeText(inviteUrl);
        triggerToast("Meeting invite link copied to clipboard!");
    };

    // Responsive Video Grid Class Calculation
    const totalParticipants = 1 + videos.length;
    let gridClass = styles.grid1;
    if (totalParticipants === 2) gridClass = styles.grid2;
    else if (totalParticipants <= 4) gridClass = styles.grid4;
    else gridClass = styles.grid6;

    const getAvatarGradient = (name = "You") => {
        const gradients = [
            "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
            "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
            "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
            "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
            "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)"
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return gradients[Math.abs(hash) % gradients.length];
    };

    const getSenderColor = (name = "User") => {
        const colors = ["#818cf8", "#34d399", "#38bdf8", "#fbbf24", "#f472b6", "#a78bfa"];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div>
            {askForUsername ? (
                /* ================= Pre-Meeting Wide 2-Column Lobby ================= */
                <div className={styles.lobbyContainer}>
                    <div className={styles.lobbyBrandBar}>
                        <div className={styles.lobbyBrandIcon}>
                            <VideocamRoundedIcon sx={{ fontSize: 22 }} />
                        </div>
                        <span className={styles.lobbyBrandTitle}>PulseMeet</span>
                    </div>

                    <div className={styles.lobbyContentGrid}>
                        {/* Left Column: 16:9 Cinema Stage Preview & Audio Meter */}
                        <div className={styles.lobbyLeftCol}>
                            <div className={styles.cinemaStageWrapper}>
                                <video
                                    ref={lobbyVideoref}
                                    autoPlay
                                    muted
                                    playsInline
                                    style={{ display: video ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                {!video && (
                                    <div className={styles.cameraOffPlaceholder}>
                                        <Avatar sx={{ width: 88, height: 88, bgcolor: 'var(--pm-primary, #34D399)', color: '#0A0A0B', fontSize: '2.4rem', fontWeight: 700, mb: 1.5 }}>
                                            {(username || "You").charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Typography variant="body2" sx={{ color: 'var(--pm-text-secondary, #A1A1AA)' }}>
                                            Camera is turned off
                                        </Typography>
                                    </div>
                                )}

                                {/* Floating Selector Pills Overlay */}
                                <div className={styles.lobbyControlsOverlay}>
                                    <div
                                        className={`${styles.selectorPill} ${video ? styles.pillActive : styles.pillMuted}`}
                                        onClick={handleToggleVideo}
                                    >
                                        {video ? <VideocamIcon sx={{ fontSize: 18 }} /> : <VideocamOffIcon sx={{ fontSize: 18 }} />}
                                        <span>{video ? "Camera ON" : "Camera OFF"}</span>
                                    </div>

                                    <div
                                        className={`${styles.selectorPill} ${audio ? styles.pillActive : styles.pillMuted}`}
                                        onClick={handleToggleAudio}
                                    >
                                        {audio ? <MicIcon sx={{ fontSize: 18 }} /> : <MicOffIcon sx={{ fontSize: 18 }} />}
                                        <span>{audio ? "Mic ON" : "Mic OFF"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Live Bouncing Equalizer Audio Sensitivity Meter */}
                            <div className={styles.lobbyAudioMeter}>
                                <div className={styles.micStatusLabel}>
                                    <MicIcon sx={{ fontSize: 18, color: audio ? 'var(--pm-primary, #34D399)' : 'var(--pm-danger, #F43F5E)' }} />
                                    <span>{audio ? "Microphone Active" : "Microphone Muted"}</span>
                                </div>
                                <div className={styles.equalizerTrack}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((barIndex) => {
                                        const threshold = barIndex * 12;
                                        const isLit = audio && lobbyVolume >= threshold;
                                        return (
                                            <div
                                                key={barIndex}
                                                className={`${styles.equalizerBar} ${isLit ? styles.equalizerBarLit : ""}`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Ready to Join & Display Name */}
                        <div className={styles.lobbyRightCol}>
                            <h2 className={styles.lobbyHeading}>Ready to join?</h2>
                            <p className={styles.lobbySubheading}>
                                Check your camera and audio settings before entering room <strong style={{ color: "var(--pm-primary)" }}>{roomCode}</strong>.
                            </p>

                            <div className={styles.lobbyIdentitySection}>
                                <Avatar className={styles.identityAvatar}>
                                    {(username || "You").charAt(0).toUpperCase()}
                                </Avatar>
                                <TextField
                                    fullWidth
                                    id="username-input"
                                    label="Your Display Name"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleJoinMeeting();
                                    }}
                                    variant="outlined"
                                    placeholder="e.g. Raj Ingle"
                                    sx={{
                                        input: { color: 'var(--pm-text-primary, #EDEDEF)', fontWeight: 600 },
                                        label: { color: 'var(--pm-text-secondary, #A1A1AA)' },
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '12px',
                                            bgcolor: 'var(--pm-surface-elevated, #18181B)',
                                            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.12)' },
                                            '&:hover fieldset': { borderColor: 'var(--pm-primary, #34D399)' },
                                            '&.Mui-focused fieldset': { borderColor: 'var(--pm-primary, #34D399)' }
                                        }
                                    }}
                                />
                            </div>

                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                onClick={handleJoinMeeting}
                                sx={{
                                    py: 1.6,
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    background: 'var(--pm-primary, #34D399)',
                                    color: '#0A0A0B',
                                    borderRadius: '12px',
                                    textTransform: 'none',
                                    boxShadow: '0 8px 24px var(--pm-primary-glow)',
                                    '&:hover': {
                                        background: 'var(--pm-primary-hover, #2ECD8F)',
                                        boxShadow: '0 12px 28px rgba(52, 211, 153, 0.4)'
                                    }
                                }}
                            >
                                Join Meeting Now
                            </Button>

                            <div className={styles.lobbyMeetingDetails}>
                                <span>🔒 P2P Encrypted WebRTC</span>
                                <span>Sub-100ms Latency</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* ================= Active Video Conference UI ================= */
                <div className={styles.meetVideoContainer}>
                    {/* Top Bar with Meeting Controls & Recording status */}
                    <div className={styles.topBar}>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<ContentCopyIcon />}
                            onClick={handleCopyInviteLink}
                            sx={{
                                bgcolor: 'rgba(24, 24, 27, 0.85)',
                                color: 'var(--pm-text-primary, #EDEDEF)',
                                textTransform: 'none',
                                borderRadius: '20px',
                                px: 2,
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                '&:hover': { bgcolor: 'rgba(39, 39, 42, 0.95)' }
                            }}
                        >
                            Copy Invite Link
                        </Button>

                        {isRecording && (
                            <div className={styles.recordingBadge}>
                                <div className={styles.pulseDot}></div>
                                REC
                            </div>
                        )}
                    </div>

                    {/* Raised Hand Banner Notification */}
                    {raisedHandUser && (
                        <div className={styles.raisedHandBanner}>
                            ✋ {raisedHandUser} raised their hand
                        </div>
                    )}

                    {/* Floating Emoji Reactions Display */}
                    <div className={styles.reactionContainer}>
                        {floatingReactions.map((reaction) => (
                            <div key={reaction.id} className={styles.floatingReaction}>
                                <span>{reaction.emoji}</span>
                                <Typography variant="caption" sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,0.6)', px: 1, borderRadius: 1 }}>
                                    {reaction.username}
                                </Typography>
                            </div>
                        ))}
                    </div>

                    {/* In-Call Chat Drawer */}
                    {showModal && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <div className={styles.chatHeader}>
                                    <div className={styles.chatHeaderTitle}>
                                        <ChatIcon sx={{ color: 'var(--pm-primary, #34D399)', fontSize: 20 }} />
                                        <span>In-Call Messages</span>
                                    </div>
                                    <IconButton onClick={() => setModal(false)} size="small" sx={{ color: '#94a3b8', '&:hover': { color: '#fff' } }}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </div>
                                <div className={styles.chattingDisplay}>
                                    {messages.length !== 0 ? (
                                        messages.map((item, index) => {
                                            const isMe = item.sender === (username || "You");
                                            return (
                                                <div key={index} className={`${styles.messageWrapper} ${isMe ? styles.myMessage : styles.peerMessage}`}>
                                                    <div className={styles.messageMeta}>
                                                        <span className={styles.msgSender} style={{ color: isMe ? "#34D399" : getSenderColor(item.sender) }}>
                                                            {isMe ? "You" : item.sender}
                                                        </span>
                                                        {item.time && <span className={styles.msgTime}>{item.time}</span>}
                                                    </div>
                                                    <div className={styles.messageBubble}>
                                                        {item.data}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className={styles.emptyChat}>
                                            <ChatIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.15)', mb: 1 }} />
                                            <p>No messages yet.</p>
                                            <span>Send a message to everyone in this meeting!</span>
                                        </div>
                                    )}
                                </div>

                                <div className={styles.chattingArea}>
                                    <TextField
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSendMessage();
                                        }}
                                        id="chat-input"
                                        placeholder="Type a message..."
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        sx={{
                                            input: { color: 'var(--pm-text-primary, #EDEDEF)', fontSize: '0.88rem' },
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '10px',
                                                bgcolor: 'var(--pm-surface-elevated, #18181B)',
                                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                                                '&:hover fieldset': { borderColor: 'var(--pm-primary, #34D399)' },
                                                '&.Mui-focused fieldset': { borderColor: 'var(--pm-primary, #34D399)' }
                                            }
                                        }}
                                    />
                                    <Button
                                        variant='contained'
                                        onClick={handleSendMessage}
                                        sx={{
                                            ml: 1,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            background: 'var(--pm-primary, #34D399)',
                                            color: '#0A0A0B',
                                            borderRadius: '10px',
                                            px: 2.2,
                                            boxShadow: '0 4px 12px var(--pm-primary-glow)',
                                            '&:hover': {
                                                background: 'var(--pm-primary-hover, #2ECD8F)'
                                            }
                                        }}
                                    >
                                        Send
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ================= Responsive Video Grid ================= */}
                    <div className={`${styles.videoGridContainer} ${gridClass} ${showModal ? styles.gridWithChat : ''}`}>
                        {/* 1. Local Participant Video Tile */}
                        <div className={`${styles.videoTile} ${isLocalSpeaking ? styles.activeSpeaker : ""}`}>
                            <video
                                ref={localVideoref}
                                autoPlay
                                muted
                                playsInline
                                style={{ display: video ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {!video && (
                                <div className={styles.cameraOffCard}>
                                    <div className={styles.avatarWrapper}>
                                        {isLocalSpeaking && <div className={styles.speakingWaveRing} />}
                                        <Avatar
                                            className={styles.cameraOffAvatar}
                                            sx={{ background: getAvatarGradient(username || "You") }}
                                        >
                                            {(username || "You").charAt(0).toUpperCase()}
                                        </Avatar>
                                    </div>
                                    {isLocalSpeaking && (
                                        <div className={styles.avatarSpeakingMiniBars}>
                                            <div className={styles.miniBar} />
                                            <div className={styles.miniBar} />
                                            <div className={styles.miniBar} />
                                            <div className={styles.miniBar} />
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className={styles.tileOverlay}>
                                <div className={styles.participantNameTag}>
                                    {isLocalSpeaking && (
                                        <div className={styles.speakingIndicatorMini}>
                                            <div className={styles.speakingMiniBar} />
                                            <div className={styles.speakingMiniBar} />
                                            <div className={styles.speakingMiniBar} />
                                        </div>
                                    )}
                                    <span>{username || "You"} (You)</span>
                                </div>
                                {!audio && <MicOffIcon sx={{ color: '#F43F5E', fontSize: 18 }} />}
                            </div>
                        </div>

                        {/* 2. Remote Participant Video Tiles with Dedicated Audio & Local Mute */}
                        {videos.map((peerVideo, index) => {
                            const isPeerSpeaking = Boolean(speakingPeers[peerVideo.socketId]);
                            const peerName = peerVideo.username || `Participant ${index + 1}`;
                            return (
                                <PeerVideoTile
                                    key={peerVideo.socketId}
                                    peerVideo={peerVideo}
                                    isPeerSpeaking={isPeerSpeaking}
                                    peerName={peerName}
                                    mediaState={peerMediaStates[peerVideo.socketId]}
                                    getAvatarGradient={getAvatarGradient}
                                />
                            );
                        })}
                    </div>

                    {/* ================= Ergonomic Bottom Floating Island Dock ================= */}
                    <div className={styles.buttonContainers}>
                        <Tooltip title={video ? "Turn off camera" : "Turn on camera"} arrow placement="top">
                            <IconButton
                                onClick={handleToggleVideo}
                                className={`${styles.dockBtn} ${video ? "" : styles.dockBtnMuted}`}
                            >
                                {video ? <VideocamIcon /> : <VideocamOffIcon />}
                            </IconButton>
                        </Tooltip>

                        <Tooltip title={audio ? "Mute microphone" : "Unmute microphone"} arrow placement="top">
                            <IconButton
                                onClick={handleToggleAudio}
                                className={`${styles.dockBtn} ${audio ? "" : styles.dockBtnMuted}`}
                            >
                                {audio ? <MicIcon /> : <MicOffIcon />}
                            </IconButton>
                        </Tooltip>

                        {screenAvailable && (
                            <Tooltip title={screen ? "Stop sharing screen" : "Share screen"} arrow placement="top">
                                <IconButton
                                    onClick={handleToggleScreenShare}
                                    className={`${styles.dockBtn} ${screen ? styles.dockBtnActive : ""}`}
                                >
                                    {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                                </IconButton>
                            </Tooltip>
                        )}

                        <Tooltip title={isRecording ? "Stop recording" : "Record call (MediaRecorder)"} arrow placement="top">
                            <IconButton
                                onClick={handleToggleRecording}
                                className={`${styles.dockBtn} ${isRecording ? styles.dockBtnRecording : ""}`}
                            >
                                {isRecording ? <StopIcon /> : <FiberManualRecordIcon />}
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Send Reaction" arrow placement="top">
                            <IconButton
                                onClick={(e) => setReactionAnchorEl(e.currentTarget)}
                                className={styles.dockBtn}
                            >
                                <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>👏</span>
                            </IconButton>
                        </Tooltip>

                        <Menu
                            anchorEl={reactionAnchorEl}
                            open={Boolean(reactionAnchorEl)}
                            onClose={() => setReactionAnchorEl(null)}
                            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                            transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                            PaperProps={{
                                sx: {
                                    bgcolor: 'rgba(24, 24, 27, 0.95)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: '16px',
                                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)'
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', gap: 0.5, px: 1, py: 0.5 }}>
                                {["👏", "❤️", "👍", "🎉", "😂"].map((emoji) => (
                                    <MenuItem
                                        key={emoji}
                                        onClick={() => handleSendReaction(emoji)}
                                        sx={{
                                            fontSize: "1.5rem",
                                            px: 1,
                                            borderRadius: '10px',
                                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.12)' }
                                        }}
                                    >
                                        {emoji}
                                    </MenuItem>
                                ))}
                            </Box>
                        </Menu>

                        <Tooltip title={isHandRaised ? "Lower Hand" : "Raise Hand"} arrow placement="top">
                            <IconButton
                                onClick={handleRaiseHand}
                                className={`${styles.dockBtn} ${isHandRaised ? styles.dockBtnHand : ""}`}
                            >
                                <PanToolIcon />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="In-Call Chat" arrow placement="top">
                            <Badge badgeContent={newMessages} max={999} color='error'>
                                <IconButton
                                    onClick={() => {
                                        setModal(!showModal);
                                        setNewMessages(0);
                                    }}
                                    className={styles.dockBtn}
                                >
                                    <ChatIcon />
                                </IconButton>
                            </Badge>
                        </Tooltip>

                        <Tooltip title="Leave Meeting" arrow placement="top">
                            <Button
                                onClick={handleEndCall}
                                className={styles.dockBtnEndCall}
                                startIcon={<CallEndIcon />}
                            >
                                Leave
                            </Button>
                        </Tooltip>
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
