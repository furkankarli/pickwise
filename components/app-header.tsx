export function AppHeader() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6">
      <div className="pointer-events-auto flex h-16 items-center rounded-full border border-white/70 bg-white/55 px-10 shadow-[0_18px_50px_rgba(11,27,111,0.14)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/45">
        <a href="#" className="text-2xl font-extrabold tracking-normal">
          <span className="text-[#0B1B6F]">pick</span>
          <span className="bg-gradient-to-r from-[#3B6CFF] to-[#20D6D2] bg-clip-text text-transparent">
            wise
          </span>
        </a>
      </div>
    </header>
  );
}
