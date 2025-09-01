import { useState, useEffect } from 'react';
import { LTM, CodeSnippet, UserProfile } from '../types';

export const useMemory = () => {
    const [ltm, setLtm] = useState<LTM>([]);
    const [codeMemory, setCodeMemory] = useState<CodeSnippet[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile>({ name: null });

    useEffect(() => {
        try {
            const storedLtm = localStorage.getItem('kalina_ltm');
            if (storedLtm) setLtm(JSON.parse(storedLtm));

            const storedCodeMemory = localStorage.getItem('kalina_code_memory');
            if (storedCodeMemory) setCodeMemory(JSON.parse(storedCodeMemory));
            
            const storedProfile = localStorage.getItem('kalina_user_profile');
            if (storedProfile) {
                setUserProfile(JSON.parse(storedProfile));
            }
        } catch (e) {
            console.error("Failed to parse memory from localStorage", e);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('kalina_ltm', JSON.stringify(ltm));
        } catch (e) {
            console.error("Failed to save LTM to localStorage", e);
        }
    }, [ltm]);

    useEffect(() => {
        try {
            localStorage.setItem('kalina_code_memory', JSON.stringify(codeMemory));
        } catch (e) {
            console.error("Failed to save Code Memory to localStorage", e);
        }
    }, [codeMemory]);
    
    useEffect(() => {
        // Avoid saving the initial empty state
        if (userProfile.name !== null) {
            try {
                localStorage.setItem('kalina_user_profile', JSON.stringify(userProfile));
            } catch (e) {
                console.error("Failed to save user profile to localStorage", e);
            }
        }
    }, [userProfile]);

    return {
        ltm,
        setLtm,
        codeMemory,
        setCodeMemory,
        userProfile,
        setUserProfile,
    };
};