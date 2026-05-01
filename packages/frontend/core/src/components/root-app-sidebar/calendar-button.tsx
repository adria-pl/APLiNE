import { MenuLinkItem } from '@affine/core/modules/app-sidebar/views';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useLiveData, useService } from '@toeverything/infra';

const CalendarSidebarIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6 1a.75.75 0 0 1 .75.75V2h6.5v-.25a.75.75 0 0 1 1.5 0V2h2A2.25 2.25 0 0 1 19 4.25v11.5A2.25 2.25 0 0 1 16.75 18H3.25A2.25 2.25 0 0 1 1 15.75V4.25A2.25 2.25 0 0 1 3.25 2h2v-.25A.75.75 0 0 1 6 1ZM2.5 7.5v8.25a.75.75 0 0 0 .75.75h13.5a.75.75 0 0 0 .75-.75V7.5h-15ZM5.25 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm4.75-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm2.75 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 13.25a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm2.75 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
      fill="currentColor"
    />
  </svg>
);

export const AppSidebarCalendarButton = () => {
  const workbench = useService(WorkbenchService).workbench;
  const location = useLiveData(workbench.location$);

  return (
    <MenuLinkItem
      data-testid="slider-bar-calendar-button"
      active={location.pathname.startsWith('/calendar')}
      to={'/calendar'}
      icon={<CalendarSidebarIcon />}
    >
      Calendar
    </MenuLinkItem>
  );
};
