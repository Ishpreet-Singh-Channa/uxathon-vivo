'use client';
import React from 'react';
import styles from './PersonaFlowCard.module.css';
import DecorativeLines from './DecorativeLines';

export type CardVariant = 'identity' | 'description' | 'scenario' | 'task' | 'taskFlow' | 'persuasion';

interface PersonaFlowCardProps {
  variant: CardVariant;
  baseHexColor: string;
  logoSvg?: React.ReactNode;
  topRightIcon?: React.ReactNode;
  centralGraphic?: React.ReactNode;
  bottomGraphic?: React.ReactNode;
  
  // Dynamic Text Props
  heading?: string;
  subHeading?: string;
  bodyText?: string;
  listItems?: string[]; // For taskFlow
  sections?: { label: string; value: string }[]; // For description
}

export default function PersonaFlowCard({
  variant,
  baseHexColor,
  logoSvg,
  topRightIcon,
  centralGraphic,
  bottomGraphic,
  heading,
  subHeading,
  bodyText,
  listItems,
  sections,
}: PersonaFlowCardProps) {
  
  const renderContent = () => {
    switch (variant) {
      case 'identity':
        return (
          <div className={styles.identityContent}>
            <div className={styles.avatarCircle}>
              {centralGraphic}
            </div>
            <h1 className={styles.heading}>{heading}</h1>
          </div>
        );

      case 'description':
        return (
          <>
            <header>
              <h1 className={styles.heading}>{heading}</h1>
              <p className={styles.subHeading}>{subHeading}</p>
            </header>
            <div className={styles.descriptionContent}>
              {sections?.map((section, idx) => (
                <div key={idx} className={styles.textSection}>
                  <div className={styles.sectionLabel}>{section.label}</div>
                  <div className={styles.sectionValue}>{section.value}</div>
                </div>
              ))}
            </div>
          </>
        );

      case 'scenario':
        return (
          <>
            <header>
              <h1 className={styles.heading}>{heading}</h1>
            </header>
            <div className={styles.bodyText}>{bodyText}</div>
          </>
        );

      case 'task':
        return (
          <>
            <header>
              <h1 className={styles.heading}>{heading}</h1>
            </header>
            <div className={styles.bodyText}>{bodyText}</div>
          </>
        );

      case 'taskFlow':
        return (
          <>
            <header>
              <h1 className={styles.heading}>{heading}</h1>
            </header>
            <ol className={styles.numberedList}>
              {listItems?.map((item, idx) => (
                <li key={idx} className={styles.listItem}>
                  <span className={styles.listNumber}>{idx + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </>
        );

      case 'persuasion':
        return (
          <div className={styles.persuasionContent}>
            <header>
              <h1 className={styles.heading}>{heading}</h1>
            </header>
            <div className={styles.framingLabel}>{subHeading}</div>
            <div className={styles.bodyText}>{bodyText}</div>
            <div className={styles.bottomGraphicWrapper}>
              {bottomGraphic}
            </div>
          </div>
        );

      default:
        return null;
    }
  };
  
  return (
    <div 
      className={styles.cardContainer} 
      style={{ backgroundColor: baseHexColor }}
    >
      {topRightIcon && (
        <div className={styles.topRightIconWrapper}>
          {topRightIcon}
        </div>
      )}

      {renderContent()}
    </div>
  );
}


