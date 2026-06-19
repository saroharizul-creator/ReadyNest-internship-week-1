import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchDatasetSummaryReport } from '../store/datasetSlice';
import { MessageSquare, Send, Sparkles, Loader2, User, HelpCircle, BarChart, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

const Assistant: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentDataset, schema, analytics, summaryReport } = useAppSelector((state) => state.datasets);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load summary analytics if not present
  useEffect(() => {
    if (currentDataset && !summaryReport) {
      dispatch(fetchDatasetSummaryReport(currentDataset.id));
    }
  }, [currentDataset, summaryReport, dispatch]);

  // Set initial welcome message
  useEffect(() => {
    if (currentDataset) {
      setMessages([
        {
          sender: 'assistant',
          text: `Hello! I'm your **AI Data Assistant**. I have loaded your active dataset **${currentDataset.filename}** and compiled its statistics. Ask me anything, or choose a recommended query below!`
        }
      ]);
    }
  }, [currentDataset]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { sender: 'user', text }]);
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const reply = processQuery(text);
      setMessages((prev) => [...prev, { sender: 'assistant', text: reply }]);
      setIsTyping(false);
    }, 750);
  };

  const processQuery = (query: string): string => {
    if (!currentDataset) {
      return "Please select a dataset from the Dashboard tab first.";
    }

    const cleanQuery = query.toLowerCase().trim();

    // 1. Check for Summary
    if (cleanQuery.includes('summar') || cleanQuery.includes('describe') || cleanQuery.includes('profile') || cleanQuery.includes('info')) {
      const numCols = schema ? schema.filter(f => f.type === 'numeric').map(f => `\`${f.name}\``) : [];
      const catCols = schema ? schema.filter(f => f.type === 'categorical').map(f => `\`${f.name}\``) : [];
      
      return `### Dataset Summary: **${currentDataset.filename}**
- **Total Records (Rows)**: ${currentDataset.row_count?.toLocaleString() ?? '-'}
- **Total Features (Columns)**: ${currentDataset.col_count ?? '-'}
- **Numerical Features (${numCols.length})**: ${numCols.length > 0 ? numCols.join(', ') : 'None'}
- **Categorical Features (${catCols.length})**: ${catCols.length > 0 ? catCols.join(', ') : 'None'}
- **Preprocess Status**: Cleaned & standardized.

*Tip: You can ask about key correlations, outliers, or category breakdown by selecting the chips below or typing your question!*`;
    }

    // 2. Check for Correlations
    if (cleanQuery.includes('correlat') || cleanQuery.includes('relation') || cleanQuery.includes('link') || cleanQuery.includes('connect')) {
      const correlations = analytics?.correlation_matrix || {};
      const strongCorrs: { c1: string; c2: string; val: number }[] = [];
      const seen = new Set<string>();

      Object.entries(correlations).forEach(([col1, targets]: [string, any]) => {
        if (targets) {
          Object.entries(targets).forEach(([col2, val]: [string, any]) => {
            if (col1 !== col2 && typeof val === 'number' && !seen.has(`${col1}-${col2}`) && !seen.has(`${col2}-${col1}`)) {
              seen.add(`${col1}-${col2}`);
              if (Math.abs(val) >= 0.5) {
                strongCorrs.push({ c1: col1, c2: col2, val });
              }
            }
          });
        }
      });

      if (strongCorrs.length === 0) {
        return "### Correlation Diagnostics\nNo strong linear relationships (correlation coefficient >= 0.5) were detected among the numerical variables in this dataset.";
      }

      strongCorrs.sort((a, b) => Math.abs(b.val) - Math.abs(a.val));
      const list = strongCorrs.map((item) => {
        const strength = Math.abs(item.val) >= 0.85 ? 'extremely strong' : 'moderate-to-strong';
        const direction = item.val > 0 ? 'positive' : 'negative';
        return `- **${item.c1}** & **${item.c2}**: **${item.val.toFixed(3)}** (${strength} ${direction} correlation).`;
      }).join('\n');

      return `### Correlation Diagnostics\nHere are the key linear correlations detected among numerical variables:\n\n${list}\n\n*Note: Highly correlated values suggest that changes in one variable correspond strongly to changes in the other.*`;
    }

    // 3. Check for Outliers
    if (cleanQuery.includes('outlier') || cleanQuery.includes('anomaly') || cleanQuery.includes('deviat')) {
      const outliers = analytics?.outliers_detected || summaryReport?.outliers_detected || {};
      const keys = Object.keys(outliers);

      if (keys.length === 0) {
        return "### Outlier Diagnostics\nNo significant outlier variables were identified using the Interquartile Range (IQR) method. The numerical properties appear well-clustered within expected boundaries.";
      }

      const list = Object.entries(outliers).map(([col, details]: [string, any]) => {
        return `- **${col}**: contains **${details.count?.toLocaleString() ?? 0}** outlier records (**${details.percentage}%** of dataset).`;
      }).join('\n');

      return `### Outlier Diagnostics\nThe following numerical features show values beyond the 1.5x IQR boundaries:\n\n${list}\n\n*Suggestion: Outliers can represent measurement errors or critical edge cases. Consider standardizing these columns in Settings.*`;
    }

    // 4. Check for Categories
    if (cleanQuery.includes('category') || cleanQuery.includes('categories') || cleanQuery.includes('breakdown') || cleanQuery.includes('class')) {
      const categories = analytics?.category_analysis || {};
      const keys = Object.keys(categories);

      if (keys.length === 0) {
        return "### Categorical breakdowns\nNo categorical variables were found in this dataset. The file contains only continuous numerical properties.";
      }

      const sections = Object.entries(categories).map(([col, values]: [string, any]) => {
        const topCats = values.slice(0, 3).map((item: any) => {
          return `\`${item.category}\` (count: ${item.count?.toLocaleString()})`;
        }).join(', ');
        return `- **${col}** distribution: Top categories are: ${topCats}.`;
      }).join('\n');

      return `### Categorical breakdowns\nHere are frequency breakdowns for the categorical variables:\n\n${sections}`;
    }

    // 5. Look for specific column query
    if (schema) {
      const matchedField = schema.find(f => cleanQuery.includes(f.name.toLowerCase()));
      if (matchedField) {
        if (matchedField.type === 'numeric') {
          const stats = analytics?.summary_statistics?.[matchedField.name] || {};
          return `### Column Profile: **${matchedField.name}** (Numeric)
- **Mean (Average)**: ${stats.mean?.toFixed(3) ?? '-'}
- **Median (50th percentile)**: ${stats.median?.toFixed(3) ?? '-'}
- **Standard Deviation**: ${stats.std?.toFixed(3) ?? '-'}
- **Range**: ${stats.min?.toFixed(3) ?? '-'} to ${stats.max?.toFixed(3) ?? '-'}
- **Total count**: ${stats.count?.toLocaleString() ?? '-'}`;
        } else {
          const catData = analytics?.category_analysis?.[matchedField.name] || [];
          if (catData.length > 0) {
            const list = catData.slice(0, 5).map((item: any, idx: number) => {
              return `${idx + 1}. **${item.category}**: ${item.count?.toLocaleString()} records`;
            }).join('\n');
            return `### Column Profile: **${matchedField.name}** (Categorical)
Here are the top categories in this column:
${list}`;
          }
          return `### Column Profile: **${matchedField.name}**\nThis is a categorical column, but no frequency breakdown was computed.`;
        }
      }
    }

    // Fallback response
    return `I'm not sure how to answer that specific query. Try asking one of these questions:
- "Summarize this dataset"
- "Are there correlations?"
- "Show outliers"
- "Analyze categories"

Or ask about a specific column by typing its name (e.g. "Tell me about column \`sellingprice\`")!`;
  };

  const formatText = (text: string) => {
    // Basic Markdown Parser helper for UI rendering
    return text.split('\n').map((line, idx) => {
      let content = line;
      
      // Headers
      if (content.startsWith('### ')) {
        return <h3 key={idx} className="text-sm font-bold text-slate-800 mt-3 mb-1.5">{content.substring(4)}</h3>;
      }
      
      // Bullets
      if (content.startsWith('- ')) {
        const boldParsed = parseBold(content.substring(2));
        return <li key={idx} className="text-xs list-disc ml-4 mt-0.5 text-slate-650">{boldParsed}</li>;
      }
      
      return <p key={idx} className="text-xs text-slate-655 leading-relaxed mb-1">{parseBold(content)}</p>;
    });
  };

  const parseBold = (text: string) => {
    // Parse **bold** and `code` tags
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-indigo-600 font-bold border border-slate-200/50">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  if (!currentDataset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-xl min-h-[400px]">
        <MessageSquare className="h-16 w-16 text-slate-350" />
        <h2 className="text-lg font-bold text-slate-700 mt-4">No Dataset Active</h2>
        <p className="text-sm text-slate-500 mt-2 text-center max-w-sm">
          Select or upload a dataset on the Dashboard tab to talk to the AI Data Assistant.
        </p>
        <Link
          to="/"
          state={{ fromPage: '/assistant', fromPageLabel: 'AI Data Assistant' }}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-500/10 transition-colors cursor-pointer"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const suggestionChips = [
    { label: 'Summarize Dataset', query: 'Summarize this dataset', icon: HelpCircle },
    { label: 'Check Correlations', query: 'What are the key correlations?', icon: BarChart },
    { label: 'Outliers Alert', query: 'Show outliers', icon: AlertTriangle },
    { label: 'Categorical Spread', query: 'Analyze categories', icon: Sparkles }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] border border-slate-100 bg-white rounded-2xl premium-shadow overflow-hidden">
      {/* Assistant Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/50">
            <Sparkles className="h-4.5 w-4.5 text-blue-600 fill-blue-50 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">AI Data Assistant</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Analysing active dataset: <span className="font-mono text-slate-505">{currentDataset.filename}</span></p>
          </div>
        </div>
      </div>

      {/* Messages Workspace */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20 custom-scrollbar">
        {messages.map((msg, idx) => {
          const isAssistant = msg.sender === 'assistant';
          return (
            <div key={idx} className={`flex items-start gap-3.5 max-w-[85%] ${isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                isAssistant ? 'bg-indigo-50 border-indigo-100 text-indigo-650' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                {isAssistant ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
              <div className={`rounded-2xl p-4 border text-sm shadow-sm ${
                isAssistant 
                  ? 'bg-white border-slate-105 text-slate-700 rounded-tl-none' 
                  : 'bg-blue-600 border-blue-750 text-white rounded-tr-none'
              }`}>
                {isAssistant ? formatText(msg.text) : <p className="text-xs leading-relaxed">{msg.text}</p>}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-start gap-3.5 mr-auto max-w-[85%] animate-pulse">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-indigo-50 border-indigo-100 text-indigo-650">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div className="rounded-2xl p-4 border border-slate-105 bg-white text-slate-400 rounded-tl-none text-xs flex items-center gap-1.5">
              Assistant is profiling dataset statistics...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div className="border-t border-slate-100 px-6 py-3.5 flex flex-wrap gap-2.5 bg-slate-50/30">
        {suggestionChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip.query)}
            disabled={isTyping}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <chip.icon className="h-3.5 w-3.5 text-slate-450" />
            {chip.label}
          </button>
        ))}
      </div>

      {/* Text input container */}
      <div className="border-t border-slate-100 px-6 py-4 bg-white flex gap-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && inputValue.trim()) {
              handleSend(inputValue);
              setInputValue('');
            }
          }}
          disabled={isTyping}
          placeholder="Ask a question about correlations, outlier counts, category spread..."
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-blue-500 bg-slate-50/50 focus:bg-white transition-all disabled:opacity-50"
        />
        <button
          onClick={() => {
            if (inputValue.trim()) {
              handleSend(inputValue);
              setInputValue('');
            }
          }}
          disabled={!inputValue.trim() || isTyping}
          className="flex items-center justify-center h-9 w-9 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-colors cursor-pointer shadow-sm shadow-blue-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Assistant;
