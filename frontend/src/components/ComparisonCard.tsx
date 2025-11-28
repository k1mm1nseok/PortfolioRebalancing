import React from "react";

interface Metrics {
  expected_return: number;
  volatility: number;
  sharpe_ratio: number;
}

interface ComparisonCardProps {
  currentMetrics?: Metrics;
  optimizedMetrics: Metrics;
}

const ComparisonCard: React.FC<ComparisonCardProps> = ({ currentMetrics, optimizedMetrics }) => {
  const metrics = [
    { label: "Expected Return", key: "expected_return", type: "return" },
    { label: "Annual Volatility", key: "volatility", type: "risk" },
    { label: "Sharpe Ratio", key: "sharpe_ratio", type: "return" },
  ];

  const getArrow = (diff: number) => {
    return diff > 0 ? "▲" : diff < 0 ? "▼" : "-";
  };

  return (
    <div className="w-full bg-white shadow sm:rounded-lg overflow-hidden mb-8 border border-gray-200">
      <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Performance Comparison</h3>
      </div>
      <div className="border-t border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-900 uppercase tracking-wider bg-indigo-50">Optimized</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {metrics.map((m) => {
              const currentVal = currentMetrics ? (currentMetrics as any)[m.key] : undefined;
              const optimizedVal = (optimizedMetrics as any)[m.key];
              const diff = currentVal !== undefined ? optimizedVal - currentVal : undefined;
              const isPercent = m.key !== "sharpe_ratio";
              
              return (
                <tr key={m.key}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{m.label}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {currentVal !== undefined
                      ? isPercent
                        ? (currentVal * 100).toFixed(2) + "%"
                        : currentVal.toFixed(2)
                      : "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold text-center bg-indigo-50">
                    {isPercent ? (optimizedVal * 100).toFixed(2) + "%" : optimizedVal.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
                    {diff === undefined
                      ? "—"
                      : `${getArrow(diff)} ${
                          isPercent ? Math.abs(diff * 100).toFixed(2) + "%" : Math.abs(diff).toFixed(2)
                        }`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComparisonCard;
