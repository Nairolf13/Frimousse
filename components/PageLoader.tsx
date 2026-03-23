import { HiOutlineRefresh } from 'react-icons/hi';

interface PageLoaderProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function PageLoader({ title, description, icon }: PageLoaderProps) {
  return (
    <div className="min-h-screen bg-[#f4f7fa] p-2 sm:p-4 md:pl-64 w-full">
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-2 md:px-4">
        {(title || icon) && (
          <div className="flex items-start gap-3 mb-6">
            {icon && (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0b5566] to-[#08323a] flex items-center justify-center shadow-lg flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="pt-0.5">
              {title && <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0b5566]">{title}</h1>}
              {description && <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{description}</p>}
            </div>
          </div>
        )}
        <div className="bg-white rounded-2xl shadow p-8 flex items-center justify-center gap-3 text-gray-400">
          <HiOutlineRefresh className="w-5 h-5 animate-spin" />
          <span>Chargement…</span>
        </div>
      </div>
    </div>
  );
}
