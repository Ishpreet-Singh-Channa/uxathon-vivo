import React from 'react';
import BigScreenLeaderboard from '@/components/views/BigScreenLeaderboard/BigScreenLeaderboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Real-Time Telemetry | Global Assignment Link',
  description: 'Real-time progress of users and teams playing the Persona Flow game.',
};

export default function LeaderboardPage() {
  return <BigScreenLeaderboard />;
}
