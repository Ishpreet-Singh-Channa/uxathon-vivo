'use client';
import React from 'react';
import PersonaFlowCard from '@/components/game/PersonaFlowCard/PersonaFlowCard';

const DEMO_CARDS = [
  {
    variant: 'identity' as const,
    baseHexColor: '#FFD700', // Yellow
    heading: 'MARIA',
    centralGraphic: <div style={{ fontSize: '100px' }}>👩‍🏫</div>, // Placeholder avatar
  },
  {
    variant: 'description' as const,
    baseHexColor: '#FFD700',
    heading: 'The Busy Professional',
    subHeading: 'Early Adopter',
    topRightIcon: <span>👤💡</span>,
    sections: [
      { label: 'Demographics', value: '34, Urban, Tech-savvy' },
      { label: 'Goals', value: 'Efficiency, Automation, Speed' },
      { label: 'Pain Points', value: 'Complexity, Lag, Manual steps' },
    ],
  },
  {
    variant: 'scenario' as const,
    baseHexColor: '#FFD700',
    heading: 'Morning Rush',
    topRightIcon: <span>🌐</span>,
    bodyText: 'Maria needs to quickly check her schedule while commuting on a crowded train.',
  },
  {
    variant: 'task' as const,
    baseHexColor: '#FFD700',
    heading: 'Daily Briefing',
    topRightIcon: <span>⏰</span>,
    bodyText: 'Generate a summary of the most important tasks for the day in under 30 seconds.',
  },
  {
    variant: 'taskFlow' as const,
    baseHexColor: '#FFD700',
    heading: 'Task Workflow',
    topRightIcon: <span>📊</span>,
    listItems: [
      'Open AI Assistant app',
      'Voice command: "Brief me"',
      'Review task list',
      'Prioritize top 3 items',
      'Confirm and start focus mode',
    ],
  },
  {
    variant: 'persuasion' as const,
    baseHexColor: '#FFD700',
    heading: 'Social Proof',
    subHeading: 'Framing',
    topRightIcon: <span>📋💰</span>,
    bodyText: 'Join 10,000+ professionals who save 2 hours daily using our briefing tool.',
    bottomGraphic: <div style={{ fontSize: '40px' }}>✨</div>,
  },
];

export default function PersonaFlowTestPage() {
  return (
    <div style={{ padding: '60px', background: '#121212', minHeight: '100vh' }}>
      <h1 style={{ color: 'white', marginBottom: '40px', textAlign: 'center' }}>Persona Flow Variants</h1>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
        gap: '40px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {DEMO_CARDS.map((card, idx) => (
          <div key={idx} style={{ width: '350px', margin: '0 auto' }}>
            <PersonaFlowCard {...card} />
          </div>
        ))}
      </div>
    </div>
  );
}
