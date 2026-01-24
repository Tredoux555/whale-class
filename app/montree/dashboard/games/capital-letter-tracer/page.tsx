// app/games/capital-letter-tracer/page.tsx
import CapitalLetterTraceGame from '@/components/games/CapitalLetterTraceGame';

export const metadata = {
  title: 'Capital Letter Tracer | Whale Games',
  description: 'Practice writing uppercase letters A-Z',
};

export default function CapitalLetterTracerPage() {
  return <CapitalLetterTraceGame />;
}
