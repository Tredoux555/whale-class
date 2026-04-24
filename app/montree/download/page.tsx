// app/montree/download/page.tsx
// Download page for teachers to install the Montree Android app
// Teachers in China can't access Google Play — this gives them direct APK download
'use client';

import { useI18n } from '@/lib/montree/i18n';

export default function DownloadPage() {
  const { t, locale } = useI18n();

  const L = (en: string, zh: string) => {
    const m: Record<string, string> = { en, zh };
    return m[locale || 'en'] || en;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D3330] to-[#1a4a46] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">

        {/* Logo / Title */}
        <div>
          <div className="text-6xl mb-4">🌿</div>
          <h1 className="text-3xl font-bold text-white">Montree</h1>
          <p className="text-white/60 mt-2">
            {L('Montessori Classroom Intelligence', 'Montessori 课堂智能工具')}
          </p>
        </div>

        {/* Android Download */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl">🤖</span>
            <h2 className="text-xl font-semibold text-white">Android</h2>
          </div>

          <a
            href="/downloads/montree.apk"
            download="montree.apk"
            className="block w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-lg transition-colors active:scale-95"
          >
            {L('Download APK', '下载 APK 安装包')}
          </a>

          <div className="text-white/50 text-sm space-y-1">
            <p>{L('How to install:', '安装步骤：')}</p>
            <ol className="text-left space-y-1 pl-4">
              <li>1. {L('Tap download above', '点击上方按钮下载')}</li>
              <li>2. {L('Open the downloaded file', '打开下载的文件')}</li>
              <li>3. {L('Allow "Install from unknown sources"', '允许"安装未知来源应用"')}</li>
              <li>4. {L('Tap Install', '点击安装')}</li>
            </ol>
          </div>
        </div>

        {/* iOS Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl">🍎</span>
            <h2 className="text-xl font-semibold text-white">iPhone / iPad</h2>
          </div>

          <div className="py-4 px-6 bg-white/10 text-white/70 rounded-xl text-sm">
            {L(
              'Coming soon to TestFlight. For now, use Safari to visit montree.xyz',
              'iOS 版本即将上线。目前请使用 Safari 浏览器访问 montree.xyz'
            )}
          </div>
        </div>

        {/* Web fallback */}
        <div className="text-white/40 text-sm">
          <p>
            {L(
              "Don't want to install? Use your browser:",
              '没有安装应用？直接在浏览器访问'
            )}
          </p>
          <a href="/montree" className="text-emerald-400 underline">
            montree.xyz
          </a>
        </div>

      </div>
    </div>
  );
}
