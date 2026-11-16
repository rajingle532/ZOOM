import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import server from '../environment';

/**
 * Production-ready WebRTC ICE configuration with Google STUN cluster,
 * Cloudflare STUN fallback, and environment-configurable TURN credentials.
 */
export function getPeerConfig() {
    const iceServers = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        { urls: "stun:stun.cloudflare.com:3478" }
    ];

    if (process.env.REACT_APP_TURN_URL) {
        const turnServer = {
            urls: process.env.REACT_APP_TURN_URL
        };
        if (process.env.REACT_APP_TURN_USERNAME) {
            turnServer.username = process.env.REACT_APP_TURN_USERNAME;
        }
        if (process.env.REACT_APP_TURN_CREDENTIAL) {
            turnServer.credential = process.env.REACT_APP_TURN_CREDENTIAL;
        }
        iceServers.push(turnServer);
    }

    return {
        iceServers,
        iceCandidatePoolSize: 10
    };
}

/**
 * Custom hook for WebRTC mesh peer connection lifecycle, Socket.io signaling,
 * ICE candidate queuing, media state synchronization, track replacement,
 * in-call chat, reactions, and remote active speaker detection.
 */
export function useWebRTC({ roomCode, localStreamRef, username, onError }) {
    const socketRef = useRef(null);
    const socketIdRef = useRef(null);
    const connections = useRef({});
    const iceCandidatesQueue = useRef({}); // peerId -> Array<candidate>

    const [videos, setVideos] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessages, setNewMessages] = useState(0);
    const [speakingPeers, setSpeakingPeers] = useState({});
    const [peerMediaStates, setPeerMediaStates] = useState({}); // peerId -> { video: boolean, audio: boolean }
    const [floatingReactions, setFloatingReactions] = useState([]);
    const [raisedHandUser, setRaisedHandUser] = useState(null);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    // Dynamic track replacement (e.g. camera <-> screen share) across all active peers
    const replaceVideoTrack = useCallback((newVideoTrack) => {
        if (!newVideoTrack) return;
        for (const peerId in connections.current) {
            const pc = connections.current[peerId];
            if (!pc) continue;
            const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
            if (sender) {
                sender.replaceTrack(newVideoTrack).catch((err) => {
                    console.error(`Failed to replace video track for peer ${peerId}:`, err);
                });
            }
        }
    }, []);

    // Dynamic audio track replacement
    const replaceAudioTrack = useCallback((newAudioTrack) => {
        if (!newAudioTrack) return;
        for (const peerId in connections.current) {
            const pc = connections.current[peerId];
            if (!pc) continue;
            const sender = pc.getSenders().find((s) => s.track && s.track.kind === "audio");
            if (sender) {
                sender.replaceTrack(newAudioTrack).catch((err) => {
                    console.error(`Failed to replace audio track for peer ${peerId}:`, err);
                });
            }
        }
    }, []);

    // Broadcast local camera / microphone toggle state to all participants
    const broadcastMediaState = useCallback((state) => {
        if (socketRef.current) {
            socketRef.current.emit('user-media-state', state);
        }
    }, []);

    // Drain queued ICE candidates once remote description is set
    const drainQueuedCandidates = useCallback((peerId, pc) => {
        const queue = iceCandidatesQueue.current[peerId];
        if (queue && queue.length > 0) {
            queue.forEach((cand) => {
                pc.addIceCandidate(new RTCIceCandidate(cand)).catch((err) => {
                    console.warn(`[WebRTC] Error adding drained ICE candidate for ${peerId}:`, err);
                });
            });
            delete iceCandidatesQueue.current[peerId];
        }
    }, []);

    // Active Speaker Detection for Remote Participants (Web Audio API AnalyserNode)
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
                if (audioContext.state === 'suspended') {
                    audioContext.resume().catch(() => {});
                }

                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                const source = audioContext.createMediaStreamSource(peer.stream);
                source.connect(analyser);

                const buffer = new Uint8Array(analyser.frequencyBinCount);
                let animId;
                let lastRemoteSpeaking = false;
                let lastCheckTime = 0;

                const checkRemoteVolume = (timestamp) => {
                    // Throttle active speaker check to 10 FPS (every 100ms)
                    if (!lastCheckTime || timestamp - lastCheckTime > 100) {
                        lastCheckTime = timestamp;
                        analyser.getByteFrequencyData(buffer);
                        let sum = 0;
                        for (let i = 0; i < buffer.length; i++) {
                            sum += buffer[i];
                        }
                        const avg = sum / buffer.length;
                        const isSpeaking = avg > 18;

                        if (isSpeaking !== lastRemoteSpeaking) {
                            lastRemoteSpeaking = isSpeaking;
                            setSpeakingPeers((prev) => {
                                if (prev[peer.socketId] === isSpeaking) return prev;
                                return {
                                    ...prev,
                                    [peer.socketId]: isSpeaking
                                };
                            });
                        }
                    }
                    animId = requestAnimationFrame(checkRemoteVolume);
                };

                animId = requestAnimationFrame(checkRemoteVolume);

                cleanupFunctions.push(() => {
                    if (animId) cancelAnimationFrame(animId);
                    if (audioContext && audioContext.state !== "closed") {
                        audioContext.close().catch(() => {});
                    }
                });
            } catch (err) {
                console.warn("Remote audio analyser error:", err);
            }
        });

        return () => {
            cleanupFunctions.forEach((cleanup) => cleanup());
        };
    }, [videos]);

    // Handle incoming WebRTC signaling message with robust candidate queueing
    const handleSignalMessage = useCallback((fromId, message) => {
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
                    // Drain any ICE candidates received prior to setRemoteDescription
                    drainQueuedCandidates(fromId, pc);

                    if (signal.sdp.type === 'offer') {
                        return pc.createAnswer({
                            offerToReceiveAudio: true,
                            offerToReceiveVideo: true
                        }).then((description) => {
                            return pc.setLocalDescription(description).then(() => {
                                if (socketRef.current) {
                                    socketRef.current.emit(
                                        'signal',
                                        fromId,
                                        JSON.stringify({ sdp: pc.localDescription })
                                    );
                                }
                            });
                        });
                    }
                })
                .catch((e) => console.error("Error handling SDP signal:", e));
        }

        if (signal.ice) {
            if (!pc.remoteDescription) {
                // Buffer candidate until remote description is applied
                if (!iceCandidatesQueue.current[fromId]) {
                    iceCandidatesQueue.current[fromId] = [];
                }
                iceCandidatesQueue.current[fromId].push(signal.ice);
            } else {
                pc.addIceCandidate(new RTCIceCandidate(signal.ice))
                    .catch((e) => console.error("Error adding ICE candidate:", e));
            }
        }
    }, [drainQueuedCandidates]);

    // Connect to room and initialize socket & WebRTC peer mesh
    const connectToRoom = useCallback(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        const socket = io.connect(server, {
            secure: false,
            auth: {
                token: token || undefined
            }
        });
        socketRef.current = socket;

        socket.on('signal', handleSignalMessage);

        socket.on('connect', () => {
            setIsConnected(true);
            socketIdRef.current = socket.id;

            // Emit join-call with clean roomCode
            socket.emit('join-call', roomCode || 'default-room');

            // Full room chat history replay on join
            socket.on('chat-history', (historyList) => {
                if (Array.isArray(historyList) && historyList.length > 0) {
                    setMessages((prev) => {
                        const existingKeys = new Set(prev.map(m => `${m.sender}-${m.time}-${m.data}`));
                        const toAdd = historyList
                            .filter(m => !existingKeys.has(`${m.sender}-${m.time}-${m.data}`))
                            .map(m => ({
                                sender: m.sender,
                                data: m.data,
                                time: m.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                socketIdSender: m.socketId
                            }));
                        return [...prev, ...toAdd];
                    });
                }
            });

            // In-call chat messages
            socket.on('chat-message', (data, sender, socketIdSender, serverTime) => {
                const time = serverTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setMessages((prev) => {
                    const isDuplicate = prev.some(m => m.data === data && m.sender === sender && m.time === time);
                    if (isDuplicate) return prev;
                    return [
                        ...prev,
                        { sender, data, time, socketIdSender }
                    ];
                });
                if (socketIdSender !== socketIdRef.current) {
                    setNewMessages((prev) => prev + 1);
                }
                // Enrich peer video record with sender username
                if (socketIdSender && sender) {
                    setVideos((prev) =>
                        prev.map((v) => (v.socketId === socketIdSender ? { ...v, username: sender } : v))
                    );
                }
            });

            // Remote participant camera / mic state changes
            socket.on('user-media-state', (data) => {
                if (!data || !data.socketId) return;
                setPeerMediaStates((prev) => ({
                    ...prev,
                    [data.socketId]: {
                        video: data.video !== undefined ? data.video : true,
                        audio: data.audio !== undefined ? data.audio : true
                    }
                }));
            });

            // Live emoji reactions
            socket.on('user-reaction', (data) => {
                const reactionItem = {
                    id: Math.random().toString(36).substring(2, 9),
                    emoji: data.emoji,
                    username: data.username
                };
                setFloatingReactions((prev) => [...prev, reactionItem]);
                if (data.socketId && data.username) {
                    setVideos((prev) =>
                        prev.map((v) => (v.socketId === data.socketId ? { ...v, username: data.username } : v))
                    );
                }
                setTimeout(() => {
                    setFloatingReactions((prev) => prev.filter((r) => r.id !== reactionItem.id));
                }, 2500);
            });

            // Raised hand notification
            socket.on('user-raised-hand', (data) => {
                if (data.isHandRaised) {
                    setRaisedHandUser(data.username);
                    if (data.socketId && data.username) {
                        setVideos((prev) =>
                            prev.map((v) => (v.socketId === data.socketId ? { ...v, username: data.username } : v))
                        );
                    }
                    setTimeout(() => setRaisedHandUser(null), 4000);
                }
            });

            // Peer disconnected / left
            socket.on('user-left', (id) => {
                if (connections.current[id]) {
                    connections.current[id].ontrack = null;
                    connections.current[id].onicecandidate = null;
                    connections.current[id].close();
                    delete connections.current[id];
                }
                delete iceCandidatesQueue.current[id];
                setVideos((prevVideos) => prevVideos.filter((v) => v.socketId !== id));
                setSpeakingPeers((prev) => {
                    const updated = { ...prev };
                    delete updated[id];
                    return updated;
                });
                setPeerMediaStates((prev) => {
                    const updated = { ...prev };
                    delete updated[id];
                    return updated;
                });
            });

            // Peer joined / room roster update
            socket.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {
                    // Avoid self-connections
                    if (socketListId === socketIdRef.current) return;
                    if (connections.current[socketListId]) return;

                    const pc = new RTCPeerConnection(getPeerConfig());
                    connections.current[socketListId] = pc;

                    // Monitor ICE Connection State
                    pc.oniceconnectionstatechange = () => {
                        const state = pc.iceConnectionState;
                        console.log(`[WebRTC] ICE state with ${socketListId}: ${state}`);
                        if (state === "failed") {
                            console.warn(`[WebRTC] ICE failed with ${socketListId}. Attempting restart...`);
                            if (typeof pc.restartIce === "function") {
                                pc.restartIce();
                            } else if (typeof onError === "function") {
                                onError("Network issue detected with a participant. Trying to reconnect...");
                            }
                        } else if (state === "disconnected") {
                            console.warn(`[WebRTC] Peer ${socketListId} temporarily disconnected.`);
                        }
                    };

                    pc.onconnectionstatechange = () => {
                        const state = pc.connectionState;
                        console.log(`[WebRTC] Connection state with ${socketListId}: ${state}`);
                        if (state === "failed" && typeof onError === "function") {
                            onError("Connection lost with a participant.");
                        }
                    };

                    pc.onicecandidate = (event) => {
                        if (event.candidate != null && socketRef.current) {
                            socketRef.current.emit(
                                'signal',
                                socketListId,
                                JSON.stringify({ ice: event.candidate })
                            );
                        }
                    };

                    pc.ontrack = (event) => {
                        const track = event.track;
                        console.log(`[WebRTC] Received ${track.kind} track from ${socketListId}`);

                        setVideos((prev) => {
                            const exists = prev.find((v) => v.socketId === socketListId);
                            let combinedStream;

                            if (exists && exists.stream) {
                                if (!exists.stream.getTracks().some((t) => t.id === track.id)) {
                                    exists.stream.addTrack(track);
                                }
                                combinedStream = new MediaStream(exists.stream.getTracks());
                            } else if (event.streams && event.streams[0]) {
                                combinedStream = new MediaStream(event.streams[0].getTracks());
                            } else {
                                combinedStream = new MediaStream([track]);
                            }

                            if (exists) {
                                return prev.map((v) =>
                                    v.socketId === socketListId ? { ...v, stream: combinedStream } : v
                                );
                            }

                            return [
                                ...prev,
                                {
                                    socketId: socketListId,
                                    stream: combinedStream,
                                    autoplay: true,
                                    playsinline: true
                                }
                            ];
                        });
                    };

                    // Attach local audio and video tracks to peer connection
                    if (localStreamRef.current) {
                        localStreamRef.current.getTracks().forEach((track) => {
                            pc.addTrack(track, localStreamRef.current);
                        });
                    }
                });

                // If this client is the newly joined user, initiate offers to all existing peers
                if (id === socketIdRef.current) {
                    for (const peerId in connections.current) {
                        if (peerId === socketIdRef.current) continue;
                        const pc = connections.current[peerId];
                        pc.createOffer({
                            offerToReceiveAudio: true,
                            offerToReceiveVideo: true
                        })
                            .then((description) => pc.setLocalDescription(description))
                            .then(() => {
                                if (socketRef.current) {
                                    socketRef.current.emit(
                                        'signal',
                                        peerId,
                                        JSON.stringify({ sdp: pc.localDescription })
                                    );
                                }
                            })
                            .catch((e) => console.error("Error creating WebRTC offer:", e));
                    }
                }
            });

            // Handle room errors (capacity or validation)
            socket.on('room-full', (data) => {
                if (typeof onError === 'function') {
                    onError(data.message || "This meeting room has reached its maximum capacity.");
                }
            });

            socket.on('join-error', (data) => {
                if (typeof onError === 'function') {
                    onError(data.message || "Failed to join room.");
                }
            });
        });
    }, [roomCode, localStreamRef, handleSignalMessage, onError]);

    // Send in-call chat message
    const sendMessage = useCallback((text, senderName) => {
        if (!text || !text.trim() || !socketRef.current) return;
        socketRef.current.emit('chat-message', text.trim(), senderName || username || "Participant");
    }, [username]);

    // Send emoji reaction
    const sendReaction = useCallback((emoji, senderName) => {
        if (!socketRef.current) return;
        socketRef.current.emit('send-reaction', {
            emoji,
            username: senderName || username || "Participant"
        });
    }, [username]);

    // Raise / lower hand
    const toggleRaiseHand = useCallback((senderName) => {
        setIsHandRaised((prev) => {
            const next = !prev;
            if (socketRef.current) {
                socketRef.current.emit('raise-hand', {
                    username: senderName || username || "Participant",
                    isHandRaised: next
                });
            }
            return next;
        });
    }, [username]);

    // Cleanup all peer connections and socket listeners cleanly
    const leaveRoom = useCallback(() => {
        // 1. Close all RTCPeerConnections and remove event handlers
        for (const peerId in connections.current) {
            const pc = connections.current[peerId];
            if (pc) {
                pc.ontrack = null;
                pc.onicecandidate = null;
                pc.close();
            }
        }
        connections.current = {};
        iceCandidatesQueue.current = {};

        // 2. Disconnect socket and remove listeners
        if (socketRef.current) {
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        setVideos([]);
        setMessages([]);
        setSpeakingPeers({});
        setPeerMediaStates({});
        setIsConnected(false);
    }, []);

    // Ensure clean teardown on unmount
    useEffect(() => {
        return () => {
            leaveRoom();
        };
    }, [leaveRoom]);

    return {
        socketRef,
        socketIdRef,
        videos,
        messages,
        newMessages,
        setNewMessages,
        speakingPeers,
        peerMediaStates,
        floatingReactions,
        raisedHandUser,
        isHandRaised,
        isConnected,
        replaceVideoTrack,
        replaceAudioTrack,
        broadcastMediaState,
        connectToRoom,
        sendMessage,
        sendReaction,
        toggleRaiseHand,
        leaveRoom
    };
}

export default useWebRTC;
