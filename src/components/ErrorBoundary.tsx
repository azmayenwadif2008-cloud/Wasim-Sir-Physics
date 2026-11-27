import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message;
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string };
      if (parsed.error) {
        readable = `${parsed.operationType ? `[${parsed.operationType}] ` : ''}${parsed.error}`;
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, message: readable };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B1118] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#131C28] border border-slate-800 rounded-xl p-8">
            <div className="flex items-center gap-3 text-amber-400 mb-4">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h2 className="font-display text-xl font-semibold text-slate-100">
                পোর্টাল সংযোগে বিঘ্ন ঘটেছে
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              {this.state.message || 'অপ্রত্যাশিত সংযোগ বা অনুমতিজনিত ত্রুটি হয়েছে।'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-950 bg-[#F59E0B] rounded-lg hover:bg-[#FBBF24] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>পুনরায় লোড করুন</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
