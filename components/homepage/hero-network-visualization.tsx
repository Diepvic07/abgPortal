// Decorative network visualization for hero section right side
export function HeroNetworkVisualization() {
  return (
    <div className="flex-1 w-full max-w-xl animate-fade-in-up delay-200">
      <div className="relative">
        {/* Background blur circles */}
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />

        {/* Card with mock members */}
        <div className="relative bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl overflow-hidden group">
          <div className="space-y-4">
            {/* Mock member row 1 */}
            <div className="flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 transform -rotate-1 group-hover:rotate-0 transition-transform">
              <div className="w-12 h-12 rounded-full bg-blue-200 mr-4 shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
              <div className="w-16 h-6 bg-blue-600/10 rounded-full text-[10px] font-bold text-blue-600 flex items-center justify-center uppercase tracking-tighter">
                Verified
              </div>
            </div>

            {/* Mock member row 2 (highlighted) */}
            <div className="flex items-center p-4 bg-white rounded-2xl border border-slate-200 transform rotate-2 group-hover:rotate-0 transition-transform shadow-md">
              <div className="w-12 h-12 rounded-full bg-slate-200 mr-4 shrink-0 border-2 border-blue-600" />
              <div className="flex-1">
                <div className="h-4 bg-slate-900/10 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-500/10 rounded w-3/4" />
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>
            </div>

            {/* Mock member row 3 */}
            <div className="flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 transform -rotate-2 group-hover:rotate-0 transition-transform">
              <div className="w-12 h-12 rounded-full bg-slate-200 mr-4 shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-center">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200" />
              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-300" />
              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-400" />
              <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold">
                +497
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Global Community
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
