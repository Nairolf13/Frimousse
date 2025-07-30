import WeeklyActivityCalendar from '../components/WeeklyActivityCalendar';

export default function Activites() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] w-full flex flex-col items-center md:pl-64 px-2 md:px-8 py-8">
      <div className="w-full max-w-6xl mx-auto">
        <WeeklyActivityCalendar />
      </div>
    </div>
  );
}
