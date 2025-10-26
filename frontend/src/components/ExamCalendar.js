import React from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const ExamCalendar = ({ exam }) => {
  const events = exam.examSchedule.map((schedule) => ({
    title: schedule.subjectCode,
    start: new Date(schedule.date),
    end: new Date(schedule.date),
    allDay: true,
  }));

  return (
    <div style={{ height: "500px", margin: "20px 0" }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultView="month"
        views={["month"]}
      />
    </div>
  );
};

export default ExamCalendar;
