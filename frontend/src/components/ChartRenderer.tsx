import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Scatter } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);


interface ChartRendererProps {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  title?: string;
  labels?: string[];
  values?: number[];
  scatterPoints?: { x: number; y: number }[];
  labelName?: string;
  fill?: boolean;
}


const ChartRenderer: React.FC<ChartRendererProps> = ({
  type,
  title,
  labels = [],
  values = [],
  scatterPoints = [],
  labelName = 'Value',
  fill = false
}) => {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(241, 245, 249, 1)';
  const tickColor = isDarkMode ? '#64748B' : '#475569';
  
  // Custom theme colors matching design spec (sky-blue/purple/emerald/amber/rose hues)
  const backgroundColors = [
    'rgba(99, 102, 241, 0.7)',  // Indigo
    'rgba(14, 165, 233, 0.7)',  // Sky blue
    'rgba(16, 185, 129, 0.7)',  // Emerald
    'rgba(245, 158, 11, 0.7)',  // Amber
    'rgba(239, 68, 68, 0.7)',   // Rose
    'rgba(139, 92, 246, 0.7)',  // Purple
    'rgba(236, 72, 153, 0.7)',  // Pink
    'rgba(20, 184, 166, 0.7)',  // Teal
    'rgba(100, 116, 139, 0.7)', // Slate
    'rgba(79, 70, 229, 0.7)',   // Deep Indigo
  ];

  const borderColors = [
    'rgb(99, 102, 241)',
    'rgb(14, 165, 233)',
    'rgb(16, 185, 129)',
    'rgb(245, 158, 11)',
    'rgb(239, 68, 68)',
    'rgb(139, 92, 246)',
    'rgb(236, 72, 153)',
    'rgb(20, 184, 166)',
    'rgb(100, 116, 139)',
    'rgb(79, 70, 229)',
  ];

  const chartData: any = {
    datasets: [
      {
        label: labelName,
        data: type === 'scatter' ? scatterPoints : values,
        backgroundColor: type === 'pie' ? backgroundColors : (type === 'scatter' ? 'rgba(99, 102, 241, 0.65)' : (type === 'bar' ? 'rgba(99, 102, 241, 0.7)' : (fill ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.0)'))),
        borderColor: type === 'pie' ? borderColors : 'rgb(99, 102, 241)',
        borderWidth: type === 'scatter' ? 0 : (type === 'bar' ? 1.5 : 2),
        tension: 0.35, // smooth line
        fill: fill ? 'origin' : false,
        pointRadius: type === 'line' ? 0 : (type === 'scatter' ? 5.5 : 3),
        pointHoverRadius: type === 'scatter' ? 7.5 : 5,
      }
    ]
  };

  if (type !== 'scatter') {
    chartData.labels = labels;
  }


  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: type === 'pie',
        position: 'bottom' as const,
        labels: {
          color: tickColor,
          font: { family: "'Inter', sans-serif" }
        }
      },
      title: {
        display: !!title,
        text: title || '',
        color: isDarkMode ? '#F8FAFC' : '#0F172A',
        font: {
          size: 14,
          weight: 'bold' as const,
          family: "'Inter', sans-serif"
        },
        padding: { bottom: 15 }
      },
      tooltip: {
        padding: 10,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleFont: { family: "'Inter', sans-serif" },
        bodyFont: { family: "'Inter', sans-serif" },
        borderColor: 'rgba(99, 102, 241, 0.3)',
        borderWidth: 1,
      }
    },
    scales: type !== 'pie' ? {
      y: {
        beginAtZero: true,
        grid: {
          color: gridColor,
          drawTicks: false
        },
        border: {
          display: false
        },
        ticks: {
          color: tickColor,
          font: { family: "'Inter', sans-serif", size: 10 }
        }
      },
      x: {
        grid: {
          display: type === 'scatter',
          color: gridColor,
          drawTicks: false
        },
        border: {
          display: false
        },
        ticks: {
          color: tickColor,
          font: { family: "'Inter', sans-serif", size: 10 }
        }
      }
    } : undefined

  };

  return (
    <div className="relative h-64 w-full">
      {type === 'line' && <Line data={chartData} options={options as any} />}
      {type === 'bar' && <Bar data={chartData} options={options as any} />}
      {type === 'pie' && <Pie data={chartData} options={options as any} />}
      {type === 'scatter' && <Scatter data={chartData} options={options as any} />}
    </div>

  );
};

export default ChartRenderer;
