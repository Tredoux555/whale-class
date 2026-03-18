// app/montree/download/page.tsx
// Download page for teachers to install the Montree Android app
// Teachers in China can't access Google Play — this gives them direct APK download
'use client';

import { useI18n } from '@/lib/montree/i18n';

export default function DownloadPage() {
  const { t, locale } = useI18n();

  const isZh = locale === 'zh';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D3330] to-[#1a4a46] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">

        {/* Logo / Title */}
        <div>
          <div className="text-6xl mb-4">🌿</div>
          <h1 className="text-3xl font-bold text-white">Montree</h1>
          <p className="text-white/60 mt-2">
            {isZh ? 'Montessori 课堂智能工具' : 'Montessori Classroom Intelligence'}
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
            {isZh ? '下载 APK 安装包' : 'Download APK'}
          </a>

          <div className="text-white/50 text-sm space-y-1">
            <p>{isZh ? '安装步骤：' : 'How to install:'}</p>
            <ol className="text-left space-y-1 pl-4">
              <li>1. {isZh ? '点击上方按钮下载' : 'Tap download above'}</li>
              <li>2. {isZh ? '打开下载的文件' : 'Open the downloaded file'}</li>
              <li>3. {isZh ? '允许"安装未知来源应用"' : 'Allow "Install from unknown sources"'}</li>
              <li>4. {isZh ? '点击安装' : 'Tap Install'}</li>
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
            {isZh
              ? 'iOS 版本即将上线。目前请使用 Safari 浏览器访问 montree.xyz'
              : 'Coming soon to TestFlight. For now, use Safari to visit montree.xyz'
            }
          </div>
        </div>

        {/* Web fallback */}
        <div className="text-white/40 text-sm">
          <p>
            {isZh
              ? '没有安装应用？直接在浏览器访问'
              : "Don't want to install? Use your browser:"
            }
          </p>
          <a href="/montree" className="text-emerald-400 underline">
            montree.xyz
          </a>
        </div>

      </div>
    </div>
  );
}
