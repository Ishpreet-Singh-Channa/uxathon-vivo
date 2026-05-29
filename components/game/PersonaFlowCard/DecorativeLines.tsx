'use client';
import React from 'react';
import styles from './PersonaFlowCard.module.css';

interface DecorativeLinesProps {
  variant: string;
}

export default function DecorativeLines({ variant }: DecorativeLinesProps) {
  return (
    <svg className={styles.decorativeLayer} viewBox="0 0 350 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Identity Variant Lines */}
      {variant === 'identity' && (
        <>
          <path 
            d="M350 50 C280 50, 175 100, 175 160" 
            stroke="black" 
            strokeWidth="2" 
            strokeDasharray="6 6" 
          />
          <circle cx="175" cy="165" r="4" fill="black" />
        </>
      )}

      {/* Description Variant Lines */}
      {variant === 'description' && (
        <>
          <path d="M0 60 C50 60, 80 80, 100 80" stroke="black" strokeWidth="2" />
          <path d="M100 80 L92 75 L92 85 Z" fill="none" stroke="black" strokeWidth="1.5" /> {/* Triangle right */}
          
          <path d="M350 40 C300 40, 250 60, 200 60" stroke="black" strokeWidth="2" strokeDasharray="6 6" />
        </>
      )}

      {/* Scenario Variant Lines */}
      {variant === 'scenario' && (
        <>
          <path d="M0 50 C40 50, 60 70, 80 70" stroke="black" strokeWidth="2" />
          <path d="M80 70 L72 65 L72 75 Z" fill="none" stroke="black" strokeWidth="1.5" /> {/* Triangle right */}
          
          <path d="M175 350 C175 400, 250 450, 350 450" stroke="black" strokeWidth="2" strokeDasharray="6 6" />
          <circle cx="175" cy="345" r="4" fill="black" />
        </>
      )}

      {/* Task Variant Lines */}
      {variant === 'task' && (
        <>
          <path d="M350 60 C300 60, 250 80, 200 80" stroke="black" strokeWidth="2" strokeDasharray="6 6" />
          
          <path d="M40 500 C40 450, 60 420, 175 420" stroke="black" strokeWidth="2" />
          <path d="M175 420 L170 428 L180 428 Z" fill="none" stroke="black" strokeWidth="1.5" /> {/* Triangle up */}
        </>
      )}

      {/* Task Flow Variant Lines */}
      {variant === 'taskFlow' && (
        <>
          <path d="M0 60 C50 60, 80 80, 100 80" stroke="black" strokeWidth="2" />
          <path d="M100 80 L92 75 L92 85 Z" fill="none" stroke="black" strokeWidth="1.5" /> {/* Triangle right */}
          
          <path d="M175 460 C230 460, 280 470, 350 480" stroke="black" strokeWidth="2" strokeDasharray="6 6" />
          <circle cx="175" cy="460" r="4" fill="black" />
        </>
      )}

      {/* Persuasion Variant Lines */}
      {variant === 'persuasion' && (
        <>
          <path d="M40 500 C40 450, 80 420, 175 420" stroke="black" strokeWidth="2" />
          <path d="M175 420 L170 428 L180 428 Z" fill="none" stroke="black" strokeWidth="1.5" /> {/* Triangle up */}
        </>
      )}
    </svg>
  );
}
