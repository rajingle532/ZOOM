import React, { useContext, useEffect, useRef, useState } from 'react';
import io from "socket.io-client";
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

import styles from "../styles/videoComponent.module.css";
import server from '../environment';
import { AuthContext } from '../contexts/AuthContext';

const server_url = server;

const peerConfigConnections = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
};

export default function VideoMeetComponent() {
    const socketRef = useRef(null);
    const socketIdRef = useRef(null);
    const localVideoref = useRef(null);
    const lobbyVideoref = useRef(null);
    const localStreamRef = useRef(null);
    const screenStreamRef = useRef(null);

    // Recording refs
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);

    // Component-scoped peer connections map
    const connections = useRef({});

    const [video, setVideo] = useState(true);
    const [audio, setAudio] = useState(true);
    const [screen, setScreen] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);

    // Call Recording State
    const [isRecording, setIsRecording] = useState(false);

    // Reactions & Hand Raise State
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [raisedHandUser, setRaisedHandUser] = useState(null);
    const [floatingReactions, setFloatingReactions] = useState([]);
    const [reactionAnchorEl, setReactionAnchorEl] = useState(null);

    // Active Speaker Detection State (Web Audio API AnalyserNode)
    const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
    const [speakingPeers, setSpeakingPeers] = useState({});

    // Chat & UI State
    const [showModal, setModal] = useState(false);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [newMessages, setNewMessages] = useState(0);

    const { userData } = useContext(AuthContext);
    const [lobbyVolume, setLobbyVolume] = useState(0);

    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState("");

    useEffect(() => {
        if (userData && (userData.name || userData.username)) {
            setUsername(userData.name || userData.username);
        }
    }, [userData]);
    const [videos, setVideos] = useState([]);
    const [toastMessage, setToastMessage] = useState("");
    const [showToast, setShowToast] = useState(false);

    // 1. Initial media permissions & lobby video preview
    useEffect(() => {
        const getPermissions = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localStreamRef.current = stream;

                if (lobbyVideoref.current) {
                    lobbyVideoref.current.srcObject = stream;
                }
                if (localVideoref.current) {
                    localVideoref.current.srcObject = stream;
                }
                setVideo(true);
                setAudio(true);
            } catch (err) {
                console.warn("Camera/Mic access not fully granted, trying individual streams:", err);
                try {
                    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    localStreamRef.current = videoStream;
                    if (lobbyVideoref.current) lobbyVideoref.current.srcObject = videoStream;
                    if (localVideoref.current) localVideoref.current.srcObject = videoStream;
                    setVideo(true);
                } catch {
                    setVideo(false);
                }

                try {
                    await navigator.mediaDevices.getUserMedia({ audio: true });
                    setAudio(true);
                } catch {
                    setAudio(false);
                }
            }

            if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            }
        };

        getPermissions();

        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
            }
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => track.stop());
            }
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach((track) => track.stop());
            }
            for (let id in connections.current) {
                connections.current[id].close();
            }
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    // 2. Active Speaker Detection for Local User (AudioContext / AnalyserNode)
    useEffect(() => {
        if (!localStreamRef.current || !audio) {
            setIsLocalSpeaking(false);
            setLobbyVolume(0);
            return;
        }

        const audioTracks = localStreamRef.current.getAudioTracks();
        if (audioTracks.length === 0 || !audioTracks[0].enabled) {
            setIsLocalSpeaking(false);
            setLobbyVolume(0);
            return;
        }

        let audioContext;
        let animationId;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioCtx();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            const source = audioContext.createMediaStreamSource(localStreamRef.current);
            source.connect(analyser);

            const buffer = new Uint8Array(analyser.frequencyBinCount);

            const checkAudio = () => {
                analyser.getByteFrequencyData(buffer);
                let sum = 0;
                for (let i = 0; i < buffer.length; i++) {
                    sum += buffer[i];
                }
                const avg = sum / buffer.length;
                setIsLocalSpeaking(avg > 18);
                const normalized = Math.min(100, Math.round((avg / 42) * 100));
                setLobbyVolume(normalized);
                animationId = requestAnimationFrame(checkAudio);
            };

            checkAudio();
        } catch (e) {
            console.warn("Local audio analyser failed:", e);
        }

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
            if (audioContext && audioContext.state !== "closed") {
                audioContext.close();
            }
        };
    }, [audio, askForUsername]);

    // 3. Active Speaker Detection for Remote Participants
    useEffect(() => {
        if (videos.length === 0) return;

        const cleanupFunctions = [];

        videos.forEach((peer) => {
            if (!peer.stream) return;
            const audioTracks = peer.stream.getAudioTracks();
            if (audioTracks.length === 0) return;

            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                const audioContext = new AudioCtx();
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                const source = audioContext.createMediaStreamSource(peer.stream);
                source.connect(analyser);

                const buffer = new Uint8Array(analyser.frequencyBinCount);
                let animId;

                const checkRemoteVolume = () => {
                    analyser.getByteFrequencyData(buffer);
                    let sum = 0;
                    for (let i = 0; i < buffer.length; i++) {
                        sum += buffer[i];
                    }
                    const avg = sum / buffer.length;
                    setSpeakingPeers((prev) => ({
                        ...prev,
                        [peer.socketId]: avg > 18
                    }));
                    animId = requestAnimationFrame(checkRemoteVolume);
                };

                checkRemoteVolume();

                cleanupFunctions.push(() => {
                    if (animId) cancelAnimationFrame(animId);
                    if (audioContext && audioContext.state !== "closed") audioContext.close();
                });
            } catch (err) {
                console.warn("Remote audio analyser error:", err);
            }
        });

        return () => {
            cleanupFunctions.forEach((cleanup) => cleanup());
        };
    }, [videos]);

    // 4. WebRTC Signaling message handler
    const gotMessageFromServer = (fromId, message) => {
        let signal;
        try {
            signal = typeof message === "string" ? JSON.parse(message) : message;
        } catch (e) {
            console.error("Failed to parse signaling message:", e);
            return;
        }

        if (fromId === socketIdRef.current) return;
        const pc = connections.current[fromId];
        if (!pc) return;

        if (signal.sdp) {
            pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
                .then(() => {
                    if (signal.sdp.type === 'offer') {
                        return pc.createAnswer().then((description) => {
                            return pc.setLocalDescription(description).then(() => {
                                socketRef.current.emit(
                                    'signal',
                                    fromId,
                                    JSON.stringify({ sdp: pc.localDescription })
                                );
                            });
                        });
                    }
                })
                .catch((e) => console.error("Error handling SDP signal:", e));
        }

        if (signal.ice) {
            pc.addIceCandidate(new RTCIceCandidate(signal.ice))
                .catch((e) => console.error("Error adding ICE candidate:", e));
        }
    };

    // 5. Connect to Socket Server and initialize peer connections
    const connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false });

        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            const roomCode = window.location.pathname.replace(/^\/+/, '') || "default-room";
            socketRef.current.emit('join-call', roomCode);
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on('chat-message', addMessage);

            // Handle real-time reactions
            socketRef.current.on('user-reaction', (data) => {
                const reactionItem = {
                    id: Math.random().toString(36).substring(2, 9),
                    emoji: data.emoji,
                    username: data.username
                };
                setFloatingReactions((prev) => [...prev, reactionItem]);
                setTimeout(() => {
                    setFloatingReactions((prev) => prev.filter((r) => r.id !== reactionItem.id));
                }, 2500);
            });

            // Handle raise hand notification
            socketRef.current.on('user-raised-hand', (data) => {
                if (data.isHandRaised) {
                    setRaisedHandUser(data.username);
                    setTimeout(() => setRaisedHandUser(null), 4000);
                }
            });

            socketRef.current.on('user-left', (id) => {
                if (connections.current[id]) {
                    connections.current[id].close();
                    delete connections.current[id];
                }
                setVideos((prevVideos) => prevVideos.filter((v) => v.socketId !== id));
            });

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {
                    if (connections.current[socketListId]) return;

                    const pc = new RTCPeerConnection(peerConfigConnections);
                    connections.current[socketListId] = pc;

                    pc.onicecandidate = (event) => {
                        if (event.candidate != null) {
                            socketRef.current.emit(
                                'signal',
                                socketListId,
                                JSON.stringify({ ice: event.candidate })
                            );
                        }
                    };

                    pc.ontrack = (event) => {
                        const remoteStream = event.streams[0];
                        if (!remoteStream) return;

                        setVideos((prev) => {
                            const exists = prev.find((v) => v.socketId === socketListId);
                            if (exists) {
                                return prev.map((v) =>
                                    v.socketId === socketListId ? { ...v, stream: remoteStream } : v
                                );
                            }
                            return [
                                ...prev,
                                {
                                    socketId: socketListId,
                                    stream: remoteStream,
                                    autoplay: true,
                                    playsinline: true
                                }
                            ];
                        });
                    };

                    if (localStreamRef.current) {
                        localStreamRef.current.getTracks().forEach((track) => {
                            pc.addTrack(track, localStreamRef.current);
                        });
                    }
                });

                if (id === socketIdRef.current) {
                    for (let peerId in connections.current) {
                        if (peerId === socketIdRef.current) continue;
                        const pc = connections.current[peerId];
                        pc.createOffer()
                            .then((description) => pc.setLocalDescription(description))
                            .then(() => {
                                socketRef.current.emit(
                                    'signal',
                                    peerId,
                                    JSON.stringify({ sdp: pc.localDescription })
                                );
                            })
                            .catch((e) => console.error("Error creating WebRTC offer:", e));
                    }
                }
            });
        });
    };

    // 6. Local Call Recording (MediaRecorder API)
    const handleToggleRecording = () => {
        if (!isRecording) {
            try {
                const streamToRecord = screenStreamRef.current || localStreamRef.current;
                if (!streamToRecord) {
                    setToastMessage("No active media stream found to record.");
                    setShowToast(true);
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
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `pulse-meet-recording-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.webm`;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                    }, 200);
                    recordedChunksRef.current = [];
                    setToastMessage("Recording saved and downloaded successfully!");
                    setShowToast(true);
                };

                recorder.start(1000);
                mediaRecorderRef.current = recorder;
                setIsRecording(true);
                setToastMessage("Call recording started.");
                setShowToast(true);
            } catch (err) {
                console.error("Recording error:", err);
                setToastMessage("Failed to start recording on this browser.");
                setShowToast(true);
            }
        } else {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
        }
    };

    // 7. Reactions & Raise Hand
    const handleSendReaction = (emoji) => {
        if (socketRef.current) {
            socketRef.current.emit("send-reaction", {
                emoji,
                username: username || "Participant"
            });
        }
        setReactionAnchorEl(null);
    };

    const handleToggleRaiseHand = () => {
        const nextState = !isHandRaised;
        setIsHandRaised(nextState);
        if (socketRef.current) {
            socketRef.current.emit("raise-hand", {
                username: username || "Participant",
                isHandRaised: nextState
            });
        }
        setToastMessage(nextState ? "You raised your hand ✋" : "Hand lowered.");
        setShowToast(true);
    };

    const handleCopyInviteLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setToastMessage("Meeting invite link copied to clipboard!");
        setShowToast(true);
    };

    // 8. Track Toggling (Works seamlessly in both Lobby & in Call)
    const handleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setVideo(videoTrack.enabled);
            }
        }
    };

    const handleAudio = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setAudio(audioTrack.enabled);
            }
        }
    };

    // 9. Screen Sharing via RTCRtpSender.replaceTrack
    const handleScreen = async () => {
        if (!screen) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                screenStreamRef.current = screenStream;

                for (let peerId in connections.current) {
                    const pc = connections.current[peerId];
                    const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
                    if (sender) {
                        sender.replaceTrack(screenTrack);
                    }
                }

                if (localVideoref.current) {
                    localVideoref.current.srcObject = screenStream;
                }

                screenTrack.onended = () => {
                    stopScreenShare();
                };

                setScreen(true);
            } catch (err) {
                console.error("Screen share cancelled or failed:", err);
            }
        } else {
            stopScreenShare();
        }
    };

    const stopScreenShare = () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop());
            screenStreamRef.current = null;
        }

        if (localStreamRef.current) {
            const cameraTrack = localStreamRef.current.getVideoTracks()[0];
            for (let peerId in connections.current) {
                const pc = connections.current[peerId];
                const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
                if (sender && cameraTrack) {
                    sender.replaceTrack(cameraTrack);
                }
            }
            if (localVideoref.current) {
                localVideoref.current.srcObject = localStreamRef.current;
            }
        }

        setScreen(false);
    };

    const handleEndCall = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        for (let id in connections.current) {
            connections.current[id].close();
        }
        connections.current = {};
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        window.location.href = "/";
    };

    const addMessage = (data, sender, socketIdSender) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender, data, time, socketIdSender }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prev) => prev + 1);
        }
    };

    const sendMessage = () => {
        if (!message.trim() || !socketRef.current) return;
        socketRef.current.emit('chat-message', message.trim(), username || "Participant");
        setMessage("");
    };

    const connect = () => {
        const finalName = username.trim() || ("Guest-" + Math.floor(100 + Math.random() * 900));
        setUsername(finalName);
        setAskForUsername(false);

        // Attach local stream to in-call video element after DOM renders
        setTimeout(() => {
            if (localVideoref.current && localStreamRef.current) {
                localVideoref.current.srcObject = localStreamRef.current;
            }
        }, 100);

        connectToSocketServer();
    };

    // Compute dynamic auto-responsive grid layout class
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
                /* ================= Pre-Meeting Wide 2-Column Lobby (Google Meet Standard) ================= */
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
                                {video ? (
                                    <video
                                        ref={lobbyVideoref}
                                        autoPlay
                                        muted
                                        playsInline
                                    />
                                ) : (
                                    <div className={styles.cameraOffPlaceholder}>
                                        <Avatar sx={{ width: 88, height: 88, bgcolor: 'var(--pm-primary, #635bff)', fontSize: '2.4rem', fontWeight: 700, mb: 1.5 }}>
                                            {(username || "You").charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Typography variant="body2" sx={{ color: 'var(--pm-text-secondary, #b4b4c7)' }}>
                                            Camera is turned off
                                        </Typography>
                                    </div>
                                )}

                                {/* Floating Selector Pills Overlay */}
                                <div className={styles.lobbyControlsOverlay}>
                                    <div
                                        className={`${styles.selectorPill} ${video ? styles.pillActive : styles.pillMuted}`}
                                        onClick={handleVideo}
                                    >
                                        {video ? <VideocamIcon sx={{ fontSize: 18 }} /> : <VideocamOffIcon sx={{ fontSize: 18 }} />}
                                        <span>{video ? "Camera ON" : "Camera OFF"}</span>
                                    </div>

                                    <div
                                        className={`${styles.selectorPill} ${audio ? styles.pillActive : styles.pillMuted}`}
                                        onClick={handleAudio}
                                    >
                                        {audio ? <MicIcon sx={{ fontSize: 18 }} /> : <MicOffIcon sx={{ fontSize: 18 }} />}
                                        <span>{audio ? "Mic ON" : "Mic OFF"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Live Bouncing Equalizer Audio Sensitivity Meter */}
                            <div className={styles.lobbyAudioMeter}>
                                <div className={styles.micStatusLabel}>
                                    <MicIcon sx={{ fontSize: 18, color: audio ? 'var(--pm-teal, #00d4aa)' : 'var(--pm-danger, #ff5c5c)' }} />
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
                                Check your camera and audio settings before entering the room.
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
                                        if (e.key === "Enter") connect();
                                    }}
                                    variant="outlined"
                                    placeholder="e.g. Raj Ingle"
                                    sx={{
                                        input: { color: 'var(--pm-text-primary, #ffffff)', fontWeight: 600 },
                                        label: { color: 'var(--pm-text-secondary, #b4b4c7)' },
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '12px',
                                            bgcolor: 'var(--pm-surface-elevated, #242433)',
                                            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.12)' },
                                            '&:hover fieldset': { borderColor: 'var(--pm-primary, #635bff)' },
                                            '&.Mui-focused fieldset': { borderColor: 'var(--pm-primary, #635bff)' }
                                        }
                                    }}
                                />
                            </div>

                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                onClick={connect}
                                sx={{
                                    py: 1.6,
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    background: 'var(--pm-primary, #635bff)',
                                    borderRadius: '12px',
                                    textTransform: 'none',
                                    boxShadow: '0 8px 24px rgba(99, 91, 255, 0.35)',
                                    '&:hover': {
                                        background: 'var(--pm-primary-hover, #7c75ff)',
                                        boxShadow: '0 12px 28px rgba(99, 91, 255, 0.5)'
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
                                bgcolor: 'rgba(28, 28, 39, 0.85)',
                                color: '#fff',
                                textTransform: 'none',
                                borderRadius: '20px',
                                px: 2,
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                '&:hover': { bgcolor: 'rgba(36, 36, 51, 0.95)' }
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
                                <Typography variant="caption" sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,0.5)', px: 1, borderRadius: 1 }}>
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
                                        <ChatIcon sx={{ color: '#6366f1', fontSize: 20 }} />
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
                                                        <span className={styles.msgSender} style={{ color: isMe ? "#818cf8" : getSenderColor(item.sender) }}>
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
                                            if (e.key === "Enter") sendMessage();
                                        }}
                                        id="chat-input"
                                        placeholder="Type a message..."
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        sx={{
                                            input: { color: 'var(--pm-text-primary, #ffffff)', fontSize: '0.88rem' },
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '10px',
                                                bgcolor: 'var(--pm-surface-elevated, #242433)',
                                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                                                '&:hover fieldset': { borderColor: 'var(--pm-primary, #635bff)' },
                                                '&.Mui-focused fieldset': { borderColor: 'var(--pm-primary, #635bff)' }
                                            }
                                        }}
                                    />
                                    <Button
                                        variant='contained'
                                        onClick={sendMessage}
                                        sx={{
                                            ml: 1,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            background: 'var(--pm-primary, #635bff)',
                                            borderRadius: '10px',
                                            px: 2.2,
                                            boxShadow: '0 4px 12px rgba(99, 91, 255, 0.3)',
                                            '&:hover': {
                                                background: 'var(--pm-primary-hover, #7c75ff)'
                                            }
                                        }}
                                    >
                                        Send
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ================= Responsive Video Grid (Google Meet / Whereby Style) ================= */}
                    <div className={`${styles.videoGridContainer} ${gridClass}`}>
                        {/* 1. Local Participant Video Tile */}
                        <div className={`${styles.videoTile} ${isLocalSpeaking ? styles.activeSpeaker : ""}`}>
                            {video ? (
                                <video
                                    ref={localVideoref}
                                    autoPlay
                                    muted
                                    playsInline
                                />
                            ) : (
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
                                {!audio && <MicOffIcon sx={{ color: '#ef4444', fontSize: 18 }} />}
                            </div>
                        </div>

                        {/* 2. Remote Participant Video Tiles */}
                        {videos.map((peerVideo, index) => {
                            const isPeerSpeaking = Boolean(speakingPeers[peerVideo.socketId]);
                            const peerName = peerVideo.username || `Participant ${index + 1}`;
                            return (
                                <div
                                    key={peerVideo.socketId}
                                    className={`${styles.videoTile} ${isPeerSpeaking ? styles.activeSpeaker : ""}`}
                                >
                                    {peerVideo.stream ? (
                                        <video
                                            data-socket={peerVideo.socketId}
                                            ref={(ref) => {
                                                if (ref && peerVideo.stream) {
                                                    ref.srcObject = peerVideo.stream;
                                                }
                                            }}
                                            autoPlay
                                            playsInline
                                        />
                                    ) : (
                                        <div className={styles.cameraOffCard}>
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
                                    <div className={styles.tileOverlay}>
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
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ================= Ergonomic Bottom Floating Island Dock ================= */}
                    <div className={styles.buttonContainers}>
                        <Tooltip title={video ? "Turn off camera" : "Turn on camera"} arrow placement="top">
                            <IconButton
                                onClick={handleVideo}
                                className={`${styles.dockBtn} ${video ? "" : styles.dockBtnMuted}`}
                            >
                                {video ? <VideocamIcon /> : <VideocamOffIcon />}
                            </IconButton>
                        </Tooltip>

                        <Tooltip title={audio ? "Mute microphone" : "Unmute microphone"} arrow placement="top">
                            <IconButton
                                onClick={handleAudio}
                                className={`${styles.dockBtn} ${audio ? "" : styles.dockBtnMuted}`}
                            >
                                {audio ? <MicIcon /> : <MicOffIcon />}
                            </IconButton>
                        </Tooltip>

                        {screenAvailable && (
                            <Tooltip title={screen ? "Stop sharing screen" : "Share screen"} arrow placement="top">
                                <IconButton
                                    onClick={handleScreen}
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
                                    bgcolor: 'rgba(15, 23, 42, 0.95)',
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
                                onClick={handleToggleRaiseHand}
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
