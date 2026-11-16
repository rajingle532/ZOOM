import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_CONSTRAINTS = {
    video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user"
    },
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
    }
};

/**
 * Custom hook for local media device acquisition, stream management,
 * track muting/unmuting, screen sharing, and audio volume analysis.
 */
export function useMediaDevices(initialConstraints = DEFAULT_CONSTRAINTS) {
    const localStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animFrameRef = useRef(null);
    const constraintsRef = useRef(initialConstraints);

    const [localStream, setLocalStream] = useState(null);
    const [screenStream, setScreenStream] = useState(null);
    const [video, setVideo] = useState(true);
    const [audio, setAudio] = useState(true);
    const [screen, setScreen] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);
    const [lobbyVolume, setLobbyVolume] = useState(0);
    const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);

    // Initial media permissions acquisition - caches stream to prevent camera LED/hardware blinking
    const getMediaPermissions = useCallback(async (customConstraints) => {
        if (localStreamRef.current && localStreamRef.current.active) {
            const hasLiveVideo = localStreamRef.current.getVideoTracks().some(t => t.readyState === "live");
            const hasLiveAudio = localStreamRef.current.getAudioTracks().some(t => t.readyState === "live");
            if (hasLiveVideo && hasLiveAudio) {
                return localStreamRef.current;
            }
        }

        const effectiveConstraints = customConstraints || constraintsRef.current;
        try {
            const stream = await navigator.mediaDevices.getUserMedia(effectiveConstraints);
            localStreamRef.current = stream;
            setLocalStream(stream);
            setVideo(true);
            setAudio(true);
            return stream;
        } catch (err) {
            console.warn("Camera/Mic combined access with constraints rejected, attempting basic { video: true, audio: true } fallback:", err);

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localStreamRef.current = stream;
                setLocalStream(stream);
                setVideo(true);
                setAudio(true);
                return stream;
            } catch (err2) {
                console.warn("Basic combined access rejected, attempting individual streams:", err2);
            }

            // Attempt video-only fallback
            let videoTrackObtained = false;
            let audioTrackObtained = false;
            const fallbackStream = new MediaStream();

            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                videoStream.getVideoTracks().forEach((track) => fallbackStream.addTrack(track));
                videoTrackObtained = true;
                setVideo(true);
            } catch {
                setVideo(false);
            }

            // Attempt audio-only fallback
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioStream.getAudioTracks().forEach((track) => fallbackStream.addTrack(track));
                audioTrackObtained = true;
                setAudio(true);
            } catch {
                setAudio(false);
            }

            if (videoTrackObtained || audioTrackObtained) {
                localStreamRef.current = fallbackStream;
                setLocalStream(fallbackStream);
                return fallbackStream;
            }

            return null;
        }
    }, []);

    // Check display media availability on mount
    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            setScreenAvailable(true);
        }
    }, []);

    // Active local speaker detection (Web Audio API AnalyserNode)
    useEffect(() => {
        const stream = localStreamRef.current;
        if (!stream || !audio) {
            setIsLocalSpeaking(false);
            setLobbyVolume(0);
            return;
        }

        const audioTracks = stream.getAudioTracks();
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
            audioContextRef.current = audioContext;

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            const buffer = new Uint8Array(analyser.frequencyBinCount);

            let lastSpeaking = false;
            let lastVolume = 0;
            let lastVolTime = 0;

            const checkAudio = (timestamp) => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(buffer);
                let sum = 0;
                for (let i = 0; i < buffer.length; i++) {
                    sum += buffer[i];
                }
                const avg = sum / buffer.length;
                const nowSpeaking = avg > 20;

                // Only trigger React state change when speaking status flips
                if (nowSpeaking !== lastSpeaking) {
                    lastSpeaking = nowSpeaking;
                    setIsLocalSpeaking(nowSpeaking);
                }

                // Throttle volume equalizer updates to 10 FPS (every 100ms) to eliminate render flutter
                if (!lastVolTime || timestamp - lastVolTime > 100) {
                    lastVolTime = timestamp;
                    const normalized = Math.min(100, Math.round((avg / 42) * 100));
                    if (Math.abs(normalized - lastVolume) > 3) {
                        lastVolume = normalized;
                        setLobbyVolume(normalized);
                    }
                }

                animationId = requestAnimationFrame(checkAudio);
                animFrameRef.current = animationId;
            };

            animationId = requestAnimationFrame(checkAudio);
        } catch (e) {
            console.warn("Local audio analyser initialization failed:", e);
        }

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
            if (audioContext && audioContext.state !== "closed") {
                audioContext.close().catch(() => {});
            }
        };
    }, [audio, localStream]);

    // Clean toggle for Video (avoids black screen on unpause)
    const toggleVideo = useCallback(async (onToggled) => {
        const stream = localStreamRef.current;
        if (!stream) return;

        let nextState = false;
        let videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && videoTrack.readyState === "live") {
            videoTrack.enabled = !videoTrack.enabled;
            nextState = videoTrack.enabled;
            setVideo(nextState);
        } else {
            // Track was stopped; request fresh video track
            try {
                const freshStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
                });
                const freshTrack = freshStream.getVideoTracks()[0];
                if (videoTrack) stream.removeTrack(videoTrack);
                stream.addTrack(freshTrack);
                freshTrack.enabled = true;
                nextState = true;
                setVideo(true);
            } catch (err) {
                console.error("Failed to re-enable camera:", err);
            }
        }
        if (typeof onToggled === 'function') onToggled(nextState);
        return nextState;
    }, []);

    // Clean toggle for Audio
    const toggleAudio = useCallback((onToggled) => {
        const stream = localStreamRef.current;
        if (!stream) return;

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            const nextState = audioTrack.enabled;
            setAudio(nextState);
            if (typeof onToggled === 'function') onToggled(nextState);
            return nextState;
        }
    }, []);

    // Stop Screen Sharing & trigger track reversion
    const stopScreenShare = useCallback((onEndedRevert) => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop());
            screenStreamRef.current = null;
            setScreenStream(null);
        }
        setScreen(false);

        if (typeof onEndedRevert === 'function' && localStreamRef.current) {
            const cameraTrack = localStreamRef.current.getVideoTracks()[0];
            onEndedRevert(cameraTrack);
        }
    }, []);

    // Start Screen Sharing via getDisplayMedia
    const startScreenShare = useCallback(async (onEndedRevert) => {
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });
            const screenTrack = displayStream.getVideoTracks()[0];
            screenStreamRef.current = displayStream;
            setScreenStream(displayStream);
            setScreen(true);

            // Browser native "Stop sharing" bar listener
            screenTrack.onended = () => {
                stopScreenShare(onEndedRevert);
            };

            return screenTrack;
        } catch (err) {
            console.warn("Screen share request cancelled or denied:", err);
            return null;
        }
    }, [stopScreenShare]);

    // Stop all media tracks and release audio contexts cleanly on unmount / leave
    const stopAllTracks = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
            setLocalStream(null);
        }

        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop());
            screenStreamRef.current = null;
            setScreenStream(null);
        }

        setVideo(false);
        setAudio(false);
        setScreen(false);
        setIsLocalSpeaking(false);
        setLobbyVolume(0);
    }, []);

    // Ensure stopAllTracks executes on unmount
    useEffect(() => {
        return () => {
            stopAllTracks();
        };
    }, [stopAllTracks]);

    return {
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
    };
}

export default useMediaDevices;
