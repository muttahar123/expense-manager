import { useMemo } from 'react';
import { ResponsiveContainer, Sankey, Tooltip, Layer, Rectangle } from 'recharts';
import { useUser } from '../context/UserContext.jsx';

// Validated categorical hues (dark surface #121826) — one per flow target.
const NODE_COLOR = {
  Income: '#9085e9', // violet (source)
  Needs: '#d95926', // orange
  Wants: '#d55181', // magenta
  Investments: '#199e70', // aqua
  Savings: '#3987e5', // blue
};

// Custom node: colored rect + direct label (name on top, value under it)
function SankeyNode({ x, y, width, height, index, payload, containerWidth, format }) {
  const color = NODE_COLOR[payload.name] || '#64748b';
  const isLeft = x < containerWidth / 2;
  const labelX = isLeft ? x + width + 8 : x - 8;
  const anchor = isLeft ? 'start' : 'end';
  return (
    <Layer key={`node-${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.95} radius={3} />
      <text x={labelX} y={y + height / 2 - 4} textAnchor={anchor} fontSize={12} fontWeight={600} fill="#e2e8f0">
        {payload.name}
      </text>
      <text x={labelX} y={y + height / 2 + 11} textAnchor={anchor} fontSize={11} fill="#94a3b8">
        {format(payload.value, { compact: true })}
      </text>
    </Layer>
  );
}

// Custom link: tinted toward the target bucket's color.
function SankeyLink({ sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index, payload }) {
  const color = NODE_COLOR[payload.target.name] || '#334155';
  return (
    <path
      key={`link-${index}`}
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      stroke={color}
      strokeWidth={Math.max(linkWidth, 1)}
      strokeOpacity={0.28}
      fill="none"
    />
  );
}

export default function CashflowSankey({ summary }) {
  const { format } = useUser();

  const data = useMemo(() => {
    const buckets = summary?.buckets || {};
    const order = ['Needs', 'Wants', 'Investments', 'Savings'];
    const active = order.filter((b) => (buckets[b] || 0) > 0);
    if (!active.length) return null;

    const nodes = [{ name: 'Income' }, ...active.map((b) => ({ name: b }))];
    const links = active.map((b, i) => ({ source: 0, target: i + 1, value: buckets[b] }));
    return { nodes, links };
  }, [summary]);

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Add income and some expenses to see your money flow.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={data}
          nodePadding={26}
          nodeWidth={12}
          margin={{ top: 10, right: 90, bottom: 10, left: 70 }}
          link={<SankeyLink />}
          node={<SankeyNode format={format} />}
        >
          <Tooltip
            contentStyle={{
              background: '#0b0f17',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              fontSize: 12,
            }}
            formatter={(value) => format(value)}
          />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
