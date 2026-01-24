// app/games/number-tracer/page.tsx
import NumberTraceGame from '@/components/games/NumberTraceGame';

export const metadata = {
  title: 'Number Tracer | Whale Games',
  description: 'Practice writing numbers 0-9',
};

export default function NumberTracerPage() {
  return <NumberTraceGame />;
}
