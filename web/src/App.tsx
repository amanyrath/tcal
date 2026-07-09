import { useCallback, useMemo, useState } from "react";
import { CalendarToolbar } from "./components/CalendarToolbar";
import { CalendarView } from "./components/CalendarView";
import { ErrorBanner } from "./components/ErrorBanner";
import { FilterPanel } from "./components/FilterPanel";
import { GymRail } from "./components/GymRail";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { MobileCategoryDropdown } from "./components/MobileCategoryDropdown";
import { MobileGymRail } from "./components/MobileGymRail";
import { MobileToolbar } from "./components/MobileToolbar";
import { useCalendarState } from "./hooks/useCalendarState";
import { useEvents } from "./hooks/useEvents";
import { filterEvents } from "./lib/filterEvents";
import {
  getDayOffset,
  getWeekForDay,
  localDateString,
  shiftDay,
  shiftWeek,
  todayString,
} from "./lib/dates";
import { GYM_BY_KEY } from "./lib/gyms";

function App() {
  const { data, loading, error, retry } = useEvents(30);
  const { state, update, actions, gymScopedCatalog } = useCalendarState(data);

  const allowedGymKeys = useMemo(
    () => (data ? data.gyms.map((gym) => gym.key) : undefined),
    [data],
  );

  const [selectedDay, setSelectedDay] = useState<string>(() => todayString());

  const filteredEvents = useMemo(
    () => (data ? filterEvents(data.events, state) : []),
    [data, state],
  );

  const updatedAt = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const gymTitle = useMemo(() => {
    if (state.activeGyms.length === 1) {
      const gym = GYM_BY_KEY[state.activeGyms[0]];
      return gym ? `${gym.shortName}'s Calendar` : "Touchstone Calendar";
    }
    return "Touchstone Calendar";
  }, [state.activeGyms]);

  const handlePrevDay = useCallback(() => {
    const newDay = shiftDay(selectedDay, -1);
    const newWeek = getWeekForDay(newDay);
    if (newWeek !== state.weekStart) {
      update({ weekStart: newWeek });
    }
    setSelectedDay(newDay);
  }, [selectedDay, state.weekStart, update]);

  const handleNextDay = useCallback(() => {
    const newDay = shiftDay(selectedDay, 1);
    const newWeek = getWeekForDay(newDay);
    if (newWeek !== state.weekStart) {
      update({ weekStart: newWeek });
    }
    setSelectedDay(newDay);
  }, [selectedDay, state.weekStart, update]);

  const handlePrevWeek = useCallback(() => {
    const newWeekStart = shiftWeek(state.weekStart, -1);
    const offset = Math.max(0, Math.min(6, getDayOffset(selectedDay, state.weekStart)));
    update({ weekStart: newWeekStart });
    setSelectedDay(shiftDay(newWeekStart, offset));
  }, [selectedDay, state.weekStart, update]);

  const handleNextWeek = useCallback(() => {
    const newWeekStart = shiftWeek(state.weekStart, 1);
    const offset = Math.max(0, Math.min(6, getDayOffset(selectedDay, state.weekStart)));
    update({ weekStart: newWeekStart });
    setSelectedDay(shiftDay(newWeekStart, offset));
  }, [selectedDay, state.weekStart, update]);

  const handleToday = useCallback(() => {
    actions.goToToday();
    setSelectedDay(localDateString(new Date()));
  }, [actions]);

  const handleClearCategories = useCallback(() => {
    update({ offGroups: [], hiddenGroups: [] });
  }, [update]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden sm:p-8">
      {error && <ErrorBanner message={error} onRetry={retry} />}

      {/* ===== MOBILE LAYOUT (< sm) ===== */}
      <div className="sm:hidden flex flex-col flex-1 min-h-0 overflow-hidden">
        <MobileGymRail
          gymOrder={state.gymOrder}
          activeGyms={state.activeGyms}
          onToggle={actions.toggleGym}
          allowedGymKeys={allowedGymKeys}
        />

        <div className="px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <h1 className="text-xl font-bold uppercase tracking-wide text-gray-900">
            {gymTitle}
          </h1>
        </div>

        <div className="px-4 py-2 bg-white border-b border-gray-100 shrink-0">
          <MobileCategoryDropdown
            catalog={gymScopedCatalog}
            offGroups={state.offGroups}
            hiddenGroups={state.hiddenGroups}
            onToggleGroup={actions.toggleGroup}
            onSelectAll={handleClearCategories}
          />
        </div>

        <MobileToolbar
          weekStart={state.weekStart}
          selectedDay={selectedDay}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onToday={handleToday}
        />

        <main className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <CalendarView
              events={filteredEvents}
              weekStart={state.weekStart}
              hasActiveGyms={state.activeGyms.length > 0}
              selectedDay={selectedDay}
            />
          )}
        </main>
      </div>

      {/* ===== DESKTOP LAYOUT (sm+) ===== */}
      <header className="hidden sm:block shrink-0 px-4 py-3 bg-white border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">Touchstone Gym Combined Calendar</h1>
      </header>

      <div className="hidden sm:flex flex-1 min-h-0">
        <div className="flex flex-1 min-h-0 min-w-0">
          {!state.filterPanelOpen && (
            <button
              type="button"
              onClick={actions.toggleFilterPanel}
              className="hidden md:flex w-6 shrink-0 items-center justify-center bg-white border-r border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              title="Expand filters"
              aria-label="Expand filters"
            >
              <PanelChevron expanded={false} />
            </button>
          )}
          <div
            className={`${
              state.filterPanelOpen
                ? "fixed md:static inset-0 md:inset-auto z-30 md:z-auto md:w-[280px]"
                : "w-0"
            } shrink-0 overflow-hidden transition-[width] duration-200`}
          >
            {state.filterPanelOpen && (
              <>
                <div
                  className="md:hidden absolute inset-0 bg-black/30"
                  onClick={actions.toggleFilterPanel}
                />
                <div className="relative h-full w-[280px] max-w-[85vw] md:max-w-none ml-auto md:ml-0">
                  <FilterPanel
                    state={state}
                    categoryGroups={gymScopedCatalog}
                    allowedGymKeys={allowedGymKeys}
                    onToggleGym={actions.toggleGym}
                    onSetGroupTypes={actions.setGroupTypes}
                    onHideGroup={actions.hideGroup}
                    onUnhideGroup={actions.unhideGroup}
                    onToggleType={actions.toggleType}
                    onToggleSection={actions.toggleSection}
                    onSetTimeFilter={actions.setTimeFilter}
                    onToggleHideFull={actions.toggleHideFull}
                    onClose={actions.toggleFilterPanel}
                  />
                </div>
              </>
            )}
          </div>

          <main className="flex flex-col flex-1 min-w-0 min-h-0">
            <CalendarToolbar
              weekStart={state.weekStart}
              filterPanelOpen={state.filterPanelOpen}
              updatedAt={updatedAt}
              state={state}
              onPrevWeek={actions.prevWeek}
              onNextWeek={actions.nextWeek}
              onToday={actions.goToToday}
              onToggleFilterPanel={actions.toggleFilterPanel}
            />

            <GymRail
              gymOrder={state.gymOrder}
              activeGyms={state.activeGyms}
              onToggle={actions.toggleGym}
              allowedGymKeys={allowedGymKeys}
            />

            {loading ? (
              <LoadingSkeleton />
            ) : (
              <CalendarView
                events={filteredEvents}
                weekStart={state.weekStart}
                hasActiveGyms={state.activeGyms.length > 0}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;

function PanelChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path
        d="M10 4L6 8l4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
