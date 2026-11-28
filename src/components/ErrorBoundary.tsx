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
        <div className="min-h-screen bg-[#111318] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#181C24] border border-[#262B36] rounded-xl p-8">
            <div className="flex items-center gap-3 text-[#CBD5E1] mb-4">
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
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors cursor-pointer"
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
