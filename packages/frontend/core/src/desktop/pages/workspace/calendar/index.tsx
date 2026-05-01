import { CalendarViewRoot } from '@affine/core/modules/calendar-view/views';
import { ViewBody, ViewHeader, ViewIcon, ViewTitle } from '@affine/core/modules/workbench';

export const CalendarPage = () => {
  return (
    <>
      <ViewTitle title="Calendar" />
      <ViewIcon icon="calendar" />
      <ViewHeader />
      <ViewBody>
        <CalendarViewRoot />
      </ViewBody>
    </>
  );
};

export const Component = () => {
  return <CalendarPage />;
};
