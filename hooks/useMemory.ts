import { useState, useEffect } from 'react';
import { LTM, CodeSnippet } from '../types';

export const useMemory = () => {
    const [ltm, setLtm] = useState<LTM>([]);
    const [codeMemory, setCodeMemory] = useState<CodeSnippet[]>([]);

    useEffect(() => {
        try {
            const storedLtm = localStorage.getItem('kalina_ltm');
            if (storedLtm) setLtm(JSON.parse(storedLtm));

            const storedCodeMemory = localStorage.getItem('kalina_code_memory');
            if (storedCodeMemory) setCodeMemory(JSON.parse(storedCodeMemory));
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

    return {
        ltm,
        setLtm,
        codeMemory,
        setCodeMemory,
    };
};
