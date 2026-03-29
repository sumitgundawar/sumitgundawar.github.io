import { useEffect, useRef, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ScrollTrigger } from '@/lib/gsap';
import { trackChartInteraction } from '@/lib/analytics';

const fullData = [
  { week: 'Baseline', accuracy: 51 },
  { week: 'W4', accuracy: 54 },
  { week: 'W8', accuracy: 59 },
  { week: 'W12', accuracy: 64 },
  { week: 'W16', accuracy: 68 },
  { week: 'W20', accuracy: 72 },
  { week: 'W24', accuracy: 76 },
  { week: 'W28', accuracy: 79 },
  { week: 'W32', accuracy: 81 },
  { week: 'Final', accuracy: 83 },
];

const AccuracyChart = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState(fullData.map(d => ({ ...d, accuracy: 51 })));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        setVisible(true);
        trackChartInteraction('accuracy_chart_viewed');

        // Animate data points in sequence
        fullData.forEach((point, i) => {
          setTimeout(() => {
            setData(prev => {
              const next = [...prev];
              next[i] = point;
              return next;
            });
          }, i * 150);
        });
      },
    });

    return () => trigger.kill();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-64 md:h-72">
      {visible && (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 14%)" />
            <XAxis
              dataKey="week"
              tick={{ fill: 'hsl(215 15% 55%)', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(220 15% 14%)' }}
              tickLine={false}
            />
            <YAxis
              domain={[40, 90]}
              tick={{ fill: 'hsl(215 15% 55%)', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(220 15% 14%)' }}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <ReferenceLine y={51} stroke="hsl(0 63% 40%)" strokeDasharray="4 4" label={{ value: '51% baseline', fill: 'hsl(0 63% 50%)', fontSize: 11, position: 'right' }} />
            <ReferenceLine y={83} stroke="hsl(142 71% 35%)" strokeDasharray="4 4" label={{ value: '83% final', fill: 'hsl(142 71% 45%)', fontSize: 11, position: 'right' }} />
            <Area
              type="monotone"
              dataKey="accuracy"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#accuracyGradient)"
              animationDuration={0}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default AccuracyChart;
