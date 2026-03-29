import { createContext, useContext } from 'react';
import Lenis from 'lenis';

export const LenisContext = createContext<Lenis | null>(null);

export const useLenis = () => useContext(LenisContext);
