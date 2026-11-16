import React from 'react';
import { Layers, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PlaceholderPage({ title, description, stageNumber, features = [] }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-xs">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-4">
            <Layers className="w-3.5 h-3.5" />
            <span>Scheduled for Stage {stageNumber}</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          <p className="mt-2 text-slate-600 text-sm leading-relaxed">{description}</p>

          <div className="mt-6 rounded-lg bg-slate-50 p-4 border border-slate-200">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-3">
              Planned Capabilities for this Module
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition shadow-xs"
            >
              <span>Back to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

