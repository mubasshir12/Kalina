import { useState, useRef, useEffect } from 'react';

export const useAudio = () => {
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    
    useEffect(() => {
        const cleanup = () => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
        };
        window.addEventListener('beforeunload', cleanup);
        return () => {
            cleanup();
            window.removeEventListener('beforeunload', cleanup);
        };
    }, []);

    const handleToggleAudio = (id: string, text: string) => {
        if (speakingMessageId === id) {
            window.speechSynthesis.cancel();
            setSpeakingMessageId(null);
        } else {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
            if (utteranceRef.current) {
                utteranceRef.current.onend = null;
            }
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onend = () => setSpeakingMessageId(null);
            utteranceRef.current = utterance;
            window.speechSynthesis.speak(utterance);
            setSpeakingMessageId(id);
        }
    };

    const stopAudio = () => {
         if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        setSpeakingMessageId(null);
    }

    return {
        speakingMessageId,
        setSpeakingMessageId,
        handleToggleAudio,
        stopAudio
    };
};
